#!/usr/bin/env python3
"""
Health-check the StreamMore candidate subset.
Reads scripts/streamore-candidates.json, probes each URL (follows redirects,
e.g. jmp2.uk -> plex -> stream), classifies live/weak/dead.
Writes scripts/streamore-probe-results.json.
"""
import json, os, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import HTTPError

HERE = os.path.dirname(__file__)
DATA_FILE = os.path.join(HERE, "streamore-candidates.json")
RESULTS_FILE = os.path.join(HERE, "streamore-probe-results.json")

channels = json.load(open(DATA_FILE))
print(f"Probing {len(channels)} StreamMore candidates...\n")

def probe(ch):
    url = ch.get("url", "")
    if not url:
        return ch["id"], "dead", "no url"
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
        with urlopen(req, timeout=12) as resp:   # urlopen follows 3xx
            data = resp.read(8192)
            final_url = resp.geturl()
            if b"#EXTM3U" in data or b"#EXT-X-" in data:
                return ch["id"], "live", final_url[:80]
            # plex EPG sometimes returns a nested m3u8 pointer / segment
            if final_url.endswith(".m3u8") and len(data) > 50:
                return ch["id"], "live", final_url[:80]
            if b"<?xml" in data or b"<html" in data or b"<!DOCTYPE" in data:
                return ch["id"], "dead", "html/xml"
            if len(data) > 200:
                return ch["id"], "weak", f"{len(data)}b non-hls"
            return ch["id"], "dead", f"{len(data)}b"
    except HTTPError as e:
        return ch["id"], "dead", f"http {e.code}"
    except Exception as e:
        return ch["id"], "dead", str(e)[:50]

results = {}
detail = {}
with ThreadPoolExecutor(max_workers=16) as pool:
    futs = {pool.submit(probe, ch): ch for ch in channels}
    for f in as_completed(futs):
        cid, status, info = f.result()
        results[cid] = status
        detail[cid] = info

live = [c for c in channels if results.get(c["id"]) == "live"]
weak = [c for c in channels if results.get(c["id"]) == "weak"]
dead = [c for c in channels if results.get(c["id"]) == "dead"]

print(f"LIVE: {len(live)}  WEAK: {len(weak)}  DEAD: {len(dead)}\n")
for label, group in (("LIVE", live), ("WEAK", weak), ("DEAD", dead)):
    print(f"--- {label} ---")
    for c in group:
        print(f"  [{c['district'][:5]:5}] {c['name'][:34]:36} {c['cdn_class'][:4]}  {detail[c['id']][:50]}")
    print()

json.dump({
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "total": len(channels),
    "live": [c["id"] for c in live],
    "weak": [c["id"] for c in weak],
    "dead": [c["id"] for c in dead],
    "detail": detail,
}, open(RESULTS_FILE, "w"), indent=2)
print("written:", RESULTS_FILE)
