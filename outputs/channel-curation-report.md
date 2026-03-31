# DashTivi+ Channel Curation Report
**Date**: 2026-03-28 | **Source**: Probe results (2026-03-27)

---

## Executive Summary

- **Total alive channels**: 4,253
- **GEMS** (premium, recognizable brands): 967 (22%)
- **SOLID** (good content, regional value): 3286 (77%)
- **NOISE** (detected by pattern): 0
- **Potential duplicates**: 348 across 55 categories
- **Categories with alive channels**: 115

### Quality Distribution

| Quality | Count | % |
|---------|------:|--:|
| 4K | 223 | 5.2% |
| FHD | 286 | 6.7% |
| HD | 1267 | 29.8% |
| SD | 201 | 4.7% |
| Unknown | 2276 | 53.5% |

---

## Key Findings

### Strengths
1. **Sports coverage is world-class**: 500+ sports channels across beIN, Sky Sports, SuperSport, ESPN, DAZN, Star Sports, TNT Sports -- available in 4K/FHD/HD tiers
2. **UK content is deep**: Movies (Sky Cinema full lineup), Entertainment, News, Kids, Documentary, Sports -- complete Sky ecosystem
3. **Indian subcontinent is massive**: 600+ channels across Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi -- every major network represented
4. **beIN Sports is fully stocked**: 9x 4K, 9x FHD, plus Max channels, English, French feeds
5. **French package is solid**: TF1, France 2/3/5, M6, Canal+, beIN Sports FR, BFM, Arte
6. **4K content exists**: 223 true 4K channels (Sky Sports, beIN, MBC, Indian networks)
7. **Kids section is strong**: Disney, Nickelodeon, Cartoon Network, Boomerang, CBeebies across multiple regions
8. **Arabic/MBC package**: Complete MBC lineup in 4K/HD/SD with Shahid Box originals

### Weaknesses
1. **Massive duplication**: 348 potential duplicates -- same channel at different qualities counted separately
2. **No channel icons for most categories**: Only Indian, Cricket, Football, UK Sports, and a few others have icons
3. **European bloat**: Germany (255), Poland (192), Bulgaria (162), EXYU (168) -- large channel counts but niche audience for DASH's West Africa/SL market
4. **24/7 movie channels lack icons**: Netflix/Amazon/English/Kannada/Telugu movie channels have zero branding
5. **Category naming inconsistent**: 'UK| MOVIES' vs 'UK| ENTERTAINMENT' vs 'UK| GENERAL' -- pipes, spaces, inconsistent
6. **Regional categories too granular**: 8 separate Indian categories when users want 'Indian Entertainment'
7. **Separator channels pollute**: '============ Sky Germany ============' shows as a channel

### Hidden Gems (premium content buried in unexpected categories)
1. **HBO in Bulgaria/EXYU/Romania/Poland**: Full HBO lineup alive but buried in regional categories
2. **Sky Cinema in Germany**: 12+ Sky Cinema channels (Premieren, Family, Action, Classics) alive in German feeds
3. **Canal+ in Poland**: Complete Canal+ Sport + Film + Premium lineup, 20+ channels
4. **Discovery/NatGeo everywhere**: Almost every European category has Discovery+NatGeo alive -- could be unified into a Documentary supergroup
5. **Shahid Box**: 17 original Arabic channels with unique content (Al Kabeer Awi, Bab Al Hara, etc.)
6. **REAL 4K category**: True UHD Sky Sports, Sport TV, LaLiga TV streams
7. **Hub Premier**: 6 FHD channels -- unclear content but potentially the provider's own premium package

---

## Recommended Theme Architecture for DashTivi+

Based on DASH's target market (West Africa, Sierra Leone, Guinea, English/French speakers, football fans, entertainment seekers):

### Tier 1: Hero Themes (front page)

#### FOOTBALL & SPORTS
```
Priority order:
1. beIN SPORTS 4K 1-9 (Arabic football)
2. Sky Sports Premier League / Football / Main Event (FHD)
3. SuperSport Premier League / Football / LaLiga (FHD)
4. TNT Sports 1-4 (Champions League)
5. MUTV / Liverpool FC (club channels)
6. ESPN / Fox Sports (US sports)
7. Star Sports (cricket crossover)
Total: ~120 relevant sports channels
```

#### UK & US ENTERTAINMENT
```
Priority order:
1. BBC One / BBC Two (FHD)
2. ITV / Channel 4 / Channel 5
3. Sky Atlantic / Sky Showcase / Sky Witness (FHD)
4. HBO (via USA feeds: HBO Comedy, Family, Signature, Zone)
5. Comedy Central / MTV
6. CNN / BBC News / Sky News (news mix)
Total: ~80 curated channels
```

#### FRENCH ENTERTAINMENT
```
Priority order:
1. TF1 HD / M6 (4K) / France 2 HD / France 3 HD / France 5 HD
2. Canal+ Sport 360 / beIN Sports FR 1-3
3. BFM / Euronews / France 24
4. Arte / RMC / Comedy Central FR
5. Nickelodeon FR / Cartoon Network FR / Disney Channel FR
Total: ~50 curated channels
```

#### MOVIES
```
Priority order:
1. Sky Cinema full lineup (Premiere, Action, Family, Drama, Thriller, SciFi/Horror, Greats, Comedy, Classics, Select)
2. beIN Movies 1-4 (4K + HD)
3. HBO channels (USA feeds)
4. Starz / Showtime (USA feeds)
5. 24/7 movie channels (Netflix, Amazon, English curated)
6. Bollywood (MBC Bollywood, Sony Max, Star Gold, Colors Cineplex)
Total: ~80 curated channels
```

#### KIDS & FAMILY
```
Priority order:
1. Disney Channel / Disney Junior (4K)
2. Nickelodeon / Nick Jr / NickToons
3. Cartoon Network / Boomerang
4. CBeebies (UK)
5. Discovery Kids
6. Sky Cinema Animation
Total: ~30 curated channels
```

### Tier 2: Depth Themes

#### DOCUMENTARY & LEARNING
```
Aggregate from all categories:
1. Discovery Channel (4K via India, HD via UK/France/Germany)
2. National Geographic / Nat Geo Wild (4K via India)
3. Animal Planet (4K via India)
4. History Channel (via India, UK, Germany)
5. TLC (via India, UK, France)
6. Sky Documentaries / Sky Nature (UK)
Total: ~40 curated channels
```

#### ARABIC WORLD
```
1. MBC full lineup (1-5, Action, Max, Drama, 4K tier)
2. beIN Sports Arabic
3. Al Jazeera (4K/HD/Mubasher)
4. Rotana (Music, Cinema, Drama, Classic, Comedy)
5. Shahid Box originals
6. Regional: Dubai, Abu Dhabi, Saudi, Lebanese
Total: ~120 curated channels
```

#### INDIAN SUBCONTINENT
```
1. Star Plus / Colors / Sony / Zee TV (4K tier)
2. Star Movies / Sony Max / Colors Cineplex (movies)
3. Star Sports / Sony Ten (cricket + sports)
4. Discovery / NatGeo India (4K)
5. MTV India / regional music
6. Tamil / Telugu / Malayalam / Kannada / Bengali (regional)
Total: ~200 curated channels
```

#### NEWS HUB
```
1. CNN / BBC News / Sky News
2. Al Jazeera (Arabic + English)
3. France 24 (English + French + Arabic)
4. Fox News / MSNBC / CNBC
5. NDTV / CNN News 18
6. Euronews
Total: ~30 curated channels
```

### Tier 3: Regional (auto-hidden, discoverable)
Germany, Poland, Bulgaria, EXYU, Romania, Sweden, Denmark, Austria, Netherlands, Albania, Iran, Israel

---

## Channels to HIDE (noise/separators)

These are not real channels -- they are section headers or empty placeholders:

| ID | Name | Category | Reason |
|---:|------|----------|--------|
| 659186 | ============ Sky Germany (HEVC) Local Streams ============ | GERMANY | Section separator |
| 659215 | ============ Sky Germany (H.264) Local Streams ============ | GERMANY | Section separator |
| 659254 | ============ MAGNETA Germany Local Streams ============ | GERMANY | Section separator |
| 659425 | ============ Sky Sport & Bundesliga HEVC Local Streams ===== | GERMANY | Section separator |
| 659464 | ============ Sky Sport & Bundesliga H.264 Local Streams ==== | GERMANY | Section separator |

---

## Duplicate Analysis

Duplicates are channels with the same base name at different quality tiers. These are NOT errors -- they serve different device capabilities. However, the UI should group them.

### Categories with Most Duplicates

| Category | Dupes | Example |
|----------|------:|---------|
| SPORTS | BEIN | 42 | 'Bein Xtra HD 5' = 'Bein Xtra 4K 5' |
| Poland | 33 | 'PL | TVP | TVP Info SD' = 'PL | TVP | TVP Info FHD' |
| MBC ARABIC | 28 | 'MBC 3 FHD' = 'MBC 3 HD' |
| SPORTS | ARABIC | 19 | 'AR:  ON Time Sports HD+' = 'AR:  ON Time Sports HD+' |
| TAMIL | ENTERTAINMENT | 17 | 'Tamil: VIJAY TV (FHD) ' = 'Tamil: VIJAY TV (4K).' |
| CRICKET | 15 | 'CRIC || SUPERSPORTS ᴴᴰ' = 'CRIC || SUPERSPORTS ᴴᴰ' |
| INDIA ENTERTAINMENT | 14 | 'IN: SONY HD' = 'IN: SONY (4K).' |
| INDIA ENGLISH MOVIES | 13 | 'IN: SONY PIX HD' = 'IN: SONY PIX (4K).' |
| MALAYALAM | NEWS | 10 | 'MAL | REPORTER NEWS' = 'MAL | REPORTER NEWS ᴴᴰ' |
| INDIA HINDI MOVIES | 9 | 'IN: SONY MAX HD' = 'IN: SONY MAX (4K).' |
| CANADA | 9 | 'CA The Weather Network' = 'CA The Weather network FHD' |
| MALAYALAM | ENTRTNMNT | 8 | 'MY: Asianet HD' = 'MY: ASIANET (4K).' |
| ARABIC NEWS | 8 | 'News | Ar: Al Jazeera 4K ✦' = 'News | Ar: Al Jazeera HD' |
| TELUGU | 7 | 'Telugu: Etv HD' = 'Telugu: ETV (4K).' |
| UK| MOVIES | 7 | 'UK: SKY ARTS FHD' = 'UK : SKY ARTS HD' |
| SPORTS | UK SPORTS | 7 | 'SKY SPORTS PREMIER LEAGUE FHD' = 'SKY SPORTS PREMIER LEAGUE |
| INDIA DOCUMENTARY | 6 | 'IN: ANIMAL PLANET HD' = 'IN: ANIMAL PLANET (4K).' |
| BANGLA | 6 | 'BD: ZEE BANGLA HD' = 'BD: ZEE BANGLA (4K).' |
| KANNADA | 6 | 'Kand: UDAYA TV FHD' = 'Kand: Udaya TV HD' |
| FOOTBALL | 6 | 'SUPERSPORTS PSL (FHD)' = 'SUPERSPORTS PSL HD' |

**Total duplicates detected**: 348

**Recommendation**: In the UI, auto-group channels by base name and let users pick quality (4K > FHD > HD > SD). This immediately de-clutters the grid by ~350 entries.

---

## Full Channel Inventory by Category

Legend: `*` = GEM (premium brand) | Quality in brackets | Icon marker if channel has artwork

### GERMANY (255 channels | 93 gems | 0 4K | 1 FHD | 209 HD)

- `659240` Cartoon Network -HD (Local) ''H.264'' [HD] *
- `659288` Comedy Central -HD Local (Magneta) [HD] *
- `659426` DAZN 1 -HD (Local) ''hevc h.265'' [HD] *
- `659427` DAZN 2 -HD (Local) ''hevc h.265'' [HD] *
- `659208` Discovery -HD (Local) ''hevc h.265'' [HD] *
- `659366` Disney Channel -HD (Local) Magneta [HD] *
- `659346` Eurosport 1 -HD (Local) Magneta [HD] *
- `659237` History -HD (Local) ''H.264'' [HD] *
- `659209` HISTORY Channel -HD (Local) ''hevc h.265'' [HD] *
- `659328` MTV -HD (Local) Magneta [HD] *
- `659306` National Geographic -HD (Local) Magenta [HD] *
- `659307` National Geographic Wild -HD (Local) Magenta [HD] *
- `659223` Sky Atlantic -HD (Local) ''H.264'' [HD] *
- `659196` Sky Atlantic -HD (Local) ''hevc h.265'' [HD] *
- `659218` Sky Cinema Action -HD (Local) ''H.264'' [HD] *
- `659189` Sky Cinema Action -HD (Local) ''hevc h.265'' [HD] *
- `659190` Sky Cinema Best Of -HD (Local) ''hevc h.265'' [HD] *
- `659220` Sky Cinema Classics -HD (Local) ''H.264'' [HD] *
- `659192` Sky Cinema Classics -HD (Local) ''hevc h.265'' [HD] *
- `659217` Sky Cinema Family -HD (Local) ''H.264'' [HD] *
- `659188` Sky Cinema Family -HD (Local) ''hevc h.265'' [HD] *
- `659191` Sky Cinema Highlights -HD (Local) ''hevc h.265'' [HD] *
- `659216` Sky Cinema Premieren -HD (Local) ''H.264'' [HD] *
- `659187` Sky Cinema Premieren -HD (Local) ''hevc h.265'' [HD] *
- `659219` Sky Cinema Special -HD (Local) ''H.264'' [HD] *
- `659224` Sky Crime -HD (Local) ''H.264'' [HD] *
- `659195` Sky Crime -HD (Local) ''hevc h.265'' [HD] *
- `659228` Sky Documentaries -HD (Local) ''H.264'' [HD] *
- `659200` Sky Documentaries -HD (Local) ''hevc h.265'' [HD] *
- `659221` Sky Krimi -HD (Local) ''H.264'' [HD] *
- `659193` Sky Krimi -HD (Local) ''hevc h.265'' [HD] *
- `659227` Sky Nature -HD (Local) ''H.264'' [HD] *
- `659198` Sky Nature -HD (Local) ''hevc h.265'' [HD] *
- `659222` Sky One -HD (Local) ''H.264'' [HD] *
- `659194` Sky One -HD (Local) ''hevc h.265'' [HD] *
- `659226` Sky Replay -HD (Local) ''H.264'' [HD] *
- `659199` Sky Replay -HD (Local) ''hevc h.265'' [HD] *
- `659225` Sky Showcase -HD (Local) ''H.264'' [HD] *
- `659197` Sky Showcase -HD (Local) ''hevc h.265'' [HD] *
- `659433` Sky Sport Austria 1 -HD (Local) ''hevc h.265'' [HD] *
- `659449` Sky Sport Austria 2 -HD (Local) (only during events)''hevc h.265'' [HD] *
- `659450` Sky Sport Austria 3 -HD (Local) (only during events)''hevc h.265'' [HD] *
- `659451` Sky Sport Austria 4 -HD (Local) (only during events)''hevc h.265'' [HD] *
- `659452` Sky Sport Austria 5 -HD (Local) (only during events)''hevc h.265'' [HD] *
- `659453` Sky Sport Austria 6 -HD (Local) (only during events)''hevc h.265'' [HD] *
- `659454` Sky Sport Austria 7 -HD (Local) (only during events)''hevc h.265'' [HD] *
- `659432` Sky Sport Bundesliga -HD (Local) ''hevc h.265'' [HD] *
- `659470` Sky Sport F1 -HD (Local) ''H.264'' [HD] *
- `659434` Sky Sport F1 -HD (Local) ''hevc h.265'' [HD] *
- `659471` Sky Sport Golf -HD (Local) ''H.264'' [HD] *
- `659436` Sky Sport Golf -HD (Local) ''hevc h.265'' [HD] *
- `659429` Sky Sport Mix -HD (Local) ''hevc h.265'' [HD] *
- `659465` SKY Sport NEWS -HD (Local) ''H.264'' [HD] *
- `659428` Sky Sport News-HD (Local) ''hevc h.265'' [HD] *
- `659466` Sky Sport Premier League -HD (Local) ''H.264'' [HD] *
- `659431` Sky Sport Premier League -HD (Local) ''hevc h.265'' [HD] *
- `659469` Sky Sport Tennis -HD (Local) ''H.264'' [HD] *
- `659435` Sky Sport Tennis -HD (Local) ''hevc h.265'' [HD] *
- `659430` Sky Sport Top Event -HD (Local) ''hevc h.265'' [HD] *
- `659309` TLC -HD (Local) Magneta [HD] *
- `659212` Cartoon Network -SD (Local) ''hevc h.265'' [SD] *
- `659278` RTL Haus & Garten -SD (Local) [SD] *
- `659215` ============ Sky Germany (H.264) Local Streams ============ *
- `659186` ============ Sky Germany (HEVC) Local Streams ============ *
- `659464` ============ Sky Sport & Bundesliga H.264 Local Streams ============ *
- `659425` ============ Sky Sport & Bundesliga HEVC Local Streams ============ *
- `659472` Sky Bundesliga 1 (Local) ''H.264'' *
- `659439` Sky Bundesliga 1 (Local) (only during events)''hevc h.265'' *
- `659448` Sky Bundesliga 10 (Local) (only during events)''hevc h.265'' *
- `659473` Sky Bundesliga 2 (Local) (only during events)''H.264'' *
- `659440` Sky Bundesliga 2 (Local) (only during events)''hevc h.265'' *
- `659474` Sky Bundesliga 3 (Local) (only during events)''H.264'' *
- `659475` Sky Bundesliga 4 (Local) (only during events)''H.264'' *
- `659442` Sky Bundesliga 4 (Local) (only during events)''hevc h.265'' *
- `659476` Sky Bundesliga 5 (Local) (only during events)''H.264'' *
- `659477` Sky Bundesliga 6  (Local) (only during events)''H.264'' *
- `659444` Sky Bundesliga 6 (Local) (only during events)''hevc h.265'' *
- `659478` Sky Bundesliga 7 (Local) (only during events)''H.264'' *
- `659445` Sky Bundesliga 7 (Local) (only during events)''hevc h.265'' *
- `659446` Sky Bundesliga 8 (Local) (only during events)''hevc h.265'' *
- `659438` Sky Bundesliga Conferenze (Local) (only during events)''hevc h.265'' *
- `659455` Sky Sport 2 (Local) (only during events)''hevc h.265'' *
- `659456` Sky Sport 3 (Local) (only during events)''hevc h.265'' *
- `659457` Sky Sport 4 (Local) (only during events)''hevc h.265'' *
- `659486` Sky Sport 5 (Local) (only during events)''H.264'' *
- `659458` Sky Sport 5 (Local) (only during events)''hevc h.265'' *
- `659487` Sky Sport 6 (Local) (only during events)''H.264'' *
- `659459` Sky Sport 6 (Local) (only during events)''hevc h.265'' *
- `659460` Sky Sport 7 (Local) (only during events)''hevc h.265'' *
- `659489` Sky Sport 8 (Local) (only during events)''H.264'' *
- `659461` Sky Sport 8 (Local) (only during events)''hevc h.265'' *
- `659490` Sky Sport 9 (Local) (only during events)''H.264'' *
- `659462` Sky Sport 9 (Local) (only during events)''hevc h.265'' *
- `659231` Warner TV Commedy -FHD (Local) ''H.264'' [FHD]
- `659232` 13th Street -HD (Local) ''H.264'' [HD]
- `659204` 13th Street -HD (Local) ''hevc h.265'' [HD]
- `659281` 3sat -HD (Local) Magneta [HD]
- `659377` a.tv -HD (Local) Magneta [HD]
- `659378` allgäu.tv -HD (Local) Magneta [HD]
- `659300` Anixe + -HD (Local) Magneta [HD]
- `659301` Anixe Serie -HD (Local) Magneta [HD]
- `659260` ARD-alpha -HD (Local) Magneta [HD]
- `659343` AutoMotor und Sport -HD (Local) Magneta [HD]
- `659290` AXN Black -HD (Local) Magneta [HD]
- `659289` AXN White -HD (Local) Magneta [HD]
- `659333` Ballermann TV -HD (Local) Magneta [HD]
- `659316` Bergblick -HD (Local) Magneta [HD]
- `659322` Bibel TV -HD (Local) Magneta [HD]
- `659317` BonGusto -HD (Local) Magneta [HD]
- `659397` BR Fernsehen Nord -HD (Local) Magneta [HD]
- `659238` Crime + Investigation -HD (Local) ''H.264'' [HD]
- `659312` Curiosity Channel -HD (Local) Magneta [HD]
- `659320` dabei TV -HD (Local) Magneta [HD]
- `659255` Das Erste -HD (Local) Magneta [HD]
- `659329` Deluxe MUSIC -HD (Local) Magneta [HD]
- `659321` DF1 -HD (Local) Magneta [HD]
- `659239` DMAX -HD (Local) ''H.264'' [HD]
- `659210` DMAX -HD (Local) Magneta [HD]
- `659367` DMAX -HD (Local) Magneta [HD]
- `659335` Folx MUSIC TV -HD (Local) Magneta [HD]
- `659314` HG TV -HD (Local) Magneta [HD]
- `659315` In PLUS -HD (Local) Magneta [HD]
- `659242` Jukebox -HD (Local) ''H.264'' [HD]
- `659323` K-TV -HD (Local) Magneta [HD]
- `659283` Kabel Eins -HD (Local) Magneta [HD]
- `659284` Kabel Eins Classics -HD (Local) Magneta [HD]
- `659310` Kabel Eins Doku -HD (Local) Magneta [HD]
- `659286` KiKA -HD (Local) Magneta [HD]
- `659302` Kinowelt -HD (Local) Magneta [HD]
- `659349` Magneta Sport 1 -HD (Local) Magneta [HD]
- `659358` Magneta Sport 10 -HD (Local) Magneta [HD]
- `659359` Magneta Sport 11 -HD (Local) Magneta [HD]
- `659360` Magneta Sport 12 -HD (Local) Magneta [HD]
- `659361` Magneta Sport 13 -HD (Local) Magneta [HD]
- `659362` Magneta Sport 14 -HD (Local) Magneta [HD]
- `659363` Magneta Sport 15 -HD (Local) Magneta [HD]
- `659364` Magneta Sport 16 -HD (Local) Magneta [HD]
- `659365` Magneta Sport 17 -HD (Local) Magneta [HD]
- `659350` Magneta Sport 2 -HD (Local) Magneta [HD]
- `659351` Magneta Sport 3 -HD (Local) Magneta [HD]
- `659352` Magneta Sport 4 -HD (Local) Magneta [HD]
- `659353` Magneta Sport 5 -HD (Local) Magneta [HD]
- `659354` Magneta Sport 6 -HD (Local) Magneta [HD]
- `659355` Magneta Sport 7 -HD (Local) Magneta [HD]
- `659356` Magneta Sport 8 -HD (Local) Magneta [HD]
- `659357` Magneta Sport 9 -HD (Local) Magneta [HD]
- `659313` Marco Plolo TV -HD (Local) Magneta [HD]
- `659294` MDR -HD (Local) Magneta [HD]
- `659414` MDR-Fernsehen Sachsen-Anhalt -HD (Local) Magneta [HD]
- `659415` MDR-Fernsehen Thüringen -HD (Local) Magneta [HD]
- `659340` MoreThan Sport -HD (Local) Magneta [HD]
- `659339` MS Sport -HD (Local) Magneta [HD]
- `659383` münchen.tv -HD (Local) Magneta [HD]
- `659249` n-TV -HD (Local) Magneta [HD]
- `659298` N24 Doku -HD (Local) Magneta [HD]
- `659410` NDR Fernsehen Hamburg -HD (Local) Magneta [HD]
- `659412` NDR Fernsehen Mecklenburg-Vorpommern -HD (Local) Magneta [HD]
- `659411` NDR Fernsehen Schleswig-Holstein -HD (Local) Magneta [HD]
- `659379` NIEDERBAYERN TV -HD (Local) Magneta [HD]
- `659382` NIEDERBAYERN TV Landshut -HD (Local) Magneta [HD]
- `659386` NIEDERBAYERN TV Passau -HD (Local) Magneta [HD]
- `659390` NRWision -HD (Local) Magneta [HD]
- `659384` Oberpfalz TV -HD (Local) Magneta [HD]
- `659393` OK Weinstraße -HD (Local) Magneta [HD]
- `659394` OK-TV Ludwigshafen -HD (Local) Magneta [HD]
- `659391` OK4 -HD (Local) Magneta [HD]
- `659392` OK54 Trier -HD (Local) Magneta [HD]
- `659395` OK:TV Mainz -HD (Local) Magneta [HD]
- `659369` OUTtv -HD (Local) Magneta [HD]
- `659299` Phoenix -HD (Local) Magneta [HD]
- `659267` ProSieben -HD (Local) Magneta [HD]
- `659268` ProSieben MAXX -HD (Local) Magneta [HD]
- `659292` Radio BremenTV -HD (Local) Magneta [HD]
- `659295` RBB -HD (Local) Magneta [HD]
- `659398` rbb fernsehen Brandenburg -HD (Local) Magneta [HD]
- `659342` RedBull TV -HD (Local) Magneta [HD]
- `659385` RFO -HD (Local) Magneta [HD]
- `659326` Ric -HD (Local) Magneta [HD]
- `659235` Romance TV -HD (Local) ''H.264'' [HD]
- `659207` Romance TV -HD (Local) ''hevc h.265'' [HD]
- `659270` RTL -HD (Local) Magneta [HD]
- `659399` RTL Bayern -HD (Local) Magneta [HD]
- `659400` RTL Bremen & Niedersachsen -HD (Local) Magneta [HD]
- `659275` RTL Crime -HD (Local) Magneta [HD]
- `659402` RTL Hamburg & Schleswig-Holstein -HD (Local) Magneta [HD]
- `659401` RTL Hessen -HD (Local) Magneta [HD]
- `659273` RTL Living -HD (Local) Magneta [HD]
- `659250` RTL Nitro -HD (Local) Magneta [HD]
- `659403` RTL Nordrhein-Westfalen -HD (Local) Magneta [HD]
- `659274` RTL Passion -HD (Local) Magneta [HD]
- `659404` RTL Rhein-Neckar -HD (Local) Magneta [HD]
- `659271` RTLZWEI -HD (Local) Magneta [HD]
- `659396` salve.tv -HD (Local) Magneta [HD]
- `659265` SAT.1 -HD (Local) Magneta [HD]
- `659405` SAT.1 Bayern -HD (Local) Magneta [HD]
- `659266` Sat.1 Emotions -HD (Local) Magneta [HD]
- `659409` SAT.1 Nordrhein-Westfalen -HD (Local) Magneta [HD]
- `659282` sixx -HD (Local) Magneta [HD]
- `659376` sonnenklar.TV -HD (Local) Magneta [HD]
- `659319` Spiegel Geschichte -HD (Local) Magneta [HD]
- `659347` Sport 1 -HD (Local) Magneta [HD]
- `659341` Sportdigital Fussball -HD (Local) Magneta [HD]
- `659296` SR FERNSEHEN -HD (Local) Magneta [HD]
- `659338` Stingray i Concerts -HD (Local) Magneta [HD]
- `659285` Super RTL -HD (Local) Magneta [HD]
- `659233` SYFY -HD (Local) ''H.264'' [HD]
- `659205` SYFY -HD (Local) ''hevc h.265'' [HD]
- `659293` Tagesschau 24 -HD (Local) Magneta [HD]
- `659303` Tele 5 -HD (Local) Magneta [HD]
- `659287` TOGGO plus -HD (Local) Magneta [HD]
- `659305` Top Serien -HD (Local) Magneta [HD]
- `659318` TRAVELxp -HD (Local) Magneta [HD]
- `659388` TV Mainfranken -HD (Local) Magneta [HD]
- `659387` TV Oberfranken -HD (Local) Magneta [HD]
- `659381` tv.ingolstadt -HD (Local) Magneta [HD]
- `659389` TVA Ostbayern -HD (Local) Magneta [HD]
- `659234` Universal TV -HD (Local) ''H.264'' [HD]
- `659206` Universal TV -HD (Local) ''hevc h.265'' [HD]
- `659280` VOX -HD (Local) Magneta [HD]
- `659269` VOX Up -HD (Local) Magneta [HD]
- `659203` Warner TV Comedy -HD (Local) ''hevc h.265'' [HD]
- `659229` Warner TV Film -HD (Local) ''H.264'' [HD]
- `659201` Warner TV Film -HD (Local) ''hevc h.265'' [HD]
- `659202` Warner TV Serie -HD (Local) ''hevc h.265'' [HD]
- `659230` Warner TV Series -HD (Local) ''H.264'' [HD]
- `659413` WDR Fernsehen Aachen -HD (Local) Magneta [HD]
- `659416` WDR Fernsehen Bielefeld -HD (Local) Magneta [HD]
- `659417` WDR Fernsehen Bonn -HD (Local) Magneta [HD]
- `659418` WDR Fernsehen Dortmund -HD (Local) Magneta [HD]
- `659419` WDR Fernsehen Duisburg -HD (Local) Magneta [HD]
- `659420` WDR Fernsehen Düsseldorf -HD (Local) Magneta [HD]
- `659421` WDR Fernsehen Essen -HD (Local) Magneta [HD]
- `659422` WDR Fernsehen Münster -HD (Local) Magneta [HD]
- `659423` WDR Fernsehen Siegen -HD (Local) Magneta [HD]
- `659424` WDR Fernsehen Wuppertal -HD (Local) Magneta [HD]
- `659291` Wedo Movies -HD (Local) Magneta [HD]
- `659252` Welt -HD (Local) Magneta [HD]
- `659324` Welt der Wunder -HD (Local) Magneta [HD]
- `659256` ZDF -HD (Local) Magneta [HD]
- `659257` ZDF Info -HD (Local) Magneta [HD]
- `659258` ZDFinfo -HD (Local) Magneta [HD]
- `659259` ZDFneo -HD (Local) Magneta [HD]
- `659344` Zwei Music TV -HD (Local) Magneta [HD]
- `659213` Cartoonito -SD (Local) ''hevc h.265'' [SD]
- `659211` Crime + Investigation -SD (Local) ''hevc h.265'' [SD]
- `659304` Heimatkanal -SD (Local) ''hevc h.265'' [SD]
- `659214` Jukebox -SD (Local) ''hevc h.265'' [SD]
- `659437` Motorvision TV -SD (Local) ''hevc h.265'' [SD]
- `659277` RTL Comedy -SD (Local) [SD]
- `659276` RTL Shine -SD (Local) [SD]
- `659254` ============ MAGNETA Germany Local Streams ============
- `659325` KIKA (Local) ''hevc h.265''
- `659245` RTL (Local) ''hevc h.265''
- `659253` TOGGO-plus (Local) ''hevc h.265'
- `659248` VOX (Local) ''hevc h.265''

### CANADA (218 channels | 16 gems | 0 4K | 1 FHD | 13 HD)

- `616098` CA Bein Sports HD [HD] *
- `616240` CA Fox News HD [HD] *
- `615960` CA CNN Canada *
- `616272` CA Disney Junior *
- `616040` CA Disney La Chain *
- `616107` CA Fox Sports Racing *
- `616045` CA GOLF *
- `616046` CA HBO 1 *
- `616149` CA HPITV WEST *
- `616052` CA La Chaine Disney (FR) *
- `616195` CA La Chaine Disney (FR)) *
- `615994` CA MTV *
- `616292` CA National Geographic *
- `616102` CA NFL Network *
- `616276` CA Nickelodeon *
- `616067` CA TLC *
- `616066` CA The Weather network FHD [FHD]
- `616173` CA (FR) ICI Tele Manitoba HD [HD]
- `616174` CA (FR) ICI Tele Mauricie HD [HD]
- `616175` CA (FR) ICI Tele Montreal HD [HD]
- `616176` CA (FR) ICI Tele Ontario HD [HD]
- `616177` CA (FR) ICI Tele Ottawa-Gatineau HD [HD]
- `616178` CA (FR) ICI Tele Quebec HD [HD]
- `616179` CA (FR) ICI Tele Saguenay HD [HD]
- `616180` CA (FR) ICI Tele Saskatchewan HD [HD]
- `616181` CA (FR) L'Assemblee nationale du Quebec HD [HD]
- `616245` CA Global Maritimes HD [HD]
- `616368` CA One Soccer HD [HD]
- `616157` CA  (FR) YOOPA
- `616182` CA (FR) MAX
- `616183` CA (FR) NOOVO V-Tele
- `616184` CA (FR) Prise 2
- `616186` CA (FR) TELE QUEBEC
- `616188` CA (FR) Trace Urban
- `616190` CA (FR) TVA SPORTS
- `616253` CA A&E
- `615959` CA ABC
- `615958` CA ABC Spark
- `616030` CA Aboriginal Peoples Television Network
- `615966` CA AMI TV
- `616214` CA APTN
- `616031` CA Assemblee Nationale du Quebec
- `615967` CA BBC Earth
- `616032` CA Bloomberg TV+
- `615969` CA CablePulse 24
- `616033` CA Canal D
- `616315` CA CBC Calgary
- `616317` CA CBC Fredericton
- `616318` CA CBC Halifax
- `616319` CA CBC Montreal
- `615974` CA CBC New Brunswick
- `615973` CA CBC News Network
- `616320` CA CBC Ottawa
- `616321` CA CBC Regina
- `616322` CA CBC St. John's
- `616323` CA CBC Toronto
- `616036` CA CGTN
- `616037` CA CHCH
- `616192` CA CinePOP (FR)
- `615976` CA City Montreal
- `616034` CA City TV Edmonton
- `616328` CA City tv Toronto
- `616329` CA City TV Vancouver
- `616038` CA CMT
- `616254` CA Cottage Life
- `616227` CA CPAC FR
- `616236` CA CTV 2 London
- `616331` CA CTV 2 Ottawa
- `616333` CA CTV 2 Vancouver
- `616231` CA CTV Calgary
- `616334` CA CTV Calgary
- `615982` CA CTV Comedy West
- `616336` CA CTV Kitchener
- `616337` CA CTV Moncton
- `616233` CA CTV News
- `616229` CA CTV Ottawa
- `616340` CA CTV Ottawa
- `615948` CA CTV Saskatoon Saskatchewan
- `616341` CA CTV Sault Ste. Marie
- `615977` CA CTV SCI-FI Channel
- `616234` CA CTV TORONTO
- `616235` CA CTV2 Barrie
- `616237` CA CTV2 OTTAWA
- `616332` CA CTV2 Toronto
- `616238` CA CTV2 Victoria
- `616239` CA CTV2 Windsor
- `616039` CA Daystar Tv
- `616255` CA DIY Network ( Magnolia )
- `616041` CA Documentary
- `616257` CA E! Entertainment
- `616029` CA Fairchild 2
- `616024` CA Fairchild Television
- `616026` CA Fairchild Television Mandarin
- `616025` CA Fairchild Television West
- `616042` CA Faith Tv
- `616274` CA FAMILY CHRGD
- `616275` CA FAMILY JR
- `616043` CA Fight Network
- `616258` CA Food Network
- `615987` CA FXX
- `615988` CA Game Show Network
- `616259` CA Game TV
- `616044` CA Game+
- `616242` CA Global Durham
- `616243` CA Global HALIFAX
- `616244` CA Global Kingston
- `616246` CA Global Montereal
- `615989` CA Global National
- `615952` CA Global News BC
- `616241` CA Global News Calgary
- `616247` CA Global News Edmonton
- `616361` CA Global News Winnipeg
- `615951` CA Global Okanagan News
- `616349` CA Global Peterborough
- `616351` CA Global Toronto
- `616047` CA Historia (FR)
- `616193` CA Historia (FR)
- `616048` CA HLN
- `616261` CA HLN
- `616308` CA Hollywood Suite 90's
- `616352` CA ICI AR TV
- `615993` CA ICI Montreal (FR)
- `616194` CA ICI Montreal (FR)
- `615991` CA ICI Tele
- `615990` CA ICI TV Montreal
- `616049` CA ID
- `616050` CA IIPC TV
- `616051` CA JOYTV 10 BRITISH COLUMBIA (B)
- `616196` CA LCN (FR)
- `616250` CA LCN (FR)
- `616262` CA Lifetime
- `616263` CA Makeful
- `616197` CA Meteo Media (FR)
- `616100` CA MLB Network
- `616198` CA MOI et CIE (FR)
- `616309` CA MovieTime
- `616101` CA NBA TV
- `616057` CA Newfoundland
- `616058` CA NOOVO V-Tele (FR)
- `616199` CA NOOVO V-Tele (FR)
- `616000` CA OMNI 2
- `616027` CA Prime Asia TV
- `616060` CA PRISE
- `616061` CA Quo Vadis TV
- `616062` CA QVTV
- `616200` CA RDS (FR)
- `616185` CA Savoir Media
- `616310` CA Silver Screen Classics
- `616063` CA Smithonian Channel
- `616108` CA Sportsman
- `616088` CA SPORTSNET 360
- `616089` CA SPORTSNET EAST
- `616093` CA Sportsnet Pacific
- `616064` CA Super Channel Fuse
- `616311` CA Super Channel Heart & Home
- `616312` CA Super Channel Vault
- `616109` CA SUPER SPORTS CH 431
- `616110` CA SUPER SPORTS CH 432
- `616111` CA SUPER SPORTS CH 433
- `616112` CA SUPER SPORTS CH 434
- `616113` CA SUPER SPORTS CH 435
- `616118` CA SUPER SPORTS CH 440
- `616119` CA SUPER SPORTS CH 441
- `616123` CA SUPER SPORTS CH 445
- `616124` CA SUPER SPORTS CH 446
- `616126` CA SUPER SPORTS CH 448
- `616127` CA SUPER SPORTS CH 450
- `616129` CA SUPER SPORTS CH 453
- `616131` CA SUPER SPORTS CH 455
- `616132` CA SUPER SPORTS CH 456
- `616133` CA SUPER SPORTS CH 457
- `616134` CA SUPER SPORTS CH 458
- `616135` CA SUPER SPORTS CH 459
- `616136` CA SUPER SPORTS CH 460
- `616137` CA SUPER SPORTS CH 461
- `616138` CA SUPER SPORTS CH 462
- `616139` CA SUPER SPORTS CH 463
- `616140` CA SUPER SPORTS CH 464
- `616141` CA SUPER SPORTS CH 465
- `616142` CA SUPER SPORTS CH 466
- `616069` CA T+E Travel Escape
- `616065` CA TAG TV (Asian)
- `616028` CA Tamil Vision TV
- `616201` CA Teletoon (FR)
- `616277` CA Teletoon West
- `616077` CA The Weather Network
- `615963` CA TLN
- `616068` CA Toronto 360
- `616070` CA TSC
- `616080` CA TSN 1
- `616081` CA TSN 2
- `616082` CA TSN 3
- `616084` CA TSN 5
- `616313` CA Turner Classic Movies TCM
- `616071` CA TV 16 Toronto (Asian)
- `616072` CA TV Ontario
- `616005` CA TV Rogers (Ottawa)
- `616202` CA TV5 (FR)
- `616074` CA TVA Montreal (CFTM)
- `616105` CA TVA Sports
- `616106` CA TVA Sports 2
- `616189` CA TVA West (FR)
- `616056` CA TÉMOIN ( MOI et CIE )
- `616314` CA Unis
- `616023` CA Univision
- `616252` CA W Network West
- `616103` CA WWE Network
- `616280` CA YTV
- `616281` CA YTV West
- `616079` CA-ES TLN+
- `616205` CA-FR CASA
- `616207` CA-FR RDS 2
- `616210` CA-FR SERIES+
- `616154` CA-FR Super Ecran 2
- `616212` CA-FR TVA MONTREAL
- `616213` CA-FR Zeste
- `615950` CTV Regina
- `615949` CTV Saskatoon

### Poland (192 channels | 38 gems | 0 4K | 47 FHD | 97 HD)

- `660191` PL | Canal+ | Canal+ 1 FHD [FHD] *
- `660205` PL | Canal+ | Canal+ EXTRA 1 FHD [FHD] *
- `660206` PL | Canal+ | Canal+ EXTRA 2 FHD [FHD] *
- `660207` PL | Canal+ | Canal+ EXTRA 3 FHD [FHD] *
- `660208` PL | Canal+ | Canal+ EXTRA 4 FHD [FHD] *
- `660209` PL | Canal+ | Canal+ EXTRA 5 FHD [FHD] *
- `660210` PL | Canal+ | Canal+ EXTRA 6 FHD [FHD] *
- `660195` PL | Canal+ | Canal+ FILM FHD [FHD] *
- `660194` PL | Canal+ | Canal+ PREMIUM FHD [FHD] *
- `660196` PL | Canal+ | Canal+ Seriale FHD [FHD] *
- `660200` PL | Canal+ | Canal+ SPORT 1 FHD [FHD] *
- `660563` PL | PlayerPL | Canal+ Dokument FHD [FHD] *
- `660565` PL | PlayerPL | Canal+ Sport 2 FHD [FHD] *
- `660566` PL | PlayerPL | Canal+ Sport 3 FHD [FHD] *
- `660567` PL | PlayerPL | Canal+ Sport 4 FHD [FHD] *
- `660564` PL | PlayerPL | Canal+ Sport FHD [FHD] *
- `660551` PL | PlayerPL | Cartoon Network HD [HD] *
- `660488` PL | PolsatBoxGo | Animal Planet HD [HD] *
- `660466` PL | PolsatBoxGo | BBC CBEEBIES HD [HD] *
- `660464` PL | PolsatBoxGo | Cartoon Network HD [HD] *
- `660443` PL | PolsatBoxGo | Comedy Central Polska HD [HD] *
- `660480` PL | PolsatBoxGo | Discovery Channel HD [HD] *
- `660483` PL | PolsatBoxGo | Discovery Life HD [HD] *
- `660481` PL | PolsatBoxGo | Discovery Science HD [HD] *
- `660452` PL | PolsatBoxGo | HBO 3 HD [HD] *
- `660486` PL | PolsatBoxGo | History HD [HD] *
- `660487` PL | PolsatBoxGo | History2 HD [HD] *
- `660503` PL | PolsatBoxGo | MTV POLSKA HD [HD] *
- `660493` PL | PolsatBoxGo | Nat Geo People HD [HD] *
- `660491` PL | PolsatBoxGo | National Geographic Wild HD [HD] *
- `660462` PL | PolsatBoxGo | NickToons HD [HD] *
- `660442` PL | PolsatBoxGo | Polsat Comedy Central Extra HD [HD] *
- `660463` PL | PolsatBoxGo | Teen Nick HD [HD] *
- `660498` PL | PolsatBoxGo | TLC HD HD [HD] *
- `660477` PL | PolsatBoxGo | Viasat History HD [HD] *
- `660366` PL | Canal+ | ALE KINO+ SD [SD] *
- `660392` PL | Canal+ | wPolsce24 SD [SD] *
- `660461` PL | PolsatBoxGo | NICK JR SD [SD] *
- `660151` PL | TVP | Belsat FHD [FHD]
- `660119` PL | TVP | TVP 2 FHD [FHD]
- `660173` PL | TVP | TVP 3 Bialystok FHD [FHD]
- `660169` PL | TVP | TVP 3 Bydgoszcz FHD [FHD]
- `660159` PL | TVP | TVP 3 Gdansk FHD [FHD]
- `660171` PL | TVP | TVP 3 Gorzow WLKP FHD [FHD]
- `660165` PL | TVP | TVP 3 Katowice FHD [FHD]
- `660175` PL | TVP | TVP 3 Kielce FHD [FHD]
- `660157` PL | TVP | TVP 3 Krakow FHD [FHD]
- `660177` PL | TVP | TVP 3 Lodz FHD [FHD]
- `660163` PL | TVP | TVP 3 Lublin FHD [FHD]
- `660179` PL | TVP | TVP 3 Olsztyn FHD [FHD]
- `660161` PL | TVP | TVP 3 Poznan FHD [FHD]
- `660183` PL | TVP | TVP 3 Rzeszow FHD [FHD]
- `660185` PL | TVP | TVP 3 Szczecin FHD [FHD]
- `660155` PL | TVP | TVP 3 Warszawa FHD [FHD]
- `660181` PL | TVP | TVP 3 Wroclaw FHD [FHD]
- `660137` PL | TVP | TVP ABC 2 FHD [FHD]
- `660135` PL | TVP | TVP ABC FHD [FHD]
- `660145` PL | TVP | TVP Alfa FHD [FHD]
- `660123` PL | TVP | TVP Dokument FHD [FHD]
- `660131` PL | TVP | TVP Historia 2 FHD [FHD]
- `660115` PL | TVP | TVP Info FHD [FHD]
- `660133` PL | TVP | TVP Kobieta FHD [FHD]
- `660127` PL | TVP | TVP Kultura 2 FHD [FHD]
- `660125` PL | TVP | TVP Kultura FHD [FHD]
- `660143` PL | TVP | TVP Nauka FHD [FHD]
- `660121` PL | TVP | TVP Polonia FHD [FHD]
- `660141` PL | TVP | TVP Rozrywka FHD [FHD]
- `660149` PL | TVP | TVP Wilno FHD [FHD]
- `660147` PL | TVP | TVP World FHD [FHD]
- `660538` PL | PlayerPL | TVN 7 HD [HD]
- `660539` PL | PlayerPL | TVN24 HD [HD]
- `660553` PL | PlayerPL | Warner TV HD [HD]
- `660528` PL | PolsatBoxGo | 1+1 HD [HD]
- `660440` PL | PolsatBoxGo | 13 Ulica HD [HD]
- `660523` PL | PolsatBoxGo | 360 Tune Box  HD [HD]
- `660471` PL | PolsatBoxGo | 4fun Kids HD [HD]
- `660439` PL | PolsatBoxGo | AMC HD [HD]
- `660434` PL | PolsatBoxGo | AXN HD HD [HD]
- `660437` PL | PolsatBoxGo | AXN Spin HD [HD]
- `660504` PL | PolsatBoxGo | BBC BRIT HD [HD]
- `660490` PL | PolsatBoxGo | BBC EARTH HD [HD]
- `660438` PL | PolsatBoxGo | BBC First HD [HD]
- `660500` PL | PolsatBoxGo | BBC Lifestyle HD [HD]
- `660465` PL | PolsatBoxGo | Cartoonito HD [HD]
- `660476` PL | PolsatBoxGo | CI Polsat HD [HD]
- `660429` PL | PolsatBoxGo | Cinemax 2 HD [HD]
- `660428` PL | PolsatBoxGo | Cinemax HD [HD]
- `660535` PL | PolsatBoxGo | Dacha HD HD [HD]
- `660508` PL | PolsatBoxGo | DISCO POLO MUSIC HD [HD]
- `660495` PL | PolsatBoxGo | DocuBox HD [HD]
- `660482` PL | PolsatBoxGo | DTX HD [HD]
- `660501` PL | PolsatBoxGo | E! HD [HD]
- `660417` PL | PolsatBoxGo | Eleven Sports 1 HD [HD]
- `660418` PL | PolsatBoxGo | Eleven Sports 2 HD [HD]
- `660419` PL | PolsatBoxGo | Eleven Sports 3 HD [HD]
- `660420` PL | PolsatBoxGo | Eleven Sports 4 HD [HD]
- `660446` PL | PolsatBoxGo | Epic Drama HD [HD]
- `660511` PL | PolsatBoxGo | ESKA ROCK TV HD [HD]
- `660510` PL | PolsatBoxGo | ESKA TV EXTRA HD [HD]
- `660505` PL | PolsatBoxGo | Eska TV HD [HD]
- `660524` PL | PolsatBoxGo | FashionBox  HD [HD]
- `660426` PL | PolsatBoxGo | Fast&Fun HD [HD]
- `660424` PL | PolsatBoxGo | FightBox HD [HD]
- `660533` PL | PolsatBoxGo | Film UA Drama HD [HD]
- `660456` PL | PolsatBoxGo | FilmBox Extra HD [HD]
- `660454` PL | PolsatBoxGo | Filmbox Family HD [HD]
- `660453` PL | PolsatBoxGo | FilmBox Premium HD [HD]
- `660499` PL | PolsatBoxGo | Food Network HD [HD]
- `660445` PL | PolsatBoxGo | FX Comedy HD [HD]
- `660444` PL | PolsatBoxGo | FX HD [HD]
- `660427` PL | PolsatBoxGo | GameToon HD [HD]
- `660484` PL | PolsatBoxGo | ID HD [HD]
- `660431` PL | PolsatBoxGo | Kino Polska HD [HD]
- `660515` PL | PolsatBoxGo | Kino Polska Muzyka HD [HD]
- `660432` PL | PolsatBoxGo | Kino TV HD [HD]
- `660534` PL | PolsatBoxGo | Kvartal TV HD [HD]
- `660529` PL | PolsatBoxGo | Kyc Kyc HD [HD]
- `660421` PL | PolsatBoxGo | Motowizja HD [HD]
- `660507` PL | PolsatBoxGo | POLO TV HD [HD]
- `660404` PL | PolsatBoxGo | POLSAT 2 HD [HD]
- `660497` PL | PolsatBoxGo | Polsat Cafe HD [HD]
- `660475` PL | PolsatBoxGo | Polsat Doku HD [HD]
- `660423` PL | PolsatBoxGo | Polsat Games HD [HD]
- `660397` PL | PolsatBoxGo | Polsat HD [HD]
- `660506` PL | PolsatBoxGo | Polsat Music HD [HD]
- `660403` PL | PolsatBoxGo | Polsat News 2 HD [HD]
- `660400` PL | PolsatBoxGo | Polsat News HD [HD]
- `660401` PL | PolsatBoxGo | Polsat News Polityka HD [HD]
- `660502` PL | PolsatBoxGo | Polsat Play HD [HD]
- `660408` PL | PolsatBoxGo | Polsat Sport Fight HD [HD]
- `660458` PL | PolsatBoxGo | Puls 2 HD [HD]
- `660448` PL | PolsatBoxGo | Romance TV HD [HD]
- `660441` PL | PolsatBoxGo | SciFi Universal HD [HD]
- `660531` PL | PolsatBoxGo | Star Cinema HD [HD]
- `660532` PL | PolsatBoxGo | Star Family HD [HD]
- `660514` PL | PolsatBoxGo | Stars TV HD [HD]
- `660457` PL | PolsatBoxGo | Stopklatka HD [HD]
- `660489` PL | PolsatBoxGo | Travel Channel HD [HD]
- `660399` PL | PolsatBoxGo | TV Puls HD [HD]
- `660525` PL | PolsatBoxGo | TV Republika HD [HD]
- `660398` PL | PolsatBoxGo | TV4 HD [HD]
- `660478` PL | PolsatBoxGo | Viasat Explore HD [HD]
- `660479` PL | PolsatBoxGo | Viasat Nature HD [HD]
- `660509` PL | PolsatBoxGo | VOX MUSIC TV HD [HD]
- `660433` PL | PolsatBoxGo | Warner TV HD [HD]
- `660526` PL | PolsatBoxGo | WP PL HD [HD]
- `660530` PL | PolsatBoxGo | X-Sport HD [HD]
- `660422` PL | PolsatBoxGo | Extreme Channel SD [SD]
- `660494` PL | PolsatBoxGo | Water Planet SD [SD]
- `660152` PL | TVP | Belsat SD [SD]
- `660118` PL | TVP | TVP 1 SD [SD]
- `660120` PL | TVP | TVP 2 SD [SD]
- `660174` PL | TVP | TVP 3 Bialystok SD [SD]
- `660170` PL | TVP | TVP 3 Bydgoszcz SD [SD]
- `660160` PL | TVP | TVP 3 Gdansk SD [SD]
- `660172` PL | TVP | TVP 3 Gorzow WLKP SD [SD]
- `660166` PL | TVP | TVP 3 Katowice SD [SD]
- `660176` PL | TVP | TVP 3 Kielce SD [SD]
- `660158` PL | TVP | TVP 3 Krakow SD [SD]
- `660178` PL | TVP | TVP 3 Lodz SD [SD]
- `660164` PL | TVP | TVP 3 Lublin SD [SD]
- `660180` PL | TVP | TVP 3 Olsztyn SD [SD]
- `660168` PL | TVP | TVP 3 Opole SD [SD]
- `660162` PL | TVP | TVP 3 Poznan SD [SD]
- `660184` PL | TVP | TVP 3 Rzeszow SD [SD]
- `660186` PL | TVP | TVP 3 Szczecin SD [SD]
- `660156` PL | TVP | TVP 3 Warszawa SD [SD]
- `660182` PL | TVP | TVP 3 Wroclaw SD [SD]
- `660138` PL | TVP | TVP ABC 2 SD [SD]
- `660136` PL | TVP | TVP ABC SD [SD]
- `660146` PL | TVP | TVP Alfa SD [SD]
- `660124` PL | TVP | TVP Dokument SD [SD]
- `660132` PL | TVP | TVP Historia 2 SD [SD]
- `660116` PL | TVP | TVP Info SD [SD]
- `660134` PL | TVP | TVP Kobieta SD [SD]
- `660128` PL | TVP | TVP Kultura 2 SD [SD]
- `660126` PL | TVP | TVP Kultura SD [SD]
- `660144` PL | TVP | TVP Nauka SD [SD]
- `660122` PL | TVP | TVP Polonia SD [SD]
- `660142` PL | TVP | TVP Rozrywka SD [SD]
- `660140` PL | TVP | TVP Sport SD [SD]
- `660150` PL | TVP | TVP WIlno SD [SD]
- `660148` PL | TVP | TVP World SD [SD]
- `660546` PL | PlayerPL | Metro
- `660574` PL | PlayerPL | TVN Czas na ?lub Online
- `660580` PL | PlayerPL | TVN Rajska Mi?o?? Online
- `660569` PL | PlayerPL | TVN Rewolucje w Kuchni Online
- `660522` PL | PolsatBoxGo | Zoom TV
- `660187` PL | TVP | TVP Parlament- Sejm
- `660189` PL | TVP | TVP Parlament- Sejm
- `660188` PL | TVP | TVP Parlament- Senat
- `660190` PL | TVP | TVP Parlament- Senat

### EXYU (168 channels | 18 gems | 1 4K | 0 FHD | 2 HD)

- `210540` EX-YU: CARTOON NETWORK | SI *
- `210507` EX-YU: DISCOVERY *
- `210551` EX-YU: DISNEY JUNIOR | SI *
- `210652` EX-YU: EUROSPORT 1 *
- `210618` EX-YU: EUROSPORT 1 | RS *
- `210653` EX-YU: EUROSPORT 2 *
- `210405` EX-YU: HBO *
- `210406` EX-YU: HBO 2 *
- `210407` EX-YU: HBO 3 *
- `210469` EX-YU: HBO MAX *
- `210516` EX-YU: HISTORY *
- `210571` EX-YU: NICK JR. | SI *
- `210575` EX-YU: NICK TOONS | RS *
- `210550` EX-YU: NICKELODEON | HR *
- `210537` EX-YU: NICKELODEON | SI *
- `210558` EX-YU: NICKTOONS | SI *
- `210509` EX-YU: TLC *
- `210506` EX-YU: VIASAT HISTORY *
- `210502` EX-YU: 24KITCHEN [4K]
- `210513` EX-YU: H2 HD [HD]
- `210584` EX-YU: HD [HD]
- `210372` EX-YU PINK: BH
- `210398` EX-YU PINK: BRAVO MUSIC
- `210394` EX-YU PINK: CLASSIC
- `210371` EX-YU PINK: EXTRA
- `210378` EX-YU PINK: FAMILY
- `210379` EX-YU PINK: FILM
- `210375` EX-YU PINK: HITS 1
- `210399` EX-YU PINK: M
- `210374` EX-YU PINK: MUSIC
- `210385` EX-YU PINK: PREMIUM
- `210396` EX-YU PINK: REALITY
- `210400` EX-YU PINK: RED TV
- `210384` EX-YU PINK: SCI-FI & FANTASY
- `210390` EX-YU PINK: SERIJE
- `210393` EX-YU PINK: SHOW
- `210387` EX-YU PINK: THRILLER
- `210370` EX-YU PINK: VESTI
- `210392` EX-YU PINK: WORLD
- `210495` EX-YU: AMC
- `210593` EX-YU: ARENA 1 PREMIUM | RS
- `210594` EX-YU: ARENA 2 PREMIUM | RS
- `210595` EX-YU: ARENA 3 PREMIUM | RS
- `210596` EX-YU: ARENA FIGHT
- `210598` EX-YU: ARENA SPORT 1 | RS
- `210600` EX-YU: ARENA SPORT 1X2 | RS
- `210648` EX-YU: ARENA SPORT 2
- `210605` EX-YU: ARENA SPORT 4 | HR
- `210607` EX-YU: ARENA SPORT 5 | HR
- `210608` EX-YU: ARENA SPORT 5 | RS
- `210612` EX-YU: ARENA SPORT 7 | RS
- `210615` EX-YU: ARENA SPORT 9 | HR
- `210416` EX-YU: AXN
- `210539` EX-YU: BABY TV | SI
- `210521` EX-YU: BALKAN TRIP
- `210534` EX-YU: BBC EARTH
- `210441` EX-YU: BIH CINEMA TV
- `210464` EX-YU: BOX OFFICE 1
- `210465` EX-YU: BOX OFFICE 2
- `210466` EX-YU: BOX OFFICE 3
- `210447` EX-YU: CINE+ SELECT 1
- `210456` EX-YU: CINE+ SELECT 10
- `210448` EX-YU: CINE+ SELECT 2
- `210449` EX-YU: CINE+ SELECT 3
- `210450` EX-YU: CINE+ SELECT 4
- `210451` EX-YU: CINE+ SELECT 5
- `210452` EX-YU: CINE+ SELECT 6
- `210453` EX-YU: CINE+ SELECT 7
- `210454` EX-YU: CINE+ SELECT 8
- `210455` EX-YU: CINE+ SELECT 9
- `210408` EX-YU: CINEMAX
- `210409` EX-YU: CINEMAX 2
- `210427` EX-YU: CINESTAR COMEDY
- `210404` EX-YU: CINESTAR FANTASY
- `210419` EX-YU: CINESTAR PREMIERE 1
- `210402` EX-YU: CINESTAR TV
- `210414` EX-YU: CINESTAR TV 2
- `210503` EX-YU: CRIME INVESTIGATION
- `210519` EX-YU: DAVINCI LEARNING
- `210573` EX-YU: DEXY TV | RS
- `210413` EX-YU: DIVA
- `210582` EX-YU: DJECIJA
- `210425` EX-YU: DOBRA CINEMA TV
- `210520` EX-YU: DOKU TV
- `210510` EX-YU: DOKUBOX
- `210553` EX-YU: DUCK TV
- `210531` EX-YU: E!
- `210497` EX-YU: EPIC DRAMA
- `210583` EX-YU: EXCLUSIVE
- `210654` EX-YU: FASHION TV
- `210621` EX-YU: FC ZVEZDA TV | RS
- `210470` EX-YU: FILMBOX ARTHOUSE*
- `210496` EX-YU: FILMBOX PREMIUM
- `210444` EX-YU: FILMBOX STARS
- `210564` EX-YU: FIX & FOXI | DE
- `210517` EX-YU: FOOD NETWORK
- `210410` EX-YU: FOX CRIME
- `210411` EX-YU: FOX LIFE
- `210401` EX-YU: FOX MOVIES
- `210655` EX-YU: GOLD TV
- `210546` EX-YU: HAYATOVCI | BIH
- `210560` EX-YU: JIMJAM | SI
- `210567` EX-YU: KAZBUKA | RS
- `210527` EX-YU: KITCHENTV
- `210423` EX-YU: M1 FILM GOLD
- `210544` EX-YU: MASA I MEDVED | RS
- `210556` EX-YU: MAXCRO KIDS 2 | RS
- `210557` EX-YU: MAXCRO KIDS | RS
- `210435` EX-YU: MAXCRO SELECT 3
- `210436` EX-YU: MAXCRO SELECT 4
- `210437` EX-YU: MAXCRO SELECT 5
- `210438` EX-YU: MAXCRO SELECT 6
- `210418` EX-YU: MAXCRO SELECT 9
- `210623` EX-YU: MAXTV SPORT 1 | HR
- `210656` EX-YU: MEZZO LIVE
- `210549` EX-YU: MINIMAX | RS
- `210625` EX-YU: MNE SPORT 1 | CG
- `210626` EX-YU: MNE SPORT 2 | CG
- `210627` EX-YU: MNE SPORT 3 | CG
- `210628` EX-YU: MOJATV PREMIER LIGA | BIH
- `210487` EX-YU: MYTV SELECT 1
- `210489` EX-YU: MYTV SELECT 3
- `210490` EX-YU: MYTV SELECT 4
- `210491` EX-YU: MYTV SELECT 5
- `210492` EX-YU: MYTV SELECT 6
- `210493` EX-YU: MYTV SELECT 7
- `210494` EX-YU: MYTV SELECT 8
- `210500` EX-YU: NATGEO
- `210505` EX-YU: NATGEO WILD
- `210657` EX-YU: NAUTICAL CHANNEL
- `210524` EX-YU: NOVA DOCUMENTARY
- `210570` EX-YU: NOVA KIDS 2 | HR
- `210559` EX-YU: PIKABOO | SI
- `210545` EX-YU: PINK KIDS | RS
- `210499` EX-YU: PINK KUVAR
- `210576` EX-YU: PINK SUPER KIDS | RS
- `210588` EX-YU: PLUS
- `210542` EX-YU: RTL KOCKICA | HR
- `210504` EX-YU: RTS ZIVOT
- `210428` EX-YU: SCI-FI
- `210660` EX-YU: SPORT KLUB 1
- `210630` EX-YU: SPORT KLUB 1 | HR
- `210631` EX-YU: SPORT KLUB 1 | RS
- `210661` EX-YU: SPORT KLUB 2
- `210632` EX-YU: SPORT KLUB 2 | HR
- `210633` EX-YU: SPORT KLUB 2 | RS
- `210662` EX-YU: SPORT KLUB 3
- `210634` EX-YU: SPORT KLUB 3 | HR
- `210663` EX-YU: SPORT KLUB 4
- `210636` EX-YU: SPORT KLUB 4 | HR
- `210637` EX-YU: SPORT KLUB 4 | RS
- `210664` EX-YU: SPORT KLUB 5
- `210638` EX-YU: SPORT KLUB 5 | HR
- `210639` EX-YU: SPORT KLUB 5 | RS
- `210665` EX-YU: SPORT KLUB 6
- `210640` EX-YU: SPORT KLUB 6 | RS
- `210641` EX-YU: SPORT KLUB 7 | RS
- `210644` EX-YU: SUPER SPORTS 1 | AL
- `210645` EX-YU: SUPER SPORTS 2 | AL
- `210422` EX-YU: SUPER STAR 2
- `210591` EX-YU: SVADBA
- `210667` EX-YU: TELE M
- `210563` EX-YU: TNT KIDS | RS
- `210552` EX-YU: TOM & JERRY
- `210424` EX-YU: TV1000
- `210515` EX-YU: VIASAT EXPLORE
- `210514` EX-YU: VIASAT NATURE
- `210669` EX-YU: ŠPORT TV 2

### FRANCE (162 channels | 50 gems | 1 4K | 0 FHD | 158 HD)

- `658999` FRA | M6 4K (Local) [4K] *
- `659037` FRA | beIN SPORTS 1 HD (Local) [HD] *
- `659038` FRA | beIN SPORTS 2 HD (Local) [HD] *
- `659039` FRA | beIN SPORTS 3 HD (Local) [HD] *
- `659185` FRA | beIN SPORTS MAX 10 HD (Local) [HD] *
- `659181` FRA | beIN SPORTS MAX 6 HD (Local) [HD] *
- `659182` FRA | beIN SPORTS MAX 7 HD (Local) [HD] *
- `659183` FRA | beIN SPORTS MAX 8 HD (Local) [HD] *
- `659184` FRA | beIN SPORTS MAX 9 HD (Local) [HD] *
- `659105` FRA | BFM 2 HD (Local) [HD] *
- `659169` FRA | BFM Alsace HD (Local) [HD] *
- `659106` FRA | BFM Business HD (Local) [HD] *
- `659170` FRA | BFM D!CI Haute Provence HD (Local) [HD] *
- `659171` FRA | BFM DICI Alpes Sud HD (Local) [HD] *
- `659172` FRA | BFM Grand Lille HD (Local) [HD] *
- `659173` FRA | BFM Grand Littoral HD (Local) [HD] *
- `659174` FRA | BFM Lyon HD (Local) [HD] *
- `659175` FRA | BFM Marseille Provence HD (Local) [HD] *
- `659176` FRA | BFM Nice C te d'Azur HD (Local) [HD] *
- `659177` FRA | BFM Normandie HD (Local) [HD] *
- `659178` FRA | BFM Toulon Var HD (Local) [HD] *
- `659100` FRA | Boomerang HD (Local) [HD] *
- `659098` FRA | Cartoon Network HD (Local) [HD] *
- `659075` FRA | Comedy Central HD (Local) [HD] *
- `659053` FRA | Discovery Channel HD (Local) [HD] *
- `659054` FRA | Discovery Investigation HD (Local) [HD] *
- `659108` FRA | Euronews HD (Local) [HD] *
- `659036` FRA | Eurosport 1 HD (Local) [HD] *
- `659001` FRA | France 2 HD (Local) [HD] *
- `659110` FRA | France 24 HD (Local) [HD] *
- `659002` FRA | France 3 HD (Local) [HD] *
- `659004` FRA | France 5 HD (Local) [HD] *
- `659120` FRA | Journal du Golf HD (Local) [HD] *
- `659005` FRA | M6 HD (Local) [HD] *
- `659064` FRA | M6 Music HD (Local) [HD] *
- `659065` FRA | MTV HD (Local) [HD] *
- `659067` FRA | MTV Hits HD (Local) [HD] *
- `659050` FRA | National Geographic HD (Local) [HD] *
- `659093` FRA | Nickelodeon +1 HD (Local) [HD] *
- `659092` FRA | Nickelodeon HD (Local) [HD] *
- `659094` FRA | Nickelodeon Junior HD (Local) [HD] *
- `659095` FRA | Nickelodeon Teen HD (Local) [HD] *
- `659031` FRA | RMC Decouverte HD (Local) [HD] *
- `659030` FRA | RMC Story HD (Local) [HD] *
- `659000` FRA | TF1 HD (Local) [HD] *
- `659027` FRA | TF1 Series Films HD (Local) [HD] *
- `659052` FRA | TLC HD (Local) [HD] *
- `659021` FR | Canal+ Sport 360 *
- `659125` FR | Golf+ *
- `659040` FRA | Disney Channel *
- `659058` FRA | 13eme RUE HD (Local) [HD]
- `659160` FRA | 360 TuneBox HD (Local) [HD]
- `659029` FRA | 6ter HD (Local) [HD]
- `659041` FRA | AB 1 HD (Local) [HD]
- `659084` FRA | Action HD (Local) [HD]
- `659123` FRA | After Foot HD (Local) [HD]
- `659056` FRA | AKTU HD (Local) [HD]
- `659135` FRA | Animaux HD (Local) [HD]
- `659147` FRA | Auto TV Plus HD (Local) [HD]
- `659118` FRA | Automoto HD (Local) [HD]
- `659107` FRA | B Smart TV HD (Local) [HD]
- `659055` FRA | Bloomberg TV HD (Local) [HD]
- `659102` FRA | Canal J HD (Local) [HD]
- `659099` FRA | Cartoonito HD (Local) [HD]
- `659032` FRA | Cherie25 HD (Local) [HD]
- `659136` FRA | Chesse&Pesche HD (Local) [HD]
- `659078` FRA | Cin + Emotion HD (Local) [HD]
- `659079` FRA | Cin + family HD (Local) [HD]
- `659080` FRA | Cin + frisson HD (Local) [HD]
- `659077` FRA | Cin +Festival HD (Local) [HD]
- `659087` FRA | Cine Nanar+ HD (Local) [HD]
- `659159` FRA | Clubbing TV HD (Local) [HD]
- `659062` FRA | Comedie+ HD (Local) [HD]
- `659129` FRA | Crime District HD (Local) [HD]
- `659156` FRA | CStar Hits HD (Local) [HD]
- `659149` FRA | Demain TV HD (Local) [HD]
- `659145` FRA | DocuBox HD (Local) [HD]
- `659101` FRA | Dreamworks HD (Local) [HD]
- `659083` FRA | Drive In Movie Channel HD (Local) [HD]
- `659060` FRA | E! HD (Local) [HD]
- `659089` FRA | Emotion+ HD (Local) [HD]
- `659117` FRA | Equidia HD (Local) [HD]
- `659082` FRA | Eurochannel HD (Local) [HD]
- `659124` FRA | FastnFunBox HD (Local) [HD]
- `659126` FRA | FightBox HD (Local) [HD]
- `659003` FRA | France 4 HD (Local) [HD]
- `659015` FRA | franceinfo HD (Local) [HD]
- `659122` FRA | Fuel TV HD (Local) [HD]
- `659071` FRA | Game One +1 HD (Local) [HD]
- `659051` FRA | Game One HD (Local) [HD]
- `659113` FRA | Gametoon HD (Local) [HD]
- `659074` FRA | GONG HD (Local) [HD]
- `659011` FRA | Gulli HD (Local) [HD]
- `659132` FRA | Histoire TV HD (Local) [HD]
- `659116` FRA | Horse TV HD (Local) [HD]
- `659140` FRA | Imearth HD (Local) [HD]
- `659115` FRA | InfoSport+ HD (Local) [HD]
- `659070` FRA | J-One HD (Local) [HD]
- `659154` FRA | KTO HD (Local) [HD]
- `659014` FRA | LCI HD (Local) [HD]
- `659130` FRA | Le Figaro TV HD (Local) [HD]
- `659109` FRA | Lemedia HD (Local) [HD]
- `659153` FRA | Lucky Jack HD (Local) [HD]
- `659150` FRA | Luxe.TV HD (Local) [HD]
- `659072` FRA | Mangas HD (Local) [HD]
- `659148` FRA | Marmiton TV HD (Local) [HD]
- `659035` FRA | Max Lactu HD (Local) [HD]
- `659068` FRA | MCM HD (Local) [HD]
- `659069` FRA | MCM TOP HD (Local) [HD]
- `659151` FRA | Men's Up TV HD (Local) [HD]
- `659073` FRA | MGG TV HD (Local) [HD]
- `659142` FRA | Museum TV HD (Local) [HD]
- `659143` FRA | Myzen Nature HD (Local) [HD]
- `659152` FRA | Myzen TV HD (Local) [HD]
- `659090` FRA | Novelas Frequency HD (Local) [HD]
- `659048` FRA | Novelas HD (Local) [HD]
- `659066` FRA | NRJ Hits HD (Local) [HD]
- `659081` FRA | OCS HD (Local) [HD]
- `659114` FRA | OLPLAY HD (Local) [HD]
- `659061` FRA | Olympia TV HD (Local) [HD]
- `659085` FRA | Paramount Decal HD (Local) [HD]
- `659033` FRA | Paris Premiere HD (Local) [HD]
- `659097` FRA | Piwi + HD (Local) [HD]
- `659128` FRA | Planete+ Aventure HD (Local) [HD]
- `659127` FRA | Planete+ Crime HD (Local) [HD]
- `659049` FRA | Planete+ HD (Local) [HD]
- `659045` FRA | Polar+ HD (Local) [HD]
- `659111` FRA | Public Senat HD (Local) [HD]
- `659157` FRA | RFM TV HD (Local) [HD]
- `659034` FRA | RTL9 HD (Local) [HD]
- `659134` FRA | Science & Vie TV HD (Local) [HD]
- `659091` FRA | Scream IN+ HD (Local) [HD]
- `659046` FRA | Serie Club HD (Local) [HD]
- `659141` FRA | Souvenirs from Earth HD (Local) [HD]
- `659121` FRA | Sport en France HD (Local) [HD]
- `659155` FRA | Sqool TV HD (Local) [HD]
- `659059` FRA | SYFY HD (Local) [HD]
- `659026` FRA | T18 HD (Local) [HD]
- `659086` FRA | TCM Cinema HD (Local) [HD]
- `659146` FRA | Tech & Co HD (Local) [HD]
- `659103` FRA | Tele Toon HD (Local) [HD]
- `659104` FRA | Tele Toon+1 HD (Local) [HD]
- `659144` FRA | Telesud HD (Local) [HD]
- `659043` FRA | TEVA HD (Local) [HD]
- `659096` FRA | Tiji HD (Local) [HD]
- `659009` FRA | TMC HD (Local) [HD]
- `659133` FRA | Toute l'histoire HD (Local) [HD]
- `659163` FRA | Trace Africa HD (Local) [HD]
- `659165` FRA | Trace Caribbean HD (Local) [HD]
- `659166` FRA | Trace Gospel HD (Local) [HD]
- `659138` FRA | Trace Sport Stars HD (Local) [HD]
- `659167` FRA | Trace Toca HD (Local) [HD]
- `659164` FRA | Trace Urban HD (Local) [HD]
- `659139` FRA | Travel Channel HD (Local) [HD]
- `659137` FRA | Trek HD (Local) [HD]
- `659057` FRA | TV5 Monde HD (Local) [HD]
- `659131` FRA | Ushuaia TV HD (Local) [HD]
- `659168` FRA | Vibes TV HD (Local) [HD]
- `659112` FRA | W-Sport HD (Local) [HD]
- `659047` FRA | Warner TV HD (Local) [HD]
- `659063` FRA | Warner TV Next HD (Local) [HD]
- `659088` FRA | Wester Cinema+ HD (Local) [HD]

### BULGARIA (162 channels | 24 gems | 3 4K | 0 FHD | 0 HD)

- `661378` BG: Animal Planet *
- `661299` BG: Cartoon Network *
- `661373` BG: Discovery Channel *
- `661374` BG: Discovery ID Xtra *
- `661301` BG: Disney Channel *
- `661302` BG: Disney Junior *
- `661312` BG: Euronews Tv *
- `661257` BG: Hbo *
- `661258` BG: Hbo 2 *
- `661259` BG: Hbo 3 *
- `661383` BG: History Channel *
- `661384` BG: History Channel 2 *
- `661345` BG: MTV *
- `661348` BG: MTV Club *
- `661346` BG: Mtv Hits *
- `661347` BG: MTV Live *
- `661376` BG: National Geographic *
- `661296` BG: Nick Junior *
- `661295` BG: Nickelodeon *
- `661297` BG: Nicktoons *
- `661273` BG: Showtime 1 *
- `661274` BG: Showtime 2 *
- `661388` BG: TLC *
- `661382` BG: Viasat History *
- `661358` BG: Diema Sport 2 4K [4K]
- `661360` BG: Diema Sport 3 4K [4K]
- `661330` BG: Planeta 4K [4K]
- `661372` BG: 100% Automoto
- `661270` BG: Action.Box
- `661326` BG: Agro Tv
- `661278` BG: Amc Tv
- `661370` BG: Auto Bild BG
- `661371` BG: Auto Motor Sport
- `661261` BG: Axn Black
- `661260` BG: Axn Tv
- `661262` BG: Axn White
- `661328` BG: Balkanika Music
- `661399` BG: BBC Earth
- `661321` BG: BG +
- `661291` BG: BG Classic Film I
- `661292` BG: BG Classic Film II
- `661400` BG: BG Dnes
- `661327` BG: Bg Music
- `661243` BG: Bg On Air
- `661412` BG: Bhtv
- `661314` BG: Bloomberg Tv
- `661239` BG: Bnt 1
- `661240` BG: Bnt 2
- `661241` BG: Bnt 3
- `661242` BG: Bnt 4
- `661341` BG: Box Music
- `661247` BG: bTV
- `661248` BG: bTV Action
- `661249` BG: bTV Cinema
- `661250` BG: bTV Comedy
- `661251` BG: bTV Story
- `661315` BG: Bulgaria 24
- `661300` BG: Cartoonito
- `661272` BG: Cine Star Action
- `661271` BG: Cine Star Tv
- `661268` BG: Cine.Box
- `661279` BG: Cinemania
- `661266` BG: Cinemax 1
- `661267` BG: Cinemax 2
- `661342` BG: City Tv
- `661406` BG: Code Fashion
- `661394` BG: Code Healt
- `661269` BG: Comedy.Box
- `661375` BG: Crime & Investigation Network
- `661391` BG: Da Vinci Learning
- `661253` BG: Diema Family
- `661356` BG: Diema Sport 1
- `661357` BG: Diema Sport 2
- `661359` BG: Diema Sport 3
- `661252` BG: Diema Tv
- `661286` BG: Dizi Tv
- `661385` BG: DocuBox
- `661336` BG: Dstv
- `661303` BG: Duck Tv
- `661293` BG: E Kids
- `661285` BG: Epic Drama
- `661354` BG: Euro Sport 1
- `661355` BG: Euro Sport 2
- `661317` BG: Evrokom Tv
- `661404` BG: Fashion Tv
- `661333` BG: Fen Folk
- `661332` BG: Fen Tv
- `661366` BG: Fight Club
- `661367` BG: FightBox
- `661265` BG: Film Box Extra
- `661264` BG: Film Box Stars
- `661263` BG: Film Box Tv
- `661410` BG: Fishing & Hunting
- `661335` BG: Folklor Tv
- `661396` BG: Food Network
- `661393` BG: Galaxy Tv
- `661389` BG: HGTV
- `661343` BG: Hit Mix
- `661304` BG: Jim Jam Tv
- `661287` BG: Kanal 0
- `661320` BG: Kanal 3
- `661275` BG: Kanal 4
- `661288` BG: Kino BG
- `661246` BG: Kino Nova
- `661395` BG: Kitchen 24
- `661379` BG: Love Nature
- `661340` BG: Magic Tv
- `661361` BG: Max Sport 1
- `661362` BG: Max Sport 2
- `661364` BG: Max Sport 4
- `661306` BG: Miki Maus
- `661365` BG: MMA Tv
- `661276` BG: Movie Star
- `661392` BG: Nasa Tv
- `661281` BG: Nostalgia
- `661313` BG: Nova News
- `661352` BG: Nova Sport
- `661245` BG: Nova Tv
- `661305` BG: Nu Pogodi
- `661290` BG: Parva Programa
- `661307` BG: Paw Patrol
- `661283` BG: Pickbox Tv
- `661329` BG: Planeta
- `661331` BG: Planeta Folk
- `661368` BG: Red Bull
- `661409` BG: Ribalka i Ohota
- `661323` BG: Rimex Tv
- `661353` BG: Ring Bg
- `661334` BG: Rodina Tv
- `661339` BG: Roma Tv
- `661319` BG: Skat Plus
- `661318` BG: Skat Tv
- `661397` BG: Soul and Pepper
- `661311` BG: SpongeBob SquarePants
- `661256` BG: Star Crime
- `661255` BG: Star Life
- `661254` BG: Star Tv
- `661298` BG: Supertoons
- `661310` BG: The Flintstones
- `661344` BG: The Voice
- `661390` BG: The World
- `661403` BG: This ist Bulgaria
- `661337` BG: Tiankof Folk
- `661338` BG: Tiankof Orient
- `661308` BG: Tom and Jery
- `661402` BG: Travel Bulgaria
- `661387` BG: Travel Channel
- `661386` BG: Travel XP
- `661407` BG: Trofey
- `661324` BG: TV 1
- `661280` BG: Tv 1000
- `661244` BG: Tv 7/8
- `661282` BG: Tv 999
- `661411` BG: Tv Art
- `661401` BG: TV Turizam
- `661325` BG: TvN Ruse
- `661381` BG: Viasat Explorer
- `661277` BG: Viasat Kino
- `661380` BG: Viasat Nature
- `661316` BG: Vidimo i Nevidimo
- `661284` BG: Vivacom Arena
- `661322` BG: Voenen Kanal BG

### SPORTS | BEIN (124 channels | 39 gems | 36 4K | 19 FHD | 34 HD)

- `652311` beIN SPORTS  4K 2 [4K] *
- `652312` beIN SPORTS  4K 3 [4K] *
- `652310` beIN SPORTS 4K 1 [4K] *
- `652313` beIN SPORTS 4K 4 [4K] *
- `652314` beIN SPORTS 4K 5 [4K] *
- `652315` beIN SPORTS 4K 6 [4K] *
- `652316` beIN SPORTS 4K 7 [4K] *
- `652317` beIN SPORTS 4K 8 [4K] *
- `652318` beIN SPORTS 4K 9 [4K] *
- `652322` Bein Sports Global 4K [4K] *
- `652395` Bein Sports Max 1 4K [4K] *
- `652396` Bein Sports Max 2 4K [4K] *
- `652397` Bein Sports Max 3 4K [4K] *
- `652398` Bein Sports Max 4 4K [4K] *
- `652345` Bein Sports English 1 1080 [FHD] *
- `652346` Bein Sports English 2 1080 [FHD] *
- `652347` Bein Sports French HD1 1080 [FHD] *
- `652348` Bein Sports French HD2 1080 [FHD] *
- `652333` Bein Sports HD1 1080 [FHD] *
- `652334` Bein Sports HD2 1080 [FHD] *
- `652335` Bein Sports HD3 1080 [FHD] *
- `652336` Bein Sports HD4 1080 [FHD] *
- `652337` Bein Sports HD5 1080 [FHD] *
- `652338` Bein Sports HD6 1080 [FHD] *
- `652339` Bein Sports HD7 1080 [FHD] *
- `652340` Bein Sports HD8 1080 [FHD] *
- `652341` Bein Sports HD9 1080 [FHD] *
- `652399` Bein Sports Max 1 FHD [FHD] *
- `652400` Bein Sports Max 2 FHD [FHD] *
- `652402` Bein Sports Max 4 FHD [FHD] *
- `652403` Bein Sports Max 1 HD [HD] *
- `652404` Bein Sports Max 2 HD [HD] *
- `652405` Bein Sports Max 3 HD [HD] *
- `652406` Bein Sports Max 4 HD [HD] *
- `652385` BeIN Sports Global SD [SD] *
- `652407` Bein Sports Max 1 SD [SD] *
- `652408` Bein Sports Max 2 SD [SD] *
- `652409` Bein Sports Max 3 SD [SD] *
- `652410` Bein Sports Max 4 SD [SD] *
- `652411` BeIN Alkass 1 4K [4K]
- `652420` BeIN Alkass 10 4K [4K]
- `652412` BeIN Alkass 2 4K [4K]
- `652413` BeIN Alkass 3 4K [4K]
- `652414` BeIN Alkass 4 4K [4K]
- `652416` BeIN Alkass 6 4K [4K]
- `652418` BeIN Alkass 8 4K [4K]
- `652419` BeIN Alkass 9 4K [4K]
- `652329` Bein Sport AFC 3 4K [4K]
- `652330` Bein Sport AFC 4 4K [4K]
- `652331` Bein Sport AFC 5 4K [4K]
- `676385` beIN Sport English 1 4k. [4K]
- `652319` beIN Sport English 2 4k [4K]
- `652320` beIN Sport French 4k 1 [4K]
- `652321` beIN Sport French 4k 2 [4K]
- `652332` Bein Sport NBA 4K [4K]
- `652325` beIN Xtra 4K  3 [4K]
- `652323` Bein Xtra 4K 1 [4K]
- `652324` Bein Xtra 4K 2 [4K]
- `652328` Bein Xtra 4K 4 [4K]
- `652326` Bein Xtra 4K 5 [4K]
- `652327` Bein Xtra 4K 6 [4K]
- `652342` Bein Xtra HD1 1080 [FHD]
- `652343` Bein Xtra HD2 1080 [FHD]
- `652344` Bein Xtra HD3 1080 [FHD]
- `652421` BeIN Alkass 1 HD [HD]
- `652430` BeIN Alkass 10 HD [HD]
- `652422` BeIN Alkass 2 HD [HD]
- `652423` BeIN Alkass 3 HD [HD]
- `652424` BeIN Alkass 4 HD [HD]
- `652425` BeIN Alkass 5 HD [HD]
- `652426` BeIN Alkass 6 HD [HD]
- `652428` BeIN Alkass 8 HD [HD]
- `652429` BeIN Alkass 9 HD [HD]
- `652368` Bein Sport AFC 3 HD [HD]
- `652369` Bein Sport AFC 4 HD [HD]
- `652370` Bein Sport AFC 5 HD [HD]
- `652363` Bein Sport French HD1 720 [HD]
- `652364` Bein Sport French HD2 720 [HD]
- `652350` Bein Sport HD1 720 [HD]
- `652351` Bein Sport HD2 720 [HD]
- `652352` Bein Sport HD3 720 [HD]
- `652353` Bein Sport HD4 720 [HD]
- `652354` Bein Sport HD5 720 [HD]
- `652355` Bein Sport HD6 720 [HD]
- `652356` Bein Sport HD7 720 [HD]
- `652357` Bein Sport HD8 720 [HD]
- `652358` Bein Sport HD9 720 [HD]
- `652371` Bein Sport NBA HD [HD]
- `652349` Bein Sport News HD [HD]
- `652367` Bein Xtra HD 4 [HD]
- `652365` Bein Xtra HD 5 [HD]
- `652366` Bein Xtra HD 6 [HD]
- `652359` Bein Xtra HD1 720 [HD]
- `652361` Bein Xtra HD3 720 [HD]
- `652431` BeIN Alkass 1 SD [SD]
- `652440` BeIN Alkass 10 SD [SD]
- `652434` BeIN Alkass 4 SD [SD]
- `652435` BeIN Alkass 5 SD [SD]
- `652436` BeIN Alkass 6 SD [SD]
- `652438` BeIN Alkass 8 SD [SD]
- `652439` BeIN Alkass 9 SD [SD]
- `652372` Bein Sport  SD1 [SD]
- `652392` Bein Sport AFC 3 SD [SD]
- `652393` Bein Sport AFC 4 SD [SD]
- `652394` Bein Sport AFC 5 SD [SD]
- `652381` Bein Sport English 1 SD [SD]
- `652382` Bein Sport English 2 SD [SD]
- `652383` Bein Sport French SD1 [SD]
- `652384` Bein Sport French SD2 [SD]
- `652373` Bein Sport SD2 [SD]
- `652374` Bein Sport SD3 [SD]
- `652375` Bein Sport SD4 [SD]
- `652376` Bein Sport SD5 [SD]
- `652377` Bein Sport SD6 [SD]
- `652378` Bein Sport SD7 [SD]
- `652379` Bein Sport SD8 [SD]
- `652380` Bein Sport SD9 [SD]
- `652389` Bein Xtra SD 4 [SD]
- `652390` Bein Xtra SD 5 [SD]
- `652391` Bein Xtra SD 6 [SD]
- `652386` Bein Xtra SD1 [SD]
- `652387` Bein Xtra SD2 [SD]
- `652388` Bein Xtra SD3 [SD]
- `652362` Bein Sport English 2 720

### ALBANIA (121 channels | 6 gems | 0 4K | 0 FHD | 3 HD)

- `660850` ALB: A2 CNN *
- `661043` ALB: Diasport TV *
- `660998` ALB: MetiTV Comedy *
- `660997` ALB: MetiTV Horror *
- `660994` ALB: MetiTV Max *
- `661034` ALB: MTV Kosova *
- `660870` ALB: Digitalb MAX HD [HD]
- `660894` ALB: Family HD [HD]
- `660869` ALB: Film GOLD HD [HD]
- `660758` ALB: A-TV
- `660762` ALB: ABC
- `660800` ALB: ALB UK
- `660817` ALB: Alpo TV Gjirokaster
- `660753` ALB: Alsat M
- `661031` ALB: Amol TV
- `660818` ALB: Apollon TV
- `660780` ALB: Art Doku 1
- `660781` ALB: Art Doku 2
- `660891` ALB: ART Kino 1
- `660892` ALB: ART Kino 2
- `660893` ALB: ART Kino 3
- `660833` ALB: ART Sport 1
- `660834` ALB: ART Sport 2
- `660835` ALB: ART Sport 3
- `660836` ALB: ART Sport 4
- `660837` ALB: ART Sport 5
- `660838` ALB: ART Sport 6
- `660842` ALB: Arta News
- `661029` ALB: BBF Music
- `660856` ALB: Cufo TV
- `660764` ALB: D TV
- `660860` ALB: Duck TV
- `661035` ALB: Elrodi Music
- `660787` ALB: Episode
- `660796` ALB: Era
- `660877` ALB: Euro Film
- `660846` ALB: Fax News
- `660872` ALB: Film Autor
- `660876` ALB: Film Drame
- `660871` ALB: Film Hits
- `660874` ALB: Film Komedi
- `660875` ALB: Film Thriller
- `660763` ALB: First Channel
- `660855` ALB: Junior TV
- `660757` ALB: Kanal 10
- `660849` ALB: Kanal 7 News
- `660784` ALB: Kanal D Drama
- `660748` ALB: Klan Kosova
- `661030` ALB: Klan Music
- `660844` ALB: Klan News
- `660749` ALB: Klan PLUS
- `660745` ALB: Klan TV
- `660937` ALB: KS Epik
- `660939` ALB: KS Horror
- `660933` ALB: KS Premiere 1
- `660772` ALB: Living
- `660769` ALB: MCN TV
- `661028` ALB: My Music
- `660845` ALB: News 24
- `660848` ALB: Panorama News
- `661077` ALB: Peace TV
- `660859` ALB: Pikaboo
- `660771` ALB: Premium Channel
- `660851` ALB: Raport TV
- `660750` ALB: RTK
- `660751` ALB: RTK 3
- `660752` ALB: RTK 4
- `660766` ALB: RTSH 2
- `660847` ALB: RTSH 24
- `660790` ALB: RTSH Film
- `660792` ALB: RTSH Shqip
- `660815` ALB: RTV Fontana
- `660747` ALB: RTV21
- `660794` ALB: RTV21 Maqedoni
- `660793` ALB: RTV21 MIX
- `660773` ALB: Smile
- `660822` ALB: Super Sport 1
- `660823` ALB: Super Sport 2
- `660824` ALB: Super Sport 3
- `660825` ALB: Super Sport 4
- `660826` ALB: Super Sport 5
- `660827` ALB: Super Sport 6
- `660761` ALB: Syri TV
- `660804` ALB: Syri Vision Gjakove
- `660756` ALB: T7
- `660786` ALB: TDC Seriale Turke
- `660858` ALB: Tip TV
- `660744` ALB: Top Channel
- `660841` ALB: Top News
- `660782` ALB: Travel Channel AL
- `660890` ALB: Tring 3+
- `660880` ALB: Tring Aksion
- `660889` ALB: Tring Classic
- `660888` ALB: Tring Collection
- `660882` ALB: Tring Comedy
- `660884` ALB: Tring Family
- `660778` ALB: Tring Histori
- `660883` ALB: Tring Life
- `660885` ALB: Tring Original
- `660777` ALB: Tring Planet
- `660879` ALB: Tring Series
- `660861` ALB: Tring Sofia
- `660829` ALB: Tring Sport 1
- `660832` ALB: Tring Sport 4
- `660881` ALB: Tring Super
- `660857` ALB: Tring Tring
- `660785` ALB: Tring Turkish
- `660779` ALB: Tring World
- `661036` ALB: Turbo Channel
- `660798` ALB: TV Besa
- `660755` ALB: TV Dukagjini
- `660809` ALB: TV Kopliku
- `660811` ALB: TV Liria
- `660799` ALB: TV Shenja
- `660803` ALB: TV Tema Ferizaj
- `660896` ALB: Tëvë  Comedy
- `660895` ALB: Tëvë Drame
- `660897` ALB: Tëvë Shqip
- `660754` ALB: tëvë1
- `660759` ALB: Vizion Plus
- `660802` ALB: Zjarr TV

### IRAN (102 channels | 0 gems | 0 4K | 1 FHD | 36 HD)

- `638633` IR: Maah TV FHD [FHD]
- `638630` IR: Ava Family HD [HD]
- `638692` IR: Damac Persian TV HD [HD]
- `638654` IR: Gem 24B HD [HD]
- `638653` IR: Gem Arabia HD [HD]
- `638652` IR: Gem AZ 1 HD [HD]
- `638650` IR: Gem Bollywood HD [HD]
- `638649` IR: Gem Classic HD [HD]
- `638648` IR: Gem Comedy HD [HD]
- `638643` IR: Gem Drama HD [HD]
- `638644` IR: Gem Drama Plus HD [HD]
- `638651` IR: Gem Film HD [HD]
- `638660` IR: Gem Fit HD [HD]
- `638655` IR: Gem Food HD [HD]
- `638687` IR: Gem Junior HD [HD]
- `638686` IR: Gem Kids HD [HD]
- `638663` IR: Gem Latino HD [HD]
- `638661` IR: Gem Life HD [HD]
- `638656` IR: Gem MAXX HD [HD]
- `638637` IR: Gem Mifa Music HD [HD]
- `638638` IR: Gem Mifa Plus  HD [HD]
- `638665` IR: Gem Nature HD [HD]
- `638647` IR: Gem Onyx HD [HD]
- `638646` IR: Gem River Plus HD [HD]
- `638645` IR: Gem Rubix Plus HD [HD]
- `638662` IR: Gem Travel HD [HD]
- `638668` IR: Iran E Farda HD [HD]
- `638628` IR: Iran International HD [HD]
- `638702` IR: IRIB Amoozesh HD [HD]
- `638704` IR: IRIB Mostanad HD [HD]
- `638708` IR: IRIB Tamasha HD [HD]
- `638706` IR: IRIB Varzesh HD [HD]
- `638685` IR: ITOON HD [HD]
- `638639` IR: Navahang HD [HD]
- `638690` IR: Payam Aramesh HD [HD]
- `638635` IR: VARZISH SPORT HD [HD]
- `638631` IR: Vox 1 HD [HD]
- `638676` IR: 4U TV
- `638629` IR: BBC Persian
- `638682` IR: Boushehr TV
- `638634` IR: City Tv
- `638671` IR: Ganje Hozour
- `638664` IR: Gem Academy
- `638657` IR: GEM River
- `638658` IR: GEM Rubix
- `638659` IR: GEM Series
- `638641` IR: Gem TV
- `638642` IR: Gem TV Plus
- `638691` IR: Hadi TV 6
- `638713` IR: iFilm
- `638717` IR: IRIB Aflak TV Lorestan
- `638715` IR: IRIB AFTAB
- `638716` IR: IRIB ALBORZ
- `638718` IR: IRIB Atrak TV  Khorasan Shomali
- `638719` IR: IRIB Azarbayjan-e Gharbi TV
- `638720` IR: IRIB Baran TV Guilan
- `638721` IR: IRIB Dena Kohgiluyeh and Boyer Ahmad
- `638722` IR: IRIB ESHRAGH
- `638712` IR: IRIB Film 2
- `638723` IR: IRIB GOLESTAN
- `638724` IR: IRIB HAMEDAN
- `638725` IR: IRIB HAMOON
- `638737` IR: IRIB Ilam
- `638726` IR: IRIB JAHANBIN
- `638727` IR: IRIB Kerman
- `638728` IR: IRIB Kermanshah Zagros
- `638729` IR: IRIB Khavaran TV Khorasan Jonoobi
- `638731` IR: IRIB KHORASAN RAZAVI
- `638730` IR: IRIB Kurdistan
- `638732` IR: IRIB Mahabad
- `638733` IR: IRIB MAZANDARAN
- `638705` IR: IRIB Namayesh
- `638709` IR: IRIB Nasim
- `638710` IR: IRIB Ofogh TV
- `638711` IR: IRIB Omid TV
- `638734` IR: IRIB QAZVIN
- `638703` IR: IRIB Quran
- `638735` IR: IRIB SABALAN
- `638707` IR: IRIB Salamat
- `638736` IR: IRIB Sepehr
- `638696` IR: IRIB TV 1
- `638697` IR: IRIB TV 2
- `638698` IR: IRIB TV 3
- `638699` IR: IRIB TV 4
- `638700` IR: IRIB TV 5
- `638701` IR: IRINN
- `638681` IR: Isfahan TV
- `638689` IR: Kalmeah Farsi
- `638674` IR: Kanal Jadid
- `638693` IR: Khalij e Fars TV
- `638669` IR: KHANE FILM
- `638694` IR: Khoozestan TV
- `638632` IR: MY TV
- `638677` IR: Payam Javan TV
- `638640` IR: Persian Music
- `638695` IR: Radio Farda
- `638683` IR: Sahand TV (TABRIZ)
- `638680` IR: Sahar Azari
- `638688` IR: SAT 7 Pars
- `638666` IR: Tapesh TV
- `638675` IR: Toosheh TV
- `638684` IR: Yazd TV Taban

### USA (93 channels | 42 gems | 0 4K | 5 FHD | 21 HD)

- `1026` US: HBO Family FHD [FHD] *
- `1027` US: HBO Signature FHD [FHD] *
- `1028` US: HBO Zone FHD [FHD] *
- `1029` US: Starz Black FHD [FHD] *
- `7371` US: ESPN News HD [HD] *
- `34` USA:  HISTORY  HD [HD] *
- `53` USA: ESPN 2 HD [HD] *
- `35` USA: MTV  HD [HD] *
- `36` USA: TLC HD [HD] *
- `3359` US: ANIMAL PLANET *
- `3365` US: CARTOON NETWORK *
- `3399` US: DISCOVERY CHANNEL EAST *
- `3400` US: DISCOVERY FAMILY *
- `3401` US: DISCOVERY LIFE *
- `3402` US: DISNEY JR EAST *
- `3403` US: DISNEY XD EAST *
- `1025` US: HBO 2 Comedy *
- `3357` US: HBO COMEDY *
- `3355` US: HBO FAMILY *
- `3358` US: HBO SIGNATURE *
- `3356` US: HBO ZONE *
- `3406` US: MTV U *
- `3407` US: MTV2 *
- `1008` US: NAT GEO WILD *
- `17` US: National Geographic *
- `3361` US: NATIONAL GEOGRAPHIC *
- `1015` US: NFL Network *
- `3415` US: NFL Network *
- `3409` US: SHOWTIME EAST *
- `3411` US: SHOWTIME FAMILY ZONE *
- `3412` US: SHOWTIME WOMEN *
- `3416` US: STARZENCORE *
- `3417` US: STARZENCORE ACTION *
- `3418` US: STARZENCORE CLASSIC *
- `3419` US: STARZENCORE FAMILY *
- `9` USA: COMEDY CENTRAL *
- `44` USA: Discovery channel *
- `88177` USA: ESPN U *
- `3421` USA: FOX SPORTS 2 *
- `3422` USA: FOX SPORTS CAROLINAS *
- `3428` USA: FOX SPORTS SOUTHWEST *
- `50` USA: HBO  COMEDY *
- `26393` USA: NBC Sports Bay Area FHD [FHD]
- `23550` US : NFL RedZone HD  [HD]
- `7345` US: BET | HD* [HD]
- `7359` US: Fusion | HD [HD]
- `1132` US: HGTV HD [HD]
- `7346` US: Lifetime | HD [HD]
- `7367` US: MSG HD [HD]
- `7355` US: Oxygen | HD [HD]
- `3395` US: RETRO PLEX HD [HD]
- `7358` US: REVOLT | HD [HD]
- `7349` US: TNT | HD* [HD]
- `7357` US: Tru TV | HD [HD]
- `7354` US: TV Land | HD [HD]
- `7348` US: WGN NETWORK | HD [HD]
- `24964` USA: FOX HD [HD]
- `54` USA: Fox Sport 1 HD (FS1) [HD]
- `7365` USA: Yes Network HD [HD]
- `9979` Fight TV
- `1006` US: ABC-E
- `23431` US: Antenna TV
- `7352` US: Bloomberg TV
- `3363` US: BRAVO
- `1005` US: CBS E
- `3397` US: CINEMAX WEST
- `23430` US: COZI TV
- `3398` US: DESTINATION AMERICA
- `1003` US: ESP News
- `3391` US: FUSE
- `3392` US: GRIT TV MOVIES
- `5820` US: LIFE TIME
- `202` US: Lifetime Movies
- `1014` US: MLB Network
- `1012` US: NBA Network
- `1013` US: NHL Network
- `1016` US: RED BULL TV
- `7419` US: TBS
- `49614` US: The Weather Channel
- `1057` US: UFC Fight pass
- `3414` US: VH1
- `1024` USA : Cinemax West
- `709` USA: AMC
- `1135` USA: Hallmark Channel
- `9461` USA: HALLMARK MOVIES & MYSTERIES
- `1021` USA: TSN 1
- `1020` USA: TSN 2
- `1019` USA: TSN 3
- `1018` USA: TSN 4
- `1017` USA: TSN 5
- `47` USA: USA Network
- `711` USA: WWE NETWORK
- `23845` USA:CBSN

### SPORTS | ARABIC (84 channels | 13 gems | 7 4K | 0 FHD | 46 HD)

- `605112` Shahid Sport 1 4k [4K] *
- `605115` Shahid Sport 2 4K [4K] *
- `605113` Shahid Sport 1 HD [HD] *
- `605116` Shahid Sport 2 HD [HD] *
- `309006` Sport | Ar: Abu Dhabi Sports 1 HD [HD] *
- `309007` Sport | Ar: Abu Dhabi Sports 2 HD [HD] *
- `605119` StarzPlay Sports 1 HD [HD] *
- `605122` StarzPlay Sports 2 HD [HD] *
- `605125` StarzPlay Sports 3 HD [HD] *
- `605114` Shahid Sport 1 SD [SD] *
- `605117` Shahid Sport 2 SD [SD] *
- `605120` StarzPlay Sports 1 SD [SD] *
- `605123` StarzPlay Sports 2 SD [SD] *
- `605126` AD Sport Asia 1 4K [4K]
- `605127` AD Sport Asia 2 4K [4K]
- `605097` Thamanya 1 Sport 4K [4K]
- `605098` Thamanya 2 Sport 4K [4K]
- `605099` Thamanya 3 Sport 4K [4K]
- `605128` AD Sport Asia 1 HD [HD]
- `605129` AD Sport Asia 2 HD [HD]
- `4623` AR:  Dubai Racing 1 HD [HD]
- `4624` AR:  Dubai Racing 2 HD [HD]
- `4625` AR:  Dubai Racing 3 HD [HD]
- `902` AR:  Dubai Racing HD [HD]
- `4651` AR:  Dubai Sport 1 HD [HD]
- `4652` AR:  Dubai Sport 2 HD [HD]
- `4653` AR:  Dubai Sport 3 HD [HD]
- `4654` AR:  KSA Sport 1 HD+ [HD]
- `4655` AR:  KSA Sport 2 HD+ [HD]
- `4656` AR:  KSA Sport 3 HD+ [HD]
- `4637` AR:  Libya Sports  2HD [HD]
- `4598` AR:  ON Time Sports HD+ [HD]
- `4620` AR:  ON Time Sports HD+ [HD]
- `30105` AR: Bahrain_Sport_1_HD [HD]
- `30106` AR: Bahrain_Sport_2_HD [HD]
- `309039` Sport | Ar: Arryadia HD [HD]
- `309024` Sport | Ar: Bahrain Sport 1 HD [HD]
- `309025` Sport | Ar: Bahrain Sport 2 HD [HD]
- `309016` Sport | Ar: Dubai Racing 1 HD [HD]
- `309017` Sport | Ar: Dubai Racing 2 HD [HD]
- `309018` Sport | Ar: Dubai Racing 3 HD [HD]
- `309011` Sport | Ar: Dubai Sport 1 HD [HD]
- `309012` Sport | Ar: Dubai Sport 2 HD [HD]
- `309013` Sport | Ar: Dubai Sport 3 HD [HD]
- `309027` Sport | Ar: Iraqia Sport HD [HD]
- `309035` Sport | Ar: Jordan Sport HD [HD]
- `309008` Sport | Ar: KSA Sport 1 HD [HD]
- `309009` Sport | Ar: KSA Sport 2 HD [HD]
- `309010` Sport | Ar: KSA Sport 3 HD [HD]
- `309036` Sport | Ar: Kuwait Sport HD [HD]
- `309026` Sport | Ar: Oman Sport HD [HD]
- `309014` Sport | Ar: On Time Sport HD 1 [HD]
- `309015` Sport | Ar: On Time Sport HD 2 [HD]
- `309038` Sport | Ar: Sharjah Sport HD [HD]
- `605100` Thamanya 1 Sport HD [HD]
- `605101` Thamanya 2 Sport HD [HD]
- `605102` Thamanya 3 Sport HD [HD]
- `605130` AD Sport Asia 1 SD [SD]
- `605131` AD Sport Asia 2 SD [SD]
- `605103` Thamanya 1 Sport SD [SD]
- `605104` Thamanya 2 Sport SD [SD]
- `605105` Thamanya 3 Sport SD [SD]
- `4640` AR:  Libya Sport Channel
- `605090` IQ| Al Rabiaa Geo
- `605085` Iq| Al Rabiaa Iraq ✦
- `605091` IQ| Al Rabiaa Movies
- `605092` IQ| Al Rabiaa Quran
- `605093` IQ| Al Rabiaa Series
- `605087` IQ| Al Rabiaa Sport +1
- `605089` IQ| Al Rabiaa Sport +2
- `605086` IQ| Al Rabiaa Sport 1
- `605088` IQ| Al Rabiaa Sport 2
- `605094` IQ| Al Rabiaa variety
- `605096` IQ| Njoom Al Rabiaa
- `309031` Sport | Ar: Al Ahly TV
- `309032` Sport | Ar: Al Heddaf TV
- `309040` Sport | Ar: Kuwait Sport Plus
- `309033` Sport | Ar: Libya Sport 1
- `309034` Sport | Ar: Libya Sport 2
- `309030` Sport | Ar: Nile Sport
- `309037` Sport | Ar: Palestine Sport
- `309041` Sport | Ar: Yas Sport
- `309029` Sport | Ar: Zamalek Sports
- `309043` Sport: RealMadrid TV

### NETHERLANDS (82 channels | 17 gems | 0 4K | 0 FHD | 0 HD)

- `659549` NL: Animal Planet *
- `659567` NL: Cartoon Network *
- `659545` NL: Discovery *
- `659546` NL: Discovery Science *
- `659562` NL: Disney Channel *
- `659539` NL: ESPN 1 *
- `659540` NL: ESPN 2 *
- `659541` NL: ESPN 3 *
- `659542` NL: ESPN 4 *
- `659543` NL: Eurosport 1 *
- `659544` NL: Eurosport 2 *
- `659578` NL: MTV *
- `659547` NL: National geographic *
- `659548` NL: National Geographic WILD *
- `659566` NL: Nick Jr. *
- `659564` NL: Nicktoons *
- `659550` NL: TLC *
- `659521` NH Nieuws
- `659582` NL: 100% NL TV
- `659584` NL: 192 TV
- `659558` NL: 24 KITCHEN
- `659525` NL: AT5
- `659568` NL: Baby TV
- `659531` NL: Comedy Cetral
- `659556` NL: Crime+Investigation
- `659569` NL: Duck TV
- `659509` NL: Family 7
- `659527` NL: Film 1 ACTION
- `659529` NL: Film 1 DRAMA
- `659528` NL: Film 1 FAMILY
- `659526` NL: Film 1 PREMIERE
- `659530` NL: FOX
- `659557` NL: Horse & Country TV
- `659551` NL: ID
- `659585` NL: Inplus
- `659573` NL: Ketnet JR
- `659524` NL: L1 TV
- `659560` NL: Love Nature
- `659498` NL: NET 5
- `659559` NL: NJAM
- `659493` NL: NPO 1
- `659522` NL: NPO 1 Extra
- `659494` NL: NPO 2
- `659523` NL: NPO 2 Extra
- `659495` NL: NPO 3
- `659514` NL: Omrop Brabant
- `659515` NL: Omrop Flevoland
- `659512` NL: Omrop Fryslan
- `659513` NL: Omrop Gelderland
- `659516` NL: Omrop Zeeland
- `659506` NL: ONS
- `659532` NL: Paramount Network
- `659571` NL: Pebble tv
- `659496` NL: RTL 4
- `659497` NL: RTL 5
- `659500` NL: RTL 7
- `659501` NL: RTL 8
- `659505` NL: RTL Crime
- `659504` NL: RTL Lounge
- `659570` NL: RTL Telekids
- `659503` NL: RTL Z
- `659517` NL: RTV Drenthen
- `659511` NL: RTV Noord
- `659510` NL: RTV Oost
- `659520` NL: RTV Rijnmond
- `659518` NL: RTV Utrecht
- `659519` NL: RTV West
- `659499` NL: SBS 6
- `659561` NL: Shorts TV
- `659579` NL: SLAM! TV
- `659586` NL: Stingray Lite
- `659581` NL: Stingray LiteTV
- `659574` NL: TV 538
- `659583` NL: TV Oranje
- `659502` NL: Viaplay TV
- `659507` NL: VRT 1
- `659533` NL: Ziggo Sport
- `659534` NL: Ziggo Sport 2
- `659535` NL: Ziggo Sport 3
- `659536` NL: Ziggo Sport 4
- `659537` NL: Ziggo Sport 5
- `659538` NL: Ziggo Sport 6

### US : 24X7 (82 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `224035` 24/7 Adventure Time
- `223811` 24/7 American Crime Story
- `223960` 24/7 Atlanta's Missing and Murdered: The Lost Children
- `223756` 24/7 Bad Boys
- `224023` 24/7 Batfink
- `223868` 24/7 Below Deck Sailing Yacht
- `223956` 24/7 Biography: WWE Legends
- `223955` 24/7 Blue Planet II
- `224025` 24/7 Bubble Guppies
- `223870` 24/7 Buffy the Vampire Slayer
- `223866` 24/7 Chuck
- `223813` 24/7 Claws
- `224021` 24/7 Cow and Chicken
- `223867` 24/7 CSI: Miami
- `223872` 24/7 Das Boot
- `223760` 24/7 Despicable Me
- `223873` 24/7 Dickinson
- `223875` 24/7 First Wives Club
- `223761` 24/7 Friday the 13th
- `223762` 24/7 Ghost Rider
- `223865` 24/7 Ghost Whisperer
- `223877` 24/7 Ghostwriter
- `223800` 24/7 GLOW
- `223801` 24/7 Good Girls
- `223864` 24/7 Grey's Anatomy
- `223783` 24/7 Grown Ups
- `223962` 24/7 Hacks
- `223907` 24/7 Harley Quinn
- `223765` 24/7 Hellboy
- `223878` 24/7 Him & Her
- `223804` 24/7 Human Planet
- `223768` 24/7 Indiana Jones
- `223880` 24/7 Invasion
- `223806` 24/7 Jane the Virgin
- `223807` 24/7 L.A.'s Finest
- `223808` 24/7 Legacies
- `223809` 24/7 Love, Death & Robots
- `223887` 24/7 Mad Men
- `224030` 24/7 Marvel's M.O.D.O.K.
- `223920` 24/7 Marvel's Ultimate Spider-Man
- `223770` 24/7 Matrix
- `223972` 24/7 My Name Is Earl
- `223889` 24/7 My Wife and Kids
- `223890` 24/7 Mythic Quest
- `223819` 24/7 Narcos: Mexico
- `223771` 24/7 Night at the Museum
- `223891` 24/7 One Tree Hill
- `223892` 24/7 Pandora
- `223752` 24/7 Paranormal Activity
- `223989` 24/7 Paris in Love
- `223820` 24/7 Parks and Recreation
- `224028` 24/7 Peter Rabbit
- `223923` 24/7 Pistol
- `223893` 24/7 Plebs
- `223823` 24/7 Queen of the South
- `223894` 24/7 Red Dwarf
- `223815` 24/7 Republic of Doyle
- `223825` 24/7 Santa Clarita Diet
- `223896` 24/7 Scream Queens
- `223898` 24/7 Shameless
- `223961` 24/7 South Park
- `223750` 24/7 Spider-Man
- `223856` 24/7 Station 19
- `223855` 24/7 Strike Back
- `223899` 24/7 Ted Lasso
- `223781` 24/7 The Conjuring
- `223939` 24/7 The Curse of Oak Island
- `223987` 24/7 The Dropout
- `223929` 24/7 The Essex Serpent
- `223782` 24/7 The Exorcist
- `223992` 24/7 The First Lady
- `223900` 24/7 The Fresh Prince of Bel-Air
- `223930` 24/7 The Gifted
- `223982` 24/7 The Handmaid's Tale
- `224794` 24/7 The Hangover
- `223931` 24/7 The Muppet Show
- `224033` 24/7 The Muppet Show
- `223849` 24/7 The O.C.
- `223785` 24/7 The Smurfs
- `223845` 24/7 The Summer I Turned Pretty
- `223841` 24/7 Tyler Perry's Sistas
- `224027` 24/7 Wacky Races

### BANGLA (80 channels | 6 gems | 5 4K | 7 FHD | 19 HD)

- `98882` BD: COLORS BANGLA (4K). [4K] [icon] *
- `23306` BD: COLORS BANGLA (FHD) [FHD] *
- `414` BD_DESHITV HD [HD] *
- `183` IN: Colors_Bengali_HD [HD] [icon] *
- `999` BD: iTV *
- `406` BD_Discovery_Channel_Bengali *
- `3753` BD : SUN Bangla (4K) [4K] [icon]
- `98884` BD: JALSHA MOVIES (4K). [4K] [icon]
- `98883` BD: STAR JALSHA (4K). [4K] [icon]
- `98881` BD: ZEE BANGLA (4K). [4K] [icon]
- `23304` BD: JALSHA MOVIES (FHD) [FHD] [icon]
- `23218` BD: Star Jalsha (FHD) [FHD] [icon]
- `425` BD: STAR JALSHA MOVIES FHD [FHD] [icon]
- `1035` BD: TIMES24 TV FHD [FHD]
- `23305` BD: ZEE BANGLA (FHD) [FHD]
- `413` BD_Songsad TV FHD [FHD] [icon]
- `198` BD : Star Jalsa HD [HD] [icon]
- `427` BD: ATN NEWS HD [HD]
- `429` BD: BOISAKHI HD [HD] [icon]
- `3801` BD: enter 10 bangla HD [HD]
- `767` BD: Gazi TV HD [HD]
- `4231` BD: GlobalTv_HD [HD]
- `3802` BD: Nagorik Tv HD [HD]
- `8540` BD: Star Jalsa (HD) [HD]
- `435` BD: ZEE BANGLA HD [HD] [icon]
- `390` BD_BOISAKHI HD [HD]
- `391` BD_CHANNEL 24 HD [HD]
- `434` BD_Channel 9 HD [HD]
- `420` BD_DBC HD [HD] [icon]
- `433` BD_Duronto TV HD [HD] [icon]
- `424` BD_NTV Bangla HD [HD]
- `401` BD_RTV HD [HD] [icon]
- `20622` IN: Travelxp HD (BANGLA) [HD]
- `355540` BD: 24 Ghanta SD [SD] [icon]
- `998` BD : BTV NEWS
- `3818` BD : BTvChattogram
- `3813` BD : ETV TV
- `3811` BD : News 18 Bangla
- `1000` BD : NRB TV
- `5436` BD: ABP Ananda
- `430` BD: ASIAN TV
- `431` BD: ATN BANGLA
- `3800` BD: ATN Bangla uk
- `3803` BD: Bangla Tv
- `426` BD: BANGLA VISION [icon]
- `3819` BD: calcutta News
- `34665` BD: CHANNEL I
- `271038` BD: Color Bangla Cinema
- `1034` BD: Deepto [icon]
- `2883` BD: DESHE BIDESHE
- `1036` BD: Maasranga TV [icon]
- `510520` BD: MOVIE BANGLA
- `3810` BD: News 24 Tv
- `376278` BD: Republic Bangla
- `3799` BD: RTV Music
- `3814` BD: SA Tv
- `2882` BD: TIME TV
- `3804` BD: Tv9 bangla
- `2885` BD: TV9Bangla
- `49615` BD: ZEE BANGLA CINEMA
- `144510` BD: Zee24Ghanta
- `1331` BD:DEEPTO TV [icon]
- `428` BD:Ekattor tv [icon]
- `396` BD_Aakaash Aath
- `399` BD_AnandaTV
- `402` BD_BANGLA TIMES [icon]
- `408` BD_Bijoy Tv
- `392` BD_Channel I UK [icon]
- `394` BD_DESH TV
- `404` BD_DHOOM MUSIC
- `423` BD_Independent TV
- `421` BD_Jamuna TV [icon]
- `397` BD_MOHONA TV [icon]
- `398` BD_MY TV [icon]
- `411` BD_Nexus TV
- `405` BD_Sangeet Bangali
- `422` BD_Somoy TV
- `410` BD_ZEE CINMEA Bangali
- `4049` IN: DD Bangla
- `4083` IN: SONY Aath

### PUNJABI (72 channels | 0 gems | 0 4K | 0 FHD | 12 HD)

- `1360` PB : DESI CHANNEL HD [HD] [icon]
- `1355` PB : PTC MUSIC HD [HD] [icon]
- `1379` PB : SADA TV HD [HD] [icon]
- `1904` PB: 5aabTV Gurbani HD [HD] [icon]
- `4436` PB: 7X Music  HD [HD]
- `4441` PB: 9X_Tashan HD [HD] [icon]
- `4443` PB: ABP Sanjha HD [HD] [icon]
- `989` PB: Brit Asia HD [HD] [icon]
- `4427` PB: Ghaint Punjab HD [HD] [icon]
- `527` PB: Hamdard Laugther HD [HD] [icon]
- `42` PB: PTC Punjabi Gold HD [HD] [icon]
- `550` PB: Steelbird Music HD [HD] [icon]
- `355552` PB: Daily Post Punjab Haryana Himachal SD [SD]
- `355555` PB: Living India News SD [SD]
- `534596` Balle Balle
- `5464` IN: BRIT ASIA [icon]
- `529` KABBADI [icon]
- `227` PB :  Pitaara [icon]
- `1362` PB : 5AAB TV [icon]
- `1361` PB : Boogle Bollywood [icon]
- `1367` PB : DD Punjabi [icon]
- `1356` PB : JUS One [icon]
- `1359` PB : Namdhari TV [icon]
- `1374` PB : News18 Punjab/Haryana/Himachal
- `988` PB : Punjabi Melodies [icon]
- `1378` PB : SADA PUNJAB [icon]
- `982` PB : Sangat TV [icon]
- `1368` PB : Sanjha TV [icon]
- `1357` PB : SARDARI TV  [icon]
- `1375` PB : SIKH Channel Usa [icon]
- `606439` PB : Zee Alpha ETC
- `1373` PB : Zee Punjabi News [icon]
- `606227` PB | PTC PUNJABI [icon]
- `606244` PB | PTC PUNJABI | UK [icon]
- `606245` PB | PTC PUNJABI | USA [icon]
- `4437` PB:  DESI TV [icon]
- `547` PB: 5AAB TV [icon]
- `528` PB: Akaal Channel [icon]
- `540` PB: AMRITWANI [icon]
- `43` PB: Balle Balle [icon]
- `554` PB: BBC Toronto [icon]
- `4430` PB: CHANNEL Y [icon]
- `548` PB: DESI CHANNEL [icon]
- `84` PB: Dukh Niwaran Ludhiana [icon]
- `537` PB: Dukh Niwaran Sahib Surrey [icon]
- `544` PB: Dukh Niwaran TV [icon]
- `4426` PB: Ekta TV Gurbani [icon]
- `2016` PB: FATEH TV [icon]
- `530` PB: Garv Punjab Gurbani [icon]
- `4442` PB: GDNS Ludhiana [icon]
- `4431` PB: GURBANI HEALING
- `83` PB: Gurdwara Dukh Nivaran (BC) [icon]
- `542` PB: Gurvaani TV [icon]
- `526` PB: JUS Punjabi [icon]
- `88` PB: MH ONE  [icon]
- `371561` PB: MH One Shraddha
- `539` PB: NAMDHARI TV [icon]
- `531` PB: PARDESI [icon]
- `532` PB: Pitaara Tv [icon]
- `557` PB: Politics Punjabi [icon]
- `538` PB: PRIME ASIA [icon]
- `39` PB: PTC CHAKDE [icon]
- `4432` PB: PTC News (PUNJABI) [icon]
- `171` PB: PTC PUNJABI [icon]
- `40` PB: PTC SIMRAN [icon]
- `1903` PB: PTN 24 [icon]
- `546` PB: PTV Pardesi [icon]
- `552` PB: Vision Punjab [icon]
- `87` PB: Vision Punjab Gurbani [icon]
- `85` PB: Vision Punjab TV [icon]
- `52082` PB: ZEE PUNJABI [icon]
- `1055` PB:Sikh Channel USA [icon]

### NEPAL (71 channels | 1 gems | 4 4K | 2 FHD | 31 HD)

- `637986` NEPAL:  ABC News HD [HD] *
- `638009` NEPAL:  Zee Nepal 4K [4K]
- `638090` NEPAL: Koshi 4K [4K]
- `638093` NEPAL: Plus 1 4k [4K]
- `638076` NEPAL: Space 4K [4K]
- `6211` |NP| NTV NATIONAL FHD [FHD] [icon]
- `6219` |NP| NTV NATIONAL FHD [FHD] [icon]
- `637979` NEPAL:  AP1 HD [HD]
- `637997` NEPAL:  Arena TV HD [HD]
- `638028` NEPAL:  BM HD [HD]
- `637993` NEPAL:  Bodhi TV HD [HD]
- `638042` NEPAL:  Capital TV HD [HD]
- `638010` NEPAL:  Divya Darshan HD [HD]
- `637991` NEPAL:  Fashion TV Asia HD [HD]
- `638083` NEPAL:  Himalaya Premium HD [HD]
- `637984` NEPAL:  Himalaya TV HD [HD]
- `637985` NEPAL:  Image HD [HD]
- `637988` NEPAL:  Janata HD [HD]
- `638000` NEPAL:  Kalika HD [HD]
- `638037` NEPAL:  Kastamandap Gold HD [HD]
- `638026` NEPAL:  Lumbini TV HD [HD]
- `638013` NEPAL:  Mithila TV HD [HD]
- `638030` NEPAL:  Mukundasen HD [HD]
- `637989` NEPAL:  News Asia HD [HD]
- `637980` NEPAL:  NTV News HD [HD]
- `637981` NEPAL:  NTV Plus HD [HD]
- `637998` NEPAL:  Prime HD [HD]
- `638011` NEPAL:  Rapti Darpan HD [HD]
- `638015` NEPAL:  Yoho TV HD [HD]
- `638073` NEPAL: A News HD [HD]
- `638099` NEPAL: Animax HD [HD]
- `638061` NEPAL: GNN HD [HD]
- `638055` NEPAL: Makalu TV HD [HD]
- `638069` NEPAL: Nagarik TV HD [HD]
- `638085` NEPAL: Prisma TV HD [HD]
- `638058` NEPAL: RAY TV HD [HD]
- `638089` NEPAL: Sanghu TV HD [HD]
- `637982` NEPAL:  Avenues TV
- `638025` NEPAL:  Birat Television
- `638046` NEPAL:  Buddha Awaaz
- `638020` NEPAL:  Channel ACE
- `638031` NEPAL:  Deep TV
- `638054` NEPAL:  GTV
- `638050` NEPAL:  Hungama  TV
- `638066` NEPAL:  Khwopa TV
- `638008` NEPAL:  Life Ok Nepal
- `637994` NEPAL:  Mega TV
- `638002` NEPAL:  Namaste Khowpa
- `638045` NEPAL:  National Gold
- `637990` NEPAL:  Nepal Mandal
- `637983` NEPAL:  News 24
- `638021` NEPAL:  News Nepal
- `638012` NEPAL:  Omkar Television
- `638005` NEPAL:  Paryawaran TV
- `638043` NEPAL:  Prithivi TV
- `638038` NEPAL:  Red TV
- `637987` NEPAL:  Sagarmatha TV
- `638047` NEPAL:  Saptrangi
- `638029` NEPAL:  TV Birgunj
- `638001` NEPAL:  Tv Today Janakpur
- `638059` NEPAL: Aam Nepali TV
- `638064` NEPAL: Anjan TV
- `638072` NEPAL: Him Shikhar TV
- `638097` NEPAL: Korean Drama Active
- `638095` NEPAL: Nepa TV
- `638079` NEPAL: Nepal Network TV
- `638060` NEPAL: News 18
- `638080` NEPAL: Public Tv
- `638086` NEPAL: Rodhi TV
- `638071` NEPAL: Samata TV
- `6216` |NP| KANTIPUR TV [icon]

### ROMANIA (69 channels | 16 gems | 0 4K | 0 FHD | 0 HD)

- `210936` RO: BOOMERANG *
- `210937` RO: CARTOON NETWORK *
- `210945` RO: DISCOVERY CHANNEL *
- `210946` RO: DISCOVERY SCIENCE *
- `210947` RO: DISCOVERY WORLD *
- `210949` RO: DISNEY JUNIOR *
- `210960` RO: HBO 2 *
- `210961` RO: HBO 3 *
- `210962` RO: HBO ROMANIA *
- `210963` RO: HISTORY CHANNEL *
- `210965` RO: INVESTIGATION DISCOVERY *
- `210972` RO: NAT GEO WILD *
- `210975` RO: NICKELODEON *
- `210976` RO: NICKTOONS *
- `210989` RO: TLC *
- `211000` RO: VIASAT HISTORY *
- `210929` RO: ANTENA 1
- `210931` RO: ANTENA STARS
- `210932` RO: AXN
- `210933` RO: AXN SPIN
- `210934` RO: AXN WHITE
- `210935` RO: BOLLYWOOD TV
- `210938` RO: CINEMARATON
- `210939` RO: CINEMAX 2
- `210940` RO: CINETHRONIX
- `210941` RO: CRIME & INVESTIGATION
- `210942` RO: DIGI 24
- `210943` RO: DIGI ANIMAL WORLD
- `211003` RO: Digi Sport 1
- `211004` RO: Digi Sport 2
- `211005` RO: Digi Sport 3
- `211006` RO: Digi Sport 4
- `210944` RO: DIGI WORLD
- `210951` RO: E! ENTERTAINMENT
- `210952` RO: EPIC DRAMA
- `210953` RO: ETNO
- `210954` RO: FAVORIT TV
- `210955` RO: FILM CAFE
- `210956` RO: FILM NOW
- `210957` RO: FISHING & HUNTING
- `210958` RO: FOOD NETWORK
- `210959` RO: HAPPY CHANNEL
- `210964` RO: HORA TV
- `210966` RO: JIM JAM
- `210967` RO: KANAL D
- `210968` RO: KISS TV
- `210969` RO: MINIMAX
- `210970` RO: MOOZ DANCE
- `210971` RO: MUSIC CHANNEL
- `210974` RO: NATIONAL TV
- `210977` RO: PRIMA TV
- `210978` RO: PRO 2
- `210979` RO: PRO CINEMA
- `210981` RO: PRO TV
- `210982` RO: PRO TV INTERNATIONAL
- `210983` RO: PRO X
- `210985` RO: REALITATEA PLUS
- `210986` RO: ROMANIA TV
- `210987` RO: SPERANTA TV
- `210990` RO: TRAVEL CHANNEL
- `210991` RO: TRAVEL MIX
- `210992` RO: TRINITAS TV
- `210993` RO: TV 1000
- `210994` RO: TV PAPRIKA
- `210928` RO: TVR 3
- `210997` RO: TVR INTERNATIONAL
- `210998` RO: UTV
- `211001` RO: VIASAT NATURE
- `211002` RO: ZU TV

### ISRAEL (66 channels | 9 gems | 0 4K | 5 FHD | 28 HD)

- `348102` Is: Yes Animal Planet HD [HD] *
- `348101` Is: Yes Discovery Channel HD [HD] *
- `348103` Is: Yes History HD [HD] *
- `348124` Is: Yes TeenNick HD [HD] *
- `348190` IS: Yes Hot Comedy Central *
- `348192` IS: Yes Hot HBO *
- `348136` Is: Yes MTV 00s *
- `348131` IS: Yes Sky News *
- `348135` Is: Yes TLC *
- `348157` Is: Yes Channel 11 FHD [FHD]
- `348071` Is: Yes Sport 1 FHD [FHD]
- `348220` IS: Yes Sport 2 FHD [FHD]
- `348073` Is: Yes Sport 3 FHD [FHD]
- `348074` Is: Yes Sport 4 FHD [FHD]
- `348151` IS: Yes 5SPORT HD [HD]
- `348152` IS: Yes Action HD [HD]
- `348168` IS: Yes Docu HD [HD]
- `348169` IS: Yes Drama HD [HD]
- `348122` Is: Yes Junior HD [HD]
- `348067` Is: Yes Kneset HD [HD]
- `348086` Is: Yes Movies Action HD [HD]
- `348088` Is: Yes Movies Comedy HD [HD]
- `348089` Is: Yes Movies Drama HD [HD]
- `348087` Is: Yes Movies Kids HD [HD]
- `348206` IS: Yes Music IL HD [HD]
- `348080` Is: Yes One 1 Sport HD [HD]
- `348211` IS: Yes One 2 HD [HD]
- `348219` IS: Yes Sport 1 HD [HD]
- `348072` Is: Yes Sport 2 HD [HD]
- `348221` IS: Yes Sport 3 HD [HD]
- `348223` IS: Yes Sport 4 HD [HD]
- `348075` Is: Yes Sport 5 HD [HD]
- `348076` Is: Yes Sport 5 Live HD [ Live Match ] [HD]
- `348078` Is: Yes Sport 5 Stars HD [HD]
- `348091` Is: Yes TV Action HD [HD]
- `348092` Is: Yes TV Comedy HD [HD]
- `348090` Is: Yes TV Drama HD [HD]
- `348110` Is: Yes Zoom HD [HD]
- `348147` Is: Yes 12 Keshet IL SD [SD]
- `348148` IS: Yes 13 Reshet
- `348081` Is: Yes Baby TV
- `348159` IS: Yes Channel 13
- `348128` Is: Yes Channel 24
- `348068` Is: Yes Channel 33 [ Makan TV ]
- `348161` IS: Yes Channel 66
- `348094` Is: Yes Channel 9
- `348129` Is: Yes Channel 98
- `348170` IS: Yes Ego Total
- `348106` Is: Yes Food Channel
- `348069` Is: Yes Hala TV
- `348085` Is: Yes Health
- `348105` Is: Yes Home +
- `348181` IS: Yes HOP! Childhood
- `348188` IS: Yes Hot Cinema 3
- `348193` IS: Yes HOT Romantic Series
- `348098` Is: Yes Hot Zone
- `348109` Is: Yes Kabbalah TV
- `348200` IS: Yes Knesset
- `348204` IS: Yes Mikan
- `348079` Is: Yes Sport 5 Gold
- `348077` Is: Yes Sport 5 Plus
- `348119` Is: YES TRAVEL CHANNELL
- `348228` IS: Yes Turkish Drama 2
- `348229` IS: Yes Turkish Drama 3
- `348232` IS: Yes TVCI
- `348121` Is: YES Yam Tihoni

### TAMIL | ENTERTAINMENT (64 channels | 11 gems | 6 4K | 6 FHD | 24 HD)

- `98911` Tamil: Colors Tamil (4K). [4K] [icon] *
- `98898` Tamil: VIJAY TV (4K). [4K] [icon] *
- `9970` Tamil: Colors Tamil (FHD) [FHD] [icon] *
- `9969` Tamil: VIJAY TV (FHD)  [FHD] [icon] *
- `5886` TM: COLORS TAMIL HD [HD] [icon] *
- `158` TM: SUN TV HD [HD] [icon] *
- `5921` TM: SUN TV HD [HD] *
- `5922` TM: SUN TV HD [HD] [icon] *
- `5923` TM: SUN TV HD  [HD] [icon] *
- `1634` TM: VIJAY TV HD [HD] [icon] *
- `76343` TAMIL: SUN TV USA *
- `98900` Tamil: SUN-MUSIC (4K). [4K] [icon]
- `98899` Tamil: SUNTV (4K). [4K] [icon]
- `98897` Tamil: Zee Tamil (4K). [4K] [icon]
- `188` TM: JAYA TV (4K) [4K] [icon]
- `23321` Tamil: SUN-MUSIC (FHD) [FHD] [icon]
- `23320` Tamil: SUNTV (FHD) [FHD] [icon]
- `9971` Tamil: Zee Tamil (FHD) [FHD] [icon]
- `5916` TM: STAR VIJAY INDIA FHD [FHD] [icon]
- `5881` TM: ANGEL TV HD [HD] [icon]
- `189` TM: ANGEL TV HD [HD] [icon]
- `5882` TM: ANGEL TV HD [HD] [icon]
- `5883` TM: ANGEL TV HD [HD] [icon]
- `57` TM: COLOR TAMIL HD [HD] [icon]
- `5903` TM: MAKKAL TV HD [HD] [icon]
- `5910` TM: PUTHIYA THALAIMURAI TV HD [HD]
- `5913` TM: RAJ TV HD [HD] [icon]
- `222` TM: SONY BBC EARTH HD [HD] [icon]
- `157` TM: STAR VIJAY HD [HD] [icon]
- `5915` TM: STAR VIJAY HD [HD] [icon]
- `5917` TM: STAR VIJAY HD (Vip) [HD] [icon]
- `5919` TM: SUN LIFE HD [HD] [icon]
- `5918` TM: SUN LIFE HD [HD]
- `159` TM: SUN MUSIC HD [HD] [icon]
- `5920` TM: SUN MUSIC HD VIP (USA) [HD]
- `5931` TM: VENDHAR TV HD [HD] [icon]
- `5930` TM: ZEE TAMIL HD (USA) [HD] [icon]
- `46743` TAMIL: CHITHIRAM
- `26162` Tamil: D TAMIL
- `26165` Tamil: ISAI ARUVI [icon]
- `26164` Tamil: MEGA MUSIQ [icon]
- `28141` Tamil: MEGA TV
- `29086` TAMIL: MURASU TV [icon]
- `36653` TAMIL: SRI SHANKARA TAMIL
- `111034` Tamil: THANTHI TV [icon]
- `9972` TAMIL: TRAVEL XP 
- `23869` TAMIL: VIJAY MUSIC [icon]
- `240` TM: JAYA MAX [icon]
- `1615` TM: JAYA PLUS [icon]
- `5895` TM: JAYA TV [icon]
- `9018` TM: KALAIGNAR TV [icon]
- `5902` TM: MADHA TV [icon]
- `9023` TM: MALAI MURASU TV
- `5909` TM: PEPPERS TV
- `1617` TM: POLIMER TV [icon]
- `5912` TM: PUTHU YUGAmM TV [icon]
- `1616` TM: RAJ DIGITAL PLUS [icon]
- `9024` TM: RAJ MUSIX TAMIL [icon]
- `1619` TM: RAJ TV [icon]
- `1612` TM: SUN LIFE [icon]
- `376319` TM: Tamil Janam
- `9020` TM: VASANTH TV [icon]
- `1624` TM: VENDHAR TV [icon]
- `225` TM: ZEE TAMIL [icon]

### ISLAMIC (62 channels | 0 gems | 0 4K | 0 FHD | 6 HD)

- `319480` Islam | Ar: Bahrain Quran HD [HD]
- `319463` Islam | Ar: Saudia Quran HD [HD]
- `319464` Islam | Ar: Saudia Sunnah HD [HD]
- `4664` KSA: Saudi ch for Quran HD [HD] [icon]
- `4662` KSA: Saudi Ch for Sunnah HD [HD]
- `1081` PK : Makkah Live HD [HD] [icon]
- `102603` IMAM HUSSEIN 1
- `102604` IMAM HUSSEIN 2
- `102605` IMAM HUSSEIN 3
- `102602` IMAM HUSSEIN 4
- `102607` IMAM HUSSEIN 6
- `9637` Imam Hussein TV 1 [icon]
- `25080` IQRAA
- `319477` Islam | Ar: Al Erth Alnabawi TV
- `319475` Islam | Ar: Al Fateh Quran
- `319499` Islam | Ar: Al Insan TV
- `319488` Islam | Ar: Al Istiqama TV
- `319476` Islam | Ar: Al Nada TV
- `319481` Islam | Ar: Al Nas TV
- `319468` Islam | Ar: Al Rahma
- `319489` Islam | Ar: Al Shams
- `319494` Islam | Ar: Al Sirat
- `319501` Islam | Ar: Azhari TV
- `319484` Islam | Ar: Bin Othaimeen
- `319492` Islam | Ar: Eman Channel TV
- `319465` Islam | Ar: Iqraa TV
- `319471` Islam | Ar: Masr Quran Kareem
- `319469` Islam | Ar: Mecca
- `319472` Islam | Ar: Zad TV
- `4979` Karbala Live 1 [icon]
- `4980` Karbala Live 2 [icon]
- `4982` Karbala Live 4 [icon]
- `4983` Karbala Live 5 [icon]
- `4984` Karbala Live 6 [icon]
- `25079` MAKKAH TV [icon]
- `114` PK : MADANI CHANNEL
- `115` PK : PEACE TV URDU
- `127` PK: Ary Qtv
- `92` PK: Islam Channel Urdu [icon]
- `2495` PK: Madina Live
- `23272` PK: PAIGHAM PASHTO
- `23271` PK: PAIGHAM URDU
- `122766` PK: PEACE TV (ENGLISH) [icon]
- `319507` Quran TV:  ياسر الدوسري
- `319508` Quran TV: أجمل صوت قرآن مؤثر
- `319509` Quran TV: أذكار الصباح  د.محمد خير الشعال
- `319527` Quran TV: عبدالرحمن مسعد
- `319535` Quran: أحمد الحواشي Ahmad Al Hawashi
- `319548` Quran: رمضان شكور Ramadan Shakoor
- `319549` Quran: زكي داغستاني Zaki Daghistani
- `319561` Quran: عادل ريان Adel Rayyan
- `319568` Quran: عبد الودود حنيف Abdul Wadud Hunaif
- `319576` Quran: علي جابر Ali Jaber
- `319582` Quran: محمد أيوب Mohammed Ayyub
- `319589` Quran: مشاري العفاسي Mishary Alafasi
- `23960` UK : AHLULBAYT TV
- `142955` UK : IQRA BANGLA
- `142952` UK : ISLAM CHANNEL
- `142953` UK : ISLAM TV
- `24886` UK: Noor TV
- `102588` WIN TV
- `35736` ZAINABIA

### EGYPT (58 channels | 0 gems | 0 4K | 0 FHD | 10 HD)

- `309213` Eg| Al Hayat HD ✦ [HD]
- `309183` Eg| Al Nahar Drama HD  ✦ [HD]
- `309182` Eg| Al Nahar HD ✦ [HD]
- `309206` Eg| DMC HD ✦ [HD]
- `309188` Eg| Egyptian TV HD ✦ [HD]
- `309185` Eg| Masir AL Oula HD ✦ [HD]
- `309192` Eg| ON Drama HD ✦ [HD]
- `309193` Eg| ON E HD ✦ [HD]
- `309194` Eg| On Time Sport HD 1 ✦ [HD]
- `309195` Eg| On Time Sport HD 2 ✦ [HD]
- `309190` Eg| Al Ahly TV ✦
- `309210` Eg| Al Askandaria TV 5 ✦
- `309217` Eg| Al Basira TV ✦
- `309211` Eg| Al Delta TV 6 ✦
- `309246` Eg| Al Fath Sonnah TV ✦
- `309227` Eg| Al Hadath Al Youm [ Al Hadath Today ] ✦
- `309214` Eg| Al Hhayat Drama ✦
- `309215` Eg| Al Kahera Wal Nas 1 ✦
- `309216` Eg| Al Kahera Wal Nas 2 ✦
- `309209` Eg| Al Kanal TV 4 ✦
- `309184` Eg| Al Masryia ✦
- `309218` Eg| Al Nas ✦
- `309212` Eg| Al Saeed TV 5 ✦
- `309219` Eg| Al Seha Wal Jamal TV ✦
- `309242` Eg| Al-Mehwar TV ✦
- `309243` Eg| Azhari TV ✦
- `309221` Eg| CBC Drama TV ✦
- `309222` Eg| CBC Extra News TV ✦
- `309223` Eg| CBC Sofra TV ✦
- `309220` Eg| CBC TV ✦
- `309250` Eg| Cima ✦
- `309207` Eg| DMC Drama ✦
- `309247` Eg| El Mold ✦
- `309244` Eg| El Sharq TV ✦
- `309230` Eg| Madrastna 2 ✦
- `309245` Eg| Maspero Zaman ✦
- `309189` Eg| Mekameleen TV ✦
- `309241` Eg| Misr Al Balad ✦
- `309239` Eg| Misr Al Zera3eya ✦
- `309236` Eg| Mix Hollywood TV ✦
- `309200` Eg| Nile Cinema ✦
- `309202` Eg| Nile Comedy ✦
- `309204` Eg| Nile Drama ✦
- `309201` Eg| Nile Education ✦
- `309198` Eg| Nile Life ✦
- `309197` Eg| Nile News ✦
- `309199` Eg| Nile TV International ✦
- `309237` Eg| Nogoum FM TV ✦
- `309232` Eg| Panorama Drama PNC 2 ✦
- `309234` Eg| Panorama Food PNC ✦
- `309226` Eg| Sada El Balad Drama  ✦
- `309224` Eg| Sada El Balad ✦
- `309225` Eg| Sada El Balad+ 2 ✦
- `309235` Eg| Star Cinema 1 ✦
- `309238` Eg| Teba TV8 ✦
- `309228` Eg| TeN TV ✦
- `309191` Eg| Zamalek Sports ✦
- `309229` Eُg| Madrastna 1 ✦

### CRICKET (57 channels | 37 gems | 1 4K | 0 FHD | 1 HD)

- `155` CRI: SONY ESPN HD [HD] [icon] *
- `216` CRIC || EUROSPORTS ᴴᴰ [icon] *
- `150854` CRIC || SKY SPORT 1 ᶠᴴᴰ [icon] *
- `24018` CRIC || SKY SPORT 3 ᶠᴴᴰ [icon] *
- `12` CRIC || SKY SPORTS CRIC ᴴᴰ [icon] *
- `23566` CRIC || SKY SPORTS CRIC ⁴ᵏ [icon] *
- `114479` CRIC || SKY SPORTS CRIC ⁴ᵏ [icon] *
- `124269` CRIC || SKY SPORTS CRIC ⁴ᵏ [icon] *
- `148` CRIC || STAR SPORTS 1 ENG ᴴᴰ [icon] *
- `9397` CRIC || STAR SPORTS 1 ENG ᶠᴴᴰ [icon] *
- `124281` CRIC || STAR SPORTS 1 ENG ⁴ᵏ [icon] *
- `211` CRIC || STAR SPORTS 1 HINDI ᴴᴰ [icon] *
- `9399` CRIC || STAR SPORTS 1 HINDI ᶠᴴᴰ [icon] *
- `124287` CRIC || STAR SPORTS 1 HINDI ⁴ᵏ [icon] *
- `380977` CRIC || STAR SPORTS 1 KANNADA ᴴᴰ [icon] *
- `9722` CRIC || STAR SPORTS 1 TAMIL ⁴ᵏ [icon] *
- `177843` CRIC || STAR SPORTS 1 TELUGU ⁴ᵏ [icon] *
- `239` CRIC || STAR SPORTS 2 ENGLISH ᴴᴰ [icon] *
- `9398` CRIC || STAR SPORTS 2 ENGLISH ᶠᴴᴰ [icon] *
- `124284` CRIC || STAR SPORTS 2 ENGLISH ⁴ᵏ [icon] *
- `213049` CRIC || STAR SPORTS 2 HINDI ᶠᴴᴰ [icon] *
- `379753` CRIC || STAR SPORTS 2 TAMIL ⁴ᵏ [icon] *
- `379755` CRIC || STAR SPORTS 2 TELUGU ⁴ᵏ [icon] *
- `1080` CRIC || STAR SPORTS 3 ᴴᴰ [icon] *
- `612020` CRIC || STAR SPORTS KHEL [icon] *
- `238` CRIC || STAR SPORTS SELECT 1 ᴴᴰ [icon] *
- `148801` CRIC || STAR SPORTS SELECT 2 ᴴᴰ [icon] *
- `122979` CRIC || STARZPLAY CRICLIFE 1 ᶠᴴᴰ [icon] *
- `122980` CRIC || STARZPLAY CRICLIFE 2 ᶠᴴᴰ [icon] *
- `158897` CRIC || STARZPLAY CRICLIFE 3 ᶠᴴᴰ [icon] *
- `158442` CRIC || SUPERSPORTS ᴴᴰ [icon] *
- `2496` CRIC || SUPERSPORTS ᴴᴰ [icon] *
- `186627` CRIC || TNT SPORTS 1 ᶠᴴᴰ [icon] *
- `148090` CRIC || TNT SPORTS 3 ᶠᴴᴰ [icon] *
- `5040` CRIC || WILLOW 2 ᴴᴰ [icon] *
- `215` CRIC || WILLOW SPORTS ᴴᴰ [icon] *
- `23943` CRIC || WILLOW SPORTS ᴴᴰ [icon] *
- `333368` CRI: Star 4K [4K] [icon]
- `43444` CRIC || A SPORTS ᴴᴰ [icon]
- `43447` CRIC || A SPORTS ⁴ᵏ [icon]
- `2494` CRIC || ASTRO CRICKET ᴴᴰ [icon]
- `1856` CRIC || FOX CRIC 501 ᴴᴰ [icon]
- `101` CRIC || GEO SUPER ᴴᴰ [icon]
- `89` CRIC || PTV SPORTS ᴴᴰ [icon]
- `61674` CRIC || PTV SPORTS ⁴ᵏ [icon]
- `1039` CRIC || RTA SPORTS ᴴᴰ [icon]
- `154` CRIC || SONY SPORTS 1 ᴴᴰ [icon]
- `31314` CRIC || SONY SPORTS 2 ᴴᴰ [icon]
- `146` CRIC || SONY SPORTS 3 ᴴᴰ [icon]
- `635098` CRIC || SONY SPORTS 4 TELUGU [icon]
- `176` CRIC || SONY SPORTS 5 ᴴᴰ [icon]
- `18452` CRIC || T SPORTS ᴴᴰ [icon]
- `130714` CRIC || T SPORTS ᴴᴰ [icon]
- `113069` CRIC || T SPORTS ᴴᴰ [icon]
- `514856` CRIC || TEN CRICKET [icon]
- `98` CRIC || TEN SPORTS ᴴᴰ [icon]
- `269552` CRIC || THE PAPARE ᴴᴰ [icon]

### ENGLISH Movies 24/7 (51 channels | 1 gems | 0 4K | 0 FHD | 41 HD)

- `135885` ENGLISH-DISNEY MOVIES HD [HD] *
- `135923` ENGLISH-ACTION THRILLER MOVIES 2 HD [HD]
- `135881` ENGLISH-ALIEN MOVIES HD [HD]
- `135882` ENGLISH-ALVIN AND THE CHIPMUNKS MOVIES HD [HD]
- `135884` ENGLISH-DIE HARD MOVIES HD [HD]
- `135877` ENGLISH-FAST AND FURIOUS MOVIES HD [HD]
- `135886` ENGLISH-FINAL DESTINATION MOVIES HD [HD]
- `135887` ENGLISH-FINDING NEMO MOVIES HD [HD]
- `135888` ENGLISH-FRIDAY THE 13TH MOVIES HD [HD]
- `135889` ENGLISH-FROZEN MOVIES HD [HD]
- `136004` ENGLISH-HIT MOVIES 10 HD [HD]
- `135998` ENGLISH-HIT MOVIES 4 HD [HD]
- `135999` ENGLISH-HIT MOVIES 5 HD [HD]
- `136000` ENGLISH-HIT MOVIES 6 HD [HD]
- `136001` ENGLISH-HIT MOVIES 7 HD [HD]
- `136002` ENGLISH-HIT MOVIES 8 HD [HD]
- `136003` ENGLISH-HIT MOVIES 9 HD [HD]
- `135890` ENGLISH-HOME ALONE MOVIES HD [HD]
- `135891` ENGLISH-HOW TO TRAIN YOUR  DRAGON MOVIES HD [HD]
- `135896` ENGLISH-MEN IN BLACK MOVIES HD [HD]
- `135898` ENGLISH-NIGHT AT MUSEUM MOVIES HD [HD]
- `135899` ENGLISH-PARANORMAL ACTIVITY MOVIES HD [HD]
- `135900` ENGLISH-PIXAR MOVIES HD [HD]
- `135901` ENGLISH-PLANET OF THE APES MOVIES HD [HD]
- `135902` ENGLISH-RAMBO MOVIES HD [HD]
- `135904` ENGLISH-ROCKEY MOVIES HD [HD]
- `135905` ENGLISH-SAW MOVIES HD [HD]
- `135906` ENGLISH-SCARY MOVIES HD [HD]
- `135907` ENGLISH-SHREK MOVIES HD [HD]
- `136006` ENGLISH-SUPER HIT MOVIES 2 HD [HD]
- `136007` ENGLISH-SUPER HIT MOVIES 3 HD [HD]
- `136008` ENGLISH-SUPER HIT MOVIES 4 HD [HD]
- `136009` ENGLISH-SUPER HIT MOVIES 5 HD [HD]
- `136010` ENGLISH-SUPER HIT MOVIES 6 HD [HD]
- `135908` ENGLISH-SUPERMAN MOVIES HD [HD]
- `135883` ENGLISH-THE CONJURING MOVIES HD [HD]
- `135914` ENGLISH-THE MATRIX MOVIES HD [HD]
- `135917` ENGLISH-THE SECRET LIFE OF PETS MOVIES HD [HD]
- `135876` ENGLISH-THE TERMINATOR MOVIES HD [HD]
- `135878` ENGLISH-TOY STORY MOVIES HD [HD]
- `135879` ENGLISH-TRANSFORMERS MOVIES HD [HD]
- `136011` ENGLISH-WEBSERIES 24
- `136037` ENGLISH-WEBSERIES ATYPICAL
- `136015` ENGLISH-WEBSERIES BREAKOUT KINGS
- `136043` ENGLISH-WEBSERIES BROOKLYN NINE-NINE
- `136016` ENGLISH-WEBSERIES CALIFORNICATION
- `136044` ENGLISH-WEBSERIES CHEFS TABLE
- `136022` ENGLISH-WEBSERIES FLEABAG
- `136021` ENGLISH-WEBSERIES GRAVITY FALLLS
- `136025` ENGLISH-WEBSERIES HOMELAND
- `136026` ENGLISH-WEBSERIES HOUSE M.D

### TELUGU (48 channels | 1 gems | 9 4K | 6 FHD | 13 HD)

- `9016` Telugu: Zee Cinemalu HD [HD] [icon] *
- `98885` Telugu: ETV (4K). [4K] [icon]
- `9045` Telugu: ETV Cinema (4K) [4K] [icon]
- `98892` Telugu: GEMINI (4K). [4K] [icon]
- `23797` Telugu: GEMINI MOVIE (4K) [4K] [icon]
- `23796` Telugu: GEMINI MUSIC (4K) [4K] [icon]
- `98886` Telugu: STAR-MAA (4K). [4K] [icon]
- `98887` Telugu: STAR-MAA-MOVIE (4K). [4K] [icon]
- `98896` Telugu: ZEE-CINEMALU (4K). [4K] [icon]
- `98894` Telugu: ZEE-TELUGU (4K). [4K] [icon]
- `23312` Telugu: ETV (FHD) [FHD] [icon]
- `23315` Telugu: GEMINI (FHD) [FHD] [icon]
- `23313` Telugu: STAR-MAA (FHD) [FHD] [icon]
- `23314` Telugu: STAR-MAA-MOVIE (FHD) [FHD] [icon]
- `23317` Telugu: ZEE-CINEMALU (FHD) [FHD] [icon]
- `23316` Telugu: ZEE-TELUGU (FHD) [FHD] [icon]
- `9017` Telugu: Etv HD [HD] [icon]
- `9044` Telugu: GEMINI LIFE HD [HD] [icon]
- `212` Telugu: Gemini_Movies_HD [HD] [icon]
- `213` Telugu: Gemini_Music_HD [HD] [icon]
- `214` Telugu: Gemini_TV_HD [HD] [icon]
- `223` Telugu: Sony_BBC_Earth_HD_Telugu [HD] [icon]
- `9015` Telugu: STAR MAA MOVIES HD [HD] [icon]
- `168` Telugu: STAR MAA TV HD [HD] [icon]
- `9054` Telugu: SVBC HD [HD] [icon]
- `9049` Telugu: T News HD [HD] [icon]
- `9047` Telugu: TV9 NEWS HD [HD] [icon]
- `1605` Telugu: Zee Telugu HD [HD] [icon]
- `355093` Telugu: Aradana SD [SD]
- `243` IN: Raj Music Telugu
- `234` Telugu:  ABN_Andhra_Jyothi [icon]
- `52504` TELUGU:  RAJ NEWS [icon]
- `233` Telugu:  Sri_Venkateshwar_Bhakti [icon]
- `228` Telugu:  V6_News [icon]
- `34581` Telugu: BHAKTI TV [icon]
- `4053` Telugu: DD Saptagiri [icon]
- `9053` Telugu: ETV Abhiruchi [icon]
- `9046` Telugu: ETV AndhraPradesh [icon]
- `9052` Telugu: ETV Life
- `242` Telugu: ETV Plus [icon]
- `235` Telugu: NTV TELUGU [icon]
- `9048` Telugu: Sakshi TV (News) [icon]
- `9043` Telugu: STAR MAA GOLD
- `57772` TELUGU: Star Maa Music
- `170` Telugu: TV 5 News [icon]
- `244` Telugu: Vissa TV [icon]
- `693040` TL : CALVARY TV 
- `380447` TL: Zee Telugu News [icon]

### PPV (LIVE ONLY MATCH TIME) (48 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `628517` PPV EVENT 02: EARLY PRELIMS UFC 322 (11.15 6:00 PM ET)
- `628518` PPV EVENT 03: PRELIMS UFC 322 (11.15 8:00 PM ET)
- `628519` PPV EVENT 04: PRELIMS UFC 322 (11.15 8:00 PM ET)
- `628521` PPV EVENT 06: UFC 322 Maddalena vs. Makhachev (11.15 10:00 PM ET)
- `628522` PPV EVENT 07: UFC 322 Maddalena vs. Makhachev (11.15 10:00 PM ET)
- `628523` PPV EVENT 08: Post Fight Press Conference UFC 322 (11.16 1:15 AM ET)
- `628524` PPV EVENT 09: UAE Warriors 65 (11.15 9:00 AM ET)
- `628526` PPV EVENT 11: Cage Warriors 196 (11.15 3:00 PM ET)
- `628527` PPV EVENT 12: Eubank Jr vs. Benn 2 (11.15 11:45 AM ET)
- `628532` PPV EVENT 17: BKFC 84 Dyer vs. Hunt 2 (11.15 9:00 PM ET)
- `628538` PPV EVENT 23: Volusia Speedway Park (11.15 6:00 PM ET)
- `628543` PPV EVENT 28:
- `628544` PPV EVENT 29:
- `628546` PPV EVENT 31:
- `628547` PPV EVENT 32:
- `628548` PPV EVENT 33:
- `628549` PPV EVENT 34:
- `628550` PPV EVENT 35:
- `628551` PPV EVENT 36:
- `628553` PPV EVENT 38:
- `628554` PPV EVENT 39:
- `628555` PPV EVENT 40:
- `628558` PPV EVENT 43:
- `628559` PPV EVENT 44:
- `628560` PPV EVENT 45:
- `628561` PPV EVENT 46:
- `628562` PPV EVENT 47:
- `628564` PPV EVENT 49:
- `628565` PPV EVENT 50:
- `628566` PPV EVENT 51:
- `628567` PPV EVENT 52:
- `628568` PPV EVENT 53:
- `628569` PPV EVENT 54:
- `628570` PPV EVENT 55:
- `628571` PPV EVENT 56:
- `628572` PPV EVENT 57:
- `628573` PPV EVENT 58:
- `628574` PPV EVENT 59:
- `628575` PPV EVENT 60:
- `628576` PPV EVENT 61:
- `628578` PPV EVENT 63:
- `628579` PPV EVENT 64:
- `628580` PPV EVENT 65:
- `628581` PPV EVENT 66:
- `628582` PPV EVENT 67:
- `628583` PPV EVENT 68:
- `628584` PPV EVENT 69:
- `628585` PPV EVENT 70

### PAKISTAN NEWS (47 channels | 0 gems | 2 4K | 0 FHD | 16 HD)

- `256458` PK: ABN NEWS (4K) [4K] [icon]
- `257228` PK: BOL NEWS (4K) [4K] [icon]
- `138` PK : 24 NEWS HD [HD] [icon]
- `141` PK : 92 NEWS-HD [HD] [icon]
- `143` PK : ARY NEWS-HD [HD] [icon]
- `135` PK : BOL NEWS-HD [HD] [icon]
- `129` PK : GEO NEWS-HD [HD] [icon]
- `128` PK : GEO TEZ-HD [HD]
- `139` PK : GNN NEWS-HD [HD] [icon]
- `103` PK : HUM NEWS-HD [HD] [icon]
- `131` PK : PTV News-HD [HD] [icon]
- `23961` PK : VENUS-HD [HD]
- `6626` PK: 24 NEWS-HD [HD] [icon]
- `90` PK: 365 NEWS HD [HD]
- `371556` PK: AIK NEWS HD [HD]
- `371557` PK: CITY 21 NEWS HD [HD]
- `861` PK: LAHORE NEWS-HD [HD] [icon]
- `291216` PK: TIMES NEWS HD [HD]
- `137` PK : AAJ NEWS
- `136` PK : ABB TAK [icon]
- `132` PK : CAPITAL TV NEWS [icon]
- `102` PK : Channel5
- `133` PK : DAWN NEWS [icon]
- `134` PK : DUNYA NEWS [icon]
- `130` PK : KHYBER NEWS [icon]
- `142` PK : NEWS ONE [icon]
- `1384` PK : PUBLIC NEWS
- `140` PK : SAMAA NEWS [icon]
- `113` PK : WASEB TV
- `868` PK: AVT KHYBER NEWS
- `866` PK: CITY 41 NEWS
- `865` PK: CITY 42 NEWS
- `58` PK: EXPRESS NEWS [icon]
- `4058` PK: GTV NETWORK
- `860` PK: LAHORE RUNG [icon]
- `2009` PK: NEO NEWS  [icon]
- `140919` PK: PTV NATIONAL 
- `2010` PK: ROZE NEWS [icon]
- `2505` PK: SINDH NEWS [icon]
- `127413` PK: SUNO TV [icon]
- `18165` PK: TV TODAY
- `169960` PK: VSH NEWS [icon]
- `18163` PK: WASEEB TV [icon]
- `1851` PK:METRO 1
- `39419` UK: 92 NEWS [icon]
- `69547` UK: ARY WORLD NEWS
- `4087` UK: HUM NEWS [icon]

### INDIAN NEWS (47 channels | 5 gems | 3 4K | 0 FHD | 3 HD)

- `9116` IN: CNBC Awaaz (News) HD [HD] [icon] *
- `9117` IN: CNBC Tv 18 (News) [icon] *
- `247` IN: NDTV 24x7 [icon] *
- `7430` IN: NDTV INDIA [icon] *
- `7437` IN: NDTV Profit (news) [icon] *
- `4043` IN:  DD News (4K) [4K] [icon]
- `23795` IN: AAJTAK (4K) [4K] [icon]
- `155585` IN: TimesNow NavaBharat (4K) [4K] [icon]
- `9080` IN: Republic TV HD [HD] [icon]
- `124897` Times Now World HD [HD] [icon]
- `355095` IN: Bharat Samachar SD [SD]
- `355487` IN: INH 24X7 SD [SD]
- `355554` IN: Khabarain Abhi Tak SD [SD]
- `355507` IN: News 24 SD [SD]
- `355509` IN: News India 24x7 SD [SD]
- `355510` IN: News State MP CG SD [SD]
- `355557` IN: News18 Bihar Jharkhand SD [SD]
- `355511` IN: News18 MP Chhattisgarh SD [SD]
- `355562` IN: Zee Bharat SD [SD]
- `5409` IN:  Aaj_Tak [icon]
- `7260` IN:  ABP NEWS [icon]
- `23248` IN:  India News [icon]
- `23247` IN:  India TV NEWS [icon]
- `379763` IN:  TV9 BHARATVARSH
- `9974` IN: 1st India (News) [icon]
- `355094` IN: Bharat 24
- `371555` IN: First India Rajasthan
- `156011` IN: GNT NEWS
- `9041` IN: Good news TV [icon]
- `371558` IN: IBC 24
- `371559` IN: India Daily Live
- `7431` IN: India news [icon]
- `35714` IN: INDIA TODAY (News) [icon]
- `2436` IN: NEWS 18 INDIA [icon]
- `374586` IN: NEWS LIVE
- `7436` IN: News18 India (News) [icon]
- `7435` IN: News18 News UP [icon]
- `37071` IN: News18 Rajasthan [icon]
- `609629` IN: REPUBLIC BHARAT [icon]
- `376295` IN: Swadesh News
- `9481` IN: WION TV [icon]
- `23938` IN: Zee Business (News) [icon]
- `9725` IN: Zee MP (News)
- `7259` IN: Zee News [icon]
- `7063` IN: Zee Rajasthan news
- `9056` IN:Republic TV (English)
- `25076` SADHNA TV [icon]

### KIDS (46 channels | 29 gems | 4 4K | 1 FHD | 9 HD)

- `19741` IN: Disney Channel (4K) [4K] [icon] *
- `20925` IN: DISNEY INTERNATIONAL (4K) [4K] [icon] *
- `98880` IN: NICK (4K). [4K] [icon] *
- `7438` IN: Nick+ FHD [FHD] *
- `8` IN : CARTOON NETWORK HD [HD] *
- `319408` Kids | Ar: NickToons HD [HD] *
- `319416` Kids | En: NickToons HD [HD] *
- `319402` Kids:  Cartoon Network Arabia HD [HD] *
- `319409` Kids: OSN Nickelodeon HD [HD] *
- `319405` Kids: Rotana Kids HD [HD] *
- `1066` UK : CARTOON NETWORK HD [HD] *
- `49` USA: DISNEY JR HD [HD] *
- `205` IN:  Nick_Hindi *
- `208` IN: Discovery_Kids_1 *
- `35713` IN: Disney Junior *
- `207676` IN: DISNEY JUNIOR (MULTI AUDIO) *
- `206` IN: Nick_Junior *
- `18457` Kids: Nick Pakistan *
- `127762` Malayalam: Nicklodean Sonic [icon] *
- `66164` TAMIL: DISCOVERY KIDS *
- `66163` TAMIL: NICK *
- `1067` UK : BOOMERANG *
- `561` UK : NICK JR  *
- `26` UK: Cbeebies *
- `269` UK:Nickelodeon *
- `951` US: Cartoon Network *
- `45` USA: Boomerang *
- `38` USA: NICK JR *
- `37` USA: Nickelodeon *
- `117177` IN: CN HD + (4K) [4K] [icon]
- `319407` Kids:  OSN Kids Zone HD [HD]
- `1918`  IN: Pogo_Hindi
- `7220` IN: POGO (ENGLISH)
- `207` IN: sonic_Hindi
- `204` IN: Sony_Yay_Hindi
- `319411` Kids:  HodHod  TV
- `319406` Kids:  Karamesh
- `319410` Kids: Baby TV
- `18456` Kids: Hungama
- `319413` Kids: Majid Kids TV
- `66162` KIDS: SUPER HUNGAMA
- `319403` Kids: Toyor Aljana
- `1653` PT : Baby TV
- `66165` TAMIL: POGO
- `1069` UK : BABY TV
- `144123` UK : TINY POP

### INDIAN SD (46 channels | 6 gems | 1 4K | 0 FHD | 3 HD)

- `241` IN : Colors Rishtey TV *
- `23917` IN:  Discovery Turbo [icon] *
- `5250` IN:  Discovery_Channel_Hindi *
- `4745` IN: Discovery Science *
- `973` IN: SONY MAX 2 *
- `3744` IN: STAR PLUS *
- `4044` IN:  DD Sports (4K) [4K] [icon]
- `4037` IN:  DD National HD [HD]
- `257656` IN: Sanskar TV HD [HD]
- `9885` IN: SONY HD [HD]
- `354291` IN: Aastha SD [SD]
- `355253` IN: BIG MAGIC SD [SD]
- `355278` IN: Dangal 2 SD [SD]
- `355478` IN: Goldmines_SD [SD]
- `355556` IN: Manoranjan Grand SD [SD]
- `53107` DANGAL
- `968` IN : B4U Movies
- `5249` IN:  Animal_Planet_Hindi
- `4038` IN:  DD Bihar
- `4045` IN:  DD India
- `4041` IN:  DD Kashir
- `4050` IN:  DD Sahayadri
- `4048` IN:  DD Uttar Pradesh
- `355541` IN: Aastha Bhajan
- `4040` IN: DD Bharati
- `4039` IN: DD India
- `4042` IN: DD Kisan
- `371447` IN: DD Madhya Pradesh
- `257048` IN: DD Urdu
- `9487` IN: E24
- `250` IN: Food Food
- `9975` IN: Food Food
- `7432` IN: India TV [icon]
- `371560` IN: Jinvani
- `2433` IN: MANORANJAN TV
- `6627` IN: Sony Pal
- `4077` IN: SONY WAH
- `972` IN: STAR GOLD ROMANCE
- `158970` IN: Star Utsav [icon]
- `4324` IN: Star_Gold_2
- `967` IN: Zee Action
- `203` IN: Zee Anmol
- `7065` IN: Zee Anmol Cinema
- `7064` IN: Zee Classic
- `7720` IN: Zee Hindustan [icon]
- `4065` IN: Zee Salam

### MBC ARABIC (46 channels | 46 gems | 17 4K | 3 FHD | 16 HD)

- `308931` MBC 1 4K [4K] *
- `308932` MBC 2 4K [4K] *
- `308933` MBC 3 4K [4K] *
- `308934` MBC 4 4K [4K] *
- `308935` MBC 5 4K [4K] *
- `308936` MBC Action 4K [4K] *
- `308937` MBC Bollywood 4K [4K] *
- `308938` MBC Drama + 4K [4K] *
- `308939` MBC Drama 4K [4K] *
- `308940` MBC Iraq 4K [4K] *
- `308941` MBC Masr 1 4K [4K] *
- `308942` MBC Masr 2 4K [4K] *
- `308943` MBC Max 4K [4K] *
- `308944` MBC Panorama 4K [4K] *
- `308945` MBC Persian 4K [4K] *
- `308946` MBC Variety 4K [4K] *
- `308947` MBC Wanasah 4K [4K] *
- `308908` MBC 3 FHD [FHD] *
- `308923` MBC Masr 2 FHD [FHD] *
- `308930` MBC Persia FHD [FHD] *
- `308905` MBC 1 HD [HD] *
- `308906` MBC 2 HD [HD] *
- `308907` MBC 3 HD [HD] *
- `308909` MBC 4 HD [HD] *
- `308910` MBC 5 HD [HD] *
- `308912` MBC Action HD [HD] *
- `308916` MBC Drama HD [HD] *
- `308917` MBC Drama+ HD [HD] *
- `308928` MBC FM HD [HD] *
- `308919` MBC Iraq HD [HD] *
- `308921` MBC Masr 1 HD [HD] *
- `308922` MBC Masr 2 HD [HD] *
- `308914` MBC Max HD [HD] *
- `308927` MBC Panorama HD [HD] *
- `308915` MBC Variety HD [HD] *
- `308925` MBC Wanasah HD [HD] *
- `308948` MBC 1 SD [SD] *
- `308949` MBC 2 SD [SD] *
- `308950` MBC 3 SD [SD] *
- `308951` MBC 4 SD [SD] *
- `308952` MBC 5 SD [SD] *
- `308953` MBC Action SD [SD] *
- `308954` MBC Bollywood SD [SD] *
- `308955` MBC Drama SD [SD] *
- `308956` MBC Iraq SD [SD] *
- `308957` MBC Max SD [SD] *

### SWEDEN (45 channels | 11 gems | 0 4K | 0 FHD | 0 HD)

- `660727` SE: Cartoon Network *
- `660714` SE: Discovery Channel *
- `660741` SE: Eurosport 1 *
- `660742` SE: Eurosport 2 *
- `660720` SE: HISTORY *
- `660721` SE: HISTORY 2 *
- `660719` SE: ID Investigation Discovery (S) *
- `660715` SE: National Geographic *
- `660725` SE: Nick Jr. *
- `660724` SE: Nickelodeon *
- `660726` SE: Nicktoons *
- `660705` SE: 4 Fakta
- `660706` SE: 4 Film
- `660734` SE: 4 Futboll
- `660707` SE: 4 Guld
- `660735` SE: 4 Hockey
- `660736` SE: 4 Motor
- `660733` SE: 4 Sportkanalen
- `660710` SE: ATG Live
- `660711` SE: Axess TV
- `660713` SE: BBC Nordic
- `660708` SE: Godare
- `660703` SE: Kanal 11
- `660697` SE: Kanal 5
- `660701` SE: Kanal 9
- `660712` SE: Kunskapskanalen
- `660722` SE: Love Nature
- `660699` SE: Sjuan
- `660723` SE: SVT Barn
- `660693` SE: SVT1
- `660694` SE: SVT2
- `660702` SE: TV10
- `660704` SE: TV12
- `660696` SE: TV4
- `660700` SE: TV8
- `660728` SE: V Film Action
- `660729` SE: V Film Family
- `660731` SE: V Film Premiere
- `660732` SE: V Series
- `660739` SE: V sport 1
- `660737` SE: V sport extra
- `660740` SE: V Sport Motor
- `660738` SE: V sport vinter
- `660716` SE: Viasat Explore
- `660717` SE: Viasat Nature

### ARABIC NEWS (44 channels | 12 gems | 3 4K | 1 FHD | 12 HD)

- `319261` News | Ar: Al Jazeera 4K ✦ [4K] *
- `319260` News | Ar: Al Jazeera HD [HD] *
- `319285` News | Ar: France 24 Arabic HD ✦ [HD] *
- `319272` News | Ar: Sky News Arabic HD ✦ [HD] *
- `319286` News | Ar: France 24 Arabic SD ✦ [SD] *
- `319273` News | Ar: Sky News Arabic SD ✦ [SD] *
- `319264` News | Ar: Al Jazeera Mubasher 2 ✦ *
- `319263` News | Ar: Al Jazeera Mubasher ✦ *
- `319294` News | Ar: CNBC Arabiya ✦ *
- `319265` News | En: Al Jazeera English ✦ *
- `319284` News | En: CNN International ✦ *
- `319287` News | En: France 24 English ✦ *
- `319267` News | Ar: Al Arabiya 4K ✦ [4K]
- `319271` News | Ar: Al Hadath 4K ✦ [4K]
- `319269` News | Ar: Al Hadath FHD ✦ [FHD]
- `319266` News | Ar: Al Arabiya HD ✦ [HD]
- `319268` News | Ar: Al Hadath HD ✦ [HD]
- `319277` News | Ar: Araby 2 ✦ HD [HD]
- `319290` News | Ar: Asharq News HD ✦ [HD]
- `319288` News | Ar: DW Arabic HD ✦ [HD]
- `319309` News | Ar: iNews HD ✦ [HD]
- `319278` News | Ar: RT Arabic HD ✦ [HD]
- `319280` News | Ar: TRT News Arabic HD ✦ [HD]
- `319283` News | En: BBC World News HD ✦ [HD]
- `319270` News | Ar: Al Hadath SD ✦ [SD]
- `319279` News | Ar: RT Arabic SD ✦ [SD]
- `319276` News | Ar: Al Araby TV ✦
- `319296` News | Ar: Al Ayam TV ✦
- `319297` News | Ar: Al Hadath Al Youm ✦
- `319295` News | Ar: Al Hiwar TV ✦
- `319275` News | Ar: Al Mayadeen TV Plus ✦
- `319274` News | Ar: Al Mayadeen TV ✦
- `319293` News | Ar: Al Mustakila ✦
- `319292` News | Ar: Al Qanat 9 ✦
- `319299` News | Ar: Al Yaum TV ✦
- `319282` News | Ar: BBC World News Arabic ✦
- `319300` News | Ar: CBC Extra News TV ✦
- `319308` News | Ar: Hadramout TV News ✦
- `319291` News | Ar: Nabaa News ✦
- `319305` News | Ar: Saudia Al Ekhbariya ✦
- `319289` News | En: DW English ✦
- `319302` News | En: i24 News English ✦
- `319311` News | En: Wion TV ✦
- `319303` News | Fr: i24 News French ✦

### IRAQ (43 channels | 0 gems | 0 4K | 0 FHD | 11 HD)

- `309131` Iq| Al Ahd Iraq TV ✦ [HD]
- `309124` Iq| Al Iraqia HD ✦ [HD]
- `309137` Iq| Al Mustakila HD ✦ [HD]
- `309154` Iq| Al Nabaa HD ✦ [HD]
- `309122` Iq| Al Sharqiya News HD ✦ [HD]
- `309138` Iq| Hona Baghdad ✦ [HD]
- `309148` Iq| iNews HD ✦ [HD]
- `309125` Iq| Iraqia News HD ✦ [HD]
- `309119` Iq| Iraqia Sport HD ✦ [HD]
- `309153` Iq| Turkmeneli TV HD ✦ [HD]
- `309117` Iq| UTV Iraq HD ✦ [HD]
- `309155` Iq| Al Anbar TV ✦
- `309160` Iq| Al Anwar 1 ✦
- `309165` Iq| Al Anwar 2 ✦
- `309156` Iq| Al Aqila TV ✦
- `309163` Iq| Al Eshraq TV ✦
- `309157` Iq| Al Etejah TV ✦
- `309113` IQ| Al Fallojah TV ✦
- `309174` Iq| Al Ghadeer TV ✦
- `309173` Iq| Al Kawthar TV ✦
- `309168` Iq| Al maaref TV ✦
- `309136` Iq| Al Mawsleya ✦
- `309147` Iq| Al Nojaba TV ✦
- `309144` Iq| Al Qamar ✦
- `309116` Iq| Al Rabiaa Iraq ✦
- `309143` Iq| Al Rafidain TV ✦
- `309142` Iq| Al Rasheed TV ✦
- `309141` Iq| Al Sumaria TV ✦
- `309166` Iq| Al Taleaa TV ✦
- `309123` Iq| Al Wilayah TV ✦
- `309114` Iq| Alawla TV ✦
- `309133` Iq| ANB Iraq ✦
- `309152` Iq| Dijleh TV ✦
- `309172` Iq| Imam Ali 1 FA TV ✦
- `309175` Iq| Imam Hussein 1 TV ✦
- `309176` Iq| Imam HUssein 2 ✦
- `309127` Iq| Iraq Future TV ✦
- `309128` Iq| Iraqia Turkuman ✦
- `309134` Iq| Karbala TV ✦
- `309115` Iq| One TV ✦
- `309150` Iq| Salahaden TV ✦
- `309171` Iq| Saout Al Aqila ✦
- `309169` Iq| Suroyo TV ✦

###  DENMARK (42 channels | 9 gems | 0 4K | 0 FHD | 32 HD)

- `660662` DK: DISCOVERY -HD (Local) [HD] *
- `660664` DK: HISTORY -HD (Local) [HD] *
- `660684` DK: MTV -HD (Local) [HD] *
- `660687` DK: NAT GEO -HD (Local) [HD] *
- `660691` DK: TLC -HD (Local) [HD] *
- `660681` DK: VIASAT HISTORY -HD (Local) [HD] *
- `660688` DK: NICKELODEON -SD (Local) [SD] *
- `660689` DK: NICKJR. -SD (Local) [SD] *
- `660690` DK: NICKTOONS -SD (Local) [SD] *
- `660643` DK: DK 4 -HD (Local) [HD]
- `660640` DK: DR 1 -HD (Local) [HD]
- `660641` DK: DR 2 -HD (Local) [HD]
- `660642` DK: DR RAMA SJANG -HD (Local) [HD]
- `660673` DK: EURO SPORT 1 -HD (Local) [HD]
- `660674` DK: EURO SPORT 2 -HD (Local) [HD]
- `660663` DK: H2 -HD (Local) [HD]
- `660654` DK: KANAL4 -HD (Local) [HD]
- `660655` DK: KANAL5 -HD (Local) [HD]
- `660657` DK: KANAL9 -HD (Local) [HD]
- `660666` DK: LOVE NATURE -HD (Local) [HD]
- `660656` DK: TV 6 -HD (Local) [HD]
- `660644` DK: TV2 -HD (Local) [HD]
- `660669` DK: TV2 BORNHOLM -HD (Local) [HD]
- `660645` DK: TV2 CHARLIE -HD (Local) [HD]
- `660646` DK: TV2 ECHO -HD (Local) [HD]
- `660647` DK: TV2 FRI -HD (Local) [HD]
- `660648` DK: TV2 NEWS -HD (Local) [HD]
- `660660` DK: TV2 SPORT -HD (Local) [HD]
- `660649` DK: TV3 -HD (Local) [HD]
- `660650` DK: TV3 MAX -HD (Local) [HD]
- `660652` DK: TV3 SPORT -HD (Local) [HD]
- `660675` DK: V FILM ACTION -HD (Local) [HD]
- `660677` DK: V FILM HITS -HD (Local) [HD]
- `660678` DK: V FILM PREMIERE -HD (Local) [HD]
- `660679` DK: V SERIES -HD (Local) [HD]
- `660665` DK: ID -SD (Local) [SD]
- `660667` DK: SPORT LIVE -SD (Local) [SD]
- `660668` DK: TV OST -SD (Local) [SD]
- `660659` DK: TV2 FYN -SD (Local) [SD]
- `660683` DK: TV2 NORD -SD (Local) [SD]
- `660672` DK: TV2 SYD -SD (Local) [SD]
- `660676` DK: V FILM FAMILY -SD (Local) [SD]

### PAKISTAN (40 channels | 1 gems | 1 4K | 1 FHD | 9 HD)

- `95` PK: HBO PAKISTAN *
- `257229` PK: ARY DIGITAL (4K) [4K] [icon]
- `49584` PK: HUM TV (FHD) [FHD] [icon]
- `94` PK: AanTv HD [HD] [icon]
- `124` PK: ARY DIGITAL-HD [HD] [icon]
- `19703` PK: DISCOVER PAK-HD [HD]
- `120` PK: GEO KAHANI-HD [HD]
- `122` PK: HUM TV-HD [HD] [icon]
- `18311` PK: JALWA-HD [HD] [icon]
- `152835` PK: MUN TV HD [HD] [icon]
- `24116` PK: SAB TV-HD [HD] [icon]
- `4057` PK: SEE TV-HD [HD] [icon]
- `126` PK : A PLUS
- `123` PK : ARY ZINDAGI
- `118` PK : EXPRESS TV
- `119` PK : GEO TV
- `121` PK : HUM TV EUROPE
- `112` PK: 8XM [icon]
- `105` PK: AAJ ENTERTAINMENT
- `869` PK: APNA [icon]
- `125` PK: ARY DIGITAL (UK)
- `18309` PK: ARY MUSIC [icon]
- `116` PK: ATV
- `152836` PK: Aur Life [icon]
- `99` PK: BOL ENTERTAINMENT TV
- `152808` PK: Green Entertainment [icon]
- `20460` PK: HUM SITARAY  [icon]
- `1919` PK: HUM TV MASALA [icon]
- `5459` PK: KAY2 [icon]
- `107` PK: KHYBER TV [icon]
- `4227` PK: KTN  [icon]
- `1846` PK: PAIGAM PUSHTO
- `108` PK: PASHTO TV [icon]
- `859` PK: PLAY TV [icon]
- `109` PK: PTV GLOBAL
- `110` PK: PTV HOME
- `7067` PK: RAAVI FILMS
- `2498` PK: SINDH TV [icon]
- `117` PK: TV ONE [icon]
- `9493` PK: UK-44

### UK| ENTERTAINMENT (39 channels | 8 gems | 0 4K | 10 FHD | 6 HD)

- `148171` UK FHD : TLC [FHD] *
- `148187` UKFHD : Sky Arts [FHD] *
- `148320` UK HD : MUTV [HD] *
- `258` UK: CHANNEL 4 HD [HD] [icon] *
- `259` UK: CHANNEL 5 HD [HD] [icon] *
- `260` UK: COMEDY CENTRAL HD [HD] *
- `148313` UKHD : Sky Nature [HD] *
- `148716` UK SD : Channel 4 Scotland +1 [SD] *
- `148228` UK FHD : Arirang TV [FHD]
- `148273` UK FHD : TG4 [FHD]
- `148253` UK FHD : UTV [FHD]
- `148169` UK FHD : WATCH [FHD]
- `148207` UKFHD : Crime Inv [FHD]
- `148206` UKFHD : Dave [FHD]
- `148204` UKFHD : E4 [FHD]
- `148200` UKFHD : Gold [FHD]
- `148306` UK HD : UTV [HD]
- `148439` Challenge SD [SD]
- `148501` UK SD : 5Action [SD]
- `148546` UK SD : Comedy Extra [SD]
- `148532` UK SD : Film4 [SD]
- `148310` UK SD: HGTV [SD]
- `148575` UKSD : 4Seven [SD]
- `148537` UKSD : Drama [SD]
- `148531` UKSD : Food Network [SD]
- `148488` UKSD : Really [SD]
- `148577` UKSD Blaze [SD]
- `148538` UKSD DMAX [SD]
- `148500` UKSD PBS America [SD]
- `148498` UKSD POP Max [SD]
- `148621` UKSD TalkingPictures [SD]
- `1064` UK : CBS DRAMA [icon]
- `1063` UK : CBS REALITY
- `5017` UK: 5 Star
- `1072` UK: ALiBi [icon]
- `5818` UK: Clubland TV [icon]
- `1071` UK: EDEN [icon]
- `1079` UK: GOOD FOOD [icon]
- `263` UK: LONDON LIVE TV

### UK| MOVIES (39 channels | 34 gems | 0 4K | 17 FHD | 16 HD)

- `148267` Sky Crime FHD [FHD] *
- `34157` UK: SKY ARTS FHD [FHD] *
- `34158` UK: SKY ATLANTIC FHD [FHD] [icon] *
- `34170` UK: SKY CINEMA ACTION (FHD) [FHD] [icon] *
- `34169` UK: SKY CINEMA COMEDY (FHD) [FHD] *
- `34164` UK: SKY CINEMA DRAMA (FHD) [FHD] *
- `34165` UK: SKY CINEMA FAMILY (FHD) [FHD] [icon] *
- `34166` UK: SKY CINEMA GREATS (FHD) [FHD] *
- `34162` UK: SKY CINEMA HITS FHD [FHD] [icon] *
- `34161` UK: SKY CINEMA PREMIERE FHD [FHD] [icon] *
- `34167` UK: SKY CINEMA SCIFI / HORROR (FHD) [FHD] [icon] *
- `34168` UK: SKY CINEMA SELECT (FHD) [FHD] [icon] *
- `34163` UK: SKY CINEMA THRILLER (FHD) [FHD] [icon] *
- `148170` UKFHD : Sky Comedy [FHD] *
- `148181` UKFHD : Sky Showcase [FHD] *
- `148177` UKFHD : Sky Witness [FHD] *
- `1061` UK : SKY ARTS HD [HD] *
- `148330` UK HD : Sky Witness [HD] *
- `273` UK: Sky Cinema Action HD [HD] [icon] *
- `276` UK: Sky Cinema Drama HD [HD] [icon] *
- `274` UK: Sky Cinema Family HD [HD] [icon] *
- `275` UK: Sky Cinema Greats HD [HD] *
- `279` UK: Sky Cinema Premiere HD [HD] *
- `277` UK: Sky Cinema Sky-fi HD [HD] [icon] *
- `278` UK: Sky Cinema Thriller HD [HD] *
- `24` UK: Sky Movies Drama HD [HD] [icon] *
- `25` UK: Sky movies Premiere HD [HD] *
- `148322` UKHD : Sky Atlantic [HD] *
- `148333` UKHD : Sky Cinema Premiere [HD] *
- `148332` UKHD : Sky Cinema Sci-Fi Horror [HD] *
- `148324` UKHD : Sky Comedy [HD] *
- `148476` UKSD : Sky Cinema Premiere [SD] *
- `148472` UKSD : Sky Witness [SD] *
- `148482` UKSD Sky Cinema Drama [SD] *
- `148201` UK FHD : Film4 [FHD]
- `148289` UK HD : NHK World Japan [HD]
- `148398` UK SD : Great! Movies Classic [SD]
- `148410` UKSD : Great! Movies Action +1 [SD]
- `148468` UKSD Sony Movies [SD]

### UK| ASIAN (38 channels | 9 gems | 0 4K | 5 FHD | 2 HD)

- `24581` UK: Colors FHD [FHD] *
- `24582` UK: Sony Max FHD [FHD] *
- `46` UK: ZEE TV HD [HD] [icon] *
- `2440` UK : Colors CinePlex *
- `148586` UK: ColorsRishtey *
- `148508` UK: NDTV 24x7 *
- `148611` UK: Sony Max 2 *
- `251` UK: Sony SAB  [icon] *
- `2439` UK: Zee cinema [icon] *
- `24580` UK: Sony TV FHD [FHD] [icon]
- `28729` UK: Utsav Gold FHD [FHD]
- `346` UK:UTSAV  PLUS FHD [FHD] [icon]
- `24583` UK: Utsav Plus HD [HD] [icon]
- `1380` UK : COLOR SD [SD] [icon]
- `148467` UK: Sony TV SD [SD]
- `148578` UK: 92 News
- `379603` UK: AAJ TAK
- `148637` UK: ARY Digital
- `148581` UK: ATN
- `6208` UK: B4U MOVIES
- `148653` UK: B4U Movies
- `6207` UK: B4U MUSIC
- `148433` UK: Geo News
- `148592` UK: Geo TV
- `148434` UK: HIDAYAT
- `148436` UK: Hum Europe
- `148597` UK: Hum Masala
- `148643` UK: Iqra Bangla
- `148601` UK: Madani Chnl
- `148503` UK: Noor TV
- `1038` UK: Ptc Punjabi UK
- `148648` UK: PTV Global
- `148486` UK: Sangat
- `148650` UK: Sikh Channel
- `148175` UK: Sony TV
- `348` UK: STAR BHARAT  UK [icon]
- `148651` UK: TV One
- `148174` UK: utsav Gold

### KANNADA (36 channels | 5 gems | 5 4K | 8 FHD | 9 HD)

- `98907` Kannada: COLORS_KANNADA (4K). [4K] [icon] *
- `23323` Kannada: COLORS_KANNADA (FHD) [FHD] [icon] *
- `162` Kand:  Colors Kannada HD [HD] *
- `163` Kand:  Colors Super *
- `56037` KANNADA: Asianet Suvarna News [icon] *
- `9452` Kand: ZEE Picchar (4K) [4K] [icon]
- `98901` Kannada: STAR-SUVARNA (4k). [4K] [icon]
- `98889` Kannada: UDAYA (4K). [4K] [icon]
- `98890` Kannada: ZEE-KANNADA (4K). [4K] [icon]
- `9448` Kand: UDAYA MOVIES FHD [FHD]
- `9449` Kand: UDAYA TV FHD [FHD]
- `9450` Kand: UDAYA TV FHD [FHD]
- `9451` Kand: UDAYA TV FHD-(usa)  [FHD]
- `23322` Kannada: STAR-SUVARNA (FHD) [FHD] [icon]
- `24124` Kannada: UDAYA (FHD) [FHD]
- `24125` Kannada: ZEE-KANNADA (FHD) [FHD]
- `690813` KAN: ZEE POWER HD [HD]
- `9441` Kand: News18 Kannada HD [HD]
- `9442` Kand: Prajaa TV HD [HD]
- `9444` Kand: Suvarna News HD [HD]
- `9445` Kand: TV5 News HD [HD]
- `164` Kand: Udaya TV HD [HD]
- `9453` Kand: Zee Kannada HD [HD]
- `9439` Kand:Ayush TV HD [HD]
- `355543` KAN: Ayush TV SD [SD]
- `355559` KAN: Raj News Kannada SD [SD]
- `380979` KAN: Public Movies
- `376281` KAN: SVBC 3
- `236` Kand:  Suvarna_News
- `9443` Kand: Public_TV
- `9446` Kand: Tv9 Kannada (News)
- `128231` Kannada:  udaya music [icon]
- `128230` Kannada: Public Music [icon]
- `128232` Kannada: Raj Music Kannada [icon]
- `252457` KN: Republic News Kannada
- `380448` KN: ZEE KANNADA NEWS

### MALAYALAM | ENTRTNMNT (33 channels | 5 gems | 4 4K | 5 FHD | 7 HD)

- `98891` MY: ASIANET (4K). [4K] [icon] *
- `23307` MY: ASIANET (FHD) [FHD] [icon] *
- `166` MY: Asianet HD [HD] [icon] *
- `9027` MY: Asianet Plus [icon] *
- `85926` MY: AsianetMiddleEast [icon] *
- `98912` MY: MAZHAVIL (4K). [4K] [icon]
- `98888` MY: SURYA (4K). [4K] [icon]
- `98895` MY: ZEE KERALAM (4K). [4K] [icon]
- `23311` MY: MAZHAVIL (FHD) [FHD] [icon]
- `23309` MY: SURYA (FHD) [FHD] [icon]
- `10094` MY: ZEE KERALAM (FHD) [FHD] [icon]
- `23310` MY: ZEE KERALAM (FHD) [FHD] [icon]
- `9026` MY: Kairali HD [HD] [icon]
- `169867` MY: Power Vesion HD [HD] [icon]
- `131454` MY: Pulari Tv HD [HD] [icon]
- `169838` MY: Shalom HD [HD] [icon]
- `9033` MY: SURYA COMEDY HD [HD] [icon]
- `193` MY: Surya_HD [HD] [icon]
- `9028` MY: Amrita TV [icon]
- `85924` MY: DarshanaTV [icon]
- `9030` MY: Flowers TV [icon]
- `85915` MY: GoodnessTV [icon]
- `85917` MY: Harvest24x7 [icon]
- `150128` MY: Kairali We [icon]
- `85928` MY: KairaliArabia [icon]
- `254748` MY: Kite Victers  [icon]
- `37450` MY: Kochu TV [icon]
- `252` MY: Power Vesion Malayalam [icon]
- `4067` MY: SAFARI TV [icon]
- `9040` MY: Shalom [icon]
- `299439` MY: Shekinah TV  [icon]
- `53199` MY: WE TV [icon]
- `4226` MY: ZEE KERALAM [icon]

### SRI LANKA (33 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `23962` 7TH-CIRCUIT
- `23963` ADA-DERENA24 [icon]
- `23964` ART-TELEVISION [icon]
- `23965` BUDDHIST-TV [icon]
- `23966` CGTN [icon]
- `23967` CHANNEL-C [icon]
- `23969` CHANNEL-ONE [icon]
- `23970` CITI-HITZ [icon]
- `142940` Color tamil
- `23972` EWTN/VERBUM [icon]
- `23973` GOD-TV/SWARGA-TV [icon]
- `23974` GURU-TV  [icon]
- `23995` HI-TV LANKA  [icon]
- `23975` HIRUTV [icon]
- `23976` ITN  [icon]
- `23977` NETHRA TV [icon]
- `23978` NETHRA TV TAMIL [icon]
- `23979` PRAGNA-TV [icon]
- `23980` RANGIRI-SRI-LANKA [icon]
- `23981` RIDEE-TV [icon]
- `23982` RUPAVAHINI [icon]
- `23983` SHAKTHI-TV [icon]
- `23984` SHRADDHA-TV [icon]
- `23985` SIRASA-TV [icon]
- `23986` SIYATHA-TV [icon]
- `23996` SUPREME-TV LANKA [icon]
- `23987` SWARNAVAHINI [icon]
- `23988` TNL [icon]
- `23989` TV-DERANA [icon]
- `23990` TV-DIDULA [icon]
- `23991` TV1  [icon]
- `23993` VASANTHAM [icon]
- `142941` zee tamil

### SAUDI ARABIA (32 channels | 0 gems | 0 4K | 0 FHD | 7 HD)

- `319432` Sa| Asharq News HD ✦ [HD]
- `319435` Sa| iEN TV HD ✦ [HD]
- `319428` Sa| Saudi TV HD ✦ [HD]
- `319434` Sa| Saudia Al Ekhbariya HD ✦ [HD]
- `319426` Sa| Saudia Quran HD ✦ [HD]
- `319427` Sa| Saudia Sunnah HD ✦ [HD]
- `319420` Sa| Thikrayat HD ✦ [HD]
- `319436` Sa| Al Majd General ✦
- `319439` Sa| Al Majd Hadith TV ✦
- `319422` Sa| Al Sahraa TV ✦
- `319429` Sa| Atfal & Mawaheb ✦
- `319421` Sa| Bin Othaimeen ✦
- `319440` Sa| iEN Doros 01 ✦
- `319441` Sa| iEN Doros 02 ✦
- `319442` Sa| iEN Doros 03 ✦
- `319443` Sa| iEN Doros 04 ✦
- `319444` Sa| iEN Doros 05 ✦
- `319445` Sa| iEN Doros 06 ✦
- `319446` Sa| iEN Doros 07 ✦
- `319448` Sa| iEN Doros 09 ✦
- `319449` Sa| iEN Doros 10 ✦
- `319450` Sa| iEN Doros 11 ✦
- `319451` Sa| iEN Doros 12 ✦
- `319452` Sa| iEN Doros 13 ✦
- `319453` Sa| iEN Doros 14 ✦
- `319454` Sa| iEN Doros 15 ✦
- `319455` Sa| iEN Doros 16 ✦
- `319456` Sa| iEN Doros 17 ✦
- `319457` Sa| iEN Doros 18 ✦
- `319458` Sa| iEN Doros 19 ✦
- `319462` Sa| iEN Doros 23 ✦
- `319433` Sa| Iqraa ✦

### MLB (LIVE ONLY MATCH TIME) (32 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `620486` US (MLB) Arizona Diamondbacks (S)
- `620485` US (MLB) Atlanta Braves (S)
- `620484` US (MLB) Baltimore Orioles (S)
- `620483` US (MLB) Boston Red Sox (S)
- `620482` US (MLB) Chicago Cubs (S)
- `620481` US (MLB) Chicago White Sox (S)
- `620480` US (MLB) Cincinnati Reds (S)
- `620479` US (MLB) Cleveland Guardians (S)
- `620478` US (MLB) Colorado Rockies (S)
- `620477` US (MLB) Detroit Tigers (S)
- `620476` US (MLB) HoUS ton Astros (S)
- `620475` US (MLB) Kansas City Royals (S)
- `620474` US (MLB) Los Angeles Angels (S)
- `620473` US (MLB) Los Angeles Dodgers (S)
- `620472` US (MLB) Miami Marlins (S)
- `620471` US (MLB) Milwaukee Brewers (S)
- `620470` US (MLB) Minnesota Twins (S)
- `620469` US (MLB) New York Mets (S)
- `620468` US (MLB) New York Yankees (S)
- `620467` US (MLB) Oakland Athletics (S)
- `620466` US (MLB) Philadelphia Phillies (S)
- `620465` US (MLB) Pittsburgh Pirates (S)
- `620464` US (MLB) San Diego Padres (S)
- `620463` US (MLB) San Francisco Giants (S)
- `620462` US (MLB) Seattle Mariners (S)
- `620461` US (MLB) St. Louis Cardinals (S)
- `620460` US (MLB) Tampa Bay Rays (S)
- `620459` US (MLB) Texas Rangers (S)
- `620458` US (MLB) Toronto Blue Jays (S)
- `620457` US (MLB) Washington Nationals (S)
- `620487` US MLB BIG Inning (D)
- `620488` US MLB Network (S)

### REAL 4K (2160P) (31 channels | 12 gems | 31 4K | 0 FHD | 0 HD)

- `688310` UHD ▎M+ LALIGA TV [ES] [4K] *
- `688283` UHD ▎SKY SPORT [DE] [4K] *
- `688284` UHD ▎SKY SPORT BUNDESLIGA [DE] [4K] *
- `581307` UHD ▎SKY SPORTS 1 [UK] [4K] *
- `688273` UHD ▎SKY SPORTS 2 [UK] [4K] *
- `581306` UHD ▎SKY SPORTS F1 [UK] [4K] *
- `581305` UHD ▎SKY SPORTS MAIN EVENT [UK] [4K] *
- `688307` UHD ▎SPORT TV 1 [PT] [4K] *
- `384215` UK : SKY SPORTS MAIN EVENTS (4K) [4K] [icon] *
- `384213` UK: SKY SORTS F1 (4K) [4K] [icon] *
- `384222` UK: SKY SPORTS 1 (4K) [4K] [icon] *
- `384216` UK: SKY SPORTS 2 (4K) [4K] [icon] *
- `688308` UHD ▎BENFICA TV [PT] [4K]
- `466663` UHD ▎BLOOMBERG |US| [4K] [icon]
- `688274` UHD ▎BLUE SPORT 1 [CH] [4K]
- `688275` UHD ▎BLUE SPORT 2 [CH] [4K]
- `688276` UHD ▎BLUE SPORT 3 [CH] [4K]
- `688277` UHD ▎BLUE SPORT 4 [CH] [4K]
- `688281` UHD ▎CINEMA ULTRA HD [RU] [4K]
- `688286` UHD ▎ELEVEN SPORTS 1 [PL] [4K]
- `688309` UHD ▎ELEVEN SPORTS 1 [PT] [4K]
- `688288` UHD ▎ELEVENSPORT 1 [PL] [4K]
- `688306` UHD ▎FASHION TV [AL] [4K]
- `688280` UHD ▎KINO [RU] [4K]
- `688290` UHD ▎LA 1 [ES] [4K]
- `688301` UHD ▎NOW SPORTS [UK] [4K]
- `688285` UHD ▎PRO7SAT.1 [DE] [4K]
- `688278` UHD ▎QUADRO [RU] [4K]
- `688287` UHD ▎RAI 1 [IT] [4K]
- `688279` UHD ▎ULTRA REX [RU] [4K]
- `384243` UK : TNT 4K ULTIMATE (LIVE EVENT) [4K] [icon]

### MARATHI (30 channels | 4 gems | 5 4K | 5 FHD | 7 HD)

- `98905` MARATHI: COLORS MARATHI (4K). [4K] [icon] *
- `23798` MARATHI: COLORS-MARATHI (FHD) [FHD] *
- `374570` Marathi: NDTV MARATHI *
- `5872` Marathi:Colors:Marathi [icon] *
- `96364` Marathi: Pravah Picture (4K) [4K] [icon]
- `98902` Marathi: STAR-PRAVAH (4K). [4K] [icon]
- `310644` MARATHI: SUN MARATHI (4K) [4K] [icon]
- `98904` Marathi: ZEE TALKIES (4K). [4K] [icon]
- `23799` Marathi: STAR-PRAVAH (FHD) [FHD] [icon]
- `85694` Marathi: ZEE Marathi (FHD) [FHD]
- `85695` Marathi: ZEE TALKIES (FHD) [FHD]
- `5874` Marathi:Star Parvaha FHD [FHD]
- `5856` Marathi: Sony Marathi HD [HD]
- `4066` Marathi: ZEE MARATHI HD [HD]
- `5858` Marathi:9x Jhakaas  HD [HD]
- `5860` Marathi:DD Sahyadri HD(lk) [HD]
- `5863` Marathi:TV9 Marathi HD [HD]
- `5867` Marathi:Zee Marathi HD [HD]
- `5871` Marathi:Zee Talkies HD [HD]
- `379783` MARATHI:  TV9 MARATHI
- `374552` Marathi: Marathi Special 2
- `337784` MARATHI: Saam Tv
- `5869` Marathi: ZEE Marathi (usa)
- `5859` Marathi:ABP Majha
- `5861` Marathi:Fakt marathi
- `5862` Marathi:News18 Lokmat
- `5864` Marathi:Sangeet Marathi(lk)
- `5868` Marathi:Zee  24 Taas
- `5866` Marathi:Zee Yuva
- `371565` MY: Marathi Special 1

### INDIA ENGLISH MOVIES (29 channels | 11 gems | 11 4K | 8 FHD | 9 HD)

- `98879` IN: Colors INFINITY (4K). [4K] [icon] *
- `98842` IN: STAR MOVIE (4K). [4K] [icon] *
- `98843` IN: STAR MOVIE SELECT (4K). [4K] [icon] *
- `98878` IN: TLC (4K). [4K] [icon] *
- `9390` IN: Colors INFINITY (FHD) [FHD] [icon] *
- `9384` IN: STAR MOVIES (FHD) [FHD] [icon] *
- `23270` IN: STAR MOVIES SELECT (FHD) [FHD] *
- `9388` IN: TLC (FHD) [FHD] [icon] *
- `187` IN: COLORS INFINITY HD [HD] [icon] *
- `979` IN: STAR MOVIES HD [HD] [icon] *
- `218` IN: STAR MOVIES SELECT HD [HD] [icon] *
- `98841` IN: &FLIX (4K). [4K] [icon]
- `98840` IN: &PRIVE (4K). [4K] [icon]
- `98847` IN: MN+ (4K). [4K] [icon]
- `23428` IN: MNX (4K) [4K] [icon]
- `152387` IN: Movies Now (4K) [4K] [icon]
- `98846` IN: SONY PIX (4K). [4K] [icon]
- `98848` IN: ZEE CAFE (4K). [4K] [icon]
- `9379` IN: & PRIVE (FHD) [FHD]
- `9383` IN: MN+ (FHD) [FHD]
- `9381` IN: SONY PIX (FHD) [FHD] [icon]
- `9389` IN: ZEE Cafe (FHD) [FHD] [icon]
- `253` IN: & FLIX HD [HD] [icon]
- `201` IN: & PRIVE HD [HD] [icon]
- `191` IN: MNX HD [HD] [icon]
- `179` IN: ROMEDY NOW HD [HD]
- `147` IN: SONY PIX HD [HD] [icon]
- `196` IN: ZEECAFE HD [HD] [icon]
- `178` IN: MN PLUS

### SPORTS | UK SPORTS (29 channels | 26 gems | 0 4K | 17 FHD | 12 HD)

- `186637` EUROSPORT 1 FHD [FHD] [icon] *
- `186638` EUROSPORT 2 FHD [FHD] [icon] *
- `186606` SKY SPORTS CRICKET FHD [FHD] [icon] *
- `186616` SKY SPORTS F1 FHD [FHD] [icon] *
- `186612` SKY SPORTS FOOTBALL FHD [FHD] [icon] *
- `186614` SKY SPORTS GOLF FHD [FHD] [icon] *
- `186597` SKY SPORTS MAIN EVENT FHD [FHD] [icon] *
- `186622` SKY SPORTS MIX FHD [FHD] [icon] *
- `186624` SKY SPORTS NEWS FHD [FHD] [icon] *
- `186620` SKY SPORTS Plus FHD [FHD] [icon] *
- `186604` SKY SPORTS PREMIER LEAGUE FHD [FHD] [icon] *
- `186628` TNT SPORT 2 FHD [FHD] [icon] *
- `186629` TNT SPORT 3 FHD [FHD] [icon] *
- `186630` TNT SPORT 4 FHD [FHD] [icon] *
- `186643` UK: SKY SPORTS RACING FHD [FHD] [icon] *
- `186605` SKY SPORTS CRICKET HD [HD] [icon] *
- `186615` SKY SPORTS F1 HD [HD] [icon] *
- `186607` SKY SPORTS FOOTBALL HD [HD] [icon] *
- `186613` SKY SPORTS GOLF HD [HD] [icon] *
- `186621` SKY SPORTS MIX HD [HD] [icon] *
- `186623` SKY SPORTS NEWS HD [HD] [icon] *
- `186603` SKY SPORTS PREMIER LEAGUE HD  [HD] [icon] *
- `199487` TNT SPORT 1 HD. [HD] [icon] *
- `186631` TNT SPORT 5 HD [HD] [icon] *
- `186632` TNT SPORT 6 HD [HD] [icon] *
- `186635` TNT SPORT 9 HD [HD] [icon] *
- `186639` PREMIER SPORT 1 FHD [FHD] [icon]
- `186640` Premier Sport 2 FHD [FHD] [icon]
- `186642` RACING TV HD [HD] [icon]

### BEIN MOVIES (29 channels | 8 gems | 14 4K | 0 FHD | 14 HD)

- `274145` beIN MOVIES 4K 1 [4K] *
- `274146` beIN MOVIES 4K 2 [4K] *
- `274147` beIN MOVIES 4K 3 [4K] *
- `274148` beIN MOVIES 4K 4 [4K] *
- `274199` Bein Movies HD1 [HD] *
- `274200` Bein Movies HD2 [HD] *
- `274201` Bein Movies HD3 [HD] *
- `274202` Bein Movies HD4 [HD] *
- `274158` Bein BARAEAM 4K [4K]
- `274155` Bein BBC EARTH 4K [4K]
- `274151` beIN DRAMA 4K [4K]
- `274157` Bein FATAFEAT 4K [4K]
- `274153` Bein FOX MOV ACTION 4K [4K]
- `274152` Bein FOX MOVIES 4K [4K]
- `274156` Bein GORMENT 4K [4K]
- `274159` Bein JEEM 4K [4K]
- `274149` beIN SERIES 4K 1 [4K]
- `274150` beIN SERIES 4K 2 [4K]
- `274210` Bein Baraem HD [HD]
- `274211` Bein BBC Earth HD [HD]
- `274205` Bein Drama HD1 [HD]
- `274207` Bein Fox Action Movies HD [HD]
- `274206` Bein Fox Movies HD [HD]
- `274160` Bein Global HD [HD]
- `274213` Bein Gourmet HD [HD]
- `274209` Bein jeem HD [HD]
- `274203` Bein Series HD1 [HD]
- `274204` Bein Series HD2 [HD]
- `274212` Bein Fatafeat

### FOOTBALL (28 channels | 19 gems | 1 4K | 10 FHD | 10 HD)

- `138713` BEIN SPORTS English 1 (4k) [4K] [icon] *
- `23348` Eurosport 2 (FHD) [FHD] [icon] *
- `23334` Sky Sports Football (FHD) [FHD] [icon] *
- `23342` Sky Sports Premier League (FHD) [FHD] [icon] *
- `776` SUPERSPORTS FOOTBALL (FHD) [FHD] [icon] *
- `768` SUPERSPORTS LALIGA (FHD) [FHD] [icon] *
- `771` SUPERSPORTS PREMIER LEAGUE (FHD) [FHD] [icon] *
- `770` SUPERSPORTS PSL (FHD) [FHD] [icon] *
- `30` LIVERPOOL FC HD [HD] [icon] *
- `29` MUTV HD [HD] [icon] *
- `9891` Sky Sports Premier League HD [HD] [icon] *
- `192` SONY Ten 2 HD [HD] [icon] *
- `523` SUPERSPORTS FOOTBALL HD [HD] [icon] *
- `515` SUPERSPORTS LALIGA HD [HD] [icon] *
- `518` SUPERSPORTS PREMIER LEAGUE HD [HD] [icon] *
- `517` SUPERSPORTS PSL HD [HD] [icon] *
- `19` SKY SPORTS FOOTBALL [icon] *
- `285` TNT SPORT 2 [icon] *
- `283` TNT Sport 3 [icon] *
- `24114` LFC TV FHD [FHD] [icon]
- `23344` Premier 1 (FHD) [FHD] [icon]
- `23345` Premier 2 (FHD) [FHD] [icon]
- `4468` BEIN SPORT 1 HD [HD] [icon]
- `1920` EURO SPORTS 2 HD [HD] [icon]
- `129703`  ATN [icon]
- `5029` Premier Sports 1 [icon]
- `5030` Premier Sports 2 [icon]
- `52500` T SPORTS [icon]

### MALAYALAM | NEWS (28 channels | 2 gems | 0 4K | 0 FHD | 3 HD)

- `165` MAL | ASIANET NEWS [icon] *
- `166605` MAL | ASIANET NEWS ᴴᴰ [icon] *
- `172` MAL | JAI HIND TV HD [HD] [icon]
- `9032` MAL | MATHRUBHUMI NEWS HD [HD] [icon]
- `9036` MAL | NEWS 18 KERALA HD [HD] [icon]
- `688561` MAL | BIG TV  [icon]
- `4051` MAL | DD MALAYALAM ᴴᴰ [icon]
- `299440` MAL | GARSHOM [icon]
- `169798` MAL | JAI HIND TV ᴴᴰ [icon]
- `169807` MAL | JANAM TV ᴴᴰ [icon]
- `85920` MAL | JEEVAN TV ᴴᴰ [icon]
- `85929` MAL | KAIRALI NEWS [icon]
- `169797` MAL | KAIRALI NEWS ᴴᴰ [icon]
- `169850` MAL | KERALA VISION NEWS ᴴᴰ [icon]
- `226` MAL | MANORAMA NEWS [icon]
- `169776` MAL | MANORAMA NEWS ᴴᴰ [icon]
- `249` MAL | MANORAMA NEWS ᴴᴰ [icon]
- `169786` MAL | MATHRUBHUMI NEWS ᴴᴰ [icon]
- `9035` MAL | MEDIA ONE [icon]
- `169796` MAL | MEDIA ONE ᴴᴰ [icon]
- `169837` MAL | NEWS 18 KERALA ᴴᴰ [icon]
- `248` MAL | NEWS 24 [icon]
- `166612` MAL | NEWS 24 ᴴᴰ [icon]
- `354290` MAL | NEWS MALAYALAM 24x7 [icon]
- `9037` MAL | RAJ NEWS ᴴᴰ [icon]
- `56032` MAL | REPORTER NEWS [icon]
- `166615` MAL | REPORTER NEWS ᴴᴰ [icon]
- `254257` MAL | ZEE NEWS ᴴᴰ [icon]

### PUNJABI SINGERS 24/7 (27 channels | 0 gems | 0 4K | 0 FHD | 27 HD)

- `136325` PUNJABI-SINGER AMAN HAYER HD [HD]
- `136327` PUNJABI-SINGER AMAR NOORIE HD [HD]
- `136335` PUNJABI-SINGER BABBAL RAI HD [HD]
- `136337` PUNJABI-SINGER BALJIT MALWA HD [HD]
- `136339` PUNJABI-SINGER BOHEMIA HD [HD]
- `136340` PUNJABI-SINGER DALER MEHNDI HD [HD]
- `136397` PUNJABI-SINGER LABH JANJUA HD [HD]
- `136396` PUNJABI-SINGER LAKHWINDER SINGH HD [HD]
- `136395` PUNJABI-SINGER LEHMBER HUSSAIN PURIA HD [HD]
- `136393` PUNJABI-SINGER MAHINDER BUTTER HD [HD]
- `136392` PUNJABI-SINGER MANMOHAN WARIS HD [HD]
- `136388` PUNJABI-SINGER NACHHHATAR GILL HD [HD]
- `136387` PUNJABI-SINGER NAVV INDER HD [HD]
- `136385` PUNJABI-SINGER PAMMI BAI HD [HD]
- `136384` PUNJABI-SINGER PAV DHARIA HD [HD]
- `136382` PUNJABI-SINGER PREM DHILLON HD [HD]
- `136381` PUNJABI-SINGER RAJ BRAR HD [HD]
- `136380` PUNJABI-SINGER RANJET BAEA HD [HD]
- `136377` PUNJABI-SINGER SARBJIT CHEEMA HD [HD]
- `136376` PUNJABI-SINGER SARDOOL SIKANDR HD [HD]
- `136375` PUNJABI-SINGER SATINDER SARTAAJ HD [HD]
- `136373` PUNJABI-SINGER SHARRY MAAN HD [HD]
- `136372` PUNJABI-SINGER SHEERA JASVIE HD [HD]
- `136370` PUNJABI-SINGER SUKSHINDER SHINDA HD [HD]
- `136369` PUNJABI-SINGER SUNANDA SHARMA HD [HD]
- `136367` PUNJABI-SINGER SURJIT KHAN HD [HD]
- `136366` PUNJABI-SINGER TARSEM JASSAR D HD [HD]

### INDIA ENTERTAINMENT (26 channels | 12 gems | 8 4K | 10 FHD | 8 HD)

- `98851` IN: COLORS (4K). [4K] [icon] *
- `98853` IN: SONY SAB (4K). [4K] [icon] *
- `98849` IN: STAR PLUS (4K). [4K] [icon] *
- `9370` IN: Colors (FHD) [FHD] [icon] *
- `195` IN: COLORS FHD [FHD] [icon] *
- `9366` IN: STAR PLUS (FHD) [FHD] [icon] *
- `167` IN: STAR PLUS FHD [FHD] [icon] *
- `9371` IN: ZEE TV (FHD) [FHD] [icon] *
- `220` IN: ZEE TV FHD [FHD] [icon] *
- `145` IN: SONY SAB HD [HD] [icon] *
- `221` IN: STAR PLUS HD [HD] [icon] *
- `161` IN: ZEE TV HD [HD] [icon] *
- `98852` IN: &TV (4K). [4K] [icon]
- `98854` IN: SONY (4K). [4K] [icon]
- `98855` IN: STAR BHARAT (4K). [4K] [icon]
- `380446` IN: Zee Zest (4K) [4K] [icon]
- `98850` IN: ZEETV (4K). [4K] [icon]
- `9369` IN: &TV (FHD) [FHD] [icon]
- `9368` IN: SAB (FHD) [FHD] [icon]
- `9365` IN: SONY (FHD) [FHD] [icon]
- `9367` IN: STAR BHARAT (FHD) [FHD] [icon]
- `232` IN: & TV HD [HD] [icon]
- `219` IN: COLOR HD [HD] [icon]
- `144` IN: SONY HD [HD] [icon]
- `224` IN: SONY TV HD [HD] [icon]
- `199` IN: STAR BHARAT HD [HD] [icon]

### UK| GENERAL (26 channels | 16 gems | 0 4K | 10 FHD | 5 HD)

- `148219` UK FHD : BBC One [FHD] *
- `148247` UK FHD : BBC One Northern Ireland [FHD] *
- `148248` UK FHD : ITV Yorkshire East [FHD] *
- `148197` UK FHD : ITV2 [FHD] *
- `352` UK : TLC HD [HD] *
- `31` UK: ITV 3 HD [HD] *
- `32` UK: ITV 4 HD [HD] [icon] *
- `148667` UK SD : BBC One South West [SD] *
- `13` UK: BBC 1 [icon] *
- `14` UK: BBC 2 [icon] *
- `255` UK: BBC ONE (SCOTLAND) *
- `256` UK: BBC TWO (SCOTLAND) [icon] *
- `5018` UK: ITV +1 *
- `5019` UK: ITV2 +1 *
- `5020` UK: ITV3 +1 [icon] *
- `5021` UK: ITV4 +1 [icon] *
- `148276` IRE : Virgin Two FHD [FHD]
- `148236` UK FHD : BBC Three [FHD]
- `148188` UK FHD : Quest [FHD]
- `148226` UK FHD : QVC [FHD]
- `148254` UK FHD : STV [FHD]
- `148238` UKFHD : BBC 4 [FHD]
- `148277` UK HD : Virgin One [HD]
- `9405` UK: BBC  3 HD [HD] [icon]
- `33` UK: GOLD [icon]
- `268` UK: YESTERDAY

### INDIA HINDI MOVIES (23 channels | 10 gems | 8 4K | 6 FHD | 7 HD)

- `98908` IN: Colors Cineplex (4K). [4K] [icon] *
- `98857` IN: SONY MAX (4K). [4K] [icon] *
- `98860` IN: ZEE CINEMA (4K). [4K] [icon] *
- `9378` IN: Colors Cineplex (FHD) [FHD] [icon] *
- `20512` IN: MBC BOLLYWOOD (FHD) [FHD] [icon] *
- `9373` IN: SONY MAX (FHD) [FHD] [icon] *
- `151` IN: SONY MAX HD [HD] [icon] *
- `230` IN: ZEE CINEMA HD [HD] [icon] *
- `37074` IN: Colors Cineplex Bollywood [icon] *
- `172368` IN: COLORS CINEPLEX SUPERHITS [icon] *
- `98856` IN: &PICTURE (4K). [4K] [icon]
- `4082` IN: &XPLOR (4K) [4K] [icon]
- `98858` IN: STAR GOLD (4K). [4K] [icon]
- `157081` IN: STAR GOLD 2 (4K) [4K] [icon]
- `98859` IN: STAR GOLD SELECT (4K). [4K] [icon]
- `20648` IN: & XPLOR (FHD) [FHD] [icon]
- `9375` IN: Star GOLD (FHD) [FHD] [icon]
- `9376` IN: Star Gold SELECT (FHD) [FHD] [icon]
- `231` IN: & PICTURES HD [HD] [icon]
- `867` IN: CINEPLEX HD [HD] [icon]
- `194` IN: STAR GOLD HD [HD] [icon]
- `210` IN: STAR GOLD SELECT HD [HD] [icon]
- `467485` Tata Play Bollywood Premiere HD [HD]

### INDIA DOCUMENTARY (23 channels | 17 gems | 7 4K | 5 FHD | 8 HD)

- `98873` IN: ANIMAL PLANET (4K). [4K] [icon] *
- `98872` IN: DISCOVERY (4K). [4K] [icon] *
- `98877` IN: HISTORY TV (4K). [4K] [icon] *
- `23790` IN: INVESTIGATION DISCOVERY (4K) [4K] [icon] *
- `98875` IN: NAT Geo Wild (4K). [4K] [icon] *
- `98874` IN: National GEO (4K). [4K] [icon] *
- `9391` IN: ANIMAL PLANET (FHD) [FHD] [icon] *
- `9393` IN: DISCOVERY (FHD) [FHD] [icon] *
- `9392` IN: HISTORY TV (FHD) [FHD] [icon] *
- `9395` IN: NAT Geo Wild (FHD) [FHD] [icon] *
- `9394` IN: National GEO (FHD) [FHD] [icon] *
- `182` IN: ANIMAL PLANET HD [HD] [icon] *
- `156` IN: DISCOVERY WORLD HD [HD] [icon] *
- `180` IN: HISTORY HD [HD] [icon] *
- `5252` IN: HISTORY 18 (HINDI) [icon] *
- `7343` IN: NATIONAL GEOGRAPHIC [icon] *
- `7342` IN: NATIONAL GEOGRAPHIC INDIA [icon] *
- `98871` IN: Sony BBC EARTH (4K). [4K] [icon]
- `7344` IN: NATGEO WILD HD [HD] [icon]
- `190` IN: SONY BBC EARTH HD (ENGLISH) [HD] [icon]
- `7721` IN: SONY BBC EARTH HD (HINDI) [HD] [icon]
- `181` IN: TRAVEL XP HD (HINDI) [HD] [icon]
- `143205` TravelXp HD (ENG) [HD]

### TAMIL | MOVIES (22 channels | 0 gems | 3 4K | 3 FHD | 5 HD)

- `98893` Tamil: KTV (4K). [4K] [icon]
- `181966` TAMIL: ZEE THIRAI (4K) [4K] [icon]
- `1614` TM: VIJAY SUPER (4K) [4K] [icon]
- `23318` Tamil: KTV (FHD) [FHD]
- `5898` TM: KTV  FHD (usa) [FHD] [icon]
- `5899` TM: KTV FHD (IND) [FHD] [icon]
- `136431` TAMIL-ACTION MOVIES 2 HD [HD] [icon]
- `136422` TAMIL-DRAMA MOVIES 2 HD [HD] [icon]
- `136424` TAMIL-DRAMA MOVIES 4 HD [HD] [icon]
- `136453` TAMIL-KARTHI MOVIES HD [HD] [icon]
- `160` TM: KTV HD [HD] [icon]
- `121315` 24/7: Globe_Tamil_Bloclbuster [icon]
- `121330` 24/7: Tamil Movies Vol_1 [icon]
- `121372` 24/7: Tamil_2022_2021_Collection_vol_1 [icon]
- `121335` 24/7: Tamil_Collection_Vol 2 [icon]
- `121336` 24/7: Tamil_Collection_Vol 3 [icon]
- `26163` Tamil: MEGA 24
- `144636` TAMIL: Zee Thirai
- `9019` TM: ADITYA TV [icon]
- `9022` TM: J MOVIES [icon]
- `1618` TM: JAYA MOVIES
- `5932` TM: SIRIPPOLI TV [icon]

### ENGLISH NEWS (22 channels | 14 gems | 1 4K | 1 FHD | 4 HD)

- `371444` IN: CNBC TV18 Prime (4K) [4K] [icon] *
- `23` UK: SKY SPORTS NEWS FHD [FHD] [icon] *
- `5666` [MY] AL JAZEERA HD [HD] *
- `1059` UK : BBC NEWS HD [HD] [icon] *
- `1095` US : CNBC HD [HD] [icon] *
- `710` USA: CNN HD [HD] [icon] *
- `371445` IN: CNBC-TV18 *
- `371446` IN: CNN News 18 *
- `9976` IN: CNN_NEWS_18 (NEWS) *
- `1060` UK : SKY NEWS [icon] *
- `31944` UK: CNN International *
- `9482` UK: FRANCE 24 ENGLISH *
- `871` US: MSNBC *
- `51` USA: Fox News [icon] *
- `9485` IN: ET Now
- `371562` IN: MIRROR NOW
- `7370` IN: Times NOW [icon]
- `111` PK : PTV WORLD [icon]
- `255847` PRESS TV (Iran)
- `34663` UK : GB News
- `284` UK:BBC World News [icon]
- `5175` | TR | TRT WORLD ᴴᴰ

### AUSTRIA (22 channels | 2 gems | 0 4K | 0 FHD | 21 HD)

- `661127` AT | MTV Austria -HD (Local) [HD] *
- `661126` AT | TLC Austria -HD (Local) [HD] *
- `661119` AT | 123 TV -HD (Local) [HD]
- `661130` AT | Arcdia TV -HD (Local) Austria [HD]
- `661100` AT | Krone TV -HD (Local) [HD]
- `661102` AT | KT1 -HD (Local) [HD]
- `661096` AT | OES 24 -HD (Local) [HD]
- `661087` AT | ORF 1 -HD (Local) [HD]
- `661089` AT | ORF 3 -HD (Local) [HD]
- `661090` AT | ORF Kids -HD (Local) [HD]
- `661109` AT | Pro7 Austria -HD (Local) [HD]
- `661110` AT | Pro7 Max Austria -HD (Local) [HD]
- `661095` AT | Puls 24 -HD (Local) [HD]
- `661094` AT | Puls 4 -HD (Local) [HD]
- `661105` AT | RTL Austria -HD (Local) [HD]
- `661111` AT | Sat 1 Austria -HD (Local) [HD]
- `661112` AT | Sat.1 Gold Austria -HD (Local) [HD]
- `661116` AT | Sixx Austria -HD (Local) [HD]
- `661124` AT | Ski Panorama -HD (Local) [HD]
- `661125` AT | Sport 1 -HD (Local) [HD]
- `661113` AT | VOX Austria -HD (Local) [HD]
- `661121` AT | OKTO -SD (Local) [SD]

### EPL (LIVE ONLY MATCH TIME) (21 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `636094` EPL-Arsenal
- `636099` EPL-Chelsea
- `636100` EPL-CrystalPalace
- `636101` EPL-Everton
- `636102` EPL-Fulham
- `636113` EPL-HubPremier2
- `636114` EPL-HubPremier3
- `636111` EPL-LeedsUnited
- `636103` EPL-Liverpool
- `636104` EPL-ManchesterCity
- `636105` EPL-ManchesterUnited
- `636106` EPL-NewcastleUnited
- `636107` EPL-NottinghamForest
- `636112` EPL-Sunderland
- `636109` EPL-WestHamUnited
- `636110` EPL-WolverhamptonWanderers
- `636084` EPL1-LiveEventsOnly
- `636093` EPL10-LiveEventsOnly
- `636086` EPL3-LiveEventsOnly
- `636089` EPL6-LiveEventsOnly
- `636091` EPL8-LiveEventsOnly

### SPORTS | RUGBY (20 channels | 19 gems | 0 4K | 11 FHD | 3 HD)

- `23997` Sky Sport 1 FHD [FHD] [icon] *
- `23998` Sky Sport 2 FHD [FHD] [icon] *
- `23999` Sky Sport 3 FHD [FHD] [icon] *
- `24000` Sky Sport 4 FHD [FHD] [icon] *
- `343019` Sky Sport 5 FHD. [FHD] [icon] *
- `343020` Sky Sport 6 FHD. [FHD] [icon] *
- `343023` Sky Sport 9 FHD. [FHD] [icon] *
- `186618` SKY SPORTS ACTION FHD [FHD] [icon] *
- `158441` SuperSport Grandstand (FHD). [FHD] [icon] *
- `777` SuperSport Rugby (FHD) [FHD] [icon] *
- `255259` TNT SPORT 4 FHD [FHD] [icon] *
- `186617` SKY SPORTS ACTION HD [HD] [icon] *
- `186596` SKY SPORTS MAIN EVENT HD [HD] [icon] *
- `4749` Fox Sports 502 [icon] *
- `15` ITV [icon] *
- `34152` SKY Sport SELECT [icon] *
- `514389` SKY SPORTS 1 [icon] *
- `23564` TNT SPORT 1 [icon] *
- `23565` TNT SPORT 2. [icon] *
- `5481` ASTRO SUPER SPORTS 2 HD [HD] [icon]

### INDIAN ACTIVE (20 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `467679` Tata Play Anime Local
- `108877` Tata Play Asomiya Monoronjan 
- `467684` Tata Play Bollywood Premiere
- `52496` Tata Play Classic Cinema  [icon]
- `467491` Tata Play Classroom
- `467699` Tata Play Comedy
- `467701` Tata Play Darshan
- `467709` Tata Play English in Hindi
- `467711` Tata Play English in Telugu
- `467493` Tata Play Filmy Safar
- `108880` Tata Play Fitness
- `467712` Tata Play Fun Learn Junior
- `3749` Tata Play Ibaadat 
- `467657` Tata Play Music
- `52495` Tata Play ShortsTV 
- `108878` Tata Play South Talkies 
- `467659` Tata Play Specials
- `467664` Tata Play Videoshala
- `467673` Tata Play Welcome
- `108882` Tata Play Zindgi [icon]

### ALGERIA (20 channels | 0 gems | 0 4K | 0 FHD | 2 HD)

- `319330` Dz| Al Fajer 1 HD ✦ [HD]
- `319324` Dz| Echorouk News HD  ✦ [HD]
- `319331` Dz| Al Bahia TV ✦
- `319326` Dz| Al Heddaf TV ✦
- `319336` Dz| Algeria TV Coran [ Algerie 5 ] ✦
- `319334` Dz| Algerie 2 TV ✦
- `319322` Dz| Algerie 3 TV [ A3 ]  ✦
- `319337` Dz| Algerie 6 TV ✦
- `319320` Dz| Algerie [ ENTV 1 ]  ✦
- `319338` Dz| Algerie Elmaarifa TV7 ✦
- `319335` Dz| Algerie Tamazight TV4 ✦
- `319332` Dz| Berbere TV ✦
- `319321` Dz| Canal Algerie [ ENTV 2 ]  ✦
- `319323` Dz| Echorouk TV  ✦
- `319327` Dz| El Bilad TV ✦
- `319340` Dz| EL Watania TV Algeria ✦
- `319333` Dz| EnNahar TV ✦
- `319341` Dz| Sahra TV Algeria ✦
- `319325` Dz| Samira TV  ✦
- `319343` Dz| Zahra TV ✦

### GUJARATI (19 channels | 3 gems | 0 4K | 0 FHD | 8 HD)

- `5838` GUJ:CNBC Bajar GUJRATI HD [HD] *
- `3163` Guj:  Colors_Gujarati *
- `5850` Guj:Colors Gujarati *
- `5840` Guj: GSTV HD [HD]
- `5837` GUJ: TV9 GUJARATI HD [HD]
- `5832` GUJ:ABP Asmita HD [HD]
- `5836` GUJ:NEWS 18 GUJARATI HD [HD]
- `5844` Guj:Sandesh News HD [HD]
- `5834` GUJ:SANSKAR TV HD [HD]
- `5833` GuJ:Zee 24 Kalak HD [HD]
- `355553` GUJ: Gujarat First SD [SD]
- `355493` GUJ: India News Gujarat SD [SD]
- `4055` Guj:  DD Girnar
- `371443` GUJ: Aastha Gujarati
- `693039` GUJ: NEWS CAPITAL
- `379779` GUJ: TV9
- `5847` GUJ:India News Gujrat(lk)
- `5848` GUJ:Mantavya News Gujrat
- `5853` Guj:VTV NEWS  [icon]

### UK| DOCUMENTARY (19 channels | 18 gems | 0 4K | 4 FHD | 4 HD)

- `148265` Sky Documentaries FHD [FHD] *
- `97095` UK: Discovery (FHD) [FHD] *
- `148198` UKFHD : Sky History [FHD] *
- `148199` UKFHD : Sky History 2 [FHD] *
- `148352` UKHD : Discovery [HD] *
- `148342` UKHD : Nat Geo [HD] *
- `148315` UKHD : Nat Geo Wild [HD] *
- `148348` UKHD : Sky History [HD] *
- `148443` Sky Documentaries SD [SD] *
- `148570` UK SD : Animal Planet [SD] *
- `148713` UK SD : Animal Planet +1 [SD] *
- `148448` UK SD : Discovery Science [SD] *
- `148728` UK SD : Discovery Science +1 [SD] *
- `148447` UK SD : Discovery Turbo [SD] *
- `148710` UK SD : Discovery Turbo +1 [SD] *
- `148729` UK SD : Investigation Discovery +1 [SD] *
- `148510` UKSD : Nat Geo [SD] *
- `148449` UKSD Discovery History [SD] *
- `5026` UK: ID

### LEBANON (19 channels | 2 gems | 4 4K | 0 FHD | 8 HD)

- `309090` Lb| MTV Lebanon 4K ✦ [4K] *
- `309089` Lb| MTV Lebanon HD ✦ [HD] *
- `309094` Lb| LBC International 4K ✦ [4K]
- `309092` Lb| LBC TV 4K ✦ [4K]
- `309097` Lb| NBN 4K ✦ [4K]
- `309088` Lb| Al Jadeed TV HD+ ✦ [HD]
- `309087` Lb| Al-Jadeed TV HD ✦ [HD]
- `382971` Lb| LBC HD ✦ [HD]
- `309093` Lb| LBC International HD ✦ [HD]
- `309098` Lb| Lebanon TV [ Tele Liban ] HD ✦ [HD]
- `309096` Lb| NBN HD ✦ [HD]
- `309099` Lb| OTV Lebanon HD ✦ [HD]
- `309107` Lb| Aghani ✦
- `309103` Lb| Al Iman TV ✦
- `309101` Lb| Al Manar TV ✦
- `309102` Lb| Al Manar TV+ ✦
- `309100` Lb| Al Mayadeen TV ✦
- `309104` Lb| One TV ✦
- `309110` Lb| Taha TV ✦

### SHAHED BOX (17 channels | 17 gems | 0 4K | 0 FHD | 10 HD)

- `308997` Shahid Al Arabiya Business HD [HD] *
- `308988` Shahid AlThaqafeya HD [HD] *
- `308985` Shahid Freej HD [HD] *
- `308998` Shahid Khaleeji HD [HD] *
- `309002` Shahid Maraya HD [HD] *
- `309004` Shahid Masrah Masr HD [HD] *
- `309005` Shahid Ragel We Set Settat HD [HD] *
- `308974` Shahid Selfie HD [HD] *
- `308996` Shahid Tash HD [HD] *
- `308973` Shahid The Game HD [HD] *
- `308979` Shahid Al Asouf *
- `308977` Shahid Al Kabeer Awi *
- `308975` Shahid Bab Al Hara *
- `308990` Shahid Gulli Bil Arabi *
- `308980` Shahid Movies Action *
- `308981` Shahid Movies Thriller *
- `308986` Shahid Naser Al Qassaby *

### UK| NEWS (15 channels | 11 gems | 0 4K | 7 FHD | 4 HD)

- `148227` UK FHD : CNBC [FHD] *
- `148282` UK FHD : CNN [FHD] *
- `148224` UK FHD : NBC News Now [FHD] *
- `148178` UK FHD : Sky Sports News [FHD] *
- `23343` UK: Sky Sports News (FHD) [FHD] [icon] *
- `148251` UKFHD : Al Jazeera [FHD] *
- `148365` UK HD : BBC News [HD] *
- `148287` UK HD : CNBC [HD] *
- `148302` UKHD : Al Jazeera [HD] *
- `148335` UKHD : Sky News [HD] *
- `148685` Sky Sports News SD Hevc [SD] *
- `148243` UK FHD : GB News [FHD]
- `148379` UK SD : Arise News [SD]
- `148377` UK SD : TVC News [SD]
- `148367` RTE_News

### SYRIA (15 channels | 0 gems | 2 4K | 0 FHD | 1 HD)

- `309063` Sy| Lana TV 4K ✦ [4K]
- `309075` Sy| Syrian TV 4K ✦ [4K]
- `309062` Sy| Lana TV HD ✦ [HD]
- `309064` Sy| Lana TV SD ✦ [SD]
- `309079` Sy| Al Alam Syria TV ✦
- `309078` Sy| Al Qanat 9 ✦
- `309080` Sy| Al Yaum TV ✦
- `309074` Sy| Halab Today TV ✦
- `309060` Sy| Sama TV ✦
- `309081` Sy| Souryana ✦
- `309067` Sy| Syria Drama Plus ✦
- `309066` Sy| Syria Drama ✦
- `309070` Sy| Syria News TV ✦
- `309071` Sy| Syria News ✦
- `309069` Sy| Syria TV Plus ✦

###  SPORTS | INDIA (14 channels | 11 gems | 9 4K | 5 FHD | 0 HD)

- `23308` IN: EUROSPORTS (4K) [4K] [icon] *
- `98870` IN: SONY TEN 5 (4K). [4K] [icon] *
- `98864` IN: STAR SPORTS 1 (4K). [4K] [icon] *
- `98866` IN: STAR SPORTS 1 HINDI (4K). [4K] [icon] *
- `98865` IN: STAR SPORTS 2 (4K). [4K] [icon] *
- `98867` IN: STAR SPORTS SELECT 1 (4K). [4K] [icon] *
- `9402` IN: Sony Ten 1 (FHD) [FHD] [icon] *
- `9404` IN: Sony Ten 3 (FHD) [FHD] [icon] *
- `17565` IN: SONY TEN 5 (FHD) [FHD] [icon] *
- `9400` IN: Star Sports Select 1 (FHD) [FHD] [icon] *
- `9401` IN: Star Sports Select 2 (FHD) [FHD] [icon] *
- `98868` IN: START SPORTS SELECT 2 (4K). [4K] [icon]
- `98861` IN: TEN 1 (4K). [4K] [icon]
- `98863` IN: TEN 3 (4K). [4K] [icon]

### MOROCCO (14 channels | 0 gems | 0 4K | 0 FHD | 4 HD)

- `319353` Mor| Al Aoula Al Eyoon 1 HD ✦ [HD]
- `319352` Mor| Al Aoula HD ✦ [HD]
- `319356` Mor| Arryadia HD ✦ [HD]
- `319367` Mor| Tele Maroc HD ✦ [HD]
- `319357` Mor| Arryadia SD ✦ [SD]
- `319351` Mor| Al Aoula Inter ✦
- `319361` Mor| Al Maghribia ✦
- `319362` Mor| Al-Magharibia TV ✦
- `319358` Mor| Arrabiaa 4 [ Athaqafia ] ✦
- `319359` Mor| Assadissa 6 ✦
- `319369` Mor| Canal Atlas  ✦
- `319354` Mor| Laayoune TV ✦
- `319365` Mor| Medi 1 TV [ Afrique ]  ✦
- `319364` Mor| Medi 1 TV [ Arabic ] ✦

### SPORTS | SPORTS (13 channels | 10 gems | 0 4K | 1 FHD | 11 HD)

- `564` DE: DAZN Sport 2 HD [HD] [icon] *
- `503` NL : ESPN SPORTS 1 HD [HD] [icon] *
- `505` NL : ESPN SPORTS 3 HD [HD] [icon] *
- `509` NL : EUROSPORT 1 HD [HD] [icon] *
- `325` PT: EUROSPORT 2 HD [HD] [icon] *
- `315` PT: SPORT TV 2 HD [HD] [icon] *
- `318` PT: Sport TV 5 HD [HD] [icon] *
- `314` PT: SPORT TV1 HD [HD] [icon] *
- `18451` USA : BeIN SPORTS HD [HD] [icon] *
- `615` FR: RMC SPORTS 3 [icon] *
- `1971` PL: POLSAT SPORT FIGHT FHD [FHD] [icon]
- `327` PT: ELEVEN SPORT 1 HD [HD] [icon]
- `329` PT: ELEVEN SPORT 3 HD [HD] [icon]

### Oriya (13 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `355558` ORI: Prarthana SD [SD]
- `139239`  Ori_Kalinga TV
- `139238`  Ori_Kanak_TV
- `289452`  Ori_TarangMusic
- `289451`  Ori_TarangTv
- `4052` IN: DD Odia
- `693045` ORI : ARGUS NEWS
- `693041` ORI : JAY JAGANNATH
- `693044` ORI : PRARTHANA LIFE
- `693043` ORI : SIDHARTH UTSAV
- `139240` Ori_Badakhabar
- `153302` Sidharth TV
- `153301` Zee Sarthak

### MALAYSIA (13 channels | 5 gems | 0 4K | 0 FHD | 1 HD)

- `142996` MY Colors *
- `142997` MY Colors Tamil *
- `142988` MY Euronews *
- `142961` MY Nat Geo Wild *
- `142991` MY Sky News *
- `142995` MY BOLLYONE_HD_50fps [HD]
- `142986` MY BBC_Earth
- `142990` MY DW
- `142987` MY LuxeTV
- `142964` MY NHK_World_Japan
- `142999` MY Phoenix
- `142962` MY TVN
- `142963` MY TVN Movies

### CANADA (LIVE EVENT ONLY) (13 channels | 10 gems | 0 4K | 0 FHD | 0 HD)

- `615933` CA-DAZN 38: UEFA Conference League| Strasbourg vs. Jagiellonia Białystok| Thu 23 Oct 12:45 PM *
- `615934` CA-DAZN 39: UEFA Conference League| Shakhtar Donetsk vs. Legia Warsaw| Thu 23 Oct 12:45 PM *
- `615937` DAZN CA 42 : *
- `615938` DAZN CA 43 : *
- `615939` DAZN CA 44 : *
- `615941` DAZN CA 46 : *
- `615942` DAZN CA 47 : *
- `615943` DAZN CA 48 : *
- `615944` DAZN CA 49 : *
- `615945` DAZN CA 50 : *
- `615946` CA Dejaview
- `615954` CA | CFL 01:
- `615956` CA | CFL 03:

### KANNADA MOVIES 24/7 (13 channels | 0 gems | 0 4K | 0 FHD | 13 HD)

- `136244` KANNADA-AMBAREESH MOVIES HD [HD]
- `136228` KANNADA-CLASSIC MOVIES 4 HD [HD]
- `136251` KANNADA-EROSNOW CLASSIC MOVIES 1 HD [HD]
- `136252` KANNADA-EROSNOW CLASSIC MOVIES 2 HD [HD]
- `136250` KANNADA-EROSNOW MOVIE 1 HD [HD]
- `136249` KANNADA-JAGGESH MOVIES HD [HD]
- `136243` KANNADA-LOKESH MOVIES HD [HD]
- `136248` KANNADA-PRWAL DEVARAJ MOVIES HD [HD]
- `136242` KANNADA-RAJKUMAR MOVIES HD [HD]
- `136247` KANNADA-RAMESH ARAVIND MOVIES HD [HD]
- `136241` KANNADA-SHANKAR NAG MOVIES HD [HD]
- `136246` KANNADA-SHIVA RAJKUMMAR MOVIES HD [HD]
- `136245` KANNADA-SUDEEP MOVIES HD [HD]

### NETFLIX MOVIES 24/7 (13 channels | 0 gems | 0 4K | 0 FHD | 13 HD)

- `136291` NETFLIX-ACTION ADVENTURE MOVIES HD [HD]
- `136290` NETFLIX-ACTION COMEDY MOVIED HD [HD]
- `136286` NETFLIX-ACTION MOVIES HD [HD]
- `136292` NETFLIX-ACTION-CRIME MOVIES HD [HD]
- `136289` NETFLIX-ADVENTURE MOVIES HD [HD]
- `136288` NETFLIX-ANIMATION MOVIES HD [HD]
- `136287` NETFLIX-BIOGRAPHY MOVIES HD [HD]
- `136298` NETFLIX-COMEDY ROMANCE MOVIES HD [HD]
- `136296` NETFLIX-CRIME MOVIES HD [HD]
- `136283` NETFLIX-HORROR MOVIES HD [HD]
- `136295` NETFLIX-ROMANCE MOVIES HD [HD]
- `136293` NETFLIX-SPORT MOVIES HD [HD]
- `136294` NETFLIX-THRILLER HORROR MOVIES HD [HD]

### UK| KIDS (12 channels | 11 gems | 0 4K | 7 FHD | 1 HD)

- `148211` Cartoon Network FHD [FHD] *
- `148212` UK FHD : CBeebies [FHD] *
- `148256` UK FHD : Nick Jr [FHD] *
- `148190` UK FHD : Nickelodeon [FHD] *
- `148222` UK FHD : Sky Kids [FHD] *
- `34171` UK: SKY CINEMA ANIMATION (FHD) [FHD] *
- `148312` UKHD : BOOMERANG [HD] *
- `148563` UK SD :  Boomerang +1 [SD] *
- `148735` UK SD : Nickelodeon +1 [SD] *
- `148506` UKSD Nick Jr. Too [SD] *
- `148504` UKSD Nicktoons [SD] *
- `148214` UKFHD : Bloomberg [FHD]

### ARABIC (12 channels | 12 gems | 0 4K | 2 FHD | 10 HD)

- `309057` Rotana Classic FHD [FHD] *
- `309056` Rotana Comedy FHD [FHD] *
- `309045` Rotana + HD [HD] *
- `309047` Rotana Aflam + HD [HD] *
- `309054` Rotana Cinema Egy HD [HD] *
- `309055` Rotana Cinema KSA HD [HD] *
- `309050` Rotana Classic HD [HD] *
- `309048` Rotana Clip HD [HD] *
- `309053` Rotana Comedy HD [HD] *
- `309051` Rotana Drama HD [HD] *
- `309052` Rotana Khalijiah HD [HD] *
- `309049` Rotana Music HD [HD] *

### UAE (12 channels | 3 gems | 0 4K | 0 FHD | 3 HD)

- `319614` Uae: Abu Dhabi Al Emarat SD [SD] *
- `319609` Uae: Dubai TV *
- `319617` Uae: Noor Dubai TV *
- `319619` Uae: Sharjah HD [HD]
- `319620` Uae: Sharjah Sport HD [HD]
- `319621` Uae: Sharqiya from Kalba HD [HD]
- `319611` Uae: Dubai Zaman
- `319625` Uae: Fujairah TV
- `319627` Uae: Majid Kids TV
- `319616` Uae: Sama Dubai
- `319628` Uae: SpaceToon TV
- `319606` Uae: Zee Alwan

### MALAYALAM | MOVIES (12 channels | 2 gems | 1 4K | 0 FHD | 8 HD)

- `177842` MAL | ASIANET MOVIES 4K [4K] [icon] *
- `9031` MAL | ASIANET MOVIES  SD [SD] [icon] *
- `169` MAL | KAUMUDY TV HD [HD] [icon]
- `127305` MAL | MAGNAVISION TV HD [HD] [icon]
- `9034` MAL | SURYA MOVIES HD [HD] [icon]
- `135579` MALAYALAM-BIJU MENON MOVIES HD [HD] [icon]
- `135576` MALAYALAM-MAMMOOTHY MOVIES HD [HD] [icon]
- `135574` MALAYALAM-MOHANLAL MOVIES HD [HD] [icon]
- `135529` MALAYALAM-MOVIES 2 HD [HD] [icon]
- `135570` MALAYALAM-SURESH GOPI MOVIES HD [HD] [icon]
- `169822` MAL | KAUMUDY TV ᴴᴰ [icon]
- `121375` MAL | Malayalam_2022_2021_Collection_vol_1 [icon]

### AMAZON MOVIES 24/7 (12 channels | 0 gems | 0 4K | 0 FHD | 12 HD)

- `136253` AMAZONPRIME-ACRIME MOVIES HD [HD]
- `136254` AMAZONPRIME-ACTION MOVIES HD [HD]
- `136255` AMAZONPRIME-ADVENTURE MOVIES HD [HD]
- `136256` AMAZONPRIME-BIOGRAPHY MOVIES HD [HD]
- `136257` AMAZONPRIME-COMEDY MOVIES HD [HD]
- `136266` AMAZONPRIME-DRAMA MOVIES HD [HD]
- `136263` AMAZONPRIME-FANTASY MOVIES HD [HD]
- `136261` AMAZONPRIME-MUSICAL MOVIES HD [HD]
- `136265` AMAZONPRIME-MYSTERY MOVIES HD [HD]
- `136260` AMAZONPRIME-ROMANCE MOVIES HD [HD]
- `136264` AMAZONPRIME-SCI FI MOVIES HD [HD]
- `136259` AMAZONPRIME-THRILLER MOVIES HD [HD]

### INDIA MUSIC (11 channels | 4 gems | 1 4K | 2 FHD | 2 HD)

- `94499` IN: MTV Plus (4K) [4K] [icon] *
- `23791` IN: MTV HD Plus (FHD) [FHD] [icon] *
- `130045` MTV FHD (HINDI) [FHD] [icon] *
- `4029` IN: MTV HD PLUS [HD] [icon] *
- `9057` IN: 9X Jalwa HD [HD] [icon]
- `355545` IN: B4U Kadak SD [SD]
- `969` IN : B4U Plus [icon]
- `7255` IN: 9XM [icon]
- `7258` IN: B4U Music [icon]
- `970` IN: Zing TV [icon]
- `9488` IN: Zoom [icon]

### ARABIC MUSIC (11 channels | 2 gems | 0 4K | 0 FHD | 2 HD)

- `319383` Music: MBC FM HD [HD] *
- `319388` Music: Rotana Music HD [HD] *
- `319386` Music: Aghani
- `319377` Music: Arabica TV
- `319378` Music: Arabica TV
- `319374` Music: Music Alhanen
- `319376` Music: Music Alremas
- `319375` Music: Music Alremas 2
- `319381` Music: Nogoum FM TV
- `319395` Music: Trace Urban
- `319385` Music: Wanasah TV

### TELUGU MOVIES 24/7 (11 channels | 0 gems | 0 4K | 0 FHD | 10 HD)

- `136468` TELUGU-ACTION CRIME MOVIES HD [HD]
- `136469` TELUGU-ACTION THRILLER MOVIES HD [HD]
- `136463` TELUGU-CLASSIC MOVIES 2 HD [HD]
- `136467` TELUGU-COMEDY MOVIES HD [HD]
- `136457` TELUGU-MOVIES 1 HD [HD]
- `136458` TELUGU-MOVIES 2 HD [HD]
- `136459` TELUGU-MOVIES 3 HD [HD]
- `136472` TELUGU-MYSTERY MOVIES HD [HD]
- `136471` TELUGU-ROMANCE MOVIES HD [HD]
- `136470` TELUGU-THRILLER MOVIES HD [HD]
- `121374` 24/7: Telugu_2022_2021_Collection_vol_1 [icon]

### TAMIL | NEWS (10 channels | 0 gems | 0 4K | 0 FHD | 2 HD)

- `5906` TM: NEWS 18 TAMIL NADU HD [HD] [icon]
- `5907` TM: NEWS 7 TAMIL HD [HD]
- `160589` TAMIL: News Tamil 24x7 [icon]
- `256457` Tamil: Sathiyam Tv news
- `5897` TM: Kalaignar TV News [icon]
- `5908` TM: NEWS J
- `5911` TM: POLIMER NEWS
- `237` TM: POLIMER NEWS [icon]
- `380978` TM: Raj News Tamil
- `1613` TM: SUN NEWS [icon]

### SPORTS | SKY UK (4K) (10 channels | 10 gems | 0 4K | 0 FHD | 0 HD)

- `122413` UK || SKY SPORTS ACTION [icon] *
- `122412` UK || SKY SPORTS CRICKET [icon] *
- `122411` UK || SKY SPORTS FOOTBALL [icon] *
- `122417` UK || SKY SPORTS GOLF [icon] *
- `122409` UK || SKY SPORTS MAIN EVENT [icon] *
- `122416` UK || SKY SPORTS MIX [icon] *
- `122408` UK || SKY SPORTS NEWS [icon] *
- `122414` UK || SKY SPORTS PLUS [icon] *
- `122410` UK || SKY SPORTS PREMIER LEAGUE [icon] *
- `122415` UK || SKY SPORTS RACING [icon] *

### SPORTS | UK MIX (10 channels | 9 gems | 1 4K | 0 FHD | 0 HD)

- `148679` Sky Sports Cricket SD Hevc [SD] [icon] *
- `148680` Sky Sports F1 SD Hevc [SD] [icon] *
- `148682` Sky Sports Golf SD Hevc [SD] [icon] *
- `148684` Sky Sports mix SD Hevc [SD] [icon] *
- `148678` Sky Sports Plus SD Hevc [SD] *
- `148676` UK SD : Euronews [SD] [icon] *
- `148561` UK SD : TNT Sport 1 [SD] [icon] *
- `148560` UK SD : TNT Sport 2 [SD] [icon] *
- `148559` UK SD : TNT Sport 3 [SD] [icon] *
- `148270` UK | LA LIGA TV (4K) [4K] [icon]

### Assam (8 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `23949` IN:  DD North East
- `23954` IN:  DY 365
- `23956` IN:  News18 Assam North East
- `23952` IN: Indradhanu
- `23957` IN: Prag News
- `23953` IN: Ramdhenu
- `23950` IN: Rang
- `374557` IN; ND24

### SPORTS | DSTV SUPER (FHD) (8 channels | 4 gems | 0 4K | 4 FHD | 0 HD)

- `157948` DSTV : SuperSport Action (FHD). [FHD] [icon] *
- `157939` DSTV : SUPERSPORT CRICKET (FHD) [FHD] [icon] *
- `157942` DSTV : SUPERSPORTS FOOTBALL (FHD). [FHD] [icon] *
- `157940` DSTV : SUPERSPORTS PREMIER LEAGUE (FHD). [FHD] [icon] *
- `647773` AZAM |Azam Sports 1
- `647775` AZAM |Azam Sports 2
- `647790` AZAM |Azam Sports 3
- `171951` |ZM| SS Cricket

### QATAR (8 channels | 3 gems | 1 4K | 0 FHD | 4 HD)

- `319638` Qa| Al Jazeera 4K ✦ [4K] *
- `319635` Qa| Al Jazeera Documentary HD ✦ [HD] *
- `319639` Qa| Al Jazeera HD ✦ [HD] *
- `319643` Qa| Qatar 2 HD ✦ [HD]
- `319642` Qa| Qatar HD ✦ [HD]
- `319640` Qa| Al Rayyan Al Qadeem TV ✦
- `319641` Qa| Al Rayyan TV ✦
- `319634` Qa| Qatar Today 1 ✦

### CHRISTIAN (8 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `355307` FAZAL TV
- `355346` GRACE TV
- `355320` JOSHUA TV
- `355316` KING TV
- `355332` MISSION ASIA
- `355348` PAK 7
- `355329` PMI TV
- `355306` Praise Tv

### SPORTS | GOLF (7 channels | 7 gems | 0 4K | 3 FHD | 2 HD)

- `847` GOLF FHD [FHD] [icon] *
- `3294` GOLF FHD [FHD] [icon] *
- `23338` UK: Sky Sports Golf (FHD) [FHD] [icon] *
- `5712` MY: GOLF CHANNEL HD [HD] [icon] *
- `56` USA: NBC GOLF HD [HD] [icon] *
- `11` UK: SKY SPORTS GOLF [icon] *
- `3072` |FR| GOLF+ [icon] *

### AFGHANISTAN (7 channels | 0 gems | 0 4K | 0 FHD | 2 HD)

- `1052` AFG:Tolo News HD [HD]
- `1053` AFG:Tolo TV HD [HD]
- `5027` AFG: Zhwandoon TV
- `1042` AFG:ATN News
- `1048` AFG:Lemar TV
- `1050` AFG:Shamshad
- `1051` AFG:Tamadon TV

### KUWAIT (7 channels | 0 gems | 0 4K | 0 FHD | 5 HD)

- `319654` Kw| Al Rai HD ✦ [HD]
- `319659` Kw| Kuwait 1 HD ✦ [HD]
- `319660` Kw| Kuwait 2 HD ✦ [HD]
- `319661` Kw| Kuwait Al Arabi HD ✦ [HD]
- `319663` Kw| Kuwait Sport HD ✦ [HD]
- `319664` Kw| Kuwait Khallik Bilbait Plus ✦
- `319656` Kw| Kuwait Sport Plus ✦

### TAMIL (6 channels | 1 gems | 0 4K | 0 FHD | 1 HD)

- `296241` TM: JothiTV [icon] *
- `5877` TM: AASTHA TAMIL HD [HD] [icon]
- `355560` TM: SVBC 2 SD [SD]
- `5887` TM: DD PODHIGAI [icon]
- `371554` TM: DD Tamil
- `376324` TM: Thanthi One

### SPORTS | TENNIS (6 channels | 2 gems | 1 4K | 1 FHD | 2 HD)

- `428098` UK FHD : SKY SPORTS TENNIS FHD [FHD] [icon] *
- `286` TNT SPORT 1 [icon] *
- `274141` beIN Sport English 1 4k [4K]
- `40516` Tennis Channel Plus 5 HD ( LIVE EVENT ) [HD] [icon]
- `1565` |CA| TSN 1 | HD [HD]
- `712` USA: Tennis Channel [icon]

### HUB PREMIER (6 channels | 0 gems | 0 4K | 6 FHD | 0 HD)

- `148158` Hub Premier 1 FHD [FHD]
- `148161` Hub Premier 4 FHD [FHD]
- `148162` Hub Premier 5 FHD [FHD]
- `148163` Hub Premier 6 FHD [FHD]
- `148164` Hub Premier 7 FHD [FHD]
- `148165` Hub Premier 8 FHD [FHD]

### SPORTS | DSTV SUPER (5 channels | 4 gems | 0 4K | 3 FHD | 2 HD)

- `774` DSTV : SuperSport Action (FHD) [FHD] [icon] *
- `769` DSTV : SuperSport Cricket (FHD) [FHD] [icon] *
- `521` DSTV : SuperSport Action HD [HD] [icon] *
- `516` DSTV: SuperSport Cricket HD [HD] [icon] *
- `24115` DSTV: SUPER SPORTS CRICKET (FHD). [FHD] [icon]

### SPORTS | FOX AUSTRALIA (5 channels | 5 gems | 0 4K | 0 FHD | 0 HD)

- `4748` AU: Fox Sports 501 [icon] *
- `4750` AU: Fox Sports 503 [icon] *
- `4752` AU: Fox Sports 505 *
- `4754` AU: Fox Sports 507 *
- `5442` AU: Fox Sports News *

### BANGLA MOVIES 24/7 (5 channels | 0 gems | 0 4K | 0 FHD | 5 HD)

- `136496` BANGLA-MOVIES 3 HD [HD]
- `136497` BANGLA-MOVIES 4 HD [HD]
- `136498` BANGLA-MOVIES 5 HD [HD]
- `136500` BANGLA-MOVIES 7 HD [HD]
- `136502` BANGLADESH-MIX SONGS HD [HD]

### PUNJABI MOVIES 24/7 (5 channels | 0 gems | 0 4K | 0 FHD | 5 HD)

- `136305` PUNJABI-COMEDY MOVIES HD [HD]
- `136306` PUNJABI-CRIME MOVIES HD [HD]
- `136299` PUNJABI-MOVIES 1 HD [HD]
- `136300` PUNJABI-MOVIES 2 HD [HD]
- `136302` PUNJABI-MOVIES 4 HD [HD]

### UK| MUSIC (4 channels | 1 gems | 0 4K | 0 FHD | 1 HD)

- `5809` UK: MTV HD [HD] [icon] *
- `148636` UKSD : NOW 70s [SD]
- `148456` UKSD : NOW 80s [SD]
- `148502` UKSD : NOW 90s [SD]

### USA ASIAN (4 channels | 0 gems | 0 4K | 0 FHD | 1 HD)

- `34155` US: SONY HD [HD] [icon]
- `36917` US: ARY Digital
- `36921` US: GEO TV
- `36926` US: HUM Sitaray

### RACING | F1 MOTOGP (4 channels | 2 gems | 1 4K | 1 FHD | 2 HD)

- `122181` UK: Sky Sports F1 (4K) [4K] [icon] *
- `144581` UK: SKY SPORTS F1 HD [HD] [icon] *
- `124000` DSTV : Super Motorsport (FHD). [FHD]
- `231152` FR: AUTOMOTO HD [HD]

### FINLAND (4 channels | 1 gems | 0 4K | 0 FHD | 0 HD)

- `556527` FI: TLC [icon] *
- `556508` FI: Himlen TV 7 [icon]
- `556519` FI: Nar-TV [icon]
- `556526` FI: Taevas TV 7 [icon]

### NFL (LIVE ONLY MATCH TIME) (4 channels | 4 gems | 0 4K | 0 FHD | 0 HD)

- `402093` NFL || CNBC ᴴᴰ [icon] *
- `402091` NFL || ESPN ᴴᴰ [icon] *
- `402090` NFL || NFL NETWORK ᴴᴰ [icon] *
- `402095` NFL || SKY SPORTS ᴴᴰ [icon] *

### MALAYALAM | SONGS (3 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `9039` MY: Kappa_TV [icon]
- `245` MY: Raj Music Malayalam [icon]
- `9038` MY: SURYA MUSIC [icon]

### CZECH (3 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `661210` CZ | AXN
- `661166` CZ | Barrandov Krimi
- `661155` CZ | CT24

### BHOJPURI (2 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `355544` B4U Bhojpuri SD [SD]
- `355561` Sudarshan SD [SD]

### DSTV | KIDS (1 channels | 1 gems | 0 4K | 0 FHD | 0 HD)

- `23370` DSTV: Boomerang [icon] *

### NEW ZEALAND (1 channels | 1 gems | 0 4K | 1 FHD | 0 HD)

- `24003` NZ: Sky Sport 7 FHD [FHD] *

### DSTV | ENTERTAINMENT (FHD) (1 channels | 0 gems | 0 4K | 1 FHD | 0 HD)

- `157982` DSTV: kykNET (FHD) [FHD] [icon]

### DSTV | KIDS (FHD) (1 channels | 1 gems | 0 4K | 1 FHD | 0 HD)

- `158031` DSTV: Boomerang (FHD) [FHD] [icon] *

### PHILIPPINES (1 channels | 0 gems | 0 4K | 0 FHD | 0 HD)

- `19206` [PH] Cinema One

### Bollywood Singers 24/7 (1 channels | 0 gems | 0 4K | 0 FHD | 1 HD)

- `135436` HINDI-KISHOR KUMAR SONGS HD [HD]

---

## Optimal Channel Ordering per Theme

The recommended ordering for each theme follows this priority:

1. **GEMS first** -- recognizable premium brands users search for
2. **4K before FHD before HD before SD** -- best quality first
3. **Channels with icons** -- better visual presentation in the grid
4. **Alphabetical** -- within same tier for easy scanning

This ordering is already applied in the Full Inventory above. The `sort_key` logic is:
```
(is_gem DESC, quality_tier ASC, name ASC)
```

For the DashTivi+ app, implement this as:
```javascript
channels.sort((a, b) => {
  if (a.isGem !== b.isGem) return a.isGem ? -1 : 1;
  if (a.qualityTier !== b.qualityTier) return a.qualityTier - b.qualityTier;
  if (a.hasIcon !== b.hasIcon) return a.hasIcon ? -1 : 1;
  return a.name.localeCompare(b.name);
});
```

---

## Action Items for Repackaging

### P0 (Before Launch)
1. Create 8 curated theme groups (Football, UK/US Entertainment, French, Movies, Kids, Documentary, Arabic, Indian)
2. Apply gem-first + quality-tier sorting to every theme
3. Hide separator channels (========= lines)
4. Auto-group quality variants of the same channel (show best quality, offer toggle)

### P1 (Launch Week)
5. Add channel icons for all gem channels (scrape from EPG or manual upload)
6. Merge regional duplicates (e.g., Discovery appears in 10+ categories)
7. Create 'News Hub' cross-category collection
8. Add 'Recently Added' sort option

### P2 (Post-Launch)
9. Build viewer analytics to identify actual popular channels in SL/Guinea
10. Auto-hide categories with <5 alive channels
11. Implement smart search across all categories
12. Create personalized 'My Channels' favorites

---

*Generated by ZION SYNAPSE channel curation audit, 2026-03-28*