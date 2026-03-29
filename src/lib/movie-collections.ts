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
