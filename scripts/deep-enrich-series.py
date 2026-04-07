#!/usr/bin/env python3
"""
DashTivi+ Deep Series Enrichment — Match + enrich TV series via TMDB.

Phase A: Match unmatched series from Supabase → TMDB search
Phase B: Deep enrich ALL series with TMDB details (credits, keywords, networks, seasons)
Phase C: Update tmdb-data.json with new entries + fill missing trailers

Usage:
  python3 deep-enrich-series.py
"""

import json
import os
import re
import sys
import time
from collections import deque
from difflib import SequenceMatcher

try:
    import requests
except ImportError:
    print("ERROR: 'requests' module not found. Install: pip3 install requests")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────────
TMDB_API_KEY = "632e644be9521013bdac3661ae65494e"
SUPABASE_URL = "https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
TMDB_DATA_FILE = os.path.join(PROJECT_ROOT, "public", "tmdb-data.json")
DEEP_CACHE_FILE = os.path.join(SCRIPT_DIR, "tmdb-deep-series-cache.json")

SERIES_LIMIT = 5000  # Top N by rating
PROGRESS_INTERVAL = 50

# ── Rate Limiter ────────────────────────────────────────────────────────────

class RateLimiter:
    """Sliding window: max_requests per window_seconds."""

    def __init__(self, max_requests=35, window_seconds=10):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.timestamps = deque()
        self.backoff_until = 0

    def wait(self):
        now = time.time()
        if now < self.backoff_until:
            sleep_time = self.backoff_until - now
            print(f"  [rate-limit] Backoff: sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
            now = time.time()

        cutoff = now - self.window_seconds
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()

        if len(self.timestamps) >= self.max_requests:
            sleep_time = self.timestamps[0] + self.window_seconds - now + 0.15
            if sleep_time > 0:
                time.sleep(sleep_time)
            now = time.time()
            cutoff = now - self.window_seconds
            while self.timestamps and self.timestamps[0] < cutoff:
                self.timestamps.popleft()

        self.timestamps.append(now)

    def backoff(self, retry_after=None):
        if retry_after:
            self.backoff_until = time.time() + retry_after
        else:
            current_wait = max(self.backoff_until - time.time(), 0)
            new_wait = max(current_wait * 2, 10)
            self.backoff_until = time.time() + min(new_wait, 60)


rate_limiter = RateLimiter(max_requests=35, window_seconds=10)


# ── TMDB Request ────────────────────────────────────────────────────────────

def tmdb_get(path: str, params: dict = None, max_retries=3):
    """Rate-limited TMDB GET with retries."""
    if params is None:
        params = {}
    params["api_key"] = TMDB_API_KEY

    for attempt in range(max_retries):
        rate_limiter.wait()
        try:
            resp = requests.get(f"{TMDB_BASE}{path}", params=params, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 10))
                rate_limiter.backoff(retry_after)
                if attempt < max_retries - 1:
                    continue
                return None
            elif resp.status_code == 404:
                return None
            else:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                return None
        except requests.RequestException:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            return None
    return None


# ── Supabase Fetch ──────────────────────────────────────────────────────────

def fetch_series_from_supabase(limit=5000):
    """Fetch series from tivi_series table with pagination (Supabase max 1000/req)."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    all_series = []
    page_size = 1000
    offset = 0

    while len(all_series) < limit:
        fetch_limit = min(page_size, limit - len(all_series))
        url = (f"{SUPABASE_URL}/tivi_series?select=series_id,name,genre,rating"
               f"&order=rating.desc.nullslast&limit={fetch_limit}&offset={offset}")
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                break
            all_series.extend(data)
            print(f"  [Supabase] Page {offset // page_size + 1}: {len(data)} rows (total: {len(all_series)})")
            if len(data) < fetch_limit:
                break
            offset += page_size
        except Exception as e:
            print(f"[Supabase] ERROR at offset {offset}: {e}")
            if all_series:
                break  # Use what we have
            sys.exit(1)

    print(f"[Supabase] Fetched {len(all_series)} series total")
    return all_series


# ── Title Parsing ───────────────────────────────────────────────────────────

YEAR_RE = re.compile(r'\((\d{4})\)')

# Languages and tags commonly found in parentheses
LANG_TAGS = (
    'Hindi|Tamil|Telugu|Malayalam|Kannada|Bengali|Bangla|Marathi|Punjabi|Urdu|'
    'English|French|Spanish|Arabic|Korean|Japanese|Chinese|Turkish|German|'
    'Italian|Portuguese|Russian|Thai|Indonesian|Malay|Filipino|Vietnamese|'
    'Dubbed|Multi Audio|Dual Audio|HD|4K|UHD|Kids|KIDS'
)


def parse_series_name(raw_name: str) -> tuple:
    """
    Aggressively parse a series name for TMDB search.
    Handles: "Blind Spot (Kor.Nokta) (Turkish)", "Stranger Things 2 S02",
             "7 Bears (Hindi) (Kids)", "Trap  (Tuzak) (Turkish)"
    Returns (clean_title, year_or_None).
    """
    name = raw_name.strip()

    # Extract year before stripping
    year_match = YEAR_RE.search(name)
    year = year_match.group(1) if year_match else None

    # Remove all parenthesized groups that contain language/quality tags
    # e.g., "(Turkish)", "(Hindi)", "(Kids)", "(Bangla)"
    name = re.sub(rf'\s*\(({LANG_TAGS})\)', '', name, flags=re.IGNORECASE).strip()

    # Remove parenthesized groups that look like original-language titles
    # e.g., "(Kor.Nokta)", "(Tuzak)", "(Siyah Kalp)", "(Ayak Isleri)", "(Veda Mektubu)"
    # These are non-English titles in parens that aren't years
    name = re.sub(r'\s*\((?!\d{4}\))[^)]{2,40}\)', '', name).strip()

    # Remove year in parentheses
    name = re.sub(r'\s*\(\d{4}\)', '', name).strip()

    # Remove season/episode suffixes: "S02", "Season 3", "2 S02"
    name = re.sub(r'\s+S\d+\s*$', '', name, flags=re.IGNORECASE).strip()
    name = re.sub(r'\s*[-–]\s*Season\s*\d+\s*$', '', name, flags=re.IGNORECASE).strip()
    # Remove trailing number that looks like season ("Stranger Things 2" -> "Stranger Things")
    name = re.sub(r'\s+\d{1,2}\s*$', '', name).strip()

    # Remove trailing language without parens
    name = re.sub(rf'\s+({LANG_TAGS})\s*$', '', name, flags=re.IGNORECASE).strip()

    # Remove trailing " -" or " –"
    name = re.sub(r'\s*[-–]\s*$', '', name).strip()

    # Clean up multiple spaces
    name = re.sub(r'\s{2,}', ' ', name).strip()

    # If name got too short, fall back to original
    if len(name) < 2:
        name = raw_name.strip()
        # Just remove year
        name = YEAR_RE.sub('', name).strip()

    return name, year


def title_similarity(a: str, b: str) -> float:
    """SequenceMatcher ratio between two titles (case-insensitive, stripped)."""
    na = re.sub(r'[^a-z0-9\s]', '', a.lower()).strip()
    nb = re.sub(r'[^a-z0-9\s]', '', b.lower()).strip()
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


# ── Phase A: Match series to TMDB ──────────────────────────────────────────

def phase_a_match(series_list: list, tmdb_data: dict, deep_cache: dict) -> dict:
    """
    Match series without tmdb_id to TMDB via search.
    Returns dict of {series_id: tmdb_id} for newly matched series.
    """
    print("\n" + "=" * 60)
    print("  PHASE A: Match unmatched series to TMDB")
    print("=" * 60 + "\n")

    new_matches = {}
    already_matched = 0
    searched = 0
    matched = 0
    failed = 0

    to_search = []
    for s in series_list:
        sid = str(s["series_id"])
        key = f"s:{sid}"
        if key in tmdb_data and tmdb_data[key].get("i"):
            already_matched += 1
            continue
        # Check if already in deep cache with a tmdb_id
        if sid in deep_cache and deep_cache[sid].get("tmdb_id"):
            already_matched += 1
            new_matches[sid] = deep_cache[sid]["tmdb_id"]
            continue
        to_search.append(s)

    print(f"  Already matched: {already_matched}")
    print(f"  Need to search:  {len(to_search)}")
    print()

    for idx, s in enumerate(to_search):
        sid = str(s["series_id"])
        raw_name = s.get("name", "")
        title, year = parse_series_name(raw_name)

        # Search TMDB
        params = {"query": title}
        if year:
            params["first_air_date_year"] = year

        data = tmdb_get("/search/tv", params)
        searched += 1

        if data and data.get("results"):
            results = data["results"]
            # Try matching
            best_match = None
            best_sim = 0.0

            for r in results[:5]:
                r_name = r.get("name", "")
                r_orig = r.get("original_name", "")
                sim = max(title_similarity(title, r_name),
                          title_similarity(title, r_orig) if r_orig else 0)
                if sim > best_sim:
                    best_sim = sim
                    best_match = r

            if best_match and best_sim >= 0.60:
                tmdb_id = best_match["id"]
                new_matches[sid] = tmdb_id
                matched += 1

                # Store basic match info in deep cache
                if sid not in deep_cache:
                    deep_cache[sid] = {}
                deep_cache[sid]["tmdb_id"] = tmdb_id
                deep_cache[sid]["match_sim"] = round(best_sim, 2)
                deep_cache[sid]["original_name"] = raw_name
            else:
                failed += 1
                # Try without year if year was provided
                if year:
                    params2 = {"query": title}
                    data2 = tmdb_get("/search/tv", params2)
                    searched += 1
                    if data2 and data2.get("results"):
                        for r in data2["results"][:3]:
                            r_name = r.get("name", "")
                            r_orig = r.get("original_name", "")
                            sim = max(title_similarity(title, r_name),
                                      title_similarity(title, r_orig) if r_orig else 0)
                            if sim >= 0.60:
                                tmdb_id = r["id"]
                                new_matches[sid] = tmdb_id
                                matched += 1
                                failed -= 1  # Undo the fail count
                                if sid not in deep_cache:
                                    deep_cache[sid] = {}
                                deep_cache[sid]["tmdb_id"] = tmdb_id
                                deep_cache[sid]["match_sim"] = round(sim, 2)
                                deep_cache[sid]["original_name"] = raw_name
                                break
        else:
            failed += 1

        # Progress
        processed = idx + 1
        if processed % PROGRESS_INTERVAL == 0 or processed == len(to_search):
            print(f"  [{processed}/{len(to_search)}] searched={searched} matched={matched} failed={failed}")
            # Save cache periodically
            if processed % 200 == 0:
                save_deep_cache(deep_cache)

    print(f"\n  Phase A complete: {matched} new matches from {searched} searches")
    print(f"  Total matchable: {already_matched + matched}")
    return new_matches


# ── Phase B: Deep enrich ───────────────────────────────────────────────────

def phase_b_enrich(series_list: list, tmdb_data: dict, deep_cache: dict, new_matches: dict) -> dict:
    """
    Deep enrich ALL series that have a TMDB ID.
    Returns updated deep_cache.
    """
    print("\n" + "=" * 60)
    print("  PHASE B: Deep enrich series with TMDB details")
    print("=" * 60 + "\n")

    # Build work list: series with tmdb_id from either source
    work = []
    for s in series_list:
        sid = str(s["series_id"])
        key = f"s:{sid}"
        tmdb_id = None

        # Check tmdb-data.json first
        if key in tmdb_data and tmdb_data[key].get("i"):
            tmdb_id = tmdb_data[key]["i"]
        # Then check new matches
        elif sid in new_matches:
            tmdb_id = new_matches[sid]
        # Then check deep cache
        elif sid in deep_cache and deep_cache[sid].get("tmdb_id"):
            tmdb_id = deep_cache[sid]["tmdb_id"]

        if tmdb_id:
            work.append((sid, tmdb_id, s.get("name", "")))

    print(f"  Series with TMDB ID: {len(work)}")

    # Filter to only those not yet deep-enriched
    to_enrich = []
    already_enriched = 0
    for sid, tmdb_id, name in work:
        if sid in deep_cache and deep_cache[sid].get("deep_enriched"):
            already_enriched += 1
            continue
        to_enrich.append((sid, tmdb_id, name))

    print(f"  Already enriched:    {already_enriched}")
    print(f"  Need enrichment:     {len(to_enrich)}")
    print()

    enriched = 0
    trailers_found = 0
    networks_found = 0
    errors = 0

    for idx, (sid, tmdb_id, name) in enumerate(to_enrich):
        # Fetch full details with keywords, videos, credits
        data = tmdb_get(f"/tv/{tmdb_id}", {
            "append_to_response": "keywords,videos,credits"
        })

        if not data:
            errors += 1
            processed = idx + 1
            if processed % PROGRESS_INTERVAL == 0:
                print(f"  [{processed}/{len(to_enrich)}] enriched={enriched} trailers={trailers_found} networks={networks_found} errors={errors}")
            continue

        # Initialize cache entry if needed
        if sid not in deep_cache:
            deep_cache[sid] = {}

        entry = deep_cache[sid]
        entry["tmdb_id"] = tmdb_id
        entry["deep_enriched"] = True

        # Basic info
        entry["overview"] = data.get("overview", "")
        entry["tagline"] = data.get("tagline", "")
        entry["popularity"] = data.get("popularity", 0)
        entry["vote_count"] = data.get("vote_count", 0)
        entry["vote_average"] = data.get("vote_average", 0)

        # Season/Episode counts (CRITICAL)
        entry["number_of_seasons"] = data.get("number_of_seasons", 0)
        entry["number_of_episodes"] = data.get("number_of_episodes", 0)

        # Status
        entry["status"] = data.get("status", "")

        # Networks (Netflix, HBO, etc.)
        networks = data.get("networks", [])
        if networks:
            entry["networks"] = [{"id": n.get("id"), "name": n.get("name", "")} for n in networks]
            networks_found += 1

        # Last air date
        entry["last_air_date"] = data.get("last_air_date", "")
        entry["first_air_date"] = data.get("first_air_date", "")

        # Genres (full)
        genres = data.get("genres", [])
        entry["genres"] = [{"id": g["id"], "name": g["name"]} for g in genres]
        entry["genre_ids"] = [g["id"] for g in genres]

        # Poster
        entry["poster_path"] = data.get("poster_path", "")

        # Keywords
        keywords_data = data.get("keywords", {})
        kw_results = keywords_data.get("results", [])
        entry["keywords"] = [kw.get("name", "") for kw in kw_results[:15]]

        # Cast (top 5)
        credits = data.get("credits", {})
        cast_list = credits.get("cast", [])
        entry["cast"] = [
            {"name": c.get("name", ""), "character": c.get("character", ""), "profile_path": c.get("profile_path")}
            for c in cast_list[:5]
        ]

        # Trailer
        videos = data.get("videos", {}).get("results", [])
        trailer_key = None
        # Prefer official trailers
        for v in videos:
            if v.get("type") == "Trailer" and v.get("site") == "YouTube" and v.get("official", False):
                trailer_key = v.get("key")
                break
        if not trailer_key:
            for v in videos:
                if v.get("type") == "Trailer" and v.get("site") == "YouTube":
                    trailer_key = v.get("key")
                    break
        if not trailer_key:
            for v in videos:
                if v.get("site") == "YouTube":
                    trailer_key = v.get("key")
                    break

        if trailer_key:
            entry["trailer_key"] = trailer_key
            trailers_found += 1

        enriched += 1

        # Progress
        processed = idx + 1
        if processed % PROGRESS_INTERVAL == 0 or processed == len(to_enrich):
            print(f"  [{processed}/{len(to_enrich)}] enriched={enriched} trailers={trailers_found} networks={networks_found} errors={errors}")
            # Save cache periodically
            if processed % 200 == 0:
                save_deep_cache(deep_cache)

    print(f"\n  Phase B complete: {enriched} enriched, {trailers_found} trailers, {networks_found} with networks")
    return deep_cache


# ── Phase C: Update tmdb-data.json ─────────────────────────────────────────

def phase_c_update(series_list: list, tmdb_data: dict, deep_cache: dict, new_matches: dict):
    """
    Add newly matched series to tmdb-data.json.
    Fill missing trailers for existing entries.
    """
    print("\n" + "=" * 60)
    print("  PHASE C: Update tmdb-data.json")
    print("=" * 60 + "\n")

    added = 0
    trailers_filled = 0
    updated_fields = 0

    for sid, tmdb_id in new_matches.items():
        key = f"s:{sid}"
        if key in tmdb_data:
            continue  # Already exists

        entry_data = deep_cache.get(sid, {})

        new_entry = {
            "i": tmdb_id,
            "g": entry_data.get("genre_ids", []),
            "r": round(entry_data.get("vote_average", 0), 1),
        }

        # Poster
        poster = entry_data.get("poster_path", "")
        if poster:
            new_entry["p"] = poster

        # Trailer
        trailer = entry_data.get("trailer_key", "")
        if trailer:
            new_entry["y"] = trailer

        # Runtime (episode runtime from TMDB or None)
        # We don't have this in deep cache currently, skip

        tmdb_data[key] = new_entry
        added += 1

    # Fill missing trailers for existing entries
    for s in series_list:
        sid = str(s["series_id"])
        key = f"s:{sid}"
        if key not in tmdb_data:
            continue

        entry = tmdb_data[key]
        cache_entry = deep_cache.get(sid, {})

        # Fill missing trailer
        if not entry.get("y") and cache_entry.get("trailer_key"):
            entry["y"] = cache_entry["trailer_key"]
            trailers_filled += 1

        # Update rating if we have better data
        if cache_entry.get("vote_average") and (not entry.get("r") or entry["r"] == 0):
            entry["r"] = round(cache_entry["vote_average"], 1)
            updated_fields += 1

        # Update genres if empty
        if not entry.get("g") and cache_entry.get("genre_ids"):
            entry["g"] = cache_entry["genre_ids"]
            updated_fields += 1

        # Update poster if missing
        if not entry.get("p") and cache_entry.get("poster_path"):
            entry["p"] = cache_entry["poster_path"]
            updated_fields += 1

    # Save tmdb-data.json
    print(f"  Added {added} new series entries")
    print(f"  Filled {trailers_filled} missing trailers")
    print(f"  Updated {updated_fields} other fields")

    with open(TMDB_DATA_FILE, "w") as f:
        json.dump(tmdb_data, f, separators=(",", ":"))

    file_size = os.path.getsize(TMDB_DATA_FILE)
    print(f"  Saved tmdb-data.json ({file_size / 1024 / 1024:.1f}MB, {len(tmdb_data)} total entries)")

    return added, trailers_filled


# ── Cache I/O ───────────────────────────────────────────────────────────────

def load_deep_cache() -> dict:
    if os.path.exists(DEEP_CACHE_FILE):
        try:
            with open(DEEP_CACHE_FILE) as f:
                cache = json.load(f)
            print(f"[Cache] Loaded deep cache: {len(cache)} entries")
            return cache
        except (json.JSONDecodeError, OSError) as e:
            print(f"[Cache] WARNING: Corrupted cache, starting fresh: {e}")
            return {}
    print("[Cache] No deep cache found, starting fresh")
    return {}


def save_deep_cache(cache: dict):
    try:
        with open(DEEP_CACHE_FILE, "w") as f:
            json.dump(cache, f, separators=(",", ":"))
    except OSError as e:
        print(f"[Cache] WARNING: Failed to save: {e}")


# ── Final Report ────────────────────────────────────────────────────────────

def print_final_report(series_list, tmdb_data, deep_cache, new_matches, phase_c_added, phase_c_trailers):
    """Print comprehensive final report."""
    total_series = len(series_list)

    # Count series with tmdb_id (in tmdb-data.json)
    series_in_tmdb = sum(1 for s in series_list if f"s:{s['series_id']}" in tmdb_data)

    # Count enriched
    enriched_count = sum(1 for v in deep_cache.values() if v.get("deep_enriched"))

    # Count trailers in deep cache
    trailers_in_cache = sum(1 for v in deep_cache.values() if v.get("trailer_key"))

    # Count series with trailers in tmdb-data.json
    series_keys = {f"s:{s['series_id']}" for s in series_list}
    trailers_in_data = sum(1 for k in series_keys if k in tmdb_data and tmdb_data[k].get("y"))

    # Count networks
    with_networks = sum(1 for v in deep_cache.values() if v.get("networks"))

    # Network breakdown
    network_counts = {}
    for v in deep_cache.values():
        for n in v.get("networks", []):
            name = n.get("name", "Unknown")
            network_counts[name] = network_counts.get(name, 0) + 1

    # Status breakdown
    status_counts = {}
    for v in deep_cache.values():
        st = v.get("status", "Unknown")
        if st:
            status_counts[st] = status_counts.get(st, 0) + 1

    print("\n" + "=" * 60)
    print("         DEEP SERIES ENRICHMENT — FINAL REPORT")
    print("=" * 60)
    print()
    print(f"  Total series processed:   {total_series}")
    print(f"  Matched to TMDB:          {series_in_tmdb} ({series_in_tmdb * 100 / max(total_series, 1):.1f}%)")
    print(f"    - Previously matched:   {series_in_tmdb - len(new_matches)}")
    print(f"    - Newly matched:        {len(new_matches)}")
    print(f"  Deep enriched:            {enriched_count}")
    print()
    print(f"  Trailers found (cache):   {trailers_in_cache}")
    print(f"  Trailers in tmdb-data:    {trailers_in_data}")
    print(f"  New trailers filled:      {phase_c_trailers}")
    print()
    print(f"  With network info:        {with_networks}")
    print()

    if network_counts:
        print("  Top Networks:")
        for name, count in sorted(network_counts.items(), key=lambda x: -x[1])[:15]:
            print(f"    {name}: {count}")
        print()

    if status_counts:
        print("  Series Status:")
        for st, count in sorted(status_counts.items(), key=lambda x: -x[1]):
            print(f"    {st}: {count}")
        print()

    print(f"  Deep cache file: {DEEP_CACHE_FILE}")
    print(f"  tmdb-data.json:  {TMDB_DATA_FILE}")
    print("=" * 60)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()

    print("=" * 60)
    print("  DashTivi+ Deep Series Enrichment")
    print("=" * 60)
    print()

    # Load Supabase key from env file if not set
    global SUPABASE_KEY
    if not SUPABASE_KEY:
        env_path = "/home/dash/zion-interface/.env"
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("SUPABASE_SERVICE_KEY="):
                        SUPABASE_KEY = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass

    if not SUPABASE_KEY:
        print("ERROR: No SUPABASE_SERVICE_KEY found")
        sys.exit(1)

    # Load existing data
    print("[1/4] Loading existing data...")
    tmdb_data = {}
    if os.path.exists(TMDB_DATA_FILE):
        with open(TMDB_DATA_FILE) as f:
            tmdb_data = json.load(f)
        series_count = sum(1 for k in tmdb_data if k.startswith("s:"))
        print(f"  tmdb-data.json: {len(tmdb_data)} total, {series_count} series")

    deep_cache = load_deep_cache()

    # Fetch from Supabase
    print(f"\n[2/4] Fetching top {SERIES_LIMIT} series from Supabase...")
    series_list = fetch_series_from_supabase(limit=SERIES_LIMIT)
    if not series_list:
        print("ERROR: No series fetched")
        sys.exit(1)

    # Phase A: Match
    new_matches = phase_a_match(series_list, tmdb_data, deep_cache)
    save_deep_cache(deep_cache)

    # Phase B: Deep enrich
    deep_cache = phase_b_enrich(series_list, tmdb_data, deep_cache, new_matches)
    save_deep_cache(deep_cache)

    # Phase C: Update tmdb-data.json
    added, trailers_filled = phase_c_update(series_list, tmdb_data, deep_cache, new_matches)

    # Save final deep cache
    save_deep_cache(deep_cache)

    # Report
    print_final_report(series_list, tmdb_data, deep_cache, new_matches, added, trailers_filled)

    elapsed = time.time() - start_time
    if elapsed > 60:
        print(f"\n  Completed in {elapsed / 60:.1f} minutes")
    else:
        print(f"\n  Completed in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
