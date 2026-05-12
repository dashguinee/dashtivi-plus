#!/usr/bin/env python3
"""Curator — filter the 4922 curated channels by probe data. Only show alive."""
import json, time, os

PROBE = "/tmp/probe-results.json"
CURATOR = "/tmp/curator.json"

if not os.path.exists(PROBE):
    print(f"[CURATOR] No probe data yet — skipping. Run probe-curated.py first.")
    exit(0)

with open(PROBE) as f:
    alive_set = set(json.load(f)["alive_set"])
print(f"[CURATOR] {len(alive_set)} verified alive", flush=True)

# Load deployed curation (scp'd from Vercel)
with open(CURATOR) as f:
    curated = json.load(f)

# Filter each theme
total = 0
for theme, chs in curated["experiences"].items():
    before = len(chs)
    curated["experiences"][theme] = [c for c in chs if c["id"] in alive_set]
    after = len(curated["experiences"][theme])
    total += after
    print(f"  {theme}: {before} → {after} (filtered {before-after} dead)", flush=True)

curated["total_alive"] = total
curated["ts"] = int(time.time())
curated["version"] = "live"

with open(CURATOR, "w") as f:
    json.dump(curated, f)

print(f"[DONE] {total} alive curated channels → {CURATOR}", flush=True)
