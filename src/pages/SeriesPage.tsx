import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Play, X, Download, Search } from 'lucide-react';
import type { XtreamCredentials, LiveCategory, SeriesItem, SeriesInfo, Episode } from '@/lib/xtream';
import { getSeriesCategories, getSeries, getSeriesInfo, buildSeriesUrl, getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Channel } from '@/types';

// Featured series categories (IDs from Starshare API)
const FEATURED_CATS = [
  { id: '106', name: 'Netflix' },
  { id: '108', name: 'Amazon Prime' },
  { id: '188', name: 'HBO Max' },
  { id: '654', name: 'Disney+' },
  { id: '114', name: 'Apple TV+' },
  { id: '209', name: 'Hulu' },
  { id: '249', name: 'Paramount+' },
  { id: '110', name: 'Starz' },
  { id: '369', name: 'Australian' },
];

const PLATFORM_LOGOS: Record<string, { logo: string; color: string }> = {
  '106': { logo: '/logos/netflix.svg', color: '#E50914' },
  '108': { logo: '/logos/prime.svg', color: '#00A8E1' },
  '188': { logo: '/logos/hbo.svg', color: '#9D4EDD' },
  '654': { logo: '/logos/disney-plus.svg', color: '#113CCF' },
  '114': { logo: '/logos/apple-tv.svg', color: '#1d1d1f' },
  '209': { logo: '/logos/hulu.svg', color: '#1CE783' },
  '249': { logo: '/logos/paramount.svg', color: '#0064FF' },
  '110': { logo: '/logos/starz.svg', color: '#1a1a2e' },
};

function getTrendingScore(tmdbKey: string, tmdbMap: Record<string, TmdbEntry>, name: string): number {
  const tmdb = tmdbMap[tmdbKey];
  if (!tmdb) return 0;
  const ratingScore = Math.min((tmdb.r || 0) / 10, 1);
  const yearMatch = name.match(/\((\d{4})\)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 0;
  const age = 2026 - year;
  const freshnessScore = age <= 0 ? 1.0 : age === 1 ? 0.85 : age === 2 ? 0.7 : age === 3 ? 0.5 : 0.3;
  return ratingScore * 0.55 + freshnessScore * 0.35 + (tmdb.y ? 0.1 : 0);
}

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const SeriesPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string>(FEATURED_CATS[0].id);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailSeries, setDetailSeries] = useState<SeriesItem | null>(null);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SeriesItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim() || !credentials) {
      setSearchResults([]);
      return;
    }
    let mounted = true;
    async function search() {
      setSearchLoading(true);
      try {
        // Search across all featured categories
        const results = await Promise.allSettled(
          FEATURED_CATS.map(c => getSeries(credentials!, c.id).catch(() => []))
        );
        const all: SeriesItem[] = [];
        const seen = new Set<number>();
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const s of r.value) {
              if (!seen.has(s.series_id)) { seen.add(s.series_id); all.push(s); }
            }
          }
        }
        const q = debouncedQuery.toLowerCase();
        const filtered = all.filter(s => s.name.toLowerCase().includes(q));
        if (mounted) setSearchResults(filtered);
      } catch {
        if (mounted) setSearchResults([]);
      } finally {
        if (mounted) setSearchLoading(false);
      }
    }
    search();
    return () => { mounted = false; };
  }, [debouncedQuery, credentials]);

  const isSearching = debouncedQuery.trim().length > 0;

  const trendingSeries = useMemo(() => {
    if (Object.keys(tmdbMap).length === 0) return [];
    return seriesList
      .map(s => ({ series: s, score: getTrendingScore(`s:${s.series_id}`, tmdbMap, s.name) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(s => s.series);
  }, [seriesList, tmdbMap]);

  const scoredSeries = useMemo(() => {
    const list = isSearching ? searchResults : seriesList;
    if (Object.keys(tmdbMap).length === 0) return list;
    return [...list].sort((a, b) =>
      getTrendingScore(`s:${b.series_id}`, tmdbMap, b.name) - getTrendingScore(`s:${a.series_id}`, tmdbMap, a.name)
    );
  }, [seriesList, searchResults, isSearching, tmdbMap]);

  // Series detail modal
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [activeSeason, setActiveSeason] = useState<string>('');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [episodesUnavailable, setEpisodesUnavailable] = useState(false);
  const [seriesError, setSeriesError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // #18: 15-second timeout for episodes loading (MKV on slow networks needs FFmpeg probe time)
  useEffect(() => {
    if (!loadingInfo) return;
    const t = setTimeout(() => {
      // If still loading after 15s, mark episodes as unavailable
      setEpisodesUnavailable(true);
      setLoadingInfo(false);
    }, 15000);
    return () => clearTimeout(t);
  }, [loadingInfo]);

  // Lazy-load TMDB map for detail modal metadata
  useEffect(() => {
    getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP));
  }, []);

  // Load categories
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cats = await getSeriesCategories(credentials);
        if (mounted) setCategories(cats);
      } catch {
        // silent
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials]);

  // Load series for active category
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setSeriesError(false);
      try {
        const result = await getSeries(credentials, activeCat);
        if (mounted) setSeriesList(result);
      } catch {
        // #13: show error state on failure
        if (mounted) { setSeriesList([]); setSeriesError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials, activeCat, retryKey]);

  // Load series info when selected
  const handleSelectSeries = useCallback(
    async (series: SeriesItem) => {
      setSelectedSeries(series);
      setLoadingInfo(true);
      setSeriesInfo(null);
      setEpisodesUnavailable(false);
      try {
        const info = await getSeriesInfo(credentials, series.series_id);
        setSeriesInfo(info);
        // API returns episodes under 'episodes' key, keyed by season number
        const seasonKeys = Object.keys(info.episodes || {});
        if (seasonKeys.length > 0) setActiveSeason(seasonKeys[0]);
        // #18: episodes loaded — cancel the timeout by clearing loadingInfo
        setLoadingInfo(false);
      } catch {
        setEpisodesUnavailable(true);
        setLoadingInfo(false);
      }
    },
    [credentials]
  );

  const handlePlayEpisode = useCallback(
    (episode: Episode) => {
      onPlay({
        id: `series-${episode.id}`,
        name: `${selectedSeries?.name || ''} - ${episode.title || `E${episode.episode_num}`}`,
        url: buildSeriesUrl(credentials, episode.id, episode.container_extension || 'mp4'),
        logo: selectedSeries?.cover,
        category: 'series',
      });
      setSelectedSeries(null);
    },
    [credentials, onPlay, selectedSeries]
  );

  const closeModal = () => {
    setSelectedSeries(null);
    setSeriesInfo(null);
    setActiveSeason('');
    setEpisodesUnavailable(false);
  };

  // Merge featured + API categories
  const displayCats: { id: string; name: string }[] = [...FEATURED_CATS];
  const featuredIds = new Set(FEATURED_CATS.map((c) => c.id));
  for (const cat of categories) {
    if (!featuredIds.has(cat.category_id)) {
      displayCats.push({ id: cat.category_id, name: cat.category_name });
    }
  }

  const seasons = seriesInfo ? Object.keys(seriesInfo.episodes || {}) : [];
  const episodes = seriesInfo && activeSeason ? seriesInfo.episodes[activeSeason] || [] : [];

  return (
    <div className="pt-16 pb-4">
      {/* Search + Category pills */}
      <div className="sticky top-14 z-20 py-3 px-4 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5">
        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search series..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-3 h-3 text-text-secondary" />
            </button>
          )}
        </div>
        {!isSearching && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {displayCats.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCat === cat.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {PLATFORM_LOGOS[cat.id]?.logo && (
                  <img src={PLATFORM_LOGOS[cat.id].logo} alt="" className="h-4 w-auto" />
                )}
                {cat.name}
              </button>
            ))}
          </div>
        )}
        {isSearching && (
          <p className="text-xs text-text-secondary pb-1">
            {searchLoading ? 'Searching...' : `${searchResults.length} series found`}
          </p>
        )}
      </div>

      {/* Trending row */}
      {!isSearching && !loading && trendingSeries.length >= 5 && (
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Trending Right Now
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {trendingSeries.map(series => (
              <div key={series.series_id} className="flex-shrink-0 w-[120px]">
                <PosterCard title={series.name} poster={series.cover} rating={series.rating} tmdbData={tmdbMap[`s:${series.series_id}`]} onClick={() => setDetailSeries(series)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Series grid */}
      {(isSearching ? searchLoading : loading) ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Loading series..." />
        </div>
      ) : seriesError && !isSearching ? (
        // #13: error state for failed fetch
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-text-muted text-sm">Unable to load — tap to retry</p>
          <button
            onClick={() => { setSeriesError(false); setLoading(true); setRetryKey(k => k + 1); }}
            className="px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors"
          >
            Retry
          </button>
        </div>
      ) : scoredSeries.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm">
          {isSearching ? 'No series match your search' : 'No series found in this category'}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
          {scoredSeries.map((series) => (
            <PosterCard
              key={series.series_id}
              title={series.name}
              poster={series.cover}
              rating={series.rating}
              categoryId={isSearching ? undefined : activeCat}
              tmdbData={tmdbMap[`s:${series.series_id}`]}
              onClick={() => setDetailSeries(series)}
            />
          ))}
        </div>
      )}

      {/* ContentDetailModal — metadata + trailer, opens episode picker on play */}
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

      {/* Series Detail Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSelectedSeries(null)}>
          <div className="w-full max-w-lg max-h-[85vh] bg-[#141414] rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up border border-white/10" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="relative h-48 overflow-hidden">
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
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <h2 className="text-xl font-bold text-white">{selectedSeries.name}</h2>
              </div>
            </div>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" text="Loading episodes..." />
              </div>
            ) : episodesUnavailable ? (
              // #18: show when episodes failed or timed out
              <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                Episodes unavailable
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
                        Season {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Episodes */}
                <div className="space-y-2">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all text-left group"
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
                          {ep.title || `Episode ${ep.episode_num}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          S{ep.season} E{ep.episode_num} &middot; {ep.container_extension?.toUpperCase() || 'MP4'}
                        </p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = buildSeriesUrl(credentials, ep.id, ep.container_extension || 'mp4');
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-text-secondary" />
                      </button>
                    </div>
                  ))}
                  {episodes.length === 0 && (
                    <p className="text-sm text-text-muted text-center py-4">
                      No episodes available
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
