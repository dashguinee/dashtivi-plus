import React, { useState, memo } from 'react';
import { Star, Clock, Clapperboard } from 'lucide-react';

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
  if (url) {
    if (url.includes('webhop.live') || url.includes('imdb.com') || url.includes('wikia.nocookie.net') || url.includes('paste.pics')) {
      return null;
    }
    const fixed = url.replace('starshare.live:8080', 'datahub11.com:8080');
    if (fixed.startsWith('https://')) return fixed;
    if (fixed.startsWith('http://')) return `https://stream.zionsynapse.online/?url=${encodeURIComponent(fixed)}`;
  }
  return null;
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

export const PosterCard = memo(function PosterCard({ title, poster, rating, categoryId, onClick, tmdbData, onTrailer }: Props) {
  const badge = categoryId ? PLATFORM_BADGES[categoryId] : undefined;
  const platformLogo = categoryId ? PLATFORM_LOGOS[categoryId] : undefined;
  const [imgFailed, setImgFailed] = useState(false);
  const safePoster = getSafePoster(poster);
  const hasPoster = safePoster && !imgFailed;
  const { clean: cleanTitle, year } = parseTitle(title);

  const displayRating = tmdbData?.r ? tmdbData.r.toFixed(1) : rating;
  const hasRating = displayRating && parseFloat(displayRating) > 0;
  const hasTrailer = tmdbData?.y && onTrailer;
  const runtime = tmdbData?.t ? formatRuntime(tmdbData.t) : null;

  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[2/3] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/10 text-left"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {hasPoster ? (
        <img
          src={safePoster}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          loading="lazy"
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
          {year && (
            <span className="mt-1.5 text-[9px] text-white/25 font-medium">{year}</span>
          )}
        </div>
      )}

      {/* Platform badge — top left */}
      {badge && (
        <div className="absolute top-2 left-2 z-10">
          {platformLogo ? (
            <img src={platformLogo} alt={badge.label} className="h-5 w-auto" loading="lazy" />
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

      {/* Trailer button */}
      {hasTrailer && (
        <div
          className="absolute bottom-10 left-2 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onTrailer!(tmdbData!.y!, cleanTitle, safePoster || undefined);
          }}
        >
          <div
            className="w-6 h-6 rounded-lg bg-black/50 hover:bg-primary/40 flex items-center justify-center transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(157,78,221,0.2)' }}
          >
            <Clapperboard className="w-3 h-3 text-primary-light/80" />
          </div>
        </div>
      )}

      {/* Bottom info — rating + year + runtime */}
      {hasPoster && (
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          {hasRating && (
            <div className="flex items-center gap-1 mb-0.5">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">{displayRating}</span>
            </div>
          )}
          <h3 className="text-[11px] font-semibold text-white/90 line-clamp-2 leading-tight">{cleanTitle}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {year && <span className="text-[9px] text-white/35">{year}</span>}
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
