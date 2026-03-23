import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Flame, Compass, Play, Star } from 'lucide-react';
import { VeeMoodOverlay, MOOD_GENRES } from './VeeMoodOverlay';
import type { TmdbEntry } from '../../lib/tmdb-map.generated';

// ── Types ──────────────────────────────────────────────────────────

interface VeeItem {
  stream_id: number;
  name: string;
  stream_icon: string;
  category_id: string;
  rating?: string;
}

interface VeeWidgetProps {
  items: VeeItem[];
  onPlay: (item: VeeItem) => void;
  onTrailer?: (youtubeKey: string, title: string, poster?: string, overview?: string) => void;
  tmdbMap?: Record<string, TmdbEntry>;
}

// ── Helpers ────────────────────────────────────────────────────────

const DEAD_DOMAINS = ['webhop.live', 'imdb.com', 'wikia.nocookie.net', 'paste.pics'];

function getSafePoster(url?: string, tmdbPoster?: string): string | null {
  if (url) {
    const isDead = DEAD_DOMAINS.some((d) => url.includes(d));
    if (!isDead) {
      const fixed = url.replace('starshare.live:8080', 'datahub11.com:8080');
      if (fixed.startsWith('https://')) return fixed;
      if (fixed.startsWith('http://')) return `https://stream.zionsynapse.online/?url=${encodeURIComponent(fixed)}`;
    }
  }
  if (tmdbPoster) return `https://image.tmdb.org/t/p/w342${tmdbPoster}`;
  return null;
}

function parseTitle(raw: string): { clean: string; year: string | null } {
  const m = raw.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  return m ? { clean: m[1].trim(), year: m[2] } : { clean: raw, year: null };
}

/** Interpolate between red (#ef4444) and blue (#3b82f6) based on t [0..1] */
function lerpColor(t: number): string {
  const r = Math.round(239 + (59 - 239) * t);
  const g = Math.round(68 + (130 - 68) * t);
  const b = Math.round(68 + (246 - 68) * t);
  return `rgb(${r},${g},${b})`;
}

/** Score items by mood genre overlap */
function filterByMood(
  items: VeeItem[],
  genreIds: number[],
  tmdbMap: Record<string, TmdbEntry>,
): VeeItem[] {
  if (genreIds.length === 0) {
    // "Surprise" — diversity-weighted: random shuffle
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const genreSet = new Set(genreIds);
  const scored = items.map((item) => {
    const tmdb = tmdbMap[`m:${item.stream_id}`];
    const genres = tmdb?.g || [];
    let overlap = 0;
    for (const g of genres) {
      if (genreSet.has(g)) overlap++;
    }
    const score = genres.length > 0 ? overlap / genres.length : 0;
    const ratingBonus = tmdb ? Math.min(Math.max((tmdb.r - 5) / 4, 0), 1) * 0.15 : 0;
    return { item, score: score + ratingBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).map((s) => s.item);
}

// ── Gradient fallback backgrounds ──────────────────────────────────

const FALLBACK_GRADIENTS = [
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
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

// ── Smart Pick Card (inline, tailored for Vee) ────────────────────

const VeeCard: React.FC<{
  item: VeeItem;
  tmdb?: TmdbEntry;
  neonColor: string;
  onPlay: () => void;
  onTrailer?: (youtubeKey: string, title: string, poster?: string, overview?: string) => void;
}> = ({ item, tmdb, neonColor, onPlay, onTrailer }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const poster = getSafePoster(item.stream_icon, undefined);
  const hasPoster = poster && !imgFailed;
  const { clean, year } = parseTitle(item.name);
  const displayRating = tmdb?.r ? tmdb.r.toFixed(1) : item.rating;
  const hasRating = displayRating && parseFloat(displayRating) > 0;
  const hasTrailer = tmdb?.y && onTrailer;

  return (
    <button
      onClick={onPlay}
      className="group relative flex-shrink-0 w-[120px] aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border transition-all duration-300 hover:scale-[1.04] text-left"
      style={{
        borderColor: `${neonColor}33`,
        boxShadow: `0 0 8px ${neonColor}22`,
      }}
    >
      {hasPoster ? (
        <img
          src={poster}
          alt={clean}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(item.name)} flex flex-col items-center justify-center p-2`}>
          <Play className="w-4 h-4 text-white/60 mb-1" />
          <span className="text-white/70 text-center text-[10px] font-semibold line-clamp-2 leading-tight">
            {clean}
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Play icon on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-9 h-9 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-4 h-4 text-white ml-0.5" />
        </div>
      </div>

      {/* Trailer button */}
      {hasTrailer && (
        <div
          className="absolute bottom-10 left-1.5 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onTrailer!(tmdb!.y!, clean, poster || undefined);
          }}
        >
          <div className="w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center transition-colors cursor-pointer">
            <Play className="w-3 h-3 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        {hasRating && (
          <div className="flex items-center gap-0.5 mb-0.5">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-medium">{displayRating}</span>
          </div>
        )}
        <h3 className="text-[10px] font-medium text-white line-clamp-2 leading-tight">{clean}</h3>
        {year && <span className="text-[9px] text-white/35 font-medium">{year}</span>}
      </div>
    </button>
  );
};

// ── Portal Box ─────────────────────────────────────────────────────

const PortalBox: React.FC<{
  mode: 'hot' | 'explore';
  onClick: () => void;
}> = ({ mode, onClick }) => {
  const isHot = mode === 'hot';

  return (
    <button
      onClick={onClick}
      className={`
        relative flex-shrink-0 flex flex-col items-center justify-center gap-2
        w-[80px] h-[170px] rounded-xl
        transition-transform duration-300 hover:scale-105 active:scale-95
        ${isHot ? 'animate-portal-pulse-red' : 'animate-portal-pulse-blue'}
      `}
      style={{
        background: isHot
          ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))'
          : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
        border: `1.5px solid ${isHot ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.35)'}`,
        transform: isHot ? 'rotate(-3deg)' : 'rotate(0deg)',
      }}
    >
      {/* Vertical accent line */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[1.5px] rounded-full"
        style={{
          background: isHot
            ? 'linear-gradient(to bottom, transparent, #ef4444, transparent)'
            : 'linear-gradient(to bottom, transparent, #3b82f6, transparent)',
        }}
      />
      <div
        className="absolute right-0 top-3 bottom-3 w-[1.5px] rounded-full"
        style={{
          background: isHot
            ? 'linear-gradient(to bottom, transparent, #ef4444, transparent)'
            : 'linear-gradient(to bottom, transparent, #3b82f6, transparent)',
        }}
      />

      {isHot ? (
        <Flame className="w-6 h-6 text-red-400" />
      ) : (
        <Compass className="w-6 h-6 text-blue-400" />
      )}
      <span
        className={`text-sm font-extrabold tracking-wider ${
          isHot ? 'text-red-400' : 'text-blue-400'
        }`}
      >
        VEE
      </span>
      <span className={`text-[8px] font-bold tracking-widest uppercase ${isHot ? 'text-red-400/60' : 'text-blue-400/60'}`}>
        {isHot ? 'HOT' : 'EXPLORE'}
      </span>
    </button>
  );
};

// ── Main VeeWidget ─────────────────────────────────────────────────

export const VeeWidget: React.FC<VeeWidgetProps> = ({
  items,
  onPlay,
  onTrailer,
  tmdbMap = {},
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overlayMode, setOverlayMode] = useState<'hot' | 'explore' | null>(null);
  const [moodItems, setMoodItems] = useState<VeeItem[] | null>(null);

  // Default display: top-rated items from pool (deduped by name)
  const displayItems = useMemo(() => {
    if (moodItems && moodItems.length > 0) return moodItems;
    // Dedup by cleaned name (strip year, quality tags)
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      const clean = item.name.replace(/\s*\(\d{4}\)\s*$/, '').replace(/\s*(HD|FHD|4K|UHD)\s*/gi, '').trim().toLowerCase();
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
    // Score by TMDB rating, highest first
    const scored = unique.map((item) => {
      const tmdb = tmdbMap[`m:${item.stream_id}`];
      const rating = tmdb?.r || 0;
      const popularity = tmdb?.r ? tmdb.r / 10 : 0;
      return { item, score: rating * 0.7 + popularity * 0.3 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 20).map((s) => s.item);
  }, [items, tmdbMap, moodItems]);

  // Compute neon color for each card position
  const totalCards = displayItems.length;

  const handleMoodSelect = useCallback(
    (moodKey: string, genreIds: number[]) => {
      const filtered = filterByMood(items, genreIds, tmdbMap);
      const limited = filtered.slice(0, 20);
      setMoodItems(limited.length > 0 ? limited : null);
      setOverlayMode(null);
    },
    [items, tmdbMap]
  );

  const handleSearch = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      const matched = items.filter((item) => item.name.toLowerCase().includes(q));
      setMoodItems(matched.length > 0 ? matched.slice(0, 20) : null);
      setOverlayMode(null);
    },
    [items]
  );

  if (items.length === 0) return null;

  return (
    <>
      {/* Vee Section Header */}
      <section className="mb-6">
        <div className="flex items-center gap-2 px-4 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500/30 to-blue-500/30 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-primary-light" />
          </div>
          <h2 className="text-lg font-bold text-white">VEE Smart Picks</h2>
          <span className="text-[10px] font-semibold text-primary-light/60 bg-primary/10 px-1.5 py-0.5 rounded tracking-wide">
            Video Intelligence
          </span>
        </div>

        {/* Scrollable row: [Hot Portal] [Cards...] [Explore Portal] */}
        <div
          ref={scrollRef}
          className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-4 pb-2"
        >
          {/* Left Portal — Vee Hot */}
          <PortalBox mode="hot" onClick={() => setOverlayMode('hot')} />

          {/* Smart Pick Cards */}
          {displayItems.map((item, index) => {
            const t = totalCards > 1 ? index / (totalCards - 1) : 0.5;
            const neonColor = lerpColor(t);
            const tmdb = tmdbMap[`m:${item.stream_id}`];
            return (
              <VeeCard
                key={item.stream_id}
                item={item}
                tmdb={tmdb}
                neonColor={neonColor}
                onPlay={() => onPlay(item)}
                onTrailer={onTrailer}
              />
            );
          })}

          {/* Right Portal — Vee Explore */}
          <PortalBox mode="explore" onClick={() => setOverlayMode('explore')} />
        </div>
      </section>

      {/* Mood Overlay */}
      {overlayMode && (
        <VeeMoodOverlay
          mode={overlayMode}
          onClose={() => setOverlayMode(null)}
          onMoodSelect={handleMoodSelect}
          onSearch={handleSearch}
        />
      )}
    </>
  );
};
