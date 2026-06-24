import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Play, Star, Clock } from 'lucide-react';
import { CosmicClose } from './CosmicClose';
import { t, useLanguage } from '@/i18n';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { safeImageUrl, type XtreamCredentials } from '@/lib/xtream';
import { click as hapticClick } from '@/lib/haptics';
import { muteAmbient, unmuteAmbient } from '@/lib/ambient-audio';
import { useBackGuard } from '@/hooks/useBackGuard';

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

  // Layered back: system/browser BACK recedes this detail sheet (pops the top
  // layer) instead of leaving the app. The component only renders when its
  // call-site has it open, so open=true for its whole lifetime.
  useBackGuard(true, onClose, 'content-detail');

  // ── VOD info fetch ──────────────────────────────────────────
  const [vodDescription, setVodDescription] = useState<string | null>(null);
  const [vodDuration, setVodDuration] = useState<number | null>(null);
  const [vodTrailer, setVodTrailer] = useState<string | null>(null);
  const [vodDirector, setVodDirector] = useState<string | null>(null);
  const [vodCast, setVodCast] = useState<string | null>(null);
  const [vodLoading, setVodLoading] = useState(type === 'movie');

  // Haptic on mount + mute ambient so trailer doesn't overlap
  useEffect(() => {
    hapticClick();
    muteAmbient();
    return () => { unmuteAmbient(); };
  }, []);

  useEffect(() => {
    if (type !== 'movie' || !credentials) { setVodLoading(false); return; }
    let mounted = true;
    import('@/lib/xtream').then(({ getVodInfo }) => {
      getVodInfo(credentials, streamId).then(info => {
        if (!info || !info.info || !mounted) return;
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

    // Mute background video while modal is open. The app keeps very few <video>
    // elements alive (one persistent player + at most one focused HLS card), so a
    // document scan is cheap; savedStates is recreated per-open and GC'd on close
    // (scoped to this effect — no growth across open/close cycles).
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

  // Trailer fullscreen. Two independent fades:
  //  • posterUp — a brief still-poster cover that smooths the iframe load (no black
  //    flash), then dissolves fast (~1.8s) to the full-bleed looping video.
  //  • chrome — the buttons/title/close + scrim; auto-hides (~4.5s) so the trailer
  //    breathes CLEAN, tap anywhere toggles it back.
  const [posterUp, setPosterUp] = useState(true);
  const [chrome, setChrome] = useState(true);
  useEffect(() => {
    if (!showTrailer) return;
    const t = setTimeout(() => setPosterUp(false), 1800);
    return () => clearTimeout(t);
  }, [showTrailer]);
  useEffect(() => {
    if (!showTrailer || !chrome) return;
    const t = setTimeout(() => setChrome(false), 4500);
    return () => clearTimeout(t);
  }, [showTrailer, chrome]);

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
      // Unmute as the poster dissolves (~2s) so audio arrives WITH the video.
      // Retry up to 5 times (covers slow YouTube init).
      unmuteTimer = setTimeout(tryUnmute, 2000);
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
  const allGenres = (tmdbData?.g || []).map((id) => TMDB_GENRES[id]).filter(Boolean);
  const genres = allGenres.slice(0, 3);
  const genreOverflow = allGenres.length - genres.length;
  const castList = vodCast ? vodCast.split(',').map((c) => c.trim()).filter(Boolean) : [];
  const castOverflow = castList.length - 4;

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
        <div className="flex gap-2 flex-wrap items-center mb-4">
          {genres.map((g) => (
            <span key={g} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 font-medium">{g}</span>
          ))}
          {genreOverflow > 0 && (
            <span className="text-xs text-white/40 font-medium">+{genreOverflow}</span>
          )}
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
          {description && <p className="text-sm text-white/50 leading-relaxed line-clamp-4 mb-3">{description}</p>}
          {(vodDirector || castList.length > 0) && (
            <div className="text-xs text-white/30 space-y-1 mb-4">
              {vodDirector && <p>{t(lang, 'director')}: <span className="text-white/50">{vodDirector}</span></p>}
              {castList.length > 0 && (
                <p>{t(lang, 'cast')}: <span className="text-white/50">{castList.slice(0, 4).join(', ')}</span>
                  {castOverflow > 0 && <span className="text-white/35"> +{castOverflow} more</span>}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => onPlay(knownDurationSeconds)}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
        style={{
          // Color law: GOLD = premium/pride/exclusive. Watching premium content
          // is the proudest action in the app — it shines, it doesn't whisper.
          background: 'linear-gradient(135deg, rgba(255,215,0,0.95), rgba(255,183,0,0.95))',
          color: '#1a1505',
          boxShadow: '0 10px 30px rgba(255,215,0,0.22)',
        }}
      >
        <Play className="w-5 h-5 fill-current" />{t(lang, 'playNow')}
      </button>
    </>
  );

  // ══════════════════════════════════════════════════════════════
  // TRAILER MODE — fullscreen immersive (only when real video plays)
  // ══════════════════════════════════════════════════════════════
  if (showTrailer) {
    return (
      <div className="fixed inset-0 z-[9998] bg-black overflow-hidden" onClick={() => setChrome((c) => !c)}>
        {/* Full-bleed looping trailer — cover-sized so a 16:9 video FILLS the portrait
            screen (no letterbox gap); overflow cropped. loop needs playlist=<id>. */}
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            ref={iframeRef}
            className="absolute pointer-events-none"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '100vw', height: '56.25vw', minHeight: '100vh', minWidth: '177.78vh',
            }}
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0&modestbranding=1&controls=0&showinfo=0&iv_load_policy=3&disablekb=1&start=5&autoplay=1&mute=1&enablejsapi=1&playsinline=1&loop=1&playlist=${trailerKey}`}
            title={`${cleanTitle} - Trailer`}
            allow="autoplay; encrypted-media"
            frameBorder="0"
          />
          {backdropUrl && (
            <img
              src={backdropUrl}
              alt={cleanTitle}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: posterUp ? 1 : 0, transition: 'opacity 0.9s cubic-bezier(0.23,1,0.32,1)' }}
            />
          )}
        </div>
        {/* Scrim — fades out WITH the chrome so the video plays CLEAN when buttons hide */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: chrome ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
        </div>

        <div className="absolute top-4 right-4 z-50" style={{ opacity: chrome ? 1 : 0, transition: 'opacity 0.55s ease', pointerEvents: chrome ? 'auto' : 'none' }}>
          <CosmicClose onClick={onClose} />
        </div>

        {/* Details at bottom — fade out WITH the chrome so the trailer breathes clean */}
        <div className="absolute bottom-0 left-0 right-0 z-20" onClick={(e) => e.stopPropagation()} style={{ opacity: chrome ? 1 : 0, transition: 'opacity 0.55s ease', pointerEvents: chrome ? 'auto' : 'none' }}>
          <div className="px-5 pb-8 pt-16" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)' }}>
            {detailContent}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // CARD MODE — continuity sheet (default for most movies)
  // The detail RISES as a continuation of the canvas, not a covering wall:
  // a soft (not opaque) scrim lets the section above PEEK through at the top
  // (the floating live cards = "you're still in the flow, here's where you came
  // from"). Capped height guarantees that sliver. Tapping the peek closes —
  // it flows you straight back into the scroll, never a dead-end.
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        animation: 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        // Soft graduated scrim — darkens toward the sheet, but the very top stays
        // light so the canvas above peeks (depth/continuity cue, not a black wall).
        background: 'linear-gradient(to bottom, rgba(6,6,9,0.06) 0%, rgba(6,6,9,0.28) 20%, rgba(6,6,9,0.70) 100%)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] bg-[#0a0a0f] rounded-t-2xl overflow-hidden overflow-y-auto border border-white/12"
        style={{
          animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
          boxShadow: '0 -18px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle — the visual anchor: signals "this is a sheet that flows
            back", not a wall. Centered; close sits clearly to the right. */}
        <div className="relative flex justify-center pt-3 pb-1.5">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
          <div className="absolute top-2.5 right-3 z-20">
            <CosmicClose onClick={onClose} />
          </div>
        </div>

        {/* Media area — poster (immersive but height-aware on small phones so the
            title/desc/play button always have room at 412px). */}
        <div
          className="relative w-full rounded-xl overflow-hidden bg-black"
          style={{ paddingBottom: 'clamp(48%, 50vh, 56%)' }}
        >
          {backdropUrl ? (
            <img src={backdropUrl} alt={cleanTitle} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            // No image: a clean gradient placeholder — no ghost icon that reads as
            // a broken load or a phantom play target.
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-black" />
          )}
          {/* Stronger bottom scrim so the sheet feels like one floating surface
              (matches the trailer mode's from-black gradient language). */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="px-5 pb-6 -mt-4 relative z-10">
          {detailContent}
        </div>
      </div>
    </div>
  );
};
