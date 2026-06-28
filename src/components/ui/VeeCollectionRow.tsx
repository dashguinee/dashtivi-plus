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
  /** Warm-luxury accent (hex) for the row dot + glow. Defaults to the house purple.
   *  Ignored for Top-10 rows (those stay editorial red). Additive — omit for legacy look. */
  accent?: string;
  /** Editorial row (curated-by-humans): warmer, heavier title in the display serif-ish
   *  face. Utility rows leave this off for the clean computed look. */
  editorial?: boolean;
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
  accent,
  editorial = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length < 3) return null;

  // Dot + glow: Top-10 keeps editorial red; otherwise honour the warm accent (gold /
  // terracotta on editorial rows), falling back to the house purple for utility rows.
  const dotBg = isTop10
    ? 'linear-gradient(135deg, #E50914, #B20710)'
    : accent
      ? `linear-gradient(135deg, ${accent}, ${accent}99)`
      : 'linear-gradient(135deg, #9D4EDD, #7B2FBE)';
  const dotGlow = isTop10
    ? '0 0 6px rgba(229,9,20,0.5)'
    : accent
      ? `0 0 7px ${accent}66`
      : '0 0 4px rgba(157,78,221,0.4)';

  return (
    <section>
      <div className="px-4 mb-2">
        <h3
          className={`flex items-center gap-1.5 ${editorial ? 'text-[16.5px] font-bold text-white/80' : 'text-[15.5px] font-semibold text-white/65'}`}
          style={{ fontFamily: "'Clash Display', 'Space Grotesk', sans-serif", letterSpacing: editorial ? '-0.02em' : '-0.015em' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dotBg, boxShadow: dotGlow }}
          />
          {name}
          <RowCountBadge count={items.length} label={countLabel} />
        </h3>
        {tagline && <p className="text-[11px] text-white/25 mt-0.5">{tagline}</p>}
      </div>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2 items-end"
        data-haptic="lush"
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
