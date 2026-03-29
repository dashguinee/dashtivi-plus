import React, { useEffect, useCallback, useState } from 'react';
import { Play, Star, Clock, Heart, X } from 'lucide-react';
import { t, useLanguage } from '@/i18n';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { safeImageUrl, type XtreamCredentials } from '@/lib/xtream';

// ── TMDB genre map (subset — loaded inline to avoid async dependency) ──
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

/** Extract year from title like "Movie Name (2025)" */
function parseTitle(raw: string): { clean: string; year: string | null } {
  const m = raw.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (m) return { clean: m[1].trim(), year: m[2] };
  return { clean: raw, year: null };
}

/** Format runtime minutes to "Xh Ym" */
function formatRuntime(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Resolve poster URL — TMDB w780 for backdrops, fallback to stream icon */
function getBackdropUrl(poster?: string, tmdbPoster?: string): string | null {
  if (tmdbPoster) return `https://image.tmdb.org/t/p/w780${tmdbPoster}`;
  return safeImageUrl(poster);
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  streamId,
  name,
  poster,
  rating,
  type,
  tmdbData,
  credentials,
  onPlay,
  onClose,
}) => {
  const { lang } = useLanguage();
  // ── Fetch VOD info for real duration + description ──────────
  const [vodDescription, setVodDescription] = useState<string | null>(null);
  const [vodDuration, setVodDuration] = useState<number | null>(null);
  const [vodTrailer, setVodTrailer] = useState<string | null>(null);
  const [vodDirector, setVodDirector] = useState<string | null>(null);
  const [vodCast, setVodCast] = useState<string | null>(null);

  useEffect(() => {
    if (type !== 'movie' || !credentials) return;
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
      });
    });
    return () => { mounted = false; };
  }, [streamId, type, credentials]);

  // ── Keyboard / scroll lock ────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // ── Derived data ──────────────────────────────────────────────
  const { clean: cleanTitle, year } = parseTitle(name);
  // Trailer: prefer Xtream VOD info trailer (more reliable embedding), fallback to TMDB
  const trailerKey = vodTrailer || tmdbData?.y || null;
  const hasTrailer = !!trailerKey;
  const backdropUrl = getBackdropUrl(poster, undefined);

  // Rating: prefer TMDB, fallback to Xtream
  const displayRating = tmdbData?.r ? tmdbData.r.toFixed(1) : rating;
  const hasRating = displayRating && parseFloat(displayRating) > 0;

  // Runtime: prefer Xtream VOD info (authoritative), fallback to TMDB
  const runtimeMinutes = vodDuration || tmdbData?.t || null;
  const runtime = runtimeMinutes ? formatRuntime(runtimeMinutes) : null;
  const knownDurationSeconds = runtimeMinutes ? runtimeMinutes * 60 : undefined;

  // Description: prefer Xtream VOD info (full plot), fallback to TMDB
  const description = vodDescription || null;

  // Genres (first 3)
  const genres = (tmdbData?.g || [])
    .map((id) => TMDB_GENRES[id])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-[#0a0a0f] rounded-t-2xl sm:rounded-2xl overflow-hidden overflow-y-auto border border-white/10 animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ─────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* ── Media area (trailer or poster) ───────────────────── */}
        <div className="relative w-full pb-[62%] rounded-xl overflow-hidden bg-black shadow-2xl">
          {hasTrailer ? (
            <iframe
              className="absolute inset-0 w-full h-[115%] -top-[8%]"
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0&modestbranding=1`}
              title={`${cleanTitle} - Trailer`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              frameBorder="0"
            />
          ) : backdropUrl ? (
            <img
              src={backdropUrl}
              alt={cleanTitle}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary-dark/30 flex items-center justify-center">
              <Play className="w-16 h-16 text-white/20" />
            </div>
          )}
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />

          {/* Watch Now shimmer overlay */}
          {hasTrailer && (
            <div
              className="absolute bottom-0 left-0 right-0 z-10 cursor-pointer"
              onClick={() => onPlay(knownDurationSeconds)}
            >
              <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/90 via-orange-500/90 to-purple-600/90 py-3 text-center">
                {/* Shimmer sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                  style={{ backgroundSize: '200% 100%' }}
                />
                <span className="relative z-10 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> {t(lang, 'watchNow')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Content details ──────────────────────────────────── */}
        <div className="px-5 pb-6 -mt-6 relative z-10">
          {/* Title + year */}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
            {cleanTitle}
          </h2>

          {/* Metadata row: rating, runtime, type badge */}
          <div className="flex items-center gap-2.5 flex-wrap mb-3 text-sm">
            {year && (
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-xs font-semibold">
                {year}
              </span>
            )}
            {hasRating && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                <span className="font-medium">{displayRating}</span>
              </span>
            )}
            {runtime && (
              <span className="flex items-center gap-1 text-white/50">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{runtime}</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary-light text-xs font-semibold uppercase">
              {type === 'movie' ? t(lang, 'typeMovie') : t(lang, 'typeSeries')}
            </span>
          </div>

          {/* Genre pills */}
          {genres.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => onPlay(knownDurationSeconds)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-primary-light rounded-xl font-bold text-white text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-[transform,box-shadow] active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-white" />
              {t(lang, 'playNow')}
            </button>
            <button
              className="w-14 flex items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Add to favorites"
            >
              <Heart className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Description from Xtream VOD info */}
          {description && (
            <p className="text-sm text-white/50 leading-relaxed line-clamp-3 mb-3">
              {description}
            </p>
          )}

          {/* Director + Cast */}
          {(vodDirector || vodCast) && (
            <div className="text-xs text-white/30 space-y-1">
              {vodDirector && <p>{t(lang, 'director')}: <span className="text-white/50">{vodDirector}</span></p>}
              {vodCast && <p>{t(lang, 'cast')}: <span className="text-white/50">{vodCast.split(',').slice(0, 4).join(', ')}</span></p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
