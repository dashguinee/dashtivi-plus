#!/usr/bin/env python3
"""
Assemble public/streamore-candidates.json — the WIDE judged-by-human POOL.
Keeps only LIVE (+weak if any) from pool-probe-results.json.
Adds a 4-8 word `note` per channel ("what it is") for Aziz to judge yes/no.
Output schema: {id,name,url,logo,district,experience,culture,source,status,note}
"""
import json, os, re
from urllib.parse import urlparse

HERE = os.path.dirname(__file__)
pool = json.load(open(os.path.join(HERE, "pool-prefilter.json")))
probe = json.load(open(os.path.join(HERE, "pool-probe-results.json")))
OUT = os.path.join(HERE, "..", "public", "streamore-candidates.json")

status = probe["status"]

def host(u):
    try: return (urlparse(u).hostname or "").lower()
    except: return ""

GLOBAL_CDNS = ("amagi.tv","akamai","cloudfront","fastly","transmit.live","getaj.net",
               "france24.com","skynewsarabia","rttv.com","tv5monde","plex.tv","jmp2.uk",
               "tubi.video","pluto.tv","samsung","rakuten","stingray.com","frequency.stream",
               "getpublica","otteravision","edgenextcdn","klowdtv","mediatailor","playout.now",
               "wurl","brightcove","cgtn.com","dwamdstream")
def is_global(u):
    h=host(u); return any(g in h for g in GLOBAL_CDNS)

# ---- Brand-aware note dictionary (substring -> note). First match wins. ----
BRANDS = [
    # sports / football
    ("bein sports xtra", "beIN football/sports highlights — top draw"),
    ("ftf sports", "Football/sports — our-people draw"),
    ("fubo sports", "General sports network, global CDN"),
    ("sportsgrid", "Sports betting/news talk, global CDN"),
    ("bleav football", "Football talk/highlights channel"),
    ("trace sports stars", "Athlete profiles, African urban vibe"),
    ("world of freesports", "Mixed free sports, global CDN"),
    ("more than sports", "General sports magazine channel"),
    ("msg sportszone", "US sports highlights network"),
    ("speed sports", "Motorsport/action sports"),
    ("supersport", "African premium sports brand"),
    ("matchday", "Football matchday/highlights"),
    # news
    ("france 24 english", "Francophone world news, English feed"),
    ("france 24 arabic", "France 24 Arabic-language news"),
    ("france 24 espa", "France 24 Spanish — likely skip"),
    ("france 24", "Francophone world news (France 24)"),
    ("franceinfo", "French rolling news channel"),
    ("france info", "French rolling news channel"),
    ("africanews", "Pan-African news, Francophone-friendly"),
    ("al jazeera english", "Global news, strong on Africa"),
    ("al jazeera arabic", "Arabic global news (Al Jazeera)"),
    ("al jazeera mubasher", "Al Jazeera live Arabic events"),
    ("al jazeera", "Al Jazeera global news"),
    ("sky news arabia", "Arabic-world rolling news"),
    ("euronews fran", "European news, French feed"),
    ("euronews english", "European news, English feed"),
    ("euronews", "European news (multi-language)"),
    ("dw news", "German world news, English feed"),
    ("dw ", "Deutsche Welle world news"),
    ("cgtn", "Chinese global news network"),
    ("rt news", "Russia-funded global news"),
    ("rt ", "Russia-funded global news"),
    ("trt world", "Turkish global news, English"),
    ("i24", "Israel-based world news, English"),
    ("reuters", "Reuters global news wire feed"),
    ("newsmax", "US conservative news — likely skip"),
    ("cnbc africa", "African business news channel"),
    ("bbc news", "BBC world news feed"),
    ("bloomberg", "Global business/markets news"),
    ("al arabiya", "Arabic-world news (Al Arabiya)"),
    ("alarabiya", "Arabic-world news (Al Arabiya)"),
    ("wion", "India-based world news, English"),
    ("arirang", "Korea world news — likely skip"),
    ("scripps news", "US national news — borderline"),
    ("abc news live", "US/Australia news — borderline"),
    ("the first", "US opinion news — likely skip"),
    # music
    ("trace urban", "Trace — African/urban music (GOLD)"),
    ("trace naija", "Trace Naija — Nigerian music"),
    ("trace ayiti", "Trace Ayiti — Haitian/Caribbean music"),
    ("trace mziki", "Trace — East African music"),
    ("trace gospel", "Trace Gospel — African gospel music"),
    ("trace africa", "Trace Africa — African music videos"),
    ("trace", "Trace — urban/African music brand"),
    ("afrobeats", "Afrobeats music stream (our-people GOLD)"),
    ("afroland", "AfroLandTV — African music/culture"),
    ("naija", "Nigerian music/entertainment"),
    ("amapiano", "Amapiano — South African dance music"),
    ("vevo pop", "Vevo — global pop music videos"),
    ("vevo 2k", "Vevo — 2000s hits music videos"),
    ("vevo", "Vevo — global music videos"),
    ("stingray urban", "Stingray — urban/hip-hop music"),
    ("stingray soul", "Stingray — soul/R&B music"),
    ("stingray hit", "Stingray — current chart hits"),
    ("stingray hot country", "Stingray country — likely skip"),
    ("stingray", "Stingray — themed music channel"),
    ("mtv", "MTV — global pop/music brand"),
    ("music legends", "Classic rock/pop legends music"),
    ("b4u music", "Bollywood music — borderline"),
    ("totalmusic", "Mixed global music videos"),
    ("hip hop", "Hip-hop music channel"),
    ("reggae", "Reggae music channel"),
    ("dancehall", "Dancehall/reggae music"),
    ("gospel", "Gospel music channel"),
    # kids
    ("moonbug", "Kids cartoons (CoComelon maker)"),
    ("mr bean", "Mr Bean animation — family safe"),
    ("baby shark", "Toddler songs/cartoons"),
    ("looloo", "LooLoo Kids — nursery rhymes"),
    ("toongoggles", "Kids cartoons on-demand style"),
    ("kartoon channel", "Kids cartoons, global CDN"),
    ("kidz bop", "Kid-friendly pop music/videos"),
    ("kidsflix", "Kids movies/shows channel"),
    ("cartoon classics", "Classic cartoons, family safe"),
    ("kids tv", "General kids cartoons channel"),
    ("pbs kids", "US educational kids — borderline"),
    ("cartoon", "Cartoons, family safe"),
    ("nick", "Nickelodeon-style kids content"),
    ("kids", "Kids channel, family safe"),
    # discover / docs
    ("love nature", "Wildlife/nature documentaries"),
    ("wildearth", "Live African safari/wildlife (GOLD)"),
    ("wild earth", "Live African safari/wildlife"),
    ("nature time", "Nature/wildlife documentaries"),
    ("naturetime", "Nature/wildlife documentaries"),
    ("terra mater", "Premium nature documentaries"),
    ("bbc earth", "BBC nature/science documentaries"),
    ("history hit", "World history documentaries"),
    ("true history", "History documentary channel"),
    ("adventure earth", "Adventure/nature documentaries"),
    ("xtreme outdoor", "Outdoor adventure docs"),
    ("discovery", "Science/discovery documentaries"),
    ("nat geo", "Nat Geo-style nature/science"),
    ("smithsonian", "History/science documentaries"),
    ("timeline", "World history documentaries"),
    ("nature", "Nature/wildlife documentaries"),
    ("wild", "Wildlife documentaries"),
    ("science", "Science documentaries"),
    ("history", "History documentaries"),
    # movies
    ("moviesphere", "24/7 movies, Lionsgate, global CDN"),
    ("movie sphere", "24/7 movies, global CDN"),
    ("maverick black cinema", "24/7 Black cinema films (our-people)"),
    ("action hollywood", "24/7 action movies, global CDN"),
    ("mytime movie", "24/7 movies, global CDN"),
    ("my cinema", "24/7 mixed movies channel"),
    ("grjngo", "24/7 Western movies"),
    ("surf cinema", "24/7 mixed movies (Plex-backed)"),
    ("moviedome", "24/7 movies channel"),
    ("cinevault", "24/7 classic movies"),
    ("drive in movie", "24/7 cult/B-movies"),
    ("cowboy movie", "24/7 Western movies"),
    ("discoverfilm", "24/7 indie/world films"),
    ("meta film", "24/7 mixed movies"),
    ("movies thriller", "24/7 thriller movies"),
    ("movies action", "24/7 action movies"),
    ("cinema", "24/7 movies channel"),
    ("western", "24/7 Western movies"),
    ("movie", "24/7 movies channel"),
    ("film", "24/7 films channel"),
    # french
    ("tv5monde style", "Francophone lifestyle (TV5Monde)"),
    ("tv5 monde info", "Francophone news (TV5Monde)"),
    ("tv5monde", "Francophone general TV (TV5Monde)"),
    ("tv5 monde", "Francophone general TV (TV5Monde)"),
    ("tv5", "Francophone TV (TV5Monde family)"),
    ("arte", "Franco-German culture/arts channel"),
    ("bfm", "French rolling news (BFM)"),
    ("rmc", "French sports/talk (RMC)"),
    ("gulli", "French kids channel"),
    ("tf1", "French general/series channel"),
    ("rfi", "Francophone world radio/news"),
    ("francophonie", "Francophonie cultural channel"),
    ("canal 2", "Cameroonian francophone TV"),
    ("france 2", "French public flagship channel"),
    ("france 3", "French public regional channel"),
    ("france 5", "French public education channel"),
    # african
    ("africa 24", "Pan-African news, francophone-friendly"),
    ("medi1tv afrique", "Moroccan/African francophone news"),
    ("medi1", "Moroccan/African news channel"),
    ("voxafrica", "Pan-African EN/FR general TV"),
    ("vox africa", "Pan-African EN/FR general TV"),
    ("wazobia", "Nigerian pidgin entertainment TV"),
    ("adinkra", "Ghanaian/African diaspora TV"),
    ("a2i tv", "Senegalese general TV (francophone)"),
    ("espace tv", "Guinean/African francophone TV"),
    ("kalac tv", "African francophone entertainment"),
    ("afroculture", "African culture/entertainment TV"),
    ("afro magic", "African movies/entertainment"),
    ("afroturk", "Afro-Turkish diaspora channel"),
    ("angel tv africa", "African faith/inspiration TV"),
    ("sabc", "South African public broadcaster"),
    ("life tv", "Ivorian francophone TV (Life TV)"),
    ("nollywood", "Nigerian movies (Nollywood)"),
    ("novelas", "Telenovelas dubbed — entertainment"),
    ("ebs", "Ethiopian general TV"),
    ("kana", "Ethiopian entertainment TV"),
]

# substrings that must match as a whole word (avoid 'rt ' hitting 'spoRT stars')
WORD_SAFE = {"rt ", "rt news", "dw ", "afro ", "now ", "kiss ", "wild", "nick"}
def _matches(sub, n):
    if sub in WORD_SAFE:
        return re.search(r"(?:^|[^a-z])" + re.escape(sub.strip()) + r"(?:[^a-z]|$)", n) is not None
    return sub in n

def make_note(c):
    n = c["name"].lower()
    for sub, note in BRANDS:
        if _matches(sub, n):
            return note
    # generic fallback by district + culture + cdn
    cul = c.get("culture") or ""
    g = "global CDN" if is_global(c["url"]) else "geo-uncertain CDN"
    d = c["district"]
    base = {
        "sports":"Sports channel", "movies":"24/7 movies channel", "news":"News channel",
        "music":"Music channel", "kids":"Kids channel", "discover":"Documentary channel",
        "french":"Francophone channel", "african":"African channel",
    }[d]
    if cul in ("africa",): base = "African — " + base.lower()
    if cul in ("france",): base = "Francophone — " + base.lower()
    if cul in ("arabic",): base = "Arabic-world — " + base.lower()
    return f"{base}, {g}"

final = []
for c in pool:
    st = status.get(c["id"])
    if st not in ("live","weak"): continue
    final.append({
        "id": c["id"],
        "name": c["name"],
        "url": c["url"],
        "logo": c.get("logo") or None,
        "district": c["district"],
        "experience": c.get("experience"),
        "culture": c.get("culture"),
        "source": "free",
        "status": st,
        "note": make_note(c),
    })

# sort: district group order, then global-CDN first, then name
dorder = {"sports":0,"movies":1,"news":2,"french":3,"african":4,"music":5,"kids":6,"discover":7}
final.sort(key=lambda c: (dorder.get(c["district"],9), 0 if is_global(c["url"]) else 1, c["name"].lower()))

from collections import Counter
dc = dict(Counter(c["district"] for c in final))
glob = sum(1 for c in final if is_global(c["url"]))
out = {
    "version": "2026.06.24.pool.1",
    "generated_note": ("StreamMore CANDIDATE POOL (human-judgement loop). Wide health-checked "
        "set for Aziz to judge 50-at-a-time down to the final ~150 free. Every entry probed "
        "LIVE on 2026-06-24 (redirects followed). DROPPED: xumo (US-geo), raw IP:port, "
        "US game-show/lifestyle filler, dead/weak. `note` = quick what-it-is for yes/no. "
        f"{glob}/{len(final)} on reliably-global CDNs; rest probed-live but geo-uncertain "
        "from FR/EU vantage (African-origin streams may behave better from Guinea)."),
    "total": len(final),
    "districts": dc,
    "channels": final,
}
json.dump(out, open(OUT,"w"), indent=2, ensure_ascii=False)
print("POOL total:", len(final))
print("districts:", dc)
print(f"global-CDN: {glob}  uncertain: {len(final)-glob}")
print("written:", OUT)
