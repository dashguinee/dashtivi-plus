#!/usr/bin/env python3
"""
Build the StreamMore curated free-channel candidate set.
Hand-picks the best channels per district from free-channels-curated.json,
drops xumo (US-geo) + raw-IP, dedupes by name, writes a CANDIDATES file
that probe-streamore.py then health-checks.

"Controlled, curated, free — and it makes them want more." — The Best for our people.
"""
import json, re, os
from urllib.parse import urlparse

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "public", "free-channels-curated.json")
OUT = os.path.join(HERE, "streamore-candidates.json")

d = json.load(open(SRC))

def host(u):
    try: return (urlparse(u).hostname or "").lower()
    except: return ""

def is_dropped_cdn(u):
    h = host(u)
    if re.match(r"^\d+\.\d+\.\d+\.\d+", h): return True   # raw IP — dies
    if "xumo" in h: return True                            # US geo-lock
    return False

# Reliability hint based on CDN (we probe from FR/EU; note global vs uncertain)
GLOBAL_CDNS = ("amagi.tv", "akamai", "cloudfront", "fastly", "transmit.live",
               "getaj.net", "france24.com", "skynewsarabia", "rttv.com",
               "tv5monde", "plex.tv", "jmp2.uk", "tubi.video", "pluto.tv",
               "samsung", "rakuten", "stingray.com", "frequency.stream",
               "getpublica", "otteravision", "edgenextcdn", "klowdtv")

def cdn_class(u):
    h = host(u)
    if any(g in h for g in GLOBAL_CDNS): return "global"
    return "uncertain"

cand = [c for c in d if not is_dropped_cdn(c["url"])]
by_name = {}
for c in cand:
    by_name.setdefault(c["name"].strip(), []).append(c)

def pick(names_exact=None, name_contains=None, prefer_culture=None,
         prefer_cdn=True, exclude=None, limit=99):
    """Return list of channel dicts matching, best CDN first, deduped by name."""
    exclude = [e.lower() for e in (exclude or [])]
    chosen = []
    seen = set()
    pool = []
    for c in cand:
        n = c["name"].lower().strip()
        if any(x in n for x in exclude): continue
        if names_exact and c["name"].strip() in names_exact:
            pool.append(c)
        elif name_contains and any(k in n for k in name_contains):
            pool.append(c)
    # sort: global cdn first, then 1080p/HD bonus
    def score(c):
        s = 0
        if cdn_class(c["url"]) == "global": s += 100
        if prefer_culture and c.get("culture") in prefer_culture: s += 20
        nl = c["name"].lower()
        if "1080" in nl or " hd" in nl: s += 5
        if "jmp2.uk" in host(c["url"]): s += 3  # plex-backed, reliable
        return -s
    pool.sort(key=score)
    for c in pool:
        key = re.sub(r"\s*\(.*?\)\s*", "", c["name"]).strip().lower()  # dedupe ignoring (1080p)
        key = re.sub(r"^\d+\s+", "", key)  # strip leading channel numbers
        if key in seen: continue
        seen.add(key)
        chosen.append(c)
        if len(chosen) >= limit: break
    return chosen

DISTRICTS = {}

# ---------- SPORTS (football first — #1 draw) ----------
DISTRICTS["sports"] = pick(name_contains=[
    "bein sports xtra", "ftf sports", "fubo sports", "sportsgrid",
    "trace sports stars", "world of freesports", "more than sports",
    "msg sportszone", "bleav football", "speed sports",
], exclude=["women", "fishing", "uz", "astrakhan", "rete 8", "tvr", "tvri",
            "qazsport", "as3", "classic sports", "bek tv", "stars (australia)"],
   limit=10)

# ---------- MOVIES (24/7 hop-on-and-watch) ----------
DISTRICTS["movies"] = pick(name_contains=[
    "moviesphere", "movie sphere", "maverick black cinema", "action hollywood movies",
    "mytime movie network", "my cinema", "surf cinema", "moviedome",
    "grjngo", "cinevault", "drive in movie", "cowboy movie", "discoverfilm",
    "movies thriller", "movies action", "meta film",
], exclude=["india", "hindi", "bhojpuri", "b4u", "sony", "persiana", "afra",
            "kuriakos", "italy", "italian", "la7", "tf1", "30a", "ebs", "tvs ",
            "shubh", "maha", "public movies", "xtrema", "aurora", "ctb", "alpha",
            "hallmark", "lifetime", "holiday", "family", "kidsflix", "pocket",
            "cafe film", "grand cinema", "mexico", "brazil", "spain"],
   limit=14)

# ---------- NEWS (world + franco + african + arabic) ----------
DISTRICTS["news"] = pick(name_contains=[
    "france 24", "africanews", "al jazeera english", "al jazeera arabic",
    "sky news arabia", "euronews english", "euronews français", "dw news",
    "cgtn news", "rt news", "afrique54", "reuters", "newsmax2",
], exclude=["español", "espanol", "deutsch", "italiano", "portuguese", "albania",
            "русский", "russian", "vertical", "mubasher", "broadcast", "usa",
            "extra", "bharat", "n1", "cymru", "scotland", "gaidheal"],
   limit=12)

# ---------- MUSIC ----------
DISTRICTS["music"] = pick(name_contains=[
    "trace urban", "afrobeats", "vevo pop", "vevo 2k", "stingray urban beat",
    "stingray soul storm", "stingray hit list", "music legends", "b4u music",
    "trace ", "afroland", "totalmusic concerts",
], exclude=["sport", "stars", "australia", "naturescape", "spa", "karaoke",
            "classica", "djazz", "smooth jazz", "kpop", "country", "80s", "90s",
            "70s", "holiday", "zenlife", "qello", "cmusic", "easy listening"],
   limit=10)

# ---------- KIDS ----------
DISTRICTS["kids"] = pick(name_contains=[
    "moonbug kids", "mr bean", "baby shark", "looloo kids", "toongoggles",
    "kidz bop", "kartoon channel", "cartoon classics", "kids pang", "kidsflix",
    "kids tv", "loolookids",
], exclude=["pbs", "3abn", "aghapy", "peniel", "logos", "sat 7", "biznet",
            "tvcarib", "4 fun", "ebs", "extrema", "xtrema", "bejoy", "kuriakos"],
   limit=8)

# ---------- DISCOVER / DOCS ----------
DISTRICTS["discover"] = pick(name_contains=[
    "love nature", "wildearth", "wild earth", "nature time", "naturetime",
    "terra mater", "adventure earth", "bbc earth", "history hit", "true history",
    "discovery asia", "xtreme outdoor",
], exclude=["polsat", "naturescape", "planete+"],
   limit=10)

# ---------- FRENCH (Guinea is Francophone — high value) ----------
DISTRICTS["french"] = pick(name_contains=[
    "tv5monde", "tv5 monde", "arte", "france 24", "tf1 series films",
    "gulli", "rmc life", "tv5 monde info", "francophonie", "bfm",
], exclude=["kannada", "finland", "asia", "asie", "orler", "aurora", "english",
            "español", "arabic", "lyon", "handicap", "style", "bharat"],
   limit=10)

# ---------- AFRICAN ----------
DISTRICTS["african"] = pick(name_contains=[
    "voxafrica", "vox africa", "africa 24", "medi1tv afrique", "wazobia max",
    "adinkra tv", "afroland", "a2i tv", "espace tv", "kalac tv", "afroculture",
    "afro magic", "life tv europe", "angel tv africa", "afrique54",
], exclude=["religion", "estonia", "india", "europe tv"],
   limit=10)

# Flatten + tag, global dedupe across districts (a channel appears once)
final = []
global_seen = set()
order = ["sports", "movies", "news", "music", "kids", "discover", "french", "african"]
for dist in order:
    for c in DISTRICTS[dist]:
        key = re.sub(r"\s*\(.*?\)\s*", "", c["name"]).strip().lower()
        key = re.sub(r"^\d+\s+", "", key)
        if key in global_seen: continue
        global_seen.add(key)
        final.append({
            "id": c["id"],
            "name": re.sub(r"^\d+\s+", "", c["name"]).strip(),
            "url": c["url"],
            "logo": c.get("logo") or None,
            "district": dist,
            "experience": c.get("experience"),
            "culture": c.get("culture"),
            "source": "free",
            "cdn": host(c["url"]),
            "cdn_class": cdn_class(c["url"]),
        })

json.dump(final, open(OUT, "w"), indent=2)
from collections import Counter
print("CANDIDATES:", len(final))
print("by district:", dict(Counter(c["district"] for c in final)))
print("by cdn_class:", dict(Counter(c["cdn_class"] for c in final)))
print("written:", OUT)
