#!/usr/bin/env python3
"""
DEEP probe of free HLS channels — not just "does it respond" but:
1. Is the m3u8 valid HLS?
2. Does it have video segments?
3. Can we download a segment? (confirms actual video)
4. What resolution?
5. Is it geo-blocked?
6. Is it showing a test pattern / offline screen? (tiny segment = static)

Outputs:
  - free-deep-probe.json — full results with quality info
  - free-channels-verified.json — only channels confirmed playing real video
"""
import json, os, sys, time, re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urljoin

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "free-channels.json")
RESULTS_FILE = os.path.join(os.path.dirname(__file__), "free-deep-probe.json")
VERIFIED_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "free-channels-verified.json")

with open(DATA_FILE) as f:
    channels = json.load(f)

print(f"Deep probing {len(channels)} free channels...\n")

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def fetch(url, timeout=8, max_bytes=32768):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.headers.get("Content-Type", ""), resp.read(max_bytes)

def deep_probe(ch):
    url = ch.get("url", "")
    if not url:
        return ch["id"], "dead", {"reason": "no_url"}

    try:
        # Step 1: Fetch the m3u8 playlist
        status, ctype, data = fetch(url, timeout=10)
        text = data.decode("utf-8", errors="ignore")

        # Check if it's actually HLS
        if "#EXTM3U" not in text and "#EXT-X-" not in text:
            if "<html" in text.lower() or "<!doctype" in text.lower():
                return ch["id"], "dead", {"reason": "html_page", "status": status}
            return ch["id"], "dead", {"reason": "not_hls", "status": status}

        # Step 2: Parse resolution from m3u8
        resolution = None
        bandwidth = None
        res_match = re.findall(r'RESOLUTION=(\d+x\d+)', text)
        bw_match = re.findall(r'BANDWIDTH=(\d+)', text)
        if res_match:
            resolution = res_match[-1]  # highest quality variant
        if bw_match:
            bandwidth = max(int(b) for b in bw_match)

        # Step 3: Find a segment URL to verify actual video
        # Could be a master playlist (has variant streams) or a media playlist (has segments)
        is_master = "EXT-X-STREAM-INF" in text
        segment_url = None

        if is_master:
            # Get the highest quality variant stream URL
            lines = text.strip().split("\n")
            for i, line in enumerate(lines):
                if "EXT-X-STREAM-INF" in line and i + 1 < len(lines):
                    variant = lines[i + 1].strip()
                    if variant and not variant.startswith("#"):
                        if variant.startswith("http"):
                            segment_url = variant
                        else:
                            segment_url = urljoin(url, variant)

            # Fetch the variant playlist to get actual segments
            if segment_url:
                try:
                    _, _, variant_data = fetch(segment_url, timeout=8)
                    variant_text = variant_data.decode("utf-8", errors="ignore")
                    # Find first .ts segment
                    for line in variant_text.strip().split("\n"):
                        line = line.strip()
                        if line and not line.startswith("#") and (".ts" in line or ".aac" in line or ".mp4" in line):
                            if line.startswith("http"):
                                segment_url = line
                            else:
                                segment_url = urljoin(segment_url, line)
                            break
                except:
                    pass
        else:
            # Media playlist — find first segment directly
            for line in text.strip().split("\n"):
                line = line.strip()
                if line and not line.startswith("#") and (".ts" in line or ".aac" in line or ".mp4" in line):
                    if line.startswith("http"):
                        segment_url = line
                    else:
                        segment_url = urljoin(url, line)
                    break

        # Step 4: Try to download a segment to confirm real video
        segment_ok = False
        segment_size = 0
        if segment_url:
            try:
                _, seg_ctype, seg_data = fetch(segment_url, timeout=6, max_bytes=8192)
                segment_size = len(seg_data)
                # Real video segments are usually >1KB
                # Offline/test screens might be very small or all zeros
                if segment_size > 1000:
                    segment_ok = True
                elif segment_size > 0:
                    # Check if it's all the same byte (static screen)
                    unique_bytes = len(set(seg_data[:512]))
                    if unique_bytes < 5:
                        return ch["id"], "offline_screen", {
                            "reason": "static_content",
                            "resolution": resolution,
                            "segment_size": segment_size,
                        }
                    segment_ok = True
            except:
                pass

        # Classify
        if segment_ok:
            quality = "unknown"
            if resolution:
                w = int(resolution.split("x")[0])
                if w >= 3840: quality = "4K"
                elif w >= 1920: quality = "1080p"
                elif w >= 1280: quality = "720p"
                elif w >= 854: quality = "480p"
                else: quality = "SD"
            elif bandwidth:
                if bandwidth > 4000000: quality = "1080p"
                elif bandwidth > 2000000: quality = "720p"
                elif bandwidth > 800000: quality = "480p"
                else: quality = "SD"

            return ch["id"], "verified", {
                "resolution": resolution,
                "quality": quality,
                "bandwidth": bandwidth,
                "segment_size": segment_size,
            }
        else:
            # HLS valid but no playable segment
            return ch["id"], "hls_only", {
                "reason": "no_segment",
                "resolution": resolution,
                "is_master": is_master,
            }

    except HTTPError as e:
        if e.code == 403:
            return ch["id"], "geo_blocked", {"status": 403}
        return ch["id"], "dead", {"status": e.code}
    except Exception as e:
        return ch["id"], "dead", {"reason": str(e)[:80]}


results = {}
stats = {"verified": 0, "hls_only": 0, "dead": 0, "geo_blocked": 0, "offline_screen": 0}
quality_counts = {}
start = time.time()

with ThreadPoolExecutor(max_workers=15) as pool:
    futures = {pool.submit(deep_probe, ch): ch for ch in channels}
    done = 0

    for future in as_completed(futures):
        ch_id, status, info = future.result()
        results[ch_id] = {"status": status, **(info or {})}
        stats[status] = stats.get(status, 0) + 1

        if status == "verified" and info:
            q = info.get("quality", "unknown")
            quality_counts[q] = quality_counts.get(q, 0) + 1

        done += 1
        if done % 100 == 0 or done == len(channels):
            pct = done / len(channels) * 100
            elapsed = time.time() - start
            sys.stdout.write(f"\r  {pct:.1f}% — {done}/{len(channels)} "
                f"(verified={stats['verified']} dead={stats['dead']} geo={stats['geo_blocked']} "
                f"hls_only={stats['hls_only']} offline={stats['offline_screen']}, {elapsed:.0f}s)")
            sys.stdout.flush()

        # Save incrementally every 1000
        if done % 1000 == 0:
            with open(RESULTS_FILE, "w") as f:
                json.dump({"stats": stats, "quality": quality_counts, "results": results}, f)

print(f"\n\n{'='*60}")
print(f"DEEP PROBE RESULTS:")
print(f"  ✅ Verified (real video):  {stats['verified']}")
print(f"  📡 HLS only (no segment): {stats['hls_only']}")
print(f"  🚫 Geo-blocked:           {stats['geo_blocked']}")
print(f"  📺 Offline screen:         {stats['offline_screen']}")
print(f"  ❌ Dead:                   {stats['dead']}")
print(f"\nQuality breakdown:")
for q, count in sorted(quality_counts.items(), key=lambda x: -x[1]):
    print(f"  {q:10s} {count:>5}")

# Save full results
with open(RESULTS_FILE, "w") as f:
    json.dump({"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               "stats": stats, "quality": quality_counts, "results": results}, f)

# Generate verified-only channel list
verified_ids = set(ch_id for ch_id, info in results.items() if info["status"] == "verified")
verified_channels = [ch for ch in channels if ch["id"] in verified_ids]

with open(VERIFIED_FILE, "w") as f:
    json.dump(verified_channels, f, separators=(",", ":"))

print(f"\n💾 Full results: {RESULTS_FILE}")
print(f"💾 Verified channels: {VERIFIED_FILE} ({len(verified_channels)} channels)")
print(f"⏱  {time.time()-start:.0f}s total")
