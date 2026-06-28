import React, { useEffect, useState, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { Play, X, Search, SlidersHorizontal, Star, Sparkles, Plus } from 'lucide-react';
import type { XtreamCredentials, SeriesItem, SeriesInfo, Episode } from '@/lib/xtream';
import { getSeries, getSeriesInfo, buildSeriesUrl, buildVodFallbackUrl, getTmdbMap, getSeriesByCategory, seriesDbToItem, searchSeries } from '@/lib/xtream';
import { tap, click as hapticClick } from '@/lib/haptics';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { TMDB_GENRES } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { VeeCollectionRow } from '@/components/ui/VeeCollectionRow';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { CosmicClose } from '@/components/ui/CosmicClose';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { RowCountBadge } from '@/components/ui/NeonGate';
import { SeriesExplorer } from '@/components/ui/SeriesExplorer';
import { SERIES_TABS, GENRE_FILTERS, SORT_MODES, TMDB_TV_GENRES, type SortMode } from '@/lib/series-collections';
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
  'All': 'genreAll', 'Drama': 'genreDrama', 'Comedy': 'genreComedy',
  'Crime': 'genreCrime', 'Thriller': 'genreThriller', 'Action': 'genreAction',
  'Sci-Fi': 'genreSciFi', 'Mystery': 'genreMystery', 'Romance': 'genreRomance',
  'Animation': 'genreAnimation', 'Documentary': 'genreDocumentary', 'Family': 'genreFamily',
  'Horror': 'genreHorror', 'Reality': 'genreReality', 'War': 'genreWar',
  'Western': 'genreWestern',
};

const TAB_NAME_MAP: Record<string, TranslationKey> = {
  'Platform Originals': 'tabPlatformOriginals',
  'Turkish': 'tabTurkish',
  'Korean': 'tabKorean',
  'Anime': 'tabAnime',
};

// ── Warm-luxury palette ──────────────────────────────────────────
// Candle-warm cinema lounge, NOT Netflix-cold-black. Molten gold/amber accent used
// sparingly; the regional spotlight gets a terracotta/clay underglow that feels "home".
const GOLD = '#E8B04B';
const GOLD_DEEP = '#C8862F';
const TERRACOTTA = '#C9763B';

// Per-pack mood glow → used only as the row dot accent (whispers context, never tints cards).
const MOMENT_MOOD: Record<string, string> = {
  'before-sleep': '#6366F1', 'late-night': '#7C3AED', 'quick-lunch': '#D97706',
  'everyone-watching': '#9D4EDD', 'in-your-feelings': '#C084FC', 'family-time': '#F59E0B',
  'adrenaline': '#EF4444', 'mind-benders': '#8B5CF6',
};
const moodColor = (id: string) => MOMENT_MOOD[id] || '#9D4EDD';

// French editorial flavour for the auto genre rows (title stays the TV genre, this is the
// human-warm subtitle that signals "curated", not "computed"). Keyed by TMDB **TV** genre id.
const GENRE_TAGLINES: Record<number, string> = {
  10759: 'Action et aventure sans répit', 18: 'Des histoires qui marquent',
  35: 'De quoi rire un bon coup', 80: 'Le crime ne paie pas',
  53: 'Tension à couper le souffle', 9648: 'À résoudre vous-même',
  10765: 'Mondes sans limites', 10749: 'Pour les grands romantiques',
  16: "L'animation a son public", 99: 'Le réel, raconté',
  10751: 'Pour toute la famille', 27: 'Frissons garantis',
  10764: 'Le réel, sans script', 10768: 'Guerre et pouvoir',
  37: "L'Ouest sauvage", 10762: 'Pour les petits',
};

function parseYear(name: string): number {
  const m = name.match(/\((\d{4})\)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Card widths per ladder tier — the deferred-ladder skeleton reserves one row
// per entry at the matching height (~9 rows ≈ the cold-start ladder).
const LADDER_SKELETON_WIDTHS = [140, 120, 120, 108, 108, 108, 108, 108, 108];

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

// In-memory cache for fetched series info — reopening a series is instant
// (xtream.ts also persists to localStorage; this avoids the JSON.parse round-trip
// within a session and survives genre/tab churn). Capped to bound memory.
const seriesInfoMemCache = new Map<number, SeriesInfo>();
const SERIES_INFO_CACHE_MAX = 40;

// Best-effort regional-spotlight seed terms. This Xtream series catalog has no dedicated
// African/Nollywood category (that content lives in live-TV), so we name-search a few terms
// and the row self-suppresses below 4 hits — it lights up automatically when curation adds
// tagged African series. Mirrors the Movies page's dedicated-pool architecture.
const AFRICAN_SEED_TERMS = ['african', 'nollywood', 'yoruba', 'mzansi', 'telenovela'];

// ── Component ────────────────────────────────────────────────────

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const SeriesPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();
  const { stickyClass, stickyStyle } = useSmartSticky();

  // Tab state
  const [activeParent, setActiveParent] = useState(SERIES_TABS[0].id);
  const [activeSubtab, setActiveSubtab] = useState(SERIES_TABS[0].subtabs[0].id);
  const [activeGenre, setActiveGenre] = useState(0); // 0 = All
  const [sortMode, setSortMode] = useState<SortMode>('smart');

  // Pagination
  const PAGE_SIZE = 50;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const subtabScrollRef = useRef<HTMLDivElement>(null);
  const genreScrollRef = useRef<HTMLDivElement>(null);

  // Data
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  // PERF: feed the heavy recommendation ladder a DEFERRED list so its ~9 scoring
  // passes render at non-urgent priority — off the first-paint critical path,
  // interruptible, never blocking the main thread / scroll. (Mirrors MoviesPage.)
  const deferredSeries = useDeferredValue(seriesList);
  const [gemSet, setGemSet] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [seriesError, setSeriesError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Regional spotlight pool — fetched once, independent of the active subtab, so the brand
  // row stays pinned in the top third on every tab (self-suppresses when the catalog is thin).
  const [africanPool, setAfricanPool] = useState<SeriesItem[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SeriesItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detail + TMDB
  const [detailSeries, setDetailSeries] = useState<SeriesItem | null>(null);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});

  // ── Personalization signals (reactive) ───────────────────────
  // Likes + watch history drive the affinity model; a heart toggle anywhere re-ranks the
  // whole ladder + hero live (that instant feedback IS the "alive" feeling). Recent opens
  // are the ×1 seed.
  const likes = useLikes();
  const { history } = useWatchHistory();
  const [recent, setRecent] = useState<SeriesItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('tivi_recent_series') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    if (!detailSeries) return;
    setRecent(prev => {
      const next = [detailSeries, ...prev.filter(s => s.series_id !== detailSeries.series_id)].slice(0, 14);
      try { localStorage.setItem('tivi_recent_series', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [detailSeries]);

  const signals: RecSignals = useMemo(() => ({
    history,
    likes,
    recentMovies: getItem('recent_movies', []),
    recentSeries: recent,
    downloads: getItem('downloads', []),
  }), [history, likes, recent]);

  // Series episode picker modal
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [episodesUnavailable, setEpisodesUnavailable] = useState(false);

  // ── Derived ──────────────────────────────────────────────────

  const currentParent = useMemo(() =>
    SERIES_TABS.find(t => t.id === activeParent) || SERIES_TABS[0], [activeParent]);

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

  // Regional spotlight pool — one fetch, silent on failure (the row just won't render).
  useEffect(() => {
    let mounted = true;
    Promise.allSettled(AFRICAN_SEED_TERMS.map(term => searchSeries(term, 60)))
      .then(results => {
        if (!mounted) return;
        const seen = new Set<number>();
        const out: SeriesItem[] = [];
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          for (const s of r.value) {
            if (seen.has(s.id)) continue;
            seen.add(s.id);
            out.push(seriesDbToItem(s));
          }
        }
        setAfricanPool(out);
      }).catch(() => { /* spotlight is a bonus */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset displayLimit when navigation changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [activeParent, activeSubtab, activeGenre]);

  // Parent change -> reset subtab, genre, scroll
  useEffect(() => {
    const parent = SERIES_TABS.find(t => t.id === activeParent);
    if (parent) {
      setActiveSubtab(parent.subtabs[0].id);
      setActiveGenre(0);
      setSortMode('smart');
      subtabScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
      genreScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeParent]);

  // Fetch series for subtab — Supabase-first (captures is_gem), Xtream fallback.
  useEffect(() => {
    let mounted = true;
    const catIds = currentSubtab.categoryIds;
    if (!catIds.length) { setSeriesList([]); setGemSet(new Set()); setLoading(false); return; }

    async function load() {
      setLoading(true);
      setSeriesError(false);
      try {
        const sbResults = await Promise.allSettled(catIds.map(id => getSeriesByCategory(id)));
        const sbMerged: SeriesItem[] = [];
        const gems = new Set<number>();
        const seen = new Set<number>();
        for (const r of sbResults) {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            for (const s of r.value) {
              if (seen.has(s.id)) continue;
              seen.add(s.id);
              sbMerged.push(seriesDbToItem(s));
              if (s.gem) gems.add(s.id);
            }
          }
        }
        if (sbMerged.length > 0) {
          if (mounted) { setSeriesList(sbMerged); setGemSet(gems); }
        } else {
          // Fallback to Xtream (no is_gem signal — dashCurated will rating-cut).
          if (mounted) setGemSet(new Set());
          if (catIds.length === 1) {
            const result = await getSeries(credentials, catIds[0]);
            if (mounted) setSeriesList(result);
          } else {
            const results = await Promise.allSettled(catIds.map(id => getSeries(credentials, id)));
            if (!mounted) return;
            const merged: SeriesItem[] = [];
            for (const r of results) {
              if (r.status === 'fulfilled') {
                for (const s of r.value) {
                  if (!seen.has(s.series_id)) { seen.add(s.series_id); merged.push(s); }
                }
              }
            }
            setSeriesList(merged);
          }
        }
      } catch {
        if (mounted) { setSeriesList([]); setGemSet(new Set()); setSeriesError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials, currentSubtab, retryKey]);

  // Search scoped to current parent (plumbing unchanged — the ladder layer only adds a strip)
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
          const filtered = seriesList.filter(s => s.name.toLowerCase().includes(q));
          if (mounted) { setSearchResults(filtered.slice(0, LIMIT)); setSearchTruncated(filtered.length > LIMIT); }
        } else {
          // Supabase search — scoped to current category
          const catIds = currentSubtab.categoryIds;
          const sbResults = await searchSeries(q, LIMIT, catIds.length > 0 ? catIds : undefined);
          if (sbResults.length > 0) {
            if (mounted) { setSearchResults(sbResults.map(seriesDbToItem).slice(0, LIMIT)); setSearchTruncated(sbResults.length >= LIMIT); }
            if (mounted) setSearchLoading(false);
            return;
          }
          // Fallback to Xtream
          const results = await Promise.allSettled(
            currentParent.searchCategoryIds.map(id => getSeries(credentials, id).catch(() => [] as SeriesItem[]))
          );
          const seen = new Set<number>();
          const unique: SeriesItem[] = [];
          for (const r of results) {
            if (r.status === 'fulfilled') {
              for (const s of r.value) { if (!seen.has(s.series_id)) { seen.add(s.series_id); unique.push(s); } }
            }
          }
          const filtered = unique.filter(s => s.name.toLowerCase().includes(q));
          if (mounted) { setSearchResults(filtered.slice(0, LIMIT)); setSearchTruncated(filtered.length > LIMIT); }
        }
      } catch { if (mounted) setSearchResults([]); }
      finally { if (mounted) setSearchLoading(false); }
    }
    search();
    return () => { mounted = false; };
  }, [debouncedQuery, credentials, seriesList, currentParent, currentSubtab]);

  // ── Genre filter + Sort (the deep-browse floor) ──────────────

  const filteredAndSorted = useMemo(() => {
    const source = isSearching ? searchResults : seriesList;
    let filtered = source;
    if (activeGenre !== 0 && hasTmdb) {
      filtered = source.filter(s => tmdbMap[`s:${s.series_id}`]?.g?.includes(activeGenre));
    }
    if (!hasTmdb || sortMode === 'name') {
      if (sortMode === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      return filtered;
    }
    if (sortMode === 'rating') {
      return [...filtered].sort((a, b) => (tmdbMap[`s:${b.series_id}`]?.r || 0) - (tmdbMap[`s:${a.series_id}`]?.r || 0));
    }
    if (sortMode === 'newest') {
      return [...filtered].sort((a, b) => parseYear(b.name) - parseYear(a.name));
    }
    // smart: trend-ranked
    const scoreMap = new Map<number, number>();
    for (const s of filtered) {
      const e = tmdbMap[`s:${s.series_id}`];
      scoreMap.set(s.series_id, e ? (e.r ?? 0) / 10 + (parseYear(s.name) >= 2024 ? 0.3 : 0) : 0);
    }
    return [...filtered].sort((a, b) => (scoreMap.get(b.series_id) || 0) - (scoreMap.get(a.series_id) || 0));
  }, [seriesList, searchResults, isSearching, activeGenre, sortMode, tmdbMap, hasTmdb]);

  const genreCounts = useMemo(() => {
    if (!hasTmdb) return {};
    const source = isSearching ? searchResults : seriesList;
    const counts: Record<number, number> = {};
    for (const s of source) {
      const tmdb = tmdbMap[`s:${s.series_id}`];
      if (tmdb?.g) for (const g of tmdb.g) counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [seriesList, searchResults, isSearching, tmdbMap, hasTmdb]);

  const activeGenreFilters = useMemo(() =>
    GENRE_FILTERS.filter(g => g.id === 0 || (genreCounts[g.id] || 0) > 0), [genreCounts]);

  // ── Lookup: resolve a clicked rec-row id back to its SeriesItem ──
  const seriesById = useMemo(() => {
    const m = new Map<number, SeriesItem>();
    for (const s of seriesList) m.set(s.series_id, s);
    for (const s of africanPool) if (!m.has(s.series_id)) m.set(s.series_id, s);
    for (const s of searchResults) if (!m.has(s.series_id)) m.set(s.series_id, s);
    return m;
  }, [seriesList, africanPool, searchResults]);

  const openDetail = useCallback((id: number) => {
    const s = seriesById.get(id);
    if (s) setDetailSeries(s);
  }, [seriesById]);

  // ── The recommendation ladder — intent-on-top, breadth-below ──
  // Every row names its driver in recommendations.ts and self-suppresses below 4 items, so
  // we never render an empty row. The regional spotlight is pinned in the top third either way.
  const ladder = useMemo<RankedRow[]>(() => {
    if (!hasTmdb || deferredSeries.length === 0) return [];
    const seriesList = deferredSeries; // heavy rec passes run on the deferred list

    const because = becauseYouWatched(seriesList, 'series', tmdbMap, affinity, { maxRows: 2 }, signals);
    const pourVous = recommendFor(seriesList, 'series', tmdbMap, affinity, {}, signals);
    const trending = trendingNow(seriesList, 'series', tmdbMap, { isTop10: true });

    // Regional spotlight: trend-ranked over the dedicated pool, re-labelled as the brand row.
    let african: RankedRow | null = null;
    if (africanPool.length > 0) {
      const r = trendingNow(africanPool, 'series', tmdbMap, { limit: 24 });
      if (r) african = { ...r, id: 'african-spotlight', name: 'La Maison des Séries Africaines', tagline: 'Nollywood, drames du continent — la maison de la culture', driver: 'genre' };
    }

    const moods = moodRows(seriesList, 'series', tmdbMap, affinity, { maxRows: 3, packLabels });
    const genres = genreCollections(seriesList, 'series', tmdbMap, affinity, {
      genreLabels: TMDB_TV_GENRES, taglines: GENRE_TAGLINES, maxRows: 3,
    });
    const pepites = dashCurated(seriesList, 'series', tmdbMap, { gemSet: gemSet.size ? gemSet : undefined });
    const gem = hiddenGems(seriesList, 'series', tmdbMap, { salt: 'series' });
    const favs = fromFavorites(seriesList, 'series', tmdbMap, {}, signals);

    const rows: RankedRow[] = [];
    if (cold) {
      // Cold start: no personal rows — open on the brand + breadth so the page is never bare.
      for (const r of [african, trending, pepites, ...moods, ...genres, gem]) if (r) rows.push(r);
    } else {
      // Warmed up: recency of intent on top, breadth below, spotlight pinned in the top third.
      for (const r of [...because, pourVous, trending, african, favs, ...moods, ...genres, pepites, gem]) {
        if (r) rows.push(r);
      }
    }
    // De-dup row ids (a seed title could collide) — keep first.
    const seen = new Set<string>();
    return rows.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }, [deferredSeries, africanPool, tmdbMap, affinity, signals, gemSet, packLabels, cold, hasTmdb]);

  // ── Genre-active context rows (design §4 — context is never fully lost) ──
  const genreContextRows = useMemo<RankedRow[]>(() => {
    if (activeGenre === 0 || !hasTmdb || isSearching) return [];
    const pool = deferredSeries.filter(s => tmdbMap[`s:${s.series_id}`]?.g?.includes(activeGenre));
    if (pool.length < 4) return [];
    const label = genreLabel(activeGenre, lang);
    const out: RankedRow[] = [];
    const tr = trendingNow(pool, 'series', tmdbMap, { limit: 18 });
    if (tr) out.push({ ...tr, id: 'genre-ctx-trending', name: `${t(lang, 'trendingNow')} · ${label}`, tagline: '' });
    const gem = dashCurated(pool, 'series', tmdbMap, { gemSet: gemSet.size ? gemSet : undefined });
    if (gem) out.push({ ...gem, id: 'genre-ctx-gem', name: `Pépites · ${label}`, tagline: '' });
    return out;
  }, [activeGenre, deferredSeries, tmdbMap, gemSet, hasTmdb, isSearching, lang]);

  // ── Search context strip (design §4) ──
  const searchContextRow = useMemo<RankedRow | null>(() => {
    if (!isSearching || !hasTmdb || searchResults.length < 4) return null;
    return searchRerank(searchResults, 'series', tmdbMap, affinity, { limit: 18 });
  }, [isSearching, hasTmdb, searchResults, tmdbMap, affinity]);

  // ── Continue Watching (row 0) — in-progress series, resume the stored episode on tap ──
  // Series watch history is episode-keyed (`series-<episodeId>`) and already carries the
  // exact episode URL + saved offset, so resuming replays that episode at its position.
  const keepWatching = useMemo<WatchHistoryEntry[]>(
    () => history.filter(e => isInProgress(e) && e.category === 'series' && !!e.url).slice(0, 14),
    [history]);

  // ── Hero resolver (3-tier resume → affinity → editorial) ──
  // Series history is episode-keyed (un-joinable to a series_id), so the resume tier never
  // fires here — the hero resolves to affinity (warmed up) or editorial (cold start).
  const heroPick = useMemo<HeroPick | null>(() => {
    if (!hasTmdb || seriesList.length === 0) return null;
    return heroResolver(seriesList, 'series', tmdbMap, affinity, { candidateCount: 3 }, signals);
  }, [seriesList, tmdbMap, affinity, signals, hasTmdb]);

  // Soft 8s rotation among the firing tier's candidates.
  const [heroIdx, setHeroIdx] = useState(0);
  const heroKey = heroPick ? `${heroPick.tier}:${(heroPick.item as SeriesItem).series_id}` : '';
  useEffect(() => { setHeroIdx(0); }, [heroKey]);
  useEffect(() => {
    const n = heroPick?.candidates.length ?? 0;
    if (n <= 1) return;
    const iv = setInterval(() => setHeroIdx(i => (i + 1) % n), 8000);
    return () => clearInterval(iv);
  }, [heroPick]);

  const heroItem = heroPick ? (heroPick.candidates[heroIdx % heroPick.candidates.length] as SeriesItem) : null;
  const heroEntry = heroItem ? tmdbMap[`s:${heroItem.series_id}`] : null;

  // ── Series detail handlers ────────────────────────────────────

  const handleSelectSeries = useCallback(
    async (series: SeriesItem) => {
      hapticClick();
      setSelectedSeries(series);
      setEpisodesUnavailable(false);

      // Instant reopen — serve from the in-memory cache, no spinner, no fetch.
      const cached = seriesInfoMemCache.get(series.series_id);
      if (cached) {
        setSeriesInfo(cached);
        setLoadingInfo(false);
        return;
      }

      setLoadingInfo(true);
      setSeriesInfo(null);
      // Race-safe timeout — tied to THIS request, not global loading state
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        setEpisodesUnavailable(true);
        setLoadingInfo(false);
      }, 15000);
      try {
        // Lazy fetch on demand — seasons/episodes only when a series is opened.
        const info = await getSeriesInfo(credentials, series.series_id);
        clearTimeout(timeout);
        if (timedOut) return; // Timeout already fired, don't overwrite
        // Cache it (bounded — evict oldest when full).
        if (seriesInfoMemCache.size >= SERIES_INFO_CACHE_MAX) {
          const firstKey = seriesInfoMemCache.keys().next().value;
          if (firstKey !== undefined) seriesInfoMemCache.delete(firstKey);
        }
        seriesInfoMemCache.set(series.series_id, info);
        setSeriesInfo(info);
        setLoadingInfo(false);
      } catch {
        clearTimeout(timeout);
        if (!timedOut) {
          setEpisodesUnavailable(true);
          setLoadingInfo(false);
        }
      }
    },
    [credentials]
  );

  const handlePlayEpisode = useCallback(
    (episode: Episode) => {
      const ext = episode.container_extension || 'mp4';
      onPlay({
        id: `series-${episode.id}`,
        name: `${selectedSeries?.name || ''} - ${episode.title || `E${episode.episode_num}`}`,
        url: buildSeriesUrl(credentials, episode.id, ext),
        logo: selectedSeries?.cover,
        category: 'series',
        fallbackUrl: buildVodFallbackUrl(credentials, episode.id, ext, 'series'),
      });
      setSelectedSeries(null);
    },
    [credentials, onPlay, selectedSeries]
  );

  const closeEpisodeModal = useCallback(() => {
    setSelectedSeries(null);
    setSeriesInfo(null);
    setEpisodesUnavailable(false);
  }, []);

  // Resume a Continue-Watching series episode — the player reads the same watch history
  // (getResume on channelId) and seeks automatically, so we just hand it the channel.
  const playResume = useCallback((e: WatchHistoryEntry) => {
    onPlay({ id: e.channelId, name: e.name || '', url: e.url || '', logo: e.logo, category: e.category, knownDuration: e.totalDuration });
  }, [onPlay]);

  // ── Back-guard: the episode picker is a RISING SURFACE, not a modal wall.
  // Pushing a history entry while it's open means the hardware/browser BACK
  // gesture pops the surface (returns to the grid exactly where you were),
  // never leaving the Series page. Continuity-first. ────────────────
  useEffect(() => {
    if (!selectedSeries) return;
    window.history.pushState({ episodePicker: true }, '');
    const onPop = () => closeEpisodeModal();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // If still in our pushed entry (closed via X / swipe), unwind it cleanly.
      if (window.history.state?.episodePicker) window.history.back();
    };
  }, [selectedSeries, closeEpisodeModal]);

  // Swipe-down to dismiss the rising surface (feels more natural than a tap).
  const sheetTouch = useRef<{ y: number; t: number } | null>(null);

  // ── Handlers ─────────────────────────────────────────────────

  const handleParentChange = useCallback((id: string) => {
    tap();
    setActiveParent(id);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const displayLoading = isSearching ? searchLoading : loading;

  // Hero copy per tier
  const heroBadge = heroPick?.tier === 'affinity'
    ? (lang === 'fr' ? 'Choisi pour vous' : 'Picked for you')
    : (lang === 'fr' ? "À l'affiche" : 'Now showing');

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="pb-32" style={{ paddingTop: 'max(4rem, calc(3.5rem + env(safe-area-inset-top, 0px)))' }}>
      {/* ── Ambient depth — fixed, GPU-light, behind content (no scroll cost). A faint
          candle-warm gold wash up top + terracotta/purple under-glow lift the flat dark. ── */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          background:
            'radial-gradient(115% 70% at 50% -8%, rgba(232,176,75,0.055), transparent 60%),' +
            'radial-gradient(90% 60% at 8% 16%, rgba(201,118,59,0.045), transparent 55%),' +
            'radial-gradient(85% 60% at 92% 88%, rgba(157,78,221,0.04), transparent 60%)',
        }}
      />
      {/* ── Hero Billboard — dynamic resolver (affinity → editorial) ── */}
      {heroItem && heroEntry?.p ? (
        <div className="relative overflow-hidden" style={{ height: 'clamp(170px, 36vh, 300px)' }}>
          {/* Backdrop — candle-warm cross-dissolve on rotation */}
          <div
            key={heroItem.series_id}
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
              <Sparkles className="w-3 h-3" />
              {heroBadge}
            </span>
            <h1 className="text-[24px] md:text-[32px] font-black text-white tracking-tight leading-tight line-clamp-2 mb-2"
              style={{ fontFamily: "'Outfit', sans-serif", textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>
              {heroItem.name.replace(/\s*\(\d{4}\)\s*$/, '')}
            </h1>

            {/* Gold hairline (editorial flourish) */}
            <div className="h-[2px] rounded-full mb-3 overflow-hidden" style={{ width: '56px', background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DEEP})`, boxShadow: `0 0 8px ${GOLD}66` }} />
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
                  {TMDB_TV_GENRES[gid] || TMDB_GENRES[gid] || ''}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { tap(); setDetailSeries(heroItem); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: '#1a130a', boxShadow: `0 6px 20px ${GOLD_DEEP}44` }}
              >
                <Play className="w-4 h-4" style={{ fill: '#1a130a' }} />
                {lang === 'fr' ? 'Lecture' : 'Play'}
              </button>
              <button
                onClick={() => { tap(); setDetailSeries(heroItem); }}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Reserve the hero's FINAL box (same clamp as the resolved billboard) so the
        // fallback→billboard swap on data-resolve animates content in WITHOUT pushing
        // the reveal rows below — kills the measured route-load CLS (was 0.12).
        <div className="pt-16 pb-5 px-5" style={{ minHeight: 'clamp(170px, 36vh, 300px)' }}>
          <h1 className="text-[22px] font-semibold text-white/85 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>Séries</h1>
          <div className="w-16 h-[2px] rounded-full mt-2" style={{ background: `linear-gradient(90deg, ${GOLD}88 0%, ${GOLD}26 60%, transparent 100%)` }} />
        </div>
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
              placeholder={t(lang, 'searchSeries')}
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
            {/* Parent tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {SERIES_TABS.map(tab => (
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

            {/* Subtabs */}
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

            {/* Genre filter pills (TMDB-powered) */}
            {!loading && seriesList.length > 0 && activeGenreFilters.length > 2 && (
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

                {/* Sort toggle */}
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
            countLabel={t(lang, 'seriesLabel')}
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
                <h2 className="text-[19px] font-black tracking-tight text-white">
                  {lang === 'fr' ? 'Reprendre' : 'Keep Watching'}
                </h2>
                <RowCountBadge count={keepWatching.length} label={t(lang, 'seriesLabel')} />
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
          {ladder.length > 0 ? (
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
                      navigateTo="/series"
                      countLabel={t(lang, 'seriesLabel')}
                      accent={rowAccent(row)}
                      editorial={editorial}
                      onItemClick={openDetail}
                    />
                  </section>
                );
              })}
            </div>
          ) : (seriesList.length > 0) ? (
            // CLS RESERVE: the ladder needs tmdbMap (loads LATER than the list) and
            // renders at deferred priority — reserve its box the instant the list is
            // ready (NOT gated on tmdb) so the grid below never gets shoved down.
            // The ladder computes at DEFERRED priority → empty for one
            // paint. Reserve each row's EXACT final box (header + cardWidth×1.5
            // posters, matching VeeCollectionRow) so the real rows replace these
            // in-place and shift NOTHING. (Mirrors MoviesPage; long-task stays fixed.)
            <div className="py-3" aria-hidden>
              {LADDER_SKELETON_WIDTHS.map((cw, i) => (
                <section key={i} className={`${i === 0 ? 'row-tier-hero' : i <= 2 ? 'row-tier-featured' : 'row-tier-standard'} mb-1 animate-pulse`}>
                  <div className="px-4 mb-2">
                    <div className="h-5 w-44 rounded bg-white/[0.05]" />
                    <div className="h-[14px] w-3/5 max-w-[260px] rounded bg-white/[0.03] mt-0.5" />
                  </div>
                  <div className="flex px-4 pb-2 items-end" style={{ gap: 14 }}>
                    {[0, 1, 2, 3, 4, 5].map(j => (
                      <div key={j} className="flex-shrink-0 rounded-xl bg-white/[0.025]" style={{ width: cw, height: Math.round(cw * 1.5) }} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
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
                    countLabel={t(lang, 'seriesLabel')}
                    onItemClick={openDetail}
                  />
                </section>
              ))}
            </div>
          )}
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <span className="text-xs text-white/30">
              {filteredAndSorted.length} {genreLabel(activeGenre, lang)} {t(lang, 'seriesLabel')}
            </span>
            <button onClick={() => setActiveGenre(0)} className="text-[10px]" style={{ color: `${GOLD}aa` }}>{t(lang, 'clearFilter')}</button>
          </div>
        </>
      )}

      {/* ── Series grid (the deep-browse floor) ── */}
      {displayLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" text={isSearching ? t(lang, 'searching') : t(lang, 'loadingSeries')} />
        </div>
      ) : seriesError && !isSearching ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-text-muted text-sm">{t(lang, 'unableToLoadRetry')}</p>
          <button onClick={() => { setSeriesError(false); setLoading(true); setRetryKey(k => k + 1); }}
            className="group px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${GOLD}26 0%, ${GOLD}0d 100%)`, border: `1px solid ${GOLD}40`, color: GOLD }}>{t(lang, 'retry')}</button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        isSearching || activeGenre !== 0 ? (
          <EmptyState icon="tv" title={isSearching ? t(lang, 'noSeriesMatch') : t(lang, 'noSeriesGenre')} subtitle={lang === 'fr' ? 'Essayez une autre recherche ou un autre genre' : 'Try a different search or genre'} action={{ label: isSearching ? 'Clear search' : 'Show all genres', onClick: () => { setSearchQuery(''); setActiveGenre(0); } }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted text-sm gap-2">
            {t(lang, 'noSeriesInCategory')}
          </div>
        )
      ) : (
        <>
          {/* Grid header — only when there's a curated ladder above, to mark the floor */}
          {!isSearching && activeGenre === 0 && ladder.length > 0 && (
            <div className="px-5 pt-6 pb-1 flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
              <h2 className="text-[15px] font-semibold text-white/55">
                {lang === 'fr' ? 'Tout le catalogue' : 'Browse all'}
              </h2>
            </div>
          )}
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 p-5">
            {(isSearching ? filteredAndSorted : filteredAndSorted.slice(0, displayLimit)).map(series => (
              <div key={series.series_id} className="cv-grid-cell">
                <PosterCard
                  title={series.name}
                  poster={series.cover}
                  rating={series.rating}
                  tmdbData={tmdbMap[`s:${series.series_id}`]}
                  onClick={() => setDetailSeries(series)}
                />
              </div>
            ))}
          </div>

          {/* Show More button */}
          {!isSearching && filteredAndSorted.length > displayLimit && (
            <div className="flex flex-col items-center gap-1 mt-4 mb-4 pb-8">
              <button
                onClick={() => setDisplayLimit(l => l + PAGE_SIZE)}
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
                    {filteredAndSorted.length - displayLimit} {t(lang, 'remaining')}
                  </span>
                </div>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── ContentDetailModal — metadata + trailer, opens episode picker on play ── */}
      {detailSeries && (
        <ContentDetailModal
          streamId={detailSeries.series_id}
          name={detailSeries.name}
          poster={detailSeries.cover}
          rating={detailSeries.rating}
          type="series"
          tmdbData={tmdbMap[`s:${detailSeries.series_id}`]}
          credentials={credentials}
          onPlay={() => {
            const series = detailSeries;
            setDetailSeries(null);
            handleSelectSeries(series);
          }}
          onClose={() => setDetailSeries(null)}
        />
      )}

      {/* ── Series Episode Picker — a RISING SURFACE (not a modal wall).
          The previous content peeks above the sheet (float-from-above =
          "you're still in the same place"); swipe-down or back pops it. ── */}
      {selectedSeries && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(4,4,8,0.30)', backdropFilter: 'blur(2px)' }}
          onClick={() => closeEpisodeModal()}
        >
          <div
            className="w-full max-w-lg overflow-hidden animate-slide-up border-t border-white/10"
            style={{ maxHeight: '88vh', background: '#141414', borderTopLeftRadius: '1.25rem', borderTopRightRadius: '1.25rem', boxShadow: '0 -18px 50px rgba(0,0,0,0.55)' }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { sheetTouch.current = { y: e.touches[0].clientY, t: Date.now() }; }}
            onTouchEnd={(e) => {
              if (!sheetTouch.current) return;
              const dy = e.changedTouches[0].clientY - sheetTouch.current.y;
              const dt = Date.now() - sheetTouch.current.t;
              if (dy > 90 || (dy > 45 && dt < 260)) closeEpisodeModal();
              sheetTouch.current = null;
            }}
          >
            {/* Drag handle — the swipe affordance */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </div>
            {/* Header — responsive height so episodes are reachable fast on short phones */}
            <div className="relative overflow-hidden" style={{ height: 'clamp(140px, 30vh, 200px)' }}>
              {selectedSeries.cover ? (
                <img
                  src={selectedSeries.cover}
                  alt={selectedSeries.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary-dark/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
              <div className="absolute top-3 right-3">
                <CosmicClose onClick={closeEpisodeModal} size="sm" />
              </div>
              <div className="absolute bottom-3 left-4 right-4">
                <h2 className="text-xl font-bold text-white">{selectedSeries.name}</h2>
              </div>
            </div>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" text={t(lang, 'loadingEpisodes')} />
              </div>
            ) : episodesUnavailable ? (
              <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                {t(lang, 'episodesUnavailable')}
              </div>
            ) : seriesInfo ? (
              /* ── DRILL-DOWN EXPLORER: series → seasons (shelf) → episodes → play ── */
              <SeriesExplorer
                series={selectedSeries}
                info={seriesInfo}
                tmdbData={tmdbMap[`s:${selectedSeries.series_id}`]}
                credentials={credentials}
                onPlayEpisode={handlePlayEpisode}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────

function genreLabel(id: number, lang: 'fr' | 'en'): string {
  const g = GENRE_FILTERS.find(x => x.id === id);
  if (g && GENRE_NAME_MAP[g.name]) return t(lang, GENRE_NAME_MAP[g.name]);
  return TMDB_TV_GENRES[id] || g?.name || '';
}
