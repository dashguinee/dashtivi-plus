import React, { useRef, useEffect, useMemo } from 'react';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import type { Channel } from '@/types';

interface SmartMatchProps {
  currentChannel: Channel;
  allChannels: Channel[];
  onSwitch: (channel: Channel) => void;
  visible: boolean;
}

// --- Quality detection (mirrors xtream.ts logic but works on Channel.name) ---

type Quality = '4K' | 'UHD' | 'FHD' | 'HD' | 'SD';

const QUALITY_ORDER: Record<Quality, number> = { SD: 0, HD: 1, FHD: 2, '4K': 3, UHD: 4 };

function detectQuality(name: string): Quality {
  if (name.includes('4K') || name.includes('(4K)')) return '4K';
  if (/\bUHD\b/i.test(name)) return 'UHD';
  if (/\bFHD\b/i.test(name)) return 'FHD';
  if (/\bSD\b/i.test(name)) return 'SD';
  return 'HD';
}

function normalizeChannelName(name: string): string {
  let n = name;
  // Strip prefixes: "UK || ", "UK : ", "UHD |", "|AF| ", "FR (C+AF) "
  n = n.replace(/^(UK\s*[\|:]+\s*|UHD\s*▎\s*|\|[A-Z]+\|\s*|FR\s*\([^)]*\)\s*)/i, '');
  // Strip suffixes: [UK], (4K), HD, FHD, UHD
  n = n.replace(/\s*[\[(][^\])]*[\])]\s*$/g, '');
  n = n.replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '');
  n = n.replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '');
  n = n.replace(/\s+/g, ' ').trim();
  // Remove trailing S (for "MAIN EVENTS" vs "MAIN EVENT")
  n = n.replace(/S\s*$/i, '');
  return n;
}

// --- Network family detection ---

function getNetworkFamily(name: string): string | null {
  const nl = name.toLowerCase();
  if (nl.includes('bein') || nl.includes('alkass')) return 'beIN';
  if (nl.includes('sky sport')) return 'Sky Sports';
  if (nl.includes('supersport') || nl.includes('super sport')) return 'SuperSport';
  if (nl.includes('espn')) return 'ESPN';
  if (nl.includes('cnn')) return 'CNN';
  if (nl.includes('bbc')) return 'BBC';
  if (nl.includes('disney')) return 'Disney';
  if (nl.includes('nick')) return 'Nickelodeon';
  if (nl.includes('hbo')) return 'HBO';
  if (nl.includes('discovery')) return 'Discovery';
  if (nl.includes('nat geo')) return 'NatGeo';
  if (nl.includes('mbc')) return 'MBC';
  if (nl.includes('mtv')) return 'MTV';
  if (nl.includes('fox')) return 'Fox';
  if (nl.includes('cartoon network')) return 'Cartoon Network';
  if (nl.includes('osn')) return 'OSN';
  if (nl.includes('star sport')) return 'Star Sports';
  if (nl.includes('dstv')) return 'DStv';
  if (nl.includes('canal+') || nl.includes('canal +')) return 'Canal+';
  if (nl.includes('showtime') || nl.includes('sho ')) return 'Showtime';
  if (nl.includes('sky news')) return 'Sky News';
  if (nl.includes('al jazeera')) return 'Al Jazeera';
  return null;
}

// --- Quality badge colors ---

function qualityBadgeStyle(q: Quality, isCurrent: boolean): { bg: string; text: string; border: string } {
  if (isCurrent) {
    return { bg: 'bg-primary/20', text: 'text-primary-light', border: 'border-primary/60' };
  }
  switch (q) {
    case '4K':
    case 'UHD':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'FHD':
      return { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20' };
    case 'HD':
      return { bg: 'bg-white/5', text: 'text-white/60', border: 'border-white/10' };
    case 'SD':
      return { bg: 'bg-white/[0.03]', text: 'text-white/40', border: 'border-white/[0.06]' };
  }
}

export const SmartMatch: React.FC<SmartMatchProps> = ({
  currentChannel,
  allChannels,
  onSwitch,
  visible,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentNorm = useMemo(() => normalizeChannelName(currentChannel.name), [currentChannel.name]);
  const currentQuality = useMemo(() => detectQuality(currentChannel.name), [currentChannel.name]);
  const currentFamily = useMemo(() => getNetworkFamily(currentChannel.name), [currentChannel.name]);

  // Find quality variants: same normalized name, different stream
  const qualityVariants = useMemo(() => {
    const variants: { channel: Channel; quality: Quality }[] = [];
    for (const ch of allChannels) {
      if (ch.id === currentChannel.id) continue;
      const norm = normalizeChannelName(ch.name);
      if (norm === currentNorm) {
        variants.push({ channel: ch, quality: detectQuality(ch.name) });
      }
    }
    // Sort by quality order (highest first)
    variants.sort((a, b) => QUALITY_ORDER[b.quality] - QUALITY_ORDER[a.quality]);
    return variants;
  }, [allChannels, currentChannel.id, currentNorm]);

  // Find family channels: same network, different normalized name
  const familyChannels = useMemo(() => {
    if (!currentFamily) return [];
    const family: Channel[] = [];
    const seen = new Set<string>();
    seen.add(currentNorm);
    // Also exclude quality variants (already shown above)
    for (const v of qualityVariants) {
      seen.add(normalizeChannelName(v.channel.name));
    }

    for (const ch of allChannels) {
      if (ch.id === currentChannel.id) continue;
      const norm = normalizeChannelName(ch.name);
      if (seen.has(norm)) continue;
      const fam = getNetworkFamily(ch.name);
      if (fam === currentFamily) {
        seen.add(norm);
        family.push(ch);
      }
    }
    // Keep max 12 family channels
    return family.slice(0, 12);
  }, [allChannels, currentChannel.id, currentFamily, currentNorm, qualityVariants]);

  // Auto-scroll to start when channel changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [currentChannel.id]);

  // Don't render if nothing to show
  const hasVariants = qualityVariants.length > 0;
  const hasFamily = familyChannels.length > 0;
  if (!hasVariants && !hasFamily) return null;

  return (
    <div
      className={`absolute bottom-[130px] sm:bottom-[140px] left-0 right-0 z-30 transition-all duration-300
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      <div
        className="mx-2 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(157, 78, 221, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-3 py-2"
          style={{ minHeight: 48 }}
        >
          {/* Section 1: Quality variants */}
          {hasVariants && (
            <>
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium flex-shrink-0 mr-0.5">
                Quality
              </span>

              {/* Current quality badge (always shown first) */}
              <QualityCard
                quality={currentQuality}
                name={currentChannel.name}
                logo={currentChannel.logo}
                isCurrent={true}
                onClick={() => {}}
              />

              {/* Other quality variants */}
              {qualityVariants.map((v) => (
                <QualityCard
                  key={v.channel.id}
                  quality={v.quality}
                  name={v.channel.name}
                  logo={v.channel.logo}
                  isCurrent={false}
                  onClick={() => onSwitch(v.channel)}
                />
              ))}
            </>
          )}

          {/* Divider between sections */}
          {hasVariants && hasFamily && (
            <div className="w-px h-8 bg-white/[0.08] flex-shrink-0 mx-1" />
          )}

          {/* Section 2: Family channels */}
          {hasFamily && (
            <>
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium flex-shrink-0 mr-0.5">
                {currentFamily}
              </span>

              {familyChannels.map((ch) => (
                <FamilyCard
                  key={ch.id}
                  channel={ch}
                  onClick={() => onSwitch(ch)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** Quality variant card — compact badge showing resolution tier */
function QualityCard({
  quality,
  name,
  logo,
  isCurrent,
  onClick,
}: {
  quality: Quality;
  name: string;
  logo?: string;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const style = qualityBadgeStyle(quality, isCurrent);

  return (
    <button
      onClick={onClick}
      disabled={isCurrent}
      className={`flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl
                  border transition-all duration-200
                  ${isCurrent ? 'cursor-default' : 'hover:brightness-125 active:scale-95'}
                  ${style.bg} ${style.border}`}
    >
      <div className="w-6 h-6 flex-shrink-0">
        <ChannelIcon src={logo} name={name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
      </div>
      <span className={`text-[11px] font-bold whitespace-nowrap ${style.text}`}>
        {quality}
      </span>
      {isCurrent && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
      )}
    </button>
  );
}

/** Family channel card — icon + short name */
function FamilyCard({
  channel,
  onClick,
}: {
  channel: Channel;
  onClick: () => void;
}) {
  // Extract short name: strip network prefix for cleaner display
  const shortName = useMemo(() => {
    let n = channel.name;
    // Strip common prefixes to show just the differentiator
    n = n.replace(/^(UK\s*[\|:]+\s*|UHD\s*▎\s*|\|[A-Z]+\|\s*|FR\s*\([^)]*\)\s*)/i, '');
    // Truncate if still long
    if (n.length > 20) n = n.slice(0, 18) + '...';
    return n;
  }, [channel.name]);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl
                 bg-white/[0.04] border border-transparent
                 hover:bg-white/[0.08] hover:border-white/15
                 active:scale-95 transition-all duration-200"
    >
      <div className="w-6 h-6 flex-shrink-0">
        <ChannelIcon src={channel.logo} name={channel.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
      </div>
      <span className="text-[10px] text-white/50 whitespace-nowrap max-w-[80px] truncate">
        {shortName}
      </span>
    </button>
  );
}
