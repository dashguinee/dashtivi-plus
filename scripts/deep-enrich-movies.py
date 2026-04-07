#!/usr/bin/env python3
"""
TMDB Deep Enrichment for DashTivi+ Movies
==========================================
Fetches rich metadata (overview, cast, director, keywords, trailer, etc.)
for movies in tmdb-data.json, sorted by rating descending (best first).

Resume-safe: skips entries already in tmdb-deep-cache.json.
Rate-limited: 35 requests per 10 seconds (TMDB free tier = 40/10s).

Usage:
    python3 deep-enrich-movies.py [--limit N]  (default: 5000)
"""

import json
import time
import sys
import os
import argparse
from pathlib import Path

import requests

# ----- Config -----
TMDB_API_KEY = "632e644be9521013bdac3661ae65494e"
TMDB_BASE = "https://api.themoviedb.org/3/movie"
RATE_LIMIT = 35          # requests per window
RATE_WINDOW = 10.0       # seconds
SAVE_INTERVAL = 50       # save cache every N movies
TMDB_DATA_PATH = Path("/home/dash/tivi-plus/public/tmdb-data.json")
CACHE_PATH = Path("/home/dash/tivi-plus/scripts/tmdb-deep-cache.json")


def load_json(path):
    if path.exists():
        with open(path, "r") as f:
            return json.load(f)
    return {}


def save_json(path, data):
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    tmp.rename(path)


def extract_trailer(videos_data):
    """Find best YouTube trailer from videos results."""
    if not videos_data or "results" not in videos_data:
        return None
    results = videos_data["results"]
    # Priority: Official Trailer on YouTube
    for v in results:
        if (v.get("site") == "YouTube"
                and v.get("type") == "Trailer"
                and v.get("official", False)):
            return v.get("key")
    # Fallback: any YouTube Trailer
    for v in results:
        if v.get("site") == "YouTube" and v.get("type") == "Trailer":
            return v.get("key")
    # Fallback: any YouTube Teaser
    for v in results:
        if v.get("site") == "YouTube" and v.get("type") == "Teaser":
            return v.get("key")
    return None


def extract_enrichment(data):
    """Extract the fields we care about from the full TMDB response."""
    result = {}

    result["overview"] = data.get("overview", "")
    result["tagline"] = data.get("tagline", "")
    result["popularity"] = data.get("popularity", 0)
    result["vote_count"] = data.get("vote_count", 0)
    result["revenue"] = data.get("revenue", 0)
    result["budget"] = data.get("budget", 0)
    result["release_date"] = data.get("release_date", "")

    # Spoken languages
    langs = data.get("spoken_languages", [])
    result["languages"] = [l.get("iso_639_1", "") for l in langs if l.get("iso_639_1")]

    # Production companies (first 3)
    companies = data.get("production_companies", [])
    result["studios"] = [c.get("name", "") for c in companies[:3] if c.get("name")]

    # Keywords
    kw_data = data.get("keywords", {})
    kw_list = kw_data.get("keywords", [])
    result["keywords"] = [k.get("name", "") for k in kw_list if k.get("name")]

    # Cast (top 5)
    credits = data.get("credits", {})
    cast_list = credits.get("cast", [])
    result["cast"] = [c.get("name", "") for c in cast_list[:5] if c.get("name")]

    # Director
    crew_list = credits.get("crew", [])
    directors = [c.get("name", "") for c in crew_list if c.get("job") == "Director"]
    result["director"] = directors[0] if directors else ""

    # Trailer
    result["trailer_key"] = extract_trailer(data.get("videos"))

    return result


def main():
    parser = argparse.ArgumentParser(description="TMDB Deep Enrichment")
    parser.add_argument("--limit", type=int, default=5000,
                        help="Max movies to enrich (default: 5000)")
    args = parser.parse_args()

    print(f"[TMDB Deep Enrich] Loading tmdb-data.json...")
    tmdb_data = load_json(TMDB_DATA_PATH)
    print(f"[TMDB Deep Enrich] Loading cache...")
    cache = load_json(CACHE_PATH)

    # Collect movie entries with their TMDB IDs and ratings
    movies = []
    for key, val in tmdb_data.items():
        if not key.startswith("m:"):
            continue
        tmdb_id = val.get("i")
        if tmdb_id is None:
            continue
        rating = val.get("r", 0) or 0
        movies.append((key, tmdb_id, rating, val))

    # Sort by rating descending (best content first)
    movies.sort(key=lambda x: x[2], reverse=True)

    # Filter out already-cached
    to_process = [(key, tid, r, val) for key, tid, r, val in movies
                  if str(tid) not in cache]

    total_available = len(to_process)
    limit = min(args.limit, total_available)
    to_process = to_process[:limit]

    print(f"[TMDB Deep Enrich] Total movies: {len(movies)}")
    print(f"[TMDB Deep Enrich] Already cached: {len(cache)}")
    print(f"[TMDB Deep Enrich] To process this run: {limit} (of {total_available} remaining)")
    print()

    if limit == 0:
        print("[TMDB Deep Enrich] Nothing to do!")
        return

    session = requests.Session()
    session.headers.update({
        "Accept": "application/json"
    })

    processed = 0
    errors = 0
    trailers_found = 0
    trailers_filled = 0  # trailers found for movies that were missing them
    window_start = time.time()
    window_count = 0
    tmdb_data_modified = False

    for idx, (key, tmdb_id, rating, original_val) in enumerate(to_process):
        # Rate limiting
        if window_count >= RATE_LIMIT:
            elapsed = time.time() - window_start
            if elapsed < RATE_WINDOW:
                sleep_time = RATE_WINDOW - elapsed + 0.1
                time.sleep(sleep_time)
            window_start = time.time()
            window_count = 0

        # API call
        url = f"{TMDB_BASE}/{tmdb_id}"
        params = {
            "api_key": TMDB_API_KEY,
            "append_to_response": "keywords,videos,credits"
        }

        try:
            resp = session.get(url, params=params, timeout=15)
            window_count += 1

            if resp.status_code == 429:
                # Rate limited — wait and retry
                retry_after = float(resp.headers.get("Retry-After", 5))
                print(f"  [429] Rate limited, sleeping {retry_after}s...")
                time.sleep(retry_after + 0.5)
                window_start = time.time()
                window_count = 0
                resp = session.get(url, params=params, timeout=15)
                window_count += 1

            if resp.status_code == 404:
                # Movie not found on TMDB — cache as empty
                cache[str(tmdb_id)] = {"_missing": True}
                processed += 1
                continue

            if resp.status_code != 200:
                print(f"  [ERR] {key} (tmdb:{tmdb_id}) -> HTTP {resp.status_code}")
                errors += 1
                continue

            data = resp.json()
            enrichment = extract_enrichment(data)
            cache[str(tmdb_id)] = enrichment
            processed += 1

            # Track trailer stats
            if enrichment["trailer_key"]:
                trailers_found += 1

                # Fill missing trailer in tmdb-data.json
                had_trailer = original_val.get("y")
                if not had_trailer:
                    original_val["y"] = enrichment["trailer_key"]
                    tmdb_data[key] = original_val
                    tmdb_data_modified = True
                    trailers_filled += 1

        except requests.exceptions.Timeout:
            print(f"  [TIMEOUT] {key} (tmdb:{tmdb_id})")
            errors += 1
        except requests.exceptions.ConnectionError:
            print(f"  [CONN_ERR] {key} (tmdb:{tmdb_id}) — waiting 5s")
            errors += 1
            time.sleep(5)
        except Exception as e:
            print(f"  [ERR] {key} (tmdb:{tmdb_id}) -> {e}")
            errors += 1

        # Progress
        if (processed > 0 and processed % 100 == 0) or processed == limit:
            elapsed_total = time.time() - window_start
            print(f"  [{processed}/{limit}] enriched | "
                  f"{trailers_found} trailers found | "
                  f"{trailers_filled} trailers filled (were missing) | "
                  f"{errors} errors")

        # Save periodically
        if processed > 0 and processed % SAVE_INTERVAL == 0:
            save_json(CACHE_PATH, cache)

    # Final save
    save_json(CACHE_PATH, cache)
    print()
    print(f"[DONE] Enriched: {processed} | Errors: {errors}")
    print(f"[DONE] Trailers found: {trailers_found} | Trailers filled (were missing): {trailers_filled}")
    print(f"[DONE] Cache total: {len(cache)} entries -> {CACHE_PATH}")

    # Update tmdb-data.json if we filled any trailers
    if tmdb_data_modified:
        print(f"[DONE] Updating tmdb-data.json with {trailers_filled} new trailer keys...")
        save_json(TMDB_DATA_PATH, tmdb_data)
        print(f"[DONE] tmdb-data.json updated.")
    else:
        print(f"[DONE] No trailer updates needed for tmdb-data.json.")


if __name__ == "__main__":
    main()
