/**
 * VeeCollectionRow — Horizontal scroller for VEE intelligence collections.
 * Used on Movies and Series pages to show curated, TMDB-powered rows.
 */
import React, { useRef } from 'react';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';

interface VeeCollectionRowProps {
  name: string;
  tagline: string;
  items: Array<{
    id: number;
    name: string;
    poster: string;
    rating?: string;
    tmdbKey: string;
  }>;
  tmdbMap: Record<string, TmdbEntry>;
  onItemClick: (id: number) => void;
}

export const VeeCollectionRow: React.FC<VeeCollectionRowProps> = ({
  name,
  tagline,
  items,
  tmdbMap,
  onItemClick,
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
              background: 'linear-gradient(135deg, #9D4EDD, #7B2FBE)',
              boxShadow: '0 0 4px rgba(157,78,221,0.4)',
            }}
          />
          {name}
        </h3>
        <p className="text-[11px] text-white/25 mt-0.5">{tagline}</p>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2"
      >
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-[108px]">
            <PosterCard
              title={item.name}
              poster={item.poster}
              rating={item.rating}
              tmdbData={tmdbMap[item.tmdbKey]}
              onClick={() => onItemClick(item.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
