import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Play, Download, X } from 'lucide-react';
import type { XtreamCredentials, SeriesItem, SeriesInfo, Episode, VodStream } from '@/lib/xtream';
import { getSeries, getSeriesInfo, buildSeriesUrl, buildVodFallbackUrl, getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PLATFORMS } from '@/components/ui/PlatformShowcase';
import type { PlatformDef } from '@/components/ui/PlatformShowcase';
import type { Channel } from '@/types';

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

/** TMDB trending score */
function getTrendingScore(tmdbKey: string, tmdbMap: Record<string, TmdbEntry>, name: string): number {
  const tmdb = tmdbMap[tmdbKey];
  if (!tmdb) return 0;
  const ratingScore = Math.min((tmdb.r || 0) / 10, 1);
  const yearMatch = name.match(/\((\d{4})\)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 0;
  const age = 2026 - year;
  const freshnessScore = age <= 0 ? 1.0 : age === 1 ? 0.85 : age === 2 ? 0.7 : age === 3 ? 0.5 : 0.3;
  const trailerBonus = tmdb.y ? 0.1 : 0;
  return ratingScore * 0.55 + freshnessScore * 0.35 + trailerBonus;
}

export const PlatformsPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const [activePlatform, setActivePlatform] = useState<string>(PLATFORMS[0].id);
  const [seriesData, setSeriesData] = useState<Record<string, SeriesItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [detailSeries, setDetailSeries] = useState<SeriesItem | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [activeSeason, setActiveSeason] = useState<string>('');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [episodesUnavailable, setEpisodesUnavailable] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const GRID_PAGE_SIZE = 60;
  const [gridVisibleCount, setGridVisibleCount] = useState(GRID_PAGE_SIZE);

  // Reset visible count when platform changes
  useEffect(() => { setGridVisibleCount(GRID_PAGE_SIZE); }, [activePlatform]);

  // Load TMDB
  useEffect(() => {
    getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP));
  }, []);

  // Load series for active platform
  useEffect(() => {
    if (seriesData[activePlatform]) { setLoading(false); return; }
    let mounted = true;
    async function load() {
      setLoading(true);
      const platform = PLATFORMS.find(p => p.id === activePlatform);
      if (!platform) return;
      try {
        const results = await Promise.allSettled(
          platform.categoryIds.map(catId => getSeries(credentials, catId))
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
        if (mounted) {
          setSeriesData(prev => ({ ...prev, [activePlatform]: all }));
        }
      } catch { /* silent */ }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [activePlatform, credentials, seriesData]);

  // Episode timeout
  useEffect(() => {
    if (!loadingInfo) return;
    const t = setTimeout(() => { setEpisodesUnavailable(true); setLoadingInfo(false); }, 15000);
    return () => clearTimeout(t);
  }, [loadingInfo]);

  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform)!;
  const currentSeries = seriesData[activePlatform] || [];

  // Smart sort by TMDB
  const sortedSeries = useMemo(() => {
    if (!tmdbMap || Object.keys(tmdbMap).length === 0) return currentSeries;
    return [...currentSeries].sort((a, b) =>
      getTrendingScore(`s:${b.series_id}`, tmdbMap, b.name) -
      getTrendingScore(`s:${a.series_id}`, tmdbMap, a.name)
    );
  }, [currentSeries, tmdbMap]);

  const handleSelectSeries = useCallback(async (series: SeriesItem) => {
    setSelectedSeries(series);
    setLoadingInfo(true);
    setSeriesInfo(null);
    setEpisodesUnavailable(false);
    try {
      const info = await getSeriesInfo(credentials, series.series_id);
      setSeriesInfo(info);
      const seasonKeys = Object.keys(info.episodes || {});
      if (seasonKeys.length > 0) setActiveSeason(seasonKeys[0]);
      setLoadingInfo(false);
    } catch { setEpisodesUnavailable(true); setLoadingInfo(false); }
  }, [credentials]);

  const handlePlayEpisode = useCallback((episode: Episode) => {
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
  }, [credentials, onPlay, selectedSeries]);

  // Scroll to platform section on hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && PLATFORMS.find(p => p.id === hash)) {
      setActivePlatform(hash);
    }
  }, []);

  const seasons = seriesInfo ? Object.keys(seriesInfo.episodes || {}) : [];
  const episodes = seriesInfo && activeSeason ? seriesInfo.episodes[activeSeason] || [] : [];

  return (
    <div className="pt-16 pb-32">
      {/* Platform selector — premium pills with brand colors */}
      <div className="sticky top-14 z-20 py-3 px-4 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {PLATFORMS.map((p) => {
            const isActive = activePlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-[background-color,border-color,color] duration-300 relative overflow-hidden"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${p.color}30, ${p.colorEnd}20)`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? p.color + '50' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isActive ? `0 0 20px ${p.color}15` : 'none',
                }}
              >
                {/* Beam sweep on active pill */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${p.color}20, transparent)`,
                      backgroundSize: '200% 100%',
                      animation: 'beam-sweep 3s ease-in-out infinite alternate',
                    }}
                  />
                )}
                <img src={p.logo} alt="" className="h-4 w-auto relative z-10" />
                <span className={`relative z-10 ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {p.name}
                </span>
                {isActive && currentSeries.length > 0 && (
                  <span className="relative z-10 text-[10px] text-white/30 font-normal">
                    {currentSeries.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform hero bar — brand gradient */}
      <div
        className="mx-4 mt-4 mb-3 rounded-xl p-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentPlatform.color}15 0%, rgba(10,10,15,0.95) 60%, ${currentPlatform.colorEnd}08 100%)`,
          border: `1px solid ${currentPlatform.color}15`,
        }}
      >
        {/* Metallic beam on hero */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${currentPlatform.color}08 45%, ${currentPlatform.color}18 50%, ${currentPlatform.color}08 55%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: 'beam-sweep 5s ease-in-out infinite alternate',
          }}
        />
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${currentPlatform.color}15`, boxShadow: `0 0 24px ${currentPlatform.color}20` }}
          >
            <img src={currentPlatform.logo} alt="" className="h-6 w-auto" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{currentPlatform.name}</h1>
            <p className="text-xs text-white/40">
              {currentSeries.length > 0 ? `${currentSeries.length} series available` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Series grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text={`Loading ${currentPlatform.name}...`} />
        </div>
      ) : sortedSeries.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm">
          No series found
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
            {sortedSeries.slice(0, gridVisibleCount).map((series) => (
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
          {sortedSeries.length > gridVisibleCount && (
            <div className="flex flex-col items-center gap-3 px-4 mt-2 mb-4 pb-4">
              <p className="text-xs text-white/30">
                Showing {gridVisibleCount} of {sortedSeries.length} series
              </p>
              <button
                onClick={() => setGridVisibleCount(prev => prev + GRID_PAGE_SIZE)}
                className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-sm text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-[color,background-color] duration-300"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* ContentDetailModal */}
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

      {/* Episode picker modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSelectedSeries(null)}>
          <div className="w-full max-w-lg max-h-[85vh] bg-[#141414] rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-48 overflow-hidden">
              {selectedSeries.cover ? (
                <img src={selectedSeries.cover} alt={selectedSeries.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary-dark/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
              <button onClick={() => setSelectedSeries(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
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
              <div className="flex items-center justify-center py-12 text-text-muted text-sm">Episodes unavailable</div>
            ) : (
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                {seasons.length > 1 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    {seasons.map((s) => (
                      <button
                        key={s}
                        onClick={() => setActiveSeason(s)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          activeSeason === s ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                        }`}
                      >
                        Season {s}
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {episodes.map((ep) => (
                    <div key={ep.id} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-[background-color,border-color] duration-300 text-left group">
                      <button onClick={() => handlePlayEpisode(ep)} className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Play className="w-4 h-4 text-primary-light ml-0.5" />
                      </button>
                      <button onClick={() => handlePlayEpisode(ep)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-white truncate">{ep.title || `Episode ${ep.episode_num}`}</p>
                        <p className="text-xs text-text-muted">S{ep.season} E{ep.episode_num} &middot; {ep.container_extension?.toUpperCase() || 'MP4'}</p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = buildSeriesUrl(credentials, ep.id, ep.container_extension || 'mp4');
                          const a = document.createElement('a');
                          a.href = url;
                          const sName = (selectedSeries?.name || 'series').replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 60);
                          const eName = (ep.title || `E${ep.episode_num}`).replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 40);
                          a.download = `${sName}_S${ep.season}_${eName}.${ep.container_extension || 'mp4'}`;
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-text-secondary" />
                      </button>
                    </div>
                  ))}
                  {episodes.length === 0 && (
                    <p className="text-sm text-text-muted text-center py-4">No episodes available</p>
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
