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
