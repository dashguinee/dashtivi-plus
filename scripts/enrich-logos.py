#!/usr/bin/env python3
"""
DashTivi+ Logo Enrichment — Fuzzy-match Xtream channels to iptv-org & tv-logo databases.

Data sources:
  - Xtream API: live channels with stream_id + name
  - iptv-org API: channels.json (name, country, alt_names) + logos.json (channel_id -> logo URL)
  - tv-logo GitHub CDN: country-based logo URLs

Matching strategies:
  1. Exact match (case-insensitive)
  2. Normalized match (strip HD/FHD/4K/UHD/SD/H265/HEVC, country tags, etc.)
  3. Token match (80%+ token overlap)
  4. Common abbreviation expansion (CNN -> CNN International, etc.)
  5. tv-logo CDN URL construction + HEAD validation

Outputs:
  - src/lib/logo-map.generated.ts  — TypeScript export of CHANNEL_LOGO_MAP
  - Console stats: total, matched, unmatched, method breakdown

Usage: python3 enrich-logos.py
"""
import json
import os
import re
import sys
import time

try:
    import requests
except ImportError:
    print("ERROR: 'requests' module not found. Install it with: pip3 install requests")
    sys.exit(1)

# ── Credentials (same pattern as channel-intel.py) ──────────────────────────
API = "https://datahub11.com"
USER = "Test032026"
PASS = "032026Test"

# ── Paths ───────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_TS = os.path.join(PROJECT_ROOT, "src", "lib", "logo-map.generated.ts")

# ── External data sources ───────────────────────────────────────────────────
IPTV_ORG_CHANNELS_URL = "https://iptv-org.github.io/api/channels.json"
IPTV_ORG_LOGOS_URL = "https://iptv-org.github.io/api/logos.json"
TV_LOGO_CDN = "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries"
JARUBA_LOGOS_URL = "https://jaruba.github.io/channel-logos/logo_paths.json"
JARUBA_CDN = "https://jaruba.github.io/channel-logos/export/transparent"

# ── Common abbreviation expansions ──────────────────────────────────────────
# Maps short name -> list of full names to look up in iptv-org
ABBREVIATIONS = {
    "cnn": ["cnn international", "cnn"],
    "bbc": ["bbc one", "bbc world news", "bbc news", "bbc"],
    "espn": ["espn", "espn international"],
    "mtv": ["mtv", "mtv music television"],
    "hbo": ["hbo", "hbo max"],
    "fox": ["fox news", "fox", "fox sports"],
    "nbc": ["nbc", "nbc news"],
    "abc": ["abc", "abc news"],
    "cbs": ["cbs", "cbs news"],
    "itv": ["itv", "itv1"],
    "tf1": ["tf1"],
    "rtl": ["rtl", "rtl television"],
    "ard": ["ard", "das erste"],
    "zdf": ["zdf"],
    "rai": ["rai 1", "rai uno", "rai"],
    "rtp": ["rtp 1", "rtp internacional", "rtp"],
    "trt": ["trt 1", "trt world", "trt"],
    "ntv": ["ntv", "ntv television"],
    "al jazeera": ["al jazeera", "al jazeera english"],
    "france 24": ["france 24", "france 24 english"],
    "dw": ["dw", "deutsche welle"],
    "euronews": ["euronews", "euronews english"],
    "bloomberg": ["bloomberg", "bloomberg television"],
    "cnbc": ["cnbc", "cnbc world"],
    "sky news": ["sky news"],
    "skynews": ["sky news"],
    "supersport": ["supersport", "supersport blitz"],
    "canal+": ["canal+", "canal+ sport"],
    "bein": ["bein sports", "bein sport"],
    "dstv": ["dstv"],
}

# ── Parent brand fallback keywords ──────────────────────────────────────────
# Maps keyword (checked in normalized channel name) -> iptv-org channel name to use as logo source
# Order matters: more specific keywords first
PARENT_BRAND_LOOKUP = [
    ("nick jr",             "Nick Jr."),
    ("nicktoons",           "Nicktoons"),
    ("nickelodeon",         "Nickelodeon"),
    ("nick",                "Nickelodeon"),
    ("disney junior",       "Disney Junior"),
    ("disney xd",           "Disney XD"),
    ("disney channel",      "Disney Channel"),
    ("disney",              "Disney Channel"),
    ("cartoon network",     "Cartoon Network"),
    ("national geographic", "National Geographic"),
    ("nat geo",             "National Geographic"),
    ("animal planet",       "Animal Planet"),
    ("discovery",           "Discovery Channel"),
    ("history",             "History"),
    ("star sports",         "Star Sports 1"),
    ("star plus",           "Star Plus"),
    ("star gold",           "Star Gold"),
    ("star world",          "Star World"),
    ("star",                "Star Plus"),
    ("zee cinema",          "Zee Cinema"),
    ("zee tv",              "Zee TV"),
    ("zee",                 "Zee TV"),
    ("colors",              "Colors TV"),
    ("sony yay",            "Sony Yay!"),
    ("sony sab",            "Sony SAB"),
    ("sony max",            "Sony MAX"),
    ("sony",                "Sony Channel"),
    ("sun tv",              "Sun TV"),
    ("hbo max",             "Max"),
    ("hbo",                 "HBO"),
    ("showtime",            "Showtime"),
    ("cinemax",             "Cinemax"),
    ("starz",               "Starz"),
    ("espn",                "ESPN"),
    ("mtv",                 "MTV"),
    ("vh1",                 "VH1"),
    ("comedy central",      "Comedy Central"),
    ("paramount",           "Paramount Network"),
    ("syfy",                "Syfy"),
    ("tnt",                 "TNT"),
    ("tbs",                 "TBS"),
    ("amc",                 "AMC"),
    ("fxx",                 "FXX"),
    ("fxm",                 "FXM"),
    ("fx",                  "FX"),
    ("lifetime",            "Lifetime"),
    ("hallmark",            "Hallmark Channel"),
    ("abc",                 "ABC"),
    ("nbc",                 "NBC"),
    ("cbs",                 "CBS"),
    ("cnn",                 "CNN"),
    ("fox news",            "Fox News"),
    ("fox sports",          "Fox Sports"),
    ("fox",                 "Fox"),
    ("bbc",                 "BBC One"),
    ("sky sports",          "Sky Sports"),
    ("sky",                 "Sky One"),
    ("al arabiya",          "Al Arabiya"),
    ("mbc",                 "MBC 1"),
    ("bein sports",         "beIN Sports"),
    ("bein",                "beIN Sports"),
    ("supersport",          "SuperSport Blitz"),
    ("canal plus",          "Canal+"),
    ("canal+",              "Canal+"),
    ("quran",               "Quran TV"),
    ("islam channel",       "Islam Channel"),
    ("islam",               "Islam Channel"),
    ("wwe",                 "WWE Network"),
    ("ufc",                 "UFC Fight Pass"),
    ("eurosport",           "Eurosport"),
    ("sport",               None),  # skip generic "sport" keyword
]

# ── TV-Logo CDN known patterns ──────────────────────────────────────────────
TV_LOGO_COUNTRIES = {
    "gb": "united-kingdom", "uk": "united-kingdom",
    "us": "united-states",
    "fr": "france",
    "de": "germany",
    "it": "italy",
    "es": "spain",
    "pt": "portugal",
    "nl": "netherlands",
    "be": "belgium",
    "za": "south-africa",
    "in": "india",
    "au": "australia",
    "ca": "canada",
    "br": "brazil",
    "mx": "mexico",
    "ar": "argentina",
    "tr": "turkey",
    "pl": "poland",
    "se": "sweden",
    "no": "norway",
    "dk": "denmark",
    "fi": "finland",
    "ie": "ireland",
    "at": "austria",
    "ch": "switzerland",
    "gr": "greece",
    "ro": "romania",
    "hu": "hungary",
    "cz": "czech-republic",
    "ng": "nigeria",
    "ke": "kenya",
    "gh": "ghana",
    "eg": "egypt",
    "ma": "morocco",
    "dz": "algeria",
    "tn": "tunisia",
    "sa": "saudi-arabia",
    "ae": "united-arab-emirates",
    "qa": "qatar",
    "jp": "japan",
    "kr": "south-korea",
    "cn": "china",
    "int": "international",
}

# ── Normalization helpers ───────────────────────────────────────────────────

QUALITY_RE = re.compile(
    r'\s*[\(\[\|]?\s*'
    r'(?:HD|FHD|UHD|4K|SD|H\.?265|HEVC|1080[pi]?|720[pi]?|480[pi]?|576[pi]?|360[pi]?|240[pi]?|@\d+fps|Backup|Multi(?:screen)?)'
    r'\s*[\)\]\|]?\s*',
    re.IGNORECASE
)

COUNTRY_TAG_RE = re.compile(
    r'(?:^|\s*)'
    r'[\|\(\[]\s*[A-Z]{2,3}\s*[\|\)\]]'
    r'(?:\s*|$)',
    re.IGNORECASE
)

# Handle 2-6 letter prefixes: "UK:", "CRIC ||", "DSTV:", "SPORTS:", etc.
PREFIX_RE = re.compile(
    r'^(?:'
    r'[A-Z]{2,8}\s*[\|:]+\s*[\|]?\s*'  # "CRIC ||", "DSTV:", "UK:", "SPORTS |"
    r'|UHD\s*[▎\|]\s*'
    r'|\|[A-Z]{2,3}\|\s*'
    r'|[A-Z]{2}\s*\([^)]*\)\s*'
    r')',
    re.IGNORECASE
)

# Unicode superscript quality markers used by many IPTV providers
UNICODE_QUALITY_RE = re.compile(
    r'[\u1D34\u1D35\u1D36\u1D37\u1D38\u1D39\u1D3A\u1D3B\u1D3C\u1D3D\u1D3E\u1D3F'
    r'\u1D40\u1D41\u1D42\u1D43\u1D44\u1D45\u1D46\u1D47\u1D48\u1D49\u1D4A\u1D4B'
    r'\u1D4C\u1D4D\u1D4E\u1D4F\u1D50\u1D51\u1D52\u1D53\u1D54\u1D55\u1D56\u1D57'
    r'\u1D58\u1D59\u1D5A\u1D5B\u1D5C\u1D5D\u1D5E\u1D5F\u1D60\u1D61\u1D62\u1D63'
    r'\u1D64\u1D65\u1D66\u1D67\u1D68\u1D69\u1D6A\u2070\u00B2\u00B3\u2071\u2074'
    r'\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u207C\u207D\u207E\u207F'
    r'\u1D2C-\u1D6A]+'  # All modifier letters (superscript block)
)

# Common IPTV separator patterns
SEPARATOR_RE = re.compile(r'\s*\|\|\s*|\s*--\s*|\s*►\s*|\s*→\s*|\s*➤\s*')


def normalize_name(name: str) -> str:
    """Strip prefixes, quality suffixes, country tags, unicode markers, and normalize whitespace."""
    n = name.strip()
    # Strip unicode superscript quality markers (ᴴᴰ, ᶠᴴᴰ, etc.)
    n = UNICODE_QUALITY_RE.sub('', n)
    # Strip common separators
    n = SEPARATOR_RE.sub(' ', n)
    # Strip prefix patterns (CRIC, DSTV, UK:, etc.)
    n = PREFIX_RE.sub('', n)
    # Strip again after separator removal (may expose new prefix)
    n = PREFIX_RE.sub('', n)
    n = QUALITY_RE.sub(' ', n)
    n = COUNTRY_TAG_RE.sub(' ', n)
    # Replace underscores and hyphens used as word separators with spaces
    # e.g. "Nick_Hindi" -> "Nick Hindi", "Sony_Yay_Hindi" -> "Sony Yay Hindi"
    n = re.sub(r'[_\-]', ' ', n)
    # Strip language/region suffixes that come after the brand name
    # e.g. "Nick Hindi" -> "Nick", "Sony Yay Hindi" -> "Sony Yay"
    # (done via tokenization in matching, not here — keep full name for token match)
    # Remove trailing/leading punctuation
    n = re.sub(r'^[\s\-\|:./]+|[\s\-\|:./]+$', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n.lower()


def tokenize(name: str) -> set:
    """Split name into significant tokens."""
    stop = {'the', 'la', 'le', 'les', 'el', 'al', 'a', 'an', 'de', 'du', 'des', 'and', '&', '-', '|'}
    tokens = set(re.split(r'[\s\-/|:]+', name.lower()))
    return tokens - stop - {''}


def token_overlap(tokens_a: set, tokens_b: set) -> float:
    """Return fraction of tokens in common relative to the smaller set."""
    if not tokens_a or not tokens_b:
        return 0.0
    common = tokens_a & tokens_b
    smaller = min(len(tokens_a), len(tokens_b))
    return len(common) / smaller if smaller > 0 else 0.0


# ── Data fetching ───────────────────────────────────────────────────────────

def fetch_xtream_channels() -> list:
    """Fetch all live streams from the Xtream API."""
    url = f"{API}/player_api.php?username={USER}&password={PASS}&action=get_live_streams"
    print("[1/5] Fetching live channels from Xtream API...")
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        channels = resp.json()
        print(f"  -> {len(channels)} live channels fetched")
        return channels
    except requests.RequestException as e:
        print(f"  ERROR: Failed to fetch Xtream channels: {e}", file=sys.stderr)
        sys.exit(1)


def fetch_iptv_org_data() -> tuple:
    """
    Fetch iptv-org channels + logos and join them.
    Returns list of dicts: {name, alt_names, country, logo}
    """
    print("[2/5] Fetching iptv-org database (channels + logos)...")

    # Fetch channels
    try:
        resp = requests.get(IPTV_ORG_CHANNELS_URL, timeout=30)
        resp.raise_for_status()
        channels = resp.json()
        print(f"  -> {len(channels)} channels from iptv-org")
    except requests.RequestException as e:
        print(f"  WARNING: Failed to fetch iptv-org channels: {e}", file=sys.stderr)
        channels = []

    # Fetch logos
    try:
        resp = requests.get(IPTV_ORG_LOGOS_URL, timeout=30)
        resp.raise_for_status()
        logos = resp.json()
        print(f"  -> {len(logos)} logos from iptv-org")
    except requests.RequestException as e:
        print(f"  WARNING: Failed to fetch iptv-org logos: {e}", file=sys.stderr)
        logos = []

    # Build channel_id -> best logo URL map
    # Prefer larger logos (higher resolution)
    logo_map = {}
    for logo_entry in logos:
        cid = logo_entry.get("channel")
        url = logo_entry.get("url", "")
        if not cid or not url:
            continue
        w = logo_entry.get("width", 0) or 0
        h = logo_entry.get("height", 0) or 0
        area = w * h

        if cid not in logo_map or area > logo_map[cid].get("_area", 0):
            logo_map[cid] = {"url": url, "_area": area}

    # Join: attach logo to each channel
    result = []
    matched_logos = 0
    for ch in channels:
        cid = ch.get("id", "")
        name = ch.get("name", "").strip()
        if not name:
            continue

        logo_info = logo_map.get(cid)
        logo_url = logo_info["url"] if logo_info else ""
        if logo_url:
            matched_logos += 1

        result.append({
            "id": cid,
            "name": name,
            "alt_names": ch.get("alt_names", []),
            "country": ch.get("country", ""),
            "logo": logo_url,
        })

    print(f"  -> Joined: {matched_logos}/{len(result)} channels have logos")
    return result


def fetch_jaruba_data() -> dict:
    """
    Fetch jaruba/channel-logos TMDB logo paths.
    Returns dict: lowercase channel name -> full logo URL
    """
    print("[2b/5] Fetching jaruba/channel-logos (TMDB-sourced)...")
    try:
        resp = requests.get(JARUBA_LOGOS_URL, timeout=20)
        resp.raise_for_status()
        raw = resp.json()
        # raw is { "channel name": "/path.png", ... }
        result = {}
        for name, path in raw.items():
            if name and path:
                result[name.strip().lower()] = f"{JARUBA_CDN}{path}"
        print(f"  -> {len(result)} entries from jaruba")
        return result
    except Exception as e:
        print(f"  WARNING: Failed to fetch jaruba data: {e}")
        return {}


# ── Index building ──────────────────────────────────────────────────────────

def build_indices(db: list, jaruba_data: dict = None) -> dict:
    """Build lookup indices from iptv-org data (channels with logos)."""
    exact_index = {}       # lowercase name -> {logo, country, name}
    normalized_index = {}  # normalized name -> {logo, country, name}
    token_entries = []     # list of {tokens, logo, country, name}
    abbrev_index = {}      # abbreviation -> {logo, country, name}
    epg_id_index = {}      # iptv-org channel id -> {logo, country, name}

    for ch in db:
        logo = ch.get("logo", "")
        if not logo:
            continue

        name = ch["name"]
        country = ch.get("country", "")
        alt_names = ch.get("alt_names", [])
        cid = ch.get("id", "")
        entry = {"logo": logo, "country": country, "name": name}

        # Index by iptv-org channel ID (e.g., "CNN.us", "BBCOne.uk")
        if cid:
            epg_id_index[cid.lower()] = entry
            # Also index without country suffix: "CNN.us" -> also index as "cnn"
            base_id = cid.split('.')[0].lower() if '.' in cid else cid.lower()
            if base_id not in epg_id_index:
                epg_id_index[base_id] = entry

        # Index the primary name
        lower = name.lower()
        if lower not in exact_index:
            exact_index[lower] = entry

        norm = normalize_name(name)
        if norm and norm not in normalized_index:
            normalized_index[norm] = entry

        tokens = tokenize(norm if norm else name)
        if len(tokens) >= 1:
            token_entries.append({"tokens": tokens, **entry})

        # Also index alt_names
        for alt in alt_names:
            alt = alt.strip()
            if not alt:
                continue
            alt_lower = alt.lower()
            if alt_lower not in exact_index:
                exact_index[alt_lower] = entry
            alt_norm = normalize_name(alt)
            if alt_norm and alt_norm not in normalized_index:
                normalized_index[alt_norm] = entry

        # Abbreviation index
        for abbrev, expansions in ABBREVIATIONS.items():
            for expansion in expansions:
                if lower == expansion.lower() or norm == expansion.lower():
                    if abbrev not in abbrev_index:
                        abbrev_index[abbrev] = entry
                    break

    print(f"  -> epg_id index: {len(epg_id_index)} entries")

    # ── Jaruba index (TMDB-sourced logos) ────────────────────────────────────
    jaruba_index = {}
    if jaruba_data:
        for raw_name, logo_url in jaruba_data.items():
            norm = normalize_name(raw_name)
            if norm and norm not in jaruba_index:
                jaruba_index[norm] = logo_url
            # Also index the raw lowercase name
            if raw_name and raw_name not in jaruba_index:
                jaruba_index[raw_name] = logo_url
        print(f"  -> jaruba index: {len(jaruba_index)} entries")

    # ── Parent brand index ───────────────────────────────────────────────────
    # For each brand in PARENT_BRAND_LOOKUP, look up its logo in the iptv-org indices
    parent_brand_index = {}  # keyword -> logo_url
    for keyword, brand_name in PARENT_BRAND_LOOKUP:
        if brand_name is None:
            continue
        logo_url = None
        # Try exact lookup
        brand_lower = brand_name.lower()
        if brand_lower in exact_index:
            logo_url = exact_index[brand_lower]["logo"]
        # Try normalized lookup
        if not logo_url:
            brand_norm = normalize_name(brand_name)
            if brand_norm in normalized_index:
                logo_url = normalized_index[brand_norm]["logo"]
        if logo_url:
            parent_brand_index[keyword] = logo_url
    print(f"  -> parent brand index: {len(parent_brand_index)}/{len(PARENT_BRAND_LOOKUP)} brands resolved")

    return {
        "exact": exact_index,
        "normalized": normalized_index,
        "tokens": token_entries,
        "abbreviations": abbrev_index,
        "epg_ids": epg_id_index,
        "jaruba": jaruba_index,
        "parent_brands": parent_brand_index,
    }


# ── Matching ────────────────────────────────────────────────────────────────

def try_tv_logo_cdn(name: str, country_code: str) -> str:
    """Construct a candidate tv-logo CDN URL."""
    cc = country_code.lower()
    country_folder = TV_LOGO_COUNTRIES.get(cc)
    if not country_folder:
        return ""

    norm = normalize_name(name)
    slug = re.sub(r'[^a-z0-9\s-]', '', norm)
    slug = re.sub(r'\s+', '-', slug).strip('-')
    if not slug:
        return ""

    return f"{TV_LOGO_CDN}/{country_folder}/{slug}-{cc}.png"


def extract_country_from_name(raw_name: str) -> str:
    """Guess country code from Xtream channel name prefixes."""
    m = re.match(r'^\|([A-Z]{2})\|', raw_name)
    if m:
        return m.group(1).lower()
    if re.match(r'^(?:UK|GB)\s*[\|:]', raw_name, re.IGNORECASE):
        return "gb"
    if re.match(r'^(?:US|USA)\s*[\|:]', raw_name, re.IGNORECASE):
        return "us"
    if re.match(r'^FR\s*[\|:(]', raw_name, re.IGNORECASE):
        return "fr"
    if re.match(r'^(?:AF|ZA)\s*[\|:]', raw_name, re.IGNORECASE):
        return "za"
    if re.match(r'^IN\s*[\|:]', raw_name, re.IGNORECASE):
        return "in"
    if re.match(r'^DE\s*[\|:]', raw_name, re.IGNORECASE):
        return "de"
    if re.match(r'^IT\s*[\|:]', raw_name, re.IGNORECASE):
        return "it"
    if re.match(r'^ES\s*[\|:]', raw_name, re.IGNORECASE):
        return "es"
    if re.match(r'^PT\s*[\|:]', raw_name, re.IGNORECASE):
        return "pt"
    if re.match(r'^AR\s*[\|:]', raw_name, re.IGNORECASE):
        return "ar"
    if re.match(r'^TR\s*[\|:]', raw_name, re.IGNORECASE):
        return "tr"
    return ""


def match_channels(xtream_channels: list, indices: dict) -> tuple:
    """
    Match Xtream channels against iptv-org indices.
    Returns (matches_dict, stats_dict)
    """
    print("[3/5] Matching channels...")

    matches = {}
    stats = {
        "existing_https": 0,
        "epg_id": 0,
        "exact": 0,
        "normalized": 0,
        "token": 0,
        "abbreviation": 0,
        "tv_logo_cdn": 0,
        "jaruba": 0,
        "parent_brand": 0,
        "unmatched": 0,
    }

    exact_idx = indices["exact"]
    norm_idx = indices["normalized"]
    token_entries = indices["tokens"]
    abbrev_idx = indices["abbreviations"]
    epg_idx = indices["epg_ids"]
    jaruba_idx = indices.get("jaruba", {})
    parent_brand_idx = indices.get("parent_brands", {})

    total = len(xtream_channels)
    progress_step = max(total // 10, 1)

    for i, ch in enumerate(xtream_channels):
        if (i + 1) % progress_step == 0:
            pct = (i + 1) * 100 // total
            matched_so_far = sum(v for k, v in stats.items() if k != 'unmatched')
            print(f"  {pct}% ({i+1}/{total}) -- {matched_so_far} matched so far", flush=True)

        stream_id = str(ch.get("stream_id", ""))
        raw_name = ch.get("name", "").strip()
        stream_icon = ch.get("stream_icon", "")

        if not stream_id or not raw_name:
            continue

        # If the stream already has a good HTTPS icon, keep it
        if stream_icon and stream_icon.startswith("https://") and "webhop.live" not in stream_icon:
            matches[stream_id] = {
                "logo": stream_icon,
                "method": "existing_https",
                "xtream_name": raw_name,
                "matched_name": raw_name,
            }
            stats["existing_https"] += 1
            continue

        # Strategy 0: EPG channel ID match (most reliable)
        epg_id = (ch.get("epg_channel_id") or "").strip()
        if epg_id:
            epg_lower = epg_id.lower()
            if epg_lower in epg_idx:
                entry = epg_idx[epg_lower]
                matches[stream_id] = {
                    "logo": entry["logo"],
                    "method": "epg_id",
                    "xtream_name": raw_name,
                    "matched_name": entry["name"],
                }
                stats["epg_id"] += 1
                continue
            # Try base ID without country suffix
            base_epg = epg_lower.split('.')[0] if '.' in epg_lower else epg_lower
            if base_epg in epg_idx:
                entry = epg_idx[base_epg]
                matches[stream_id] = {
                    "logo": entry["logo"],
                    "method": "epg_id",
                    "xtream_name": raw_name,
                    "matched_name": entry["name"],
                }
                stats["epg_id"] += 1
                continue

        # Strategy 1: Exact match (case-insensitive)
        lower = raw_name.lower()
        if lower in exact_idx:
            entry = exact_idx[lower]
            matches[stream_id] = {
                "logo": entry["logo"],
                "method": "exact",
                "xtream_name": raw_name,
                "matched_name": entry["name"],
            }
            stats["exact"] += 1
            continue

        # Strategy 2: Normalized match
        norm = normalize_name(raw_name)
        if norm in norm_idx:
            entry = norm_idx[norm]
            matches[stream_id] = {
                "logo": entry["logo"],
                "method": "normalized",
                "xtream_name": raw_name,
                "matched_name": entry["name"],
            }
            stats["normalized"] += 1
            continue

        # Strategy 4 (abbreviation -- fast, do before token scan)
        norm_words = norm.split()
        abbrev_matched = False
        # Check individual words
        for word in norm_words:
            if word in abbrev_idx:
                entry = abbrev_idx[word]
                matches[stream_id] = {
                    "logo": entry["logo"],
                    "method": "abbreviation",
                    "xtream_name": raw_name,
                    "matched_name": entry["name"],
                }
                stats["abbreviation"] += 1
                abbrev_matched = True
                break
        if abbrev_matched:
            continue
        # Check full normalized name
        if norm in abbrev_idx:
            entry = abbrev_idx[norm]
            matches[stream_id] = {
                "logo": entry["logo"],
                "method": "abbreviation",
                "xtream_name": raw_name,
                "matched_name": entry["name"],
            }
            stats["abbreviation"] += 1
            continue
        # Check two-word combos for multi-word abbreviations
        for j in range(len(norm_words) - 1):
            combo = norm_words[j] + " " + norm_words[j + 1]
            if combo in abbrev_idx:
                entry = abbrev_idx[combo]
                matches[stream_id] = {
                    "logo": entry["logo"],
                    "method": "abbreviation",
                    "xtream_name": raw_name,
                    "matched_name": entry["name"],
                }
                stats["abbreviation"] += 1
                abbrev_matched = True
                break
        if abbrev_matched:
            continue

        # Strategy 3: Token match (80%+ overlap, min 2 tokens)
        xtream_tokens = tokenize(norm)
        if len(xtream_tokens) >= 2:
            best_score = 0.0
            best_entry = None
            for te in token_entries:
                score = token_overlap(xtream_tokens, te["tokens"])
                if score > best_score:
                    best_score = score
                    best_entry = te
            if best_score >= 0.8 and best_entry:
                matches[stream_id] = {
                    "logo": best_entry["logo"],
                    "method": "token",
                    "xtream_name": raw_name,
                    "matched_name": best_entry["name"],
                }
                stats["token"] += 1
                continue

        # Strategy 5: tv-logo CDN pattern
        country_code = extract_country_from_name(raw_name)
        if country_code:
            cdn_url = try_tv_logo_cdn(raw_name, country_code)
            if cdn_url:
                matches[stream_id] = {
                    "logo": cdn_url,
                    "method": "tv_logo_cdn",
                    "xtream_name": raw_name,
                    "matched_name": norm,
                }
                stats["tv_logo_cdn"] += 1
                continue

        stats["unmatched"] += 1

    return matches, stats


# ── CDN validation ──────────────────────────────────────────────────────────

def validate_tv_logo_urls(matches: dict, stats: dict) -> dict:
    """Validate tv-logo CDN URLs with HEAD requests, remove invalid ones."""
    cdn_entries = {sid: m for sid, m in matches.items() if m["method"] == "tv_logo_cdn"}
    if not cdn_entries:
        return matches

    unique_urls = list(set(m["logo"] for m in cdn_entries.values()))
    print(f"\n[4/5] Validating {len(unique_urls)} unique tv-logo CDN URLs...")

    session = requests.Session()
    session.headers["User-Agent"] = "tivi-logo-enricher/2.0"

    valid_urls = set()
    checked = 0

    for url in unique_urls:
        try:
            resp = session.head(url, timeout=5, allow_redirects=True)
            if 200 <= resp.status_code < 400:
                valid_urls.add(url)
        except requests.RequestException:
            pass
        checked += 1
        if checked % 100 == 0 or checked == len(unique_urls):
            print(f"  Checked {checked}/{len(unique_urls)} -- {len(valid_urls)} valid", flush=True)

    # Remove invalid CDN matches
    removed = 0
    for sid in list(cdn_entries.keys()):
        if cdn_entries[sid]["logo"] not in valid_urls:
            del matches[sid]
            removed += 1

    valid_count = len(cdn_entries) - removed
    print(f"  CDN validation: {valid_count} valid, {removed} removed")

    # Update stats
    stats["tv_logo_cdn"] = valid_count
    stats["unmatched"] += removed

    return matches


# ── Output generation ───────────────────────────────────────────────────────

def generate_typescript(matches: dict, total_channels: int, stats: dict):
    """Generate the TypeScript output file."""
    print("[5/5] Generating TypeScript output...")

    logo_entries = {sid: m["logo"] for sid, m in matches.items() if m.get("logo")}

    # Sort by stream_id (numeric)
    sorted_entries = sorted(logo_entries.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0)

    # Build TS content
    lines = [
        "// Auto-generated by enrich-logos.py -- DO NOT EDIT MANUALLY",
        f"// Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}",
        f"// Total channels: {total_channels} | Mapped: {len(sorted_entries)}",
        f"// Methods: {json.dumps({k: v for k, v in stats.items() if v > 0})}",
        "",
        "export const CHANNEL_LOGO_MAP: Record<string, string> = {",
    ]

    for sid, logo in sorted_entries:
        safe_logo = logo.replace("\\", "\\\\").replace("'", "\\'")
        lines.append(f"  '{sid}': '{safe_logo}',")

    lines.append("};")
    lines.append("")

    os.makedirs(os.path.dirname(OUTPUT_TS), exist_ok=True)
    with open(OUTPUT_TS, "w") as f:
        f.write("\n".join(lines))

    print(f"  -> Written to {OUTPUT_TS}")
    print(f"  -> {len(sorted_entries)} entries in CHANNEL_LOGO_MAP")


def print_report(total_channels: int, matches: dict, stats: dict, xtream_channels: list):
    """Print a comprehensive summary report."""
    total_mapped = len(matches)

    print()
    print("=" * 60)
    print("         LOGO ENRICHMENT REPORT")
    print("=" * 60)
    print()
    print(f"  Total Xtream channels:    {total_channels}")
    print(f"  Total mapped:             {total_mapped}")
    print(f"  Unmatched:                {stats.get('unmatched', 0)}")
    print(f"  Coverage:                 {total_mapped * 100 // max(total_channels, 1)}%")
    print()
    print("  Method breakdown:")
    print(f"    Existing HTTPS icon:    {stats.get('existing_https', 0)}")
    print(f"    EPG channel ID match:   {stats.get('epg_id', 0)}")
    print(f"    Exact match:            {stats.get('exact', 0)}")
    print(f"    Normalized match:       {stats.get('normalized', 0)}")
    print(f"    Token match (80%+):     {stats.get('token', 0)}")
    print(f"    Abbreviation:           {stats.get('abbreviation', 0)}")
    print(f"    tv-logo CDN:            {stats.get('tv_logo_cdn', 0)}")
    print()

    new_matches = total_mapped - stats.get("existing_https", 0)
    print(f"  New logos found:          {new_matches}")
    print()

    # Unmatched samples
    matched_ids = set(matches.keys())
    unmatched = [ch for ch in xtream_channels if str(ch.get("stream_id", "")) not in matched_ids]
    if unmatched:
        sample_count = min(25, len(unmatched))
        print(f"  Sample unmatched ({sample_count} of {len(unmatched)}):")
        for ch in unmatched[:sample_count]:
            icon = ch.get("stream_icon", "")
            icon_note = ""
            if icon and icon.startswith("http://"):
                icon_note = " [has HTTP icon]"
            elif icon and "webhop" in icon:
                icon_note = " [webhop]"
            elif not icon:
                icon_note = " [no icon]"
            print(f"    - [{ch.get('stream_id')}] {ch.get('name', '?')}{icon_note}")
        if len(unmatched) > sample_count:
            print(f"    ... and {len(unmatched) - sample_count} more")

    print()
    print("=" * 60)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()
    print("=== DashTivi+ Logo Enrichment (Python) ===")
    print()

    # Step 1: Fetch Xtream channels
    xtream_channels = fetch_xtream_channels()

    # Step 2: Fetch iptv-org channels + logos (joined)
    iptv_org_data = fetch_iptv_org_data()

    # Step 3: Build indices
    print("\n  Building match indices...")
    indices = build_indices(iptv_org_data)
    print(f"  -> {len(indices['exact'])} exact, {len(indices['normalized'])} normalized, "
          f"{len(indices['tokens'])} token entries, {len(indices['abbreviations'])} abbreviations")
    print()

    # Step 4: Match channels
    matches, stats = match_channels(xtream_channels, indices)

    # Step 5: Validate CDN URLs
    matches = validate_tv_logo_urls(matches, stats)

    # Step 6: Generate TypeScript output
    print()
    generate_typescript(matches, len(xtream_channels), stats)

    # Report
    print_report(len(xtream_channels), matches, stats, xtream_channels)

    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
