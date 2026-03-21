# DashTivi+ Channel Intelligence Report
## March 21, 2026 — Full Platform Audit

### Executive Summary

| Metric | Value |
|---|---|
| Total channels | 11,255 |
| Alive (probed) | 8,485 (75%) |
| Dead (probed) | 2,770 (24%) |
| Categories | 144 |
| VPS-marked live categories | 104 |
| VPS-marked dead categories | 34 |
| Categories with hidden alive channels | 25 |
| Cross-category duplicates | 78 groups |
| Probe duration | 464s (5 parallel workers) |

---

## 1. DSTV — Channel-Level Reality

VPS says ALL DSTV categories are "live" but channel-level probing reveals **~28% actual alive rate**:

| Category | ID | Alive | Total | Rate | HTTPS Icons |
|---|---|---|---|---|---|
| Entertainment | 343 | 24 | 84 | 28% | 79/84 |
| Entertainment FHD | 428 | 20 | 72 | 27% | 70/72 |
| Kids | 347 | 4 | 13 | 30% | 11/13 |
| Kids FHD | 430 | 5 | 15 | 33% | 14/15 |
| Movies | 344 | 4 | 7 | 57% | 7/7 |
| Movies FHD | 429 | 2 | 9 | 22% | 8/9 |
| News | 346 | 4 | 17 | 23% | 16/17 |
| News FHD | 431 | 1 | 5 | 20% | 5/5 |
| Sports | 345 | 7 | 32 | 21% | 32/32 |
| Sports FHD | 427 | 12 | 34 | 35% | 29/34 |
| **TOTAL** | — | **103** | **288** | **35%** | **271/288** |

**Key insight**: DSTV has EXCELLENT icon coverage (94% HTTPS) but only 35% of channels actually stream. The app MUST probe and filter at the channel level — category-level health is misleading.

**SD ↔ FHD fallback**: For many channels, if SD is dead, FHD copy may be alive (and vice versa). The app should try the alternate quality when one fails.

---

## 2. WorldEX Region Status

### Africa ✅ Strong
- Canal+ (336): 247 streams — category alive
- DSTV sub-genres all live at category level (channel-level ~30% alive)
- Genre pills work: Sports, Entertainment, News, Movies, Kids all have dedicated categories

### France ⚠️ Partially Alive (VPS says dead)
- Category 11: VPS marked DEAD but **37/188 channels actually alive (19%)**
- French channels also in Africa Canal+ (cat 336): ARTE, France 2, France 3, France 24, M6, TMC + all Canal+ sports
- **Recommendation**: Don't remove France from WorldEX. Instead, probe and show only the 37 alive channels. Supplement with Canal+ Africa French channels.

### UK ✅ Strong
- General (414): 35 streams, live
- Genre sub-categories all live: Sports (483/32), Entertainment (3/52), News (417/16), Movies (413/42), Kids (410/12), Docs (415/20), Music (416/9)

### USA ✅ Strong
- Category 2: 145 streams, live, 44 alive at channel level (30%)

### Arabic ❌ BROKEN
- Category 12: **0 streams** — this category ID doesn't match anything in the API
- Arabic content EXISTS but in different categories:
  - MBC Arabic (86): 53 channels
  - Arabic News (165): 52 channels
  - Sports Arabic (156): 93 channels
  - Shahed Box (175): 34 channels
  - Iraq (129): 65 channels
  - Egypt (180): 69 channels
  - Kuwait (178): 17 channels
  - UAE (556): 26 channels
  - Saudi Arabia (181): 31 channels
- **MUST FIX**: Change Arabic WorldEX to use categories [86, 165, 156] as main, add genre pills for the rest

### India ⚠️ Mismatched
- Category 6 = "SPORTS | SPORTS" (22 generic sports channels, NOT India content)
- Actual India content spans 17+ categories:
  - India Entertainment (247): 37 streams, 78% alive
  - Bangla (9): 88 streams, 44% alive
  - Punjabi (7): 83 streams, 24% alive
  - Tamil Entertainment (732): 67 streams, 31% alive
  - Malayalam Movies (729): 65 streams, 38% alive
  - Cricket (5): 62 streams, 36% HTTPS icons
  - Indian SD (18): 38 streams
  - Indian News (730): 27 streams
  - Sports India (356): 8 streams, 100% HTTPS
  - Pakistan (98): 54 streams
  - Nepal (64): 87 streams
  - Plus more: Kannada, Telugu, Malayalam, Tamil sub-categories
- **MUST FIX**: Change India WorldEX to use [247, 9, 7, 732, 729, 5, 18, 730, 356] + genre pills

---

## 3. Live TV Theme Health

| Theme | Total | Alive (probed) | Rate | Dead Categories |
|---|---|---|---|---|
| Sports | 300 | ~150 | ~50% | None |
| News | 63 | ~40 | ~63% | None |
| Entertainment | 353 | ~100 | ~28% | None |
| Kids | 148 | ~38 | ~25% | None |
| Movies 24/7 | 272 | ~75 | ~27% | Amazon (280) |

All theme categories are VPS-live, but channel-level rates are 25-63%. The app MUST filter dead channels for a good experience.

---

## 4. Sports Landscape

1,367 sports channels across 71 categories. By type:
- General Sports: 1,014 (broad keyword match)
- American Football/NFL: 82 (77 in live cats)
- Cricket: 53 (in dedicated cat 5, good icons)
- Football/Soccer: Most in beIN (85) + Football (234) + DSTV (345/427)
- Rugby: 21 (dedicated cat 550)
- F1/Racing: 4 (dedicated cat 342)
- Tennis: 6 (dedicated cat 212)
- Golf: 9 (dedicated cat 138)
- Boxing/MMA/PPV: 72+ (cat 190)

**Missing from current Sports theme**:
- Rugby (550) — 21 channels, LIVE
- Golf (138) — 9 channels, LIVE
- Tennis (212) — 6 channels, LIVE
- UK Mix (139) — 9 channels, LIVE
- India Sports (356) — 8 channels, LIVE, 100% HTTPS
- Fox Australia (137) — 8 channels, LIVE
- Arabic Sports (156) — 93 channels, LIVE

**Redundancy map**: Sky Sports Football appears in 5 categories. Sky Sports Premier League in 5. These are FALLBACK OPPORTUNITIES — if one copy is dead, try another.

---

## 5. Hidden Gems — VPS-Dead Categories with Alive Channels

| Category | ID | Alive | Total | Rate |
|---|---|---|---|---|
| Poland | 39 | 138 | 525 | 26% |
| Canada | 31 | 49 | 467 | 10% |
| Bulgaria | 44 | 47 | 176 | 26% |
| **France** | **11** | **37** | **188** | **19%** |
| Albania | 29 | 37 | 343 | 10% |
| **Sweden** | **63** | **25** | **51** | **49%** |
| Czech | 774 | 19 | 86 | 22% |
| Denmark | 579 | 16 | 53 | 30% |
| Romania | 35 | 15 | 79 | 18% |
| Australia | 54 | 13 | 300 | 4% |

These 470+ alive channels are currently INVISIBLE to users because VPS marks the whole category dead. With per-channel probing, we can surface them.

---

## 6. Duplicate & Fallback Intelligence

73 channel groups exist in multiple LIVE categories — quality optimization opportunities:
- Sky Sports Football: 5 copies (HD, FHD, 4K variants across 3 categories)
- Sky Sports Premier League: 5 copies
- Star Plus: 4 copies (HD, FHD across categories)
- SuperSports PSL: 3 copies (HD, FHD, DSTV Super)

**Strategy**: For duplicates, always prefer HTTPS icon + highest quality variant. Fallback to alternate copy if primary is dead.

---

## 7. Icon Coverage Analysis

| Tier | Count | Notes |
|---|---|---|
| HTTPS icons | ~2,500 | Best quality, direct display |
| HTTP icons | ~4,000 | Need VPS proxy for display |
| No icons | ~4,755 | Letter avatar fallback |

Best icon coverage: DSTV (94%), Punjabi (86%), Tamil Entertainment (65%), Cricket (56%), UK Sports (68%).
Worst: USA (0%), beIN (0%), Africa Canal+ (0%), Movies 24/7 (0%).

---

## 8. Recommendations for Platform Restructuring

### Immediate Fixes
1. **Fix Arabic WorldEX**: Change from cat 12 (empty) to [86, 165, 156] with genre pills
2. **Fix India WorldEX**: Change from cat 6 (sports) to [247, 9, 7, 732, 729, 5, 18, 730, 356]
3. **Fix France WorldEX**: Keep cat 11 but probe and filter (37 alive). Supplement with Canal+ Africa French channels from cat 336
4. **Add missing sports**: Rugby (550), Golf (138), Tennis (212), India Sports (356), Arabic Sports (156)
5. **Deploy hourly probe cron**: Write results to /probe-results.json on VPS

### Architecture Changes
1. **Channel-level health**: Replace category-level health check with per-channel probe data
2. **Fallback system**: When a channel fails, try its duplicate in another category
3. **Smart sorting**: Alive + HTTPS icon first, alive + HTTP icon second, alive + no icon last, hide dead
4. **Dead channel recovery**: Re-probe dead channels every 15 min, bring back when alive

### New Curated Experiences (potential)
Based on alive channel counts, these could be new WorldEX regions or Live TV themes:
- **Nordics** (Sweden 25 + Denmark 16 + Norway?): 40+ alive channels
- **South Asia** (India Ent. + Bangla + Punjabi + Tamil + Malayalam): 200+ alive channels
- **Eastern Europe** (Poland 138 + Bulgaria 47 + Romania 15 + Czech 19 + Albania 37): 250+ alive channels
- **Islamic/Religious** (Islamic 29 + various): 30+ alive channels
- **24/7 Movie Channels** (English 75 + Bollywood 24 + Netflix 16): 115+ alive channels
