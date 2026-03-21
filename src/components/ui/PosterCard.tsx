import React, { useState } from 'react';
import { Play, Star, Clock } from 'lucide-react';

import type { TmdbEntry } from '../../lib/tmdb-map.generated';

interface Props {
  title: string;
  poster?: string;
  rating?: string;
  categoryId?: string;
  onClick: () => void;
  tmdbData?: TmdbEntry;
  onTrailer?: (youtubeKey: string, title: string, poster?: string, overview?: string) => void;
}

// Platform badges — mapped by Starshare category ID
const PLATFORM_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  // Series
  '106': { label: 'N', bg: 'bg-[#E50914]', text: 'text-white' },              // Netflix
  '108': { label: 'prime', bg: 'bg-[#00A8E1]', text: 'text-white' },          // Amazon Prime
  '188': { label: 'HBO', bg: 'bg-[#9D4EDD]', text: 'text-white' },            // HBO Max
  '654': { label: 'D+', bg: 'bg-[#113CCF]', text: 'text-white' },             // Disney+
  '114': { label: 'tv+', bg: 'bg-[#1d1d1f]', text: 'text-white' },            // Apple TV+
  '209': { label: 'hulu', bg: 'bg-[#1CE783]', text: 'text-black' },           // Hulu
  '249': { label: 'P+', bg: 'bg-[#0064FF]', text: 'text-white' },             // Paramount+
  '110': { label: 'STARZ', bg: 'bg-[#1a1a2e]', text: 'text-[#FFB300]' },      // Starz
  // Movies
  '169': { label: 'N', bg: 'bg-[#E50914]', text: 'text-white' },              // Netflix English
  '168': { label: 'N', bg: 'bg-[#E50914]', text: 'text-white' },              // Netflix Hindi
};

const COLORS = [
  'from-purple-900/80 to-indigo-900/80',
  'from-red-900/80 to-pink-900/80',
  'from-blue-900/80 to-cyan-900/80',
  'from-emerald-900/80 to-teal-900/80',
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getSafePoster(url?: string, tmdbPoster?: string): string | null {
  if (url) {
    // Dead/invalid sources
    if (url.includes('webhop.live')) { /* fall through to TMDB */ }
    else if (url.includes('imdb.com')) { /* fall through */ }
    else if (url.includes('wikia.nocookie.net')) { /* fall through */ }
    else if (url.includes('paste.pics')) { /* fall through */ }
    else {
      // Rewrite dead starshare domain to live datahub
      const fixed = url.replace('starshare.live:8080', 'datahub11.com:8080');
      // HTTPS posters load directly
      if (fixed.startsWith('https://')) return fixed;
      // HTTP posters go through VPS proxy
      if (fixed.startsWith('http://')) return `https://stream.zionsynapse.online/?url=${encodeURIComponent(fixed)}`;
    }
  }
  // TMDB poster fallback
  if (tmdbPoster) return `https://image.tmdb.org/t/p/w342${tmdbPoster}`;
  return null;
}

/** Extract and strip year from title: "Movie Name (2025)" -> { clean: "Movie Name", year: "2025" } */
function parseTitle(raw: string): { clean: string; year: string | null } {
  const m = raw.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (m) return { clean: m[1].trim(), year: m[2] };
  return { clean: raw, year: null };
}

/** Format runtime in minutes to "Xh Ym" */
function formatRuntime(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const PosterCard: React.FC<Props> = ({ title, poster, rating, categoryId, onClick, tmdbData, onTrailer }) => {
  const badge = categoryId ? PLATFORM_BADGES[categoryId] : undefined;
  const [imgFailed, setImgFailed] = useState(false);
  const safePoster = getSafePoster(poster, tmdbData?.p);
  const hasPoster = safePoster && !imgFailed;
  const { clean: cleanTitle, year } = parseTitle(title);

  // Use TMDB rating if available, otherwise fall back to Xtream rating
  const displayRating = tmdbData?.r ? tmdbData.r.toFixed(1) : rating;
  const hasRating = displayRating && parseFloat(displayRating) > 0;

  const hasTrailer = tmdbData?.y && onTrailer;
  const runtime = tmdbData?.t ? formatRuntime(tmdbData.t) : null;

  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 transition-all duration-300 hover:scale-[1.03] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 text-left"
    >
      {hasPoster ? (
        <img
          src={safePoster}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(title)} flex flex-col items-center justify-center p-3`}>
          {/* DASH Exclusive branding */}
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-2 backdrop-blur-sm">
            <Play className="w-4 h-4 text-white/70 ml-0.5" />
          </div>
          <span className="text-white/80 text-center text-xs font-semibold line-clamp-2 leading-tight">
            {cleanTitle}
          </span>
          <span className="mt-1.5 text-[8px] font-bold tracking-[2px] text-white/30 uppercase">
            DASH+
          </span>
        </div>
      )}

      {/* Exclusive badge — only on cards without poster */}
      {!hasPoster && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-primary/80 to-primary-dark/80 text-[8px] font-bold text-white/90 tracking-wide shadow-lg backdrop-blur-sm">
          EXCLUSIVE
        </div>
      )}

      {/* Platform badge — top left */}
      {badge && (
        <div className={`absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.text} text-[9px] font-black tracking-wide shadow-lg`}>
          {badge.label}
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Play icon on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30">
          <Play className="w-6 h-6 text-white ml-0.5" />
        </div>
      </div>

      {/* Trailer button — bottom-left overlay */}
      {hasTrailer && (
        <div
          className="absolute bottom-12 left-2 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onTrailer!(tmdbData!.y!, cleanTitle, safePoster || undefined, tmdbData!.o);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center shadow-lg transition-colors cursor-pointer">
            <Play className="w-3.5 h-3.5 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {hasRating && (
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">{displayRating}</span>
          </div>
        )}
        <h3 className="text-xs font-medium text-white line-clamp-2 leading-tight">{cleanTitle}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {year && (
            <span className="text-[10px] text-white/40 font-medium">{year}</span>
          )}
          {runtime && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/35 font-medium">
              <Clock className="w-2.5 h-2.5" />
              {runtime}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
