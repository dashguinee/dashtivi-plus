# DashTivi+ Ordering Audit
**Date**: 2026-03-28 | **Auditor**: ZION SYNAPSE
**Target Market**: Sierra Leone, Guinea, West Africa (English/French speakers, football fans)

---

## CRITICAL FINDING: GEM_STREAM_IDS IS DEAD CODE

`GEM_STREAM_IDS` is defined at `/home/dash/tivi-plus/src/lib/collections.ts:580` with 100+ premium channel IDs (beIN 4K, Sky Sports FHD, TNT Sports, CNN HD, BBC News, etc.) but is **never imported or used anywhere in the codebase**.

The only sorting applied to channels in Live TV is `sortByIconQuality()` in `src/lib/xtream.ts:831`, which scores channels solely by whether their icon URL starts with `https://` (score 2), `http://` (score 1), or nothing (score 0). This means:
- A random Indian regional channel with an HTTPS icon sorts ABOVE Sky Sports Premier League FHD if Sky Sports has an HTTP icon
- beIN 4K channels (the strongest package, 36 4K streams) have NO priority over any other channel
- The gem curation work from the 2026-03-28 probe is completely wasted

**Fix**: Import `GEM_STREAM_IDS` in `LiveTVPage.tsx` and `HomePage.tsx`, and create a `sortGemsFirst()` function that gives gems a score of 100 before falling back to `sortByIconQuality`.

---

## A. Homepage Scroll Flow

### Current Order (verified from HomePage.tsx render, lines 706-1104)

| Position | Section | Type | Load Strategy | Data Source |
|----------|---------|------|---------------|-------------|
| 1 | Hero Banner (time-aware) | Static | Immediate | `getFeaturedHero()` — no API call |
| 2 | Quick Navigation Pills (8) | Static | Immediate | `COLLECTION_CARDS` — no API call |
| 3 | Continue Watching | History | Immediate | localStorage via `useWatchHistory` |
| 4 | Zone Divider | UI | -- | -- |
| 5 | VEE Smart Picks | Smart | Lazy (after main rows) | Fetches 4 VOD categories + TMDB map |
| 6 | Zone Divider | UI | -- | -- |
| 7 | DASH Feed | Social | Lazy | `FeedSection` component |
| 8 | Platform Originals Showcase | Smart | Lazy (after main rows) | 6 platforms x 1 category each |
| 9 | Because You Watched | Smart | Lazy (after main rows + profile) | Recommendation engine |
| 10 | Sports Break (divider) | UI | -- | -- |
| 11 | Hottest Fixtures (circles) | Live | Lazy (after main rows) | Categories 234, 85, 492 |
| 12 | Discover Sports (tabbed) | Live | Lazy (after main rows) | Football/beIN/Tennis tabs |
| 13 | Dive Right Back In (divider) | UI | -- | -- |
| 14 | DASH Exclusives | VOD | Lazy (after main rows) | Awards (240) + Blockbusters (34) |
| 15 | Zone Divider | UI | -- | -- |
| 16-22 | Collection Rows | Mixed | Parallel on mount | `HOMEPAGE_COLLECTIONS` (7 rows) |

### Collection Rows Order (positions 16-22)

The `allRows` array at line 650 is: `[...topSmartRows, ...rows]`
- `topSmartRows` = "For You" (smart-vod, if profile exists)
- `rows` = HOMEPAGE_COLLECTIONS in definition order

| Slot | Collection ID | Name | Type |
|------|--------------|------|------|
| 16 | smart-for-you | For You | smart-vod (if profile exists) |
| 17 | live-sports | Live Sports | live |
| 18 | fresh-movies | Just Dropped | vod |
| 19 | kids-family | Kids & Family | live |
| 20 | news-world | Stay Informed | live |
| 21 | cinema-4k | 4K Experience | vod |
| 22 | k-drama-turkish | Binge-Worthy | series |
| 23 | world-cinema | Around the World | live |

There are also zone breakers:
- "GET IN COMFORT ZONE" appears before Kids & Family (line 1075)
- "TRY SOMETHING NEW" appears before 4K Experience (line 1085)

### Issues Found

1. **Too many sections before collection rows (15 sections before row content!)**: A new user with no history sees: Hero -> Pills -> VEE (loading) -> Feed -> Platform Originals (loading) -> Sports Break -> Hottest Fixtures (loading) -> Discover Sports (loading) -> Dive Back In -> DASH Exclusives (loading) -> then finally the core collection rows. That is a LOT of scrolling before hitting the browsable content.

2. **VEE Smart Picks at position 5 is too early**: VEE depends on TMDB data + movie pool fetch (lazy loaded). For a new user, this section likely renders empty or with a loading state while all the main rows below it are already loaded.

3. **DASH Feed at position 7 is too high**: Social/community content should not interrupt the core browse experience this early. It breaks the "show me what to watch" flow.

4. **Platform Originals Showcase at position 8 blocks the sports zone**: Netflix/Prime/HBO cards appear before Hottest Fixtures. For a sports-first market (West Africa), sports content should not be pushed to position 11.

5. **"For You" prepends to collection rows**: The `topSmartRows` array is spread before the static rows, meaning "For You" always appears as the first collection row even though it is lazily loaded. This can cause a layout shift when it pops in.

6. **Collection row order is static**: The 7 rows are hardcoded in `HOMEPAGE_COLLECTIONS` order. There is no intelligence layer reordering them based on user behavior (unlike Live TV themes which use `getSmartThemeOrder`).

### Recommended Order

```
 1. Hero Banner (time-aware)              -- KEEP
 2. Quick Navigation Pills                -- KEEP
 3. Continue Watching                     -- KEEP (only shows with history)
 4. For You (smart)                       -- MOVE HERE from position 16
 5. Just Dropped (movies)                 -- MOVE UP from position 18
 6. Live Sports                           -- MOVE UP from position 17
 7. Sports Break + Hottest Fixtures       -- MOVE UP from position 10-11
 8. Discover Sports                       -- MOVE UP from position 12
 9. VEE Smart Picks                       -- MOVE DOWN from position 5
10. Platform Originals Showcase           -- KEEP
11. Because You Watched                   -- KEEP
12. Kids & Family                         -- position 19 -> 12
13. Stay Informed (News)                  -- position 20 -> 13
14. 4K Experience                         -- position 21 -> 14
15. Binge-Worthy (K-Drama/Turkish)        -- position 22 -> 15
16. Around the World                      -- position 23 -> 16
17. DASH Exclusives                       -- MOVE DOWN from position 14
18. DASH Feed                             -- MOVE TO BOTTOM from position 7
```

**Reasoning for Sierra Leone**:
- Movies first: Sierra Leoneans love movies -- "Just Dropped" is the highest-engagement content
- Sports second: Football is king in West Africa -- beIN, SuperSport, Sky Sports need to be visible fast
- Group all sports together (Live Sports + Fixtures + Discover) instead of scattering across the page
- VEE and Feed are discovery mechanisms, not primary content -- they should be positioned after the core browse sections
- Push DASH Feed to bottom -- it is social content, not what users open the app for

### Code Changes Required

**File**: `src/pages/HomePage.tsx`

1. **Move "For You" rendering**: Instead of prepending to `allRows` at line 650, render `topSmartRows` as a dedicated section between Continue Watching and Just Dropped.

2. **Reorder HOMEPAGE_COLLECTIONS** in `src/lib/collections.ts` (lines 55-144):
```
Current:  live-sports, fresh-movies, kids-family, news-world, cinema-4k, k-drama-turkish, world-cinema
Proposed: fresh-movies, live-sports, kids-family, news-world, cinema-4k, k-drama-turkish, world-cinema
```
Move `fresh-movies` to index 0 in the array.

3. **Move VEE widget rendering** (lines 816-825) to after the Platform Originals section.

4. **Move FeedSection rendering** (line 831) to after the collection rows section (after line 1103).

5. **Move Sports hex sections** (Hottest Fixtures at line 893, Discover Sports at line 948) to immediately after the Live Sports collection row instead of being at positions 11-12.

---

## B. Live TV Theme Ordering

### Current Order (from LIVETV_THEMES in collections.ts, lines 249-390)

| Position | Theme ID | Name | Category Count |
|----------|----------|------|----------------|
| 1 | sports | Sports | 19 categories |
| 2 | entertainment | Entertainment | 9 categories |
| 3 | news | News | 6 categories |
| 4 | kids | Kids & Family | 2 categories |
| 5 | movies247 | Movie Channels | 7 categories |
| 6 | music | Music & Vibes | 5 categories |
| 7 | documentary | Docs & Discovery | 2 categories |
| 8 | premium4k | Premium 4K | 7 categories |
| 9 | faith | Faith | 2 categories |

**Smart ordering is applied**: `getSmartThemeOrder()` in `intelligence.ts` reorders themes based on user affinity (recency 40%, frequency 35%, engagement 25%). For a NEW user with no history, the default order (above) is used.

### Issues Found

1. **Sports first is CORRECT for Sierra Leone**: Football is the #1 draw. beIN + Sky Sports + SuperSport is world-class. Keep this.

2. **Entertainment second is correct**: BBC, Sky, HBO, Canal+, France content. Good for the target market.

3. **Premium 4K at position 8 is buried**: 4K is a premium selling point -- it should be higher to justify the subscription. However, it shares many of the same channels as Sports (beIN 4K, Sky Sports UHD). This creates **duplication**: user sees the same beIN 4K channels in Sports AND in Premium 4K.

4. **No "French" theme**: Canal+ is buried inside Entertainment's sub-tab "Canal+ & France" (categoryId '11', '39'). For Guinea (francophone market), French content deserves its own theme OR the "Canal+ & France" sub-tab should be the default when navigating from a French-language pill.

5. **Faith at position 9 is too low for West Africa**: Faith (Islamic + Christian) is deeply important in Sierra Leone and Guinea. It should be above Documentary and potentially above Music.

### Recommended Order

```
1. Sports             -- KEEP (football is king)
2. Entertainment      -- KEEP (BBC, Sky, HBO, Canal+)
3. News               -- KEEP (CNN, BBC News, Al Jazeera)
4. Kids & Family      -- KEEP
5. Movie Channels     -- KEEP
6. Faith              -- MOVE UP from 9 to 6 (West Africa is deeply religious)
7. Music & Vibes      -- MOVE DOWN from 6 to 7
8. Premium 4K         -- KEEP (selling point, but consider dedup)
9. Docs & Discovery   -- MOVE DOWN from 7 to 9
```

### Code Changes Required

**File**: `src/lib/collections.ts`, lines 249-390

Reorder the `LIVETV_THEMES` array: move the `faith` object (currently at index 8, lines 379-389) to index 5 (after `movies247`). Move `documentary` (currently index 6, lines 352-362) to index 8 (after `premium4k`).

---

## C. Channel Ordering WITHIN Themes

### How Channels Are Sorted

1. Categories are fetched in the order listed in `categoryIds` array for each theme
2. All streams are merged into one flat array via `dedupeStreams()` (LiveTVPage.tsx:432)
3. Quality grouping is applied via `groupChannelsByQuality()` -- picks best quality variant
4. Final sort: `sortByIconQuality()` -- only checks if icon URL is https/http/none
5. **GEM_STREAM_IDS is never applied** -- this is the critical bug

### Theme-by-Theme Analysis

#### Sports (lines 251-276)
```
categoryIds order: 85 (beIN), 578 (Real 4K), 353 (Sky Sports UK), 483 (Sky extra),
                   234 (Football), 492 (EPL), 5 (Cricket), 6 (Sports General),
                   342 (Tennis/Racing), 550 (Rugby), 138 (Boxing), 212 (Fighting),
                   356 (India Sports), 156 (Arabic Sports), 137 (Wrestling),
                   516 (NFL), 139 (More), 726 (Additional), 328 (Misc)
```
**Assessment**: Category order is CORRECT -- beIN first (strongest package, 124ch, 39 gems), then Real 4K, then Sky Sports. However, within each category, channels are returned in API default order (usually stream_id ascending), and the final sort is only by icon quality, NOT by gem status.

**Issue**: A beIN 4K channel (stream_id 652310, the strongest sports channel) could sort BELOW a random Indian regional sports channel that happens to have an HTTPS icon. The gem list has 9 beIN 4K channels, 9 beIN FHD, 9 Sky Sports FHD -- none get priority.

#### Entertainment (lines 278-294)
```
categoryIds order: 3 (UK Ent), 414 (UK General), 2 (USA), 11 (France),
                   39 (Poland), 247 (India Ent), 338 (India Ent 2), 19 (UK Asian), 24 (US 24/7)
```
**Issue**: France (category 11, 162 channels, 86% alive) is at position 4, after USA (93ch). For Guinea/francophone West Africa, French content should be position 2 or 3. Also, Poland (192 channels) is at position 5 -- this is irrelevant for the Sierra Leone market and bloats the theme with niche European content.

**Recommendation**: Move France ('11') to position 2, remove Poland ('39') from Entertainment (it is accessible via WorldEX Europe).

#### News (lines 296-308)
```
categoryIds order: 82 (English News), 417 (UK News), 165 (Arabic News),
                   730 (Indian News Malayalam), 77 (Indian News), 98 (Pakistan News)
```
**Issue**: Arabic News at position 3 is correct (Al Jazeera is important in West Africa). But Indian and Pakistan news categories (positions 4-6) add 94 channels that are irrelevant for Sierra Leone. They push more relevant channels off-screen.

**Recommendation**: Move 730, 77, 98 to positions 5-6 (they are still available, just deprioritized) OR create a sub-tab for "South Asian News".

#### Kids (lines 312-320)
```
categoryIds order: 410 (UK Kids, 12ch, 11 gems), 32 (Kids, 46ch, 29 gems)
```
**Assessment**: CORRECT. UK Kids first (higher quality FHD), then general Kids. Small enough that ordering is fine.

#### Movie Channels (lines 322-336)
```
categoryIds order: 87 (beIN Movies), 275 (English 24/7), 57 (Netflix 24/7),
                   340 (India English Movies), 339 (India Hindi Movies),
                   282 (Bollywood 24/7), 280 (Amazon 24/7)
```
**Issue**: beIN Movies first is correct (8 gems, 4K). But English 24/7 and Netflix 24/7 channels have zero branding (no icons per the curation report). They will sort last due to `sortByIconQuality`. India English Movies (340) has 11 4K channels -- those should be surfaced higher.

#### Music (lines 338-350)
```
categoryIds order: 416 (UK Music), 341 (India Music), 555 (Arabic Music),
                   270 (Bollywood Singers), 287 (Punjabi Singers)
```
**Issue**: For West Africa, Afrobeats/African music is the #1 demand. Category 416 (UK Music) has MTV and UK channels, which is fine. But there is no African music category in the Xtream API. The sub-tab "Afro Beats" in `MUSIC_TYPES` has `categoryIds: []` (empty!) -- it was designed for free channels only. This means the most important music genre for the target market has NO Xtream content backing it.

#### Documentary (lines 352-362)
```
categoryIds order: 415 (UK Docs, 19ch, 18 gems), 337 (India Docs, 23ch, 17 gems)
```
**Assessment**: CORRECT. UK first (Sky History, Discovery FHD, NatGeo), then India (4K variants).

#### Premium 4K (lines 363-378)
```
categoryIds order: 578 (Real 4K), 85 (beIN Sports), 87 (beIN Movies),
                   337 (India Docs), 340 (India English Movies),
                   339 (India Hindi Movies), 356 (India Sports)
```
**Issue**: This theme overlaps heavily with Sports theme (categories 578, 85) and Movie Channels (87, 340, 339). A user who scrolls Sports and then reaches Premium 4K sees many of the same channels again. Consider filtering out channels already shown in other themes, or making 4K a quality filter rather than a theme.

#### Faith (lines 379-389)
```
categoryIds order: 123 (Islamic, 62ch), 561 (Christian, 16ch)
```
**Assessment**: Ordering is CORRECT for the target market. Islamic first (Sierra Leone ~78% Muslim), Christian second. The ratio (62 vs 16 channels) naturally reflects this.

### Global Fix for Gem-First Sorting

**File**: `src/lib/xtream.ts`

Add a new function that uses `GEM_STREAM_IDS`:

```typescript
import { GEM_STREAM_IDS } from './collections';

export function sortGemsFirst<T extends { stream_id: number; stream_icon: string }>(streams: T[]): T[] {
  return [...streams].sort((a, b) => {
    const aGem = GEM_STREAM_IDS.has(a.stream_id) ? 100 : 0;
    const bGem = GEM_STREAM_IDS.has(b.stream_id) ? 100 : 0;
    if (aGem !== bGem) return bGem - aGem;
    return iconScore(b.stream_icon) - iconScore(a.stream_icon);
  });
}
```

**File**: `src/pages/LiveTVPage.tsx`, line 486

Replace `sortByIconQuality(deduped)` with `sortGemsFirst(deduped)`.

**File**: `src/pages/HomePage.tsx`, `loadLiveCollection()` function (line 138-163)

After the `dailyShuffle`, apply gem-first sorting to pin premium channels at the start.

---

## D. Movies Tab Ordering

### Current Order (from MOVIE_TABS in movie-collections.ts, lines 65-218)

| Position | Tab ID | Name | Subtab Count |
|----------|--------|------|-------------|
| 1 | new | New & Hot | 6 subtabs |
| 2 | hollywood | Hollywood | 14 subtabs |
| 3 | bollywood | Bollywood | 11 subtabs |
| 4 | turkish | Turkish | 3 subtabs |
| 5 | south-indian | South Indian | 10 subtabs |
| 6 | netflix | Netflix | 2 subtabs |
| 7 | collections | Collections | 18 subtabs |
| 8 | kids | Kids | 2 subtabs |
| 9 | world | World Cinema | 10 subtabs |
| 10 | sports | Sports & Events | 6 subtabs |

### Issues Found

1. **Netflix at position 6 is too low**: Netflix is THE most recognized brand in the target market. It should be position 3 or 4. Everyone in Sierra Leone knows Netflix -- it is the universal reference for "streaming". Having it buried after Turkish and South Indian content is wrong.

2. **Bollywood at position 3 is too high for Sierra Leone**: Bollywood has a niche audience in West Africa but is not mainstream. Turkish content (Dizi) actually has stronger appeal in Africa. Swap Bollywood and Turkish, or move both below Netflix.

3. **Collections at position 7 is fine**: Marvel, Star Wars, etc. are discovery content, not primary browsing. Position 7 is acceptable.

4. **South Indian at position 5**: Tamil, Telugu, Malayalam, Kannada -- this is extremely niche for Sierra Leone. It should be closer to World Cinema.

5. **Sports & Events at position 10 (last!)**: UFC, WWE, FIFA World Cup content -- this should not be last. For a sports-loving market, this deserves position 6-7.

### Recommended Order

```
1. New & Hot          -- KEEP (freshness drives engagement)
2. Hollywood          -- KEEP (Western movies are primary demand)
3. Netflix            -- MOVE UP from 6 (brand recognition)
4. Turkish            -- KEEP at 4 (strong African appeal for Turkish drama)
5. Collections        -- MOVE UP from 7 (Marvel, Star Wars = universal appeal)
6. Sports & Events    -- MOVE UP from 10 (UFC, WWE for the sports market)
7. Bollywood          -- MOVE DOWN from 3 (niche in West Africa)
8. Kids               -- KEEP around here (family content)
9. South Indian       -- MOVE DOWN from 5 (very niche)
10. World Cinema      -- KEEP last (discovery/niche)
```

### Code Changes Required

**File**: `src/lib/movie-collections.ts`, lines 65-218

Reorder the `MOVIE_TABS` array entries. Move the `netflix` object (currently index 5) to index 2. Move `collections` (currently index 6) to index 4. Move `sports` (currently index 9) to index 5. Move `bollywood` (currently index 2) to index 6. Move `south-indian` (currently index 4) to index 8.

---

## E. Series Tab Ordering

### Current Order (from SERIES_TABS in series-collections.ts, lines 66-136)

| Position | Tab ID | Name | Subtab Count |
|----------|--------|------|-------------|
| 1 | platforms | Platform Originals | 16 subtabs (Netflix, Prime, HBO, Disney+...) |
| 2 | turkish | Turkish | 1 subtab |
| 3 | korean | Korean | 4 subtabs |
| 4 | browse | Browse All | 20 subtabs |

### Issues Found

1. **Platform Originals first is CORRECT**: Netflix/Prime/HBO/Disney+ are the primary draw. Within this tab, the subtab order is: Netflix -> Prime -> HBO -> Disney+ -> Apple TV+ -> Hulu -> BBC -> Paramount+ -> Starz -> Peacock -> Showtime -> AMC+ -> Stan -> Crave -> BritBox -> Acorn TV. This is correctly ordered by global brand recognition.

2. **Turkish at position 2 is CORRECT**: Turkish drama (Dizi) has massive appeal across Africa and the Middle East. Good position.

3. **Korean at position 3 is acceptable**: K-Drama is growing globally. Fine here.

4. **Browse All at position 4 is correct**: Catch-all for everything else.

5. **Missing: No "African Series" tab**: There are no African series categories visible. If the content exists (via free channels or niche Xtream categories), it should have a dedicated tab for the Sierra Leone market.

### Recommended Changes

- **No structural changes needed** for the 4 tabs
- Within Platform Originals subtabs: Consider moving BBC higher (position 4-5) for the UK/Commonwealth connection in Sierra Leone
- Add an "African" parent tab if African series content becomes available

### Code Changes Required

**File**: `src/lib/series-collections.ts`, line 77

Move the BBC subtab from index 6 to index 4 (after Disney+):
```
Current:  Netflix, Prime, HBO, Disney+, Apple TV+, Hulu, BBC, ...
Proposed: Netflix, Prime, HBO, Disney+, BBC, Apple TV+, Hulu, ...
```

---

## F. WorldEX Region Ordering

### Current Order (from REGIONS in FrenchPage.tsx, lines 27-127)

| Position | Region ID | Name | Flag |
|----------|----------|------|------|
| 1 | motherland | Motherland | Globe |
| 2 | sahara | Crossing the Sahara | Desert |
| 3 | europe | From Paris to Rome | Eiffel |
| 4 | persian | The Gulf & Persian | Mosque |
| 5 | southasia | Welcome to South Asia | Flower |
| 6 | crescent | Crescent & Star | Mountain |
| 7 | isles | The Isles | UK flag |
| 8 | usa | Big USA | US flag |
| 9 | pacific | The Pacific | Palm |
| 10 | americas | The Americas | Maple |
| 11 | spinthewheel | Always On | Slot |

### Assessment

**Motherland FIRST is CORRECT** for Sierra Leone. The journey starts in Africa (DSTV, SuperSport, Africa Magic) and fans outward. This is well-designed.

### Issues Found

1. **Persian at position 4 is too high**: Iranian/Afghan content is very niche for Sierra Leone. It should be after South Asia at minimum.

2. **The Isles (UK) at position 7 is too low**: Sierra Leone is a former British colony. English-language UK content (BBC, Sky, ITV, Premier League) is hugely relevant. It should be position 3 or 4.

3. **USA at position 8 is too low**: CNN, ESPN, Fox, HBO -- American content is globally popular and very relevant. Should be position 5-6.

4. **Motherland category IDs** (FrenchPage line 30): `['345', '427', '343', '428', '430', '347']` -- these are DSTV/African categories. But the REGION_GENRES for motherland (collections.ts line 480) reference `['345', '85', '11', '86', '165']` which includes beIN Sports and France categories. This means the genre filters reference categories NOT in the main region categoryIds.

### Recommended Order

```
 1. Motherland (Africa)      -- KEEP FIRST
 2. Crossing the Sahara      -- KEEP (Arabic/MBC is relevant for Guinea's Muslim population)
 3. The Isles (UK)           -- MOVE UP from 7 (former British colony, English speakers)
 4. From Paris to Rome       -- KEEP at 3-4 (French content for Guinea)
 5. Big USA                  -- MOVE UP from 8
 6. Welcome to South Asia    -- MOVE DOWN from 5
 7. Crescent & Star          -- KEEP
 8. The Gulf & Persian       -- MOVE DOWN from 4
 9. The Pacific              -- KEEP
10. The Americas             -- KEEP
11. Always On                -- KEEP LAST
```

### Code Changes Required

**File**: `src/pages/FrenchPage.tsx`, lines 27-127

Reorder the `REGIONS` array:
1. Move `isles` (currently index 6) to index 2
2. Move `usa` (currently index 7) to index 4
3. Move `persian` (currently index 3) to index 7
4. `europe` stays at 3 (shifts to 3 after isles insert)

---

## G. Quick-tap Pills Ordering

### Current Order (from COLLECTION_CARDS in collections.ts, lines 148-157)

| Position | Pill | Navigate To |
|----------|------|-------------|
| 1 | Sports | /live |
| 2 | News | /live |
| 3 | Movies | /movies |
| 4 | Series | /series |
| 5 | Africa | /french |
| 6 | Kids | /live |
| 7 | Music | /live |
| 8 | Faith | /live |

### Issues Found

1. **Sports first is CORRECT**: Football drives traffic.

2. **News at position 2 is debatable**: For Sierra Leone, Movies might be a stronger second choice. Users come to the app for entertainment first, news second.

3. **Africa at position 5 is too low**: For a West African app, the "Africa" pill should be more prominent. Consider position 3.

4. **Music and Faith at 7-8**: Both are important for the target market but these are discovery pills, not primary navigation. Position is acceptable.

### Recommended Order

```
1. Sports   -- KEEP (football drives everything)
2. Movies   -- MOVE UP from 3 (entertainment is primary use case)
3. Africa   -- MOVE UP from 5 (this IS their region)
4. Series   -- MOVE DOWN from 4
5. News     -- MOVE DOWN from 2
6. Kids     -- KEEP
7. Music    -- KEEP
8. Faith    -- KEEP
```

### Code Changes Required

**File**: `src/lib/collections.ts`, lines 148-157

Reorder the `COLLECTION_CARDS` array:
```typescript
export const COLLECTION_CARDS: CollectionCard[] = [
  { id: 'sports', name: 'Sports', ... },     // 1 - KEEP
  { id: 'movies', name: 'Movies', ... },     // 2 - was 3
  { id: 'africa', name: 'Africa', ... },     // 3 - was 5
  { id: 'series', name: 'Series', ... },     // 4 - was 4
  { id: 'news', name: 'News', ... },         // 5 - was 2
  { id: 'kids', name: 'Kids', ... },         // 6 - KEEP
  { id: 'music', name: 'Music', ... },       // 7 - KEEP
  { id: 'faith', name: 'Faith', ... },       // 8 - KEEP
];
```

---

## H. Homepage Live Collection Rows: Channel Ordering Bug

### loadLiveCollection() — src/pages/HomePage.tsx lines 138-163

This function loads live channels for homepage rows (Live Sports, Kids & Family, News, Around the World). The critical issue:

```typescript
// Line 163
return dailyShuffle(all, collection.id).slice(0, collection.limit);
```

Channels are **shuffled daily** with no gem-first pinning. This means on the homepage, the "Live Sports" row could show a random Arabic Sports channel instead of Sky Sports Premier League FHD. The `smartRotate` function in `intelligence.ts` (which pins top N items) is available but **never used** for live collections on the homepage.

### Fix

Replace line 163 with gem-aware rotation:
```typescript
import { GEM_STREAM_IDS } from '@/lib/collections';

// Pin gems at front, shuffle the rest
const gems = all.filter(s => GEM_STREAM_IDS.has(s.stream_id));
const rest = all.filter(s => !GEM_STREAM_IDS.has(s.stream_id));
return [...gems.slice(0, 5), ...dailyShuffle(rest, collection.id)].slice(0, collection.limit);
```

---

## Summary of All Changes

### Priority 1 (Critical — affects every user, every session)

| # | File | Change | Impact |
|---|------|--------|--------|
| 1 | `src/lib/xtream.ts` | Add `sortGemsFirst()` function using `GEM_STREAM_IDS` | Gem channels surface first everywhere |
| 2 | `src/pages/LiveTVPage.tsx:486` | Replace `sortByIconQuality(deduped)` with `sortGemsFirst(deduped)` | Live TV themes show premium channels first |
| 3 | `src/pages/HomePage.tsx:163` | Apply gem-first pinning in `loadLiveCollection()` | Homepage live rows show Sky Sports, beIN first |

### Priority 2 (Strategic — improves Sierra Leone market fit)

| # | File | Change | Impact |
|---|------|--------|--------|
| 4 | `src/lib/collections.ts:55-144` | Move `fresh-movies` to index 0 in `HOMEPAGE_COLLECTIONS` | Movies before Live Sports on homepage |
| 5 | `src/lib/collections.ts:148-157` | Reorder pills: Sports, Movies, Africa, Series, News, Kids, Music, Faith | Africa pill more prominent |
| 6 | `src/lib/collections.ts:249-390` | Move Faith theme from position 9 to 6 in `LIVETV_THEMES` | Faith visible without deep scrolling |
| 7 | `src/lib/movie-collections.ts:65-218` | Reorder tabs: New, Hollywood, Netflix, Turkish, Collections, Sports, Bollywood, Kids, South Indian, World | Netflix and Sports more visible |
| 8 | `src/pages/FrenchPage.tsx:27-127` | Reorder regions: Motherland, Sahara, Isles, Europe, USA, South Asia, Crescent, Persian, Pacific, Americas, Always On | UK/USA content more accessible |

### Priority 3 (Polish — improves scroll flow)

| # | File | Change | Impact |
|---|------|--------|--------|
| 9 | `src/pages/HomePage.tsx` | Move VEE widget below Platform Originals | Less loading state at top of page |
| 10 | `src/pages/HomePage.tsx` | Move FeedSection to after collection rows | Core browse content loads first |
| 11 | `src/pages/HomePage.tsx` | Move Hottest Fixtures + Discover Sports to after Live Sports row | Sports grouped together |
| 12 | `src/lib/collections.ts:278-294` | Move France ('11') to position 2 in Entertainment categoryIds, remove Poland ('39') | French content visible faster for Guinea market |
| 13 | `src/lib/series-collections.ts:77` | Move BBC subtab to position 4 (after Disney+) | UK heritage content more visible |

### Priority 4 (Enhancement — nice to have)

| # | File | Change | Impact |
|---|------|--------|--------|
| 14 | `src/lib/collections.ts` | Add smart collection row reordering using `getSmartThemeOrder` logic | Homepage rows adapt to user behavior |
| 15 | `src/lib/collections.ts:363-378` | Deduplicate Premium 4K channels that already appear in Sports | Less repetition when scrolling themes |
| 16 | Multiple | Add "French" as a dedicated Live TV theme (Canal+, TF1, M6, beIN FR) | Guinea market gets dedicated French section |

---

## Estimated Impact

- **Gem-first sorting (Priority 1)**: Every Live TV session immediately shows premium channels. This is the single highest-impact change -- it turns a random-feeling channel list into a curated premium experience.
- **Tab/Theme reordering (Priority 2)**: New users in Sierra Leone see content relevant to them within the first 2 seconds. Reduces bounce, increases trial-to-subscription conversion.
- **Homepage flow (Priority 3)**: Reduces "scroll to content" distance from 15 sections to ~8 before reaching browseable rows. Faster time-to-play.
