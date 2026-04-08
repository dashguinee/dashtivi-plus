import React, { useEffect, useState, useCallback, useRef, useMemo, startTransition } from 'react';
import { Download, Search, X, SlidersHorizontal, Moon, TrendingUp, Coffee, Rabbit, Heart, Users, Zap, Brain, Play, Plus, Star } from 'lucide-react';
import { getActiveMomentPacks, getMomentPackResults } from '@/lib/moment-packs';
import type { MomentPack } from '@/lib/moment-packs';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import { getVodStreams, buildVodUrl, buildVodFallbackUrl, getTmdbMap, getVodByCategory, vodDbToStream, searchVod } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { TMDB_GENRES } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { VeeCollectionRow } from '@/components/ui/VeeCollectionRow';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { NeonGate, RowCountBadge, cardScaleStyle } from '@/components/ui/NeonGate';
import { MOVIE_TABS, GENRE_FILTERS, SORT_MODES, VEE_MOVIE_COLLECTIONS, type SortMode, type VeeMovieCollection } from '@/lib/movie-collections';
import { t, useLanguage } from '@/i18n';
import { useSmartSticky } from '@/hooks/useSmartSticky';
import type { TranslationKey } from '@/i18n';
import type { Channel } from '@/types';

// ── Moment pack icon map (Lucide components by name) ─────────────
const MOMENT_ICON_MAP: Record<string, React.ReactNode> = {
  Moon: <Moon className="w-3.5 h-3.5" />,
  TrendingUp: <TrendingUp className="w-3.5 h-3.5" />,
  Coffee: <Coffee className="w-3.5 h-3.5" />,
  Rabbit: <Rabbit className="w-3.5 h-3.5" />,
  Heart: <Heart className="w-3.5 h-3.5" />,
  Users: <Users className="w-3.5 h-3.5" />,
  Zap: <Zap className="w-3.5 h-3.5" />,
  Brain: <Brain className="w-3.5 h-3.5" />,
};

const SORT_NAME_MAP: Record<string, TranslationKey> = {
  'Smart': 'sortSmart',
  'Top Rated': 'sortTopRated',
  'Newest': 'sortNewest',
  'A-Z': 'sortAZ',
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
  'New & Hot': 'tabNewHot',
  'Hollywood': 'tabHollywood',
  'Bollywood': 'tabBollywood',
  'International': 'tabInternational',
};

// ── Static styles (extracted to avoid re-creation on every render) ──

const HERO_HEIGHT_STYLE = { height: 'clamp(140px, 25vh, 280px)' } as const;
const HERO_BACKDROP_STYLE = { backgroundAttachment: 'scroll' as const, transform: 'scale(1.05)' };
const HERO_PLAY_BTN_STYLE = { background: 'linear-gradient(135deg, #9D4EDD, #7B2FBE)' } as const;
const FALLBACK_TITLE_STYLE = { fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' } as const;
const FALLBACK_ACCENT_STYLE = { background: 'linear-gradient(90deg, rgba(245,158,11,0.5) 0%, rgba(245,158,11,0.15) 60%, transparent 100%)' } as const;
const MOMENT_FONT_STYLE = { fontFamily: "'Space Grotesk', sans-serif" } as const;
const RETRY_BTN_STYLE = {
  background: 'linear-gradient(135deg, rgba(157,78,221,0.15) 0%, rgba(157,78,221,0.06) 100%)',
  border: '1px solid rgba(157,78,221,0.25)',
  color: 'rgba(157,78,221,0.85)',
} as const;
const SHOW_MORE_BTN_STYLE = {
  background: 'linear-gradient(135deg, rgba(157,78,221,0.06) 0%, rgba(157,78,221,0.02) 100%)',
  border: '1px solid rgba(157,78,221,0.1)',
} as const;
const SHOW_MORE_HOVER_STYLE = { background: 'linear-gradient(90deg, transparent 0%, rgba(157,78,221,0.04) 50%, transparent 100%)' } as const;
const SHOW_MORE_TEXT_STYLE = { color: 'rgba(157,78,221,0.55)' } as const;
const SHOW_MORE_COUNT_STYLE = { color: 'rgba(255,255,255,0.25)' } as const;

// ── Scoring ──────────────────────────────────────────────────────

function getTrendingScore(movie: VodStream, tmdbMap: Record<string, TmdbEntry>): number {
  const tmdb = tmdbMap[`m:${movie.stream_id}`];
  if (!tmdb) return 0;

  // Rating: 40% weight (normalized 0-1)
  const ratingScore = Math.min((tmdb.r || 0) / 10, 1);

  // Freshness: 30% weight — year from title or added timestamp
  let freshnessScore = 0.2;
  if (movie.added) {
    const addedTs = parseInt(movie.added, 10);
    if (addedTs > 0) {
      const daysAgo = (Date.now() / 1000 - addedTs) / 86400;
      if (daysAgo < 7) freshnessScore = 1.0;
      else if (daysAgo < 30) freshnessScore = 0.85;
      else if (daysAgo < 90) freshnessScore = 0.65;
      else if (daysAgo < 365) freshnessScore = 0.4;
    }
  } else {
    const yearMatch = movie.name.match(/\((\d{4})\)/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2026) freshnessScore = 1.0;
      else if (year === 2025) freshnessScore = 0.85;
      else if (year === 2024) freshnessScore = 0.7;
      else if (year === 2023) freshnessScore = 0.5;
    }
  }

  // Popularity indicator: 20% — has trailer + has poster + genre breadth
  const hasTrailer = tmdb.y ? 0.4 : 0;
  const hasPoster = tmdb.p ? 0.3 : 0;
  const genreBreadth = Math.min((tmdb.g?.length || 0) / 4, 1) * 0.3;
  const popularityScore = hasTrailer + hasPoster + genreBreadth;

  // Genre diversity bonus: 10% — reward movies that span multiple genres
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
  const [loading, setLoading] = useState(true);
  const [moviesError, setMoviesError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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

  // ── Derived ──────────────────────────────────────────────────

  const currentParent = useMemo(() =>
    MOVIE_TABS.find(t => t.id === activeParent) || MOVIE_TABS[0], [activeParent]);

  const currentSubtab = useMemo(() =>
    currentParent.subtabs.find(s => s.id === activeSubtab) || currentParent.subtabs[0],
    [currentParent, activeSubtab]);

  const isSearching = debouncedQuery.trim().length > 0;
  const hasTmdb = Object.keys(tmdbMap).length > 0;

  // ── Effects ──────────────────────────────────────────────────

  useEffect(() => { getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP)); }, []);

  // PERF: startTransition keeps input responsive during heavy search rendering (INP)
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => setDebouncedQuery(searchQuery));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset displayLimit when navigation changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [activeParent, activeSubtab, activeGenre]);

  // Parent change → reset subtab, genre, scroll
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

  // Fetch movies for subtab
  useEffect(() => {
    let mounted = true;
    const catIds = currentSubtab.categoryIds;
    if (!catIds.length) { setMovies([]); setLoading(false); return; }

    async function load() {
      setLoading(true);
      setMoviesError(false);
      try {
        // Supabase-first: try DB, fall back to Xtream API
        const sbResults = await Promise.allSettled(catIds.map(id => getVodByCategory(id)));
        const sbMerged: VodStream[] = [];
        const seen = new Set<number>();
        for (const r of sbResults) {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            for (const m of r.value) {
              if (!seen.has(m.id)) { seen.add(m.id); sbMerged.push(vodDbToStream(m)); }
            }
          }
        }
        if (sbMerged.length > 0) {
          if (mounted) setMovies(sbMerged);
        } else {
          // Fallback to Xtream API
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
        if (mounted) { setMovies([]); setMoviesError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials, currentSubtab, retryKey]);

  // Search
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
          // Supabase search — scoped to current category, falls back to global
          const catIds = currentSubtab.categoryIds;
          const sbResults = await searchVod(q, LIMIT, catIds.length > 0 ? catIds : undefined);
          if (sbResults.length > 0) {
            if (mounted) { setSearchResults(sbResults.map(vodDbToStream).slice(0, LIMIT)); setSearchTruncated(sbResults.length >= LIMIT); }
            if (mounted) setSearchLoading(false);
            return;
          }
          // Fallback to Xtream category search
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

  // ── Genre filter + Sort (the smart layer) ────────────────────

  const filteredAndSorted = useMemo(() => {
    const source = isSearching ? searchResults : movies;

    // Step 1: Genre filter (TMDB-powered)
    let filtered = source;
    if (activeGenre !== 0 && hasTmdb) {
      filtered = source.filter(m => {
        const tmdb = tmdbMap[`m:${m.stream_id}`];
        return tmdb?.g?.includes(activeGenre);
      });
    }

    // Step 2: Sort
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
    // smart: pre-compute scores once, then sort by lookup (not O(n log n) function calls)
    const scoreMap = new Map<number, number>();
    for (const m of filtered) scoreMap.set(m.stream_id, getTrendingScore(m, tmdbMap));
    return [...filtered].sort((a, b) => (scoreMap.get(b.stream_id) || 0) - (scoreMap.get(a.stream_id) || 0));
  }, [movies, searchResults, isSearching, activeGenre, sortMode, tmdbMap, hasTmdb]);

  // ── Genre counts (how many movies per genre in current view) ──

  const genreCounts = useMemo(() => {
    if (!hasTmdb) return {};
    const source = isSearching ? searchResults : movies;
    const counts: Record<number, number> = {};
    for (const m of source) {
      const tmdb = tmdbMap[`m:${m.stream_id}`];
      if (tmdb?.g) {
        for (const g of tmdb.g) counts[g] = (counts[g] || 0) + 1;
      }
    }
    return counts;
  }, [movies, searchResults, isSearching, tmdbMap, hasTmdb]);

  // Only show genre filters that have content
  const activeGenreFilters = useMemo(() =>
    GENRE_FILTERS.filter(g => g.id === 0 || (genreCounts[g.id] || 0) > 0),
    [genreCounts]);

  // ── Trending row ─────────────────────────────────────────────

  const trendingMovies = useMemo(() => {
    if (!['new', 'hollywood'].includes(activeParent) || !hasTmdb) return [];
    return movies
      .map(m => ({ movie: m, score: getTrendingScore(m, tmdbMap) }))
      .filter(s => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map(s => s.movie);
  }, [movies, tmdbMap, activeParent, hasTmdb]);

  // ── Moment pack rows (New & Hot only) ────────────────────────

  const momentRows = useMemo(() => {
    if (activeParent !== 'new' || !hasTmdb || movies.length === 0) return [];
    const hour = new Date().getHours();
    const activePacks = getActiveMomentPacks(hour);

    return activePacks
      .map(pack => {
        const streamKeys = getMomentPackResults(pack, tmdbMap, 12);
        // Resolve stream keys to VodStream objects
        const items = streamKeys
          .map(key => {
            const streamId = parseInt(key.replace('m:', ''), 10);
            return movies.find(m => m.stream_id === streamId);
          })
          .filter((m): m is VodStream => m !== undefined);
        return items.length >= 4 ? { pack, items } : null;
      })
      .filter((row): row is { pack: MomentPack; items: VodStream[] } => row !== null);
  }, [movies, tmdbMap, activeParent, hasTmdb]);

  // ── VEE intelligence rows ────────────────────────────────────

  const veeCollectionRows = useMemo(() => {
    if (!hasTmdb || movies.length === 0) return [];
    const currentHour = new Date().getHours();
    return VEE_MOVIE_COLLECTIONS
      .filter(col => {
        // Time-aware visibility
        if (col.visibleAfterHour !== undefined && currentHour < col.visibleAfterHour) return false;
        // Parent tab filter
        return !col.parentTabs || col.parentTabs.length === 0 || col.parentTabs.includes(activeParent);
      })
      .map(col => {
        let pool: VodStream[];
        if (col.categoryIds && col.categoryIds.length > 0) {
          // Category-based collection: filter by category_id
          const catSet = new Set(col.categoryIds);
          pool = movies.filter(m => catSet.has(m.category_id));
        } else {
          pool = movies.filter(m => col.filter(m, tmdbMap[`m:${m.stream_id}`] || null));
        }
        const sorted = [...pool].sort((a, b) => col.sort(a, b, tmdbMap));
        const items = sorted.slice(0, col.limit).map(m => ({
          id: m.stream_id,
          name: m.name,
          poster: m.stream_icon,
          rating: m.rating,
          tmdbKey: `m:${m.stream_id}`,
        }));
        return items.length >= 3 ? { collection: col, items } : null;
      })
      .filter(Boolean) as { collection: VeeMovieCollection; items: { id: number; name: string; poster: string; rating?: string; tmdbKey: string }[] }[];
  }, [movies, tmdbMap, hasTmdb, activeParent]);

  // ── Hero billboard — pick highest-rated recent movie with backdrop ──

  const heroMovie = useMemo(() => {
    if (!hasTmdb || movies.length === 0) return null;
    // Find highest-rated recent item with a TMDB backdrop
    const candidates = movies
      .map(m => {
        const tmdb = tmdbMap[`m:${m.stream_id}`];
        if (!tmdb?.p || !tmdb.r) return null;
        const year = parseYear(m.name);
        if (year < 2023) return null;
        return { movie: m, tmdb, score: tmdb.r + (year >= 2025 ? 2 : year >= 2024 ? 1 : 0) };
      })
      .filter(Boolean) as { movie: VodStream; tmdb: TmdbEntry; score: number }[];
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }, [movies, tmdbMap, hasTmdb]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleParentChange = useCallback((id: string) => {
    setActiveParent(id);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const displayLoading = isSearching ? searchLoading : loading;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="pt-16 pb-32">
      {/* ── Hero Billboard ── */}
      {heroMovie ? (
        <div className="relative overflow-hidden" style={HERO_HEIGHT_STYLE}>
          {/* Backdrop image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/w1280${heroMovie.tmdb.p})`,
              ...HERO_BACKDROP_STYLE,
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-[#060609]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060609]/80 via-transparent to-transparent" />
          {/* Content — bottom left */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
            <h1 className="text-[24px] md:text-[32px] font-black text-white tracking-tight leading-tight line-clamp-2 mb-2">
              {heroMovie.movie.name.replace(/\s*\(\d{4}\)\s*$/, '')}
            </h1>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {heroMovie.tmdb.r > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[11px] font-bold">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {heroMovie.tmdb.r.toFixed(1)}
                </span>
              )}
              {(() => { const ym = heroMovie.movie.name.match(/\((\d{4})\)/); return ym ? <span className="text-[11px] text-white/50 font-medium">{ym[1]}</span> : null; })()}
              {heroMovie.tmdb.g?.slice(0, 3).map(gid => (
                <span key={gid} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/60 font-medium">
                  {TMDB_GENRES[gid] || ''}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDetailMovie(heroMovie.movie)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={HERO_PLAY_BTN_STYLE}
              >
                <Play className="w-4 h-4 fill-white" />
                Play
              </button>
              <button
                onClick={() => setDetailMovie(heroMovie.movie)}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-16 pb-5 px-5">
          <h1 className="text-[22px] font-semibold text-white/85 tracking-tight" style={FALLBACK_TITLE_STYLE}>Cinema</h1>
          <div className="w-16 h-[2px] rounded-full mt-2" style={FALLBACK_ACCENT_STYLE} />
        </div>
      )}

      {/* ── Smart sticky — hides on sustained scroll, peeks back after 2s idle ── */}
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
            {/* Parent tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {MOVIE_TABS.map(tab => (
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

            {/* Genre filter pills (TMDB-powered) — only show when we have content */}
            {!loading && movies.length > 0 && activeGenreFilters.length > 2 && (
              <div ref={genreScrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2.5 pt-0.5">
                {activeGenreFilters.map(g => (
                  <button key={g.id} onClick={() => setActiveGenre(g.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors duration-300 ${
                      activeGenre === g.id
                        ? 'bg-primary/20 text-primary-light border border-primary/30'
                        : 'text-white/20 hover:text-white/40'
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
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-white/25 hover:text-white/50 transition-colors">
                    <SlidersHorizontal className="w-3 h-3" />
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

      {/* ── Trending row ── */}
      {!isSearching && !loading && activeGenre === 0 && trendingMovies.length >= 5 && (
        <div className="px-4 pt-6 pb-3">
          <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {t(lang, 'trendingNow')}
            <RowCountBadge count={trendingMovies.length} label="movies" />
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 items-end">
            {trendingMovies.map((m, i) => (
              <div key={m.stream_id} className="flex-shrink-0 w-[120px]" style={cardScaleStyle(i)}>
                <PosterCard title={m.name} poster={m.stream_icon} rating={m.rating}
                  tmdbData={tmdbMap[`m:${m.stream_id}`]} onClick={() => setDetailMovie(m)} />
              </div>
            ))}
            <NeonGate navigateTo="/movies" />
          </div>
        </div>
      )}

      {/* ── Moment pack rows ── */}
      {!isSearching && activeGenre === 0 && momentRows.length > 0 && (
        <div className="space-y-7 py-5 mb-6">
          {momentRows.map(({ pack, items }) => (
            <section key={pack.id}>
              <div className="px-4 mb-2">
                <h3 className="text-[15px] font-semibold text-white/50 flex items-center gap-1.5" style={MOMENT_FONT_STYLE}>
                  <span className="text-white/30">{MOMENT_ICON_MAP[pack.icon]}</span>
                  {t(lang, pack.nameKey as TranslationKey)}
                  <RowCountBadge count={items.length} label="movies" />
                </h3>
              </div>
              <div className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2 items-end">
                {items.map((m, i) => (
                  <div key={m.stream_id} className="flex-shrink-0 w-[108px]" style={cardScaleStyle(i)}>
                    <PosterCard title={m.name} poster={m.stream_icon} rating={m.rating}
                      tmdbData={tmdbMap[`m:${m.stream_id}`]} onClick={() => setDetailMovie(m)} />
                  </div>
                ))}
                <NeonGate navigateTo="/movies" />
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── VEE Intelligence rows — with breathing hierarchy ── */}
      {!isSearching && !loading && activeGenre === 0 && veeCollectionRows.length > 0 && (
        <div className="py-5 mb-4">
          {veeCollectionRows.map(({ collection, items }, rowIndex) => {
            // Row breathing: first row = Top 10 (140px), second = 120px, rest = 108px
            const isFirstRow = rowIndex === 0;
            const isSecondRow = rowIndex === 1;
            const cardWidth = isFirstRow ? 140 : isSecondRow ? 120 : 108;
            return (
              <React.Fragment key={collection.id}>
                <div className="mb-8">
                  <VeeCollectionRow
                    name={collection.name}
                    tagline=""
                    items={isFirstRow ? items.slice(0, 10) : items}
                    tmdbMap={tmdbMap}
                    isTop10={isFirstRow}
                    cardWidth={cardWidth}
                    navigateTo="/movies"
                    countLabel="movies"
                    onItemClick={(id) => {
                      const movie = movies.find(m => m.stream_id === id);
                      if (movie) setDetailMovie(movie);
                    }}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Active filter indicator ── */}
      {activeGenre !== 0 && !loading && (
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <span className="text-xs text-white/30">
            {filteredAndSorted.length} {(() => { const gn = GENRE_FILTERS.find(g => g.id === activeGenre)?.name; return gn && GENRE_NAME_MAP[gn] ? t(lang, GENRE_NAME_MAP[gn]) : gn; })()} {t(lang, 'moviesLabel')}
          </span>
          <button onClick={() => setActiveGenre(0)} className="text-[10px] text-primary/60 hover:text-primary">{t(lang, 'clearFilter')}</button>
        </div>
      )}

      {/* ── Movie grid ── */}
      {displayLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" text={isSearching ? t(lang, 'searchingEllipsis') : t(lang, 'loading')} />
        </div>
      ) : moviesError && !isSearching ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-text-muted text-sm">{t(lang, 'unableToLoadRetry')}</p>
          <button onClick={() => { setMoviesError(false); setLoading(true); setRetryKey(k => k + 1); }}
            className="group px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={RETRY_BTN_STYLE}>{t(lang, 'retry')}</button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        isSearching || activeGenre !== 0 ? (
          <EmptyState icon="film" title={isSearching ? t(lang, 'noMoviesMatch') : t(lang, 'noMoviesGenre')} subtitle="Try a different search or genre" />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted text-sm gap-2">
            {t(lang, 'noMoviesInCategory')}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 p-5 cv-auto-grid" style={{ contain: 'content' }}>
            {(isSearching ? filteredAndSorted : filteredAndSorted.slice(0, displayLimit)).map(movie => (
              <div key={movie.stream_id} className="relative group/card">
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
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-10 hover:bg-black/90"
                  title={t(lang, 'download')}>
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
          {!isSearching && filteredAndSorted.length > displayLimit && (
            <div className="flex flex-col items-center gap-1 pb-8 mt-4 mb-4">
              <button
                onClick={() => startTransition(() => setDisplayLimit(prev => prev + PAGE_SIZE))}
                className="group w-full relative overflow-hidden rounded-2xl py-3.5 transition-all duration-300 hover:scale-[1.005] active:scale-[0.995]"
                style={SHOW_MORE_BTN_STYLE}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={SHOW_MORE_HOVER_STYLE}
                />
                <div className="relative flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium tracking-[0.15em] uppercase" style={SHOW_MORE_TEXT_STYLE}>
                      {t(lang, 'showMore')}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:translate-y-0.5 transition-transform duration-300">
                      <path d="M6 2v8M2 6l4 4 4-4" stroke="rgba(157,78,221,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-mono" style={SHOW_MORE_COUNT_STYLE}>
                    {t(lang, 'showing')} {Math.min(displayLimit, filteredAndSorted.length).toLocaleString()} {t(lang, 'of')} {filteredAndSorted.length.toLocaleString()}
                  </span>
                </div>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal ── */}
      {detailMovie && (
        <ContentDetailModal
          streamId={detailMovie.stream_id} name={detailMovie.name}
          poster={detailMovie.stream_icon} rating={detailMovie.rating}
          containerExtension={detailMovie.container_extension} type="movie"
          tmdbData={tmdbMap[`m:${detailMovie.stream_id}`]} credentials={credentials}
          onPlay={knownDuration => {
            const tmdb = tmdbMap[`m:${detailMovie.stream_id}`];
            const duration = knownDuration || (tmdb?.t ? tmdb.t * 60 : undefined);
            const ext = detailMovie.container_extension || 'mp4';
            onPlay({
              id: `vod-${detailMovie.stream_id}`, name: detailMovie.name,
              url: buildVodUrl(credentials, detailMovie.stream_id, ext),
              logo: detailMovie.stream_icon, category: 'movie', knownDuration: duration,
              fallbackUrl: buildVodFallbackUrl(credentials, detailMovie.stream_id, ext, 'movie'),
            });
            setDetailMovie(null);
          }}
          onClose={() => setDetailMovie(null)}
        />
      )}
    </div>
  );
};
