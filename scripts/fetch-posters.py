#!/usr/bin/env python3
"""Fast TMDB poster fetch — concurrent + incremental saves."""
import json, os, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError

API_KEY = os.environ.get("TMDB_API_KEY")
if not API_KEY:
    print("Set TMDB_API_KEY env var"); sys.exit(1)

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "tmdb-data.json")

with open(DATA_FILE) as f:
    data = json.load(f)

tmdb_map = data.get("TMDB_MAP", data)
to_fetch = [(k, v) for k, v in tmdb_map.items() if "p" not in v and "i" in v]
already = len(tmdb_map) - len(to_fetch)
print(f"Total: {len(tmdb_map)} | Already: {already} | Need: {len(to_fetch)}")

def fetch_one(key, entry):
    tmdb_id = entry["i"]
    media_type = "movie" if key.startswith("m:") else "tv"
    url = f"https://api.themoviedb.org/3/{media_type}/{tmdb_id}?api_key={API_KEY}&language=en-US"
    try:
        req = Request(url, headers={"Accept": "application/json"})
        with urlopen(req, timeout=6) as resp:
            result = json.loads(resp.read())
            poster = result.get("poster_path")
            if poster:
                return key, poster
    except:
        pass
    return key, None

fetched = 0
failed = 0
start = time.time()

# 8 concurrent threads, TMDB allows ~40 req/10s
with ThreadPoolExecutor(max_workers=8) as pool:
    batch_size = 500
    for batch_start in range(0, len(to_fetch), batch_size):
        batch = to_fetch[batch_start:batch_start + batch_size]
        futures = {pool.submit(fetch_one, k, v): k for k, v in batch}

        for future in as_completed(futures):
            key, poster = future.result()
            if poster:
                tmdb_map[key]["p"] = poster
                fetched += 1
            else:
                failed += 1

        done = batch_start + len(batch)
        pct = done / len(to_fetch) * 100
        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = (len(to_fetch) - done) / rate if rate > 0 else 0
        print(f"  {pct:.1f}% — {done}/{len(to_fetch)} ({fetched} posters, {failed} failed, {eta:.0f}s left)")
        sys.stdout.flush()

        # Save every 2000 entries
        if done % 2000 == 0 or done >= len(to_fetch):
            with open(DATA_FILE, "w") as f:
                json.dump(data, f, separators=(",", ":"))

        # Brief pause between batches to stay under rate limit
        time.sleep(0.5)

# Final save
with open(DATA_FILE, "w") as f:
    json.dump(data, f, separators=(",", ":"))

size_mb = os.path.getsize(DATA_FILE) / 1024 / 1024
print(f"\n✅ Done: {fetched} posters | {failed} failed | {size_mb:.1f}MB | {time.time()-start:.0f}s")
