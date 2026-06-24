#!/usr/bin/env python3
"""
Health-check the WIDE pre-filter pool (scripts/pool-prefilter.json).
Follows redirects (jmp2.uk -> plex -> stream). Classifies live/weak/dead.
Writes scripts/pool-probe-results.json.
"""
import json, os, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import HTTPError

HERE = os.path.dirname(__file__)
DATA_FILE = os.path.join(HERE, "pool-prefilter.json")
RESULTS_FILE = os.path.join(HERE, "pool-probe-results.json")

channels = json.load(open(DATA_FILE))
print(f"Probing {len(channels)} pool candidates...\n")

def probe(ch):
    url = ch.get("url","")
    if not url: return ch["id"], "dead", "no url"
    try:
        req = Request(url, headers={"User-Agent":"Mozilla/5.0","Accept":"*/*"})
        with urlopen(req, timeout=12) as resp:
            data = resp.read(8192)
            final_url = resp.geturl()
            if b"#EXTM3U" in data or b"#EXT-X-" in data:
                return ch["id"], "live", final_url[:70]
            if final_url.endswith(".m3u8") and len(data) > 50:
                return ch["id"], "live", final_url[:70]
            if b"<?xml" in data or b"<html" in data or b"<!DOCTYPE" in data:
                return ch["id"], "dead", "html/xml"
            if len(data) > 200:
                return ch["id"], "weak", f"{len(data)}b non-hls"
            return ch["id"], "dead", f"{len(data)}b"
    except HTTPError as e:
        return ch["id"], "dead", f"http {e.code}"
    except Exception as e:
        return ch["id"], "dead", str(e)[:45]

results, detail = {}, {}
start = time.time()
done = 0
with ThreadPoolExecutor(max_workers=24) as pool:
    futs = {pool.submit(probe, ch): ch for ch in channels}
    for f in as_completed(futs):
        cid, status, info = f.result()
        results[cid] = status; detail[cid] = info
        done += 1
        if done % 50 == 0 or done == len(channels):
            print(f"\r  {done}/{len(channels)} ({time.time()-start:.0f}s)", end="", flush=True)

live = sum(1 for s in results.values() if s=="live")
weak = sum(1 for s in results.values() if s=="weak")
dead = sum(1 for s in results.values() if s=="dead")
print(f"\n\nLIVE {live}  WEAK {weak}  DEAD {dead}")
json.dump({
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "total": len(channels),
    "status": results, "detail": detail,
}, open(RESULTS_FILE,"w"), indent=2)
print("written:", RESULTS_FILE)
