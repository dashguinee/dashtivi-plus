import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { XtreamCredentials, SeriesItem, SeriesInfo, Episode } from '@/lib/xtream';
import { getSeriesInfo, buildSeriesUrl, buildVodFallbackUrl } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { Channel } from '@/types';
import { click as hapticClick } from '@/lib/haptics';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { SeriesExplorer } from '@/components/ui/SeriesExplorer';
import { CosmicClose } from '@/components/ui/CosmicClose';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ════════════════════════════════════════════════════════════════════
   SERIES DETAIL FLOW — the whole "open a series → pick an episode → play"
   journey, self-contained, so Le Mur can hold series covers next to movies
   without dragging in the old Series page.

   Cover tap (wall) → ContentDetailModal (metadata + trailer) → "Play" fetches
   the seasons/episodes lazily → the rising episode-picker sheet (SeriesExplorer)
   → play the chosen episode. Mirrors the proven SeriesPage flow (same sheet, same
   back-guard, same URL building) so behaviour is identical.
   ════════════════════════════════════════════════════════════════════ */

// Shared, bounded in-memory cache of fetched series info — instant reopen.
const seriesInfoMemCache = new Map<number, SeriesInfo>();
const SERIES_INFO_CACHE_MAX = 40;

interface Props {
  series: SeriesItem;
  credentials: XtreamCredentials;
  tmdbData?: TmdbEntry;
  onPlay: (channel: Channel) => void;
  onClose: () => void;
}

export const SeriesDetailFlow: React.FC<Props> = ({ series, credentials, tmdbData, onPlay, onClose }) => {
  const [phase, setPhase] = useState<'detail' | 'episodes'>('detail');
  const [info, setInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const sheetTouch = useRef<{ y: number; t: number } | null>(null);

  // ── "Play" on the detail modal → lazily fetch seasons/episodes, open picker. ──
  const openEpisodes = useCallback(async () => {
    hapticClick();
    setPhase('episodes');
    setUnavailable(false);

    const cached = seriesInfoMemCache.get(series.series_id);
    if (cached) { setInfo(cached); setLoading(false); return; }

    setLoading(true);
    setInfo(null);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; setUnavailable(true); setLoading(false); }, 15000);
    try {
      const fetched = await getSeriesInfo(credentials, series.series_id);
      clearTimeout(timeout);
      if (timedOut) return;
      if (seriesInfoMemCache.size >= SERIES_INFO_CACHE_MAX) {
        const firstKey = seriesInfoMemCache.keys().next().value;
        if (firstKey !== undefined) seriesInfoMemCache.delete(firstKey);
      }
      seriesInfoMemCache.set(series.series_id, fetched);
      setInfo(fetched);
      setLoading(false);
    } catch {
      clearTimeout(timeout);
      if (!timedOut) { setUnavailable(true); setLoading(false); }
    }
  }, [credentials, series]);

  const playEpisode = useCallback((episode: Episode) => {
    const ext = episode.container_extension || 'mp4';
    onPlay({
      id: `series-${episode.id}`,
      name: `${series.name} - ${episode.title || `E${episode.episode_num}`}`,
      url: buildSeriesUrl(credentials, episode.id, ext),
      logo: series.cover,
      category: 'series',
      fallbackUrl: buildVodFallbackUrl(credentials, episode.id, ext, 'series'),
    });
    onClose();
  }, [credentials, series, onPlay, onClose]);

  // ── Back-guard: the episode sheet is a rising surface — hardware/browser BACK
  // pops it back to the wall, never navigates away. ──
  useEffect(() => {
    if (phase !== 'episodes') return;
    window.history.pushState({ wallEpisodePicker: true }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.wallEpisodePicker) window.history.back();
    };
  }, [phase, onClose]);

  if (phase === 'detail') {
    return (
      <ContentDetailModal
        streamId={series.series_id}
        name={series.name}
        poster={series.cover}
        rating={series.rating}
        type="series"
        tmdbData={tmdbData}
        credentials={credentials}
        onPlay={() => { openEpisodes(); }}
        onClose={onClose}
      />
    );
  }

  // ── Episode picker — the same rising sheet as the classic Series page. ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(4,4,8,0.30)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
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
          if (dy > 90 || (dy > 45 && dt < 260)) onClose();
          sheetTouch.current = null;
        }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>
        <div className="relative overflow-hidden" style={{ height: 'clamp(140px, 30vh, 200px)' }}>
          {series.cover ? (
            <img src={series.cover} alt={series.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary-dark/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
          <div className="absolute top-3 right-3">
            <CosmicClose onClick={onClose} size="sm" />
          </div>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl font-bold text-white">{series.name}</h2>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" text="Chargement des épisodes…" />
          </div>
        ) : unavailable ? (
          <div className="flex items-center justify-center py-12 text-text-muted text-sm">
            Épisodes indisponibles pour le moment.
          </div>
        ) : info ? (
          <SeriesExplorer
            series={series}
            info={info}
            tmdbData={tmdbData}
            credentials={credentials}
            onPlayEpisode={playEpisode}
          />
        ) : null}
      </div>
    </div>
  );
};
