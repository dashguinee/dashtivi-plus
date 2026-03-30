/**
 * DashTivi+ Collections — Curated content experiences
 *
 * Collections define WHAT to show and HOW to show it.
 * The homepage reads these to build a personalized, time-aware experience.
 *
 * Category IDs are from the Starshare/Xtream API.
 */

// ── Channel Relocation Map ──────────────────────────────────────────
// Channels that Starshare put in the wrong category.
// Key = stream_id, Value = experience they SHOULD appear in.
// enrichIcons() injects these into the correct experience at render time.
export const RELOCATE_MAP: Record<number, string> = {
  // Bloomberg → news (was in Kids 410, UHD 578, various)
  148214: 'news',    // UKFHD: Bloomberg (from Kids)
  466663: 'news',    // Bloomberg UHD (from UHD Sports 578)

  // Sports channels buried in USA Entertainment (cat 2)
  34071: 'sports',   // ESPN HD
  34072: 'sports',   // ESPN 2 HD
  34073: 'sports',   // ESPN U
  34074: 'sports',   // Fox Sports 1
  34076: 'sports',   // Fox Sports 2
  34080: 'sports',   // WWE Network
  34081: 'sports',   // NBA TV
  34082: 'sports',   // NBA Network
  34083: 'sports',   // NHL Network
  34084: 'sports',   // MLB Network
  34085: 'sports',   // NFL Network
  34086: 'sports',   // NFL RedZone
  34087: 'sports',   // UFC Fight pass
  34088: 'sports',   // Red Bull TV
  34089: 'sports',   // beIN Sports La Liga
  // Additional USA sports confirmed by audit 2026-03-30
  52: 'sports',      // USA: ESPN 1
  53: 'sports',      // USA: ESPN 2 HD
  54: 'sports',      // USA: Fox Sport 1 HD (FS1)
  55: 'sports',      // USA: Fox Sport 2 HD (FS2)
  711: 'sports',     // USA: WWE NETWORK
  1010: 'sports',    // US: NBA TV
  1011: 'sports',    // US: ESPN
  1012: 'sports',    // US: NBA Network
  1013: 'sports',    // US: NHL Network
  1014: 'sports',    // US: MLB Network
  1015: 'sports',    // US: NFL Network
  1057: 'sports',    // US: UFC Fight pass
  3415: 'sports',    // US: NFL Network (dup)
  3420: 'sports',    // USA: FOX SPORTS 1
  3421: 'sports',    // USA: FOX SPORTS 2
  23550: 'sports',   // US: NFL RedZone HD
  130044: 'sports',  // US: Fox Sports 1

  // Non-sports in UHD Sports (cat 578) — real 4K category
  466660: 'movies247',     // KINO Cinema Ultra HD
  466661: 'europe',        // RTL DE UHD
  466662: 'europe',        // PRO7SAT.1 DE UHD
  466664: 'europe',        // RAI 1 IT UHD
  466665: 'europe',        // LA 1 ES UHD
  466666: 'documentary',   // Odisea ES UHD
  466667: 'europe',        // TRT TR UHD
  466668: 'entertainment', // Fashion TV UHD
  // Additional UHD misplacements (non-sport UHD streams in sport cat 578)
  688278: 'europe',        // UHD QUADRO [RU]
  688279: 'europe',        // UHD ULTRA REX [RU]
  688280: 'movies247',     // UHD KINO [RU]
  688281: 'movies247',     // UHD CINEMA ULTRA HD [RU]
  688282: 'europe',        // UHD RTL [DE]
  688285: 'europe',        // UHD PRO7SAT.1 [DE]
  688287: 'europe',        // UHD RAI 1 [IT]
  688290: 'europe',        // UHD LA 1 [ES]
  688291: 'documentary',   // UHD ODISEA [ES]
  688292: 'europe',        // UHD TRT [TR]
  688306: 'entertainment', // UHD FASHION TV [AL]
  688308: 'sports',        // UHD BENFICA TV [PT] — correct sport but was in UHD generic

  // Al Rabiaa Iraq non-sports in Arabic Sports (cat 156)
  605085: 'faith',         // Al Rabiaa Quran / Iraq
  605087: 'arabic',        // Al Rabiaa Series
  605088: 'arabic',        // Al Rabiaa Variety
  605089: 'music',         // Al Rabiaa Music
  605090: 'movies247',     // Al Rabiaa Movies
  605091: 'documentary',   // Al Rabiaa Geo

  // Sky Sports News → sports (was in News cat 82)
  23: 'sports',            // UK: Sky Sports News FHD

  // Euronews → news (was in Sports UK Mix cat 139)
  148676: 'news',          // Euronews (UK SD)

  // DD Sports buried in INDIAN SD (should be sports)
  4044: 'sports',          // IN: DD Sports (4K)

  // Kids channels misplaced in Africa Canal+ (cat 336) → kids
  145031: 'kids',          // FR (C+AF) CANAL+ KIDS
  145079: 'kids',          // FR (C+AF) DISNEY CHANNEL
  145080: 'kids',          // FR (C+AF) DISNEY JUNIOR
  145133: 'kids',          // FR (C+AF) LUDIKIDS
  145156: 'kids',          // FR (C+AF) NICKELODEON

  // Kids buried in USA Entertainment (cat 2) → kids
  3402: 'kids',            // US: DISNEY JR EAST
  3403: 'kids',            // US: DISNEY XD EAST
  // 148214 (Bloomberg in UK Kids) already set above

  // Iran Kids in IRAN general (cat 751) → kids
  638685: 'kids',          // IR: ITOON HD
  638686: 'kids',          // IR: Gem Kids HD
  638687: 'kids',          // IR: Gem Junior HD
};

// ── Hidden Channels ─────────────────────────────────────────────────
/** Channels to never show — separators, ghosts, placeholders, true junk.
 *  Deep audit 2026-03-30 — full inventory of 11,264 channels across 146 categories. */
export const HIDDEN_STREAM_IDS = new Set([
  // ── Section separators (not real channels — display names are "=======") ──
  // Germany separators
  659186, 659215, 659243, 659254, 659425, 659464,
  // Netherlands separator
  659492,
  // Poland separator
  660114,
  // Denmark separator
  660639,
  // Sweden separator
  660692,
  // Albania section headers (8 of them)
  660743, 660821, 660839, 660853, 660868, 660907, 661027, 661075,
  // Austria separator
  661086,
  // NBA League Pass separator
  661131,
  // Czech separator
  661152,
  // Bulgaria separator
  661238,

  // ── Empty event slots (Sportsnet+ / DAZN CA trailing placeholders) ──
  // Sportsnet+ 19-50 (no event assigned)
  615708, 615709, 615710, 615711, 615712, 615713, 615714, 615715,
  615716, 615717, 615718, 615719, 615720, 615721, 615722, 615723,
  615724, 615725, 615726, 615727, 615728, 615729, 615730, 615731,
  615732, 615733, 615734, 615735, 615736, 615737, 615738, 615739,
  // DAZN CA empty slots
  615923, 615936, 615937, 615938, 615939, 615940, 615941, 615942,
  615943, 615944, 615945,

  // ── MLS dead placeholders (year 2098 expiry, no content) ──
  613068, 613069, 613070, 613071, 613072, 613073, 613074,
  613075, 613076, 613077, 613078, 613079, 613080,

  // ── NFL "No Scheduled Event" ghost slots ──
  428135, 428136, 428151, 428152, 428153, 428154,

  // ── Duplicate quality copies — keep best, hide rest ──
  // Sky Sports Cricket (keep FHD 186606)
  186605, 148679,
  // Sky Sports Golf (keep FHD 186614)
  186613, 148682,
  // Sky Sports F1 (keep FHD 186616)
  186615, 148680,
  // Sky Sports Mix (keep FHD 186622)
  186621, 148684,
  // Sky Sports News — keep 23 (FHD), hide duplicates
  23343, 148685,
  // Sky Sports Box Office — keep FHD 186626
  201548, 186625,
  // Sky Sports Main Event (keep FHD 186597)
  186596,
  // Sky Sports Action (keep FHD 186618)
  186617,
  // Sky Sports Football (keep FHD 23334)
  186612, 186607, 19,
  // Sky Sports Premier League (keep FHD 23342)
  186604, 9891, 186603,
  // Sky Sports Plus (keep FHD 186620)
  148678,
  // Sport TV 1 PT (keep FHD 389128)
  389127, 389126,
  // Sport TV 2 PT (keep FHD 389131)
  389130, 389129,
  // Sport TV 3 PT (keep FHD 389134)
  389133, 389132,
  // Sport TV 4 PT (keep FHD 389137)
  389136, 389135,
  // Sport TV 5 PT (keep FHD 389140)
  389139, 389138,
  // Eleven Sports 1 PT (keep FHD 389150)
  389148, 389149,
  // Eleven Sports 3 PT (keep FHD 389155)
  389153, 389154,
  // Eleven Sports 4 PT (keep FHD 389158)
  389156, 389157,
  // Eleven Sports 5 PT (keep FHD 389161)
  389159, 389160,
  // Eleven Sports 6 PT (keep FHD 389164)
  389162, 389163,
  // Eurosport 1 PT (keep FHD 389166)
  324,
  // Eurosport 2 PT (keep FHD 389167)
  325,
  // Bein Sports Max 1 (keep 4K 652395)
  652399, 652403, 652407,
  // Bein Sports Max 2 (keep 4K 652396)
  652400, 652404, 652408,
  // Bein Sports Max 3 (keep 4K 652397)
  652401, 652405, 652409,
  // Bein Sports Max 4 (keep 4K 652398)
  652402, 652406, 652410,
  // BeIN Alkass 1-10 (keep 4K versions)
  652421, 652431, // Alkass 1
  652422, 652432, // Alkass 2
  652423, 652433, // Alkass 3
  652424, 652434, // Alkass 4
  652425, 652435, // Alkass 5
  652426, 652436, // Alkass 6
  652427, 652437, // Alkass 7
  652428, 652438, // Alkass 8
  652429, 652439, // Alkass 9
  652430, 652440, // Alkass 10
  // Bein Xtra 4/5/6 (keep 4K)
  652365, 652390, // Xtra 5
  652366, 652391, // Xtra 6
  652367, 652389, // Xtra 4
  // Bein AFC (keep 4K)
  652368, 652392, // AFC 3
  652369, 652393, // AFC 4
  652370, 652394, // AFC 5
  // Thamanya Sport (keep 4K)
  605100, 605103, // Thamanya 1
  605101, 605104, // Thamanya 2
  605102, 605105, // Thamanya 3
  // Shasha TV (keep 4K)
  605109, 605111, // Shasha 1
  605108, 605110, // Shasha 2
  // Shahid Sport (keep 4K/best)
  605113, 605114, // Shahid Sport 1
  605116, 605117, // Shahid Sport 2
  // AD Sport Asia (keep 4K)
  605128, 605130, // AD Sport Asia 1
  605129, 605131, // AD Sport Asia 2
  // MBC channels (keep 4K)
  308905, 308948, // MBC 1
  308906, 308949, // MBC 2
  308908, 308907, 308950, // MBC 3
  308909, 308951, // MBC 4
  308911, 308910, 308952, // MBC 5
  308918, 308916, 308955, // MBC Drama
  308920, 308919, 308956, // MBC Iraq
  308912, 308953, // MBC Action
  308913, 308954, // MBC Bollywood
  308914, 308957, // MBC Max
  308924, 308921, // MBC Masr 1
  308923, 308922, // MBC Masr 2
  308926, 308925, // MBC Wanasah
  // Al Hadath (keep 4K 319271)
  319269, 319268, 319270,
  // Al Jazeera (keep 4K 319261)
  319260, 319262,
  // beIN Sport English (keep 4K)
  652381, // English 1 SD
  652382, // English 2 SD
  652385, // Global SD
  // TR Euro D (keep one)
  423596, 423597,
  // TR Eurosport 2 (keep one)
  423601, 423602,
  // CRIC SKY SPORTS CRIC (keep 12)
  23566, 114479, 124269,
  // CRIC T Sports (keep 18452)
  130714, 113069,
  // TM SUN TV (keep 158)
  5921, 5922, 5923,
  // TM ANGEL TV (keep 5881)
  189, 5882, 5883,
  // TM SUN LIFE (keep 5919)
  5918,
  // IN STAR PLUS (keep FHD 167)
  9366, 221, 3744,
  // IN SONY (keep FHD 9365)
  144, 9885,
  // IN ZEE TV (keep FHD 220)
  9371, 161,
  // IN STAR BHARAT (keep FHD 9367)
  199,
  // IN SONY MAX (keep FHD 9373)
  151,
  // IN STAR GOLD (keep FHD 9375)
  194,
  // IN STAR GOLD SELECT (keep FHD 9376)
  210,
  // IN STAR MOVIES (keep FHD 9384)
  979,
  // IN STAR MOVIES SELECT (keep FHD 23270)
  218,
  // IN SONY PIX (keep FHD 9381)
  147,
  // IN MNX (keep 4K 23428)
  191,
  // IN & PRIVE (keep FHD 9379)
  201,
  // IN COLORS INFINITY (keep FHD 9390)
  187,
  // IN ANIMAL PLANET (keep FHD 9391)
  182,
  // IN MTV Plus (keep 4K 94499)
  23791, 4029,
  // Kand UDAYA TV (keep FHD 9449)
  9450, 164,
  // UK SKY SPORTS NEWS dupe — 23343 already listed above in Sky Sports News block
  // UK Sony TV (keep FHD 24580)
  148175, 148467,
  // UK 92 News (keep 39419)
  148578,
  // CA CNN (keep HD 1486)
  616223, 616222,
  // CA CTV Ottawa (keep HD 615978)
  616229, 616340,
  // AU ABC ME (keep HD 415505)
  415349, 415506,
  // AU SBS World Movies (keep HD 415363)
  415566, 415567,
  // 24/7 Doc McStuffins (keep 224745)
  224746, 224747,
  // PH One News (keep HD 150980)
  151012, 151013,
  // Sy Lana TV (keep 4K 309063)
  309062, 309064,
  // SuperSports PSL (keep FHD 770)
  517, 271039,
  // SuperSports Laliga (keep FHD 768)
  515,
  // SuperSports Premier League (keep FHD 771)
  518,
  // SuperSports Football (keep FHD 776)
  523,
  // SuperSports Golf (keep FHD 778)
  525,
  // SuperSports Cricket (keep FHD 157939)
  769,
  // SuperSports Grandstand (keep FHD 772)
  519,
  // SuperSports Variety 2 (keep FHD 773)
  520,
  // SuperSports Action (keep FHD 774)
  521,
  // SuperSports Variety 1 (keep FHD 775)
  522,
  // SuperSport Motorsport (keep FHD 779)
  560,
  // DSTV Super Motorsport (keep 124000)
  157947,
  // DSTV ESPN (keep FHD 157959)
  23369,
  // TNT Sport 2 (keep FHD 186628)
  285,
  // TNT Sport 3 (keep FHD 186629)
  283,
  // TNT Sport 4 (keep FHD 255259)
  186630,
  // Eurosport 2 (keep FHD 23348)
  186638,
  // CRIC PTV SPORTS (keep ᴴᴰ 89 — ⁴ᵏ 61674 stream unverified quality, hide)
  // 61674, — removed, PTV Sports 4K may be valid; keeping both for now
  // CRIC A SPORTS (keep ᴴᴰ 43444)
  43447,
  // CRIC STAR SPORTS 1 ENG (keep ᴴᴰ 148)
  124281,
  // CRIC STAR SPORTS 1 HINDI (keep ᴴᴰ 211)
  124287,
  // CRIC WILLOW SPORTS (keep 215)
  23943,
  // CRIC SUPERSPORTS (keep 158442)
  2496,
  // T Sports FHD (keep 703302)
  52500,
  // Sky Sports F1 UK (keep 4K 122181)
  144581,
  // Eurosport 1 PT — 324 already hidden above (Sport TV 1 PT block)
  // Eurosport 1 FR (keep 23345 area, hide 186637 FHD dupe if confirmed)
  // GOLF+ dupe (keep 3072)
  659125,
  // Golf dupe (keep 3072 |FR| GOLF+ — 659125 FR Golf+ is same channel)
  // 3294 already listed as 847 GOLF FHD dupe above — remove duplicate

  // Canadian TSN1 (keep 1565)
  616080,
  // UK SKY CINEMA dupes (keep FHD versions)
  273, 274, 275, 276, 278, 279, // HD versions of Sky Cinema channels
  // DSTV dupes (keep FHD versions)
  19837, // Star Life HD (keep FHD 157992)
  23361, // Discovery Family (keep FHD 157994)
  24118, // Investigation Discovery (keep FHD 157995)
  120855, // TNT Africa (keep FHD 157998)
  137530, // KIX (keep FHD 157999)
  23873,  // Studio Universal (keep FHD 158001)
  // UK Nick Jr dupe (keep FHD 148256)
  561,
  // US Cartoon Network (keep 951)
  3365,
  // UK BBC NEWS — 1059 (UK: BBC NEWS HD) and 148365 (UK HD: BBC News) are both HD.
  // Both are kept — they appear in different experience arrays. Not hiding either.
  // UK GB News (keep FHD 148243)
  34663,
  // UK TLC (keep FHD 148171)
  352,
  // UK UTV (keep FHD 148253)
  148306,
  // UK Film4 (keep FHD 148201)
  148532,
  // UK B4U Movies (keep 6208)
  148653,
  // UK Utsav Gold (keep FHD 28729)
  148174,
  // UK CNBC (keep FHD 148227)
  148287,
  // Tata Play Bollywood Premiere (keep HD 467485)
  467684,
  // IN COLORS (keep FHD 195)
  9370,
  // MY ZEE KERALAM (keep FHD 10094)
  23310, 4226,
  // MAL MANORAMA NEWS (keep 226)
  169776, 249,
  // MAL KAUMUDY TV (keep HD 169)
  169822,
  // MAL ASIANET MOVIES (keep 4K 177842)
  9031,
  // MAL REPORTER NEWS (keep HD 166615)
  56032,
  // MAL NEWS 24 (keep HD 166612)
  248,
  // MAL MEDIA ONE (keep HD 169796)
  9035,
  // MAL MATHRUBHUMI NEWS (keep HD 9032 — both similar quality, keep older)
  169786,
  // MAL ASIANET NEWS (keep HD 166605)
  165,
  // MAL KAIRALI NEWS (keep HD 169797)
  85929,
  // MAL NEWS 18 KERALA (keep HD 9036)
  169837,
  // MAL JAI HIND TV (keep HD 172)
  169798,
  // MAL JANAM TV (keep HD 169807)
  9029,
  // MY ASIANET (keep FHD 23307)
  166,
  // MY Shalom (keep HD 169838)
  9040,
  // Marathi ZEE (keep FHD 85694)
  4066,
  // BD ZEE BANGLA (keep FHD 23305)
  435,
  // BD Gaan Bangla (keep 3807)
  3812,
  // Tamil ZEE THIRAI (keep 4K 181966)
  144636,
  // Telugu ETV (keep FHD 23312)
  9017,
  // MALAYALAM JAYAN MOVIES (keep 135584)
  135585,
  // AR ON Time Sports (keep 4598)
  4620,
  // Al Rabiaa Iraq dupe (keep 605085)
  309116,
  // UK Virgin One (keep FHD 148274)
  148277,
  // Sky Documentaries (keep FHD 148265)
  148443,
  // DSTV Big Brother Ninja (keep FHD 167458)
  167459,
  // UK Noor TV (keep 148503)
  24886,
  // StarzPlay Sports 1 (keep HD 605119)
  605120,
  // StarzPlay Sports 2 (keep HD 605122)
  605123,
  // beIN Sport NBA (keep 4K 652332)
  652371,
  // US NHL Network — 1013 is relocated to sports via RELOCATE_MAP, not hidden
  // 428102 is the clean FHD version, 1013 is SD but still valid for fallback

  // ── Internal/exposed test streams ──
  636113, 636114, 196347,
]);

// ── Cherry-Picked Curated Experiences ──────────��────────────────────

/** "Best of Live" — the 15 channels that make DashTivi+ shine.
 *  Hand-picked mix: 3 sports, 3 news, 3 entertainment, 2 kids, 2 music, 2 documentary.
 *  These are the channels where someone tunes in and says "wow, this works." */
export const BEST_OF_LIVE: number[] = [
  // Sports gems
  652310,  // beIN SPORTS 4K 1 — Arabic football in true 4K
  186597,  // SKY SPORTS MAIN EVENT FHD — Premier League flagship
  771,     // SUPERSPORTS PREMIER LEAGUE (FHD) — African SuperSport
  // News gems
  148282,  // UK FHD : CNN — CNN International crystal clear
  319261,  // Al Jazeera 4K — stunning quality
  148365,  // UK HD : BBC News — trusted, reliable
  // Entertainment gems
  148219,  // UK FHD : BBC One — dramas, entertainment, culture
  34158,   // UK: SKY ATLANTIC FHD — HBO/Sky originals
  659000,  // FRA | TF1 HD (Local) — French #1 channel for Guinea market
  // Kids gems
  148211,  // Cartoon Network FHD — kids retention
  19741,   // IN: Disney Channel (4K) — wow factor
  // Music gems
  5809,    // UK: MTV HD — universal brand
  319388,  // Music: Rotana Music HD — Arabic music king
  // Documentary gems
  97095,   // UK: Discovery (FHD) — curiosity driver
  98872,   // IN: DISCOVERY (4K) — jaw-dropping nature in 4K
];

/** "African Vibes" — Trace, SuperSport, DStv, beIN for the Motherland.
 *  Free African HLS channels are loaded separately by culture='africa'. */
export const AFRICAN_VIBES_IDS: number[] = [
  // Trace channels (France feed — African music/culture/sports)
  659163,  // Trace Africa HD
  659164,  // Trace Urban HD
  659165,  // Trace Caribbean HD
  659166,  // Trace Gospel HD
  659167,  // Trace Toca HD
  659138,  // Trace Sport Stars HD
  319395,  // Music: Trace Urban (Arabic Music feed)
  // African SuperSport (football is king in West Africa)
  771,     // SUPERSPORTS PREMIER LEAGUE (FHD)
  776,     // SUPERSPORTS FOOTBALL (FHD)
  768,     // SUPERSPORTS LALIGA (FHD)
  777,     // SuperSport Rugby (FHD)
  // DStv Super (African sports backbone)
  157940,  // DSTV SUPERSPORTS PREMIER LEAGUE (FHD)
  157942,  // DSTV SUPERSPORTS FOOTBALL (FHD)
  // Azam Sports (East Africa)
  647773,  // AZAM Azam Sports 1
  647775,  // AZAM Azam Sports 2
  // beIN (French + English — massive in West Africa)
  652345,  // beIN Sports English 1 1080
  652347,  // beIN Sports French HD1 1080
  652310,  // beIN SPORTS 4K 1
];

/** "Canal+ Collection" — all Canal+ feeds across France + Poland.
 *  Organized: Premium, Sport, Film, Series, Docs, Kids. */
export const CANAL_PLUS_IDS: number[] = [
  // France
  659021,  // Canal+ Sport 360
  659102,  // Canal J HD (kids)
  // Poland — main package
  660191,  // Canal+ 1 FHD
  660194,  // Canal+ PREMIUM FHD
  660195,  // Canal+ FILM FHD
  660196,  // Canal+ Seriale FHD
  660200,  // Canal+ SPORT 1 FHD
  // Poland — extras (event overflow)
  660205,  // Canal+ EXTRA 1 FHD
  660206,  // Canal+ EXTRA 2 FHD
  660207,  // Canal+ EXTRA 3 FHD
  660208,  // Canal+ EXTRA 4 FHD
  660209,  // Canal+ EXTRA 5 FHD
  660210,  // Canal+ EXTRA 6 FHD
  // Poland — PlayerPL (streaming versions)
  660563,  // Canal+ Dokument FHD
  660564,  // Canal+ Sport FHD
  660565,  // Canal+ Sport 2 FHD
  660566,  // Canal+ Sport 3 FHD
  660567,  // Canal+ Sport 4 FHD
];

// ── Types ─────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  emoji: string;
  description: string;
  type: 'live' | 'vod' | 'series';
  categoryIds: string[];
  /** Max items to show in a row */
  limit: number;
  /** Navigation target when tapping "See All" */
  navigateTo: string;
}

/** Smart collections are generated by the recommendation engine at runtime */
export interface SmartCollection {
  id: string;
  name: string;
  emoji: string;
  description: string;
  type: 'smart-vod' | 'smart-series';
  /** The underlying content type for rendering */
  contentType: 'vod' | 'series';
  navigateTo: string;
}

export interface CollectionCard {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  navigateTo: string;
}

export interface FeaturedHero {
  title: string;
  subtitle: string;
  cta: string;
  navigateTo: string;
  gradient: string;
}

// ── Homepage Row Collections ──────────────────────────────────────

export const HOMEPAGE_COLLECTIONS: Collection[] = [
  // 1. IDENTITY — what makes us different. African content nobody else has
  {
    id: 'live-sports',
    name: 'Live Sports',
    emoji: '',
    description: 'beIN 4K, SuperSport, Sky Sports, EPL',
    type: 'live',
    categoryIds: [
      '345',  // DStv Super (32ch — SuperSport FHD, African sports backbone)
      '85',   // beIN Sports (124ch, 39 gems, 36 4K — strongest package)
      '353',  // Sky Sports UK (29ch, 26 gems)
      '578',  // Real 4K (31ch — UHD Sky Sports, LaLiga)
      '234',  // Football (28ch — SuperSport, Sky, TNT)
      '492',  // EPL (21ch — match day team channels)
    ],
    limit: 15,
    navigateTo: '/live',
  },
  // 2. HOOK — fresh cinema, universal draw
  {
    id: 'fresh-movies',
    name: 'Just Dropped',
    emoji: '',
    description: 'Fresh 2025 & 2026 releases',
    type: 'vod',
    categoryIds: ['749', '597'], // English 2026, 2025
    limit: 15,
    navigateTo: '/movies',
  },
  // 3. MOTHERLAND — Canal+, DSTV, BBC, HBO. The global village
  {
    id: 'world-cinema',
    name: 'The Global Village',
    emoji: '',
    description: 'Canal+, DSTV, BBC, HBO, MBC — all in one place',
    type: 'live',
    categoryIds: [
      '336',  // AFRICA CANAL+ (247ch — French African powerhouse)
      '343',  // DSTV Entertainment (84ch — African drama, Mzansi Magic)
      '2',    // USA (93ch — HBO, Starz, Showtime)
      '3',    // UK Entertainment (39ch — Ch4, Comedy Central, Sky)
      '414',  // UK General (26ch — BBC One FHD, ITV FHD)
      '86',   // MBC Arabic (46ch — MBC 1-5, Drama, Max)
    ],
    limit: 15,
    navigateTo: '/french',
  },
  // 4. PREMIUM — 4K signals quality, builds confidence
  {
    id: 'cinema-4k',
    name: '4K Experience',
    emoji: '',
    description: 'Ultra HD blockbusters — crystal clear',
    type: 'vod',
    categoryIds: ['122', '34'],  // 4K, Blockbuster
    limit: 15,
    navigateTo: '/movies',
  },
  // 5. DEPTH — binge material keeps them coming back
  {
    id: 'k-drama-turkish',
    name: 'Binge-Worthy',
    emoji: '',
    description: 'K-Drama, Turkish & international series',
    type: 'series',
    categoryIds: ['267', '99'],  // Korean, Turkish
    limit: 15,
    navigateTo: '/series',
  },
  // 6. INFORM — trust anchor, shows we're serious
  {
    id: 'news-world',
    name: 'Stay Informed',
    emoji: '',
    description: 'CNN, BBC, Al Jazeera 4K, Sky News',
    type: 'live',
    categoryIds: [
      '82',   // English News (22ch — CNN HD, BBC News, Sky News)
      '417',  // UK News (15ch — CNBC FHD, CNN FHD)
      '165',  // Arabic News (44ch — Al Jazeera 4K, France 24)
    ],
    limit: 12,
    navigateTo: '/live',
  },
  // 7. WARMTH — ends on family, softens the scroll
  {
    id: 'kids-family',
    name: 'Kids & Family',
    emoji: '',
    description: 'Disney 4K, Nickelodeon, Cartoon Network',
    type: 'live',
    categoryIds: [
      '410',  // UK Kids (12ch — Cartoon Network FHD, CBeebies, Nick)
      '32',   // Kids (46ch — Disney 4K, Nick, CN, CBeebies)
    ],
    limit: 15,
    navigateTo: '/live',
  },
];

// ── Quick-tap Collection Cards (vibes navigation) ─────────────────

export const COLLECTION_CARDS: CollectionCard[] = [
  { id: 'sports', name: 'Sports', emoji: '', gradient: 'from-primary/30 to-primary-dark/30', navigateTo: '/live' },
  { id: 'movies', name: 'Movies', emoji: '', gradient: 'from-primary/25 to-primary-dark/25', navigateTo: '/movies' },
  { id: 'news', name: 'News', emoji: '', gradient: 'from-primary/20 to-white/5', navigateTo: '/live' },
  { id: 'africa', name: 'Africa', emoji: '', gradient: 'from-accent/20 to-accent-gold/10', navigateTo: '/french' },
  { id: 'series', name: 'Series', emoji: '', gradient: 'from-primary/30 to-primary-dark/20', navigateTo: '/series' },
  { id: 'kids', name: 'Kids', emoji: '', gradient: 'from-primary-light/20 to-primary/15', navigateTo: '/live' },
  { id: 'music', name: 'Music', emoji: '', gradient: 'from-primary/25 to-primary-light/15', navigateTo: '/live' },
  { id: 'faith', name: 'Faith', emoji: '', gradient: 'from-accent-gold/15 to-primary/10', navigateTo: '/live' },
];

// ── Time-aware Featured Hero ──────────────────────────────────────

export function getFeaturedHero(): FeaturedHero {
  const hour = new Date().getHours();

  // Morning (6am-12pm)
  if (hour >= 6 && hour < 12) {
    return {
      title: 'Good Morning',
      subtitle: 'Start your day informed. World-class news and morning entertainment.',
      cta: 'Start Watching',
      navigateTo: '/live',
      gradient: 'from-blue-600/20 via-[#0A0A0A] to-sky-900/10',
    };
  }

  // Afternoon (12pm-6pm)
  if (hour >= 12 && hour < 18) {
    return {
      title: 'Afternoon Escape',
      subtitle: 'Award-winning movies and handpicked series. Your next favorite is here.',
      cta: 'Explore',
      navigateTo: '/movies',
      gradient: 'from-amber-600/15 via-[#0A0A0A] to-orange-900/10',
    };
  }

  // Evening (6pm-11pm)
  if (hour >= 18 && hour < 23) {
    return {
      title: 'Prime Time',
      subtitle: 'Live sports, fresh cinema, and curated series. Your evening, elevated.',
      cta: 'Watch Now',
      navigateTo: '/live',
      gradient: 'from-primary/20 via-[#0A0A0A] to-primary-dark/10',
    };
  }

  // Late night (11pm-6am)
  return {
    title: 'Late Night',
    subtitle: 'The best series for those who stay up. Something new awaits.',
    cta: 'Dive In',
    navigateTo: '/series',
    gradient: 'from-indigo-600/15 via-[#0A0A0A] to-violet-900/10',
  };
}

// ── Movie Featured Categories (reordered for audience) ────────────

export const MOVIE_FEATURED_CATS = [
  { id: '749', name: 'New 2026' },        // 239 movies
  { id: '597', name: '2025 Hits' },       // 2,127 movies
  { id: '525', name: '2024' },            // 2,617 movies
  { id: '122', name: '4K' },              // 1,058 movies
  { id: '34', name: 'Blockbuster' },      // 1,002 movies
  { id: '240', name: 'Award Winners' },   // 142 movies
  { id: '95', name: 'Turkish' },          // 854 movies
  { id: '33', name: 'Bollywood' },        // 2,683 movies
  { id: '69', name: 'Kids' },             // 441 movies
  { id: '96', name: 'Arabic Sub' },       // 684 movies
  { id: '148', name: 'Horror' },          // 188 movies
];

// ── Series Featured Categories ────────────────────────────────────

export const SERIES_FEATURED_CATS = [
  { id: '106', name: 'Netflix' },         // 2,543 series
  { id: '108', name: 'Prime Video' },     // 1,580 series
  { id: '102', name: 'Disney+' },         // 818 series
  { id: '188', name: 'HBO' },             // 381 series
  { id: '114', name: 'Apple TV+' },       // 346 series
  { id: '209', name: 'Hulu' },            // 334 series
  { id: '202', name: 'BBC' },             // 315 series
  { id: '249', name: 'Paramount+' },      // 154 series
  { id: '99', name: 'Turkish' },          // 1,142 series
  { id: '267', name: 'Korean' },          // 235 series
];

// ── Live TV Themed Collections ───────────────────────────────────

export interface LiveTheme {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  categoryIds: string[];
  gradient: string;
  glowColor: string;
}

export const LIVETV_THEMES: LiveTheme[] = [
  {
    id: 'sports',
    name: 'Sports',
    emoji: '',
    description: 'beIN, Sky Sports, SuperSport & more',
    categoryIds: [
      '85',   // beIN Sports (124ch, 39 gems, 36 4K — strongest sports package)
      '578',  // Real 4K (31ch — true UHD Sky Sports, LaLiga TV)
      '353',  // Sky Sports UK (29ch, 26 gems — FHD/HD, all disciplines)
      '483',  // Sky Sports (additional feeds)
      '234',  // Football (28ch, 19 gems — SuperSport, Sky, TNT, club channels)
      '345',  // DStv Super (32ch — SuperSport FHD, African sports backbone)
      '427',  // DStv Super (additional — SuperSport HD)
      '492',  // EPL (21ch — match day team channels)
      '5',    // Cricket (57ch, 37 gems)
      '6',    // Sports General
      '342',  // Tennis/Racing
      '550',  // Rugby (20ch, 19 gems — Sky Sport NZ FHD)
      '138',  // Boxing
      '212',  // Fighting
      '356',  // India Sports
      '156',  // Arabic Sports
      '137',  // Fox Australia Sports (8 alive)
      '516',  // NFL (match day)
      '139',  // UK Sports Mix (10ch)
      '726',  // MLS (49 alive)
      '328',  // MLB (32 alive)
      '190',  // PPV Live Events (72ch)
      '807',  // IPL 2026 (9ch)
      '808',  // PSL 2026 (2ch)
      '542',  // Optus Sports (11 alive)
      '543',  // Spark Sports (8 alive)
    ],
    gradient: 'from-primary to-primary-dark',
    glowColor: 'shadow-primary/20',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '',
    description: 'UK, USA, Canal+ & French channels',
    categoryIds: [
      '3',    // UK Entertainment (39ch, 8 gems — Ch4, Ch5, Comedy Central, Sky)
      '414',  // UK General (26ch, 16 gems — BBC One FHD, ITV FHD)
      '2',    // USA (93ch, 42 gems — HBO, Starz, Showtime)
      '11',   // France (162ch, 86% alive — Canal+, TF1, M6, France 2/3/5)
      '39',   // Poland (192ch — Canal+ Premium/Film/Sport/Seriale FHD)
      '247',  // India Entertainment
      '338',  // India Entertainment (additional)
      '19',   // UK Asian (38ch, 9 gems)
      '24',   // US 24/7
    ],
    gradient: 'from-primary/80 to-primary-dark/80',
    glowColor: 'shadow-primary/20',
  },
  {
    id: 'news',
    name: 'News',
    emoji: '',
    description: 'CNN, BBC, Al Jazeera, Sky News',
    categoryIds: [
      '82',   // English News (22ch, 14 gems — CNN HD, BBC News, Sky News, Fox)
      '417',  // UK News (15ch, 11 gems — CNBC FHD, CNN FHD, Sky News HD)
      '165',  // Arabic News (44ch, 12 gems — Al Jazeera 4K/HD, France 24 Arabic)
      '730',  // Indian News (Malayalam)
      '77',   // Indian News (47ch, 5 gems — NDTV, CNN News 18)
      '98',   // Pakistan News (47ch)
    ],
    gradient: 'from-primary-dark to-primary/70',
    glowColor: 'shadow-primary-dark/20',
  },
  {
    id: 'kids',
    name: 'Kids & Family',
    emoji: '',
    description: 'Disney, Nick, Cartoon Network',
    categoryIds: [
      '410',  // UK Kids (12ch, 11 gems — CN FHD, CBeebies FHD, Nick FHD, Sky Kids FHD)
      '32',   // Kids (46ch, 29 gems — Disney 4K, Nick 4K, CN HD, CBeebies)
      '347',  // DSTV Kids (13ch)
      '430',  // DSTV Kids FHD (15ch)
    ],
    gradient: 'from-primary-light to-primary',
    glowColor: 'shadow-primary-light/20',
  },
  {
    id: 'movies247',
    name: 'Movie Channels',
    emoji: '',
    description: '24/7 cinema from beIN, Netflix, Bollywood',
    categoryIds: [
      '87',   // beIN Movies (29ch, 8 gems — 4K + HD, Cinema + Series + Drama)
      '275',  // English Movies 24/7
      '57',   // Netflix Movies 24/7
      '340',  // India English Movies (29ch, 11 gems — Star Movies 4K, Colors Infinity 4K)
      '339',  // India Hindi Movies (23ch, 10 gems — Sony Max 4K, Star Gold 4K)
      '282',  // Bollywood Movies 24/7
      '280',  // Amazon Movies 24/7
      '413',  // UK Movies (41 alive — Sky Cinema)
      '344',  // DSTV Movies (7ch)
      '429',  // DSTV Movies FHD (9ch)
    ],
    gradient: 'from-primary-dark/90 to-accent/30',
    glowColor: 'shadow-primary-dark/20',
  },
  {
    id: 'faith',
    name: 'Faith',
    emoji: '',
    description: 'Islamic & Christian channels',
    categoryIds: [
      '123',  // Islamic (62ch)
      '561',  // Christian (16ch)
    ],
    gradient: 'from-accent-gold/40 to-primary/30',
    glowColor: 'shadow-accent-gold/20',
  },
  {
    id: 'music',
    name: 'Music & Vibes',
    emoji: '',
    description: 'MTV, Bollywood Beats, Arabic Vibes',
    categoryIds: [
      '416',  // UK Music
      '341',  // India Music (11ch, 4 gems)
      '555',  // Arabic Music
      '270',  // Bollywood Singers 24/7
      '287',  // Punjabi Singers 24/7
    ],
    gradient: 'from-primary to-primary-light/70',
    glowColor: 'shadow-primary/20',
  },
  {
    id: 'premium4k',
    name: 'Premium 4K',
    emoji: '',
    description: 'Ultra HD sports, movies & docs',
    categoryIds: [
      '578',  // Real 4K (31ch — Sky Sports UHD, LaLiga TV UHD, Sport TV UHD)
      '85',   // beIN Sports (36 4K channels — beIN 4K 1-9, Alkass 4K, Xtra 4K)
      '87',   // beIN Movies (14 4K channels — beIN Movies 4K 1-4, Series 4K)
      '337',  // India Documentary (7 4K — Discovery, NatGeo, Animal Planet)
      '340',  // India English Movies (11 4K — Star Movies, Colors Infinity)
      '339',  // India Hindi Movies (8 4K — Sony Max, Star Gold, Colors Cineplex)
      '356',  // India Sports (9 4K — Star Sports, Sony Ten)
    ],
    gradient: 'from-accent-gold/30 to-primary-dark/40',
    glowColor: 'shadow-accent-gold/20',
  },
  {
    id: 'documentary',
    name: 'Docs & Discovery',
    emoji: '',
    description: 'Discovery, NatGeo, Sky History',
    categoryIds: [
      '415',  // UK Documentary (19ch, 18 gems — Discovery FHD, Sky History, NatGeo, Sky Nature)
      '337',  // India Documentary (23ch, 17 gems — Discovery 4K, NatGeo 4K, Animal Planet 4K)
    ],
    gradient: 'from-primary-dark/80 to-primary/60',
    glowColor: 'shadow-primary-dark/20',
  },
];

// ── Sports Sub-types (for sub-tabs within Sports theme) ─────────

export interface SportType {
  id: string;
  name: string;
  categoryIds: string[];
}

// Child experiences within Sports — DASH-branded rooms
export const SPORT_TYPES: SportType[] = [
  { id: 'all', name: 'All Sports', categoryIds: ['85', '578', '353', '483', '234', '345', '427', '492', '5', '6', '342', '550', '138', '212', '356', '156', '137', '516', '139', '726', '328'] },
  { id: 'football', name: 'Football Non-Stop', categoryIds: ['492', '85', '234', '345'] },  // EPL team channels, beIN, general football, DStv SuperSport
  { id: 'bein', name: 'beIN Zone', categoryIds: ['85'] },   // 93% alive, all premium — 4K/FHD/HD
  { id: 'sky', name: 'Sky Sports', categoryIds: ['578', '353', '483'] },  // 4K first, then FHD, then additional
  { id: 'cricket', name: 'Cricket Ground', categoryIds: ['5'] },  // 57ch, 37 gems
  { id: 'nfl', name: 'NFL', categoryIds: ['516'] },  // match day only — 5% alive outside game days
  { id: 'fans', name: 'Fans Space', categoryIds: ['234'] },  // LFC TV, MUTV, team channels
  { id: 'africa', name: 'African Football', categoryIds: ['234', '345', '427'] },  // SuperSport + DStv Super — African sports backbone
  { id: 'racing', name: 'Speed', categoryIds: ['342'] },
  { id: 'rugby', name: 'Rugby', categoryIds: ['550'] },  // 20ch, 19 gems — Sky Sport NZ
  { id: 'more', name: 'More', categoryIds: ['138', '212', '726', '328', '6'] },
];

// ── Child Experiences — sub-tabs within each mother theme ─────────
// Same SportType interface reused for all child experiences

export const ENTERTAINMENT_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['3', '414', '2', '11', '39', '247', '338', '19', '24'] },
  { id: 'uk', name: 'UK Lounge', categoryIds: ['414', '3'] },       // BBC, ITV, Ch4, Sky
  { id: 'usa', name: 'USA Tonight', categoryIds: ['2'] },           // HBO, Starz, Showtime
  { id: 'french', name: 'Canal+ & France', categoryIds: ['11', '39'] },  // Canal+ via France + Poland feeds, TF1, M6, Arte
  { id: 'african', name: 'African Drama', categoryIds: [] },        // Free channels (experience: entertainment, culture: africa)
  { id: 'reality', name: 'Reality Rush', categoryIds: [] },         // Free channels (experience: general)
  { id: 'asian', name: 'Asian Vibes', categoryIds: ['247', '338', '19'] },
];

export const KIDS_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['410', '32'] },           // UK Kids first (11 gems, FHD quality), then main Kids
  { id: 'cartoons', name: 'Cartoon World', categoryIds: ['32'] },
  { id: 'littleones', name: 'Little Ones', categoryIds: ['32'] },   // Filtered by name: baby, rhyme, panda
  { id: 'adventure', name: 'Adventure', categoryIds: ['32'] },      // Filtered by name: avatar, paw patrol, spongebob
  { id: 'ukkids', name: 'UK Kids', categoryIds: ['410'] },          // CN FHD, CBeebies FHD, Nick FHD, Sky Kids FHD
];

export const CINEMA_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['87', '340', '339', '275', '57', '282', '280'] },  // beIN Movies (gems) first, then India (4K), then 24/7
  { id: 'bein', name: 'beIN Cinema', categoryIds: ['87'] },          // 29ch, 8 gems — 4K + HD, Cinema + Series + Drama
  { id: 'action', name: 'Action Vault', categoryIds: ['275'] },     // Filtered: action/thriller channels
  { id: 'comedy', name: 'Comedy Corner', categoryIds: ['275'] },    // Filtered: comedy channels
  { id: 'horror', name: 'Horror Room', categoryIds: ['275'] },      // Filtered: horror channels
  { id: 'bollywood', name: 'Bollywood Palace', categoryIds: ['282', '339'] },
  { id: 'netflix', name: 'Netflix Loop', categoryIds: ['57'] },
];

export const MUSIC_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['416', '341', '555', '270', '287'] },
  { id: 'afro', name: 'Afro Beats', categoryIds: [] },              // Free channels (experience: music, culture: africa)
  { id: 'mtv', name: 'MTV World', categoryIds: ['416'] },
  { id: 'bollywood', name: 'Bollywood Beats', categoryIds: ['341', '270'] },
  { id: 'throwback', name: 'Throwback', categoryIds: ['416'] },     // Filtered: NOW 70s, 80s, 90s
  { id: 'arabic', name: 'Arabic Vibes', categoryIds: ['555'] },
];

export const DISCOVERY_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['415', '337'] },           // UK Docs first (18 gems — Discovery FHD, NatGeo, Sky History/Nature)
  { id: 'wild', name: 'Wild Planet', categoryIds: ['337', '415'] },  // Filtered: animal, natgeo, bbc earth
  { id: 'science', name: 'Science Lab', categoryIds: ['337', '415'] }, // Filtered: discovery, science
  { id: 'history', name: 'History Vault', categoryIds: ['415', '337'] }, // UK History first (Sky History FHD), then India History
  { id: 'crime', name: 'Crime Files', categoryIds: ['415'] },        // Filtered: investigation, court
];

export const FAITH_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['123', '561'] },
  { id: 'islamic', name: 'Islamic', categoryIds: ['123'] },
  { id: 'christian', name: 'Christian', categoryIds: ['561'] },
];

// ── WorldEX Region Genre Filters ─────────────────────────────────
// Genre pills within each WorldEX region — maps to Xtream category IDs
// "All" uses the region's default, genre pills load additional categories

export interface RegionGenre {
  id: string;
  name: string;
  categoryIds: string[];
}

export const REGION_GENRES: Record<string, RegionGenre[]> = {
  motherland: [
    { id: 'all', name: 'All', categoryIds: ['336', '428', '343', '427', '345', '85', '11'] },  // Canal+ Africa + DStv Ent + DStv Sports + beIN + France (incl. Trace Africa/Urban/Gospel)
    { id: 'sports', name: 'Sports', categoryIds: ['427', '345', '85', '234'] },  // DStv Super FHD + DStv Super + beIN (Arabic football massive in West Africa) + Football (SuperSport PL/LaLiga)
    { id: 'entertainment', name: 'Entertainment', categoryIds: ['428', '343', '336'] },  // DStv Ent FHD + DStv Ent + Canal+ Africa
    { id: 'music', name: 'Music', categoryIds: ['336', '11'] },        // Canal+ Africa music + France feed (Trace Africa HD, Trace Urban HD, Trace Gospel HD, NRJ Hits, M6 Music)
    { id: 'french', name: 'French', categoryIds: ['11', '336'] },      // France (Canal+, TF1, M6, Trace) + Canal+ Africa francophone
    { id: 'news', name: 'News', categoryIds: ['431', '346', '165'] },  // DStv News FHD + DStv News + Arabic News (Al Jazeera)
    { id: 'kids', name: 'Kids', categoryIds: ['430', '347'] },         // DStv Kids FHD + DStv Kids
    { id: 'movies', name: 'Movies', categoryIds: ['429', '344', '87'] }, // DStv Movies FHD + DStv Movies + beIN Movies
  ],
  sahara: [
    { id: 'all', name: 'All', categoryIds: ['86', '165', '156', '87', '13'] },
    { id: 'mbc', name: 'MBC', categoryIds: ['86'] },
    { id: 'news', name: 'News', categoryIds: ['165'] },
    { id: 'sports', name: 'Sports', categoryIds: ['156'] },
    { id: 'movies', name: 'beIN Movies', categoryIds: ['87'] },
    { id: 'music', name: 'Music', categoryIds: ['555'] },
    { id: 'gulf', name: 'Gulf States', categoryIds: ['181', '180', '178', '83', '549', '556', '554', '553', '548', '129'] },
  ],
  europe: [
    { id: 'all', name: 'All', categoryIds: ['11', '15', '14', '39'] },
    { id: 'france', name: 'France', categoryIds: ['11'] },
    { id: 'germany', name: 'Germany', categoryIds: ['15'] },
    { id: 'poland', name: 'Poland', categoryIds: ['39'] },
    { id: 'italy', name: 'Italy', categoryIds: ['14'] },
    { id: 'netherlands', name: 'Netherlands', categoryIds: ['21'] },
    { id: 'balkans', name: 'Balkans', categoryIds: ['29', '20', '44'] },
    { id: 'scandinavia', name: 'Scandinavia', categoryIds: ['63', '579', '582'] },
    { id: 'czech', name: 'Czech', categoryIds: ['774'] },
    { id: 'greece', name: 'Greece', categoryIds: ['10'] },
    { id: 'israel', name: 'Israel', categoryIds: ['132'] },
  ],
  persian: [
    { id: 'all', name: 'All', categoryIds: ['751', '28'] },
    { id: 'iran', name: 'Iran', categoryIds: ['751'] },
    { id: 'afghanistan', name: 'Afghanistan', categoryIds: ['28'] },
  ],
  southasia: [
    { id: 'all', name: 'All', categoryIds: ['247', '338', '18'] },
    { id: 'entertainment', name: 'Entertainment', categoryIds: ['247', '338'] },
    { id: 'cricket', name: 'Cricket', categoryIds: ['5'] },
    { id: 'sports', name: 'Sports', categoryIds: ['356'] },
    { id: 'news', name: 'News', categoryIds: ['77', '731'] },
    { id: 'docs', name: 'Discovery', categoryIds: ['337'] },
    { id: 'music', name: 'Music', categoryIds: ['341', '270', '287'] },
    { id: 'movies', name: 'Movies', categoryIds: ['339', '340'] },
    { id: 'bangla', name: 'Bangla', categoryIds: ['9', '292'] },
    { id: 'tamil', name: 'Tamil', categoryIds: ['732', '733', '72'] },
    { id: 'telugu', name: 'Telugu', categoryIds: ['73', '290'] },
    { id: 'malayalam', name: 'Malayalam', categoryIds: ['728', '729', '727', '730'] },
    { id: 'kannada', name: 'Kannada', categoryIds: ['81', '291'] },
    { id: 'punjabi', name: 'Punjabi', categoryIds: ['7', '285'] },
    { id: 'marathi', name: 'Marathi', categoryIds: ['75'] },
    { id: 'gujarati', name: 'Gujarati', categoryIds: ['76'] },
  ],
  crescent: [
    { id: 'all', name: 'All', categoryIds: ['4', '98', '42', '64'] },
    { id: 'pakistan', name: 'Pakistan', categoryIds: ['4'] },
    { id: 'news', name: 'News', categoryIds: ['98'] },
    { id: 'srilanka', name: 'Sri Lanka', categoryIds: ['42'] },
    { id: 'nepal', name: 'Nepal', categoryIds: ['64'] },
  ],
  isles: [
    { id: 'all', name: 'All', categoryIds: ['3', '414'] },
    { id: 'sports', name: 'Sports', categoryIds: ['483', '353'] },
    { id: 'entertainment', name: 'Entertainment', categoryIds: ['3'] },
    { id: 'news', name: 'News', categoryIds: ['417'] },
    { id: 'movies', name: 'Movies', categoryIds: ['413'] },
    { id: 'kids', name: 'Kids', categoryIds: ['410'] },
    { id: 'docs', name: 'Docs', categoryIds: ['415'] },
    { id: 'music', name: 'Music', categoryIds: ['416'] },
    { id: 'asian', name: 'Asian', categoryIds: ['19'] },
  ],
  usa: [
    { id: 'all', name: 'All', categoryIds: ['2'] },
    { id: '247', name: '24/7', categoryIds: ['24'] },
  ],
  pacific: [
    { id: 'all', name: 'All', categoryIds: ['54'] },  // 90 (Philippines) removed — 1/124 alive
    { id: 'australia', name: 'Australia', categoryIds: ['54'] },
  ],
  americas: [
    { id: 'all', name: 'All', categoryIds: ['31', '741'] },
  ],
  spinthewheel: [
    { id: 'all', name: 'All', categoryIds: ['275', '282', '57', '280', '274', '283'] },
    { id: 'english', name: 'English 24/7', categoryIds: ['275'] },
    { id: 'bollywood', name: 'Bollywood 24/7', categoryIds: ['282'] },
    { id: 'netflix', name: 'Netflix Loop', categoryIds: ['57'] },
  ],
};

// ── Premium 4K Sub-types ─────────────────────────────────────────

export const PREMIUM4K_TYPES: SportType[] = [
  { id: 'all', name: 'All 4K', categoryIds: ['578', '85', '87', '337', '340', '339', '356'] },
  { id: 'sports', name: 'Sports 4K', categoryIds: ['578', '85', '356'] },       // Sky Sports UHD, beIN 4K, India Sports 4K
  { id: 'movies', name: 'Movies 4K', categoryIds: ['87', '340', '339'] },       // beIN Movies 4K, India English/Hindi Movies 4K
  { id: 'docs', name: 'Docs 4K', categoryIds: ['337'] },                        // Discovery 4K, NatGeo 4K, Animal Planet 4K
];

// ── Browse Experiences ───────────────────────────────────────────
// Replaces raw Starshare categories with curated experience groups.
// Every live category mapped. Dead categories excluded.
// A category can appear in multiple experiences.

export interface BrowseExperience {
  id: string;
  name: string;
  icon: string;       // Lucide icon name hint for the UI
  categoryIds: string[];
}

export const BROWSE_EXPERIENCES: BrowseExperience[] = [
  // Broadest / strongest first — what most users tap
  {
    id: 'uk-usa',
    name: 'UK & USA',
    icon: 'tv',
    categoryIds: [
      '2',    // USA (93ch — HBO, Starz, Showtime)
      '3',    // UK Entertainment (39ch — Ch4, Comedy Central, Sky)
      '414',  // UK General (26ch — BBC One FHD, ITV FHD)
      '413',  // UK Movies (42ch)
      '24',   // US 24/7
      '411',  // HUB Premier (11ch)
    ],
  },
  {
    id: 'movies-247',
    name: 'Movies 24/7',
    icon: 'film',
    categoryIds: [
      '275',  // English Movies 24/7
      '57',   // Netflix Movies 24/7
      '280',  // Amazon Movies 24/7
      '413',  // UK Movies (42ch)
      '274',  // Bollywood Movies/Actors 24/7 (65ch)
      '282',  // Bollywood Movies 24/7
      '283',  // Hindi Web Series 24/7 (14ch)
      '349',  // 24x7 Live (34ch)
    ],
  },
  {
    id: 'sports-events',
    name: 'Live Events',
    icon: 'trophy',
    categoryIds: [
      '190',  // PPV Live Match Time (72ch)
      '807',  // IPL 2026 (9ch)
      '808',  // PSL 2026 (2ch)
    ],
  },
  // Cultural anchors — Africa & French together for SL/Guinea audience
  {
    id: 'africa',
    name: 'Africa',
    icon: 'globe',
    categoryIds: [
      '336',  // AFRICA CANAL+ (247ch)
      '343',  // DSTV Entertainment (84ch)
      '428',  // DSTV Entertainment FHD (72ch)
      '344',  // DSTV Movies (7ch)
      '429',  // DSTV Movies FHD (9ch)
      '347',  // DSTV Kids (13ch)
      '430',  // DSTV Kids FHD (15ch)
      '346',  // DSTV News (17ch)
      '431',  // DSTV News FHD (5ch)
      '345',  // DSTV Super — SuperSport
      '427',  // DSTV Super FHD
    ],
  },
  {
    id: 'french',
    name: 'French',
    icon: 'languages',
    categoryIds: [
      '11',   // France (162ch — Canal+, TF1, M6)
      '336',  // AFRICA CANAL+ (247ch — French African)
    ],
  },
  {
    id: 'arabic',
    name: 'Arabic & MENA',
    icon: 'moon',
    categoryIds: [
      '86',   // MBC Arabic (53ch)
      '180',  // Egypt (69ch)
      '751',  // Iran (97 alive)
      '129',  // Iraq (63 alive)
      '13',   // ARABIC (13ch)
      '549',  // Lebanon (24ch)
      '554',  // Morocco (19ch)
      '553',  // Algeria (25ch)
      '548',  // Syria (24ch)
      '556',  // UAE (25 alive)
      '83',   // Qatar (10ch)
      '227',  // Oman (1ch)
      '178',  // Kuwait (17ch)
      '181',  // Saudi Arabia (44ch)
      '175',  // Shahed Box (34ch)
      '165',  // Arabic News
      '156',  // Arabic Sports
      '555',  // Arabic Music
      '87',   // beIN Movies
      '123',  // Islamic
    ],
  },
  // Deep regional — massive catalogs
  {
    id: 'south-asian',
    name: 'South Asia',
    icon: 'landmark',
    categoryIds: [
      '247',  // India Entertainment
      '338',  // India Entertainment (additional)
      '340',  // India English Movies (29ch)
      '339',  // India Hindi Movies (23ch)
      '337',  // India Documentary (23ch)
      '356',  // India Sports
      '341',  // India Music (11ch)
      '77',   // Indian News (47ch)
      '18',   // Indian SD (49ch)
      '728',  // Malayalam Entertainment (33ch)
      '729',  // Malayalam Movies (65ch)
      '730',  // Malayalam News (29ch)
      '732',  // Tamil Entertainment (67ch)
      '733',  // Tamil Movies (37ch)
      '731',  // Tamil News (11ch)
      '72',   // Tamil (6ch)
      '73',   // Telugu (51ch)
      '290',  // Telugu Movies 24/7 (28ch)
      '81',   // Kannada (40ch)
      '291',  // Kannada Movies 24/7 (31ch)
      '76',   // Gujarati (20ch)
      '75',   // Marathi (32ch)
      '405',  // Oriya (16ch)
      '140',  // Assam (8ch)
      '560',  // Bhojpuri (4ch)
      '19',   // UK Asian (38ch)
      '194',  // USA Asian (35ch)
      '9',    // Bangla (88ch)
      '292',  // Bangla Movies 24/7 (8ch)
      '42',   // Sri Lanka (36ch)
      '64',   // Nepal (87ch)
      '28',   // Afghanistan (17 alive)
    ],
  },
  {
    id: 'pakistan',
    name: 'Pakistan',
    icon: 'star',
    categoryIds: [
      '4',    // Pakistan (44ch)
      '98',   // Pakistan News (47ch)
      '350',  // Pak Drama 24/7 (13ch)
      '272',  // Pakistani Movies 24/7 (4ch)
      '7',    // Punjabi (83ch)
      '285',  // Punjabi Movies 24/7 (9ch)
      '287',  // Punjabi Singers 24/7
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    icon: 'map',
    categoryIds: [
      '15',   // Germany (277 alive)
      '25',   // Turkey (263 alive)
      '20',   // EXYU (240 alive)
      '71',   // Russian (196 alive)
      '14',   // Italy (45ch)
      '16',   // Portugal (157ch)
      '39',   // Poland (192ch)
      '35',   // Romania (79ch)
      '63',   // Sweden (48 alive)
      '582',  // Finland (32ch)
      '132',  // Israel (116ch)
      '141',  // New Zealand (5ch)
    ],
  },
  {
    id: 'asia-pacific',
    name: 'Asia Pacific',
    icon: 'compass',
    categoryIds: [
      '90',   // Philippines (124ch)
      '101',  // Indonesia (91 alive)
      '48',   // Malaysia (200ch — probe will filter dead)
    ],
  },
  {
    id: 'sports-all',
    name: 'All Sports',
    icon: 'trophy',
    categoryIds: [
      '85',   // beIN Sports (132ch)
      '578',  // Real 4K (35ch)
      '353',  // Sky Sports UK 4K (10ch)
      '483',  // Sky Sports UK (32ch)
      '234',  // Football (31ch)
      '345',  // DStv Super (32ch)
      '427',  // DStv Super FHD (34ch)
      '492',  // EPL (31ch)
      '5',    // Cricket (59ch)
      '6',    // Sports General
      '342',  // Tennis/Racing
      '550',  // Rugby (20ch)
      '138',  // Boxing
      '212',  // Fighting
      '356',  // India Sports
      '156',  // Arabic Sports
      '137',  // Fox Australia Sports (8ch)
      '516',  // NFL
      '139',  // UK Sports Mix (10ch)
      '726',  // MLS (49ch)
      '328',  // MLB (32ch)
      '190',  // PPV Live Events (72ch)
      '807',  // IPL 2026 (9ch)
      '808',  // PSL 2026 (2ch)
      '542',  // Optus Sports (11 alive)
      '543',  // Spark Sports (8 alive)
    ],
  },
];

// Dead categories — truly dead or empty, verified 2026-03-30 probe.
// Categories removed from this list if probe found alive channels.
export const DEAD_CATEGORY_IDS = new Set([
  '579',  // Denmark (0 alive)
  '29',   // Albania (0 alive — all 343 dead)
  '54',   // Australia (0 alive — use Fox Sports 137 instead)
  '60',   // Austria (0 alive)
  '66',   // Brasil (0 alive)
  '44',   // Bulgaria (0 alive)
  '31',   // Canada (0 alive)
  '741',  // Canada Live Event (0 alive)
  '425',  // Caribbean (0 alive)
  '774',  // Czech (0 alive)
  '10',   // Greek (0 alive)
  '773',  // NBA League Pass (0 alive — use 516 NFL for US sports)
  '21',   // Netherlands (0 alive)
  '583',  // Norway (0 alive)
  '360',  // Pakistani Singers 24/7 (0 alive — use 287 Punjabi Singers)
  '213',  // Premium (0 alive)
]);

// ── Premium Gem Channels ─────────────────────────────────────────
/** Premium channels to always surface first within any category listing.
 *  Stream IDs sourced from the 2026-03-28 channel curation probe. */
export const GEM_STREAM_IDS = new Set([
  // ── beIN Sports 4K (Arabic football, top tier) ──
  652310, 652311, 652312, 652313, 652314, 652315, 652316, 652317, 652318,
  // beIN Sports FHD
  652333, 652334, 652335, 652336, 652337, 652338, 652339, 652340, 652341,
  // beIN English & French
  652345, 652346, 652347, 652348,
  // beIN Global 4K
  652322,
  // beIN Max 4K
  652395, 652396, 652397, 652398,

  // ── Sky Sports UK (FHD — strongest UK sports) ──
  186597,  // SKY SPORTS MAIN EVENT FHD
  186604,  // SKY SPORTS PREMIER LEAGUE FHD
  186612,  // SKY SPORTS FOOTBALL FHD
  186606,  // SKY SPORTS CRICKET FHD
  186616,  // SKY SPORTS F1 FHD
  186614,  // SKY SPORTS GOLF FHD
  186622,  // SKY SPORTS MIX FHD
  186624,  // SKY SPORTS NEWS FHD
  186620,  // SKY SPORTS Plus FHD

  // ── Real 4K (true UHD streams) ──
  581305,  // UHD SKY SPORTS MAIN EVENT
  581306,  // UHD SKY SPORTS F1
  581307,  // UHD SKY SPORTS 1
  688273,  // UHD SKY SPORTS 2
  688283,  // UHD SKY SPORT DE
  688284,  // UHD SKY SPORT BUNDESLIGA DE
  688310,  // UHD M+ LALIGA TV

  // ── TNT Sports (Champions League) ──
  186628,  // TNT SPORT 2 FHD
  186629,  // TNT SPORT 3 FHD
  186630,  // TNT SPORT 4 FHD
  199487,  // TNT SPORT 1 HD

  // ── Football gems ──
  138713,  // BEIN SPORTS English 1 (4k)
  23342,   // Sky Sports Premier League (FHD)
  23334,   // Sky Sports Football (FHD)
  771,     // SUPERSPORTS PREMIER LEAGUE (FHD)
  776,     // SUPERSPORTS FOOTBALL (FHD)
  768,     // SUPERSPORTS LALIGA (FHD)
  29,      // MUTV HD
  30,      // LIVERPOOL FC HD

  // ── News gems ──
  710,     // USA: CNN HD
  1059,    // UK: BBC NEWS HD
  1060,    // UK: SKY NEWS
  51,      // USA: Fox News
  5666,    // AL JAZEERA HD
  1095,    // US: CNBC HD
  871,     // US: MSNBC
  148282,  // UK FHD: CNN
  148251,  // UKFHD: Al Jazeera
  148365,  // UK HD: BBC News
  148335,  // UKHD: Sky News

  // ── UK Entertainment gems ──
  258,     // UK: CHANNEL 4 HD
  259,     // UK: CHANNEL 5 HD
  260,     // UK: COMEDY CENTRAL HD

  // ── UK Kids gems ──
  148211,  // Cartoon Network FHD
  148212,  // UK FHD: CBeebies
  148256,  // UK FHD: Nick Jr
  148190,  // UK FHD: Nickelodeon
  148222,  // UK FHD: Sky Kids

  // ── Kids gems ──
  19741,   // IN: Disney Channel (4K)
  20925,   // IN: DISNEY INTERNATIONAL (4K)
  98880,   // IN: NICK (4K)
  8,       // IN: CARTOON NETWORK HD
  1066,    // UK: CARTOON NETWORK HD
  49,      // USA: DISNEY JR HD

  // ── beIN Movies gems ──
  274145,  // beIN MOVIES 4K 1
  274146,  // beIN MOVIES 4K 2
  274147,  // beIN MOVIES 4K 3
  274148,  // beIN MOVIES 4K 4
  274199,  // Bein Movies HD1
  274200,  // Bein Movies HD2
  274201,  // Bein Movies HD3
  274202,  // Bein Movies HD4

  // ── UK Movies gems (Sky Cinema) ──
  34158,   // UK: SKY ATLANTIC FHD
  34170,   // UK: SKY CINEMA ACTION (FHD)
  34169,   // UK: SKY CINEMA COMEDY (FHD)
  34164,   // UK: SKY CINEMA DRAMA (FHD)
  34171,   // UK: SKY CINEMA ANIMATION (FHD)

  // ── Eurosport ──
  186637,  // EUROSPORT 1 FHD
  186638,  // EUROSPORT 2 FHD
  23348,   // Eurosport 2 (FHD)
]);
