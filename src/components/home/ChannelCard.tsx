import React, { useState } from 'react';
import { Play, Heart, Radio } from 'lucide-react';
import type { Channel } from '@/types';

/* ═══════════════════════════════════════════════════════════
   Channel Card — Homepage horizontal rows
   OG DashWebTV card DNA + neon fallback for no-image channels
   ═══════════════════════════════════════════════════════════ */

interface Props {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  compact?: boolean;
}

// Deterministic neon gradient pairs
const neonPairs = [
  ['#9D4EDD', '#3A86FF'],
  ['#FF006E', '#9D4EDD'],
  ['#00C853', '#00BFA5'],
  ['#FF6B35', '#FFD700'],
  ['#3A86FF', '#00D4FF'],
  ['#E040FB', '#7C4DFF'],
  ['#00BCD4', '#26A69A'],
  ['#FF5252', '#FF7043'],
  ['#7B2CBF', '#3A0CA3'],
  ['#00E5FF', '#2979FF'],
];

function getNeonColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return neonPairs[Math.abs(hash) % neonPairs.length] as [string, string];
}

export const ChannelCard: React.FC<Props> = ({ channel, onPlay, isFavorite, onToggleFavorite, compact }) => {
  const [imgError, setImgError] = useState(false);
  const [c1, c2] = getNeonColors(channel.name);
  const hasImage = channel.logo && !imgError;

  return (
    <div
      className={`relative group flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${
        compact ? 'w-36 sm:w-40' : 'w-40 sm:w-48'
      }`}
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onClick={() => onPlay(channel)}
    >
      {/* ═══ THUMBNAIL AREA ═══ */}
      <div
        className={`relative ${compact ? 'h-20 sm:h-24' : 'h-24 sm:h-28'}`}
        style={{
          background: hasImage
            ? '#1a1a1a'
            : `linear-gradient(135deg, ${c1}20 0%, ${c2}20 100%)`,
        }}
      >
        {hasImage ? (
          <img
            src={channel.logo!}
            alt={channel.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-contain p-3"
          />
        ) : (
          /* ═══ NEON FALLBACK — Gradient + Icon ═══ */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 transition-all duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${c1}30, ${c2}30)`,
                border: `1px solid ${c1}40`,
              }}
            >
              <Radio
                className="w-4 h-4"
                style={{ color: c1, filter: `drop-shadow(0 0 4px ${c1}80)` }}
                strokeWidth={1.5}
              />
            </div>
            <span
              className="text-[11px] font-semibold text-white/80 leading-tight text-center line-clamp-2"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              {channel.name}
            </span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
            style={{
              background: 'rgba(157, 78, 221, 0.9)',
              boxShadow: '0 0 20px rgba(157, 78, 221, 0.5)',
            }}
          >
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Live badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded-md backdrop-blur-sm">
          <span className="live-pulse !w-1.5 !h-1.5" />
          <span className="text-[9px] font-semibold uppercase text-success">Live</span>
        </div>

        {/* Favorite */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(channel.id);
            }}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70"
          >
            <Heart
              className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>
        )}

        {/* Quality badge */}
        {channel.quality && (
          <div
            className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium backdrop-blur-sm"
            style={{
              background: 'rgba(157, 78, 221, 0.25)',
              color: '#C77DFF',
            }}
          >
            {channel.quality}
          </div>
        )}
      </div>

      {/* ═══ INFO BAR ═══ */}
      <div className="p-2.5 bg-bg-card border-t border-white/5">
        <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
          {channel.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          {channel.country && (
            <span className="text-[10px] text-text-muted truncate">{channel.country}</span>
          )}
          {channel.category && (
            <>
              <span className="text-text-muted/30 text-[10px]">|</span>
              <span className="text-[10px] text-text-muted capitalize truncate">{channel.category}</span>
            </>
          )}
        </div>
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 12px 48px ${c1}30, inset 0 0 0 1px ${c1}25`,
        }}
      />
    </div>
  );
};
