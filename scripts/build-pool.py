#!/usr/bin/env python3
"""
Build the WIDE StreamMore candidate POOL (human-judgement loop).
Cast a broad net across districts from free-channels-curated.json.
Drop ONLY: xumo (US-geo), raw IP:port, and obvious pure-US game-show/lifestyle filler.
Keep everything else plausibly-for-our-people for probing. Target ~150-250.
Writes scripts/pool-prefilter.json  (then probe-pool.py health-checks it).
"""
import json, re, os
from urllib.parse import urlparse

HERE = os.path.dirname(__file__)
SRC = json.load(open(os.path.join(HERE, "..", "public", "free-channels-curated.json")))
OUT = os.path.join(HERE, "pool-prefilter.json")

def host(u):
    try: return (urlparse(u).hostname or "").lower()
    except: return ""

def is_dropped_cdn(u):
    h = host(u)
    if re.match(r"^\d+\.\d+\.\d+\.\d+", h): return True   # raw IP
    if "xumo" in h: return True                            # US geo-lock
    return False

# Pure US game-show / lifestyle filler — NOT for our people. Drop by name.
US_FILLER = [
    "family feud","fear factor","gotraveler","go traveler","wipeout","americas got talent",
    "america's got talent","agt","deal or no deal","price is right","jeopardy","wheel of fortune",
    "antiques roadshow","storage wars","pawn stars","cops","jail","americas funniest",
    "judge ","divorce court","steve wilkos","maury","jerry springer","cheaters",
    "home & garden","home and garden","this old house","property brothers","house hunters",
    "tmz","entertainment tonight","real housewives","keeping up","bridezilla","say yes to the dress",
    "dr. phil","dr phil","ellen","rachael ray","the doctors","paternity court","hot bench",
    "gun ","firearm","nra","bass fishing","fishing","bowling","cornhole","poker","darts ",
    "rv ","caravan","trailer park","weather","forecast","traffic","shop ","qvc","hsn","jewelry",
    "infomercial","game show","gameshow","slots","casino","lottery",
]

# Geo-locked ISP proxies that consistently die for us (Swiss netplus, etc.) - still PROBE
# but we won't pre-trust; probe decides.

# District classifier — keyword -> district. Order matters (first match wins).
DISTRICT_RULES = [
    ("sports", ["football","soccer","futbol","foot ","bein","goal","la liga","premier league",
                "sport","fubo","sportsgrid","freesports","msg sports","bleav","trace sports",
                "supersport","espn","setanta","arryadia","matchday","highlights"]),
    ("french", ["france 2","france 3","france 5","france2","france3","france5","france 24","france24",
                "tv5","tv5monde","arte","canal+","canal 2","canal2","tf1","m6 ","gulli","rmc","bfm",
                "rfi","francoph","cnews","lci","tfx","franceinfo","france info"]),
    ("african",["voxafrica","vox africa","africa 24","africa24","africanews","africa news","medi1",
                "wazobia","adinkra","afroland","a2i ","espace tv","kalac","afroculture","afro magic",
                "afroturk","nollywood","novelas","rti ","rtg","africable","sabc","trace africa",
                "afriq","afrique","sen-gt","angel tv africa","life tv","kana tv","ebs"]),
    ("news",   ["france 24","al jazeera","aljazeera","sky news","euronews","dw news","dw ","cgtn",
                "rt news","trt world","i24","reuters","newsmax","cnbc","bbc news","news","cnn",
                "africanews","sky news arabia","blaze","bloomberg"]),
    ("music",  ["trace","afrobeat","afro ","mtv","vevo","stingray","music","urban","hip hop","hiphop",
                "reggae","soul","rnb","r&b","dance","clubbing","b4u music","totalmusic","afrolandtv",
                "naija","amapiano","gospel music"]),
    ("kids",   ["kids","cartoon","toon","duck","baby","junior","nick","pokemon","mr bean","peppa",
                "moonbug","kidz","looloo","loolookids","kartoon","pbs kids","disney","babyshark",
                "baby shark","cocomelon"]),
    ("discover",["nat geo","natgeo","nature","wild","planet","science","history","docu","animal",
                "ocean","space","discovery","curiosity","smithsonian","explore","earth","terra mater",
                "love nature","adventure","outdoor","real wild","timeline","cosmos"]),
    ("movies", ["movie","cinema","film","flix","runtime","western","popcorn","filmrise","cine ",
                "blockbuster","maverick","moviesphere","movie sphere","mytime","grjngo","surf cinema",
                "moviedome","cinevault","drive in","thriller","action hollywood","discoverfilm",
                "meta film","my cinema","bollywood","nollywood movies","action movies"]),
]

# Cultures we favor keeping (drop pure usa/india unless clearly relevant)
FAVOR_CULTURE = {"international","africa","france","arabic","uk"}

def classify(c):
    n = c["name"].lower()
    exp = (c.get("experience") or "").lower()
    for dist, kws in DISTRICT_RULES:
        if any(k in n for k in kws):
            return dist
    # fall back on experience tag
    exp_map = {"sports":"sports","movies":"movies","news":"news","music":"music",
               "kids":"kids","documentary":"discover","french":"french","african":"african"}
    if exp in exp_map:
        return exp_map[exp]
    return None  # entertainment/indian/arabic-generic -> skip unless caught above

def is_us_filler(c):
    n = c["name"].lower()
    return any(f in n for f in US_FILLER)

# NOT-our-people clusters: foreign-language regional TV that no Guinea/SL/WA member wants.
# Cyrillic/CJK/Indic scripts + region-locked language brands. Drop pre-probe.
import unicodedata
def has_nonlatin(s):
    for ch in s:
        if ch.isalpha():
            try:
                name = unicodedata.name(ch)
            except ValueError:
                continue
            if any(scr in name for scr in ("CYRILLIC","CJK","HANGUL","HIRAGANA","KATAKANA",
                    "ARABIC","HEBREW","THAI","DEVANAGARI","TAMIL","TELUGU","BENGALI",
                    "MALAYALAM","KANNADA","GUJARATI","GEORGIAN","ARMENIAN")):
                return True
    return False

NOT_OUR_PEOPLE = [
    # Indian-language / Bollywood-language (not WA-Francophone/Anglophone)
    "bhojpuri","bollywood","shemaroo","sheemaroo","tamil","telugu","kannada","malayalam",
    "marathi","hindi movie","maha movie","kairali","suriyan","chithiram","b4u","dd sports",
    "cine sony","sony cine","alankar","tarang","hornbill","hmtv","ptc ","janta","news18",
    "thanthi","velicham","jk 24","start air","start world",
    # Latino / Spanish telenovela cinema & local
    "latino classic","runtime espanol","novelas","telenovela","mexico","brazil","espanol",
    "español","monterrico","ovacion","teletrak","madeinbo","tijuana","codazzi","paraense",
    "tiguerito","chinola",
    # East-Euro / Central-Asia / Turkic regional
    "qazsport","türkmen","turkmen","balapan","bolajon","bahoriston","kino 24","kinoteatr",
    "uzreport","cinerama","astrakhan","беларусь","рос","kozoom",
    # US-niche sports our people don't follow
    "nhra","pga tour","mlb","nfl channel","tennis channel","pac 12","pac-12","stadium",
    "draftkings","strongman","horse tv","cricket gold","dazn combat","swerve combat",
    "racer ","unbeaten","gol classics","accdn","atg live","kcmn","right now tv","30a golf",
    "equidia","teletrak","horse","rodeo","nascar","wwe ","ufc ",
    # misc local/religious-niche not our-people
    "3abn","aghapy","peniel","logos tv","kuriakos","biznet","christian youth","cyc)",
    "tvs ","ebs cinema","sat 7","pro100tv","iunior","watch it kid","camp spoopy","skwad",
    "anime x hidive","ryan and friends","extrema kids","xtrema",
]
def is_not_our_people(c):
    n = c["name"].lower()
    if has_nonlatin(c["name"]): return True
    return any(k in n for k in NOT_OUR_PEOPLE)

GLOBAL_CDNS = ("amagi.tv","akamai","cloudfront","fastly","transmit.live","getaj.net",
               "france24.com","skynewsarabia","rttv.com","tv5monde","plex.tv","jmp2.uk",
               "tubi.video","pluto.tv","samsung","rakuten","stingray.com","frequency.stream",
               "getpublica","otteravision","edgenextcdn","klowdtv","mediatailor","playout.now",
               "wurl","brightcove","uplynk","pishow","bozztv","skygo")
def cdn_class(u):
    h = host(u)
    return "global" if any(g in h for g in GLOBAL_CDNS) else "uncertain"

# News & Music are bloated with regional/foreign-language variants. For those two
# districts, only keep channels whose name matches a RECOGNIZABLE our-people brand.
NEWS_KEEP = ["france 24","france24","al jazeera","aljazeera","sky news arabia","euronews",
             "dw news","dw ","cgtn","rt news","rt ","trt world","i24","reuters","newsmax",
             "cnbc africa","africanews","africa news","bbc news","bloomberg","abc news live",
             "scripps news","the first","cgtn news","arirang","france info","franceinfo",
             "trt world","wion","al arabiya","alarabiya","sky news"]
MUSIC_KEEP = ["trace","afrobeat","afro ","afroland","naija","amapiano","mtv","vevo","stingray urban",
              "stingray soul","stingray hit","stingray hot","stingray pop","stingray classic rock",
              "stingray rock","stingray rnb","music legends","b4u music","totalmusic","clubland",
              "hip hop","hiphop","reggae","dancehall","kiss ","now ","retro music","urban tv",
              "gospel","trace urban","trace mziki","trace gospel","trace naija","trace ayiti"]

def news_ok(n):  return any(k in n for k in NEWS_KEEP)
def music_ok(n): return any(k in n for k in MUSIC_KEEP)

pool = []
seen = set()
for c in SRC:
    u = c["url"]
    if is_dropped_cdn(u): continue
    if is_us_filler(c): continue
    if is_not_our_people(c): continue
    dist = classify(c)
    if dist is None:
        # keep strong franco/african/arabic culture even if uncategorized
        if c.get("culture") in ("france","africa","arabic"):
            dist = {"france":"french","africa":"african","arabic":"news"}[c["culture"]]
        else:
            continue
    cul = c.get("culture")
    nlow = c["name"].lower()
    # Tighten the two bloated districts to recognizable brands only
    if dist == "news" and not news_ok(nlow): continue
    if dist == "music" and not music_ok(nlow): continue
    # Drop pure india/usa UNLESS in a globally-relevant district (movies/music/kids/discover ok)
    if cul in ("india",) and dist in ("french","african","news"): continue
    # dedupe by normalized name+district
    key = re.sub(r"\s*\(.*?\)\s*","",c["name"]).strip().lower()
    key = re.sub(r"^\d+\s+","",key)
    dkey = (dist, key)
    if dkey in seen: continue
    seen.add(dkey)
    pool.append({
        "id": c["id"],
        "name": re.sub(r"^\d+\s+","",c["name"]).strip(),
        "url": u,
        "logo": c.get("logo") or None,
        "district": dist,
        "experience": c.get("experience"),
        "culture": cul,
        "source": "free",
        "cdn": host(u),
        "cdn_class": cdn_class(u),
    })

json.dump(pool, open(OUT,"w"), indent=2, ensure_ascii=False)
from collections import Counter
print("PRE-FILTER POOL:", len(pool))
print("by district:", dict(Counter(c["district"] for c in pool)))
print("by cdn_class:", dict(Counter(c["cdn_class"] for c in pool)))
print("written:", OUT)
