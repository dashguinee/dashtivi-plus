#!/usr/bin/env python3
"""
Assemble the FINAL streamore-curated.json from:
  - streamore-candidates.json (the 82 hand-picked)
  - streamore-probe-results.json (keep only 'live')
  - a few manual French recoveries (probed live separately)
Output: public/streamore-curated.json
"""
import json, os, re
from urllib.parse import urlparse

HERE = os.path.dirname(__file__)
cands = json.load(open(os.path.join(HERE, "streamore-candidates.json")))
probe = json.load(open(os.path.join(HERE, "streamore-probe-results.json")))
SRC = json.load(open(os.path.join(HERE, "..", "public", "free-channels-curated.json")))
byname = {c["name"]: c for c in SRC}
OUT = os.path.join(HERE, "..", "public", "streamore-curated.json")

live_ids = set(probe["live"])

# Manual French recoveries — probed LIVE in this build (replace geo-locked netplus.ch dead set)
RECOVER = [
    ("TV5MONDE STYLE", "french"),
    ("BFM Lyon", "french"),
    ("Aurora Arte", "french"),
]

def host(u):
    try: return (urlparse(u).hostname or "").lower()
    except: return ""

GLOBAL_CDNS = ("amagi.tv","akamai","cloudfront","fastly","transmit.live","getaj.net",
               "france24.com","skynewsarabia","rttv.com","tv5monde","plex.tv","jmp2.uk",
               "tubi.video","pluto.tv","samsung","rakuten","stingray.com","frequency.stream",
               "getpublica","otteravision","edgenextcdn","klowdtv","mediatailor","playout.now")
def cdn_class(u):
    h = host(u)
    return "global" if any(g in h for g in GLOBAL_CDNS) else "uncertain"

def clean_name(n):
    n = re.sub(r"^\d+\s+", "", n).strip()
    return n

final = []
seen = set()

def add(name, district, exp=None, cul=None, src_url=None, logo=None, cid=None):
    nm = clean_name(name)
    key = re.sub(r"\s*\(.*?\)\s*", "", nm).strip().lower()
    if key in seen: return
    seen.add(key)
    final.append({
        "id": cid or ("sm-" + re.sub(r"[^a-z0-9]+","-",key).strip("-")),
        "name": nm,
        "url": src_url,
        "logo": logo or None,
        "district": district,
        "experience": exp,
        "culture": cul,
        "source": "free",
        "tested": True,
    })

# 1) all live candidates
for c in cands:
    if c["id"] not in live_ids: continue
    add(c["name"], c["district"], c.get("experience"), c.get("culture"),
        c["url"], c.get("logo"), c["id"])

# 2) French recoveries
for name, dist in RECOVER:
    sc = byname.get(name)
    if not sc: continue
    add(name, dist, sc.get("experience"), sc.get("culture"), sc["url"], sc.get("logo"))

# District ordering for the output (sports first — the draw)
order = {"sports":0,"movies":1,"news":2,"french":3,"african":4,"music":5,"kids":6,"discover":7}
final.sort(key=lambda c: (order.get(c["district"],9), c["name"].lower()))

from collections import Counter
dc = dict(Counter(c["district"] for c in final))
glob = sum(1 for c in final if cdn_class(c["url"])=="global")

out = {
    "version": "2026.06.24.1",
    "generated_note": ("StreamMore — DASH's controlled, curated, free discovery layer. "
        "The Best for our people (Guinea / Sierra Leone / West Africa, Franco+Anglo). "
        f"{len(final)} channels, every one health-checked live on 2026-06-24. "
        "Hand-quality list, not a dump. xumo (US-geo) + raw-IP + dead/weak DROPPED. "
        f"{glob}/{len(final)} on reliably-global CDNs (amagi/akamai/cloudfront/samsung-wurl/"
        "france24/getaj/tv5monde/plex); the rest probed-live but geo-uncertain from a "
        "FR/EU vantage (note for African/origin-region channels which may behave differently "
        "from Guinea)."),
    "total": len(final),
    "districts": dc,
    "channels": final,
}
json.dump(out, open(OUT, "w"), indent=2, ensure_ascii=False)
print("FINAL total:", len(final))
print("districts:", dc)
print(f"global-CDN: {glob}  uncertain: {len(final)-glob}")
print("written:", OUT)
EOF_MARKER_NONE = None
