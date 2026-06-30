import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeftRight, Layers } from 'lucide-react';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { experienceForChannelId } from '@/lib/catalog';
import { usePlaylistState } from '@/lib/playlist';
import type { Channel } from '@/types';
import {
  detectQuality,
  normalizeChannelName,
  getNetworkFamily,
  QUALITY_ORDER,
  type Quality,
} from './SmartMatch';

type BarMode = 'adjacent' | 'brand';

const PEEK_CATS = [
  { id: 'sports',        name: 'Sports',  neon: '30,160,255'   },
  { id: 'news',          name: 'News',    neon: '100,210,255'  },
  { id: 'entertainment', name: 'Live',    neon: '255,50,160'   },
  { id: 'kids',          name: 'Kids',    neon: '80,230,80'    },
  { id: 'movies247',     name: 'Movies',  neon: '255,195,0'    },
  { id: 'documentary',   name: 'Docs',    neon: '0,210,195'    },
  { id: 'music',         name: 'Music',   neon: '180,80,255'   },
];

export function UnifiedChannelBar({
  currentChannel,
  visible,
  isLive,
  activeGenre: externalGenre,
  onSwitch,
}: {
  currentChannel: Channel | null;
  visible: boolean;
  isLive: boolean;
  activeGenre?: string;
  onSwitch: (ch: Channel) => void;
}) {
  const [mode, setMode] = useState<BarMode>('brand');
  const { channels: allChannels } = usePlaylistState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Internal category peek
  const [peekIdx, setPeekIdx] = useState(-1);
  const [shimmer, setShimmer] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tapTimeRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const [label, setLabel] = useState<{ text: string; neon: string; side: 'left'|'right'; show: boolean } | null>(null);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const activeGenre = externalGenre ?? (peekIdx >= 0 ? PEEK_CATS[peekIdx].id : undefined);

  const [lit, setLit] = useState(false);
  const litTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevGenreRef = useRef(activeGenre);

  useEffect(() => {
    if (activeGenre !== prevGenreRef.current) {
      prevGenreRef.current = activeGenre;
      clearTimeout(litTimerRef.current);
      setLit(true);
      litTimerRef.current = setTimeout(() => setLit(false), 700);
    }
  }, [activeGenre]);

  const handleArrowTap = (dir: 1 | -1, side: 'left' | 'right') => {
    const now = Date.now();
    const last = tapTimeRef.current[side];
    tapTimeRef.current[side] = now;

    const base = peekIdx >= 0 ? peekIdx : (dir === 1 ? -1 : PEEK_CATS.length - 1);
    const next = ((base + dir) + PEEK_CATS.length) % PEEK_CATS.length;
    const cat = PEEK_CATS[next];

    // always flash label on tap
    clearTimeout(labelTimerRef.current);
    setLabel({ text: cat.name, neon: cat.neon, side, show: true });
    labelTimerRef.current = setTimeout(() => setLabel(l => l ? { ...l, show: false } : null), 1400);

    if (now - last < 400) {
      // double-tap: peek for 7s
      clearTimeout(peekTimerRef.current);
      setPeekIdx(next);
      setShimmer(true);
      setTimeout(() => setShimmer(false), 700);
      peekTimerRef.current = setTimeout(() => setPeekIdx(-1), 7000);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [mode, currentChannel?.id, activeGenre]);

  const [barPhase, setBarPhase] = useState<'visible' | 'dropped' | 'out'>('visible');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    if (visible) {
      setBarPhase('visible');
    } else {
      setBarPhase('dropped');
      const t = setTimeout(() => setBarPhase('out'), 2200);
      timersRef.current = [t];
    }
    return () => timersRef.current.forEach(clearTimeout);
  }, [visible]);

  if (!isLive || !currentChannel) return null;

  const phaseStyle: React.CSSProperties =
    barPhase === 'visible' ? { opacity: 0.95, transform: 'translateY(0)', pointerEvents: 'auto' } :
    barPhase === 'dropped' ? { opacity: 0.50, transform: 'translateY(44px)', pointerEvents: 'auto' } :
                             { opacity: 0,    transform: 'translateY(44px)', pointerEvents: 'none' };

  const barBg = activeGenre
    ? 'linear-gradient(135deg, rgba(48,20,90,0.78) 0%, rgba(24,8,52,0.74) 40%, rgba(18,10,64,0.78) 100%)'
    : 'linear-gradient(135deg, rgba(30,27,75,0.72) 0%, rgba(4,2,20,0.68) 40%, rgba(12,30,58,0.72) 100%)';

  const barBorder = activeGenre ? 'rgba(157,78,221,0.45)' : 'rgba(157,78,221,0.18)';
  const barShadow = lit
    ? '0 0 28px rgba(157,78,221,0.55), 0 0 8px rgba(157,78,221,0.30)'
    : activeGenre
      ? '0 0 14px rgba(157,78,221,0.22)'
      : 'none';

  const prevCat = PEEK_CATS[((peekIdx <= 0 ? 0 : peekIdx) - 1 + PEEK_CATS.length) % PEEK_CATS.length];
  const nextCat = PEEK_CATS[(peekIdx < 0 ? 0 : (peekIdx + 1)) % PEEK_CATS.length];

  return (
    <div
      className="absolute left-0 right-0 z-30 md:hidden landscape:hidden"
      style={{ bottom: -20, transformOrigin: 'bottom center', ...phaseStyle, transition: 'opacity 600ms ease-out, transform 500ms cubic-bezier(0.4,0,0.2,1)' }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Left neon arc — prev category, kissing the pill's left edge */}
      <button
        onClick={() => handleArrowTap(-1, 'left')}
        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-40"
        style={{ left: 'calc(18% - 10px)' }}
      >
        <svg width="10" height="28" viewBox="0 0 10 28" fill="none"
          style={{ filter: `drop-shadow(0 0 5px rgba(${prevCat.neon},0.9)) drop-shadow(0 0 10px rgba(${prevCat.neon},0.5))` }}>
          <path d="M8 2 C1 7, 1 21, 8 26" stroke={`rgb(${prevCat.neon})`} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {/* Label flash */}
        <span
          className="absolute bottom-full mb-1 text-[8px] font-semibold whitespace-nowrap tracking-wide"
          style={{
            color: `rgb(${prevCat.neon})`,
            textShadow: `0 0 8px rgba(${prevCat.neon},0.9)`,
            opacity: label?.side === 'left' && label.show ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >{prevCat.name}</span>
      </button>

      {/* Right neon arc — next category, kissing the pill's right edge */}
      <button
        onClick={() => handleArrowTap(1, 'right')}
        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-40"
        style={{ right: 'calc(18% - 10px)' }}
      >
        <svg width="10" height="28" viewBox="0 0 10 28" fill="none"
          style={{ filter: `drop-shadow(0 0 5px rgba(${nextCat.neon},0.9)) drop-shadow(0 0 10px rgba(${nextCat.neon},0.5))` }}>
          <path d="M2 2 C9 7, 9 21, 2 26" stroke={`rgb(${nextCat.neon})`} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {/* Label flash */}
        <span
          className="absolute bottom-full mb-1 text-[8px] font-semibold whitespace-nowrap tracking-wide"
          style={{
            color: `rgb(${nextCat.neon})`,
            textShadow: `0 0 8px rgba(${nextCat.neon},0.9)`,
            opacity: label?.side === 'right' && label.show ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >{nextCat.name}</span>
      </button>

      <div
        className="mx-[18%] rounded-2xl overflow-hidden relative"
        style={{
          background: barBg,
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: `1px solid ${barBorder}`,
          boxShadow: barShadow,
          transition: 'background 400ms, border-color 400ms, box-shadow 600ms',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shimmer sweep on category peek */}
        {shimmer && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(200,170,255,0.18) 40%, rgba(255,255,255,0.12) 50%, rgba(200,170,255,0.18) 60%, transparent 100%)',
              animation: 'shimmer 650ms ease-out forwards',
            }}
          />
        )}

        {/* Organic bottom glow — pulses on category switch */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 40,
            background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(157,78,221,0.28) 0%, transparent 70%)',
            opacity: lit ? 1 : (activeGenre ? 0.5 : 0),
            transition: 'opacity 600ms ease-out',
          }}
        />
        <div className="flex items-stretch" style={{ minHeight: 58 }}>

          {/* Dial — 2 mode icons */}
          <div className="flex flex-col items-center justify-center gap-1 px-2 py-2 flex-shrink-0">
            {([
              { id: 'adjacent' as BarMode, icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
              { id: 'brand'    as BarMode, icon: <Layers          className="w-3.5 h-3.5" /> },
            ] as const).map(({ id, icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
                  ${mode === id && !activeGenre
                    ? 'bg-primary/30 text-primary-light shadow-[0_0_8px_rgba(157,78,221,0.4)]'
                    : 'text-white/25 hover:text-white/55'}`}
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="w-px bg-white/[0.08] flex-shrink-0 my-3" />

          <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-3 flex-1">
            {activeGenre ? (
              <GenreChannels
                currentChannel={currentChannel}
                allChannels={allChannels}
                activeGenre={activeGenre}
                onSwitch={onSwitch}
              />
            ) : mode === 'adjacent' ? (
              <AdjacentContent
                currentChannel={currentChannel}
                allChannels={allChannels}
                onSwitch={onSwitch}
              />
            ) : (
              <BrandContent
                currentChannel={currentChannel}
                allChannels={allChannels}
                onSwitch={onSwitch}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenreChannels({ currentChannel, allChannels, activeGenre, onSwitch }: {
  currentChannel: Channel; allChannels: Channel[]; activeGenre: string; onSwitch: (ch: Channel) => void;
}) {
  const channels = useMemo(() =>
    allChannels
      .filter(ch => ch.id !== currentChannel.id &&
        experienceForChannelId(ch.id)?.toLowerCase() === activeGenre.toLowerCase())
      .slice(0, 18),
    [allChannels, currentChannel.id, activeGenre]
  );
  if (!channels.length) return <span className="text-[11px] text-white/30">No channels in this category</span>;
  return (
    <>
      <span className="text-[9px] text-primary-light/70 uppercase tracking-wider font-medium flex-shrink-0 mr-0.5">{activeGenre}</span>
      {channels.map(ch => <ChannelCard key={ch.id} channel={ch} onClick={() => onSwitch(ch)} />)}
    </>
  );
}

function AdjacentContent({ currentChannel, allChannels, onSwitch }: {
  currentChannel: Channel; allChannels: Channel[]; onSwitch: (ch: Channel) => void;
}) {
  const idx = allChannels.findIndex(ch => ch.id === currentChannel.id);
  if (idx === -1) return <span className="text-[11px] text-white/30">No adjacent channels</span>;
  const before = allChannels.slice(Math.max(0, idx - 4), idx);
  const after  = allChannels.slice(idx + 1, Math.min(allChannels.length, idx + 5));
  return (
    <>
      {before.map(ch => <ChannelCard key={ch.id} channel={ch} onClick={() => onSwitch(ch)} />)}
      <div className="flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl bg-primary/20 border border-primary/40">
        <div className="w-6 h-6 flex-shrink-0">
          <ChannelIcon src={currentChannel.logo} name={currentChannel.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
        </div>
        <span className="text-[10px] text-primary-light font-medium whitespace-nowrap max-w-[64px] truncate">{currentChannel.name}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
      </div>
      {after.map(ch => <ChannelCard key={ch.id} channel={ch} onClick={() => onSwitch(ch)} />)}
    </>
  );
}

function BrandContent({ currentChannel, allChannels, onSwitch }: {
  currentChannel: Channel; allChannels: Channel[]; onSwitch: (ch: Channel) => void;
}) {
  const currentNorm    = useMemo(() => normalizeChannelName(currentChannel.name), [currentChannel.name]);
  const currentQuality = useMemo(() => detectQuality(currentChannel.name), [currentChannel.name]);
  const currentFamily  = useMemo(() => getNetworkFamily(currentChannel.name), [currentChannel.name]);

  const qualityVariants = useMemo(() => {
    const variants: { channel: Channel; quality: Quality }[] = [];
    for (const ch of allChannels) {
      if (ch.id === currentChannel.id) continue;
      if (normalizeChannelName(ch.name) === currentNorm) variants.push({ channel: ch, quality: detectQuality(ch.name) });
    }
    return variants.sort((a, b) => QUALITY_ORDER[b.quality] - QUALITY_ORDER[a.quality]);
  }, [allChannels, currentChannel.id, currentNorm]);

  const familyChannels = useMemo(() => {
    if (!currentFamily) return [];
    const seen = new Set<string>([currentNorm, ...qualityVariants.map(v => normalizeChannelName(v.channel.name))]);
    const fam: Channel[] = [];
    for (const ch of allChannels) {
      if (ch.id === currentChannel.id) continue;
      const norm = normalizeChannelName(ch.name);
      if (seen.has(norm)) continue;
      if (getNetworkFamily(ch.name) === currentFamily) { seen.add(norm); fam.push(ch); }
    }
    return fam.slice(0, 12);
  }, [allChannels, currentChannel.id, currentFamily, currentNorm, qualityVariants]);

  const hasVariants = qualityVariants.length > 0;
  const hasFamily   = familyChannels.length > 0;
  if (!hasVariants && !hasFamily) return <span className="text-[11px] text-white/30">No related channels</span>;

  return (
    <>
      {hasVariants && (
        <>
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium flex-shrink-0 mr-0.5">Quality</span>
          <QualityBadge quality={currentQuality} channel={currentChannel} isCurrent />
          {qualityVariants.map(v => (
            <QualityBadge key={v.channel.id} quality={v.quality} channel={v.channel} onClick={() => onSwitch(v.channel)} />
          ))}
        </>
      )}
      {hasVariants && hasFamily && <div className="w-px h-7 bg-white/[0.08] flex-shrink-0 mx-1" />}
      {hasFamily && (
        <>
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium flex-shrink-0 mr-0.5">{currentFamily}</span>
          {familyChannels.map(ch => <ChannelCard key={ch.id} channel={ch} onClick={() => onSwitch(ch)} />)}
        </>
      )}
    </>
  );
}

function ChannelCard({ channel, onClick }: { channel: Channel; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl border
                 bg-white/[0.04] border-transparent hover:bg-white/[0.08] hover:border-white/15
                 active:scale-95 transition-[transform,background-color,border-color] duration-200"
    >
      <div className="w-6 h-6 flex-shrink-0">
        <ChannelIcon src={channel.logo} name={channel.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
      </div>
      <span className="text-[10px] text-white/55 whitespace-nowrap max-w-[72px] truncate">{channel.name}</span>
    </button>
  );
}

function QualityBadge({ quality, channel, isCurrent, onClick }: {
  quality: Quality; channel: Channel; isCurrent?: boolean; onClick?: () => void;
}) {
  const styles: Record<Quality, { bg: string; text: string; border: string }> = {
    '4K': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    UHD:  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    FHD:  { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20' },
    HD:   { bg: 'bg-white/5', text: 'text-white/60', border: 'border-white/10' },
    SD:   { bg: 'bg-white/[0.03]', text: 'text-white/40', border: 'border-white/[0.06]' },
  };
  const s = isCurrent ? { bg: 'bg-primary/20', text: 'text-primary-light', border: 'border-primary/60' } : styles[quality];
  return (
    <button
      onClick={onClick}
      disabled={isCurrent}
      className={`flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl border
                  ${isCurrent ? 'cursor-default' : 'hover:brightness-125 active:scale-95'}
                  transition-[transform,filter] duration-200 ${s.bg} ${s.border}`}
    >
      <div className="w-6 h-6 flex-shrink-0">
        <ChannelIcon src={channel.logo} name={channel.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
      </div>
      <span className={`text-[11px] font-bold whitespace-nowrap ${s.text}`}>{quality}</span>
      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />}
    </button>
  );
}
