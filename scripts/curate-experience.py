#!/usr/bin/env python3
"""
DashTivi+ Experience Curator — Analyze EVERY alive channel by name.
Groups channels by ACTUAL content (not API category) to build intelligent collections.
"""
import json, re
from collections import defaultdict

PROBE = "/home/dash/tivi-plus/scripts/channel-probe-results.json"
RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
OUT = "/home/dash/tivi-plus/scripts/CURATED-EXPERIENCE.md"

probe = json.load(open(PROBE))
raw = json.load(open(RAW))

# Get all alive channels
alive = []
for sid, info in probe["streams"].items():
    if info["probe_status"] in ("live", "weak"):
        alive.append(info)

print(f"Total alive channels: {len(alive)}")

# ═══════════════════════════════════════════════════════════════════
# CONTENT CLASSIFICATION ENGINE
# Classifies channels by ACTUAL content, not API category
# ═══════════════════════════════════════════════════════════════════

def classify_channel(name, cat_name, cat_id):
    """Classify a channel into content buckets based on name analysis."""
    n = name.lower()
    cn = cat_name.lower()
    tags = set()

    # ── SPORTS ────────────────────────────────────────
    # Football/Soccer
    if any(k in n for k in ["football", "soccer", "premier league", "champions", "la liga",
                             "serie a", "bundesliga", "ligue 1", "epl", "ucl", "supersport psl",
                             "supersport premier", "bein sport"]):
        tags.add("sports:football")

    # Cricket
    if any(k in n for k in ["cricket", "ipl", "t20", "willow"]):
        tags.add("sports:cricket")

    # F1/Racing
    if any(k in n for k in ["f1", "formula 1", "motogp", "racing", "motorsport", "nascar"]):
        tags.add("sports:racing")

    # Tennis
    if any(k in n for k in ["tennis", "wimbledon", "atp", "wta"]):
        tags.add("sports:tennis")

    # Boxing/MMA/Wrestling
    if any(k in n for k in ["boxing", "ufc", "mma", "wwe", "wrestling", "ppv", "fight"]):
        tags.add("sports:combat")

    # Basketball
    if any(k in n for k in ["nba", "basketball", "wnba"]):
        tags.add("sports:basketball")

    # American Football
    if any(k in n for k in ["nfl", "redzone"]):
        tags.add("sports:nfl")

    # Golf
    if any(k in n for k in ["golf", "pga"]):
        tags.add("sports:golf")

    # Rugby
    if "rugby" in n:
        tags.add("sports:rugby")

    # General sports channels
    if any(k in n for k in ["sky sport", "bein sport", "supersport", "espn", "fox sport",
                             "star sport", "sony sport", "tnt sport", "bt sport", "sport"]):
        tags.add("sports:general")

    # ── NEWS ──────────────────────────────────────────
    if any(k in n for k in ["news", "cnn", "bbc world", "al jazeera", "france 24",
                             "sky news", "fox news", "msnbc", "cnbc", "bloomberg",
                             "euronews", "dw news", "rt ", "trt world", "ndtv",
                             "abn ", "republic", "india today", "times now",
                             "geo news", "ary news", "samaa", "dawn news",
                             "ntv ", "wion"]):
        tags.add("news")

    # ── ENTERTAINMENT ─────────────────────────────────
    if any(k in n for k in ["entertainment", "star plus", "colors", "zee tv", "sony",
                             "star bharat", "sab ", "&tv", "set max", "mtv",
                             "vh1", "comedy central", "e! ", "bravo", "tlc",
                             "lifetime", "hallmark", "bet "]):
        tags.add("entertainment")

    # ── MOVIES ────────────────────────────────────────
    if any(k in n for k in ["movie", "cinema", "hbo", "showtime", "starz",
                             "cinemax", "fx ", "amc ", "tcm ", "paramount",
                             "sony max", "set max", "star gold", "zee cinema",
                             "& pictures", "b4u"]):
        tags.add("movies")

    # ── KIDS ──────────────────────────────────────────
    if any(k in n for k in ["kids", "cartoon", "nick", "disney", "pogo", "hungama",
                             "baby tv", "cbeebies", "boomerang", "toonami",
                             "sonic ", "animax"]):
        tags.add("kids")

    # ── DOCUMENTARY/LEARNING ──────────────────────────
    if any(k in n for k in ["discovery", "national geographic", "nat geo", "history",
                             "animal planet", "science", "curiosity", "smithsonian",
                             "bbc earth", "love nature", "dw documentary",
                             "viasat explore", "viasat history", "viasat nature",
                             "travel", "food network", "hgtv", "diy ",
                             "investigation", "crime", "id "]):
        tags.add("documentary")

    # ── MUSIC ─────────────────────────────────────────
    if any(k in n for k in ["music", "mtv", "vh1", "trace", "b4u music",
                             "9xm", "mastiii", "singer", "zing"]):
        tags.add("music")

    # ── RELIGIOUS/SPIRITUAL ───────────────────────────
    if any(k in n for k in ["islamic", "quran", "peace tv", "huda", "iqraa",
                             "madani", "ahlulbayt", "paigham", "noor tv",
                             "god tv", "daystar", "tbn ", "ctv ",
                             "gurbani", "sikh"]):
        tags.add("religious")

    # ── LIFESTYLE ─────────────────────────────────────
    if any(k in n for k in ["food", "cooking", "kitchen", "fashion", "style",
                             "home ", "garden", "hgtv", "diy"]):
        tags.add("lifestyle")

    # ── COUNTRY/REGION TAGS ───────────────────────────
    # Africa
    if any(k in n for k in ["|af|", "canal+", "c+af", "c+car", "dstv", "supersport",
                             "trace africa", "africa magic", "maisha magic",
                             "mnet ", "sabc", "etv "]):
        tags.add("region:africa")

    # France
    if any(k in n for k in ["fr:", "fr ", "france", "tf1", "m6 ", "arte", "canal+",
                             "bfm", "rmc", "tmc", "w9 ", "nrj", "c8 ", "cstar",
                             "gulli", "lci"]) and "france 24" not in n:
        tags.add("region:france")

    # UK
    if any(k in n for k in ["uk:", "uk ", "uk|", "bbc", "itv", "channel 4", "channel 5",
                             "sky ", "dave ", "e4 ", "film4", "more4", "quest",
                             "really ", "alibi", "gold "]):
        tags.add("region:uk")

    # USA
    if any(k in n for k in ["us:", "us ", "usa", "abc ", "nbc ", "cbs ", "fox ",
                             "pbs ", "hbo ", "showtime", "starz", "amc ",
                             "syfy", "a&e", "oxygen", "bravo"]):
        tags.add("region:usa")

    # Arabic
    if any(k in n for k in ["mbc", "al jazeera", "al arabiya", "rotana", "lbc ",
                             "mtv leb", "dubai ", "abu dhabi", "oman", "bahrain",
                             "qatar", "kuwait", "saudi", " ar:", " ar "]):
        tags.add("region:arabic")
    if "arabic" in cn or cat_id in ["86", "165", "156", "129", "180", "181", "175", "178", "556", "554"]:
        tags.add("region:arabic")

    # India
    if any(k in n for k in ["in:", "in ", "star ", "zee ", "sony ", "colors",
                             "ndtv", "aaj tak", "dd ", "doordarshan",
                             "sun tv", "gemini", "maa tv", "etv "]):
        tags.add("region:india")
    if cat_id in ["247", "9", "7", "732", "729", "730", "5", "18", "356", "64", "98",
                  "274", "282", "270", "287", "360", "291", "733", "734", "735", "736"]:
        tags.add("region:india")

    # Bangla
    if any(k in n for k in ["bangla", "bangladesh"]) or cat_id == "9":
        tags.add("region:india:bangla")

    # Tamil
    if any(k in n for k in ["tamil", "sun tv", "vijay", "zee tamil"]) or cat_id in ["732", "733", "734"]:
        tags.add("region:india:tamil")

    # Punjabi
    if any(k in n for k in ["punjabi", "ptc "]) or cat_id == "7":
        tags.add("region:india:punjabi")

    # Malayalam
    if any(k in n for k in ["malayalam", "asianet", "surya tv", "manorama"]) or cat_id in ["729", "735", "736"]:
        tags.add("region:india:malayalam")

    # Pakistan
    if any(k in n for k in ["pakistan", "geo ", "ary ", "hum tv", "samaa", "bol "]) or cat_id == "98":
        tags.add("region:pakistan")

    # Turkey
    if any(k in n for k in ["tr:", "turkish", "trt ", "show tv", "atv ", "kanal d"]) or cat_id == "25":
        tags.add("region:turkey")

    # Eastern Europe
    if cat_id in ["39", "44", "29", "35", "774", "20"]:
        tags.add("region:eastern_europe")

    # Nordics
    if cat_id in ["63", "579", "583", "582"]:
        tags.add("region:nordics")

    # If nothing matched, tag by category name
    if not tags:
        tags.add(f"other:{cn[:30]}")

    return tags

# ═══════════════════════════════════════════════════════════════════
# CLASSIFY ALL ALIVE CHANNELS
# ═══════════════════════════════════════════════════════════════════

buckets = defaultdict(list)  # tag → list of channels
all_tags = defaultdict(int)

for ch in alive:
    tags = classify_channel(ch["name"], ch["category_name"], ch["category_id"])
    for tag in tags:
        buckets[tag].append(ch)
        all_tags[tag] += 1

# ═══════════════════════════════════════════════════════════════════
# GENERATE CURATED EXPERIENCE REPORT
# ═══════════════════════════════════════════════════════════════════

lines = []
def p(s=""):
    lines.append(s)

p("# DashTivi+ Curated Experience Map")
p(f"## Generated: March 21, 2026 — {len(alive)} alive channels analyzed")
p()

# Tag overview
p("## Content Distribution")
p()
p("| Content Type | Alive Channels | Notes |")
p("|---|---|---|")
for tag, count in sorted(all_tags.items(), key=lambda x: -x[1]):
    p(f"| {tag} | {count} | |")
p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 1: SPORTS — Detailed by sport type
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: SPORTS")
p()

sport_tags = sorted([t for t in all_tags if t.startswith("sports:")], key=lambda x: -all_tags[x])
for tag in sport_tags:
    sport_name = tag.split(":")[1].upper()
    channels = buckets[tag]
    p(f"### {sport_name} ({len(channels)} alive)")
    p()
    # Sort by icon quality
    channels.sort(key=lambda c: (0 if c["has_https_icon"] else (1 if c["has_icon"] else 2), c["name"]))
    for ch in channels[:40]:
        icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
        p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
    if len(channels) > 40:
        p(f"  ... +{len(channels)-40} more")
    p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 2: DOCUMENTARY/LEARNING
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: DISCOVERY & LEARNING")
p()
doc_channels = buckets.get("documentary", [])
doc_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
p(f"### {len(doc_channels)} alive documentary/learning channels")
p()
for ch in doc_channels:
    icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
    cat = ch["category_name"]
    p(f"  {icon} `{ch['name']}` — {cat} (id:{ch['stream_id']})")
p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 3: NEWS
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: NEWS")
p()
news_channels = buckets.get("news", [])
news_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
p(f"### {len(news_channels)} alive news channels")
p()
for ch in news_channels:
    icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
    p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 4: KIDS
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: KIDS & FAMILY")
p()
kids_channels = buckets.get("kids", [])
kids_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
p(f"### {len(kids_channels)} alive kids channels")
p()
for ch in kids_channels:
    icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
    p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 5: ENTERTAINMENT
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: ENTERTAINMENT")
p()
ent_channels = buckets.get("entertainment", [])
ent_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
p(f"### {len(ent_channels)} alive entertainment channels")
p()
for ch in ent_channels[:60]:
    icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
    p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
if len(ent_channels) > 60:
    p(f"  ... +{len(ent_channels)-60} more")
p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 6: MOVIES (live 24/7 channels)
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: MOVIES 24/7")
p()
movie_channels = buckets.get("movies", [])
movie_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
p(f"### {len(movie_channels)} alive movie channels")
p()
for ch in movie_channels[:60]:
    icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
    p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
if len(movie_channels) > 60:
    p(f"  ... +{len(movie_channels)-60} more")
p()

# ═══════════════════════════════════════════════════════════════════
# EXPERIENCE 7: MUSIC
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## EXPERIENCE: MUSIC")
p()
music_channels = buckets.get("music", [])
music_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
p(f"### {len(music_channels)} alive music channels")
p()
for ch in music_channels:
    icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
    p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
p()

# ═══════════════════════════════════════════════════════════════════
# WORLDEX REGIONS — Detailed channel listing
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## WORLDEX REGIONS — Per-Channel Breakdown")
p()

regions = {
    "Africa": "region:africa",
    "France": "region:france",
    "UK": "region:uk",
    "USA": "region:usa",
    "Arabic": "region:arabic",
    "India (main)": "region:india",
    "India: Bangla": "region:india:bangla",
    "India: Tamil": "region:india:tamil",
    "India: Punjabi": "region:india:punjabi",
    "India: Malayalam": "region:india:malayalam",
    "Pakistan": "region:pakistan",
    "Turkey": "region:turkey",
    "Eastern Europe": "region:eastern_europe",
    "Nordics": "region:nordics",
}

for region_name, tag in regions.items():
    channels = buckets.get(tag, [])
    if not channels:
        p(f"### {region_name}: 0 channels")
        p()
        continue

    channels.sort(key=lambda c: (0 if c["has_https_icon"] else (1 if c["has_icon"] else 2), c["name"]))
    p(f"### {region_name}: {len(channels)} alive channels")
    p()

    # Group by actual content type within region
    sub_buckets = defaultdict(list)
    for ch in channels:
        ch_tags = classify_channel(ch["name"], ch["category_name"], ch["category_id"])
        # Find most specific non-region tag
        content_tag = "general"
        for t in ch_tags:
            if not t.startswith("region:") and not t.startswith("other:"):
                content_tag = t
                break
        sub_buckets[content_tag].append(ch)

    for content_type, chs in sorted(sub_buckets.items(), key=lambda x: -len(x[1])):
        p(f"  **{content_type}** ({len(chs)}):")
        for ch in chs[:15]:
            icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
            p(f"    {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
        if len(chs) > 15:
            p(f"    ... +{len(chs)-15} more")
    p()

# ═══════════════════════════════════════════════════════════════════
# GEMS — Channels in unexpected places
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## HIDDEN GEMS — Premium channels in unexpected categories")
p()

# Look for well-known channel names in non-obvious categories
gems_keywords = {
    "Discovery": "discovery",
    "National Geographic": "nat geo",
    "History Channel": "history",
    "Animal Planet": "animal planet",
    "BBC": "bbc",
    "HBO": "hbo",
    "CNN": "cnn",
    "Sky": "sky ",
    "Disney": "disney",
    "Nickelodeon": "nick",
    "Cartoon Network": "cartoon",
    "MTV": "mtv",
    "ESPN": "espn",
    "Fox": "fox ",
    "Star Movies": "star movies",
    "Sony": "sony",
    "Zee": "zee ",
    "Colors": "colors",
    "TLC": "tlc",
    "Food Network": "food network",
    "Travel": "travel",
    "Smithsonian": "smithsonian",
    "Curiosity Stream": "curiosity",
    "HGTV": "hgtv",
}

for brand, keyword in gems_keywords.items():
    brand_channels = [ch for ch in alive if keyword in ch["name"].lower()]
    if brand_channels:
        brand_channels.sort(key=lambda c: (0 if c["has_https_icon"] else 1, c["name"]))
        p(f"### {brand} ({len(brand_channels)} alive)")
        for ch in brand_channels[:10]:
            icon = "🖼" if ch["has_https_icon"] else ("📷" if ch["has_icon"] else "⚫")
            p(f"  {icon} `{ch['name']}` — {ch['category_name']} (id:{ch['stream_id']})")
        if len(brand_channels) > 10:
            p(f"  ... +{len(brand_channels)-10} more")
        p()

# ═══════════════════════════════════════════════════════════════════
# PROPOSED NEW THEME STRUCTURE
# ═══════════════════════════════════════════════════════════════════
p("---")
p("## PROPOSED EXPERIENCE RESTRUCTURE")
p()
p("### Live TV Themes (curated, genre-first)")
p()
p("| Theme | Proposed Categories | Est. Alive | Notes |")
p("|---|---|---|---|")

themes_proposed = [
    ("Sports", "All sports cats + sub-tabs", sum(all_tags.get(t, 0) for t in sport_tags), "Sub-tabs: Football, Cricket, Racing, Combat, NBA, NFL"),
    ("News", "82,417,346,431,165,730,98", all_tags.get("news", 0), "Add Arabic News, Indian News, Pakistan News"),
    ("Entertainment", "3,343,428,2,247", all_tags.get("entertainment", 0), "Add India Entertainment for gems"),
    ("Kids & Family", "32,347,430,410", all_tags.get("kids", 0), "Already good"),
    ("Movies 24/7", "275,57,282,344,429", all_tags.get("movies", 0), "Add Bollywood 24/7, DSTV Movies"),
    ("Discovery & Learning", "NEW THEME", all_tags.get("documentary", 0), "Discovery, NatGeo, History, Animal Planet"),
    ("Music & Vibes", "NEW THEME", all_tags.get("music", 0), "MTV, Trace, VH1, music channels"),
]

for name, cats, count, notes in themes_proposed:
    p(f"| **{name}** | {cats} | ~{count} | {notes} |")

p()
p("### WorldEX Regions (culture-first)")
p()
p("| Region | Current Cats | Proposed Cats | Alive | Fix Needed |")
p("|---|---|---|---|---|")
p(f"| Africa | 336,345 | 336 + DSTV genres | {all_tags.get('region:africa', 0)} | Genre pills ✅ done |")
p(f"| France | 11 | 11 (probe-filtered) + 336 French | {all_tags.get('region:france', 0)} | Show 37 alive + Canal+ AF French |")
p(f"| UK | 414 + genres | Same | {all_tags.get('region:uk', 0)} | Already good ✅ |")
p(f"| USA | 2 | 2 | {all_tags.get('region:usa', 0)} | Already good ✅ |")
p(f"| Arabic | 12 (BROKEN) | 86,165,156 + genres | {all_tags.get('region:arabic', 0)} | **CRITICAL FIX** — cat 12 empty |")
p(f"| India | 6 (WRONG) | 247,9,7,732,729,5,18,730,356 | {all_tags.get('region:india', 0)} | **CRITICAL FIX** — cat 6 is sports |")
p(f"| Pakistan | — | 98 + news | {all_tags.get('region:pakistan', 0)} | NEW region |")
p(f"| Turkey | — | 25 (probe-filtered) | {all_tags.get('region:turkey', 0)} | NEW region (49 alive in dead cat) |")
p(f"| Nordics | — | 63,579,583,582 | {all_tags.get('region:nordics', 0)} | NEW region (Sweden 49% alive) |")
p(f"| Eastern Europe | — | 39,44,29,35,774,20 | {all_tags.get('region:eastern_europe', 0)} | NEW region (Poland 26%, Bulgaria 26%) |")

# Write output
with open(OUT, 'w') as f:
    f.write('\n'.join(lines))

print(f"Report written to: {OUT}")
print(f"\nContent bucket sizes:")
for tag, count in sorted(all_tags.items(), key=lambda x: -x[1])[:30]:
    print(f"  {tag}: {count}")
