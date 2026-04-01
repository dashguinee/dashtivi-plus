import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Download, Search, X, SlidersHorizontal, Moon, TrendingUp, Coffee, Rabbit, Heart, Users, Zap, Brain } from 'lucide-react';
import { getActiveMomentPacks, getMomentPackResults } from '@/lib/moment-packs';
import type { MomentPack } from '@/lib/moment-packs';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import { getVodStreams, buildVodUrl, getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { VeeCollectionRow } from '@/components/ui/VeeCollectionRow';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MOVIE_TABS, GENRE_FILTERS, SORT_MODES, VEE_MOVIE_COLLECTIONS, type SortMode, type VeeMovieCollection } from '@/lib/movie-collections';
import { t, useLanguage } from '@/i18n';
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
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
        if (catIds.length === 1) {
          const result = await getVodStreams(credentials, catIds[0]);
          if (mounted) setMovies(result);
        } else {
          const results = await Promise.allSettled(catIds.map(id => getVodStreams(credentials, id)));
          if (!mounted) return;
          const seen = new Set<number>();
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
  }, [debouncedQuery, credentials, movies, currentParent]);

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

    return [...filtered].sort((a, b) => {
      const ta = tmdbMap[`m:${a.stream_id}`];
      const tb = tmdbMap[`m:${b.stream_id}`];
      if (sortMode === 'rating') return (tb?.r || 0) - (ta?.r || 0);
      if (sortMode === 'newest') return parseYear(b.name) - parseYear(a.name);
      // smart: trending score
      return getTrendingScore(b, tmdbMap) - getTrendingScore(a, tmdbMap);
    });
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
      .slice(0, 15)
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
    return VEE_MOVIE_COLLECTIONS
      .filter(col => !col.parentTabs || col.parentTabs.length === 0 || col.parentTabs.includes(activeParent))
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
      {/* ── Page Identity Header — Cinema ── */}
      <div className="relative overflow-hidden" style={{ height: '120px' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-[#060609] to-[#060609]" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-800/10 to-transparent" />
        <div className="relative h-full flex flex-col justify-end px-5 pb-5">
          <h1 className="text-[28px] font-black text-white tracking-tight leading-none">Cinema</h1>
          <p className="text-[11px] text-white/25 tracking-widest uppercase mt-1.5">The big screen, in your hands</p>
        </div>
      </div>

      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-20 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/5">
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
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {trendingMovies.map(m => (
              <div key={m.stream_id} className="flex-shrink-0 w-[120px]">
                <PosterCard title={m.name} poster={m.stream_icon} rating={m.rating}
                  tmdbData={tmdbMap[`m:${m.stream_id}`]} onClick={() => setDetailMovie(m)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Moment pack rows ── */}
      {!isSearching && activeGenre === 0 && momentRows.length > 0 && (
        <div className="space-y-7 py-5 mb-6">
          {momentRows.map(({ pack, items }) => (
            <section key={pack.id}>
              <div className="px-4 mb-2">
                <h3 className="text-[15px] font-semibold text-white/50 flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <span className="text-white/30">{MOMENT_ICON_MAP[pack.icon]}</span>
                  {t(lang, pack.nameKey as TranslationKey)}
                </h3>
                <p className="text-[11px] text-white/25 mt-0.5">{t(lang, pack.descKey as TranslationKey)}</p>
              </div>
              <div className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2">
                {items.map(m => (
                  <div key={m.stream_id} className="flex-shrink-0 w-[108px]">
                    <PosterCard title={m.name} poster={m.stream_icon} rating={m.rating}
                      tmdbData={tmdbMap[`m:${m.stream_id}`]} onClick={() => setDetailMovie(m)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="mx-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.08), transparent)' }} />
        </div>
      )}

      {/* ── VEE Intelligence rows ── */}
      {!isSearching && !loading && activeGenre === 0 && veeCollectionRows.length > 0 && (
        <div className="space-y-7 py-5 mb-4">
          {veeCollectionRows.map(({ collection, items }) => (
            <VeeCollectionRow
              key={collection.id}
              name={collection.name}
              tagline={collection.tagline}
              items={items}
              tmdbMap={tmdbMap}
              onItemClick={(id) => {
                const movie = movies.find(m => m.stream_id === id);
                if (movie) setDetailMovie(movie);
              }}
            />
          ))}
          <div className="mx-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.08), transparent)' }} />
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
            className="px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors">{t(lang, 'retry')}</button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted text-sm gap-2">
          {isSearching ? t(lang, 'noMoviesMatch') : activeGenre !== 0 ? (
            <>
              <span>{t(lang, 'noMoviesGenre')}</span>
              <button onClick={() => setActiveGenre(0)} className="text-primary text-xs">{t(lang, 'showAll')}</button>
            </>
          ) : t(lang, 'noMoviesInCategory')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 p-5">
            {(isSearching ? filteredAndSorted : filteredAndSorted.slice(0, displayLimit)).map(movie => (
              <div key={movie.stream_id} className="relative group/card">
                <PosterCard title={movie.name} poster={movie.stream_icon} rating={movie.rating}
                  tmdbData={tmdbMap[`m:${movie.stream_id}`]} onClick={() => setDetailMovie(movie)} />
                <button onClick={e => {
                    e.stopPropagation();
                    window.open(buildVodUrl(credentials, movie.stream_id, movie.container_extension || 'mp4'), '_blank', 'noopener,noreferrer');
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-10 hover:bg-black/90"
                  title={t(lang, 'download')}>
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
          {!isSearching && filteredAndSorted.length > displayLimit && (
            <div className="flex flex-col items-center gap-3 pb-8 mt-6 mb-4">
              <p className="text-xs text-white/30 text-center">
                {t(lang, 'showing')} {Math.min(displayLimit, filteredAndSorted.length).toLocaleString()} {t(lang, 'of')} {filteredAndSorted.length.toLocaleString()}
              </p>
              <button
                onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-sm text-white/50 hover:text-white hover:bg-white/10 transition-[color,background-color] duration-300 show-more-breathe"
              >
                {t(lang, 'showMore')}
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
            onPlay({
              id: `vod-${detailMovie.stream_id}`, name: detailMovie.name,
              url: buildVodUrl(credentials, detailMovie.stream_id, detailMovie.container_extension || 'mp4'),
              logo: detailMovie.stream_icon, category: 'movie', knownDuration: duration,
            });
            setDetailMovie(null);
          }}
          onClose={() => setDetailMovie(null)}
        />
      )}
    </div>
  );
};
