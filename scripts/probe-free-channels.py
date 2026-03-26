#!/usr/bin/env python3
"""
Probe all 5,234 free HLS channels — check if they actually play.
Tests each URL for a valid HLS response (m3u8 playlist or segment).
Saves results to free-probe-results.json.

Usage: python3 probe-free-channels.py
"""
import json, os, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "free-channels.json")
RESULTS_FILE = os.path.join(os.path.dirname(__file__), "free-probe-results.json")

with open(DATA_FILE) as f:
    channels = json.load(f)

print(f"Probing {len(channels)} free channels...\n")

def probe(ch):
    url = ch.get("url", "")
    if not url:
        return ch["id"], "dead", None
    try:
        req = Request(url, headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "*/*",
        })
        with urlopen(req, timeout=8) as resp:
            status = resp.status
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read(4096)
            size = len(data)

            # Check if it's a valid HLS response
            if b"#EXTM3U" in data or b"#EXT-X-" in data:
                return ch["id"], "live", {"status": status, "size": size, "type": "hls"}
            elif b"<?xml" in data or b"<html" in data:
                return ch["id"], "dead", {"status": status, "reason": "html/xml"}
            elif size > 100:
                return ch["id"], "weak", {"status": status, "size": size}
            else:
                return ch["id"], "dead", {"status": status, "size": size}
    except HTTPError as e:
        return ch["id"], "dead", {"status": e.code}
    except Exception as e:
        return ch["id"], "dead", {"reason": str(e)[:50]}

results = {}
start = time.time()
live = 0
dead = 0
weak = 0

with ThreadPoolExecutor(max_workers=20) as pool:
    futures = {pool.submit(probe, ch): ch for ch in channels}
    done_count = 0

    for future in as_completed(futures):
        ch_id, status, info = future.result()
        results[ch_id] = status
        if status == "live": live += 1
        elif status == "weak": weak += 1
        else: dead += 1
        done_count += 1

        if done_count % 200 == 0 or done_count == len(channels):
            pct = done_count / len(channels) * 100
            elapsed = time.time() - start
            print(f"\r  {pct:.1f}% — {done_count}/{len(channels)} (live={live} dead={dead} weak={weak}, {elapsed:.0f}s)", end="", flush=True)

print(f"\n\n✅ Results:")
print(f"  Live: {live}")
print(f"  Weak: {weak}")
print(f"  Dead: {dead}")

# Save results
alive_ids = [ch_id for ch_id, status in results.items() if status in ("live", "weak")]
output = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "total": len(channels),
    "live": live,
    "weak": weak,
    "dead": dead,
    "alive_ids": alive_ids,
    "dead_ids": [ch_id for ch_id, status in results.items() if status == "dead"],
}

with open(RESULTS_FILE, "w") as f:
    json.dump(output, f)

# Also generate a clean free-channels list with only alive ones
alive_set = set(alive_ids)
alive_channels = [ch for ch in channels if ch["id"] in alive_set]

CLEAN_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "free-channels-clean.json")
with open(CLEAN_FILE, "w") as f:
    json.dump(alive_channels, f, separators=(",", ":"))

clean_mb = os.path.getsize(CLEAN_FILE) / 1024 / 1024
print(f"\n💾 Probe results: {RESULTS_FILE}")
print(f"💾 Clean channels: {CLEAN_FILE} ({len(alive_channels)} channels, {clean_mb:.1f}MB)")
print(f"⏱  {time.time()-start:.0f}s total")
