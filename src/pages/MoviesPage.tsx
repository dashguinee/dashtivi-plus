import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Download, Search, X, SlidersHorizontal, Play, Plus, Star, Sparkles } from 'lucide-react';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import { getVodStreams, buildVodUrl, getTmdbMap, getVodByCategory, vodDbToStream, searchVod, buildLiveUrl } from '@/lib/xtream';
import { getCatalog, getCatalogSync, type Catalog, type CatalogChannel } from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { tap } from '@/lib/haptics';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { TMDB_GENRES } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { VeeCollectionRow } from '@/components/ui/VeeCollectionRow';
import { MoviesTrailerSpace } from '@/components/home/MoviesTrailerSpace';
import { FloatingMoviesShowcase } from '@/components/home/FloatingMoviesShowcase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { RowCountBadge } from '@/components/ui/NeonGate';
import { MOVIE_TABS, GENRE_FILTERS, SORT_MODES, type SortMode } from '@/lib/movie-collections';
import { MOMENT_PACKS } from '@/lib/moment-packs';
import { t, useLanguage } from '@/i18n';
import { useSmartSticky } from '@/hooks/useSmartSticky';
import { useWatchHistory, isInProgress, resumePosition } from '@/hooks/useWatchHistory';
import { useLikes } from '@/lib/likes';
import { getItem } from '@/lib/storage';
import {
  buildAffinity, isColdStart,
  recommendFor, becauseYouWatched, trendingNow, genreCollections, moodRows,
  hiddenGems, dashCurated, fromFavorites, searchRerank, heroResolver,
  type RankedRow, type RecSignals, type HeroPick,
} from '@/lib/recommendations';
import type { TranslationKey } from '@/i18n';
import type { Channel, WatchHistoryEntry } from '@/types';

// ── Static maps ──────────────────────────────────────────────────

const SORT_NAME_MAP: Record<string, TranslationKey> = {
  'Smart': 'sortSmart', 'Top Rated': 'sortTopRated', 'Newest': 'sortNewest', 'A-Z': 'sortAZ',
};

const GENRE_NAME_MAP: Record<string, TranslationKey> = {
  'All': 'genreAll', 'Action': 'genreAction', 'Comedy': 'genreComedy',
  'Thriller': 'genreThriller', 'Drama': 'genreDrama', 'Sci-Fi': 'genreSciFi',
  'Horror': 'genreHorror', 'Romance': 'genreRomance', 'Adventure': 'genreAdventure',
  'Animation': 'genreAnimation', 'Documentary': 'genreDocumentary', 'Crime': 'genreCrime',
  'Mystery': 'genreMystery', 'Family': 'genreFamily', 'Fantasy': 'genreFantasy',
  'War': 'genreWar', 'Reality': 'genreReality', 'Western': 'genreWestern',
};

const TAB_NAME_MAP: Record<string, TranslationKey> = {
  'New & Hot': 'tabNewHot', 'Hollywood': 'tabHollywood',
  'Bollywood': 'tabBollywood', 'International': 'tabInternational',
};

// ── Warm-luxury palette ──────────────────────────────────────────
// Candle-warm cinema lounge, NOT Netflix-cold-black. Molten gold/amber accent used
// sparingly; African spotlight gets a terracotta/clay underglow that feels "home".
const GOLD = '#E8B04B';
const GOLD_DEEP = '#C8862F';
const TERRACOTTA = '#C9763B';

// Per-pack mood glow (kept from the prior mood language) → used as the row accent so the
// glow still whispers context in the row dot, never tints the cards themselves.
const MOMENT_MOOD: Record<string, string> = {
  'before-sleep': '#6366F1', 'late-night': '#7C3AED', 'quick-lunch': '#D97706',
  'everyone-watching': '#9D4EDD', 'in-your-feelings': '#C084FC', 'family-time': '#F59E0B',
  'adrenaline': '#EF4444', 'mind-benders': '#8B5CF6',
};
const moodColor = (id: string) => MOMENT_MOOD[id] || '#9D4EDD';

// French editorial flavour for the auto genre rows (title stays the genre, this is the
// human-warm subtitle that signals "curated", not "computed").
const GENRE_TAGLINES: Record<number, string> = {
  28: 'Action qui cogne', 35: 'De quoi rire un bon coup', 53: 'Tension à couper le souffle',
  18: 'Des histoires qui marquent', 878: 'Voyages au-delà du réel', 27: 'Frissons garantis',
  10749: 'Pour les grands romantiques', 12: 'Grandes aventures', 16: "L'animation a son public",
  80: 'Le crime ne paie pas', 9648: 'À résoudre vous-même', 14: 'Pure fantaisie',
  10751: 'Pour toute la famille', 36: "L'Histoire en grand", 10752: 'Au cœur du combat',
};

// African / Nollywood VOD category (the brand row — Afrikaans/African/Nollywood bucket).
const AFRICAN_CATEGORY_ID = '580';

function parseYear(name: string): number {
  const m = name.match(/\((\d{4})\)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Warm accent per ladder row, by driver/identity. Top-10 rows ignore this (stay red). */
function rowAccent(row: RankedRow): string {
  if (row.id === 'african-spotlight') return TERRACOTTA;
  if (row.id.startsWith('mood-')) return moodColor(row.id.slice(5));
  switch (row.driver) {
    case 'dash-curated':
    case 'gem-of-the-day': return GOLD;
    case 'for-you': return '#E0A94A';
    case 'genre': return '#D9A441';
    case 'because-you-watched':
    case 'from-favorites': return '#C98F4A';
    default: return '#9D4EDD';
  }
}

/** Editorial rows wear the warm display face + heavier title (curated-by-humans). */
function isEditorialRow(row: RankedRow): boolean {
  return (
    row.id === 'african-spotlight' ||
    row.driver === 'dash-curated' ||
    row.driver === 'gem-of-the-day' ||
    row.driver === 'because-you-watched'
  );
}

// ── Component ────────────────────────────────────────────────────

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const MoviesPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();
  const { stickyClass, stickyStyle } = useSmartSticky();

  // Tab state
  const [activeParent, setActiveParent] = useState(MOVIE_TABS[0].id);
  const [activeSubtab, setActiveSubtab] = useState(MOVIE_TABS[0].subtabs[0].id);
  const [activeGenre, setActiveGenre] = useState(0); // 0 = All
  const [sortMode, setSortMode] = useState<SortMode>('smart');

  // Pagination — progressive loading to prevent DOM explosion on large categories
  const PAGE_SIZE = 50;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const subtabScrollRef = useRef<HTMLDivElement>(null);
  const genreScrollRef = useRef<HTMLDivElement>(null);

  // Data
  const [movies, setMovies] = useState<VodStream[]>([]);
  const [gemSet, setGemSet] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [moviesError, setMoviesError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // African / Nollywood spotlight pool — fetched once, independent of the active subtab,
  // so "La Maison du Cinéma Africain" stays pinned in the top third on every tab.
  const [africanPool, setAfricanPool] = useState<VodStream[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VodStream[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detail + TMDB
  const [detailMovie, setDetailMovie] = useState<VodStream | null>(null);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [catalog, setCatalog] = useState<Catalog | null>(getCatalogSync());

  // ── Personalization signals (reactive) ───────────────────────
  // Likes + watch history drive the affinity model; a heart toggle anywhere re-ranks the
  // whole ladder live (that instant feedback IS the "alive" feeling). Recent opens are the
  // ×1 seed. recentSeries/downloads are read once (non-reactive — fine for the movie page).
  const likes = useLikes();
  const { history } = useWatchHistory();
  const [recent, setRecent] = useState<VodStream[]>(() => {
    try { return JSON.parse(localStorage.getItem('tivi_recent_movies') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    if (!detailMovie) return;
    setRecent(prev => {
      const next = [detailMovie, ...prev.filter(m => m.stream_id !== detailMovie.stream_id)].slice(0, 14);
      try { localStorage.setItem('tivi_recent_movies', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [detailMovie]);

  const signals: RecSignals = useMemo(() => ({
    history,
    likes,
    recentMovies: recent,
    recentSeries: getItem('recent_series', []),
    downloads: getItem('downloads', []),
  }), [history, likes, recent]);

  // ── Derived ──────────────────────────────────────────────────

  const currentParent = useMemo(() =>
    MOVIE_TABS.find(t => t.id === activeParent) || MOVIE_TABS[0], [activeParent]);

  const currentSubtab = useMemo(() =>
    currentParent.subtabs.find(s => s.id === activeSubtab) || currentParent.subtabs[0],
    [currentParent, activeSubtab]);

  const isSearching = debouncedQuery.trim().length > 0;
  const hasTmdb = Object.keys(tmdbMap).length > 0;

  // Affinity model — rebuilt when the catalog map or any signal changes.
  const affinity = useMemo(() => buildAffinity(tmdbMap, signals), [tmdbMap, signals]);
  const cold = isColdStart(affinity);

  // Translated mood-pack labels (UI owns i18n; the rec lib stays language-agnostic).
  const packLabels = useMemo(() => {
    const m: Record<string, { name: string; tagline: string }> = {};
    for (const p of MOMENT_PACKS) {
      m[p.id] = { name: t(lang, p.nameKey as TranslationKey), tagline: t(lang, p.descKey as TranslationKey) };
    }
    return m;
  }, [lang]);

  // ── Effects ──────────────────────────────────────────────────

  useEffect(() => { getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP)); }, []);

  useEffect(() => {
    if (catalog) return;
    let mounted = true;
    getCatalog().then(c => { if (mounted) setCatalog(c); }).catch(() => { /* bonus */ });
    return () => { mounted = false; };
  }, [catalog]);

  // African spotlight pool — one fetch, silent on failure (the row just won't render).
  useEffect(() => {
    let mounted = true;
    getVodByCategory(AFRICAN_CATEGORY_ID, 200).then(rows => {
      if (!mounted) return;
      const seen = new Set<number>();
      const out: VodStream[] = [];
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push(vodDbToStream(r));
      }
      setAfricanPool(out);
    }).catch(() => { /* spotlight is a bonus */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { setDisplayLimit(PAGE_SIZE); }, [activeParent, activeSubtab, activeGenre]);

  useEffect(() => {
    const parent = MOVIE_TABS.find(t => t.id === activeParent);
    if (parent) {
      setActiveSubtab(parent.subtabs[0].id);
      setActiveGenre(0);
      setSortMode('smart');
      subtabScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
      genreScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeParent]);

  // Fetch movies for subtab — Supabase-first (captures is_gem), Xtream fallback.
  useEffect(() => {
    let mounted = true;
    const catIds = currentSubtab.categoryIds;
    if (!catIds.length) { setMovies([]); setGemSet(new Set()); setLoading(false); return; }

    async function load() {
      setLoading(true);
      setMoviesError(false);
      try {
        const sbResults = await Promise.allSettled(catIds.map(id => getVodByCategory(id)));
        const sbMerged: VodStream[] = [];
        const gems = new Set<number>();
        const seen = new Set<number>();
        for (const r of sbResults) {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            for (const m of r.value) {
              if (seen.has(m.id)) continue;
              seen.add(m.id);
              sbMerged.push(vodDbToStream(m));
              if (m.gem) gems.add(m.id);
            }
          }
        }
        if (sbMerged.length > 0) {
          if (mounted) { setMovies(sbMerged); setGemSet(gems); }
        } else {
          // Fallback to Xtream API (no is_gem signal — dashCurated will rating-cut).
          if (mounted) setGemSet(new Set());
          if (catIds.length === 1) {
            const result = await getVodStreams(credentials, catIds[0]);
            if (mounted) setMovies(result);
          } else {
            const results = await Promise.allSettled(catIds.map(id => getVodStreams(credentials, id)));
            if (!mounted) return;
            const merged: VodStream[] = [];
            for (const r of results) {
              if (r.status === 'fulfilled') {
                for (const m of r.value) {
                  if (!seen.has(m.stream_id)) { seen.add(m.stream_id); merged.push(m); }
                }
              }
            }
            setMovies(merged);
          }
        }
      } catch {
        if (mounted) { setMovies([]); setGemSet(new Set()); setMoviesError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials, currentSubtab, retryKey]);

  // Search (unchanged plumbing — owner boundary; the ladder layer only adds a context strip)
  useEffect(() => {
    if (!debouncedQuery.trim()) { setSearchResults([]); return; }
    let mounted = true;
    const q = debouncedQuery.toLowerCase();
    const LIMIT = 50;

    async function search() {
      setSearchLoading(true);
      setSearchTruncated(false);
      try {
        if (q.length < 3) {
          const filtered = movies.filter(m => m.name.toLowerCase().includes(q));
          if (mounted) { setSearchResults(filtered.slice(0, LIMIT)); setSearchTruncated(filtered.length > LIMIT); }
        } else {
          const catIds = currentSubtab.categoryIds;
          const sbResults = await searchVod(q, LIMIT, catIds.length > 0 ? catIds : undefined);
          if (sbResults.length > 0) {
            if (mounted) { setSearchResults(sbResults.map(vodDbToStream).slice(0, LIMIT)); setSearchTruncated(sbResults.length >= LIMIT); }
            if (mounted) setSearchLoading(false);
            return;
          }
          const results = await Promise.allSettled(
            currentParent.searchCategoryIds.map(id => getVodStreams(credentials, id).catch(() => [] as VodStream[]))
          );
          const seen = new Set<number>();
          const unique: VodStream[] = [];
          for (const r of results) {
            if (r.status === 'fulfilled') {
              for (const m of r.value) { if (!seen.has(m.stream_id)) { seen.add(m.stream_id); unique.push(m); } }
            }
          }
          const filtered = unique.filter(m => m.name.toLowerCase().includes(q));
          if (mounted) { setSearchResults(filtered.slice(0, LIMIT)); setSearchTruncated(filtered.length > LIMIT); }
        }
      } catch { if (mounted) setSearchResults([]); }
      finally { if (mounted) setSearchLoading(false); }
    }
    search();
    return () => { mounted = false; };
  }, [debouncedQuery, credentials, movies, currentParent, currentSubtab]);

  // ── Genre filter + Sort (the deep-browse floor) ──────────────

  const filteredAndSorted = useMemo(() => {
    const source = isSearching ? searchResults : movies;
    let filtered = source;
    if (activeGenre !== 0 && hasTmdb) {
      filtered = source.filter(m => tmdbMap[`m:${m.stream_id}`]?.g?.includes(activeGenre));
    }
    if (!hasTmdb || sortMode === 'name') {
      if (sortMode === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      return filtered;
    }
    if (sortMode === 'rating') {
      return [...filtered].sort((a, b) => (tmdbMap[`m:${b.stream_id}`]?.r || 0) - (tmdbMap[`m:${a.stream_id}`]?.r || 0));
    }
    if (sortMode === 'newest') {
      return [...filtered].sort((a, b) => parseYear(b.name) - parseYear(a.name));
    }
    // smart: trend-ranked
    const scoreMap = new Map<number, number>();
    for (const m of filtered) {
      const e = tmdbMap[`m:${m.stream_id}`];
      scoreMap.set(m.stream_id, e ? (e.r ?? 0) / 10 + (parseYear(m.name) >= 2024 ? 0.3 : 0) : 0);
    }
    return [...filtered].sort((a, b) => (scoreMap.get(b.stream_id) || 0) - (scoreMap.get(a.stream_id) || 0));
  }, [movies, searchResults, isSearching, activeGenre, sortMode, tmdbMap, hasTmdb]);

  const genreCounts = useMemo(() => {
    if (!hasTmdb) return {};
    const source = isSearching ? searchResults : movies;
    const counts: Record<number, number> = {};
    for (const m of source) {
      const tmdb = tmdbMap[`m:${m.stream_id}`];
      if (tmdb?.g) for (const g of tmdb.g) counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [movies, searchResults, isSearching, tmdbMap, hasTmdb]);

  const activeGenreFilters = useMemo(() =>
    GENRE_FILTERS.filter(g => g.id === 0 || (genreCounts[g.id] || 0) > 0), [genreCounts]);

  // ── Lookup: resolve a clicked rec-row id back to its VodStream ──
  const movieById = useMemo(() => {
    const m = new Map<number, VodStream>();
    for (const v of movies) m.set(v.stream_id, v);
    for (const v of africanPool) if (!m.has(v.stream_id)) m.set(v.stream_id, v);
    for (const v of searchResults) if (!m.has(v.stream_id)) m.set(v.stream_id, v);
    return m;
  }, [movies, africanPool, searchResults]);

  const openDetail = useCallback((id: number) => {
    const mv = movieById.get(id);
    if (mv) setDetailMovie(mv);
  }, [movieById]);

  // ── The recommendation ladder — intent-on-top, breadth-below ──
  // Every row names its driver in recommendations.ts and self-suppresses below 4 items, so
  // we never render an empty row. African/Nollywood is pinned in the top third either way.
  const ladder = useMemo<RankedRow[]>(() => {
    if (!hasTmdb || movies.length === 0) return [];

    const because = becauseYouWatched(movies, 'movie', tmdbMap, affinity, { maxRows: 2 }, signals);
    const pourVous = recommendFor(movies, 'movie', tmdbMap, affinity, {}, signals);
    const trending = trendingNow(movies, 'movie', tmdbMap, { isTop10: true });

    // African spotlight: trend-ranked over the dedicated 580 pool, re-labelled as the brand row.
    let african: RankedRow | null = null;
    if (africanPool.length > 0) {
      const r = trendingNow(africanPool, 'movie', tmdbMap, { limit: 24 });
      if (r) african = { ...r, id: 'african-spotlight', name: 'La Maison du Cinéma Africain', tagline: 'Nollywood, francophone, afro — la maison de la culture', driver: 'genre' };
    }

    const moods = moodRows(movies, 'movie', tmdbMap, affinity, { maxRows: 3, packLabels });
    const genres = genreCollections(movies, 'movie', tmdbMap, affinity, {
      genreLabels: TMDB_GENRES, taglines: GENRE_TAGLINES, maxRows: 3,
    });
    const pepites = dashCurated(movies, 'movie', tmdbMap, { gemSet: gemSet.size ? gemSet : undefined });
    const gem = hiddenGems(movies, 'movie', tmdbMap, { salt: 'movie' });
    const favs = fromFavorites(movies, 'movie', tmdbMap, {}, signals);

    const rows: RankedRow[] = [];
    if (cold) {
      // Cold start: no personal rows — open on the brand + breadth so the page is never bare.
      for (const r of [african, trending, pepites, ...moods, ...genres, gem]) if (r) rows.push(r);
    } else {
      // Warmed up: recency of intent on top, breadth below, African pinned in the top third.
      for (const r of [...because, pourVous, trending, african, favs, ...moods, ...genres, pepites, gem]) {
        if (r) rows.push(r);
      }
    }
    // De-dup row ids (a seed title could collide) — keep first.
    const seen = new Set<string>();
    return rows.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }, [movies, africanPool, tmdbMap, affinity, signals, gemSet, packLabels, cold, hasTmdb]);

  // ── Genre-active context rows (design §4 — context is never fully lost) ──
  const genreContextRows = useMemo<RankedRow[]>(() => {
    if (activeGenre === 0 || !hasTmdb || isSearching) return [];
    const pool = movies.filter(m => tmdbMap[`m:${m.stream_id}`]?.g?.includes(activeGenre));
    if (pool.length < 4) return [];
    const label = genreLabel(activeGenre, lang);
    const out: RankedRow[] = [];
    const tr = trendingNow(pool, 'movie', tmdbMap, { limit: 18 });
    if (tr) out.push({ ...tr, id: `genre-ctx-trending`, name: `${t(lang, 'trendingNow')} · ${label}`, tagline: '' });
    const gem = dashCurated(pool, 'movie', tmdbMap, { gemSet: gemSet.size ? gemSet : undefined });
    if (gem) out.push({ ...gem, id: `genre-ctx-gem`, name: `Pépites · ${label}`, tagline: '' });
    return out;
  }, [activeGenre, movies, tmdbMap, gemSet, hasTmdb, isSearching, lang]);

  // ── Search context strip (design §4) ──
  const searchContextRow = useMemo<RankedRow | null>(() => {
    if (!isSearching || !hasTmdb || searchResults.length < 4) return null;
    return searchRerank(searchResults, 'movie', tmdbMap, affinity, { limit: 18 });
  }, [isSearching, hasTmdb, searchResults, tmdbMap, affinity]);

  // ── Continue Watching (row 0) — in-progress movies/series, resume on tap ──
  const keepWatching = useMemo<WatchHistoryEntry[]>(
    () => history.filter(e => isInProgress(e) && !!e.url).slice(0, 14),
    [history]);

  // ── Hero resolver (3-tier: resume → affinity → editorial) ──
  const heroPick = useMemo<HeroPick | null>(() => {
    if (!hasTmdb || movies.length === 0) return null;
    return heroResolver(movies, 'movie', tmdbMap, affinity, { candidateCount: 3 }, signals);
  }, [movies, tmdbMap, affinity, signals, hasTmdb]);

  // Soft 8s rotation among the firing tier's candidates (resume tier has one → no rotation).
  const [heroIdx, setHeroIdx] = useState(0);
  const heroKey = heroPick ? `${heroPick.tier}:${(heroPick.item as VodStream).stream_id}` : '';
  useEffect(() => { setHeroIdx(0); }, [heroKey]);
  useEffect(() => {
    const n = heroPick?.candidates.length ?? 0;
    if (n <= 1) return;
    const iv = setInterval(() => setHeroIdx(i => (i + 1) % n), 8000);
    return () => clearInterval(iv);
  }, [heroPick]);

  // kind is 'movie' here, so every candidate is a VodStream.
  const heroItem = heroPick ? (heroPick.candidates[heroIdx % heroPick.candidates.length] as VodStream) : null;
  const heroEntry = heroItem ? tmdbMap[`m:${heroItem.stream_id}`] : null;

  const resumePct = useMemo(() => {
    if (heroPick?.tier !== 'resume' || !heroItem) return 0;
    const e = history.find(h => h.channelId === `vod-${heroItem.stream_id}` || h.channelId === `movie-${heroItem.stream_id}`);
    if (!e || !e.totalDuration) return 0;
    return Math.min(100, Math.max(2, ((e.currentTime ?? 0) / e.totalDuration) * 100));
  }, [heroPick, heroItem, history]);

  // ── Live cinema (unchanged) ──
  const liveCinema = useMemo<CatalogChannel[]>(() =>
    catalog ? (catalog.byExperience['Movies'] || []) : [], [catalog]);

  const playLiveCinema = useCallback((ch: CatalogChannel) => {
    if (liveCinema.length > 1) {
      setPlaylist(liveCinema.map((c) => ({
        id: `live-${c.stream_id}`, name: c.name.replace(/\s+/g, ' ').trim(),
        url: buildLiveUrl(credentials, c.stream_id), logo: c.icon, category: 'live' as const,
      })));
    }
    const channel: Channel = {
      id: `live-${ch.stream_id}`, name: ch.name.replace(/\s+/g, ' ').trim(),
      url: buildLiveUrl(credentials, ch.stream_id), logo: ch.icon, category: 'live',
    };
    setCurrentChannel(channel.id);
    onPlay(channel);
  }, [liveCinema, credentials, onPlay]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleParentChange = useCallback((id: string) => {
    tap();
    setActiveParent(id);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  // Resume a Continue-Watching / hero-resume title — the player reads the same watch
  // history (getResume on channelId) and seeks automatically, so we just hand it the channel.
  const playResume = useCallback((e: WatchHistoryEntry) => {
    onPlay({ id: e.channelId, name: e.name || '', url: e.url || '', logo: e.logo, category: e.category, knownDuration: e.totalDuration });
  }, [onPlay]);

  const playHeroResume = useCallback(() => {
    if (!heroItem) return;
    const url = buildVodUrl(credentials, heroItem.stream_id, heroItem.container_extension || 'mp4');
    onPlay({ id: `vod-${heroItem.stream_id}`, name: heroItem.name, url, logo: heroItem.stream_icon, category: 'movie' });
  }, [heroItem, credentials, onPlay]);

  const displayLoading = isSearching ? searchLoading : loading;

  // Hero copy per tier
  const heroBadge = heroPick?.tier === 'resume'
    ? (lang === 'fr' ? 'Reprendre' : 'Resume')
    : heroPick?.tier === 'affinity'
      ? (lang === 'fr' ? 'Choisi pour vous' : 'Picked for you')
      : (lang === 'fr' ? "À l'affiche" : 'Now showing');

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="pb-32" style={{ paddingTop: 'max(4rem, calc(3.5rem + env(safe-area-inset-top, 0px)))' }}>
      {!isSearching && (
        <FloatingMoviesShowcase
          credentials={credentials}
          movies={movies}
          tmdbMap={tmdbMap}
          onPlay={onPlay}
        />
      )}

      {/* ── Hero Billboard — dynamic 3-tier resolver (resume → affinity → editorial) ── */}
      {heroItem && heroEntry?.p ? (
        <div className="relative overflow-hidden" style={{ height: 'clamp(170px, 36vh, 300px)' }}>
          {/* Backdrop — candle-warm cross-dissolve on rotation */}
          <div
            key={heroItem.stream_id}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/w1280${heroEntry.p})`,
              transform: 'scale(1.05)',
              animation: 'vee-card-in 1.4s cubic-bezier(0.16,1,0.3,1) both',
            }}
          />
          {/* Warm vignette — brown-black, left-to-dark so the title floats on warmth */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #161210 2%, rgba(22,18,16,0.55) 38%, transparent 78%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(22,18,16,0.82) 0%, rgba(22,18,16,0.25) 42%, transparent 70%)' }} />
          {/* Content — bottom left */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
            <span className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
              style={{ background: `${GOLD}1f`, color: GOLD, border: `1px solid ${GOLD}33` }}>
              {heroPick?.tier !== 'resume' && <Sparkles className="w-3 h-3" />}
              {heroBadge}
            </span>
            <h1 className="text-[24px] md:text-[32px] font-black text-white tracking-tight leading-tight line-clamp-2 mb-2"
              style={{ fontFamily: "'Outfit', sans-serif", textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>
              {heroItem.name.replace(/\s*\(\d{4}\)\s*$/, '')}
            </h1>

            {/* Gold hairline — doubles as the resume progress bar on the resume tier */}
            <div className="h-[2px] rounded-full mb-3 overflow-hidden" style={{ width: heroPick?.tier === 'resume' ? '180px' : '56px', background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{
                width: heroPick?.tier === 'resume' ? `${resumePct}%` : '100%',
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DEEP})`,
                boxShadow: `0 0 8px ${GOLD}66`,
              }} />
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {(heroEntry.r ?? 0) > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
                  style={{ background: `${GOLD}26`, color: GOLD }}>
                  <Star className="w-3 h-3" style={{ fill: GOLD }} />
                  {heroEntry.r!.toFixed(1)}
                </span>
              )}
              {(() => { const ym = heroItem.name.match(/\((\d{4})\)/); return ym ? <span className="text-[11px] text-white/50 font-medium">{ym[1]}</span> : null; })()}
              {heroEntry.g?.slice(0, 3).map(gid => (
                <span key={gid} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/60 font-medium">
                  {TMDB_GENRES[gid] || ''}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { tap(); heroPick?.tier === 'resume' ? playHeroResume() : setDetailMovie(heroItem); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: '#1a130a', boxShadow: `0 6px 20px ${GOLD_DEEP}44` }}
              >
                <Play className="w-4 h-4" style={{ fill: '#1a130a' }} />
                {heroPick?.tier === 'resume' ? (lang === 'fr' ? 'Reprendre' : 'Resume') : (lang === 'fr' ? 'Lecture' : 'Play')}
              </button>
              <button
                onClick={() => { tap(); setDetailMovie(heroItem); }}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-16 pb-5 px-5">
          <h1 className="text-[22px] font-semibold text-white/85 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>Cinéma</h1>
          <div className="w-16 h-[2px] rounded-full mt-2" style={{ background: `linear-gradient(90deg, ${GOLD}88 0%, ${GOLD}26 60%, transparent 100%)` }} />
        </div>
      )}

      {/* ── Cinéma en direct (live cinema-TV channels) ── */}
      {!isSearching && liveCinema.length > 0 && (
        <section className="px-4 pt-5 pb-1 row-tier-standard">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
            <h2 className="text-[19px] font-black tracking-tight text-white">Cinéma en direct</h2>
            <span className="tivi-count-metal text-[8px] font-bold flex-shrink-0" style={{ letterSpacing: '0.5px' }}>
              {liveCinema.length}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {liveCinema.map((ch) => (
              <button
                key={ch.stream_id}
                onPointerDown={() => tap()}
                onClick={() => playLiveCinema(ch)}
                className="flex-shrink-0 group"
                style={{ width: 130 }}
              >
                <div
                  className="relative rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.04] group-active:scale-[0.95]"
                  style={{
                    width: 130, height: 96,
                    background: 'linear-gradient(157deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.012) 100%)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.045)',
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-2/3 pointer-events-none z-[1]"
                    style={{ background: `radial-gradient(ellipse 85% 100% at 32% 0%, ${GOLD}26, transparent 72%)` }} />
                  <ChannelIcon src={ch.icon} name={ch.name} size="md" />
                  <div className="absolute top-1.5 left-1.5 z-[2] flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 bg-red-400" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" style={{ boxShadow: '0 0 5px rgba(248,113,113,0.9)' }} />
                    </span>
                  </div>
                  <div className="absolute inset-0 z-[3] flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(0,0,0,0.42)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(6px)' }}>
                      <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
                <p className="text-[10.5px] leading-tight text-white/60 text-center mt-1.5 px-0.5 line-clamp-2 font-medium tracking-tight group-hover:text-white/90 transition-colors">
                  {ch.name.replace(/\s+/g, ' ').trim()}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Smart sticky header (search + tabs + genre pills) ── */}
      <div className={stickyClass} style={stickyStyle}>
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t(lang, 'searchMovies')}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-[border-color,background-color] duration-300"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-3 h-3 text-text-secondary" />
              </button>
            )}
          </div>
        </div>

        {!isSearching && (
          <>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {MOVIE_TABS.map(tab => (
                <button key={tab.id} onClick={() => handleParentChange(tab.id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-[color,background-color,border-color] duration-300 ${
                    activeParent === tab.id
                      ? 'text-[#1a130a]'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                  }`}
                  style={activeParent === tab.id ? { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, boxShadow: `0 4px 14px ${GOLD_DEEP}33` } : undefined}>
                  {TAB_NAME_MAP[tab.name] ? t(lang, TAB_NAME_MAP[tab.name]) : tab.name}
                </button>
              ))}
            </div>

            {currentParent.subtabs.length > 1 && (
              <div ref={subtabScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2 pt-0.5">
                {currentParent.subtabs.map(sub => (
                  <button key={sub.id} onClick={() => { setActiveSubtab(sub.id); setActiveGenre(0); }}
                    className={`flex-shrink-0 px-3 py-1 rounded-lg text-[12px] font-medium transition-[color,background-color] duration-300 ${
                      activeSubtab === sub.id
                        ? 'bg-white/10 text-white border border-white/15'
                        : 'text-white/30 hover:text-white/50'
                    }`}>
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            {!loading && movies.length > 0 && activeGenreFilters.length > 2 && (
              <div ref={genreScrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2.5 pt-0.5">
                {activeGenreFilters.map(g => (
                  <button key={g.id} onClick={() => setActiveGenre(g.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-lg text-[12px] font-medium transition-colors duration-300 ${
                      activeGenre === g.id ? '' : 'text-white/25 hover:text-white/45'
                    }`}
                    style={activeGenre === g.id ? { background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}40` } : undefined}>
                    {GENRE_NAME_MAP[g.name] ? t(lang, GENRE_NAME_MAP[g.name]) : g.name}
                    {g.id !== 0 && genreCounts[g.id] && (
                      <span className="text-[9px] opacity-50">{genreCounts[g.id]}</span>
                    )}
                  </button>
                ))}
                <div className="flex-shrink-0 ml-auto pl-2 border-l border-white/5">
                  <button onClick={() => {
                    const modes: SortMode[] = ['smart', 'rating', 'newest', 'name'];
                    setSortMode(modes[(modes.indexOf(sortMode) + 1) % modes.length]);
                  }}
                    className="flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-lg text-[12px] text-white/35 hover:text-white/60 transition-colors">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {(() => { const sm = SORT_MODES.find(s => s.id === sortMode); return sm && SORT_NAME_MAP[sm.name] ? t(lang, SORT_NAME_MAP[sm.name]) : sm?.name; })()}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isSearching && (
          <div className="px-4 pb-2">
            <p className="text-xs text-text-secondary">
              {searchLoading ? t(lang, 'searchingEllipsis') : searchTruncated ? t(lang, 'top50Results') : `${searchResults.length} ${t(lang, 'found')}`}
            </p>
          </div>
        )}
      </div>

      {/* ── SEARCH MODE — keep a curated context strip, then the result grid ── */}
      {isSearching && searchContextRow && (
        <div className="pt-4 pb-1 row-tier-featured">
          <VeeCollectionRow
            name={lang === 'fr' ? 'Pour cette recherche' : 'For this search'}
            tagline={searchContextRow.tagline}
            items={searchContextRow.items}
            tmdbMap={tmdbMap}
            cardWidth={116}
            accent={GOLD}
            countLabel={t(lang, 'moviesLabel')}
            onItemClick={openDetail}
          />
        </div>
      )}

      {/* ── BROWSE MODE — Continue Watching + the living ladder ── */}
      {!isSearching && !loading && activeGenre === 0 && (
        <>
          {/* Row 0 — Reprendre (Keep Watching) */}
          {keepWatching.length > 0 && (
            <section className="px-4 pt-6 pb-2 row-tier-hero">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD, boxShadow: `0 0 7px ${GOLD}` }} />
                <h2 className="text-[19px] font-black tracking-tight text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {lang === 'fr' ? 'Reprendre' : 'Keep Watching'}
                </h2>
                <RowCountBadge count={keepWatching.length} label={t(lang, 'moviesLabel')} />
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade pb-1">
                {keepWatching.map(e => {
                  const total = e.totalDuration ?? 0;
                  const pos = resumePosition(e);
                  const pct = total > 0 ? Math.min(100, Math.max(3, (pos / total) * 100)) : 0;
                  return (
                    <button key={e.channelId} onPointerDown={() => tap()} onClick={() => playResume(e)}
                      className="flex-shrink-0 group" style={{ width: 150 }}>
                      <div className="relative rounded-2xl overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.04] group-active:scale-[0.95]"
                        style={{ width: 150, height: 96, background: 'linear-gradient(157deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.012) 100%)', boxShadow: '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.045)' }}>
                        {e.logo && <img src={e.logo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" loading="lazy" />}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(22,18,16,0.88) 100%)' }} />
                        <div className="absolute inset-0 z-[3] flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
                          style={{ background: 'rgba(0,0,0,0.42)' }}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(6px)' }}>
                            <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                        {/* Gold resume progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.12)' }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DEEP})`, boxShadow: `0 0 6px ${GOLD}88` }} />
                        </div>
                      </div>
                      <p className="text-[10.5px] leading-tight text-white/60 text-center mt-1.5 px-0.5 line-clamp-2 font-medium tracking-tight group-hover:text-white/90 transition-colors">
                        {(e.name || '').replace(/\s*\(\d{4}\)\s*$/, '')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* The recommendation ladder — every row through VeeCollectionRow + PosterCard */}
          {ladder.length > 0 && (
            <div className="py-3">
              {ladder.map((row, i) => {
                const tierClass = i === 0 ? 'row-tier-hero' : i <= 2 ? 'row-tier-featured' : 'row-tier-standard';
                const cardWidth = i === 0 ? 140 : i <= 2 ? 120 : 108;
                const editorial = isEditorialRow(row);
                return (
                  <section key={row.id} className={`${tierClass} reveal mb-1`}
                    style={row.id === 'african-spotlight'
                      ? { background: `radial-gradient(120% 80% at 0% 0%, ${TERRACOTTA}10, transparent 60%)` }
                      : undefined}>
                    <VeeCollectionRow
                      name={row.name}
                      tagline={row.tagline}
                      items={row.isTop10 ? row.items.slice(0, 10) : row.items}
                      tmdbMap={tmdbMap}
                      isTop10={!!row.isTop10}
                      cardWidth={cardWidth}
                      navigateTo="/movies"
                      countLabel={t(lang, 'moviesLabel')}
                      accent={rowAccent(row)}
                      editorial={editorial}
                      onItemClick={openDetail}
                    />
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── GENRE-ACTIVE — context rows + filter indicator (context never fully lost) ── */}
      {!isSearching && activeGenre !== 0 && !loading && (
        <>
          {genreContextRows.length > 0 && (
            <div className="pt-4 pb-1">
              {genreContextRows.map((row, i) => (
                <section key={row.id} className={`${i === 0 ? 'row-tier-featured' : 'row-tier-standard'} reveal mb-1`}>
                  <VeeCollectionRow
                    name={row.name}
                    tagline={row.tagline}
                    items={row.isTop10 ? row.items.slice(0, 10) : row.items}
                    tmdbMap={tmdbMap}
                    isTop10={!!row.isTop10}
                    cardWidth={116}
                    accent={row.driver === 'dash-curated' ? GOLD : '#D9A441'}
                    countLabel={t(lang, 'moviesLabel')}
                    onItemClick={openDetail}
                  />
                </section>
              ))}
            </div>
          )}
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <span className="text-xs text-white/30">
              {filteredAndSorted.length} {genreLabel(activeGenre, lang)} {t(lang, 'moviesLabel')}
            </span>
            <button onClick={() => setActiveGenre(0)} className="text-[10px]" style={{ color: `${GOLD}aa` }}>{t(lang, 'clearFilter')}</button>
          </div>
        </>
      )}

      {/* ── Movie grid (the deep-browse floor) ── */}
      {displayLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" text={isSearching ? t(lang, 'searchingEllipsis') : t(lang, 'loading')} />
        </div>
      ) : moviesError && !isSearching ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-text-muted text-sm">{t(lang, 'unableToLoadRetry')}</p>
          <button onClick={() => { setMoviesError(false); setLoading(true); setRetryKey(k => k + 1); }}
            className="group px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${GOLD}26 0%, ${GOLD}0d 100%)`, border: `1px solid ${GOLD}40`, color: GOLD }}>{t(lang, 'retry')}</button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        isSearching || activeGenre !== 0 ? (
          <EmptyState icon="film" title={isSearching ? t(lang, 'noMoviesMatch') : t(lang, 'noMoviesGenre')} subtitle={lang === 'fr' ? 'Essayez une autre recherche ou un autre genre' : 'Try a different search or genre'} action={{ label: isSearching ? 'Clear search' : 'Show all genres', onClick: () => { setSearchQuery(''); setActiveGenre(0); } }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted text-sm gap-2">
            {t(lang, 'noMoviesInCategory')}
          </div>
        )
      ) : (
        <>
          {/* Grid header — only when there's a curated ladder above, to mark the floor */}
          {!isSearching && activeGenre === 0 && ladder.length > 0 && (
            <div className="px-5 pt-6 pb-1 flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
              <h2 className="text-[15px] font-semibold text-white/55" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {lang === 'fr' ? 'Tout le catalogue' : 'Browse all'}
              </h2>
            </div>
          )}
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 p-5">
            {(isSearching ? filteredAndSorted : filteredAndSorted.slice(0, displayLimit)).map(movie => (
              <div key={movie.stream_id} className="relative group/card cv-grid-cell">
                <PosterCard title={movie.name} poster={movie.stream_icon} rating={movie.rating}
                  tmdbData={tmdbMap[`m:${movie.stream_id}`]} onClick={() => setDetailMovie(movie)} />
                <button onClick={e => {
                    e.stopPropagation();
                    const url = buildVodUrl(credentials, movie.stream_id, movie.container_extension || 'mp4');
                    const a = document.createElement('a');
                    a.href = url;
                    const safeName = (movie.name || 'movie').replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 100);
                    a.download = `${safeName}.${movie.container_extension || 'mp4'}`;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    import('@/lib/downloads').then(({ recordDownload }) => {
                      recordDownload({ title: movie.name, poster: movie.stream_icon, url, type: 'movie' });
                    });
                  }}
                  className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full flex items-center justify-center z-10 opacity-50 sm:opacity-0 sm:group-hover/card:opacity-70 hover:!opacity-100 transition-opacity active:scale-90"
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
                  title={t(lang, 'download')} aria-label={t(lang, 'download')}>
                  <Download className="w-3.5 h-3.5 text-white/80" strokeWidth={1.6} />
                </button>
              </div>
            ))}
          </div>
          {!isSearching && filteredAndSorted.length > displayLimit && (
            <div className="flex flex-col items-center gap-1 pb-8 mt-4 mb-4">
              <button
                onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                className="group w-full relative overflow-hidden rounded-2xl py-3.5 transition-all duration-300 hover:scale-[1.005] active:scale-[0.995]"
                style={{ background: `linear-gradient(135deg, ${GOLD}1f 0%, ${GOLD}0a 100%)`, border: `1px solid ${GOLD}33` }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${GOLD}14 50%, transparent 100%)` }}
                />
                <div className="relative flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: GOLD }}>
                      {t(lang, 'showMore')}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-bounce" style={{ animationDuration: '1.8s' }}>
                      <path d="M6 2v8M2 6l4 4 4-4" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t(lang, 'showing')} {Math.min(displayLimit, filteredAndSorted.length).toLocaleString()} {t(lang, 'of')} {filteredAndSorted.length.toLocaleString()}
                  </span>
                </div>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Trailer SPACE ── */}
      {detailMovie && (
        <MoviesTrailerSpace
          credentials={credentials}
          initial={detailMovie}
          pool={filteredAndSorted.length > 0 ? filteredAndSorted : movies}
          tmdbMap={tmdbMap}
          onPlay={onPlay}
          onClose={() => setDetailMovie(null)}
        />
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────

function genreLabel(id: number, lang: 'fr' | 'en'): string {
  const g = GENRE_FILTERS.find(x => x.id === id);
  if (g && GENRE_NAME_MAP[g.name]) return t(lang, GENRE_NAME_MAP[g.name]);
  return TMDB_GENRES[id] || g?.name || '';
}
