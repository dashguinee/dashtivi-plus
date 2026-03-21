# IPTV Aggregator Hunt — Research Results
**Date:** 2026-02-27
**Purpose:** Find new IPTV sources not yet tapped for DASH Tivi

---

## TIER 1 — META-AGGREGATORS (Multiple sources → single output)

### 1. HerbertHe/iptv-sources
- **Repo:** https://github.com/HerbertHe/iptv-sources
- **Web UI:** http://m3u.ibert.me/
- **CDN mirror:** https://fastly.jsdelivr.net/gh/HerbertHe/iptv-sources@gh-pages/
- **What it is:** Auto-aggregator that pulls from 8 repos every 2–2.5 hours and merges into unified M3U files
- **Sources aggregated:**
  1. epg.pw test channels
  2. iptv-org/iptv (iptv.org)
  3. YueChan/Live
  4. YanG-1989/m3u
  5. fanmingming/live
  6. qwerttvv/Beijing-IPTV
  7. joevess/IPTV
  8. cymz6/AutoIPTV-Hotel
- **Key channel counts (from their index page):**
  - iptv.org All: **8,543 channels**
  - epg.pw All: **1,349 channels**
  - fanmingming/live itv: **189 channels**
  - epg.pw China: **189 channels**
- **Direct M3U files available:** 25+ individual playlist files
- **Maintained:** YES — 327 stars, TypeScript, updates every 2h, last updated 2026-02-26
- **Status: ALIVE — HIGH VALUE META-SOURCE**

---

### 2. hmlendea/iptv-playlist-aggregator
- **Repo:** https://github.com/hmlendea/iptv-playlist-aggregator
- **What it is:** .NET tool that downloads multiple IPTV playlists, deduplicates, and merges channels. User configures their own provider URLs.
- **Channel count:** Not fixed — depends on configured sources
- **Stars:** Active, 60 releases, latest v2.12.1 (June 2025), 615 commits
- **Maintained:** YES — actively maintained tool, not a hosted playlist
- **Status: ALIVE — TOOL (for self-hosting, not a direct M3U URL)**

---

## TIER 2 — LARGE GENERAL PLAYLISTS (10,000+ or close)

### 3. iptv-org/iptv (THE REFERENCE)
- **Repo:** https://github.com/iptv-org/iptv
- **Main M3U:** https://iptv-org.github.io/iptv/index.m3u
- **Channel count:** ~8,000–10,000+ (cited as 10,000+ in multiple sources, 8,543 confirmed from aggregator index)
- **Genre playlists:**
  - Sports: https://iptv-org.github.io/iptv/categories/sports.m3u
  - News: https://iptv-org.github.io/iptv/categories/news.m3u
  - Movies: https://iptv-org.github.io/iptv/categories/movies.m3u
  - Documentary: https://iptv-org.github.io/iptv/categories/documentary.m3u
  - Music: https://iptv-org.github.io/iptv/categories/music.m3u
- **Country playlists:** 190+ per country (e.g., https://iptv-org.github.io/iptv/countries/ng.m3u for Nigeria)
- **Stars:** 95,000+ — the most starred IPTV project on GitHub
- **Maintained:** YES — daily auto-updates, community maintained
- **Status: ALIVE — ALREADY KNOWN, but genre/country URLs worth using**

---

### 4. djthawks/IPTV-1
- **Repo:** https://github.com/djthawks/IPTV-1
- **What it is:** Fork of devsground/IPTV, focused on international breadth
- **Channel count:** 7,500+ international channels
- **Coverage:** 190+ country-specific playlists, 27 category playlists
- **Category playlists:** Sports, News, Movies, Music, Documentary, Entertainment, Education, etc.
- **Maintained:** UNCLEAR — 23 commits total, fork with limited activity
- **Status: QUESTIONABLE — verify before relying on it**

---

### 5. iptv-restream/IPTV (freearhey/iptv)
- **Repo:** https://github.com/iptv-restream/IPTV
- **Main M3U:** https://raw.githubusercontent.com/freearhey/iptv/master/index.m3u
- **Also:** https://raw.githubusercontent.com/freearhey/iptv/master/index.all.m3u
- **Channel count:** 6,000+ (confirmed from multiple sources)
- **Note:** China alone has 1,420 channels in this repo
- **Maintained:** YES — 43 commits, test infrastructure for broken links
- **Status: ALIVE**

---

### 6. Free-TV/IPTV
- **Repo:** https://github.com/Free-TV/IPTV
- **Main M3U:** https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8
- **Channel count:** ~1,050+ channels confirmed by actual fetch
- **Focus:** Free-to-air, legal sources only
- **Maintained:** YES — actively maintained, curated
- **Status: ALIVE — quality over quantity, good for legal/safe channels**

---

## TIER 3 — PLATFORM-SPECIFIC GENERATORS (AVOD/FAST channels)

### 7. BuddyChewChew/xumo-playlist-generator (XUMO)
- **Repo:** https://github.com/BuddyChewChew/xumo-playlist-generator
- **Direct M3U:** https://raw.githubusercontent.com/BuddyChewChew/xumo-playlist-generator/refs/heads/main/playlists/xumo_playlist.m3u
- **Channel count:** ~150 confirmed (actual fetch, all US channels)
- **EPG:** Included with playlist
- **No login required, no DRM, no ads cut from streams**
- **Auto-updated via GitHub Actions (379 commits)**
- **Maintained:** YES — bot-automated updates
- **Status: ALIVE — 150 clean US FAST channels, good for AVOD content**

---

### 8. Samsung TV Plus
- **Direct M3U:** https://apsattv.com/ssungusa.m3u
- **Self-hosted project:** https://github.com/matthuisman/samsung-tvplus-for-channels (Python, Docker, 91 stars)
- **Channel count:** 450+ US channels, growing toward 700+. Also: Canada, UK, Australia, India, Mexico, Germany, France, Brazil
- **Notable channels:** CNN, Bloomberg TV, CBS News, LiveNow, ABC News, Hallmark Movies, SportsGrid, Martha Stewart cooking, Emeril Lagasse
- **Late 2025 additions:** Cooking, lifestyle, niche categories
- **Maintained:** YES — Samsung updates continuously, self-hosted extractor actively maintained
- **Status: ALIVE — 450–700 US channels, major FAST platform**

---

### 9. Xumo via apsattv.com
- **Direct M3U:** https://www.apsattv.com/xumo.m3u
- **Channel count:** 350+ live channels
- **EPG:** Working electronic program guide included
- **Status: ALIVE — separate from BuddyChewChew, serves apsattv-hosted version**

---

### 10. Tubi TV (clseibold/tubi-m3u)
- **Repo:** https://github.com/clseibold/tubi-m3u (NOTE: returned 404 on direct fetch — may be private/deleted)
- **Alternative:** https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u
- **Also:** https://github.com/jgomez177/tubi-for-channels
- **Channel count:** Tubi has 350+ live linear channels in the US
- **Status: VERIFY — clseibold gone but BuddyChewChew version may work**

---

### 11. Pluto TV
- **PlutoIPTV tool:** https://github.com/evoactivity/PlutoIPTV (generates local m3u via `npx pluto-iptv`)
- **apsattv Pluto M3U:** https://apsattv.com/plutotv.m3u (if available)
- **mjh.nz index:** https://i.mjh.nz/PlutoTV/ (XML files for US, CA, GB, BR, MX, FR, DE, ES, IT, Nordic countries, AR, CL)
- **Full Pluto M3U (all regions):** https://i.mjh.nz/PlutoTV/all.m3u8
- **NOTE:** Pluto now requires authentication for streams to work. Need free account token.
- **Channel count:** 350+ US channels, available across 15+ country regions
- **Maintained:** YES — evoactivity repo active, mjh.nz updated
- **Status: ALIVE BUT AUTH REQUIRED — authentication wall complicates direct use**

---

## TIER 4 — REGIONAL / SPECIALIZED SOURCES

### 12. YanG-1989/m3u (Chinese IPTV — confirmed real)
- **Repo:** https://github.com/YanG-1989/m3u
- **Gather.m3u (Compact):** https://bit.ly/IPTV-Gather
- **Gather.m3u (Full):** https://tv.iill.top/m3u/Gather
- **Live.m3u:** https://m.iill.top/Live.m3u
- **Focus:** Chinese TV (including Hong Kong channels), 15–30 minute update cycles for Live.m3u
- **Has 4+ forks** (liupinero, maleiyh, LegendAdmin, xingxiu7175)
- **Maintained:** YES — updated through August 2025, regular Migu stream fixes
- **Status: ALIVE — primarily Chinese content, good for Asian category**

---

### 13. joevess/IPTV (Chinese Central + Regional)
- **Repo:** https://github.com/joevess/IPTV
- **Basic M3U:** https://mirror.ghproxy.com/raw.githubusercontent.com/joevess/IPTV/main/home.m3u8
- **Extended M3U:** https://mirror.ghproxy.com/raw.githubusercontent.com/joevess/IPTV/main/iptv.m3u8
- **With backups:** https://mirror.ghproxy.com/raw.githubusercontent.com/joevess/IPTV/main/sources/iptv_sources.m3u8
- **Focus:** Chinese Central TV + regional satellite channels, best resolution/speed auto-selected
- **Stars:** 10,300 — major Chinese IPTV repo
- **Maintained:** YES — 720 forks, regular updates (latest noted Jan 2024)
- **Status: ALIVE — Chinese focused but massive community**

---

### 14. YueChan/Live (Chinese + Global HD)
- **Repo:** https://github.com/YueChan/Live
- **Playlists available:**
  - IPTV.m3u: https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u
  - Global.m3u: https://raw.githubusercontent.com/YueChan/Live/main/Global.m3u
  - Radio.m3u: https://raw.githubusercontent.com/YueChan/Live/main/Radio.m3u
  - GNTV.m3u: https://raw.githubusercontent.com/YueChan/Live/main/GNTV.m3u
- **Focus:** HD Chinese streams + global content + radio
- **Maintained:** YES — 785 commits, last updated Jan 5, 2026
- **Status: ALIVE**

---

### 15. fanmingming/live (Chinese TV icon library + playlists)
- **Repo:** https://github.com/fanmingming/live (27,700 stars)
- **EPG:** https://live.fanmingming.cn/e.xml
- **Demo playlist:** https://live.fanmingming.cn/tv/m3u/demo.m3u
- **Focus:** Chinese TV/radio icon library + playlist template. Users build own playlists from demo.
- **NOT a direct full playlist source** — it's an icon/EPG resource + template
- **Maintained:** YES — 5,182 commits, logos updated 2025.04.01
- **Status: ALIVE — USE FOR LOGOS + EPG, not as primary playlist source**

---

### 16. ddgksf2013/M3U8LIST (Curated reference)
- **Repo:** https://github.com/ddgksf2013/M3U8LIST
- **Primary playlist:** https://github.com/ddgksf2013/M3U8LIST/raw/master/IPTV2024.m3u (70 channels)
- **Also references:** YanG-1989 (8,145 adult/general), YueChan IPV6 (92 channels), Bestv (94 channels), Owen2000 (201 channels)
- **Maintained:** Limited — 14 commits total, functions as curated index
- **Status: LOW PRIORITY — small repo, points to other sources**

---

## TIER 5 — TOOLS & INFRASTRUCTURE (Not playlists, but useful)

### 17. matthuisman/samsung-tvplus-for-channels
- **Repo:** https://github.com/matthuisman/samsung-tvplus-for-channels
- **What it is:** Python/Docker app that generates a Samsung TV Plus M3U + EPG for use in Channels DVR
- **Stars:** 91, MIT license
- **Use case:** Self-host to get full Samsung TV Plus channel list with EPG

### 18. lem85930/thetvapp-m3u
- **Repo:** https://github.com/lem85930/thetvapp-m3u
- **What it is:** TheTVApp.to M3U generator — live TV + sports channels. Requires running locally or via Docker on port 4124.
- **Note:** Previous bit.ly URL removed due to abuse. Requires self-hosting.
- **Status: SELF-HOSTED — needs Docker setup, not a static URL**

### 19. TheBinaryNinja/tvapp2
- **Repo:** https://github.com/TheBinaryNinja/tvapp2
- **What it is:** Automatic M3U playlist + XML guide updater for IPTV clients. TheTVApp variant.
- **Status: SELF-HOSTED TOOL**

---

## SPECIFIC SOURCES NOT FOUND

The following were searched but no matching repos found:
- **joevhit/IPTV-FREE** — No GitHub user "joevhit" found. Possibly confused with "joevess/IPTV" (confirmed real, 10k stars)
- **forootan/IPTV** — No matching GitHub repo found under that username
- **Azimjon anime IPTV** — No matching repo found

---

## IPTVCAT.NET — AGGREGATOR DIRECTORY (Not GitHub)

- **URL:** https://iptvcat.net
- **What it is:** Daily-checked IPTV stream aggregator that re-shares publicly available links
- **Sports sections:**
  - All sports: https://iptvcat.net/sport__11
  - US Sports: https://iptvcat.net/united%20states%20of%20america/s/sports
  - Fox Sports: https://iptvcat.net/s/fox_sports
  - BeIN Sports: https://iptvcat.net/s/bein_sports/mark/iptv_streams
  - India Star Sports: https://iptvcat.net/india__1/s/star_sports
- **Format:** Lets you download custom M3U files per search/filter
- **Status: ALIVE — good for finding specific sports channel streams**

---

## APSATTV.COM — M3U HOSTING HUB (Not GitHub)

- **URL:** https://www.apsattv.com/streams.html
- **What it is:** Hosts multiple platform M3U files in one place
- **Known URLs:**
  - Samsung TV Plus US: https://apsattv.com/ssungusa.m3u
  - Xumo: https://www.apsattv.com/xumo.m3u
  - Pluto TV: check streams page
- **Status: ALIVE — convenient single-host for FAST platform playlists**

---

## RECOMMENDED INTEGRATION PRIORITY

| Priority | Source | Channels | Why |
|----------|--------|----------|-----|
| 1 | HerbertHe/iptv-sources | 8,543 (iptv.org stream) | Meta-aggregator, auto-updated every 2h |
| 2 | Samsung TV Plus (apsattv) | 450–700 | US FAST channels, major brands |
| 3 | Xumo (BuddyChewChew) | 150 | Clean US FAST, no ads, no DRM |
| 4 | Tubi TV (BuddyChewChew) | 350+ | Large US AVOD live channels |
| 5 | joevess/IPTV | unknown | 10k stars, Chinese + Asian content |
| 6 | YueChan/Live | unknown | HD + Global.m3u for international |
| 7 | iptvcat.net | per-query | Sports streams, fetch per sport |
| 8 | Free-TV/IPTV | 1,050+ | Legal/safe quality channels |
| 9 | Pluto TV (apsattv/mjh.nz) | 350+ | Auth required — verify if extractable |

---

## NEW M3U URLS TO TRY (Quick Test List)

```
# Meta-aggregator (iptv-org all)
http://m3u.ibert.me/ytoo.m3u

# Samsung TV Plus
https://apsattv.com/ssungusa.m3u

# Xumo (auto-updated)
https://raw.githubusercontent.com/BuddyChewChew/xumo-playlist-generator/refs/heads/main/playlists/xumo_playlist.m3u

# Tubi TV
https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u

# Free-TV (legal, quality)
https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8

# YueChan Global
https://raw.githubusercontent.com/YueChan/Live/main/Global.m3u

# YueChan IPTV
https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u

# joevess basic Chinese
https://mirror.ghproxy.com/raw.githubusercontent.com/joevess/IPTV/main/home.m3u8

# YanG-1989 Gather (full)
https://tv.iill.top/m3u/Gather

# Pluto TV all regions (auth may be needed)
https://i.mjh.nz/PlutoTV/all.m3u8

# iptv-restream
https://raw.githubusercontent.com/freearhey/iptv/master/index.all.m3u
```

---

*Generated by ZION SYNAPSE — 2026-02-27*
