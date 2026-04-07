/**
 * DashTivi+ Series Collections — Two-level tab + genre intelligence
 *
 * Parent tabs (content origin) -> Source subtabs (what to fetch) -> Genre filters (TMDB-powered)
 * 283 API categories -> 4 parent tabs, each with source subtabs + genre filtering
 */

export interface SeriesSubtab {
  id: string;
  name: string;
  categoryIds: string[];
}

export interface SeriesParentTab {
  id: string;
  name: string;
  subtabs: SeriesSubtab[];
  /** Category IDs to search across when user types 3+ chars */
  searchCategoryIds: string[];
}

// ── TMDB Genre Map (for filter pills — TV genres) ───────────────────

export const TMDB_TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  10762: 'Kids', 9648: 'Mystery', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk',
  10768: 'War & Politics', 37: 'Western', 10749: 'Romance',
  27: 'Horror', 53: 'Thriller',
};

/** Genre filters shown as pills — ordered by popularity for TV */
export const GENRE_FILTERS = [
  { id: 0, name: 'All' },
  { id: 18, name: 'Drama' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 53, name: 'Thriller' },
  { id: 10759, name: 'Action' },
  { id: 10765, name: 'Sci-Fi' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 16, name: 'Animation' },
  { id: 99, name: 'Documentary' },
  { id: 10751, name: 'Family' },
  { id: 27, name: 'Horror' },
  { id: 10764, name: 'Reality' },
  { id: 10768, name: 'War' },
  { id: 37, name: 'Western' },
];

// ── Smart sort presets ──────────────────────────────────────────────

export type SortMode = 'smart' | 'rating' | 'newest' | 'name';

export const SORT_MODES: { id: SortMode; name: string }[] = [
  { id: 'smart', name: 'Smart' },
  { id: 'rating', name: 'Top Rated' },
  { id: 'newest', name: 'Newest' },
  { id: 'name', name: 'A-Z' },
];

// ── VEE Intelligence Collections (Series) ─────────────────────────
//
// Smart, curated rows powered by TMDB data. Rendered ABOVE the
// regular tab grid on the Series page as horizontal scrollers.

import type { SeriesItem } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';

export interface VeeSeriesCollection {
  id: string;
  name: string;
  tagline: string;
  filter: (series: SeriesItem, tmdb: TmdbEntry | null) => boolean;
  sort: (a: SeriesItem, b: SeriesItem, tmdbMap: Record<string, TmdbEntry>) => number;
  limit: number;
  parentTabs?: string[];
  categoryIds?: string[];
  /** Top 10 row — UI renders numbered cards */
  isTop10?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────

function tmdbKey(s: SeriesItem): string { return `s:${s.series_id}`; }
function tmdbRating(s: SeriesItem, map: Record<string, TmdbEntry>): number { return map[tmdbKey(s)]?.r || 0; }

function byRatingDesc(a: SeriesItem, b: SeriesItem, map: Record<string, TmdbEntry>): number {
  return tmdbRating(b, map) - tmdbRating(a, map);
}

/** Rating + recency combo for trending sort */
function byTrendingScore(a: SeriesItem, b: SeriesItem, map: Record<string, TmdbEntry>): number {
  const scoreA = tmdbRating(a, map) + (parseInt(a.last_modified || '0', 10) / 1e9);
  const scoreB = tmdbRating(b, map) + (parseInt(b.last_modified || '0', 10) / 1e9);
  return scoreB - scoreA;
}

/** Check if series was modified within the last N days */
function modifiedWithinDays(s: SeriesItem, days: number): boolean {
  if (!s.last_modified) return false;
  const ts = parseInt(s.last_modified, 10);
  if (ts <= 0) return false;
  return ts >= Date.now() / 1000 - days * 86400;
}

/** Check if series is from a recent year */
function isRecentYear(s: SeriesItem, t: TmdbEntry | null, minYear: number): boolean {
  if (t?.y) {
    const yr = parseInt(t.y, 10);
    if (yr >= minYear) return true;
  }
  const match = s.name.match(/\((\d{4})\)/);
  return match ? parseInt(match[1], 10) >= minYear : false;
}

// ── TV genre IDs (TMDB) ───────────────────────────────────────────

const G = {
  ACTION_ADV: 10759, ANIMATION: 16, COMEDY: 35, CRIME: 80,
  DOCUMENTARY: 99, DRAMA: 18, FAMILY: 10751, KIDS: 10762,
  MYSTERY: 9648, REALITY: 10764, SCIFI_FANTASY: 10765,
  THRILLER: 53, HORROR: 27, ROMANCE: 10749,
} as const;

const hasGenre = (t: TmdbEntry | null, ...ids: number[]): boolean =>
  t !== null && ids.some(id => t.g.includes(id));

// ── Collections ───────────────────────────────────────────────────

export const VEE_SERIES_COLLECTIONS: VeeSeriesCollection[] = [
  // 1. MARQUEE — Top 10 Series This Week
  {
    id: 'top-10-series',
    name: 'Top 10 Series This Week',
    tagline: 'Everyone is watching these',
    isTop10: true,
    filter: (_s, t) => t !== null && t.r >= 7.5 && isRecentYear(_s, t, 2024),
    sort: byTrendingScore,
    limit: 10,
  },

  // 2. Binge-Worthy
  {
    id: 'binge-worthy',
    name: 'Binge-Worthy',
    tagline: 'Start one, finish all',
    filter: (_s, t) => t !== null && t.r >= 8.0 && hasGenre(t, G.DRAMA, G.CRIME, G.THRILLER),
    sort: byRatingDesc,
    limit: 20,
  },

  // 3. New Seasons Dropping
  {
    id: 'new-seasons',
    name: 'New Seasons Dropping',
    tagline: 'Your favorites are back',
    filter: (s, _t) => modifiedWithinDays(s, 14),
    sort: (a, b) => parseInt(b.last_modified || '0', 10) - parseInt(a.last_modified || '0', 10),
    limit: 25,
  },

  // 4. K-Drama Essentials — category-based
  {
    id: 'k-drama',
    name: 'K-Drama Essentials',
    tagline: 'Korean storytelling at its finest',
    filter: (_s, _t) => false, // category-based
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['267', '658', '713', '715'],
  },

  // 5. Turkish Hits — category-based
  {
    id: 'turkish-hits',
    name: 'Turkish Hits',
    tagline: 'Epic love, epic drama',
    filter: (_s, _t) => false, // category-based
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['99'],
  },

  // 6. Comedy Central
  {
    id: 'comedy-central',
    name: 'Comedy Central',
    tagline: 'Guaranteed laughs',
    filter: (_s, t) => t !== null && t.r >= 6.5 && hasGenre(t, G.COMEDY, G.ANIMATION),
    sort: byRatingDesc,
    limit: 20,
  },

  // 7. Crime Files
  {
    id: 'crime-files',
    name: 'Crime Files',
    tagline: 'Who did it? Keep watching to find out',
    filter: (_s, t) => t !== null && t.r >= 7.0 && hasGenre(t, G.CRIME, G.MYSTERY, G.THRILLER),
    sort: byRatingDesc,
    limit: 20,
  },

  // 8. Docuseries
  {
    id: 'docuseries',
    name: 'Docuseries',
    tagline: 'Real stories, multiple episodes',
    filter: (_s, t) => hasGenre(t, G.DOCUMENTARY),
    sort: byRatingDesc,
    limit: 20,
  },

  // 9. Reality & Competition
  {
    id: 'reality-competition',
    name: 'Reality & Competition',
    tagline: 'Drama you can\'t script',
    filter: (_s, t) => hasGenre(t, G.REALITY),
    sort: byRatingDesc,
    limit: 20,
  },

  // 10. Family Watch
  {
    id: 'family-watch',
    name: 'Family Watch',
    tagline: 'Safe for the whole crew',
    filter: (_s, t) => t !== null && t.r >= 5.5 && hasGenre(t, G.FAMILY, G.KIDS, G.ANIMATION),
    sort: byRatingDesc,
    limit: 20,
  },

  // 11. Critically Acclaimed TV
  {
    id: 'critically-acclaimed',
    name: 'Critically Acclaimed TV',
    tagline: 'Television at its peak',
    filter: (_s, t) => t !== null && t.r >= 8.5,
    sort: byRatingDesc,
    limit: 15,
  },

  // 12. Binge in a Weekend
  {
    id: 'binge-weekend',
    name: 'Binge in a Weekend',
    tagline: 'Start Friday, finish Sunday',
    filter: (_s, t) => t !== null && t.r >= 7.0 && hasGenre(t, G.DRAMA, G.THRILLER, G.CRIME),
    sort: byRatingDesc,
    limit: 20,
  },

  // 13. Light & Easy
  {
    id: 'light-easy',
    name: 'Light & Easy',
    tagline: 'Zero stress, all laughs',
    filter: (_s, t) =>
      t !== null && t.r >= 6.0 &&
      hasGenre(t, G.COMEDY, G.ANIMATION) &&
      !hasGenre(t, G.CRIME, G.THRILLER),
    sort: byRatingDesc,
    limit: 25,
  },

  // 14. International Hits — category-based (Turkish + Korean)
  {
    id: 'international-hits',
    name: 'International Hits',
    tagline: 'Beyond borders',
    filter: (_s, _t) => false,
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['99', '267', '658', '713', '715'],
  },

  // 15. Netflix Originals — category-based
  {
    id: 'netflix-originals',
    name: 'Netflix Originals',
    tagline: 'The shows that changed streaming',
    filter: (_s, _t) => false,
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['106', '171'],
    parentTabs: ['platforms'],
  },

  // 16. HBO Must-Watch — category-based
  {
    id: 'hbo-must-watch',
    name: 'HBO Must-Watch',
    tagline: 'Premium television, no compromises',
    filter: (_s, _t) => false,
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['188'],
    parentTabs: ['platforms'],
  },

  // 17. True Crime
  {
    id: 'true-crime',
    name: 'True Crime',
    tagline: 'Based on real events',
    filter: (_s, t) =>
      t !== null && t.r >= 6.5 &&
      (hasGenre(t, G.CRIME, G.MYSTERY) && hasGenre(t, G.DOCUMENTARY)),
    sort: byRatingDesc,
    limit: 20,
  },

  // 18. Anime & Animation
  {
    id: 'anime-animation',
    name: 'Anime & Animation',
    tagline: 'Worlds without limits',
    filter: (_s, t) => hasGenre(t, G.ANIMATION),
    sort: byRatingDesc,
    limit: 25,
  },

  // 19. Sci-Fi Universes
  {
    id: 'scifi-universes',
    name: 'Sci-Fi Universes',
    tagline: 'Other worlds, other rules',
    filter: (_s, t) => t !== null && t.r >= 6.5 && hasGenre(t, G.SCIFI_FANTASY),
    sort: byRatingDesc,
    limit: 20,
  },

  // 20. Period Drama
  {
    id: 'period-drama',
    name: 'Period Drama',
    tagline: 'Step back in time',
    filter: (_s, t) =>
      t !== null && t.r >= 7.0 &&
      hasGenre(t, G.DRAMA) &&
      hasGenre(t, 10768), // War & Politics
    sort: byRatingDesc,
    limit: 20,
  },

  // 21. Hindi TV Hits — category-based
  {
    id: 'hindi-tv-hits',
    name: 'Hindi TV Hits',
    tagline: 'Desi entertainment',
    filter: (_s, _t) => false,
    sort: byRatingDesc,
    limit: 25,
    categoryIds: ['161'],
  },

  // 22. Fresh Episodes
  {
    id: 'fresh-episodes',
    name: 'Fresh Episodes',
    tagline: 'New episodes just dropped',
    filter: (s, _t) => modifiedWithinDays(s, 7),
    sort: (a, b) => parseInt(b.last_modified || '0', 10) - parseInt(a.last_modified || '0', 10),
    limit: 20,
  },
];

// ── Parent Tabs ─────────────────────────────────────────────────────

export const SERIES_TABS: SeriesParentTab[] = [
  {
    id: 'platforms',
    name: 'Platform Originals',
    subtabs: [
      { id: 'plt-netflix', name: 'Netflix', categoryIds: ['106', '171'] },
      { id: 'plt-prime', name: 'Prime', categoryIds: ['108'] },
      { id: 'plt-hbo', name: 'HBO Max', categoryIds: ['188'] },
      { id: 'plt-disney', name: 'Disney+', categoryIds: ['654', '102'] },
      { id: 'plt-apple', name: 'Apple TV+', categoryIds: ['114'] },
      { id: 'plt-hulu', name: 'Hulu', categoryIds: ['209'] },
      { id: 'plt-bbc', name: 'BBC', categoryIds: ['202', '648', '655', '674', '587'] },
      { id: 'plt-paramount', name: 'Paramount+', categoryIds: ['249'] },
      { id: 'plt-starz', name: 'Starz', categoryIds: ['110'] },
      { id: 'plt-peacock', name: 'Peacock', categoryIds: ['296'] },
      { id: 'plt-showtime', name: 'Showtime', categoryIds: ['235'] },
      { id: 'plt-amc', name: 'AMC+', categoryIds: ['312'] },
      { id: 'plt-stan', name: 'Stan', categoryIds: ['319'] },
      { id: 'plt-crave', name: 'Crave', categoryIds: ['662'] },
      { id: 'plt-britbox', name: 'BritBox', categoryIds: ['303'] },
      { id: 'plt-acorn', name: 'Acorn TV', categoryIds: ['306'] },
    ],
    searchCategoryIds: ['106', '171', '108', '188', '654', '102', '114', '209', '202', '249', '110', '296', '235'],
  },
  {
    id: 'turkish',
    name: 'Turkish',
    subtabs: [
      { id: 'tr-all', name: 'All Turkish', categoryIds: ['99'] },
    ],
    searchCategoryIds: ['99'],
  },
  {
    id: 'korean',
    name: 'Korean',
    subtabs: [
      { id: 'kr-multi', name: 'Multi Language', categoryIds: ['267'] },
      { id: 'kr-jtbc', name: 'JTBC', categoryIds: ['658'] },
      { id: 'kr-tving', name: 'TVING', categoryIds: ['713'] },
      { id: 'kr-tvn', name: 'tvN', categoryIds: ['715'] },
    ],
    searchCategoryIds: ['267', '658', '713', '715'],
  },
  {
    id: 'browse',
    name: 'Browse All',
    subtabs: [
      { id: 'br-crime', name: 'Crime & Thriller', categoryIds: ['241'] },
      { id: 'br-reality', name: 'Reality TV', categoryIds: ['294', '276'] },
      { id: 'br-hindi', name: 'Hindi TV', categoryIds: ['161'] },
      { id: 'br-tamil', name: 'Tamil TV', categoryIds: ['163'] },
      { id: 'br-kids', name: 'Kids', categoryIds: ['214'] },
      { id: 'br-islamic', name: 'Islamic', categoryIds: ['144'] },
      { id: 'br-pakistani', name: 'Pakistani', categoryIds: ['293', '463', '464', '465', '466', '467', '468', '501', '502', '503', '504', '505', '506'] },
      { id: 'br-australian', name: 'Australian', categoryIds: ['369'] },
      { id: 'br-sports', name: 'Sports', categoryIds: ['518', '719', '642', '647'] },
      { id: 'br-music', name: 'Music', categoryIds: ['238'] },
      { id: 'br-docs', name: 'Documentaries', categoryIds: ['327', '256', '584', '695'] },
      { id: 'br-indian-ott', name: 'Indian OTT', categoryIds: ['105', '111', '113', '118', '103', '104', '426', '310', '469', '470', '471'] },
      { id: 'br-fx', name: 'FX', categoryIds: ['334'] },
      { id: 'br-nbc', name: 'NBC', categoryIds: ['225'] },
      { id: 'br-cbs', name: 'CBS', categoryIds: ['311'] },
      { id: 'br-cw', name: 'The CW', categoryIds: ['308'] },
      { id: 'br-abc', name: 'ABC US', categoryIds: ['199'] },
      { id: 'br-fox', name: 'FOX', categoryIds: ['206'] },
      { id: 'br-channel4', name: 'Channel 4', categoryIds: ['298'] },
      { id: 'br-itv', name: 'ITV', categoryIds: ['299', '656', '475'] },
    ],
    searchCategoryIds: ['241', '161', '163', '293', '369', '334', '225', '311', '308', '199', '206', '298', '299'],
  },
];
