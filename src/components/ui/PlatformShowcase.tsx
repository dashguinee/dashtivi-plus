import React from 'react';
import { ChevronRight } from 'lucide-react';
import { PosterCard } from './PosterCard';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';

/** Platform config — brand identity for each streaming service */
export interface PlatformDef {
  id: string;
  name: string;
  logo: string;
  color: string;       // primary brand hex
  colorEnd: string;    // gradient end
  categoryIds: string[];
  type: 'vod' | 'series';
}

export const PLATFORMS: PlatformDef[] = [
  { id: 'netflix',    name: 'Netflix',    logo: '/logos/netflix.svg',     color: '#E50914', colorEnd: '#831010', categoryIds: ['106', '169'], type: 'series' },
  { id: 'prime',      name: 'Prime',      logo: '/logos/prime.svg',      color: '#00A8E1', colorEnd: '#005F8A', categoryIds: ['108'],        type: 'series' },
  { id: 'hbo',        name: 'HBO',        logo: '/logos/hbo.svg',        color: '#9D4EDD', colorEnd: '#5B21B6', categoryIds: ['188'],        type: 'series' },
  { id: 'disney',     name: 'Disney+',    logo: '/logos/disney-plus.svg',color: '#113CCF', colorEnd: '#0A1F6B', categoryIds: ['102'],        type: 'series' },
  { id: 'apple',      name: 'Apple TV+',  logo: '/logos/apple-tv.svg',   color: '#A1A1AA', colorEnd: '#52525B', categoryIds: ['114'],        type: 'series' },
  { id: 'hulu',       name: 'Hulu',       logo: '/logos/hulu.svg',       color: '#1CE783', colorEnd: '#0D7A44', categoryIds: ['209'],        type: 'series' },
];

interface PlatformCardData {
  platform: PlatformDef;
  items: { id: number; name: string; poster?: string; rating?: string }[];
  tmdbMap?: Record<string, TmdbEntry>;
}

interface Props {
  platforms: PlatformCardData[];
  onNavigate: (path: string) => void;
  onTapPlatform?: (platformId: string) => void;
}

/** Premium platform showcase — metallic beam borders, brand color fades */
export const PlatformShowcase: React.FC<Props> = React.memo(({ platforms, onNavigate, onTapPlatform }) => {
  if (platforms.length === 0) return null;

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-lg font-bold text-white">Originals</h2>
        <button
          onClick={() => onNavigate('/originals')}
          className="flex items-center gap-1 text-xs text-primary-light/80 hover:text-white transition-colors"
        >
          See More
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Platform cards — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-3">
        {platforms.map(({ platform, items, tmdbMap }) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            items={items}
            tmdbMap={tmdbMap}
            onTap={() => onTapPlatform ? onTapPlatform(platform.id) : onNavigate(`/originals#${platform.id}`)}
          />
        ))}
      </div>
    </section>
  );
});

/** Single platform card — metallic beam border + brand gradient + poster previews */
const PlatformCard = React.memo(function PlatformCard({
  platform,
  items,
  tmdbMap,
  onTap,
}: {
  platform: PlatformDef;
  items: { id: number; name: string; poster?: string; rating?: string }[];
  tmdbMap?: Record<string, TmdbEntry>;
  onTap: () => void;
}) {
  const previews = items.slice(0, 4);

  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 relative group rounded-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{ width: 260 }}
    >
      {/* Metallic beam border — animated sweep */}
      <div
        className="absolute inset-0 rounded-2xl z-0"
        style={{
          padding: '1.5px',
          background: `linear-gradient(90deg, transparent 0%, ${platform.color}15 20%, ${platform.color}60 50%, ${platform.color}15 80%, transparent 100%)`,
          backgroundSize: '200% 100%',
          animation: 'beam-sweep 4s ease-in-out infinite alternate',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Inner content */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${platform.color}12 0%, rgba(10,10,15,0.95) 40%, ${platform.colorEnd}08 100%)`,
        }}
      >
        {/* Platform header — logo + name + brand glow */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `${platform.color}18`,
              boxShadow: `0 0 12px ${platform.color}20`,
            }}
          >
            <img src={platform.logo} alt={platform.name} className="h-4 w-auto" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white/90">{platform.name}</span>
            <p className="text-[10px] text-white/35">{items.length} titles</p>
          </div>
          <ChevronRight
            className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors"
          />
        </div>

        {/* Poster previews — 4 mini posters */}
        <div className="flex gap-1.5 px-3.5 pb-3.5">
          {previews.map((item) => (
            <div key={item.id} className="flex-1 aspect-[2/3] rounded-lg overflow-hidden bg-white/5">
              <PosterCard
                title={item.name}
                poster={item.poster}
                rating={item.rating}
                tmdbData={tmdbMap?.[`s:${item.id}`] || tmdbMap?.[`m:${item.id}`]}
                onClick={() => {}}
              />
            </div>
          ))}
          {/* Fill empty slots */}
          {previews.length < 4 && Array.from({ length: 4 - previews.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 aspect-[2/3] rounded-lg bg-white/[0.03]" />
          ))}
        </div>

        {/* Bottom brand accent line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${platform.color}40, transparent)`,
          }}
        />
      </div>
    </button>
  );
});
