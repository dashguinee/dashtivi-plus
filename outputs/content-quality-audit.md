# DashTivi+ Content Quality Audit

**Generated:** 2026-03-28  
**Data Sources:** LiveTVPage.tsx, collections.ts, movie-collections.ts, series-collections.ts, FrenchPage.tsx, probe-results.json, tmdb-data.json

---

## Executive Summary

DashTivi+ maintains a comprehensive content ecosystem across Live TV, Movies, and Series. The platform is well-structured with clear category hierarchies and diverse regional coverage via WorldEX. However, several gaps and imbalances exist in content availability, poster coverage, and sub-tab organization.

### Key Metrics
- **Total Alive Channels (Live TV):** 4,253
- **Total Movies:** 35,400 (98% with poster art)
- **Total Series:** 8,705
- **Movie Categories Mapped:** 104 unique IDs
- **Series Categories Mapped:** 78 unique IDs
- **WorldEX Regions:** 11 distinct regions
- **Live TV Themes:** 8 with 48 total sub-experiences

---

## PART 1: LIVE TV ANALYSIS

### Overview
The Live TV section is organized into 8 primary themes, each mapping to specific Xtream category IDs. Sub-experiences (child tabs) provide further granularity for certain themes.

### Theme-by-Theme Breakdown

#### 1. **SPORTS** ✅ Strongest Coverage
- **Parent Categories:** 20 unique IDs
- **Category IDs:** 234, 85, 353, 578, 5, 6, 342, 550, 138, 212, 356, 156, 137, 516, 483, 139, 492, 773, 726, 328
- **Sub-Experiences:** 12 (all with mapped categories)
  - All Sports (20 cats)
  - Football Non-Stop (2 cats: 234, 492)
  - beIN Zone (1 cat: 85)
  - Take a Hoop/NBA (1 cat: 773)
  - Cricket Ground (1 cat: 5)
  - NFL (1 cat: 516)
  - Fans Space (1 cat: 234) — Team channels
  - African Football (1 cat: 234)
  - Sky Sports (3 cats: 353, 483, 578)
  - Speed/Racing (1 cat: 342)
  - Rugby (1 cat: 550)
  - More (6 cats: 138, 212, 726, 328, 6)
- **Health:** ✅ Comprehensive and well-organized. Each sub-tab has isolated category mapping, enabling precise filtering.
- **Gaps:** None identified. All sub-tabs have category backing.

#### 2. **ENTERTAINMENT**
- **Parent Categories:** 7 unique IDs
- **Category IDs:** 3, 2, 247, 19, 414, 338, 24
- **Sub-Experiences:** 6 (4 with categories, 2 free-channel dependent)
  - All (7 cats: 3, 2, 247, 19, 414, 338, 24)
  - USA Tonight (1 cat: 2)
  - UK Lounge (2 cats: 3, 414)
  - African Drama (0 cats) — **Free channels only** (experience: entertainment, culture: africa)
  - Reality Rush (0 cats) — **Free channels only** (experience: general)
  - Asian Vibes (3 cats: 247, 338, 19)
- **Health:** ⚠️ Partial. Two sub-tabs (African Drama, Reality Rush) depend entirely on free channels, which may be sparse or unavailable.
- **Gaps:** Free-channel sub-tabs could appear empty if free channels don't match expected experience tags.

#### 3. **NEWS**
- **Parent Categories:** 6 unique IDs
- **Category IDs:** 82, 417, 165, 730, 77, 98
- **Sub-Experiences:** None (no sub-tabs)
- **Health:** ✅ Simple and reliable. No sub-complexity to manage.
- **Gaps:** Missing Hindi News expansion (category 77 suggests Hindi coverage, but only one reference). Could benefit from sub-tabs like "Hindi News," "Arabic News," "UK News" for clarity.

#### 4. **KIDS & FAMILY**
- **Parent Categories:** 2 unique IDs
- **Category IDs:** 32, 410
- **Sub-Experiences:** 5 (all with categories)
  - All (2 cats: 32, 410)
  - Cartoon World (1 cat: 32)
  - Little Ones (1 cat: 32, filtered by name: baby, rhyme, panda)
  - Adventure (1 cat: 32, filtered by name: avatar, paw patrol, spongebob)
  - UK Kids (1 cat: 410)
- **Health:** ✅ Good. The filters (Little Ones, Adventure) are name-based within category 32, relying on channel naming conventions.
- **Gaps:** Category 32 contains 108 channels, but name-based filtering may miss content if naming is inconsistent.

#### 5. **CINEMA 24/7**
- **Parent Categories:** 7 unique IDs
- **Category IDs:** 275, 57, 282, 87, 280, 339, 340
- **Sub-Experiences:** None originally, but defined in code:
  - (Code defines sub-tabs: All, Action Vault, Comedy Corner, Horror Room, Bollywood Palace, Netflix Loop, beIN Cinema)
  - These are present but note: **NOT shown in main CINEMA_TYPES array** — may be orphaned
- **Health:** ⚠️ **Sub-tab definitions exist in LiveTVPage.tsx (CINEMA_TYPES) but are commented as "Filtered: action/thriller channels" without actual filtering logic implemented.**
- **Gaps:** Sub-tab filtering may not work as intended. All tabs fall back to full 7-category list.

#### 6. **MUSIC & VIBES**
- **Parent Categories:** 5 unique IDs
- **Category IDs:** 416, 341, 555, 270, 287
- **Sub-Experiences:** 6 (5 with categories, 1 free-channel dependent)
  - All (5 cats)
  - Afro Beats (0 cats) — **Free channels only** (experience: music, culture: africa)
  - MTV World (1 cat: 416)
  - Bollywood Beats (2 cats: 341, 270)
  - Throwback (1 cat: 416, filtered by name: NOW 70s, 80s, 90s)
  - Arabic Vibes (1 cat: 555)
- **Health:** ⚠️ One free-channel sub-tab (Afro Beats); throwback filtering depends on channel naming.
- **Gaps:** Limited geographic/language diversity. No "Punjabi Music" or "South Indian Music" sub-tabs despite 341 (India Music) and 287 (Punjabi Singers).

#### 7. **DISCOVERY**
- **Parent Categories:** 2 unique IDs
- **Category IDs:** 337, 415
- **Sub-Experiences:** None originally, but defined:
  - (Code defines: All, Wild Planet, Science Lab, History Vault, Crime Files)
  - These are **NOT in the main DISCOVERY_TYPES array** — orphaned
- **Health:** ⚠️ Sub-tab logic exists in code but is not wired. Similar issue to Cinema 24/7.
- **Gaps:** Documentary content is underdeveloped. Only 2 parent categories, and sub-tab filtering is non-functional.

#### 8. **FAITH**
- **Parent Categories:** 2 unique IDs
- **Category IDs:** 123 (Islamic, 156 channels), 561 (Christian, 16 channels)
- **Sub-Experiences:** 3 (all with categories)
  - All (2 cats)
  - Islamic (1 cat: 123)
  - Christian (1 cat: 561)
- **Health:** ✅ Simple, effective. Clear split between Islamic and Christian content.
- **Gaps:** Christian content (16 channels) is much thinner than Islamic (156). Consider expanding category 561 coverage or merging into broader "World Religions" theme.

### Live TV Sub-Tab Summary Table

| Theme | Parent Cats | Total Subs | Subs with Cats | Free-Channel Subs | Status |
|-------|------------|-----------|-----------------|-------------------|--------|
| Sports | 20 | 12 | 12 | 0 | ✅ Complete |
| Entertainment | 7 | 6 | 4 | 2 | ⚠️ Partial |
| News | 6 | 0 | — | — | ✅ Simple |
| Kids | 2 | 5 | 5 | 0 | ✅ Good |
| Cinema 24/7 | 7 | 0 | — | — | ⚠️ Orphaned subs |
| Music | 5 | 6 | 5 | 1 | ⚠️ Partial |
| Discovery | 2 | 0 | — | — | ⚠️ Orphaned subs |
| Faith | 2 | 3 | 3 | 0 | ✅ Simple |

### Live TV Probe Health
- **Total Alive Channels:** 4,253
- **Expected Coverage:** Good across sports, news, and entertainment
- **At-Risk Themes:**
  - **Entertainment (African Drama, Reality Rush):** No live category mapping; if free channels unavailable, sections will be empty
  - **Music (Afro Beats):** Same as above
  - **Cinema 24/7, Discovery:** Filtering not implemented; users see only "All" content

---

## PART 2: MOVIES ANALYSIS

### Overview
10 parent tabs → variable sub-tabs per tab → 104 unique category IDs total

### Parent Tab Breakdown

#### TAB 1: **New & Hot**
- **Subtabs:** 6
- **Unique Categories:** 18
- **Categories:** 749 (New 2026), 597, 766, 599, 768, 602, 772, 609, 770, 606, 783, 604, 789, 608, 792, 610, 784, 601
- **Coverage:** ✅ Excellent. Covers Hollywood, Bollywood, Tamil, Telugu, Turkish new releases.
- **Health:** Category 749 (New 2026) has 214 movies; 597 (2025 Hits) has 2,120.

#### TAB 2: **Hollywood**
- **Subtabs:** 14
- **Unique Categories:** 20
- **Coverage:** ✅ Very comprehensive. 14 sub-tabs cover era, quality, language, and genre.
- **Health:** ⚠️ **Category 96 (Arabic Sub):** Only 3 alive channels despite 684 mapped. **Category 33 (Bollywood Classic):** Only 51 alive despite 2,683 mapped.
- **Gaps:** CAM categories (526, 598, 786) exist but likely low quality.

#### TAB 3: **Bollywood**
- **Subtabs:** 11
- **Unique Categories:** 23
- **Coverage:** ✅ Comprehensive. Star Power sub-tab is unique — filters by actor/celebrity categories.
- **Health:** ⚠️ **Category 33 is a major concern.** Mapped as 2,683 but only 51 alive. This represents a 98% attrition rate.
- **Gaps:** Old Gold (151) is thin. Multi Lang (179, 233) may have overlaps with Bollywood Latest.

#### TAB 4: **Turkish**
- **Subtabs:** 3
- **Unique Categories:** 4
- **Coverage:** ⚠️ Minimal. Only 3 sub-tabs covering Turkish film.
- **Health:** Category 95 (Turkish Classic) has only 28 alive channels despite 853 mapped.
- **Gaps:** **Turkish content is severely underfunded.**

#### TAB 5: **South Indian**
- **Subtabs:** 10
- **Unique Categories:** 14
- **Coverage:** ✅ Excellent language coverage. Each language (Tamil, Telugu, Malayalam, Kannada) has New + Year + All variants.
- **Health:** ✅ Solid.
- **Gaps:** No "South Indian Classics," "South Indian Drama," or "South Indian Comedy" genres beyond language.

#### TAB 6: **Netflix**
- **Subtabs:** 2
- **Unique Categories:** 2
- **Coverage:** ⚠️ Very limited. Only English and Hindi.
- **Health:** Expected, as Netflix Originals are platform-specific.
- **Gaps:** Could add "Netflix Documentaries," "Netflix Stand-Up" if upstream categories exist.

#### TAB 7: **Collections** (Franchise & Character)
- **Subtabs:** 18
- **Unique Categories:** 18 (one per collection)
- **Coverage:** ✅ Comprehensive franchise coverage. Each collection is its own sub-tab.
- **Health:** ✅ Strong.
- **Gaps:** Missing "MCU" (Marvel Cinematic Universe) as a unified filter.

#### TAB 8: **Kids**
- **Subtabs:** 2
- **Unique Categories:** 2
- **Coverage:** ⚠️ Basic. Only All + CAM.
- **Health:** Category 69 likely contains mixed ages (toddler to pre-teen).
- **Gaps:** Could split into "Preschool," "Cartoon," "Adventure," "Educational" sub-tabs using genre filtering (TMDB).

#### TAB 9: **World Cinema**
- **Subtabs:** 10
- **Unique Categories:** 15
- **Coverage:** ✅ Excellent regional coverage. Each language/region has New + All variants where applicable.
- **Health:** ✅ Solid.
- **Gaps:** Missing "Egyptian," "Lebanese," "Moroccan" sub-tabs within Arab world.

#### TAB 10: **Sports & Events**
- **Subtabs:** 6
- **Unique Categories:** 6
- **Coverage:** ⚠️ Niche. Mostly Indian content (Kapil Sharma, Indian Idol) + global events.
- **Health:** Fair.
- **Gaps:** Could add "Esports," "Olympics," "Wimbledon," "Formula 1" if categories exist.

### Movie Content Health

#### Poster Art Coverage
- **Total:** 35,400 movies
- **With Posters:** 34,976 (98%)
- **Without Posters:** 424 (2%)
- **Health:** ✅ Excellent. TMDB integration is nearly complete.

#### Rating Data
- **With Ratings:** 32,316 (91%)
- **Rated 7.5+:** 3,208 (9%)
- **Quality:** Good coverage, but only ~9% of catalog is "highly rated."

#### Critical Issues
1. **Bollywood Classic (Category 33):** 2,683 mapped but only 51 alive (98% loss).
2. **Arabic Subtitled (Category 96):** 684 mapped but only 3 alive (99.6% loss).
3. **Turkish Classic (Category 95):** 853 mapped but only 28 alive (96.7% loss).

---

## PART 3: SERIES ANALYSIS

### Overview
4 parent tabs → variable sub-tabs → 78 unique category IDs total

#### TAB 1: **Platform Originals**
- **Subtabs:** 16
- **Unique Categories:** 22
- **Coverage:** ✅ Excellent. All major OTT platforms covered.
- **Health:** ⚠️ **Disney+ (Category 102):** 810 mapped but only 49 alive (94% loss). This is a critical issue.
- **Gaps:** Missing "Max Original" (generic HBO Max originals).

#### TAB 2: **Turkish**
- **Subtabs:** 1
- **Unique Categories:** 1
- **Coverage:** ⚠️ Minimal. Only one sub-tab ("All Turkish").
- **Health:** ✅ Solid category coverage.
- **Gaps:** No sub-division by era, drama type, or comedy.

#### TAB 3: **Korean**
- **Subtabs:** 4
- **Unique Categories:** 4
- **Coverage:** ✅ Good. Includes multi-language variant + network-specific filters.
- **Health:** ✅ Solid.
- **Gaps:** Could add "K-Drama," "K-Thriller," "K-Comedy" genre sub-tabs.

#### TAB 4: **Browse All**
- **Subtabs:** 20
- **Unique Categories:** 51
- **Coverage:** ✅ Comprehensive. 20 sub-tabs covering genres, regions, and networks.
- **Health:** ✅ Strong.
- **Gaps:** Pakistani and Indian OTT tabs are category-heavy (13 and 11 categories, respectively).

### Series Content Health

- **Total Series:** 8,705
- **Platforms Tab Distribution:**
  - Netflix: 2,532 series (29%)
  - Turkish: 1,130 series (13%)
  - Prime Video: 1,574 series (18%)
  - Disney+: 810 series (9%, but only 49 alive!)

#### Critical Issues
1. **Disney+ (Category 102):** 810 mapped but only 49 alive (94% loss).
2. **Indian OTT tab:** 11 categories in one sub-tab. This is dense and may confuse users.

---

## PART 4: WORLDEX (REGION-BASED) ANALYSIS

### Overview
11 regions, each with 1–16 genre/sub-filter pills.

### Region Breakdown

#### 1. **MOTHERLAND**
- **Main Categories:** 6 (345, 427, 343, 428, 430, 347)
- **Genre Filters:** 1 (All)
- **Health:** ⚠️ Only 6 categories + 1 filter. Very basic.
- **Gaps:** No sub-filtering by sport, language, or content type.

#### 2. **CROSSING THE SAHARA**
- **Main Categories:** 17
- **Genre Filters:** 7 (All, MBC, News, Sports, beIN Movies, Music, Gulf States)
- **Health:** ✅ Good. 17 categories + 7 genre pills provide decent filtering.

#### 3. **FROM PARIS TO ROME**
- **Main Categories:** 17
- **Genre Filters:** 11 (All, France, Germany, Poland, Italy, Netherlands, Balkans, Scandinavia, Czech, Greece, Israel)
- **Health:** ✅ Excellent. 17 categories + 11 geo-filters provide rich segmentation.

#### 4. **THE GULF & PERSIAN**
- **Main Categories:** 2 (751, 28)
- **Genre Filters:** 3 (All, Iran, Afghanistan)
- **Health:** ⚠️ Thin. Only 2 main categories.

#### 5. **WELCOME TO SOUTH ASIA**
- **Main Categories:** 36
- **Genre Filters:** 16 (All, Entertainment, Cricket, Sports, News, Discovery, Music, Movies, Bangla, Tamil, Telugu, Malayalam, Kannada, Punjabi, Marathi, Gujarati)
- **Health:** ✅ Excellent. 36 categories + 16 language/genre filters = richest region.

#### 6. **CRESCENT & STAR**
- **Main Categories:** 5 (4, 98, 42, 64, 272)
- **Genre Filters:** 5 (All, Pakistan, News, Sri Lanka, Nepal)
- **Health:** ⚠️ Moderate. 5 categories + geo-filters.

#### 7. **THE ISLES**
- **Main Categories:** 12
- **Genre Filters:** 9 (All, Sports, Entertainment, News, Movies, Kids, Docs, Music, Asian)
- **Health:** ✅ Strong. 12 categories + 9 content-type filters.

#### 8. **BIG USA**
- **Main Categories:** 2 (2, 24)
- **Genre Filters:** 2 (All, 24/7)
- **Health:** ⚠️ Very minimal. Only 2 categories.

#### 9. **THE PACIFIC**
- **Main Categories:** 2 (90, 54)
- **Genre Filters:** 3 (All, Philippines, Australia)
- **Health:** ⚠️ Very thin. Only 2 categories.

#### 10. **THE AMERICAS**
- **Main Categories:** 3 (31, 741, 66)
- **Genre Filters:** 1 (All)
- **Health:** ⚠️ Minimal. Only 3 categories; no content-type filters.

#### 11. **ALWAYS ON**
- **Main Categories:** 6 (275, 282, 57, 280, 274, 283)
- **Genre Filters:** 4 (All, English 24/7, Bollywood 24/7, Netflix Loop)
- **Health:** ✅ Good. Clear streaming channels that loop indefinitely.

### WorldEX Summary

**Well-Resourced Regions:**
- South Asia (36 cats + 16 filters) — crown jewel
- Europe (17 cats + 11 filters) — excellent breadth
- Sahara (17 cats + 7 filters) — good coverage

**Severely Underfunded Regions:**
- Persian (2 cats) — should expand or merge
- USA (2 cats) — should add genre/network filters
- Pacific (2 cats) — should expand to SE Asia
- Americas (3 cats) — should add filtering

---

## SUMMARY OF CRITICAL ISSUES

### Movies
1. **Bollywood Classic (Cat. 33):** 2,683 mapped → 51 alive (98% loss)
2. **Arabic Subtitled (Cat. 96):** 684 mapped → 3 alive (99.6% loss)
3. **Turkish Classic (Cat. 95):** 853 mapped → 28 alive (96.7% loss)

### Series
1. **Disney+ (Cat. 102):** 810 mapped → 49 alive (94% loss)

### Live TV
1. **Cinema 24/7 & Discovery sub-tabs:** Defined in code but filtering logic not implemented
2. **Entertainment free-channel subs:** African Drama and Reality Rush depend entirely on free channels; may be empty

### WorldEX
1. **Persian, USA, Pacific, Americas:** Severely underfunded (2–3 categories each)
2. **Motherland:** No content-type filtering (only 6 categories with no genre pills)

---

## RECOMMENDATIONS

### Priority 1 (Critical)
1. **Investigate category data loss:**
   - Audit categories 33, 95, 96 (Movies) and 102 (Series) with Xtream/Starshare
   - Determine if categories are deprecated, data sync is broken, or streams are genuinely dead
   - If dead, either remove from collections or refresh source data

2. **Implement Cinema 24/7 & Discovery filtering:**
   - Wire up name-based channel filtering
   - Or remove sub-tabs if filtering cannot be implemented

### Priority 2 (High)
1. **Expand underfunded regions (WorldEX):**
   - Persian: Merge with Crescent or expand category mapping
   - USA: Add genre/network filters (News, Sports, Entertainment, Cable)
   - Pacific: Add SE Asia countries if categories exist
   - Americas: Add country/content-type filtering

2. **Fix free-channel dependent tabs:**
   - Entertainment: Validate "African Drama" and "Reality Rush" free channels
   - Music: Validate "Afro Beats" free channel availability
   - Add fallback messaging if no free channels match expected experience/culture

3. **Increase Turkish content coverage:**
   - Evaluate whether more Turkish movie/series categories exist upstream
   - Consider adding genre-based sub-tabs if categories available

### Priority 3 (Nice-to-Have)
1. **Add genre-based filtering** to Turkish and Korean series tabs using TMDB data
2. **Split Kids tabs** into age groups using genre and name filtering
3. **Segment Indian OTT content** if individual categories exist
4. **Curate a "Top Rated" or "Trending" collection** from high-TMDB-rating movies (7.5+)
5. **Add "K-Drama," "Turkish Drama," "Pakistani Drama"** genre filters

---

## DATA QUALITY SCORECARD

| Section | Score | Status |
|---------|-------|--------|
| Live TV Structure | 8/10 | Good theme organization; orphaned subs reduce score |
| Live TV Coverage | 8/10 | 4,253 alive channels; Sports/News/Kids strong |
| Movies Structure | 7/10 | Comprehensive tabs; Turkish underfunded |
| Movies Coverage | 6/10 | 35,400 movies but 98% attrition on key categories |
| Movies Metadata | 9/10 | 98% have posters; 91% have ratings |
| Series Structure | 7/10 | Platform-based organization good; Turkish/Korean minimal |
| Series Coverage | 6/10 | 8,705 series but 94% attrition on Disney+ |
| WorldEX Structure | 6/10 | South Asia excellent; others thin |
| WorldEX Coverage | 7/10 | Rich in South Asia/Europe; sparse in USA/Pacific |
| Overall | 7/10 | Well-intentioned structure with data integrity issues |

---

## CONCLUSION

DashTivi+ has a sophisticated content structure with themed Live TV, multi-level Movies/Series tabs, and a geographically-aware WorldEX portal. However, the platform suffers from:

1. **Data integrity issues** on key categories (Bollywood, Arabic, Turkish movies; Disney+ series)
2. **Unimplemented filtering logic** for Cinema 24/7 and Discovery in Live TV
3. **Underfunded regions** in WorldEX (USA, Pacific, Americas, Persian)
4. **Inconsistent content depth** (South Asia is rich; Turkish, Korean, kids are sparse)

**Overall Recommendation:** Address Priority 1 (category data loss) immediately, as these represent 98%+ attrition on important content. Then tackle Priority 2 (expand underfunded regions and fix filtering). The platform's foundation is solid; these issues are resolvable with targeted attention.

---

**End of Audit**
