import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Play, Star, Clock } from 'lucide-react';
import { CosmicClose } from './CosmicClose';
import { t, useLanguage } from '@/i18n';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { safeImageUrl, type XtreamCredentials } from '@/lib/xtream';

const TMDB_GENRES: Record<number, string> = {
  12: 'Adventure', 14: 'Fantasy', 16: 'Animation', 18: 'Drama',
  27: 'Horror', 28: 'Action', 35: 'Comedy', 36: 'History',
  37: 'Western', 53: 'Thriller', 80: 'Crime', 99: 'Documentary',
  878: 'Sci-Fi', 9648: 'Mystery', 10402: 'Music', 10749: 'Romance',
  10751: 'Family', 10752: 'War', 10759: 'Action & Adventure',
  10762: 'Kids', 10765: 'Sci-Fi & Fantasy', 10770: 'TV Movie',
};

export interface ContentDetailModalProps {
  streamId: number;
  name: string;
  poster?: string;
  rating?: string;
  categoryId?: string;
  containerExtension?: string;
  type: 'movie' | 'series';
  tmdbData?: TmdbEntry;
  credentials?: XtreamCredentials;
  onPlay: (knownDuration?: number) => void;
  onClose: () => void;
}

function parseTitle(raw: string): { clean: string; year: string | null } {
  const m = raw.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (m) return { clean: m[1].trim(), year: m[2] };
  return { clean: raw, year: null };
}

function formatRuntime(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getBackdropUrl(poster?: string, tmdbPoster?: string): string | null {
  if (tmdbPoster) return `https://image.tmdb.org/t/p/w780${tmdbPoster}`;
  return safeImageUrl(poster);
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  streamId, name, poster, rating, type, tmdbData, credentials, onPlay, onClose,
}) => {
  const { lang } = useLanguage();

  // ── VOD info fetch ──────────────────────────────────────────
  const [vodDescription, setVodDescription] = useState<string | null>(null);
  const [vodDuration, setVodDuration] = useState<number | null>(null);
  const [vodTrailer, setVodTrailer] = useState<string | null>(null);
  const [vodDirector, setVodDirector] = useState<string | null>(null);
  const [vodCast, setVodCast] = useState<string | null>(null);
  const [vodLoading, setVodLoading] = useState(type === 'movie');

  useEffect(() => {
    if (type !== 'movie' || !credentials) { setVodLoading(false); return; }
    let mounted = true;
    import('@/lib/xtream').then(({ getVodInfo }) => {
      getVodInfo(credentials, streamId).then(info => {
        if (!info || !mounted) return;
        const i = info.info;
        if (i.plot || i.description) setVodDescription(i.plot || i.description || null);
        if (i.episode_run_time) setVodDuration(parseInt(i.episode_run_time) || null);
        if (i.youtube_trailer) setVodTrailer(i.youtube_trailer);
        if (i.director) setVodDirector(i.director);
        if (i.cast || i.actors) setVodCast(i.cast || i.actors || null);
      }).finally(() => { if (mounted) setVodLoading(false); });
    });
    return () => { mounted = false; };
  }, [streamId, type, credentials]);

  // ── Scroll lock + keyboard + mute background player ──────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    try { screen.orientation.unlock(); } catch {}

    // Mute ALL background video elements while modal is open
    const allVideos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
    const savedStates = allVideos
      .filter(v => !v.paused && v.volume > 0)
      .map(v => ({ el: v, vol: v.volume }));
    savedStates.forEach(s => { s.el.volume = 0; });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Restore all background video volumes
      savedStates.forEach(s => {
        if (s.el && document.contains(s.el)) s.el.volume = s.vol;
      });
    };
  }, [onClose]);

  // ── Derived data ──────────────────────────────────────────────
  const { clean: cleanTitle, year } = parseTitle(name);
  const trailerKey = vodTrailer || tmdbData?.y || null;
  const hasTrailer = !!trailerKey;
  const [trailerFailed, setTrailerFailed] = useState(false);
  const backdropUrl = getBackdropUrl(poster, tmdbData?.p);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const showTrailer = hasTrailer && !trailerFailed;

  // Cleanup iframe on unmount + delayed unmute for trailer audio
  useEffect(() => {
    let attempts = 0;
    let unmuteTimer: ReturnType<typeof setTimeout>;
    const tryUnmute = () => {
      if (!iframeRef.current?.contentWindow) return;
      try {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute' }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [60] }), '*');
      } catch {}
      attempts++;
      if (attempts < 5) unmuteTimer = setTimeout(tryUnmute, 600);
    };
    if (showTrailer) {
      // Start after 1.2s, retry up to 5 times (covers slow YouTube init)
      unmuteTimer = setTimeout(tryUnmute, 1200);
    }
    return () => {
      clearTimeout(unmuteTimer);
      if (iframeRef.current) try { iframeRef.current.src = 'about:blank'; } catch {}
    };
  }, [showTrailer]);

  // Detect YouTube unavailable
  useEffect(() => {
    if (!hasTrailer) return;
    const onMsg = (e: MessageEvent) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d?.event === 'onError' || d?.info === 150 || d?.info === 101) setTrailerFailed(true);
      } catch {}
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasTrailer]);

  const displayRating = tmdbData?.r ? tmdbData.r.toFixed(1) : rating;
  const hasRating = displayRating && parseFloat(displayRating) > 0;
  const runtimeMinutes = vodDuration || tmdbData?.t || null;
  const runtime = runtimeMinutes ? formatRuntime(runtimeMinutes) : null;
  const knownDurationSeconds = runtimeMinutes ? runtimeMinutes * 60 : undefined;
  const description = vodDescription || null;
  const genres = (tmdbData?.g || []).map((id) => TMDB_GENRES[id]).filter(Boolean).slice(0, 3);

  // ── Shared detail content ─────────────────────────────────────
  const detailContent = (
    <>
      <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">{cleanTitle}</h2>

      <div className="flex items-center gap-2.5 flex-wrap mb-3 text-sm">
        {year && <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-xs font-semibold">{year}</span>}
        {hasRating && (
          <span className="flex items-center gap-1 text-yellow-400">
            <Star className="w-3.5 h-3.5 fill-yellow-400" /><span className="font-medium">{displayRating}</span>
          </span>
        )}
        {runtime && (
          <span className="flex items-center gap-1 text-white/50">
            <Clock className="w-3.5 h-3.5" /><span className="font-medium">{runtime}</span>
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary-light text-xs font-semibold uppercase">
          {type === 'movie' ? t(lang, 'typeMovie') : t(lang, 'typeSeries')}
        </span>
      </div>

      {genres.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {genres.map((g) => (
            <span key={g} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 font-medium">{g}</span>
          ))}
        </div>
      )}

      {vodLoading ? (
        <div className="space-y-2 mb-4 animate-pulse">
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-4/5" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      ) : (
        <>
          {description && <p className="text-sm text-white/50 leading-relaxed line-clamp-3 mb-3">{description}</p>}
          {(vodDirector || vodCast) && (
            <div className="text-xs text-white/30 space-y-1 mb-4">
              {vodDirector && <p>{t(lang, 'director')}: <span className="text-white/50">{vodDirector}</span></p>}
              {vodCast && <p>{t(lang, 'cast')}: <span className="text-white/50">{vodCast.split(',').slice(0, 4).join(', ')}{vodCast.split(',').length > 4 ? ' ...' : ''}</span></p>}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => onPlay(knownDurationSeconds)}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-white text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.9), rgba(124,58,237,0.9))' }}
      >
        <Play className="w-5 h-5 fill-white" />{t(lang, 'playNow')}
      </button>
    </>
  );

  // ══════════════════════════════════════════════════════════════
  // TRAILER MODE — fullscreen immersive (only when real video plays)
  // ══════════════════════════════════════════════════════════════
  if (showTrailer) {
    return (
      <div className="fixed inset-0 z-[9998] bg-black" onClick={() => {}}>
        {/* Ambient trailer */}
        <div className="absolute inset-0">
          {backdropUrl && <img src={backdropUrl} alt={cleanTitle} className="absolute inset-0 w-full h-full object-cover" />}
          <iframe
            ref={iframeRef}
            className="absolute pointer-events-none"
            style={{ top: '-10%', left: '-5%', width: '110%', height: '130%' }}
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0&modestbranding=1&controls=0&showinfo=0&iv_load_policy=3&disablekb=1&start=1&autoplay=1&mute=1&enablejsapi=1&playsinline=1&loop=1`}
            title={`${cleanTitle} - Trailer`}
            allow="autoplay; encrypted-media"
            frameBorder="0"
          />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
        </div>

        <div className="absolute top-4 right-4 z-50">
          <CosmicClose onClick={onClose} />
        </div>

        {/* Details at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 pb-8 pt-16" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)' }}>
            {detailContent}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // CARD MODE — elegant bottom sheet (default for most movies)
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ animation: 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-[#0a0a0f] rounded-t-2xl sm:rounded-2xl overflow-hidden overflow-y-auto border border-white/8"
        style={{ animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="absolute top-3 right-3 z-20">
          <CosmicClose onClick={onClose} />
        </div>

        {/* Media area — poster with trailer overlay if available */}
        <div className="relative w-full pb-[56%] rounded-xl overflow-hidden bg-black">
          {backdropUrl ? (
            <img src={backdropUrl} alt={cleanTitle} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-black flex items-center justify-center">
              <Play className="w-16 h-16 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="px-5 pb-6 -mt-4 relative z-10">
          {detailContent}
        </div>
      </div>
    </div>
  );
};
