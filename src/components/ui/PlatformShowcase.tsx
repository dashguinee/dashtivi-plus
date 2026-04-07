import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { safeImageUrl } from '@/lib/xtream';
import { useLanguage } from '@/i18n';

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
  { id: 'netflix',    name: 'Netflix',    logo: '/logos/netflix-3d.png',     color: '#E50914', colorEnd: '#831010', categoryIds: ['106', '169'], type: 'series' },
  { id: 'prime',      name: 'Prime',      logo: '/logos/prime-3d.webp',      color: '#00A8E1', colorEnd: '#005F8A', categoryIds: ['108'],        type: 'series' },
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
  const { t } = useLanguage();
  if (platforms.length === 0) return null;

  return (
    <section className="mb-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[20px] font-black tracking-tight text-white">Originals</h2>
          <div className="w-1.5 h-1.5 rounded-full bg-primary mb-0.5" style={{ boxShadow: '0 0 6px rgba(157,78,221,0.4)' }} />
        </div>
        <button
          onClick={() => onNavigate('/originals')}
          className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/50 transition-colors tracking-wide"
        >
          {t('more')}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[11px] text-white/25 px-4 -mt-2 mb-3">{t('originalsSubtitle')}</p>

      {/* Platform cards — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3">
        {platforms.map(({ platform, items, tmdbMap }, i) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            items={items}
            tmdbMap={tmdbMap}
            index={i}
            onTap={() => onTapPlatform ? onTapPlatform(platform.id) : onNavigate(`/originals#${platform.id}`)}
          />
        ))}
      </div>
    </section>
  );
});

/** Single platform card — premium brand fill + poster previews */
const PlatformCard = React.memo(function PlatformCard({
  platform,
  items,
  tmdbMap,
  index = 0,
  onTap,
}: {
  platform: PlatformDef;
  items: { id: number; name: string; poster?: string; rating?: string }[];
  tmdbMap?: Record<string, TmdbEntry>;
  index?: number;
  onTap: () => void;
}) {
  const { t } = useLanguage();
  const previews = items.slice(0, 3);
  const isNetflix = platform.id === 'netflix';

  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 relative group rounded-2xl overflow-hidden card-press hover:scale-[1.02] active:scale-[0.97]"
      style={{
        width: 240,
        boxShadow: `0 4px 20px ${platform.color}12, 0 0 0 1px ${platform.color}18`,
        animation: `platform-card-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${index * 130}ms both`,
      }}
    >
      {/* Brand gradient fill — the signature look */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(160deg, ${platform.color}22 0%, ${platform.colorEnd}15 35%, rgba(10,10,15,0.97) 70%)`,
        }}
      />

      {/* Netflix bottom red gradient accent */}
      {isNetflix && (
        <div
          className="absolute bottom-0 left-0 right-0 h-16 rounded-b-2xl pointer-events-none z-[1]"
          style={{
            background: 'linear-gradient(to top, rgba(229,9,20,0.12) 0%, rgba(229,9,20,0.04) 50%, transparent 100%)',
          }}
        />
      )}

      {/* Subtle beam sweep on border */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          padding: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${platform.color}20 30%, ${platform.color}50 50%, ${platform.color}20 70%, transparent 100%)`,
          backgroundSize: '200% 100%',
          animation: 'beam-sweep 5s ease-in-out infinite alternate',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Platform header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `${platform.color}20`,
              boxShadow: `0 0 16px ${platform.color}25, inset 0 0 8px ${platform.color}10`,
            }}
          >
            <img src={platform.logo} alt={platform.name} className="h-[24px] w-auto" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-bold text-white/95 tracking-tight">{platform.name}</span>
            {isNetflix && (
              <span className="block text-[9px] text-[#E50914]/60 font-medium mt-0.5">{t('openNetflix')}</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors" />
        </div>

        {/* Poster previews — 3 posters with TMDB fallback */}
        <div className="flex gap-2 px-4 pb-4">
          {previews.map((item) => (
            <PosterPreview key={item.id} item={item} color={platform.color} tmdbMap={tmdbMap} />
          ))}
          {previews.length < 3 && Array.from({ length: 3 - previews.length }).map((_, i) => (
            <div key={`e${i}`} className="flex-1 aspect-[2/3] rounded-xl" style={{ background: `${platform.color}06`, border: `1px solid ${platform.color}08` }} />
          ))}
        </div>

        {/* Bottom brand glow line */}
        <div
          className="h-[1.5px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 10%, ${platform.color}35 50%, transparent 90%)`,
          }}
        />
      </div>
    </button>
  );
});

/** Poster with Xtream → proxy → TMDB fallback chain */
function PosterPreview({ item, color, tmdbMap }: { item: { id: number; name: string; poster?: string }; color: string; tmdbMap?: Record<string, TmdbEntry> }) {
  const [failed, setFailed] = useState(false);
  const [tmdbFailed, setTmdbFailed] = useState(false);

  const safeSrc = !failed ? safeImageUrl(item.poster) : null;

  // TMDB fallback
  const tmdb = tmdbMap?.[`s:${item.id}`] || tmdbMap?.[`m:${item.id}`];
  const tmdbSrc = tmdb?.p ? `https://image.tmdb.org/t/p/w185${tmdb.p}` : null;

  return (
    <div className="flex-1 aspect-[2/3] rounded-xl overflow-hidden" style={{ background: `${color}06`, border: `1px solid ${color}10` }}>
      {safeSrc && !failed ? (
        <img src={safeSrc} alt={item.name || 'Poster'} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : tmdbSrc && !tmdbFailed ? (
        <img src={tmdbSrc} alt={item.name || 'Poster'} className="w-full h-full object-cover" loading="lazy" onError={() => setTmdbFailed(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)` }}>
          <span className="text-[8px] text-white/15 font-medium text-center px-1 line-clamp-2">{item.name?.replace(/\s*\(\d{4}\)\s*$/, '')}</span>
        </div>
      )}
    </div>
  );
}
