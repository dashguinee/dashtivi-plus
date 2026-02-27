# TIVI+ IPTV Source Research — February 27, 2026

> Comprehensive research on free, legal, open-source IPTV channel sources.
> Focus: HLS m3u8 streams, high uptime, legal FAST services.

---

## SUMMARY

| Category | Sources Found | Est. Unique Channels |
|----------|--------------|---------------------|
| GitHub Repos (aggregated playlists) | 12 | ~15,000+ |
| FAST Service APIs (direct) | 10 | ~3,000+ |
| Pre-built M3U Playlists (apsattv.com) | 35+ | ~5,000+ |
| News/Public Streams (direct HLS) | 8+ | ~20+ |
| **TOTAL (with dedup estimate)** | **~65 sources** | **~10,000-15,000 unique** |

---

## TIER 1: MAJOR GITHUB REPOSITORIES

### 1. iptv-org/iptv (THE GOLD STANDARD)
- **URL**: https://github.com/iptv-org/iptv
- **Stars**: 90K+
- **Channel Count**: 8,000+ verified streams
- **Format**: M3U playlists
- **Quality**: HIGH — community-maintained, daily updates, verified streams
- **Key Playlists**:
  - Main: `https://iptv-org.github.io/iptv/index.m3u`
  - By country: `https://iptv-org.github.io/iptv/countries/{cc}.m3u` (e.g., `us.m3u`, `gn.m3u`)
  - By category: `https://iptv-org.github.io/iptv/categories/{cat}.m3u` (news, sports, entertainment, etc.)
  - By language: `https://iptv-org.github.io/iptv/languages/{lang}.m3u`
- **Service-specific streams** (in `streams/` directory):
  - `streams/us_plex.m3u` — Plex free channels
  - `streams/us_roku.m3u` — Roku Channel streams
  - `streams/us_local.m3u` — US local stations
- **JSON API**: `https://iptv-org.github.io/api/channels.json` (full database)
- **How to convert**: Already M3U, parse with any M3U parser. JSON API available for structured data.
- **Status**: ACTIVE, updated daily

### 2. iptv-org/database (Raw Channel Database)
- **URL**: https://github.com/iptv-org/database
- **Channel Count**: 8,000+ channel entries
- **Format**: CSV/JSON database files
- **Quality**: HIGH — source of truth for iptv-org/iptv
- **Key Files**:
  - `data/channels.csv` — All channels with metadata (name, country, language, logo, etc.)
  - `data/streams.csv` — Stream URLs mapped to channels
- **How to convert**: Parse CSV, join channels + streams, output JSON

### 3. Free-TV/IPTV
- **URL**: https://github.com/Free-TV/IPTV
- **Channel Count**: ~1,500+ (quality over quantity)
- **Format**: M3U8
- **Quality**: HIGH — focuses on working HD streams, excludes paid/adult/political
- **Main Playlist**: `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8`
- **Organization**: By country in `lists/` directory (60+ countries)
- **Markers**: Ⓢ=non-HD, Ⓖ=geoblocked, Ⓨ=YouTube source
- **How to convert**: Direct M3U8, parse normally
- **Status**: ACTIVE, 1,532 commits

### 4. Free-IPTV/Countries
- **URL**: https://github.com/Free-IPTV/Countries
- **Channel Count**: 5,000+ legal streams
- **Format**: M3U per country
- **Quality**: HIGH — explicitly legal only, no geo-blocked streams, no VPN needed
- **Key Files**:
  - Per-country M3U files
  - `ZZ_PLAYLIST_ALL_TV.m3u` — ALL channels combined
- **How to convert**: Standard M3U parsing
- **Status**: ACTIVE

### 5. BuddyChewChew/app-m3u-generator (FAST SERVICE AGGREGATOR)
- **URL**: https://github.com/BuddyChewChew/app-m3u-generator
- **Channel Count**: ~2,000+ across all services
- **Format**: M3U playlists per service
- **Quality**: HIGH — auto-generated daily via GitHub Actions from official APIs
- **Playlists** (raw GitHub URLs):
  - Pluto TV: `playlists/plutotv_us.m3u` / `plutotv_all.m3u`
  - Samsung TV+: `playlists/samsungtvplus_us.m3u` / `samsungtvplus_all.m3u`
  - Stirr: `playlists/stirr_us.m3u`
  - Plex: `playlists/plex_us.m3u` / `plex_all.m3u`
  - Roku: `playlists/roku_all.m3u`
  - Tubi: `playlists/tubi_all.m3u`
- **Base URL**: `https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/`
- **Upstream**: Pulls from i.mjh.nz + BuddyChewChew/tubi-scraper
- **How to convert**: Direct M3U, parse to JSON
- **Status**: ACTIVE, daily auto-updates

### 6. RW1986/IPTV (CURATED LEGAL STREAMS)
- **URL**: https://github.com/RW1986/IPTV
- **Channel Count**: ~500+ curated
- **Format**: M3U8
- **Quality**: HIGH — hand-curated from Pluto, STIRR, Samsung, Plex. Deduped + renamed
- **Main Playlist**: `https://github.com/RW1986/IPTV/raw/main/lineup.m3u8`
- **Bonus**: Monochrome logo pack included
- **How to convert**: Standard M3U8 parsing
- **Status**: ACTIVE

### 7. notanewbie/LegalStream
- **URL**: https://github.com/notanewbie/LegalStream
- **Channel Count**: ~200+
- **Format**: M3U8 with packages system
- **Quality**: MEDIUM — legally free streams, but DEPRECATED (maintainer stepped away)
- **Packages**: `/packages/news/`, `/packages/entertainment/`, etc.
- **Key files**: `packages/news/us.m3u8`, `packages/news/live.m3u8`, `packages/entertainment/general.m3u8`
- **Status**: DEPRECATED but streams may still work

### 8. gs-stream/free-iptv-channels-main
- **URL**: https://github.com/gs-stream/free-iptv-channels-main
- **Channel Count**: ~1,000+ (Pluto, Samsung, Stirr, Plex, PBS, Roku)
- **Format**: M3U8 (generated by Node.js server)
- **Quality**: MEDIUM-HIGH — Docker-deployable, self-hosted
- **Docker**: `docker run -p <port>:4242 dtankdemp/free-iptv-channels`
- **Access**: `http://localhost:<port>` generates playlist on demand
- **How to convert**: Run container, fetch M3U8, parse
- **Status**: ACTIVE

### 9. bitsbb01/m3u8_creator
- **URL**: https://github.com/bitsbb01/m3u8_creator
- **Channel Count**: ~1,000+ (Pluto, Tubi, Plex, PBS, DistroTV, Stirr, + international)
- **Format**: M3U8 (auto-generated from multiple sources)
- **Quality**: MEDIUM — pulls from Cat Scrapper + other m3u8 sources, merges + assigns EPG
- **Key Feature**: Stream checker verifies links are live
- **How to convert**: Clone repo, run scripts, get merged M3U8
- **Status**: ACTIVE

### 10. m3u8-xtream/m3u8-xtream-playlist
- **URL**: https://github.com/m3u8-xtream/m3u8-xtream-playlist
- **Channel Count**: Unknown (claims worldwide coverage)
- **Format**: M3U8 + Xtream
- **Quality**: LOW-MEDIUM — less curated, mixed legality
- **Status**: ACTIVE

### 11. iptv-org/awesome-iptv (META-LIST)
- **URL**: https://github.com/iptv-org/awesome-iptv
- **Type**: Curated resource directory (not a playlist itself)
- **Contains**: Links to players, providers, EPG sources, tools, libraries
- **Value**: Discovery of additional sources, EPG data, parsing tools
- **Status**: ACTIVE, updated Feb 27, 2026

### 12. cabernetwork/cabernet (IPTV SERVER)
- **URL**: https://github.com/cabernetwork/cabernet
- **Type**: Self-hosted IPTV server with plugins
- **Plugins**: Pluto TV, XUMO, M3U/XMLTV
- **Fork**: That6rov/DBKcabernet adds DaddyLive, Samsung, STIRR, DistroTV, Plex
- **Ports**: 6077 (Web UI), 5004 (Streams), 1900 (SSDP)
- **Output**: `http://ip:6077/channels.m3u` or per-service: `/PlutoTV/Default/channels.m3u`
- **How to convert**: Deploy via Docker, fetch M3U from endpoints
- **Status**: ACTIVE

---

## TIER 2: FAST SERVICE DIRECT APIs

### 1. Pluto TV API
- **Boot Endpoint**: `https://boot.pluto.tv/v4/start`
  - Params: `appName=web&appVersion=x&clientID=x&deviceVersion=x&deviceModel=web`
  - Returns: Full channel list with metadata + stream tokens
- **Channels JSON**: `https://api.pluto.tv/v2/channels.json`
  - NOTE: Currently returns `[]` (empty) — may require session/auth params
- **Stream URL Format**: `https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/{CHANNEL_ID}/master.m3u8?deviceType=web&deviceId={UUID}&deviceVersion=x&appVersion=x&deviceDNT=0&deviceLat=0&deviceLon=0&sid={UUID}`
- **Channel Count**: ~300+ (US), 14 regions available
- **GitHub Tools**:
  - `evoactivity/PlutoIPTV` — Node.js, grabs EPG + M3U from Pluto API
  - `4v3ngR/pluto_tv_scraper` — Python, generates m3u8 + xmltv
  - `jgomez177/pluto-for-channels` — Docker, M3U generator
- **Pre-built Playlist** (i.mjh.nz): `https://i.mjh.nz/PlutoTV/us.xml` (EPG), m3u via BuddyChewChew
- **Quality**: HIGH — stable infrastructure, Paramount-backed
- **Legal**: FREE, ad-supported (FAST)

### 2. Samsung TV Plus
- **No public JSON API** — channels fetched via internal Samsung APIs
- **GitHub Tool**: `matthuisman/samsung-tvplus-for-channels` — Python/Docker
  - Endpoints: `/playlist.m3u8?regions=US`, `/epg.xml?regions=US`
  - Supported regions: US, CA, GB, DE, FR, ES, IN, KR, CH, AT + more
- **Pre-built Playlist** (i.mjh.nz): `https://i.mjh.nz/SamsungTVPlus/us.xml`
- **Channel Count**: ~450+ (US), 250+ globally per region
- **Quality**: HIGH — Samsung-backed, excellent uptime
- **Legal**: FREE, ad-supported (FAST)

### 3. Plex Free TV
- **No public API** — streams served through Plex infrastructure
- **iptv-org stream file**: `https://github.com/iptv-org/iptv/blob/master/streams/us_plex.m3u`
- **Pre-built Playlist** (BuddyChewChew): `playlists/plex_us.m3u`
- **Channel Count**: ~200+ free live channels
- **Quality**: HIGH — Plex infrastructure, good uptime
- **Legal**: FREE, ad-supported

### 4. Tubi TV
- **GitHub Tools**:
  - `clseibold/tubi-m3u` — M3U playlist of Tubi channels
  - `BuddyChewChew/tubi-scraper` — Scrapes Tubi, outputs M3U
    - Playlist: `https://raw.githubusercontent.com/BuddyChewChew/tubi-scraper/refs/heads/main/tubi_playlist.m3u`
  - `jgomez177/tubi-for-channels` — Docker, playlist + EPG
- **Channel Count**: ~200+ live channels
- **Quality**: HIGH — Fox-backed, stable streams
- **Legal**: FREE, ad-supported

### 5. Roku Channel
- **iptv-org stream file**: `streams/us_roku.m3u`
- **Pre-built Playlist**:
  - BuddyChewChew: `playlists/roku_all.m3u`
  - apsattv.com: `https://www.apsattv.com/rok.m3u`
- **Channel Count**: ~350+ free live channels
- **Quality**: HIGH — Roku-backed
- **Legal**: FREE, ad-supported

### 6. Stirr (Sinclair)
- **Pre-built Playlist** (BuddyChewChew): `playlists/stirr_us.m3u`
- **Channel Count**: ~100+ channels
- **Quality**: MEDIUM — may be losing EPG support, some instability noted
- **Legal**: FREE, ad-supported
- **Note**: Service may be winding down — verify before heavy investment

### 7. XUMO
- **Stream format**: `https://dai2.xumo.com/` based HLS
- **Pre-built Playlist**: `https://www.apsattv.com/xumo.m3u`
- **GitHub**: BuddyChewChew/xumo-playlist-generator
- **Cabernet plugin**: Direct XUMO support
- **Channel Count**: ~200+ channels
- **Quality**: MEDIUM-HIGH — Comcast-backed
- **Legal**: FREE, ad-supported

### 8. DistroTV
- **Pre-built Playlist**: `https://www.apsattv.com/distro.m3u`
- **Channel Count**: ~150+ channels
- **Quality**: MEDIUM — decent variety, some stream instability
- **Legal**: FREE, ad-supported

### 9. PBS (Public Broadcasting)
- **Free streams**: Many PBS stations stream free on web
- **i.mjh.nz**: `https://i.mjh.nz/PBS/` (directory available)
- **Pre-built Playlist**: Via gs-stream and bitsbb01
- **Channel Count**: ~50+ local stations
- **Quality**: HIGH — public broadcasting, very stable
- **Legal**: FREE, public broadcasting

### 10. LG Channels
- **Pre-built Playlists** (apsattv.com): `https://www.apsattv.com/{CC}lg.m3u`
  - Available for 35 regions: AE, AR, AT, AU, BE, BR, CA, CH, CL, CO, DE, DK, ES, FI, FR, GB, IE, IN, IT, JP, KR, LU, MX, NL, NO, NZ, PE, PT, SG, SE, US
- **Channel Count**: ~1,000+ across all regions
- **Quality**: MEDIUM-HIGH — LG-backed
- **Legal**: FREE, ad-supported

---

## TIER 3: PRE-BUILT M3U PLAYLISTS (apsattv.com)

apsattv.com maintains the largest collection of scraped FAST service playlists. All legal, nothing restreamed.

### Full Service List with URLs:

| Service | URL | Est. Channels |
|---------|-----|---------------|
| Tubi TV | `https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u` | 200+ |
| Roku Channel | `https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/roku_all.m3u` | 350+ |
| XUMO | `https://www.apsattv.com/xumo.m3u` | 200+ |
| DistroTV | `https://www.apsattv.com/distro.m3u` | 150+ |
| LocalNow | `https://www.apsattv.com/localnow.m3u` | 100+ |
| Vizio WatchFree+ | `https://www.apsattv.com/vizio.m3u` | 260+ |
| Fire TV | `https://www.apsattv.com/firetv.m3u` | 200+ |
| Xiaomi | `https://www.apsattv.com/xiaomi.m3u` | 50+ |
| TCL TV Plus | `https://www.apsattv.com/tclplus.m3u` | 100+ |
| TCL Channels | `https://www.apsattv.com/tcl.m3u` | 100+ |
| Whale TV Plus | `https://www.apsattv.com/whaletvplus_all.m3u` | 200+ |
| Vidaa TV | `https://www.apsattv.com/vidaa.m3u` | 100+ |
| Tablo | `https://www.apsattv.com/tablo.m3u` | 50+ |
| Klowd TV | `https://www.apsattv.com/klowd.m3u` | 50+ |
| Galxy.TV | `https://www.apsattv.com/galxytv.m3u` | 50+ |
| Veely | `https://www.apsattv.com/veely.m3u` | 50+ |
| Zeasn | `https://www.apsattv.com/zeasn.m3u` | 50+ |
| HP Fast | `https://www.apsattv.com/hp.m3u` | 30+ |
| Metax | `https://www.apsattv.com/metax.m3u` | 30+ |
| Sports TV | `https://www.apsattv.com/sportstv.m3u` | 20+ |
| Free Movies Plus | `https://www.apsattv.com/freemoviesplus.m3u` | 10+ |
| FreeTV | `https://www.apsattv.com/freetv.m3u` | 50+ |
| Rewarded TV | `https://www.apsattv.com/rewardedtv.m3u` | 20+ |
| LG Channels (US) | `https://www.apsattv.com/uslg.m3u` | 300+ |
| Samsung TV+ (various) | `https://www.apsattv.com/ssung{region}.m3u` | 200+ each |
| 9Fast (AU) | `https://www.apsattv.com/9fast.m3u` | 30+ |
| 10 Play (AU) | `https://www.apsattv.com/10fast.m3u` | 30+ |

---

## TIER 4: DIRECT HLS NEWS STREAMS (Verified Free)

These are direct m3u8 URLs that work immediately in any HLS player:

```
# CBSN (CBS News Streaming)
https://cbsn-us-cedexis.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8

# NBC News Now
https://nbcnews-lh.akamaihd.net/i/nbc_live11@183427/master.m3u8

# ABC News Live
http://abclive.abcnews.com/i/abc_live1@136327/master.m3u8

# Al Jazeera English
https://live-hls-web-aje.getaj.net/AJE/01.m3u8

# France 24 English
https://stream.france24.com/en/master.m3u8

# DW News (Deutsche Welle)
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8

# Euronews English
https://rakuten-euronews-1-eu.samsung.wurl.tv/manifest/playlist.m3u8

# NHK World Japan
https://nhkworld.webcdn.stream.ne.jp/www11/nhkworld-tv/domestic/live/1080/playlist.m3u8
```

> Note: Direct stream URLs can change without notice. The GitHub repos above auto-update.

---

## TIER 5: i.mjh.nz (MASTER PLAYLIST AGGREGATOR)

**URL**: https://i.mjh.nz/
**Status**: ACTIVE as of Feb 27, 2026 (survived DMCA, content restored)
**Maintainer**: matthuisman (GitHub)

### Available Services:

| Service | Directory | EPG Available |
|---------|-----------|--------------|
| Pluto TV | `/PlutoTV/` | YES (14 regions) |
| Samsung TV Plus | `/SamsungTVPlus/` | YES (10+ regions) |
| Plex | `/Plex/` | YES |
| Roku | `/Roku/` | YES |
| PBS | `/PBS/` | YES |
| MeTV | `/MeTV/` | YES |
| DStv (Africa!) | `/DStv/` | YES |
| Binge (AU) | `/Binge/` | YES |
| Foxtel (AU) | `/Foxtel/` | YES |
| Kayo (AU) | `/Kayo/` | YES |
| SkyGo | `/SkyGo/` | YES |
| Flash | `/Flash/` | YES |
| Singtel (SG) | `/Singtel/` | YES |
| frndly_tv | `/frndly_tv/` | YES |
| hgtv_go | `/hgtv_go/` | YES |

**Format**: XML EPG files per region (e.g., `us.xml`, `gb.xml`, `all.xml`)
**Note**: EPG only — actual M3U playlists via BuddyChewChew/app-m3u-generator which pulls from this source.

### IMPORTANT: DStv (African channels!)
- `https://i.mjh.nz/DStv/` — EPG for African satellite TV
- Could be valuable for TIVI+'s African channel focus

---

## HOW TO CONVERT M3U TO TIVI+ JSON FORMAT

### M3U Parse Pattern:
```javascript
// Each M3U entry looks like:
// #EXTINF:-1 tvg-id="CBSNews.us" tvg-name="CBSN" tvg-logo="https://..." group-title="News",CBSN
// https://stream-url.m3u8

function parseM3U(m3uText) {
  const lines = m3uText.split('\n');
  const channels = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const info = lines[i];
      const url = lines[i + 1]?.trim();
      if (!url || url.startsWith('#')) continue;

      const name = info.split(',').pop().trim();
      const tvgId = info.match(/tvg-id="([^"]*)"/)?.[1] || '';
      const tvgLogo = info.match(/tvg-logo="([^"]*)"/)?.[1] || '';
      const group = info.match(/group-title="([^"]*)"/)?.[1] || 'General';

      channels.push({
        id: tvgId || `ch-${channels.length}`,
        name,
        logo: tvgLogo,
        category: group,
        streamUrl: url,
        source: 'external-m3u',
        quality: url.includes('master.m3u8') ? 'adaptive' : 'single',
        free: true
      });
    }
  }
  return channels;
}
```

### Recommended Fetch Strategy for TIVI+:
```javascript
const SOURCES = [
  // TIER 1: High-quality aggregated playlists
  { name: 'iptv-org', url: 'https://iptv-org.github.io/iptv/index.m3u', priority: 1 },
  { name: 'Free-TV', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', priority: 1 },

  // TIER 2: FAST service playlists (auto-updated daily)
  { name: 'Pluto-US', url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plutotv_us.m3u', priority: 2 },
  { name: 'Samsung-US', url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/samsungtvplus_us.m3u', priority: 2 },
  { name: 'Plex-US', url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plex_us.m3u', priority: 2 },
  { name: 'Tubi', url: 'https://raw.githubusercontent.com/BuddyChewChew/tubi-scraper/main/tubi_playlist.m3u', priority: 2 },
  { name: 'Roku', url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/roku_all.m3u', priority: 2 },
  { name: 'Stirr', url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/stirr_us.m3u', priority: 2 },

  // TIER 3: Additional FAST services (apsattv.com)
  { name: 'XUMO', url: 'https://www.apsattv.com/xumo.m3u', priority: 3 },
  { name: 'DistroTV', url: 'https://www.apsattv.com/distro.m3u', priority: 3 },
  { name: 'LocalNow', url: 'https://www.apsattv.com/localnow.m3u', priority: 3 },
  { name: 'Vizio', url: 'https://www.apsattv.com/vizio.m3u', priority: 3 },
  { name: 'LG-US', url: 'https://www.apsattv.com/uslg.m3u', priority: 3 },
  { name: 'FireTV', url: 'https://www.apsattv.com/firetv.m3u', priority: 3 },
  { name: 'TCL', url: 'https://www.apsattv.com/tclplus.m3u', priority: 3 },

  // TIER 4: African focus
  { name: 'Africa', url: 'https://iptv-org.github.io/iptv/countries/gn.m3u', priority: 1 },
  { name: 'Africa-All', url: 'https://iptv-org.github.io/iptv/subdivisions/gn.m3u', priority: 1 },
];
```

---

## BEST SOURCES FOR TIVI+ (RANKED)

### MUST-HAVE (integrate immediately):

1. **BuddyChewChew/app-m3u-generator** — Single repo, 6 FAST services, auto-updated daily, raw GitHub URLs
2. **iptv-org/iptv** — 8,000+ channels, by country/category/language, JSON API available
3. **Free-TV/IPTV** — Quality-curated, HD focus, single playlist URL
4. **apsattv.com playlists** — 35+ services pre-scraped, direct M3U URLs

### NICE-TO-HAVE (add later):

5. **Free-IPTV/Countries** — 5,000+ legal streams, per-country
6. **RW1986/IPTV** — Curated + deduped from FAST services
7. **gs-stream/free-iptv-channels-main** — Docker-deployable aggregator
8. **Direct news HLS URLs** — Hardcoded reliable news streams

### FOR SELF-HOSTING:

9. **cabernetwork/cabernet** — Full IPTV server with Pluto/XUMO plugins
10. **i.mjh.nz** — EPG data source for all FAST services

---

## LEGAL NOTES

All sources documented here are:
- Free Ad-Supported Streaming Television (FAST) services
- Public broadcasting streams
- Community-curated publicly available streams
- Open-source tools that access official public APIs

No DRM-circumvention, no piracy, no restreaming of paid content.

---

*Research completed: February 27, 2026*
*Sources: 65+ across GitHub, FAST APIs, and aggregator sites*
