/**
 * DashTivi+ Movie Collections — Two-level tab + genre intelligence
 *
 * Parent tabs (content origin) → Source subtabs (what to fetch) → Genre filters (TMDB-powered)
 * 162 API categories → 10 parent tabs, each with source subtabs + genre filtering
 */

export interface MovieSubtab {
  id: string;
  name: string;
  categoryIds: string[];
}

export interface MovieParentTab {
  id: string;
  name: string;
  subtabs: MovieSubtab[];
  /** Category IDs to search across when user types 3+ chars */
  searchCategoryIds: string[];
}

// ── TMDB Genre Map (for filter pills) ─────────────────────────────

export const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
  10752: 'War', 37: 'Western',
};

/** Genre filters shown as pills — ordered by popularity */
export const GENRE_FILTERS = [
  { id: 0, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 53, name: 'Thriller' },
  { id: 18, name: 'Drama' },
  { id: 878, name: 'Sci-Fi' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 99, name: 'Documentary' },
  { id: 80, name: 'Crime' },
  { id: 9648, name: 'Mystery' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 10752, name: 'War' },
];

// ── Smart sort presets ────────────────────────────────────────────

export type SortMode = 'smart' | 'rating' | 'newest' | 'name';

export const SORT_MODES: { id: SortMode; name: string }[] = [
  { id: 'smart', name: 'Smart' },
  { id: 'rating', name: 'Top Rated' },
  { id: 'newest', name: 'Newest' },
  { id: 'name', name: 'A-Z' },
];

// ── VEE Intelligence Collections ──────────────────────────────────
//
// Smart, curated rows powered by TMDB data. These render ABOVE the
// regular tab grid on the Movies page as horizontal scrollers.

import type { VodStream } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';

export interface VeeMovieCollection {
  id: string;
  name: string;
  tagline: string;
  /** Return true to include this movie in the collection */
  filter: (movie: VodStream, tmdb: TmdbEntry | null) => boolean;
  /** Sort comparator — receives full tmdb map for lookups */
  sort: (a: VodStream, b: VodStream, tmdbMap: Record<string, TmdbEntry>) => number;
  limit: number;
  /** Optional: only show on certain parent tabs (empty = all) */
  parentTabs?: string[];
  /** Optional: filter by category IDs instead of TMDB genres */
  categoryIds?: string[];
  /** Top 10 row — UI renders numbered cards */
  isTop10?: boolean;
  /** Time-aware: only visible during certain hours (0-23) */
  visibleAfterHour?: number;
}

// ── Helpers ───────────────────────────────────────────────────────

function tmdbKey(m: VodStream): string { return `m:${m.stream_id}`; }
function tmdbRating(m: VodStream, map: Record<string, TmdbEntry>): number { return map[tmdbKey(m)]?.r || 0; }

function byRatingDesc(a: VodStream, b: VodStream, map: Record<string, TmdbEntry>): number {
  return tmdbRating(b, map) - tmdbRating(a, map);
}

/** Rating + recency combo for "trending" sort — recent high-rated content surfaces first */
function byTrendingScore(a: VodStream, b: VodStream, map: Record<string, TmdbEntry>): number {
  const scoreA = tmdbRating(a, map) + (parseInt(a.added || '0', 10) / 1e9);
  const scoreB = tmdbRating(b, map) + (parseInt(b.added || '0', 10) / 1e9);
  return scoreB - scoreA;
}

/** Check if a movie was added within the last N days */
function addedWithinDays(m: VodStream, days: number): boolean {
  if (!m.added) return false;
  const ts = parseInt(m.added, 10);
  if (ts <= 0) return false;
  return ts >= Date.now() / 1000 - days * 86400;
}

/** Check if movie is from a recent year (parsed from TMDB or name) */
function isRecentYear(m: VodStream, t: TmdbEntry | null, minYear: number): boolean {
  // TMDB year field if available
  if (t?.y) {
    const yr = parseInt(t.y, 10);
    if (yr >= minYear) return true;
  }
  // Fallback: parse year from name like "Movie (2025)"
  const match = m.name.match(/\((\d{4})\)/);
  return match ? parseInt(match[1], 10) >= minYear : false;
}

// ── Movie genre IDs (TMDB) ────────────────────────────────────────

const G = {
  ACTION: 28, ADVENTURE: 12, ANIMATION: 16, COMEDY: 35,
  CRIME: 80, DOCUMENTARY: 99, DRAMA: 18, FAMILY: 10751,
  FANTASY: 14, HISTORY: 36, HORROR: 27, MUSIC: 10402,
  MYSTERY: 9648, ROMANCE: 10749, SCIFI: 878, THRILLER: 53,
  WAR: 10752, WESTERN: 37,
} as const;

const hasGenre = (t: TmdbEntry | null, ...ids: number[]): boolean =>
  t !== null && ids.some(id => t.g.includes(id));

// ── Collections ───────────────────────────────────────────────────

export const VEE_MOVIE_COLLECTIONS: VeeMovieCollection[] = [
  // 1. MARQUEE — Top 10 This Week
  {
    id: 'top-10-weekly',
    name: 'Top 10 Movies This Week',
    tagline: 'The most-watched right now',
    isTop10: true,
    filter: (_m, t) => t !== null && t.r >= 7.0 && isRecentYear(_m, t, 2024),
    sort: byTrendingScore,
    limit: 10,
  },

  // 2. New on DashTivi+
  {
    id: 'new-on-dashtivi',
    name: 'New on DashTivi+',
    tagline: 'Just landed — catch them first',
    filter: (m, _t) => addedWithinDays(m, 14),
    sort: (a, b, map) => {
      // Newest first, tiebreak by rating
      const timeDiff = parseInt(b.added || '0', 10) - parseInt(a.added || '0', 10);
      return timeDiff !== 0 ? timeDiff : tmdbRating(b, map) - tmdbRating(a, map);
    },
    limit: 25,
  },

  // 3. Award-Winning Cinema
  {
    id: 'award-winning',
    name: 'Award-Winning Cinema',
    tagline: 'The films that defined their year',
    filter: (_m, t) => t !== null && t.r >= 8.0 && hasGenre(t, G.DRAMA, G.HISTORY),
    sort: byRatingDesc,
    limit: 20,
  },

  // 4. Adrenaline Rush
  {
    id: 'adrenaline-rush',
    name: 'Adrenaline Rush',
    tagline: 'Non-stop action, zero chill',
    filter: (_m, t) => t !== null && t.r >= 6.5 && hasGenre(t, G.ACTION, G.THRILLER, G.CRIME),
    sort: byTrendingScore,
    limit: 25,
  },

  // 5. Feel-Good Favorites
  {
    id: 'feel-good',
    name: 'Feel-Good Favorites',
    tagline: 'Comfort watching at its best',
    filter: (_m, t) => t !== null && t.r >= 6.0 && hasGenre(t, G.COMEDY, G.ROMANCE, G.FAMILY, G.ANIMATION),
    sort: byRatingDesc,
    limit: 25,
  },

  // 6. Mind-Bending
  {
    id: 'mind-bending',
    name: 'Mind-Bending',
    tagline: 'Reality is optional',
    filter: (_m, t) => t !== null && t.r >= 7.0 && hasGenre(t, G.SCIFI, G.MYSTERY, G.FANTASY),
    sort: byRatingDesc,
    limit: 20,
  },

  // 7. True Stories
  {
    id: 'true-stories',
    name: 'True Stories',
    tagline: 'Real life, unscripted',
    filter: (_m, t) => hasGenre(t, G.DOCUMENTARY),
    sort: byRatingDesc,
    limit: 20,
  },

  // 8. Hidden Gems — high quality but low visibility
  {
    id: 'hidden-gems',
    name: 'Hidden Gems',
    tagline: 'Brilliant films most people missed',
    filter: (_m, t) => {
      if (!t || t.r < 7.5) return false;
      // "Hidden" = no trailer AND sparse genre tags (fewer than 3 genres)
      const noTrailer = !t.y;
      const sparseGenres = t.g.length < 3;
      return noTrailer || sparseGenres;
    },
    sort: byRatingDesc,
    limit: 20,
  },

  // 9. Late Night Picks — time-aware, only after 9pm
  {
    id: 'late-night',
    name: 'Late Night Picks',
    tagline: 'For when the lights are off',
    visibleAfterHour: 21,
    filter: (_m, t) => {
      if (new Date().getHours() < 21) return false;
      return t !== null && t.r >= 6.0 && hasGenre(t, G.HORROR, G.THRILLER);
    },
    sort: byRatingDesc,
    limit: 20,
  },

  // 10. World Cinema — category-based
  {
    id: 'world-cinema',
    name: 'World Cinema',
    tagline: 'Stories without borders',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['95', '537', '772', '609', '267', '766', '599', '88', '100'], // Turkish, Korean, Indian, Arabic, Bangla
  },

  // 11. 4K Ultra
  {
    id: '4k-ultra',
    name: '4K Ultra',
    tagline: 'Crystal clear, no compromise',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['122', '120'], // Hollywood 4K + Bollywood 4K
  },

  // 12. African Stories
  {
    id: 'african-stories',
    name: 'African Stories',
    tagline: 'Voices from the continent',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 20,
    categoryIds: ['580'], // Afrikaans / African content
  },

  // 13. Critically Acclaimed
  {
    id: 'critically-acclaimed',
    name: 'Critically Acclaimed',
    tagline: 'Only the finest make this list',
    filter: (_m, t) => t !== null && t.r >= 8.5,
    sort: byRatingDesc,
    limit: 15,
  },

  // 14. Weekend Blockbusters
  {
    id: 'weekend-blockbusters',
    name: 'Weekend Blockbusters',
    tagline: 'Big screen energy, couch delivery',
    filter: (_m, t) => t !== null && t.r >= 6.0 && hasGenre(t, G.ACTION, G.ADVENTURE, G.SCIFI),
    sort: byTrendingScore,
    limit: 25,
  },

  // 15. Romantic Escapes
  {
    id: 'romantic-escapes',
    name: 'Romantic Escapes',
    tagline: 'Love stories worth falling for',
    filter: (_m, t) => t !== null && t.r >= 6.5 && t.g.includes(G.ROMANCE) && t.g.includes(G.DRAMA),
    sort: byRatingDesc,
    limit: 20,
  },

  // 16. Laugh Out Loud
  {
    id: 'laugh-out-loud',
    name: 'Laugh Out Loud',
    tagline: 'Pure comedy, no strings attached',
    filter: (_m, t) => t !== null && t.r >= 6.0 && t.g.includes(G.COMEDY) && !t.g.includes(G.ROMANCE),
    sort: byTrendingScore,
    limit: 25,
  },

  // 17. Nollywood Originals
  {
    id: 'nollywood-originals',
    name: 'Nollywood Originals',
    tagline: 'Nigeria to the world',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['580'], // Afrikaans / African content — includes Nollywood
  },

  // 18. Bollywood Blockbusters
  {
    id: 'bollywood-blockbusters',
    name: 'Bollywood Blockbusters',
    tagline: 'Masala, emotion, spectacle — all in one',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byTrendingScore,
    limit: 25,
    categoryIds: ['33', '527', '766', '599'], // Bollywood classic + 2024 + latest
  },

  // 19. Turkish Drama
  {
    id: 'turkish-drama',
    name: 'Turkish Drama',
    tagline: 'Dizi that keeps you up all night',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['95', '537', '772', '609'], // Turkish classic + 2024 + latest
  },

  // 20. Korean Wave
  {
    id: 'korean-wave',
    name: 'Korean Wave',
    tagline: 'Hallyu hits different',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 20,
    categoryIds: ['267'], // Korean content
  },

  // 21. Family Movie Night
  {
    id: 'family-movie-night',
    name: 'Family Movie Night',
    tagline: 'Something everyone can agree on',
    filter: (_m, t) => t !== null && t.r >= 5.5 && hasGenre(t, G.FAMILY, G.ANIMATION, G.COMEDY),
    sort: byRatingDesc,
    limit: 25,
  },

  // 22. Franchise Universe
  {
    id: 'franchise-universe',
    name: 'Franchise Universe',
    tagline: 'Worlds bigger than one movie',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byRatingDesc,
    limit: 30,
    categoryIds: ['147', '157', '160', '153', '154', '216', '219'], // Marvel, Star Wars, HP, FF, JP, Terminator, Alien
  },

  // 23. Epic Sagas
  {
    id: 'epic-sagas',
    name: 'Epic Sagas',
    tagline: 'History forged in fire and glory',
    filter: (_m, t) => t !== null && t.r >= 7.0 && hasGenre(t, G.HISTORY, G.WAR, G.ADVENTURE),
    sort: byRatingDesc,
    limit: 20,
  },

  // 24. Midnight Horror
  {
    id: 'midnight-horror',
    name: 'Midnight Horror',
    tagline: 'You asked for this',
    visibleAfterHour: 22,
    filter: (_m, t) => {
      if (new Date().getHours() < 22) return false;
      return t !== null && t.r >= 5.5 && hasGenre(t, G.HORROR);
    },
    sort: byRatingDesc,
    limit: 20,
  },

  // 25. Fresh from Studios
  {
    id: 'fresh-from-studios',
    name: 'Fresh from Studios',
    tagline: "This week's arrivals",
    filter: (m, t) => t !== null && t.r >= 6.0 && addedWithinDays(m, 7),
    sort: (a, b, map) => {
      const timeDiff = parseInt(b.added || '0', 10) - parseInt(a.added || '0', 10);
      return timeDiff !== 0 ? timeDiff : tmdbRating(b, map) - tmdbRating(a, map);
    },
    limit: 20,
  },

  // 26. Underrated Masterpieces
  {
    id: 'underrated-masterpieces',
    name: 'Underrated Masterpieces',
    tagline: 'The ones that slipped through',
    filter: (_m, t) => t !== null && t.r >= 7.8 && !t.t,
    sort: byRatingDesc,
    limit: 15,
  },

  // 27. Netflix Originals
  {
    id: 'netflix-originals',
    name: 'Netflix Originals',
    tagline: 'Exclusive stories, only here',
    filter: (_m, _t) => false, // category-based: resolved at render time
    sort: byTrendingScore,
    limit: 25,
    categoryIds: ['169', '168'], // Netflix English + Hindi
    parentTabs: ['netflix'],
  },
];

// ── Parent Tabs ────────────────────────────────────────────────────

export const MOVIE_TABS: MovieParentTab[] = [
  {
    id: 'new',
    name: 'New & Hot',
    subtabs: [
      { id: 'all-new', name: 'All New', categoryIds: ['749', '597', '766', '599', '768', '602', '772', '609', '770', '606', '783', '604', '789', '608', '792', '610', '784', '601'] },
      { id: 'hollywood-new', name: 'Hollywood', categoryIds: ['749', '597'] },
      { id: 'bollywood-new', name: 'Bollywood', categoryIds: ['766', '599'] },
      { id: 'tamil-new', name: 'Tamil', categoryIds: ['768', '602'] },
      { id: 'telugu-new', name: 'Telugu', categoryIds: ['770', '606'] },
      { id: 'turkish-new', name: 'Turkish', categoryIds: ['772', '609'] },
    ],
    searchCategoryIds: ['749', '597', '766', '599', '768', '602', '772', '609'],
  },
  {
    id: 'hollywood',
    name: 'Hollywood',
    subtabs: [
      { id: 'hw-latest', name: 'Latest', categoryIds: ['749', '597'] },
      { id: 'hw-2024', name: '2024', categoryIds: ['525'] },
      { id: 'hw-2023', name: '2023', categoryIds: ['363'] },
      { id: 'hw-4k', name: '4K Ultra', categoryIds: ['122'] },
      { id: 'hw-blockbuster', name: 'Blockbuster', categoryIds: ['34'] },
      { id: 'hw-oscar', name: 'Awards', categoryIds: ['240', '412'] },
      { id: 'hw-horror', name: 'Horror', categoryIds: ['148'] },
      { id: 'hw-romance', name: 'Romance', categoryIds: ['262'] },
      { id: 'hw-docs', name: 'Docs', categoryIds: ['257'] },
      { id: 'hw-older', name: '2020-2022', categoryIds: ['62', '128', '253'] },
      { id: 'hw-classic', name: 'Classic', categoryIds: ['423'] },
      { id: 'hw-arabic-sub', name: 'Arabic Sub', categoryIds: ['96'] },
      { id: 'hw-hindi-dub', name: 'Hindi Dubbed', categoryIds: ['26'] },
      { id: 'hw-cam', name: 'CAM', categoryIds: ['526', '598', '786'] },
    ],
    searchCategoryIds: ['749', '597', '525', '363', '122', '34', '240'],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    subtabs: [
      { id: 'nf-english', name: 'English', categoryIds: ['169'] },
      { id: 'nf-hindi', name: 'Hindi', categoryIds: ['168'] },
    ],
    searchCategoryIds: ['169', '168'],
  },
  {
    id: 'turkish',
    name: 'Turkish',
    subtabs: [
      { id: 'tr-latest', name: 'Latest', categoryIds: ['772', '609'] },
      { id: 'tr-2024', name: '2024', categoryIds: ['537'] },
      { id: 'tr-classic', name: 'Classic', categoryIds: ['95'] },
    ],
    searchCategoryIds: ['772', '609', '537', '95'],
  },
  {
    id: 'bollywood',
    name: 'Bollywood',
    subtabs: [
      { id: 'bw-latest', name: 'Latest', categoryIds: ['766', '599'] },
      { id: 'bw-2024', name: '2024', categoryIds: ['527'] },
      { id: 'bw-2023', name: '2023', categoryIds: ['364'] },
      { id: 'bw-4k', name: '4K', categoryIds: ['120'] },
      { id: 'bw-classic', name: 'Classic', categoryIds: ['33'] },
      { id: 'bw-south-dub', name: 'South Dubbed', categoryIds: ['93'] },
      { id: 'bw-stars', name: 'Star Power', categoryIds: ['189', '195', '187', '186', '193', '172', '244', '246'] },
      { id: 'bw-comedy', name: 'Comedy', categoryIds: ['252'] },
      { id: 'bw-old', name: 'Old Gold', categoryIds: ['151'] },
      { id: 'bw-multi', name: 'Multi Lang', categoryIds: ['179', '233'] },
      { id: 'bw-cam', name: 'CAM', categoryIds: ['528', '600', '757', '619'] },
    ],
    searchCategoryIds: ['766', '599', '527', '33', '120'],
  },
  {
    id: 'south-indian',
    name: 'South Indian',
    subtabs: [
      { id: 'si-tamil-new', name: 'Tamil New', categoryIds: ['768', '602'] },
      { id: 'si-tamil-2024', name: 'Tamil 2024', categoryIds: ['530'] },
      { id: 'si-tamil', name: 'Tamil All', categoryIds: ['89'] },
      { id: 'si-telugu-new', name: 'Telugu New', categoryIds: ['770', '606'] },
      { id: 'si-telugu-2024', name: 'Telugu 2024', categoryIds: ['534'] },
      { id: 'si-telugu', name: 'Telugu All', categoryIds: ['92'] },
      { id: 'si-malayalam-new', name: 'Malayalam New', categoryIds: ['783', '604'] },
      { id: 'si-malayalam', name: 'Malayalam All', categoryIds: ['91'] },
      { id: 'si-kannada-new', name: 'Kannada New', categoryIds: ['789', '608'] },
      { id: 'si-kannada', name: 'Kannada All', categoryIds: ['166'] },
    ],
    searchCategoryIds: ['768', '602', '770', '606', '783', '604', '789', '608'],
  },
  {
    id: 'collections',
    name: 'Collections',
    subtabs: [
      { id: 'col-marvel', name: 'Marvel', categoryIds: ['147'] },
      { id: 'col-starwars', name: 'Star Wars', categoryIds: ['157'] },
      { id: 'col-bond', name: 'James Bond', categoryIds: ['146'] },
      { id: 'col-hp', name: 'Harry Potter', categoryIds: ['160'] },
      { id: 'col-ff', name: 'Fast & Furious', categoryIds: ['153'] },
      { id: 'col-jp', name: 'Jurassic Park', categoryIds: ['154'] },
      { id: 'col-godfather', name: 'Godfather', categoryIds: ['159'] },
      { id: 'col-terminator', name: 'Terminator', categoryIds: ['216'] },
      { id: 'col-alien', name: 'Alien', categoryIds: ['219'] },
      { id: 'col-rocky', name: 'Rocky', categoryIds: ['220'] },
      { id: 'col-diehard', name: 'Die Hard', categoryIds: ['217'] },
      { id: 'col-rambo', name: 'Rambo', categoryIds: ['215'] },
      { id: 'col-vandamme', name: 'Van Damme', categoryIds: ['222'] },
      { id: 'col-brucelee', name: 'Bruce Lee', categoryIds: ['228'] },
      { id: 'col-denzel', name: 'Denzel', categoryIds: ['158'] },
      { id: 'col-morgan', name: 'Morgan Freeman', categoryIds: ['173'] },
      { id: 'col-predator', name: 'Predator', categoryIds: ['218'] },
      { id: 'col-indy', name: 'Indiana Jones', categoryIds: ['152'] },
    ],
    searchCategoryIds: ['147', '157', '146', '160', '153'],
  },
  {
    id: 'kids',
    name: 'Kids',
    subtabs: [
      { id: 'kids-all', name: 'All', categoryIds: ['69'] },
      { id: 'kids-cam', name: 'CAM', categoryIds: ['621'] },
    ],
    searchCategoryIds: ['69'],
  },
  {
    id: 'world',
    name: 'World Cinema',
    subtabs: [
      { id: 'wc-bangla', name: 'Bangla', categoryIds: ['100'] },
      { id: 'wc-bangla-new', name: 'Bangla New', categoryIds: ['792', '610'] },
      { id: 'wc-punjabi', name: 'Punjabi', categoryIds: ['27'] },
      { id: 'wc-punjabi-new', name: 'Punjabi New', categoryIds: ['784', '601'] },
      { id: 'wc-marathi', name: 'Marathi', categoryIds: ['127'] },
      { id: 'wc-gujarati', name: 'Gujarati', categoryIds: ['155'] },
      { id: 'wc-pakistan', name: 'Pakistan', categoryIds: ['37', '434', '198', '150'] },
      { id: 'wc-myanmar', name: 'Myanmar', categoryIds: ['223'] },
      { id: 'wc-afrikaans', name: 'Afrikaans', categoryIds: ['580'] },
      { id: 'wc-arabic', name: 'Arabic', categoryIds: ['88'] },
    ],
    searchCategoryIds: ['100', '27', '127', '37', '223'],
  },
  {
    id: 'sports',
    name: 'Sports & Events',
    subtabs: [
      { id: 'sp-ufc', name: 'UFC', categoryIds: ['424'] },
      { id: 'sp-wwe', name: 'WWE', categoryIds: ['94'] },
      { id: 'sp-fifa', name: 'FIFA WC', categoryIds: ['362'] },
      { id: 'sp-cricket', name: 'Cricket', categoryIds: ['421'] },
      { id: 'sp-kapil', name: 'Kapil Sharma', categoryIds: ['97'] },
      { id: 'sp-idol', name: 'Indian Idol', categoryIds: ['134'] },
    ],
    searchCategoryIds: ['424', '94', '362'],
  },
];
