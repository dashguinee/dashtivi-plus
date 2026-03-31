# DashTivi+ Sierra Leone / West Africa Cultural Mapping

**Date**: 2026-03-31
**Analyst perspective**: West African media curator (Guinea + Sierra Leone + Senegal focus)
**Total verified channels analyzed**: 5,626
**Africa experience channels**: 137 (2.4% of total inventory)

---

## VERDICT: This app was built for the world. Now it needs to be TUNED for Africa.

The channel library is massive and genuinely impressive. The curation system (experiences, themes, relocate map, gem channels) is sophisticated. But when a young person in Freetown opens DashTivi+ today, the first thing they see is UK & USA content. The Africa experience has 137 channels out of 5,626 -- that is 2.4%. South Asia alone has 954. The app communicates "you are a secondary audience" whether it means to or not.

Below is everything that needs to change to make this feel like it was built in West Africa, for West Africa.

---

## 1. CULTURAL MISPLACEMENTS (channels in the wrong experience)

### A. Canal+ Africa channels MISSING from Africa experience

These channels are literally in the "AFRICA CANAL+" category (cat 336) on Starshare but were NOT tagged with the `africa` experience:

| ID | Channel | Current exps | Should add |
|----|---------|-------------|------------|
| 119882 | \|AF\| Canal+ Cinema | movies, french | **africa** |
| 119883 | \|AF\| Canal+ Premiere Centre HD | french | **africa** |
| 119884 | \|AF\| Canal+ Premiere | french | **africa** |
| 119886 | \|AF\| Canal+ Elles Ouest HD | french | **africa** |
| 144991 | FR (AF) CANAL SPORT 2 | sports, french | **africa** |
| 144992 | FR (AF) CANAL SPORT 3 | sports, french | **africa** |

These channels literally have "AF" (Africa) in their name. Canal+ Premiere is the flagship entertainment channel for Francophone Africa. Excluding it from the Africa experience is like having DSTV 1 Magic missing from Africa -- it is the channel that families in Conakry and Dakar watch every evening.

### B. beIN Sports -- THE football provider for West Africa, treated as generic sports

beIN Sports is how West Africans watch the Champions League, La Liga, Ligue 1, and AFCON. In Guinea and Senegal, beIN is more important than Sky Sports. Yet:

- **67 channels** in SPORTS | BEIN category -- ALL only tagged `['sports']`
- **Zero** beIN channels are in the `africa` or `french` experience
- The beIN French channels (Bein Sports French HD1/HD2) are not in `french` experience

**Critical channels that need `africa` + `french` added:**

| ID | Channel | Current | Should be |
|----|---------|---------|-----------|
| 652347 | Bein Sports French HD1 1080 | sports | sports, french, africa |
| 652348 | Bein Sports French HD2 1080 | sports | sports, french, africa |
| 652363 | Bein Sport French HD1 720 | sports | sports, french |
| 652364 | Bein Sport French HD2 720 | sports | sports, french |
| 138713 | BEIN SPORTS English 1 (4k) | sports | sports, africa |
| 652322 | Bein Sports Global 4K | sports | sports, africa |
| 652333 | Bein Sports HD1 1080 | sports | sports, africa |

### C. SuperSport channels -- Africa's sports backbone, not all tagged correctly

The DSTV SuperSport channels that are in `SPORTS | DSTV SUPER` and `SPORTS | DSTV SUPER (FHD)` categories ARE correctly tagged with `sports, entertainment, africa`. Good.

But the FOOTBALL category SuperSport channels are NOT:

| ID | Channel | Current | Missing |
|----|---------|---------|---------|
| 515 | SUPERSPORTS LALIGA HD | sports | **africa** |
| 517 | SUPERSPORTS PSL HD | sports | **africa** |
| 518 | SUPERSPORTS PREMIER LEAGUE HD | sports | **africa** |
| 770 | SUPERSPORTS PSL (FHD) | sports | **africa** |
| 771 | SUPERSPORTS PREMIER LEAGUE (FHD) | sports | **africa** |
| 776 | SUPERSPORTS FOOTBALL (FHD) | sports | **africa** |

SuperSport Premier League is what every DSTV subscriber in Freetown watches on Saturday afternoons. It MUST appear in the Africa experience.

### D. Trace channels -- cultural identity, inconsistent tagging

| ID | Channel | Current exps | Issue |
|----|---------|-------------|-------|
| 137668 | DSTV: TRACE Urban | music, entertainment, africa | CORRECT |
| 144981 | FR (C+AF) TRACE MBOA | music, africa, french | CORRECT |
| 659163 | FRA: Trace Africa HD | music, africa, french | CORRECT |
| 659164 | FRA: Trace Urban HD | music, french | **Missing: africa, entertainment** |
| 659165 | FRA: Trace Caribbean HD | music, french | Missing: africa |
| 659138 | FRA: Trace Sport Stars HD | sports, music, french | Missing: africa |
| 319394 | Music: Trace Muzika | music | Missing: africa, entertainment |
| 154645 | FR (C+CAR) TRACE_GOSPEL | music, faith, french | Missing: africa |

Trace Urban/Africa/Mboa IS the sound of young West Africa. The France-feed Trace Urban HD (ID 659164) is missing `africa` -- this is a channel specifically made for African audiences.

### E. Al Jazeera -- massive in Muslim West Africa, no Arabic tag on key feeds

Al Jazeera is the most-watched international news channel in Guinea (majority Muslim). Yet:

| ID | Channel | Current | Should be |
|----|---------|---------|-----------|
| 148302 | UKHD: Al Jazeera | news | news, **arabic, africa** |
| 319265 | En: Al Jazeera English | news | news, **africa** |
| 319262 | Ar: Al jazeera SD | news | news, arabic, **africa** |
| 319263 | Al Jazeera Mubasher | news | news, arabic |
| 319638 | Al Jazeera 4K | news | news, arabic, **africa** |
| 415514 | AU: Al Jazeera English | news | news |

Al Jazeera English especially should appear in the Africa experience. It covers African affairs more than CNN or BBC combined.

### F. France 24 -- properly tagged but should be in Africa too

France 24 is the default news channel in Francophone Africa. Currently tagged `news, entertainment, french` (and Arabic for Arabic feed). The English and French feeds need `africa` added:

| ID | Channel | Current | Add |
|----|---------|---------|-----|
| 9482 | UK: FRANCE 24 ENGLISH | news, entertainment, french | **africa** |
| 319285 | France 24 Arabic HD | news, entertainment, french, arabic | **africa** |

### G. Azam Sports -- East African but tagged wrong

| ID | Channel | Current | Should be |
|----|---------|---------|-----------|
| 647773 | AZAM: Azam Sports 1 | sports | sports, **africa** |
| 647775 | AZAM: Azam Sports 2 | sports | sports, **africa** |

Azam TV is Tanzanian, carries African football. Should be in Africa.

### H. Polish Canal+ tagged as "French" -- WRONG

There are **70+ Polish Canal+ channels** tagged with `french` experience. Canal+ Poland is POLISH-language content. This is polluting the French experience with content that is completely irrelevant to a Francophone African user:

Examples:
- `PL | Canal+ | Canal+ 1 FHD` (ID 660191) -- exps: `['french']`
- `PL | Canal+ | Canal+ Seriale FHD` (ID 660196) -- exps: `['french']`
- `PL | Canal+ | Fightklub SD` (ID 660390) -- exps: `['french']`

**All Polish Canal+ channels should be tagged `europe`, NOT `french`.** A user in Freetown tapping "French" expects to see Canal+ Africa, TF1, France 2 -- not Polish fight clubs.

### I. DSTV Movies not in Movies experience

| ID | Channel | Current | Missing |
|----|---------|---------|---------|
| 157971 | DSTV: M-Net (FHD) | entertainment, africa | **movies** |
| 157987 | DSTV: Switchd On Channel 109 (FHD) | entertainment, africa | **movies** |

M-Net is THE premium movie channel on DSTV across Africa. It needs to be in the movies experience.

---

## 2. WHAT IS COMPLETELY MISSING

### A. NBA / Basketball -- ZERO presence in Africa experience

There are 14 NBA-related channels (NBA TV, NBA League Pass, beIN Sport NBA 4K) but:
- None are tagged `africa`
- NBA League Pass (cat 773) is listed in BROWSE_EXPERIENCES under "All Sports" but has no prominence
- There is no "Basketball" sub-tab in the Sports theme

**This is a massive gap.** NBA is arguably the second most popular sport in West Africa after football. Every young man in Freetown and Conakry watches the NBA. Giannis Antetokounmpo, Joel Embiid, Pascal Siakam -- these are African heroes.

**Action needed:**
- Add NBA League Pass (cat 773) to the Sports theme categoryIds (IT IS ALREADY THERE -- good)
- Create a "Basketball" sub-tab in SPORT_TYPES: `{ id: 'basketball', name: 'Basketball', categoryIds: ['773'] }`
- Tag NBA TV (1010), NBA Network (1012), beIN Sport NBA 4K (652332) with `africa` experience

### B. Nollywood -- ZERO dedicated channels

Search for "nollywood" returns exactly 0 real results. There is no Nollywood channel, no Africa Magic, no iROKOtv, no ROK TV.

DSTV carries Africa Magic in reality, but we have ZERO Africa Magic channels in the inventory. This is the single biggest content gap for a West African audience. Nollywood is the dominant entertainment for English-speaking West Africans.

**What exists that partly fills this gap:**
- DSTV: 1 Magic HD (ID 24127) -- this is M-Net's flagship African drama channel
- DSTV: Mzansi Bioskop (IDs 120866, 158017) -- South African movies
- DSTV: Mzansi Wethu (ID 158016) -- South African drama
- DSTV: TNT Africa (ID 120855)
- DSTV: BET (ID 158006)
- FR (C+AF) A+ Afrique (ID 145001) -- Canal+ African entertainment

**What is entirely missing from the source feed:**
- Africa Magic (any variant: Showcase, Urban, Family, Igbo, Yoruba)
- iROKOtv
- ROK TV
- StarTimes Nollywood channel

### C. Afrobeats / Amapiano dedicated music

Only 2 channels serve African music:
- DSTV: TRACE Urban (137668) -- correctly tagged music + entertainment + africa
- DSTV: MTV Base (137669) -- correctly tagged

Trace MBOA (144981) is Cameroonian-focused. That is THREE channels of African music total, compared to 28 Bollywood Singer 24/7 channels and 25 Punjabi Singer channels.

**Missing entirely:**
- Afrobeats 24/7 channel (Burna Boy, Wizkid, Davido, Tiwa Savage)
- Amapiano mix channels
- Coupé-Décalé / Zouglou channels (Ivory Coast)
- Mbalax channels (Senegal)
- Any dedicated West African music stream

### D. Local West African TV -- thin but present

**Guinea (present but limited):**
- FR (C+AF) DJOMA TV (145081) -- yes, this is Guinea's biggest private TV
- FR (C+AF) ESPACE TV (145092) -- Guinea's other major private channel
- FR (C+AF) EVASION TV GUINEE (145111) -- yes
- FR (C+AF) RTG2 (145184) -- state TV Guinea (RTG2 only, no RTG1)

**Missing for Guinea:** RTG1 (the main state channel), Gangan TV, Hadafo TV

**Senegal (present but limited):**
- FR (C+AF) RTS 1 (145190) -- Senegalese state TV
- FR (C+AF) RTS 2 (145191)
- FR (C+AF) SUNU YEUF (145202) -- Senegalese entertainment
- FR (C+AF) LAMP FALL TV (145127) -- Senegalese Islamic channel (Mouride)

**Missing for Senegal:** TFM (Youssou N'Dour's channel -- the most-watched in Senegal), 2STV, SenTV, Walf TV, Dakar Musique (DTV)

**Ivory Coast (minimal):**
- FR (C+AF) A+IVOIRE (145002) -- Canal+ Ivory Coast entertainment
- FR (C+AF) LIFE TV (145097)

**Missing for Ivory Coast:** RTI 1, RTI 2, NCI (Nouvelle Chaine Ivoirienne), La 3

**Sierra Leone:** ZERO channels. No SLBC, no AYV, no Star TV.

### E. Telenovelas -- HUGE gap

Novelas/telenovelas are wildly popular in Francophone West Africa. They are dubbed into French and entire families watch them. Only 4 channels exist:
- DSTV: TLNovelas (19839) -- tagged entertainment, africa
- FRA: Novelas HD (659048) -- tagged french only (missing africa)
- FRA: Novelas Frequency HD (659090) -- tagged french only (missing africa)
- FR (C+CAR) NOVELAS_TV (154610) -- tagged french only

**The French Novelas channels need `africa` added.** West African women are the core audience for Novelas content.

### F. Wrestling (Laamb) -- cultural sport, no representation

Senegalese wrestling (Laamb) is the national sport of Senegal. No channel carries it. We have:
- DSTV: WWE Channel (157970) -- American wrestling, not African
- FR (C+AF) BANTAMBA TV (145019) -- THIS IS ACTUALLY A LAAMB CHANNEL. Tagged africa, french. Good but needs `sports` added.

### G. Christian content for West Africa

The Christian category has 7 channels, all Pakistani/South Asian focused (Gawahi TV, Shine Star, etc.). DSTV carries some Christian channels but they are South African focused.

What exists that is relevant:
- FR (C+AF) ECCLESIA TV (145086) -- Catholic, relevant for West Africa
- FR (C+AF) EMCI (145087) -- Evangelical, relevant
- FR (C+AF) RENOUVEAU TV (145177) -- could be Christian
- FR (C+AF) KTO (145125) -- Catholic TV
- FR (C+CAR) TRACE_GOSPEL (154645) -- Gospel music

None of these are in the `faith` experience. **Canal+ Africa carries faith channels but they are only tagged `africa, french` -- not `faith`.**

---

## 3. EXPERIENCE RE-ORDERING FOR SIERRA LEONE

### Current LIVETV_THEMES order:
1. Sports
2. Entertainment
3. News
4. Kids & Family
5. Movie Channels
6. Faith
7. Music & Vibes
8. Premium 4K
9. Docs & Discovery

### Recommended order for SL:

1. **Sports** -- correct, football is religion. Keep first.
2. **Entertainment** -- OK but description should say "Canal+, DSTV, BBC, HBO" not "UK, USA, Canal+ & French channels"
3. **Music & Vibes** -- MOVE UP. Music is identity for young Africans. Description: "Trace, MTV Base, Afrobeats & more"
4. **Movie Channels** -- Movies are huge, keep prominent
5. **News** -- keep
6. **Faith** -- Islam is majority. Move above Docs.
7. **Kids & Family** -- keep
8. **Docs & Discovery** -- keep
9. **Premium 4K** -- keep last (power users find it)

### Current BROWSE_EXPERIENCES order:
1. UK & USA
2. Movies 24/7
3. Live Events
4. Africa
5. French
6. Arabic & MENA
7. South Asia
8. Pakistan
9. Europe
10. Americas
11. Asia Pacific
12. All Sports

### Recommended order for SL:

1. **Africa** -- MUST be first. The user needs to feel this is THEIR app.
2. **French** -- Francophone content is essential for Guinea users
3. **Sports** (All Sports moved up)
4. **UK & USA** -- English-speaking SL users want this
5. **Arabic & MENA** -- Muslim audience, beIN content
6. **Movies 24/7**
7. **Live Events**
8. **Kids** (not currently a browse experience -- should be)
9. **South Asia**
10. **Europe**
11. **Americas**
12. **Asia Pacific**
13. **Pakistan**

### Should Africa and French be separate or merged?

**Keep them SEPARATE but make them feel connected.**

Reason: A Krio-speaking Sierra Leonean wants DSTV content (Africa). A Soussou-speaking Guinean wants Canal+ content (French). They overlap (Canal+ Africa is in both) but they are distinct audiences.

However, the French experience is currently polluted with 70+ Polish Canal+ channels. Clean that out and French becomes a genuinely strong Francophone African experience.

### Sports theme sub-tabs -- recommended reorder:

Current: All Sports, Football Non-Stop, beIN Zone, Sky Sports, Cricket Ground, NFL, Fans Space, African Football, Speed, Rugby, More

**Recommended for SL:**
1. All Sports
2. **Football Non-Stop** (keep prominent)
3. **African Football** (MOVE UP from #8 to #3)
4. **beIN Zone** (West Africa's premium football provider)
5. **Basketball** (NEW -- add NBA League Pass)
6. Sky Sports
7. **Wrestling** (WWE + BANTAMBA TV)
8. Cricket Ground
9. Speed
10. Rugby
11. NFL
12. More

---

## 4. CHANNELS THAT NEED MULTI-EXPERIENCE TAGGING

### Priority 1: Critical for SL launch

| Channel | ID(s) | Currently in | Must add |
|---------|-------|-------------|----------|
| Bein Sports French HD1 | 652347 | sports | french, africa |
| Bein Sports French HD2 | 652348 | sports | french, africa |
| BEIN SPORTS English 1 4K | 138713 | sports | africa |
| Bein Sports Global 4K | 652322 | sports | africa |
| Bein Sport NBA 4K | 652332 | sports | africa |
| SUPERSPORTS PREMIER LEAGUE HD | 518 | sports | africa |
| SUPERSPORTS LALIGA HD | 515 | sports | africa |
| SUPERSPORTS FOOTBALL (FHD) | 776 | sports | africa |
| SUPERSPORTS PREMIER LEAGUE (FHD) | 771 | sports | africa |
| SUPERSPORTS PSL HD | 517 | sports | africa |
| \|AF\| Canal+ Cinema | 119882 | movies, french | africa |
| \|AF\| Canal+ Premiere | 119884 | french | africa, entertainment |
| \|AF\| Canal+ Premiere Centre HD | 119883 | french | africa, entertainment |
| FR (AF) CANAL SPORT 2 | 144991 | sports, french | africa |
| FR (AF) CANAL SPORT 3 | 144992 | sports, french | africa |
| FRA: Trace Urban HD | 659164 | music, french | africa, entertainment |
| FRA: Trace Sport Stars HD | 659138 | sports, music, french | africa |
| FR (C+CAR) TRACE_GOSPEL | 154645 | music, faith, french | africa |
| France 24 English | 9482 | news, entertainment, french | africa |
| France 24 Arabic HD | 319285 | news, entertainment, french, arabic | africa |
| Al Jazeera English | 319265 | news | africa, arabic |
| Al Jazeera 4K | 319638 | news | africa, arabic |
| UKHD: Al Jazeera | 148302 | news | africa |
| AZAM Sports 1 | 647773 | sports | africa |
| AZAM Sports 2 | 647775 | sports | africa |
| DSTV: M-Net (FHD) | 157971 | entertainment, africa | movies |
| FR (C+AF) BANTAMBA TV | 145019 | africa, french | sports |
| FRA: Novelas HD | 659048 | french | africa |
| FRA: Novelas Frequency HD | 659090 | french | africa |
| DSTV: TLNovelas | 19839 | entertainment, africa | french |
| NBA TV | 1010 | sports | africa |

### Priority 2: Important for depth

| Channel | ID(s) | Currently in | Must add |
|---------|-------|-------------|----------|
| FR (C+AF) SUNNA TV | 145201 | africa, french | faith |
| FR (C+AF) LAMP FALL TV | 145127 | africa, french | faith |
| FR (C+AF) ECCLESIA TV | 145086 | africa, french | faith |
| FR (C+AF) EMCI | 145087 | africa, french | faith |
| FR (C+AF) KTO | 145125 | africa, french | faith |
| TV5 Monde (C+AF) | 145233 | africa, french | news |
| FR (C+AF) AFRICA 24 | 145005 | africa, french | news |
| FR (C+AF) JOLIBA NEWS | 145121 | news, africa, french | (correct) |
| DSTV: Africa News | 2264 | news, entertainment, africa | (correct) |
| DSTV: BET (FHD) | 158006 | entertainment, africa | music |
| Music: Trace Muzika | 319394 | music | africa |

### Priority 3: Remove wrong tags

| Channel | ID(s) | Currently tagged | Remove |
|---------|-------|-----------------|--------|
| PL Canal+ 1 FHD | 660191 | french | **Remove french, add europe** |
| PL Canal+ Seriale FHD | 660196 | french | **Remove french, add europe** |
| PL Canal+ Dokument FHD | 660197 | french | **Remove french, add europe** |
| (All ~70 Polish Canal+ channels) | 660191-660563 | french | **Remove french, add europe** |
| BG: Dstv | 661336 | entertainment, africa | **Remove africa** (this is Bulgarian) |
| Carib (FLOW) AFRICA (D) | 154201 | africa | Fine but low priority |

---

## 5. THE "MADE FOR AFRICA" TEST

### Test 1: First open -- does it feel African?

**Current state: FAIL**

The homepage shows:
1. Time-based hero (generic -- "Good Morning" / "Prime Time")
2. Live Sports row (DStv Super first -- good)
3. Just Dropped (VOD -- generic Hollywood)
4. The Global Village (Canal+, DSTV, BBC, HBO -- decent)
5. 4K Experience
6. Kids & Family
7. Stay Informed (news)

The hero is generic. The first content a user sees is a time-of-day greeting followed by sports. There is nothing that says "Africa" in the first scroll.

**What should happen:**
Row 1 should be **"West Africa Tonight"** or **"Your Channels"** -- featuring RTG, DJOMA TV, ESPACE TV, RTS, Canal+ Premiere, A+ Afrique. The channels that a Guinean or Sierra Leonean actually watches at home.

### Test 2: Tap Sports -- do they see SuperSport and beIN before cricket?

**Current state: PARTIAL PASS**

The Sports theme loads categories in this order: beIN (85), Real 4K (578), Sky Sports UK (353, 483), Football (234), DStv Super (345, 427), EPL (492), Cricket (5)...

beIN is first, which is correct for the audience. DStv Super is at position 6-7. **Cricket (57 channels!) loads before NFL and after DStv Super.** For a West African user, Cricket should be LAST, not in the middle. Nobody in Freetown watches cricket.

Sports sub-tabs have "Cricket Ground" at position 5 and "African Football" at position 8. African Football should be 2nd or 3rd.

### Test 3: Tap Music -- do they see Trace and MTV Base?

**Current state: FAIL**

The Music theme loads categories: UK Music (416), India Music (341), Arabic Music (555), Bollywood Singers (270), Punjabi Singers (287).

**UK Music is first. India Music is second. There are ZERO African music category IDs in the Music theme.**

The DSTV Entertainment category (343) contains Trace Urban and MTV Base, but that category is not in the Music theme -- it is in Entertainment. The Canal+ Africa category (336) contains Trace MBOA, but that is also not in Music.

A user tapping "Music" sees NOW 70s, NOW 80s, MTV Classic (UK), and Bollywood singers. They do NOT see Trace Urban, MTV Base, or Trace MBOA unless they go hunting in Entertainment or Africa.

**Fix:** Add DSTV Entertainment (343) and Canal+ Africa (336) to the Music theme categoryIds, with stream-level filtering for music channels. Or better: create a curated list of African music stream IDs and add them to Music.

### Test 4: Tap Africa -- rich or thin?

**Current state: DECENT but THIN for West Africa**

137 channels in Africa experience. The bulk is:
- Canal+ Africa: ~76 channels (French-language African content)
- DSTV: ~54 channels (English-language African content, mostly South African)
- A few stragglers (RTP Africa, Morocco)

For a Guinean: they see DJOMA TV, ESPACE TV, EVASION TV GUINEE, RTG2, plus Canal+ content. That is 4 familiar channels. Decent but not deep.

For a Sierra Leonean: they see DSTV channels (South African focused) and Canal+ channels (French focused). ZERO Sierra Leonean channels. Nothing in Krio, no SLBC, no AYV. They might relate to BET, MTV Base, and TNT Africa, but the Africa experience feels South African + Francophone, not West African.

**The Africa browse experience is OK structurally but needs:**
1. The SuperSport, beIN French, and other channels listed in Section 4 added
2. To be the FIRST browse experience, not the 4th
3. Better sub-genres within it (the REGION_GENRES "motherland" object is well-designed with sports/entertainment/music/french/news/kids/movies sub-tabs -- this is good work)

### Test 5: Tap French -- can they find Canal+?

**Current state: POLLUTED**

The French browse experience loads categories 11 (France) and 336 (Africa Canal+). That is correct. BUT the experience tag `french` has been applied to ~70 Polish Canal+ channels. If the French experience renders by experience tag rather than by browse categoryIds, a Guinean user will see Polish TV mixed with Canal+ Africa.

**If it renders by categoryIds (11 + 336), it works.** The France category has Canal+ Sport, TF1, M6, France 2/3/5, and the Africa Canal+ category has the full African bouquet. That is a strong Francophone experience.

---

## 6. RECOMMENDED "MADE FOR AFRICA" HOMEPAGE

For a Sierra Leonean user opening the app for the first time, these 7 rows should tell them: "This was built for YOU."

### Row 1: "Live Now -- West Africa"
Canal+ Premiere (119884), A+ Afrique (145001), DJOMA TV (145081), ESPACE TV (145092), RTS 1 (145190), Africa 24 (145005), VOX Africa (145242), DSTV: 1 Magic HD (24127), DSTV: BET (158006)
*Purpose: Instant recognition. These are the channels they grew up watching.*

### Row 2: "Football Tonight"
SuperSport Premier League (157940), beIN Sports English 1 4K (138713), beIN Sports French HD1 (652347), Sky Sports Premier League FHD (23342), SuperSport Football (776), SuperSport LaLiga (515), Canal Sport 2 (144991)
*Purpose: Football is religion. Show them they have EVERYTHING.*

### Row 3: "Fresh Movies" (VOD)
2026 and 2025 releases (cat 749, 597) -- keep current, this is universal
*Purpose: Hollywood movies are universal draw.*

### Row 4: "Canal+ Cinema"
Canal+ Cinema (119882), Canal+ Premiere (119884), beIN Movies 4K, DSTV M-Net (157971), Novelas HD (659048)
*Purpose: Premium movie channels that Francophone Africans recognize.*

### Row 5: "Music & Vibes"
Trace Urban (137668), MTV Base (137669), Trace MBOA (144981), Trace Africa HD (659163), BET (158006), Trace Gospel (154645)
*Purpose: Cultural identity. This is how young Africans see themselves.*

### Row 6: "Stay Informed"
France 24 English (9482), Al Jazeera English (319265), BBC News (1059), DSTV: Africa News (2264), CNN HD (710), Newzroom Afrika (158036), Al Jazeera 4K (319638)
*Purpose: News that matters to them -- France 24 and Al Jazeera before CNN.*

### Row 7: "Kids & Family"
Disney Channel Africa (145079), DSTV: Boomerang (23370), DSTV: PBS Kids (120868), Nickelodeon Africa (145156), DSTV: Moonbug Kids (137522), Cartoon Network
*Purpose: Family appeal. Parents need kids content.*

---

## 7. CODE-LEVEL CHANGES NEEDED

### A. In `collections.ts` -- LIVETV_THEMES Music theme

Add DSTV Entertainment category and Canal+ Africa category for African music channels:

```typescript
// Current Music categoryIds:
['416', '341', '555', '270', '287']

// Should be:
['416', '341', '555', '270', '287', '343', '336']
// 343 = DSTV Entertainment (contains Trace Urban, MTV Base)
// 336 = AFRICA CANAL+ (contains Trace MBOA)
```

Or better, add specific stream IDs to a MUSIC_AFRICAN_IDS constant and filter within the Music theme.

### B. In `collections.ts` -- BROWSE_EXPERIENCES order

Move Africa from position 4 to position 1.

### C. In `collections.ts` -- SPORT_TYPES

Add Basketball sub-tab:
```typescript
{ id: 'basketball', name: 'Basketball', categoryIds: ['773'] },
```

Move "African Football" from position 8 to position 3.

### D. In `collections.ts` -- MUSIC_TYPES

The "Afro Beats" sub-tab exists but has empty categoryIds:
```typescript
{ id: 'afro', name: 'Afro Beats', categoryIds: [] },
```
This needs to be populated with specific stream IDs or categories that contain African music content.

### E. Experience tagging on VPS

The experience mapping on the VPS (`/tmp/verified.json`) needs to be updated to:
1. Add `africa` to all beIN French channels
2. Add `africa` to all Football-category SuperSport channels
3. Add `africa` to Canal+ Africa channels that are missing it
4. Remove `french` from all Polish Canal+ channels
5. Add `faith` to Canal+ Africa religious channels (SUNNA TV, LAMP FALL TV, ECCLESIA TV, EMCI, KTO)
6. Add `africa` to France 24 and Al Jazeera English feeds
7. Add `movies` to DSTV M-Net

### F. HOMEPAGE_COLLECTIONS

The first collection should feature African channels, not just "Live Sports". Consider a dynamic "West Africa Live" row that surfaces Canal+/DSTV African channels based on time of day.

---

## 8. SUMMARY -- THE 10 MOST IMPACTFUL CHANGES

1. **Move Africa to position 1 in BROWSE_EXPERIENCES** -- instant cultural signal
2. **Remove Polish Canal+ from French experience** -- 70 channels of noise polluting French
3. **Add beIN French channels to french + africa experiences** -- football provider for West Africa
4. **Add SuperSport Football-category channels to africa experience** -- 6 channels currently missing
5. **Add Canal+ Africa flagships (Premiere, Cinema, Sport) to africa experience** -- 6 channels missing their own continent
6. **Add Basketball sub-tab in Sports** -- NBA is massive, zero visibility
7. **Add African music channels to Music theme** -- currently zero African music in Music theme
8. **Populate the Afro Beats sub-tab** -- it exists but is empty
9. **Add Africa 24 + France 24 + Al Jazeera to africa experience** -- news channels West Africans trust
10. **Create "West Africa Live" homepage row** -- first thing they see should be THEIR channels

The app has the content. It has the architecture. It just needs to PRIORITIZE the African user in the default ordering and tagging. Right now it is a world-class global IPTV app. With these changes, it becomes a world-class African IPTV app that also has everything else.

---

*Analysis based on 5,626 verified channels across 146 categories, cross-referenced with DashTivi+ codebase (`src/lib/collections.ts`, `src/lib/intelligence.ts`, `src/pages/LiveTVPage.tsx`, `src/pages/HomePage.tsx`)*
