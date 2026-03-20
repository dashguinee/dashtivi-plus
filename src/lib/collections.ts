/**
 * DashTivi+ Collections — Curated content experiences
 *
 * Collections define WHAT to show and HOW to show it.
 * The homepage reads these to build a personalized, time-aware experience.
 *
 * Category IDs are from the Starshare/Xtream API.
 */

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
  {
    id: 'live-sports',
    name: 'Live Sports',
    emoji: '\u26BD',
    description: 'Football, Cricket, Combat & more',
    type: 'live',
    categoryIds: [
      '234',  // Football
      '85',   // beIN Sports
      '345',  // DSTV Super Sports
      '5',    // Cricket
      '353',  // Sky Sports UK 4K
      '578',  // Real 4K
    ],
    limit: 15,
    navigateTo: '/live',
  },
  {
    id: 'fresh-movies',
    name: 'Fresh Movies',
    emoji: '\uD83C\uDFAC',
    description: 'Just added this year',
    type: 'vod',
    categoryIds: ['749', '597'], // English 2026, 2025
    limit: 15,
    navigateTo: '/movies',
  },
  {
    id: 'binge-worthy',
    name: 'Binge-Worthy',
    emoji: '\uD83C\uDF7F',
    description: 'Netflix, HBO, Disney+',
    type: 'series',
    categoryIds: ['106', '188', '102'], // Netflix, HBO Max, Disney+Hotstar
    limit: 15,
    navigateTo: '/series',
  },
  {
    id: 'african-tv',
    name: 'African TV',
    emoji: '\uD83C\uDF0D',
    description: 'Canal+ Africa, DSTV & more',
    type: 'live',
    categoryIds: ['336', '345'], // Canal+ Africa, DSTV Super Sports
    limit: 15,
    navigateTo: '/french',
  },
  {
    id: 'news-world',
    name: 'News & World',
    emoji: '\uD83D\uDCF0',
    description: 'Stay informed, stay sharp',
    type: 'live',
    categoryIds: [
      '82',   // English News (CNN, BBC, Fox News, Al Jazeera)
      '417',  // UK News
      '346',  // DSTV News (Africa News, Bloomberg, Sky News)
      '165',  // Arabic News
    ],
    limit: 12,
    navigateTo: '/live',
  },
];

// ── Quick-tap Collection Cards (vibes navigation) ─────────────────

export const COLLECTION_CARDS: CollectionCard[] = [
  {
    id: 'sports',
    name: 'Sports',
    emoji: '\u26BD',
    gradient: 'from-green-600/40 to-emerald-900/40',
    navigateTo: '/live',
  },
  {
    id: 'news',
    name: 'News',
    emoji: '\uD83D\uDCF0',
    gradient: 'from-blue-600/40 to-blue-900/40',
    navigateTo: '/live',
  },
  {
    id: 'movies',
    name: 'Movies',
    emoji: '\uD83C\uDFAC',
    gradient: 'from-red-600/40 to-red-900/40',
    navigateTo: '/movies',
  },
  {
    id: 'series',
    name: 'Series',
    emoji: '\uD83D\uDCFA',
    gradient: 'from-purple-600/40 to-purple-900/40',
    navigateTo: '/series',
  },
  {
    id: 'africa',
    name: 'Africa',
    emoji: '\uD83C\uDF0D',
    gradient: 'from-amber-600/40 to-orange-900/40',
    navigateTo: '/french',
  },
  {
    id: 'action',
    name: 'Action',
    emoji: '\uD83D\uDCA5',
    gradient: 'from-orange-600/40 to-red-900/40',
    navigateTo: '/movies',
  },
];

// ── Time-aware Featured Hero ──────────────────────────────────────

export function getFeaturedHero(): FeaturedHero {
  const hour = new Date().getHours();

  // Morning (6am-12pm): News
  if (hour >= 6 && hour < 12) {
    return {
      title: 'Good Morning',
      subtitle: 'Catch up on what matters. Live news from around the world.',
      cta: 'Watch News',
      navigateTo: '/live',
      gradient: 'from-blue-600/20 via-[#0A0A0A] to-sky-900/10',
    };
  }

  // Afternoon (12pm-6pm): Movies
  if (hour >= 12 && hour < 18) {
    return {
      title: 'Afternoon Escape',
      subtitle: 'Thousands of movies waiting. Pick something fresh.',
      cta: 'Browse Movies',
      navigateTo: '/movies',
      gradient: 'from-amber-600/15 via-[#0A0A0A] to-orange-900/10',
    };
  }

  // Evening (6pm-11pm): Sports or Entertainment
  if (hour >= 18 && hour < 23) {
    return {
      title: 'Prime Time',
      subtitle: 'Live sports, new movies, and binge-worthy series. Your night starts here.',
      cta: 'Watch Live',
      navigateTo: '/live',
      gradient: 'from-primary/20 via-[#0A0A0A] to-primary-dark/10',
    };
  }

  // Late night (11pm-6am): Series / Chill
  return {
    title: 'Late Night',
    subtitle: 'Perfect time for a series. Start something new tonight.',
    cta: 'Find a Series',
    navigateTo: '/series',
    gradient: 'from-indigo-600/15 via-[#0A0A0A] to-violet-900/10',
  };
}

// ── Movie Featured Categories (reordered for audience) ────────────

export const MOVIE_FEATURED_CATS = [
  { id: '749', name: 'New 2026' },        // 214 movies
  { id: '597', name: '2025 Hits' },       // 2,120 movies
  { id: '525', name: '2024' },            // 2,614 movies
  { id: '122', name: '4K' },              // 1,058 movies
  { id: '34', name: 'Blockbuster' },      // 1,002 movies
  { id: '240', name: 'Award Winners' },   // 142 movies
  { id: '95', name: 'Turkish' },          // 853 movies (was 772 → only 28)
  { id: '33', name: 'Bollywood' },        // 2,683 movies (was 168 → only 51)
  { id: '69', name: 'Kids' },             // 440 movies
  { id: '96', name: 'Arabic Sub' },       // 684 movies (was 88 → only 3)
  { id: '148', name: 'Horror' },          // 188 movies
];

// ── Series Featured Categories ────────────────────────────────────

export const SERIES_FEATURED_CATS = [
  { id: '106', name: 'Netflix' },         // 2,532 series
  { id: '108', name: 'Prime Video' },     // 1,574 series
  { id: '102', name: 'Disney+' },         // 810 series (was 654 → only 49)
  { id: '188', name: 'HBO' },             // 380 series
  { id: '114', name: 'Apple TV+' },       // 346 series
  { id: '209', name: 'Hulu' },            // 334 series
  { id: '202', name: 'BBC' },             // 315 series
  { id: '249', name: 'Paramount+' },      // 154 series
  { id: '99', name: 'Turkish' },          // 1,130 series
  { id: '267', name: 'Korean' },          // 235 series
];

// ── Live TV Themed Collections ───────────────────────────────────

export interface LiveTheme {
  id: string;
  name: string;
  emoji: string;
  categoryIds: string[];
  gradient: string;
  glowColor: string;
}

export const LIVETV_THEMES: LiveTheme[] = [
  {
    id: 'sports',
    name: 'Sports',
    emoji: '\u26BD',
    categoryIds: [
      '234',  // Football
      '85',   // beIN Sports
      '345',  // DSTV Super Sports
      '427',  // DSTV Super Sports FHD
      '353',  // Sky UK 4K
      '578',  // Real 4K
      '6',    // General Sports
      '342',  // Racing / F1
      '550',  // Rugby
      '138',  // Golf
      '212',  // Tennis
      '356',  // India Sports
      '156',  // Arabic Sports
      '137',  // Fox Australia
      '516',  // NFL
      '190',  // PPV / Combat
      '483',  // UK Sports
    ],
    gradient: 'from-green-500 to-emerald-700',
    glowColor: 'shadow-green-500/20',
  },
  {
    id: 'news',
    name: 'News',
    emoji: '\uD83D\uDCF0',
    categoryIds: [
      '82',   // English News
      '417',  // UK News
      '346',  // DSTV News
      '431',  // DSTV News FHD
      '165',  // Arabic News
      '730',  // Indian News
      '98',   // Pakistan News
    ],
    gradient: 'from-blue-500 to-sky-700',
    glowColor: 'shadow-blue-500/20',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '\u2728',
    categoryIds: [
      '3',    // UK Entertainment
      '343',  // DSTV Entertainment
      '428',  // DSTV Entertainment FHD
      '2',    // USA
      '247',  // India Entertainment
    ],
    gradient: 'from-purple-500 to-violet-700',
    glowColor: 'shadow-purple-500/20',
  },
  {
    id: 'kids',
    name: 'Kids & Family',
    emoji: '\uD83E\uDDF8',
    categoryIds: ['32', '347', '430', '410'],
    gradient: 'from-pink-500 to-rose-600',
    glowColor: 'shadow-pink-500/20',
  },
  {
    id: 'movies247',
    name: 'Movies 24/7',
    emoji: '\uD83C\uDFAC',
    categoryIds: [
      '275',  // English Movies 24/7
      '57',   // Netflix Movies 24/7
      '282',  // Bollywood Movies 24/7
      '344',  // DSTV Movies
      '429',  // DSTV Movies FHD
    ],
    gradient: 'from-red-500 to-rose-700',
    glowColor: 'shadow-red-500/20',
  },
  {
    id: 'documentary',
    name: 'Discovery & Learning',
    emoji: '\uD83C\uDF0E',
    categoryIds: [
      '337',  // India Documentary (Discovery, NatGeo, History, Animal Planet, BBC Earth)
      '415',  // UK Documentary
    ],
    gradient: 'from-teal-500 to-cyan-700',
    glowColor: 'shadow-teal-500/20',
  },
  {
    id: 'music',
    name: 'Music & Vibes',
    emoji: '\uD83C\uDFB5',
    categoryIds: [
      '416',  // UK Music (MTV, VH1)
      '341',  // India Music
      '555',  // Arabic Music
    ],
    gradient: 'from-fuchsia-500 to-pink-700',
    glowColor: 'shadow-fuchsia-500/20',
  },
];

// ── Sports Sub-types (for sub-tabs within Sports theme) ─────────

export interface SportType {
  id: string;
  name: string;
  categoryIds: string[];
}

export const SPORT_TYPES: SportType[] = [
  { id: 'all', name: 'All', categoryIds: ['234', '85', '345', '427', '353', '578', '6', '342', '550', '138', '212', '356', '156', '137', '516', '190', '483'] },
  { id: 'football', name: 'Football', categoryIds: ['234'] },
  { id: 'cricket', name: 'Cricket', categoryIds: ['5'] },
  { id: 'nfl', name: 'NFL/PPV', categoryIds: ['516', '190'] },
  { id: 'africa', name: 'Africa', categoryIds: ['345', '427'] },
  { id: 'uk', name: 'UK', categoryIds: ['353', '483', '578'] },
  { id: 'bein', name: 'beIN', categoryIds: ['85'] },
  { id: 'india', name: 'India', categoryIds: ['6', '356'] },
  { id: 'racing', name: 'F1/Racing', categoryIds: ['342'] },
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
  africa: [
    { id: 'all', name: 'All', categoryIds: ['336', '345'] },
    { id: 'sports', name: 'Sports', categoryIds: ['345', '427'] },
    { id: 'entertainment', name: 'Entertainment', categoryIds: ['343', '428'] },
    { id: 'news', name: 'News', categoryIds: ['346', '431'] },
    { id: 'movies', name: 'Movies', categoryIds: ['344', '429'] },
    { id: 'kids', name: 'Kids', categoryIds: ['347', '430'] },
  ],
  france: [
    { id: 'all', name: 'All', categoryIds: ['11', '336'] },
    { id: 'france', name: 'France', categoryIds: ['11'] },
    { id: 'canal', name: 'Canal+', categoryIds: ['336'] },
  ],
  uk: [
    { id: 'all', name: 'All', categoryIds: ['414'] },
    { id: 'sports', name: 'Sports', categoryIds: ['483'] },
    { id: 'entertainment', name: 'Entertainment', categoryIds: ['3'] },
    { id: 'news', name: 'News', categoryIds: ['417'] },
    { id: 'movies', name: 'Movies', categoryIds: ['413'] },
    { id: 'kids', name: 'Kids', categoryIds: ['410'] },
    { id: 'documentary', name: 'Docs', categoryIds: ['415'] },
    { id: 'music', name: 'Music', categoryIds: ['416'] },
  ],
  usa: [
    { id: 'all', name: 'All', categoryIds: ['2'] },
  ],
  arabic: [
    { id: 'all', name: 'All', categoryIds: ['86', '165', '156'] },
    { id: 'mbc', name: 'MBC', categoryIds: ['86'] },
    { id: 'news', name: 'News', categoryIds: ['165'] },
    { id: 'sports', name: 'Sports', categoryIds: ['156'] },
  ],
  india: [
    { id: 'all', name: 'All', categoryIds: ['247', '9', '7', '732', '729', '5', '18', '730', '356'] },
    { id: 'entertainment', name: 'Entertainment', categoryIds: ['247'] },
    { id: 'bangla', name: 'Bangla', categoryIds: ['9'] },
    { id: 'punjabi', name: 'Punjabi', categoryIds: ['7'] },
    { id: 'tamil', name: 'Tamil', categoryIds: ['732'] },
    { id: 'malayalam', name: 'Malayalam', categoryIds: ['729'] },
    { id: 'cricket', name: 'Cricket', categoryIds: ['5'] },
    { id: 'news', name: 'News', categoryIds: ['730'] },
    { id: 'sports', name: 'Sports', categoryIds: ['356'] },
  ],
  pakistan: [
    { id: 'all', name: 'All', categoryIds: ['98'] },
  ],
  turkey: [
    { id: 'all', name: 'All', categoryIds: ['25'] },
  ],
};
