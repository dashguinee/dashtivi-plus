import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Star, Clock } from 'lucide-react';
import { prefetchDecode, useNearViewport, markPainted, isPainted } from '../../lib/imageLoading';

import type { TmdbEntry } from '../../lib/tmdb-map.generated';
import { TMDB_GENRES } from '../../lib/tmdb-map.generated';
import { safeImageUrl } from '../../lib/xtream';

interface Props {
  title: string;
  poster?: string;
  rating?: string;
  categoryId?: string;
  onClick: () => void;
  tmdbData?: TmdbEntry;
  onTrailer?: (youtubeKey: string, title: string, poster?: string, overview?: string) => void;
  /** When provided (1-10), renders a large rank number on the left side (Netflix Top 10 style) */
  rank?: number;
}

const PLATFORM_LOGOS: Record<string, string> = {
  '106': '/logos/netflix-3d.png',
  '169': '/logos/netflix-3d.png',
  '168': '/logos/netflix-3d.png',
  '108': '/logos/prime-3d.webp',
};

const PLATFORM_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  '106': { label: 'N', bg: 'bg-[#E50914]', text: 'text-white' },
  '108': { label: 'prime', bg: 'bg-[#00A8E1]', text: 'text-white' },
  '188': { label: 'HBO', bg: 'bg-[#9D4EDD]', text: 'text-white' },
  '654': { label: 'D+', bg: 'bg-[#113CCF]', text: 'text-white' },
  '114': { label: 'tv+', bg: 'bg-[#1d1d1f]', text: 'text-white' },
  '209': { label: 'hulu', bg: 'bg-[#1CE783]', text: 'text-black' },
  '249': { label: 'P+', bg: 'bg-[#0064FF]', text: 'text-white' },
  '110': { label: 'STARZ', bg: 'bg-[#1a1a2e]', text: 'text-[#FFB300]' },
  '169': { label: 'N', bg: 'bg-[#E50914]', text: 'text-white' },
  '168': { label: 'N', bg: 'bg-[#E50914]', text: 'text-white' },
};

function getSafePoster(url?: string): string | null {
  return safeImageUrl(url);
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

// Poster paint-state lives in the shared painted registry (imageLoading), which
// is seeded from the SW's durable poster cache at boot. A card that re-mounts
// (content-visibility reveal, grid re-render, re-entered route, app restart)
// shows its poster instantly at full opacity — no second shimmer, no re-fade.

export const PosterCard = memo(function PosterCard({ title, poster, rating, categoryId, onClick, tmdbData, onTrailer, rank }: Props) {
  const badge = categoryId ? PLATFORM_BADGES[categoryId] : undefined;
  const platformLogo = categoryId ? PLATFORM_LOGOS[categoryId] : undefined;
  const [imgFailed, setImgFailed] = useState(false);
  const [tmdbFailed, setTmdbFailed] = useState(false);
  const safePoster = getSafePoster(poster);
  // TMDB poster fallback — uses poster_path from enrichment
  const tmdbPoster = tmdbData?.p ? `https://image.tmdb.org/t/p/w342${tmdbData.p}` : null;
  // The poster URL actually being shown right now (first choice, then fallback).
  const activePoster = (safePoster && !imgFailed) ? safePoster : (tmdbPoster && !tmdbFailed) ? tmdbPoster : null;
  const [imgLoaded, setImgLoaded] = useState(() => isPainted(activePoster));
  const onImgLoad = useCallback(() => { markPainted(activePoster); setImgLoaded(true); }, [activePoster]);

  // Anticipatory load: decode the poster ~one screen ahead + promote to
  // eager/high priority so it's painted before it scrolls into view.
  const [setNearRef, near] = useNearViewport();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoading: 'eager' | 'lazy' = near ? 'eager' : 'lazy';
  useEffect(() => { if (near && activePoster) prefetchDecode(activePoster); }, [near, activePoster]);
  // fetchpriority isn't typed on React 18 img props — set it imperatively.
  useEffect(() => { if (imgRef.current) imgRef.current.setAttribute('fetchpriority', near ? 'high' : 'low'); }, [near]);
  const hasPoster = (safePoster && !imgFailed) || (tmdbPoster && !tmdbFailed);
  const { clean: cleanTitle } = parseTitle(title);

  const displayRating = tmdbData?.r ? tmdbData.r.toFixed(1) : rating;
  const hasRating = displayRating && parseFloat(displayRating) > 0;
  const runtime = tmdbData?.t ? formatRuntime(tmdbData.t) : null;

  // First genre name for the pill
  const firstGenre = tmdbData?.g?.[0] ? TMDB_GENRES[tmdbData.g[0]] : null;

  // Rank mode: wrap card with number on the left
  if (rank) {
    return (
      <div className="relative flex items-end" style={{ paddingLeft: '28px' }}>
        {/* Large rank number */}
        <span
          className="absolute left-0 bottom-0 leading-none select-none pointer-events-none z-10"
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: 'transparent',
            WebkitTextStroke: '2px rgba(255,255,255,0.25)',
            textShadow: '0 0 20px rgba(157,78,221,0.15)',
            lineHeight: '0.8',
          }}
        >
          {rank}
        </span>
        <button
          ref={setNearRef}
          onClick={onClick}
          className="group relative w-full aspect-[2/3] rounded-xl overflow-hidden text-left card-press hover:scale-[1.03] active:scale-[0.96]"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          {/* Shimmer loading state */}
          {!imgLoaded && hasPoster && (
            <div className="absolute inset-0 z-0" style={{
              // PERF: GPU-composited sweep (transform) — no per-frame repaint.
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
              animation: 'shimmer-x 1.8s linear infinite',
              willChange: 'transform',
            }} />
          )}
          {safePoster && !imgFailed ? (
            <img ref={imgRef} src={safePoster} alt={title} width={200} height={300}
              className={`absolute inset-0 w-full h-full object-cover img-settle ${imgLoaded ? 'loaded' : ''}`}
              onLoad={onImgLoad} onError={() => setImgFailed(true)} loading={imgLoading} decoding="async" />
          ) : tmdbPoster && !tmdbFailed ? (
            <img ref={imgRef} src={tmdbPoster} alt={title} width={200} height={300}
              className={`absolute inset-0 w-full h-full object-cover img-settle ${imgLoaded ? 'loaded' : ''}`}
              onLoad={onImgLoad} onError={() => setTmdbFailed(true)} loading={imgLoading} decoding="async" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3"
              style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(10,10,18,0.95) 50%, rgba(157,78,221,0.06) 100%)', border: '1px solid rgba(157,78,221,0.08)' }}>
              <span className="text-white/80 text-center text-[11px] font-semibold line-clamp-3 leading-tight"
                style={{ textShadow: '0 0 8px rgba(157,78,221,0.3)' }}>{cleanTitle}</span>
            </div>
          )}
          {hasPoster && <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />}
          {hasPoster && (
            <div className="absolute bottom-0 left-0 right-0 p-2">
              {hasRating && (
                <div className="flex items-center gap-1 mb-0.5">
                  <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-medium">{displayRating}</span>
                </div>
              )}
              <h3 className="text-[11px] font-semibold text-white/90 line-clamp-1 leading-tight">{cleanTitle}</h3>
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      ref={setNearRef}
      onClick={onClick}
      className="group relative w-full aspect-[2/3] rounded-xl overflow-hidden text-left card-press hover:scale-[1.03] active:scale-[0.96]"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Shimmer loading state */}
      {!imgLoaded && hasPoster && (
        <div className="absolute inset-0 z-0" style={{
          background: 'linear-gradient(110deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 70%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s linear infinite',
        }} />
      )}

      {safePoster && !imgFailed ? (
        <img
          ref={imgRef}
          src={safePoster}
          alt={title}
          width={200}
          height={300}
          className={`absolute inset-0 w-full h-full object-cover img-settle ${imgLoaded ? 'loaded' : ''}`}
          onLoad={onImgLoad}
          onError={() => setImgFailed(true)}
          loading={imgLoading}
          decoding="async"
        />
      ) : tmdbPoster && !tmdbFailed ? (
        <img
          ref={imgRef}
          src={tmdbPoster}
          alt={title}
          width={200}
          height={300}
          className={`absolute inset-0 w-full h-full object-cover img-settle ${imgLoaded ? 'loaded' : ''}`}
          onLoad={onImgLoad}
          onError={() => setTmdbFailed(true)}
          loading={imgLoading}
          decoding="async"
        />
      ) : (
        /* Purple/black gradient fallback — no play button, title centered */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3"
          style={{
            background: 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(10,10,18,0.95) 50%, rgba(157,78,221,0.06) 100%)',
            border: '1px solid rgba(157,78,221,0.08)',
          }}
        >
          <span
            className="text-white/80 text-center text-[11px] font-semibold line-clamp-3 leading-tight"
            style={{ textShadow: '0 0 8px rgba(157,78,221,0.3)' }}
          >
            {cleanTitle}
          </span>
        </div>
      )}

      {/* Platform badge — top left, prominent */}
      {badge && (
        <div className="absolute top-2 left-2 z-10">
          {platformLogo ? (
            <img src={platformLogo} alt={badge.label} className="h-7 w-auto drop-shadow-lg" loading="lazy" />
          ) : (
            <div className={`px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.text} text-[9px] font-black tracking-wide`}>
              {badge.label}
            </div>
          )}
        </div>
      )}

      {/* Bottom gradient */}
      {hasPoster && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      )}

      {/* Bottom info — rating + genre pill + year + runtime */}
      {hasPoster && (
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          {hasRating && (
            <div className="flex items-center gap-1 mb-0.5">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">{displayRating}</span>
            </div>
          )}
          {firstGenre && (
            <span className="inline-block px-1.5 py-px rounded text-[8px] font-medium text-white/50 bg-white/[0.08] mb-0.5">{firstGenre}</span>
          )}
          <h3 className="text-[11px] font-semibold text-white/90 line-clamp-2 leading-tight">{cleanTitle}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {runtime && (
              <span className="flex items-center gap-0.5 text-[9px] text-white/30">
                <Clock className="w-2.5 h-2.5" />
                {runtime}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
});
