import { Play, ChevronRight } from 'lucide-react';
import { t } from '@/i18n';
import type { Lang } from '@/i18n';
import type { CatalogChannel } from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { tap } from '@/lib/haptics';

/**
 * NbaShowcase — the NBA headline card, a near-twin of HomePage's WorldCupHero
 * but NBA-themed: deep navy → dark red → black, NBA red (#C8102E) + royal
 * blue (#1D428A) accents (never green; green is the free-gift color in this app).
 *
 * One signature element: a slow royal-blue → red court-light sweep. Restrained,
 * premium. "NBA alone adds perceived value."
 *
 * Sourced from catalog.byExperience['Sports'] filtered by /nba/i, same
 * channels[] + onPlay shape WorldCupHero takes.
 */

const NBA_RED = '#C8102E';
const NBA_BLUE = '#1D428A';

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export function NbaShowcase({
  channels,
  lang,
  onPlay,
  onSeeAll,
}: {
  channels: CatalogChannel[];
  lang: Lang;
  /** Play the featured (first) NBA channel, with the row as playlist context. */
  onPlay: (ch: CatalogChannel) => void;
  /** Open the dedicated NBA collection page. */
  onSeeAll?: () => void;
}) {
  const featured = channels[0];
  if (!featured) return null;

  const liveLabel = t(lang, 'liveLabel'); // EN DIRECT / LIVE

  return (
    <section className="px-4 mt-2">
      <button
        onPointerDown={() => tap()}
        onClick={() => onPlay(featured)}
        className="relative w-full overflow-hidden rounded-2xl text-left active:scale-[0.99] transition-transform duration-200 group"
        style={{
          height: '34vh',
          minHeight: 220,
          maxHeight: 300,
          background:
            'radial-gradient(ellipse 90% 70% at 22% 18%, rgba(29,66,138,0.30) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 80% 80% at 92% 92%, rgba(200,16,46,0.22) 0%, transparent 70%), ' +
            'linear-gradient(160deg, #0d1a33 0%, #1a0a14 55%, #050608 100%)',
          border: '1px solid rgba(200,16,46,0.22)',
          boxShadow: '0 0 40px rgba(29,66,138,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <style>{`
          @keyframes nba-sweep { 0%{transform:translateX(-40%)} 100%{transform:translateX(140%)} }
          @keyframes nba-play-breathe {
            0%,100% { box-shadow: 0 0 22px rgba(200,16,46,0.45); transform: scale(1); }
            50%     { box-shadow: 0 0 34px rgba(200,16,46,0.70); transform: scale(1.06); }
          }
        `}</style>

        {/* SIGNATURE — slow royal-blue → red court-light sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-y-0 -left-1/3 w-2/3 opacity-70"
            style={{
              background:
                'linear-gradient(115deg, transparent 20%, rgba(29,66,138,0.10) 44%, rgba(255,255,255,0.06) 50%, rgba(200,16,46,0.10) 56%, transparent 72%)',
              animation: 'nba-sweep 7s ease-in-out infinite',
            }}
          />
        </div>

        {/* Cinema vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
        />

        {/* LIVE · NBA pill — top left */}
        <div
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(200,16,46,0.16)',
            border: '1px solid rgba(200,16,46,0.42)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: NBA_RED }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: NBA_RED }} />
          </span>
          <span className="text-[11px] font-black tracking-[2.5px] uppercase" style={{ color: '#FF8FA3' }}>
            {liveLabel} · NBA
          </span>
        </div>

        {/* See all — top right, opens the NBA collection */}
        {onSeeAll && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); tap(); onSeeAll(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 flex items-center gap-0.5 text-[11px] font-semibold tracking-wide px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
            style={{ background: 'rgba(29,66,138,0.22)', border: '1px solid rgba(29,66,138,0.45)', color: '#9DB4E8' }}
          >
            {t(lang, 'seeAll')}
            <ChevronRight className="w-3 h-3" />
          </span>
        )}

        {/* Marquee channel — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(29,66,138,0.30)' }}
          >
            <ChannelIcon src={featured.icon} name={featured.name} size="md" eager className="!w-14 !h-14" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-[2px] uppercase mb-1" style={{ color: 'rgba(157,180,232,0.75)' }}>
              {lang === 'fr' ? 'En direct · NBA' : 'Now streaming · NBA'}
            </p>
            <h1 className="text-[23px] leading-tight font-black text-white tracking-tight line-clamp-2">
              {cleanName(featured.name)}
            </h1>
            <p className="text-[12px] text-white/45 mt-0.5">
              {lang === 'fr'
                ? `${channels.length} chaîne${channels.length !== 1 ? 's' : ''} NBA en direct`
                : `${channels.length} NBA channel${channels.length !== 1 ? 's' : ''} live now`}
            </p>
          </div>
          {/* Big play target */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${NBA_RED}, #8E0B20)`,
              animation: 'nba-play-breathe 2.8s ease-in-out infinite',
            }}
          >
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </div>
        </div>
      </button>

      {/* NBA channel row — the rest of the lineup beneath the marquee */}
      {channels.length > 1 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pt-3 pb-1 -mx-4 px-4">
          {channels.map((ch) => (
            <button
              key={ch.stream_id}
              onPointerDown={() => tap()}
              onClick={() => onPlay(ch)}
              className="flex-shrink-0 group"
              style={{ width: 130 }}
            >
              <div
                className="relative rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.04] group-active:scale-[0.95]"
                style={{
                  width: 130,
                  height: 96,
                  background: 'linear-gradient(157deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.012) 100%)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(29,66,138,0.30)',
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-2/3 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse 85% 100% at 32% 0%, ${NBA_BLUE}33, transparent 72%)` }}
                />
                <ChannelIcon src={ch.icon} name={ch.name} size="md" />
                <div
                  className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: NBA_RED }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: NBA_RED, boxShadow: '0 0 5px rgba(200,16,46,0.9)' }} />
                  </span>
                  <span className="text-[7px] font-bold text-white/75 tracking-wide">{liveLabel}</span>
                </div>
              </div>
              <p className="text-[10.5px] leading-tight text-white/60 text-center mt-1.5 px-0.5 line-clamp-2 font-medium tracking-tight group-hover:text-white/90 transition-colors">
                {cleanName(ch.name)}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
