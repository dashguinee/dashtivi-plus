/**
 * VeeCollectionRow — Horizontal scroller for VEE intelligence collections.
 * Used on Movies and Series pages to show curated, TMDB-powered rows.
 * Supports numbered "Top 10" layout when isTop10 is true.
 */
import React, { useRef } from 'react';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { NeonGate, RowCountBadge, cardScaleStyle } from '@/components/ui/NeonGate';

interface VeeCollectionRowProps {
  name: string;
  tagline?: string;
  items: Array<{
    id: number;
    name: string;
    poster: string;
    rating?: string;
    tmdbKey: string;
  }>;
  tmdbMap: Record<string, TmdbEntry>;
  onItemClick: (id: number) => void;
  /** Render numbered cards in Top 10 style */
  isTop10?: boolean;
  /** Card width override in pixels (default: 108) */
  cardWidth?: number;
  /** Route to navigate when neon gate is clicked */
  navigateTo?: string;
  /** Count label for the badge (e.g., "movies", "series") */
  countLabel?: string;
}

export const VeeCollectionRow: React.FC<VeeCollectionRowProps> = React.memo(({
  name,
  tagline,
  items,
  tmdbMap,
  onItemClick,
  isTop10 = false,
  cardWidth,
  navigateTo,
  countLabel = 'titles',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length < 3) return null;

  return (
    <section>
      <div className="px-4 mb-2">
        <h3
          className="text-[15px] font-semibold text-white/60 flex items-center gap-1.5"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isTop10
                ? 'linear-gradient(135deg, #E50914, #B20710)'
                : 'linear-gradient(135deg, #9D4EDD, #7B2FBE)',
              boxShadow: isTop10
                ? '0 0 6px rgba(229,9,20,0.5)'
                : '0 0 4px rgba(157,78,221,0.4)',
            }}
          />
          {name}
          <RowCountBadge count={items.length} label={countLabel} />
        </h3>
        {tagline && <p className="text-[11px] text-white/25 mt-0.5">{tagline}</p>}
      </div>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2 items-end"
        style={{ gap: isTop10 ? '2px' : '14px' }}
      >
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex-shrink-0 relative"
            style={{ width: isTop10 ? 138 : (cardWidth || 108), ...cardScaleStyle(idx) }}
          >
            {isTop10 && (
              <span
                className="absolute -left-1 bottom-0 z-10 select-none pointer-events-none"
                style={{
                  fontSize: '72px',
                  fontWeight: 900,
                  lineHeight: '0.75',
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: 'transparent',
                  WebkitTextStroke: '2px rgba(255,255,255,0.25)',
                  textShadow: '0 0 20px rgba(229,9,20,0.15)',
                }}
              >
                {idx + 1}
              </span>
            )}
            <div style={isTop10 ? { marginLeft: 30 } : undefined}>
              <PosterCard
                title={item.name}
                poster={item.poster}
                rating={item.rating}
                tmdbData={tmdbMap[item.tmdbKey]}
                onClick={() => onItemClick(item.id)}
              />
            </div>
          </div>
        ))}
        {navigateTo && <NeonGate navigateTo={navigateTo} />}
      </div>
    </section>
  );
});
