import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Play, X, Download, Search, SlidersHorizontal, Star } from 'lucide-react';
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
import { NeonGate, RowCountBadge, cardScaleStyle } from '@/components/ui/NeonGate';
import { SERIES_TABS, GENRE_FILTERS, SORT_MODES, VEE_SERIES_COLLECTIONS, type SortMode, type VeeSeriesCollection } from '@/lib/series-collections';
import { t, useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { Channel } from '@/types';
import { useSmartSticky } from '@/hooks/useSmartSticky';

// ── i18n mood row mapping ─────────────────────────────────────────
const MOOD_NAME_MAP: Record<string, TranslationKey> = {
  'Binge All Night': 'bingeAllNight',
  'Cozy Night In': 'cozyNightIn',
  'Gets You Hooked': 'getsYouHooked',
  'Light & Easy': 'lightEasy',
  'Quick Episodes': 'quickEpisodes',
  'Masterpiece TV': 'masterpieceTV',
};

const SORT_NAME_MAP: Record<string, TranslationKey> = {
  'Smart': 'sortSmart',
  'Top Rated': 'sortTopRated',
  'Newest': 'sortNewest',
  'A-Z': 'sortAZ',
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

// ── Mood-aware glow per mood row (cool nights, warm days, hot binge).
// Whispers in the title only — never tints the cards. Quiet-luxury palette. ──
const MOOD_COLOR: Record<string, string> = {
  binge: '#7C3AED',       // night violet
  cozy: '#C084FC',        // soft warm violet
  hook: '#EF4444',        // hot red (gets you hooked)
  light: '#F59E0B',       // warm amber (light & easy)
  quick: '#D97706',       // morning amber
  masterpiece: '#FFD700', // gold (prestige TV)
};
const seriesMoodColor = (id: string) => MOOD_COLOR[id] || '#9D4EDD';

// ── Scoring ──────────────────────────────────────────────────────

function getTrendingScore(series: SeriesItem, tmdbMap: Record<string, TmdbEntry>): number {
  const tmdb = tmdbMap[`s:${series.series_id}`];
  if (!tmdb) return 0;

  // Rating: 40% weight
  const ratingScore = Math.min((tmdb.r || 0) / 10, 1);

  // Freshness: 30% weight
  let freshnessScore = 0.2;
  if (series.last_modified) {
    const ts = parseInt(series.last_modified, 10);
    if (ts > 0) {
      const daysAgo = (Date.now() / 1000 - ts) / 86400;
      if (daysAgo < 7) freshnessScore = 1.0;
      else if (daysAgo < 30) freshnessScore = 0.85;
      else if (daysAgo < 90) freshnessScore = 0.65;
      else if (daysAgo < 365) freshnessScore = 0.4;
    }
  } else {
    const yearMatch = series.name.match(/\((\d{4})\)/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2026) freshnessScore = 1.0;
      else if (year === 2025) freshnessScore = 0.85;
      else if (year === 2024) freshnessScore = 0.7;
      else if (year === 2023) freshnessScore = 0.5;
    }
  }

  // Popularity: 20% — trailer + poster + genre breadth
  const hasTrailer = tmdb.y ? 0.4 : 0;
  const hasPoster = tmdb.p ? 0.3 : 0;
  const genreBreadth = Math.min((tmdb.g?.length || 0) / 4, 1) * 0.3;
  const popularityScore = hasTrailer + hasPoster + genreBreadth;

  // Diversity: 10%
  const diversityScore = Math.min((tmdb.g?.length || 0) / 3, 1);

  return ratingScore * 0.4 + freshnessScore * 0.3 + popularityScore * 0.2 + diversityScore * 0.1;
}

function parseYear(name: string): number {
  const m = name.match(/\((\d{4})\)/);
  return m ? parseInt(m[1], 10) : 0;
}

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
  const [loading, setLoading] = useState(true);
  const [seriesError, setSeriesError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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
  // Personalization seed: remember what you open (localStorage, per-device) → "For You" row.
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

  // Series episode picker modal
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [activeSeason, setActiveSeason] = useState<string>('');
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

  // ── Effects ──────────────────────────────────────────────────

  useEffect(() => { getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP)); }, []);

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

  // Fetch series for subtab (multi-category fetch + merge + dedup)
  useEffect(() => {
    let mounted = true;
    const catIds = currentSubtab.categoryIds;
    if (!catIds.length) { setSeriesList([]); setLoading(false); return; }

    async function load() {
      setLoading(true);
      setSeriesError(false);
      try {
        // Supabase-first: try DB, fall back to Xtream
        const sbResults = await Promise.allSettled(catIds.map(id => getSeriesByCategory(id)));
        const sbMerged: SeriesItem[] = [];
        const seen = new Set<number>();
        for (const r of sbResults) {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            for (const s of r.value) {
              if (!seen.has(s.id)) { seen.add(s.id); sbMerged.push(seriesDbToItem(s)); }
            }
          }
        }
        if (sbMerged.length > 0) {
          if (mounted) setSeriesList(sbMerged);
        } else {
          // Fallback to Xtream
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
        if (mounted) { setSeriesList([]); setSeriesError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials, currentSubtab, retryKey]);

  // Search scoped to current parent
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

  // ── Genre filter + Sort (the smart layer) ────────────────────

  const filteredAndSorted = useMemo(() => {
    const source = isSearching ? searchResults : seriesList;

    // Step 1: Genre filter (TMDB-powered)
    let filtered = source;
    if (activeGenre !== 0 && hasTmdb) {
      filtered = source.filter(s => {
        const tmdb = tmdbMap[`s:${s.series_id}`];
        return tmdb?.g?.includes(activeGenre);
      });
    }

    // Step 2: Sort
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
    // smart: pre-compute scores once, then sort by lookup
    const scoreMap = new Map<number, number>();
    for (const s of filtered) scoreMap.set(s.series_id, getTrendingScore(s, tmdbMap));
    return [...filtered].sort((a, b) => (scoreMap.get(b.series_id) || 0) - (scoreMap.get(a.series_id) || 0));
  }, [seriesList, searchResults, isSearching, activeGenre, sortMode, tmdbMap, hasTmdb]);

  // ── Genre counts (how many series per genre in current view) ──

  const genreCounts = useMemo(() => {
    if (!hasTmdb) return {};
    const source = isSearching ? searchResults : seriesList;
    const counts: Record<number, number> = {};
    for (const s of source) {
      const tmdb = tmdbMap[`s:${s.series_id}`];
      if (tmdb?.g) {
        for (const g of tmdb.g) counts[g] = (counts[g] || 0) + 1;
      }
    }
    return counts;
  }, [seriesList, searchResults, isSearching, tmdbMap, hasTmdb]);

  // Only show genre filters that have content
  const activeGenreFilters = useMemo(() =>
    GENRE_FILTERS.filter(g => g.id === 0 || (genreCounts[g.id] || 0) > 0),
    [genreCounts]);

  // ── Trending row (Platform Originals only) ───────────────────

  const trendingSeries = useMemo(() => {
    if (activeParent !== 'platforms' || !hasTmdb) return [];
    return seriesList
      .map(s => ({ series: s, score: getTrendingScore(s, tmdbMap) }))
      .filter(s => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map(s => s.series);
  }, [seriesList, tmdbMap, activeParent, hasTmdb]);

  // ── Mood rows (Platform Originals first tab only) ─────────────

  const moodRows = useMemo(() => {
    if (activeParent !== 'platforms' || !hasTmdb || seriesList.length === 0) return [];
    const hour = new Date().getHours();
    const defs = [
      ...(hour >= 18 || hour < 6 ? [
        { id: 'binge', name: 'Binge All Night', genres: [18, 80, 9648], min: 7.0 },
        { id: 'cozy', name: 'Cozy Night In', genres: [35, 10749, 10751], min: 6.0 },
      ] : []),
      ...(hour >= 12 && hour < 18 ? [
        { id: 'hook', name: 'Gets You Hooked', genres: [53, 80, 9648, 18], min: 7.0 },
        { id: 'light', name: 'Light & Easy', genres: [35, 16, 10751], min: 5.5 },
      ] : []),
      ...(hour >= 6 && hour < 12 ? [
        { id: 'quick', name: 'Quick Episodes', genres: [35, 16, 10764], min: 5.0 },
      ] : []),
      { id: 'masterpiece', name: 'Masterpiece TV', genres: [18, 80, 10768], min: 8.0 },
    ];
    return defs.map(d => {
      const items = seriesList
        .filter(s => { const t = tmdbMap[`s:${s.series_id}`]; return t && t.r >= d.min && t.g.some(g => d.genres.includes(g)); })
        .sort((a, b) => (tmdbMap[`s:${b.series_id}`]?.r || 0) - (tmdbMap[`s:${a.series_id}`]?.r || 0))
        .slice(0, 20);
      return items.length >= 4 ? { ...d, items } : null;
    }).filter(Boolean) as { id: string; name: string; items: SeriesItem[] }[];
  }, [seriesList, tmdbMap, activeParent, hasTmdb]);

  // ── VEE intelligence rows ────────────────────────────────────

  const veeCollectionRows = useMemo(() => {
    if (!hasTmdb || seriesList.length === 0) return [];
    return VEE_SERIES_COLLECTIONS
      .filter(col => !col.parentTabs || col.parentTabs.length === 0 || col.parentTabs.includes(activeParent))
      .map((col: VeeSeriesCollection) => {
        let pool: SeriesItem[];
        if (col.categoryIds && col.categoryIds.length > 0) {
          const catSet = new Set(col.categoryIds);
          pool = seriesList.filter(s => catSet.has(s.category_id));
        } else {
          pool = seriesList.filter(s => col.filter(s, tmdbMap[`s:${s.series_id}`] || null));
        }
        const sorted = [...pool].sort((a, b) => col.sort(a, b, tmdbMap));
        const items = sorted.slice(0, col.limit).map(s => ({
          id: s.series_id,
          name: s.name,
          poster: s.cover,
          rating: s.rating,
          tmdbKey: `s:${s.series_id}`,
        }));
        return items.length >= 3 ? { collection: col, items } : null;
      })
      .filter(Boolean) as { collection: VeeSeriesCollection; items: { id: number; name: string; poster: string; rating?: string; tmdbKey: string }[] }[];
  }, [seriesList, tmdbMap, hasTmdb, activeParent]);

  // ── Hero billboard — pick highest-rated recent series with backdrop ──

  const heroSeries = useMemo(() => {
    if (!hasTmdb || seriesList.length === 0) return null;
    const candidates = seriesList
      .map(s => {
        const tmdb = tmdbMap[`s:${s.series_id}`];
        if (!tmdb?.p || !tmdb.r) return null;
        const year = parseYear(s.name);
        if (year < 2023) return null;
        return { series: s, tmdb, score: tmdb.r + (year >= 2025 ? 2 : year >= 2024 ? 1 : 0) };
      })
      .filter(Boolean) as { series: SeriesItem; tmdb: TmdbEntry; score: number }[];
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }, [seriesList, tmdbMap, hasTmdb]);

  // ── Series detail handlers ────────────────────────────────────

  const handleSelectSeries = useCallback(
    async (series: SeriesItem) => {
      hapticClick();
      setSelectedSeries(series);
      setLoadingInfo(true);
      setSeriesInfo(null);
      setEpisodesUnavailable(false);
      // Race-safe timeout — tied to THIS request, not global loading state
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        setEpisodesUnavailable(true);
        setLoadingInfo(false);
      }, 15000);
      try {
        const info = await getSeriesInfo(credentials, series.series_id);
        clearTimeout(timeout);
        if (timedOut) return; // Timeout already fired, don't overwrite
        setSeriesInfo(info);
        const seasonKeys = Object.keys(info.episodes || {});
        if (seasonKeys.length > 0) setActiveSeason(seasonKeys[0]);
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
    setActiveSeason('');
    setEpisodesUnavailable(false);
  }, []);

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

  const seasons = seriesInfo ? Object.keys(seriesInfo.episodes || {}) : [];
  const episodes = seriesInfo && activeSeason ? seriesInfo.episodes[activeSeason] || [] : [];

  // ── Handlers ─────────────────────────────────────────────────

  const handleParentChange = useCallback((id: string) => {
    tap();
    setActiveParent(id);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const displayLoading = isSearching ? searchLoading : loading;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="pb-32" style={{ paddingTop: 'max(4rem, calc(3.5rem + env(safe-area-inset-top, 0px)))' }}>
      {/* ── Hero Billboard ── */}
      {heroSeries ? (
        <div className="relative overflow-hidden" style={{ height: 'clamp(160px, 35vh, 280px)' }}>
          {/* Backdrop image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/w1280${heroSeries.tmdb.p})`,
              backgroundAttachment: 'scroll',
              transform: 'scale(1.05)',
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-[#060609]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060609]/80 via-transparent to-transparent" />
          {/* Content — bottom left */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
            <h1 className="text-[24px] md:text-[32px] font-black text-white tracking-tight leading-tight line-clamp-2 mb-2">
              {heroSeries.series.name.replace(/\s*\(\d{4}\)\s*$/, '')}
            </h1>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {heroSeries.tmdb.r > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[11px] font-bold">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {heroSeries.tmdb.r.toFixed(1)}
                </span>
              )}
              {(() => { const ym = heroSeries.series.name.match(/\((\d{4})\)/); return ym ? <span className="text-[11px] text-white/50 font-medium">{ym[1]}</span> : null; })()}
              {heroSeries.tmdb.g?.slice(0, 3).map(gid => (
                <span key={gid} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/60 font-medium">
                  {TMDB_GENRES[gid] || ''}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDetailSeries(heroSeries.series)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #9D4EDD, #7B2FBE)' }}
              >
                <Play className="w-4 h-4 fill-white" />
                Play
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-16 pb-5 px-5">
          <h1 className="text-[22px] font-semibold text-white/85 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>Series</h1>
          <div className="w-16 h-[2px] rounded-full mt-2" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0.15) 60%, transparent 100%)' }} />
        </div>
      )}

      {/* ── Sticky header ── */}
      <div className={stickyClass} style={stickyStyle}>
        {/* Search */}
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
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                  }`}>
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
                      activeGenre === g.id
                        ? 'bg-primary/20 text-primary-light border border-primary/30'
                        : 'text-white/25 hover:text-white/45'
                    }`}>
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
                    const next = modes[(modes.indexOf(sortMode) + 1) % modes.length];
                    setSortMode(next);
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

      {/* ── For You — a remembered relationship: title breathes, latest pulses. ── */}
      {!isSearching && !loading && recent.length > 0 && (
        <section className="px-4 pt-6 pb-3">
          <h2 className="text-[19px] font-black text-white/90 mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#9D4EDD', boxShadow: '0 0 8px #9D4EDD, 0 0 14px rgba(157,78,221,0.4)' }} />
            For You
            <RowCountBadge count={recent.length} label="series" />
          </h2>
          <p className="text-[11px] text-white/30 mb-3 ml-3.5">{lang === 'fr' ? 'Repris là où vous étiez' : 'Recently watched'}</p>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-fade pb-2 items-end">
            {recent.map((s, i) => (
              <div key={s.series_id} className="flex-shrink-0" style={{ width: 'clamp(116px, 32vw, 140px)' }}>
                <div className="relative" style={i === 0 ? { boxShadow: '0 0 0 1.5px rgba(157,78,221,0.45), 0 6px 22px rgba(157,78,221,0.18)', borderRadius: '0.75rem' } : undefined}>
                  <PosterCard title={s.name} poster={s.cover} rating={s.rating}
                    tmdbData={tmdbMap[`s:${s.series_id}`]} onClick={() => setDetailSeries(s)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending row ── */}
      {!isSearching && !loading && activeGenre === 0 && trendingSeries.length >= 5 && (
        <section className="px-4 pt-6 pb-3 row-tier-hero reveal">
          <h2 className="text-[19px] font-black text-white/90 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {t(lang, 'trendingRightNow')}
            <RowCountBadge count={trendingSeries.length} label="series" />
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-fade pb-2 items-end">
            {trendingSeries.map((s, i) => (
              <div key={s.series_id} className="flex-shrink-0" style={{ width: 'clamp(116px, 32vw, 140px)', animation: i < 12 ? `vee-card-in 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms both` : undefined }}>
                <PosterCard title={s.name} poster={s.cover} rating={s.rating}
                  tmdbData={tmdbMap[`s:${s.series_id}`]} onClick={() => setDetailSeries(s)} />
              </div>
            ))}
            <NeonGate navigateTo="/series" />
          </div>
        </section>
      )}

      {/* ── Mood rows ── */}
      {!isSearching && activeGenre === 0 && moodRows.length > 0 && (
        <div className="py-5">
          {moodRows.map((row, rowIdx) => {
            const mood = seriesMoodColor(row.id);
            return (
            <section key={row.id} className={`${rowIdx === 0 ? 'row-tier-featured' : 'row-tier-standard'} reveal`}>
              <div className="px-4 mb-2">
                <h3 className={`${rowIdx === 0 ? 'text-[17px]' : 'text-[15px]'} font-semibold text-white/65 flex items-center gap-1.5`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: mood, boxShadow: `0 0 7px ${mood}` }} />
                  {MOOD_NAME_MAP[row.name] ? t(lang, MOOD_NAME_MAP[row.name]) : row.name}
                  <RowCountBadge count={row.items.length} label="series" />
                </h3>
              </div>
              <div className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2 items-end">
                {row.items.map((s, i) => (
                  <div key={s.series_id} className="flex-shrink-0" style={{ width: 'clamp(100px, 28vw, 116px)', animation: i < 12 ? `vee-card-in 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms both` : undefined }}>
                    <PosterCard title={s.name} poster={s.cover} rating={s.rating}
                      tmdbData={tmdbMap[`s:${s.series_id}`]} onClick={() => setDetailSeries(s)} />
                  </div>
                ))}
                <NeonGate navigateTo="/series" />
              </div>
            </section>
            );
          })}
        </div>
      )}

      {/* ── VEE Intelligence rows — with breathing hierarchy ── */}
      {!isSearching && !loading && activeGenre === 0 && veeCollectionRows.length > 0 && (
        <div className="py-5">
          {veeCollectionRows.map(({ collection, items }, rowIndex) => {
            const tierClass = rowIndex === 0 ? 'row-tier-hero' : rowIndex <= 2 ? 'row-tier-featured' : 'row-tier-standard';
            const cardWidth = rowIndex === 0 ? 140 : rowIndex <= 2 ? 120 : 108;

            return (
              <section key={collection.id} className={`${tierClass} reveal`}>
                <VeeCollectionRow
                  name={collection.name}
                  items={rowIndex === 0 ? items.slice(0, 10) : items}
                  tmdbMap={tmdbMap}
                  isTop10={rowIndex === 0}
                  cardWidth={cardWidth}
                  navigateTo="/series"
                  countLabel="series"
                  onItemClick={(id) => {
                    const series = seriesList.find(s => s.series_id === id);
                    if (series) setDetailSeries(series);
                  }}
                />
              </section>
            );
          })}
        </div>
      )}

      {/* ── Active filter indicator ── */}
      {activeGenre !== 0 && !loading && (
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <span className="text-xs text-white/30">
            {filteredAndSorted.length} {(() => { const gn = GENRE_FILTERS.find(g => g.id === activeGenre)?.name; return gn && GENRE_NAME_MAP[gn] ? t(lang, GENRE_NAME_MAP[gn]) : gn; })()} {t(lang, 'seriesLabel')}
          </span>
          <button onClick={() => setActiveGenre(0)} className="text-[10px] text-primary/60 hover:text-primary">{t(lang, 'clearFilter')}</button>
        </div>
      )}

      {/* ── Series grid ── */}
      {displayLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" text={isSearching ? t(lang, 'searching') : t(lang, 'loadingSeries')} />
        </div>
      ) : seriesError && !isSearching ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-text-muted text-sm">{t(lang, 'unableToLoadRetry')}</p>
          <button onClick={() => { setSeriesError(false); setLoading(true); setRetryKey(k => k + 1); }}
            className="group px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(157,78,221,0.15) 0%, rgba(157,78,221,0.06) 100%)',
              border: '1px solid rgba(157,78,221,0.25)',
              color: 'rgba(157,78,221,0.85)',
            }}>{t(lang, 'retry')}</button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        isSearching || activeGenre !== 0 ? (
          <EmptyState icon="tv" title={isSearching ? t(lang, 'noSeriesMatch') : t(lang, 'noSeriesGenre')} subtitle="Try a different search or genre" action={{ label: isSearching ? 'Clear search' : 'Show all genres', onClick: () => { setSearchQuery(''); setActiveGenre(0); } }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted text-sm gap-2">
            {t(lang, 'noSeriesInCategory')}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 p-5">
            {filteredAndSorted.slice(0, displayLimit).map(series => (
              <PosterCard
                key={series.series_id}
                title={series.name}
                poster={series.cover}
                rating={series.rating}
                tmdbData={tmdbMap[`s:${series.series_id}`]}
                onClick={() => setDetailSeries(series)}
              />
            ))}
          </div>

          {/* Show More button */}
          {filteredAndSorted.length > displayLimit && (
            <div className="flex flex-col items-center gap-1 mt-4 mb-4 pb-8">
              <button
                onClick={() => setDisplayLimit(l => l + PAGE_SIZE)}
                className="group w-full relative overflow-hidden rounded-2xl py-3.5 transition-all duration-300 hover:scale-[1.005] active:scale-[0.995]"
                style={{
                  background: 'linear-gradient(135deg, rgba(157,78,221,0.13) 0%, rgba(157,78,221,0.05) 100%)',
                  border: '1px solid rgba(157,78,221,0.22)',
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(157,78,221,0.08) 50%, transparent 100%)' }}
                />
                <div className="relative flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'rgba(201,160,255,0.9)' }}>
                      {t(lang, 'showMore')}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-bounce" style={{ animationDuration: '1.8s' }}>
                      <path d="M6 2v8M2 6l4 4 4-4" stroke="rgba(201,160,255,0.7)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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
            ) : (
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                {/* Season tabs */}
                {seasons.length > 1 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    {seasons.map((s) => (
                      <button
                        key={s}
                        onClick={() => setActiveSeason(s)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          activeSeason === s
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-text-secondary hover:bg-white/10'
                        }`}
                      >
                        {t(lang, 'season')} {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Episodes */}
                <div className="space-y-2">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-[background-color,border-color] duration-300 text-left group"
                    >
                      <button
                        onClick={() => handlePlayEpisode(ep)}
                        className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors"
                      >
                        <Play className="w-4 h-4 text-primary-light ml-0.5" />
                      </button>
                      <button
                        onClick={() => handlePlayEpisode(ep)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {ep.title || `${t(lang, 'episode')} ${ep.episode_num}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          S{ep.season} E{ep.episode_num} &middot; {ep.container_extension?.toUpperCase() || 'MP4'}
                        </p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = buildSeriesUrl(credentials, ep.id, ep.container_extension || 'mp4');
                          const a = document.createElement('a');
                          a.href = url;
                          const seriesName = (selectedSeries?.name || 'series').replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 60);
                          const epName = (ep.title || `E${ep.episode_num}`).replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 40);
                          a.download = `${seriesName}_S${ep.season}_${epName}.${ep.container_extension || 'mp4'}`;
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
                        title={t(lang, 'download')}
                      >
                        <Download className="w-4 h-4 text-text-secondary" />
                      </button>
                    </div>
                  ))}
                  {episodes.length === 0 && (
                    <p className="text-sm text-text-muted text-center py-4">
                      {t(lang, 'noEpisodes')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
