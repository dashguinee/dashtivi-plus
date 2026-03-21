#!/usr/bin/env python3
"""
DashTivi+ TMDB Enrichment — Match Xtream VOD/Series against TMDB for metadata.

Data sources:
  - Xtream API: VOD streams (stream_id, name) + Series (series_id, name)
  - TMDB API: movie/tv search + details (trailer, genres, rating, overview, poster)

Matching strategy:
  1. Parse title + year from names like "The Batman (2022)"
  2. Search TMDB by title (+ year if available)
  3. Validate match quality (normalized title similarity >80% or exact year match)
  4. Fetch details for matched items (trailer key, runtime, genres)

Outputs:
  - src/lib/tmdb-map.generated.ts  — TypeScript export of TMDB_MAP + TMDB_GENRES
  - Console stats: total, matched, unmatched, trailers found

Usage:
  python3 enrich-tmdb.py --key YOUR_TMDB_API_KEY
  python3 enrich-tmdb.py --tier 1              # Only 2024-2026 content (fast)
  python3 enrich-tmdb.py --tier 2              # All content (slow, default)

Environment:
  TMDB_API_KEY=... python3 enrich-tmdb.py
"""
import argparse
import json
import os
import re
import sys
import time
from collections import deque

try:
    import requests
except ImportError:
    print("ERROR: 'requests' module not found. Install it with: pip3 install requests")
    sys.exit(1)

# ── Xtream Credentials ──────────────────────────────────────────────────────
XTREAM_API = "https://datahub11.com"
XTREAM_USER = "Test032026"
XTREAM_PASS = "032026Test"

# ── TMDB Base ────────────────────────────────────────────────────────────────
TMDB_BASE = "https://api.themoviedb.org/3"

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_TS = os.path.join(PROJECT_ROOT, "src", "lib", "tmdb-map.generated.ts")
CACHE_FILE = os.path.join(SCRIPT_DIR, "tmdb-cache.json")

# ── Title parsing ────────────────────────────────────────────────────────────
TITLE_YEAR_RE = re.compile(r'^(.+?)\s*\((\d{4})\)\s*$')

# ── Genre maps (TMDB IDs) ───────────────────────────────────────────────────
MOVIE_GENRES = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
}

TV_GENRES = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    878: 'Sci-Fi & Fantasy',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western',
}

ALL_GENRES = {**MOVIE_GENRES, **TV_GENRES}


# ── Rate limiter ─────────────────────────────────────────────────────────────

class RateLimiter:
    """Sliding window rate limiter: max_requests per window_seconds."""

    def __init__(self, max_requests=40, window_seconds=10):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.timestamps = deque()
        self.backoff_until = 0

    def wait(self):
        """Block until we can make the next request."""
        now = time.time()

        # Respect backoff from 429 responses
        if now < self.backoff_until:
            sleep_time = self.backoff_until - now
            print(f"  [rate-limit] Backoff: sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
            now = time.time()

        # Purge timestamps outside the window
        cutoff = now - self.window_seconds
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()

        # If at capacity, sleep until the oldest timestamp exits the window
        if len(self.timestamps) >= self.max_requests:
            sleep_time = self.timestamps[0] + self.window_seconds - now + 0.1
            if sleep_time > 0:
                time.sleep(sleep_time)
            now = time.time()
            # Purge again
            cutoff = now - self.window_seconds
            while self.timestamps and self.timestamps[0] < cutoff:
                self.timestamps.popleft()

        self.timestamps.append(now)

    def backoff(self, retry_after=None):
        """Set exponential backoff after a 429 response."""
        if retry_after:
            self.backoff_until = time.time() + retry_after
        else:
            # Default: wait 10 seconds, increasing each time
            current_wait = max(self.backoff_until - time.time(), 0)
            new_wait = max(current_wait * 2, 10)
            self.backoff_until = time.time() + min(new_wait, 120)


rate_limiter = RateLimiter(max_requests=38, window_seconds=10)  # 38 to leave headroom


# ── Disk cache ───────────────────────────────────────────────────────────────

_cache = {}
_cache_dirty = False


def load_cache():
    """Load the TMDB response cache from disk."""
    global _cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                _cache = json.load(f)
            print(f"[TMDB] Cache loaded: {len(_cache)} entries from {CACHE_FILE}")
        except (json.JSONDecodeError, OSError) as e:
            print(f"[TMDB] WARNING: Cache corrupted, starting fresh: {e}")
            _cache = {}
    else:
        print("[TMDB] No cache file found, starting fresh")
        _cache = {}


def save_cache():
    """Write cache to disk (only if dirty)."""
    global _cache_dirty
    if not _cache_dirty:
        return
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(_cache, f, separators=(",", ":"))
        _cache_dirty = False
    except OSError as e:
        print(f"[TMDB] WARNING: Failed to save cache: {e}")


def cache_get(key: str):
    """Get a cached TMDB response."""
    return _cache.get(key)


def cache_set(key: str, value):
    """Store a TMDB response in cache."""
    global _cache_dirty
    _cache[key] = value
    _cache_dirty = True


# ── TMDB API helpers ─────────────────────────────────────────────────────────

def tmdb_request(path: str, params: dict, api_key: str, max_retries=3) -> dict | None:
    """Make a rate-limited TMDB API request with retries."""
    params["api_key"] = api_key

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


# ── Title parsing ────────────────────────────────────────────────────────────

def parse_title_year(raw_name: str) -> tuple:
    """
    Extract title and year from names like "The Batman (2022)".
    Returns (title, year_str_or_None).
    """
    name = raw_name.strip()
    m = TITLE_YEAR_RE.match(name)
    if m:
        return m.group(1).strip(), m.group(2)
    return name, None


def normalize_for_compare(title: str) -> str:
    """Lowercase, strip non-alphanumeric for fuzzy comparison."""
    return re.sub(r'[^a-z0-9]', '', title.lower())


def similarity_ratio(a: str, b: str) -> float:
    """
    Simple character-level similarity between two normalized strings.
    Returns 0.0-1.0 based on longest common subsequence / max length.
    For speed, we use a simpler approach: character overlap ratio.
    """
    na = normalize_for_compare(a)
    nb = normalize_for_compare(b)
    if not na or not nb:
        return 0.0

    # Quick exact check
    if na == nb:
        return 1.0

    # Character frequency overlap
    from collections import Counter
    ca = Counter(na)
    cb = Counter(nb)
    common = sum((ca & cb).values())
    total = max(len(na), len(nb))
    freq_ratio = common / total if total > 0 else 0.0

    # Prefix match bonus — very useful for movie titles
    prefix_len = 0
    for i in range(min(len(na), len(nb))):
        if na[i] == nb[i]:
            prefix_len += 1
        else:
            break
    prefix_ratio = prefix_len / max(len(na), len(nb))

    # Combined: weight prefix match heavily
    return 0.4 * freq_ratio + 0.6 * prefix_ratio if prefix_ratio > 0.3 else freq_ratio


def is_good_match(query_title: str, query_year: str | None, result: dict, media_type: str) -> bool:
    """
    Check if a TMDB search result is a good match for our query.
    Returns True if the title is similar enough or the year matches.
    """
    if media_type == "movie":
        result_title = result.get("title", "")
        result_date = result.get("release_date", "")
    else:
        result_title = result.get("name", "")
        result_date = result.get("first_air_date", "")

    result_year = result_date[:4] if result_date and len(result_date) >= 4 else None

    # Year match is a strong signal
    if query_year and result_year and query_year == result_year:
        # Even with year match, title should be somewhat close
        sim = similarity_ratio(query_title, result_title)
        if sim > 0.4:
            return True

    # Title similarity check (stricter if no year)
    sim = similarity_ratio(query_title, result_title)
    if sim > 0.80:
        return True

    # Also check original_title for non-English content
    original_title = result.get("original_title", "") or result.get("original_name", "")
    if original_title:
        sim_orig = similarity_ratio(query_title, original_title)
        if sim_orig > 0.80:
            return True

    return False


# ── Data fetching ────────────────────────────────────────────────────────────

def fetch_xtream_vod() -> list:
    """Fetch all VOD streams from the Xtream API."""
    url = f"{XTREAM_API}/player_api.php?username={XTREAM_USER}&password={XTREAM_PASS}&action=get_vod_streams"
    print("[TMDB] Fetching VOD streams...")
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        print(f"[TMDB] {len(data)} VOD streams fetched")
        return data
    except requests.RequestException as e:
        print(f"[TMDB] ERROR: Failed to fetch VOD streams: {e}", file=sys.stderr)
        sys.exit(1)


def fetch_xtream_series() -> list:
    """Fetch all series from the Xtream API."""
    url = f"{XTREAM_API}/player_api.php?username={XTREAM_USER}&password={XTREAM_PASS}&action=get_series"
    print("[TMDB] Fetching series...")
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        print(f"[TMDB] {len(data)} series fetched")
        return data
    except requests.RequestException as e:
        print(f"[TMDB] ERROR: Failed to fetch series: {e}", file=sys.stderr)
        sys.exit(1)


# ── TMDB search + details ───────────────────────────────────────────────────

def search_tmdb(title: str, year: str | None, media_type: str, api_key: str) -> dict | None:
    """
    Search TMDB for a movie or TV show.
    Returns the best matching result dict, or None.
    media_type: 'movie' or 'tv'
    """
    cache_key = f"search:{media_type}:{title}:{year or ''}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached if cached else None

    if media_type == "movie":
        path = "/search/movie"
        params = {"query": title}
        if year:
            params["year"] = year
    else:
        path = "/search/tv"
        params = {"query": title}
        if year:
            params["first_air_date_year"] = year

    data = tmdb_request(path, params, api_key)
    if not data or not data.get("results"):
        cache_set(cache_key, False)
        return None

    results = data["results"]

    # Find the best match
    for result in results[:5]:  # Check top 5 results
        if is_good_match(title, year, result, media_type):
            cache_set(cache_key, result)
            return result

    # If no good match and we searched with year, try without year
    if year:
        params_no_year = {"query": title}
        data2 = tmdb_request(path, params_no_year, api_key)
        if data2 and data2.get("results"):
            for result in data2["results"][:3]:
                if is_good_match(title, None, result, media_type):
                    cache_set(cache_key, result)
                    return result

    cache_set(cache_key, False)
    return None


def fetch_tmdb_details(tmdb_id: int, media_type: str, api_key: str) -> dict | None:
    """
    Fetch full details + videos for a TMDB item.
    media_type: 'movie' or 'tv'
    """
    cache_key = f"details:{media_type}:{tmdb_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached if cached else None

    path = f"/{media_type}/{tmdb_id}"
    params = {"append_to_response": "videos"}

    data = tmdb_request(path, params, api_key)
    if not data:
        cache_set(cache_key, False)
        return None

    cache_set(cache_key, data)
    return data


def extract_trailer_key(details: dict) -> str | None:
    """Extract YouTube trailer key from TMDB details response."""
    videos = details.get("videos", {}).get("results", [])
    for v in videos:
        if v.get("type") == "Trailer" and v.get("site") == "YouTube":
            return v.get("key")
    # Fallback: any YouTube video
    for v in videos:
        if v.get("site") == "YouTube":
            return v.get("key")
    return None


# ── Main processing ──────────────────────────────────────────────────────────

def filter_by_tier(items: list, tier: int, item_type: str) -> list:
    """
    Filter items by tier:
      tier 1: Only 2024-2026 content
      tier 2: All content
    """
    if tier == 2:
        return items

    filtered = []
    for item in items:
        name = item.get("name", "")
        _, year = parse_title_year(name)
        if year and int(year) >= 2024:
            filtered.append(item)
        elif not year:
            # Include items without year — we don't know how old they are
            # but they might be recent
            filtered.append(item)

    return filtered


def process_items(items: list, media_type: str, key_prefix: str, id_field: str,
                  api_key: str, results: dict, stats: dict):
    """
    Process a list of Xtream items (VOD or Series) against TMDB.
    Populates results dict and updates stats.
    """
    total = len(items)
    matched = 0
    missed = 0
    trailers = 0

    for idx, item in enumerate(items):
        item_id = str(item.get(id_field, ""))
        raw_name = item.get("name", "")
        map_key = f"{key_prefix}:{item_id}"

        # Skip if already processed (from cache on previous run)
        if map_key in results:
            matched += 1
            if results[map_key].get("y"):
                trailers += 1
            continue

        title, year = parse_title_year(raw_name)

        # Search TMDB
        tmdb_type = "movie" if media_type == "vod" else "tv"
        search_result = search_tmdb(title, year, tmdb_type, api_key)

        if not search_result:
            missed += 1
            # Progress logging
            if (idx + 1) % 500 == 0 or idx + 1 == total:
                print(f"[TMDB] Progress: {idx + 1}/{total} ({(idx + 1) * 100 / total:.1f}%)"
                      f" -- {matched} matched, {missed} missed")
                save_cache()
            continue

        tmdb_id = search_result.get("id")
        if not tmdb_id:
            missed += 1
            continue

        # Fetch details (for trailer, runtime, full genre list)
        details = fetch_tmdb_details(tmdb_id, tmdb_type, api_key)

        # Build entry
        entry = {
            "i": tmdb_id,
            "g": search_result.get("genre_ids", []),
            "r": round(search_result.get("vote_average", 0), 1),
            "v": search_result.get("vote_count", 0),
        }

        # Poster
        poster = search_result.get("poster_path")
        if poster:
            entry["p"] = poster

        # Overview (truncated to 120 chars)
        overview = search_result.get("overview", "")
        if overview:
            if len(overview) > 120:
                overview = overview[:117] + "..."
            entry["o"] = overview

        # Details-based fields
        if details:
            # Trailer
            trailer_key = extract_trailer_key(details)
            if trailer_key:
                entry["y"] = trailer_key
                trailers += 1

            # Runtime
            if tmdb_type == "movie":
                runtime = details.get("runtime")
                if runtime and runtime > 0:
                    entry["t"] = runtime
            else:
                # For TV, use episode_run_time if available
                ep_runtimes = details.get("episode_run_time", [])
                if ep_runtimes:
                    entry["t"] = ep_runtimes[0]

            # Use detail genres if genre_ids was empty
            if not entry["g"] and details.get("genres"):
                entry["g"] = [g["id"] for g in details["genres"]]

        results[map_key] = entry
        matched += 1

        # Progress logging every 500 items
        if (idx + 1) % 500 == 0 or idx + 1 == total:
            print(f"[TMDB] Progress: {idx + 1}/{total} ({(idx + 1) * 100 / total:.1f}%)"
                  f" -- {matched} matched, {missed} missed")
            save_cache()

    stats[f"{key_prefix}_total"] = total
    stats[f"{key_prefix}_matched"] = matched
    stats[f"{key_prefix}_missed"] = missed
    stats[f"{key_prefix}_trailers"] = trailers


# ── TypeScript output generation ─────────────────────────────────────────────

def generate_typescript(results: dict, stats: dict):
    """Generate the TypeScript output file."""
    print("[TMDB] Generating TypeScript output...")

    movie_matched = stats.get("m_matched", 0)
    movie_total = stats.get("m_total", 0)
    series_matched = stats.get("s_matched", 0)
    series_total = stats.get("s_total", 0)
    total_trailers = stats.get("m_trailers", 0) + stats.get("s_trailers", 0)
    total_entries = len(results)

    # Sort entries: movies first, then series, by ID
    def sort_key(item):
        key = item[0]
        prefix, num = key.split(":", 1)
        return (0 if prefix == "m" else 1, int(num) if num.isdigit() else 0)

    sorted_entries = sorted(results.items(), key=sort_key)

    lines = [
        "// Auto-generated by enrich-tmdb.py -- DO NOT EDIT MANUALLY",
        f"// Generated: {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())} UTC",
        f"// Movies: {movie_matched} matched of {movie_total} | Series: {series_matched} matched of {series_total}",
        f"// With trailers: {total_trailers}",
        "",
        "export interface TmdbEntry {",
        "  i: number;      // tmdb_id",
        "  g: number[];    // genre_ids",
        "  r: number;      // vote_average",
        "  v: number;      // vote_count",
        "  y?: string;     // youtube trailer key",
        "  o?: string;     // overview (120 chars max)",
        "  p?: string;     // poster_path",
        "  t?: number;     // runtime minutes",
        "}",
        "",
        "export const TMDB_MAP: Record<string, TmdbEntry> = {",
    ]

    for key, entry in sorted_entries:
        # Build the entry object string, omitting optional fields if not present
        parts = []
        parts.append(f"i:{entry['i']}")
        parts.append(f"g:{json.dumps(entry['g'])}")
        parts.append(f"r:{entry['r']}")
        parts.append(f"v:{entry['v']}")
        if "y" in entry:
            parts.append(f"y:'{_escape_ts(entry['y'])}'")
        if "o" in entry:
            parts.append(f"o:'{_escape_ts(entry['o'])}'")
        if "p" in entry:
            parts.append(f"p:'{_escape_ts(entry['p'])}'")
        if "t" in entry:
            parts.append(f"t:{entry['t']}")

        line = f"  '{key}': {{{','.join(parts)}}},"
        lines.append(line)

    lines.append("};")
    lines.append("")

    # Genre map
    lines.append("export const TMDB_GENRES: Record<number, string> = {")
    for gid, gname in sorted(ALL_GENRES.items()):
        lines.append(f"  {gid}: '{_escape_ts(gname)}',")
    lines.append("};")
    lines.append("")

    # Write file
    os.makedirs(os.path.dirname(OUTPUT_TS), exist_ok=True)
    content = "\n".join(lines)
    with open(OUTPUT_TS, "w") as f:
        f.write(content)

    file_size = os.path.getsize(OUTPUT_TS)
    size_str = f"{file_size / 1024 / 1024:.1f}MB" if file_size > 1024 * 1024 else f"{file_size / 1024:.0f}KB"

    print(f"[TMDB] Output: {OUTPUT_TS} ({size_str}, {total_entries} entries)")


def _escape_ts(s: str) -> str:
    """Escape a string for use inside single-quoted TypeScript strings."""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")


# ── Report ───────────────────────────────────────────────────────────────────

def print_report(stats: dict, results: dict):
    """Print a comprehensive summary report."""
    movie_matched = stats.get("m_matched", 0)
    movie_total = stats.get("m_total", 0)
    movie_missed = stats.get("m_missed", 0)
    series_matched = stats.get("s_matched", 0)
    series_total = stats.get("s_total", 0)
    series_missed = stats.get("s_missed", 0)
    total_trailers = stats.get("m_trailers", 0) + stats.get("s_trailers", 0)
    total_matched = movie_matched + series_matched
    total_items = movie_total + series_total

    match_pct = total_matched * 100 / max(total_items, 1)
    trailer_pct = total_trailers * 100 / max(total_matched, 1)

    print()
    print("=" * 60)
    print("         TMDB ENRICHMENT REPORT")
    print("=" * 60)
    print()
    print(f"  VOD movies:   {movie_matched}/{movie_total} matched ({movie_matched * 100 / max(movie_total, 1):.1f}%)")
    print(f"  Series:       {series_matched}/{series_total} matched ({series_matched * 100 / max(series_total, 1):.1f}%)")
    print(f"  Total:        {total_matched}/{total_items} matched ({match_pct:.1f}%)")
    print()
    print(f"  With trailers: {total_trailers} ({trailer_pct:.1f}%)")
    print(f"  Cache entries: {len(_cache)}")
    print()
    print("=" * 60)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="DashTivi+ TMDB Enrichment")
    parser.add_argument("--key", type=str, default=None,
                        help="TMDB API key (or set TMDB_API_KEY env var)")
    parser.add_argument("--tier", type=int, default=2, choices=[1, 2],
                        help="Tier 1: 2024-2026 only (fast). Tier 2: all content (default)")
    args = parser.parse_args()

    # Resolve API key
    api_key = args.key or os.environ.get("TMDB_API_KEY")
    if not api_key:
        print("ERROR: TMDB API key required.", file=sys.stderr)
        print("  Provide via --key argument or TMDB_API_KEY environment variable.", file=sys.stderr)
        print("  Get a free key at: https://www.themoviedb.org/settings/api", file=sys.stderr)
        sys.exit(1)

    start_time = time.time()
    tier = args.tier

    print("=== DashTivi+ TMDB Enrichment ===")
    print(f"[TMDB] Tier: {tier} ({'2024-2026 only' if tier == 1 else 'all content'})")
    print()

    # Load cache
    load_cache()

    # Fetch Xtream data
    vod_streams = fetch_xtream_vod()
    series_list = fetch_xtream_series()

    print(f"[TMDB] {len(vod_streams)} movies, {len(series_list)} series")

    # Filter by tier
    vod_filtered = filter_by_tier(vod_streams, tier, "vod")
    series_filtered = filter_by_tier(series_list, tier, "series")

    tier_label = f"Tier {tier}"
    if tier == 1:
        print(f"[TMDB] Processing {tier_label} (2024-2026): {len(vod_filtered)} movies, {len(series_filtered)} series")
    else:
        print(f"[TMDB] Processing {tier_label} (all): {len(vod_filtered)} movies, {len(series_filtered)} series")
    print()

    results = {}
    stats = {}

    # Process movies
    print(f"[TMDB] --- Movies ({len(vod_filtered)}) ---")
    process_items(vod_filtered, "vod", "m", "stream_id", api_key, results, stats)
    print()

    # Process series
    print(f"[TMDB] --- Series ({len(series_filtered)}) ---")
    process_items(series_filtered, "series", "s", "series_id", api_key, results, stats)
    print()

    # Save cache one final time
    save_cache()
    print(f"[TMDB] Cache saved: {len(_cache)} entries")

    # Generate output
    generate_typescript(results, stats)

    # Print report
    print_report(stats, results)

    # Final stats
    total_matched = stats.get("m_matched", 0) + stats.get("s_matched", 0)
    total_items = stats.get("m_total", 0) + stats.get("s_total", 0)
    total_trailers = stats.get("m_trailers", 0) + stats.get("s_trailers", 0)
    match_pct = total_matched * 100 / max(total_items, 1)
    trailer_pct = total_trailers * 100 / max(total_matched, 1)

    print()
    print(f"[TMDB] DONE: {total_matched}/{total_items} matched ({match_pct:.1f}%)")
    print(f"[TMDB] With trailers: {total_trailers} ({trailer_pct:.1f}%)")
    print(f"[TMDB] Output: {OUTPUT_TS}")

    elapsed = time.time() - start_time
    if elapsed > 60:
        print(f"[TMDB] Completed in {elapsed / 60:.1f} minutes")
    else:
        print(f"[TMDB] Completed in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
