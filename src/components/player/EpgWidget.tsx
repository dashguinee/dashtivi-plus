import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { useEpg } from '@/hooks/useEpg';

interface Props {
  streamId: number | null;
  visible: boolean;
  isLive: boolean;
}

/** EPG Widget — bottom-left now playing + upcoming schedule + expandable info */
export const EpgWidget: React.FC<Props> = React.memo(({ streamId, visible, isLive }) => {
  const { now, next, loading } = useEpg(isLive ? streamId : null);
  const [expanded, setExpanded] = useState(false);

  // Don't render if no EPG data or not a live channel
  if (!isLive || (!now && !loading)) return null;

  // Format time from timestamp
  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Progress bar for current show
  const progress = now
    ? Math.min(((Date.now() / 1000 - now.startTimestamp) / (now.stopTimestamp - now.startTimestamp)) * 100, 100)
    : 0;

  return (
    <div
      className={`absolute bottom-[72px] sm:bottom-[80px] left-2 z-30 transition-[opacity,transform] duration-500 ease-out
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      style={{ maxWidth: expanded ? 280 : 200 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-xl overflow-hidden transition-[max-height,opacity] duration-500 ease-out"
        style={{
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(157, 78, 221, 0.1)',
        }}
      >
        {/* Now Playing — always visible */}
        {loading ? (
          <div className="px-3 py-2">
            <div className="skeleton h-3 w-16 rounded mb-1" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
        ) : now ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left px-3 py-2 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Now</span>
              </div>
              {expanded
                ? <ChevronDown className="w-3 h-3 text-white/20" />
                : <ChevronUp className="w-3 h-3 text-white/20" />
              }
            </div>
            <p className="text-[11px] text-white/85 font-medium leading-tight line-clamp-1">
              {now.title}
            </p>
            {/* Progress bar */}
            <div className="mt-1.5 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-[width] duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] text-white/25">{formatTime(now.startTimestamp)}</span>
              <span className="text-[8px] text-white/25">{formatTime(now.stopTimestamp)}</span>
            </div>
          </button>
        ) : null}

        {/* Expanded — upcoming shows + description */}
        {expanded && now && (
          <div className="border-t border-white/[0.04]">
            {/* Description — scrollable */}
            {now.description && (
              <div className="px-3 py-2 max-h-[60px] overflow-y-auto scrollbar-hide">
                <p className="text-[9px] text-white/35 leading-relaxed">
                  {now.description}
                </p>
              </div>
            )}

            {/* Next shows */}
            {next.length > 0 && (
              <div className="border-t border-white/[0.04] px-3 py-1.5">
                <span className="text-[8px] text-white/25 uppercase tracking-wider">Next</span>
                {next.map((show, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1">
                    <Clock className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                    <span className="text-[9px] text-white/40 flex-shrink-0">{formatTime(show.startTimestamp)}</span>
                    <span className="text-[9px] text-white/50 truncate">{show.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
