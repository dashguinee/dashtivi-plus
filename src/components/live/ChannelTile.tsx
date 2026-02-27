import React, { useState } from 'react';
import { Play, Heart, Radio } from 'lucide-react';
import type { Channel } from '@/types';

/* ═══════════════════════════════════════════════════════════
   OG Live Card — DashWebTV DNA
   16:9 aspect ratio, neon glow hover, gradient fallback
   ═══════════════════════════════════════════════════════════ */

interface Props {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

// Deterministic neon gradient pairs from channel name
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

export const ChannelTile: React.FC<Props> = ({ channel, onPlay, isFavorite, onToggleFavorite }) => {
  const [imgError, setImgError] = useState(false);
  const [c1, c2] = getNeonColors(channel.name);
  const hasImage = channel.logo && !imgError;

  return (
    <div
      onClick={() => onPlay(channel)}
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 card-shine card-glow"
      style={{
        aspectRatio: '16/9',
        background: hasImage
          ? '#1a1a1a'
          : `linear-gradient(135deg, ${c1}25 0%, ${c2}25 100%)`,
        border: `1px solid ${hasImage ? 'rgba(255,255,255,0.06)' : `${c1}33`}`,
      }}
    >
      {/* ═══ IMAGE CARD — Channel with logo ═══ */}
      {hasImage ? (
        <>
          <img
            src={channel.logo!}
            alt={channel.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-contain p-5 transition-transform duration-500 group-hover:scale-110"
          />
          {/* Dark gradient base */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </>
      ) : (
        /* ═══ NEON FALLBACK — OG glow card ═══ */
        <>
          {/* Radial glow center */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at center, ${c1}18 0%, transparent 70%)`,
            }}
          />

          {/* Icon + Name centered */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${c1}30, ${c2}30)`,
                border: `1px solid ${c1}40`,
              }}
            >
              <Radio
                className="w-5 h-5 transition-all duration-300"
                style={{ color: c1, filter: `drop-shadow(0 0 4px ${c1}80)` }}
                strokeWidth={1.5}
              />
            </div>
            <span
              className="text-sm font-semibold text-white leading-tight line-clamp-2"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              {channel.name}
            </span>
            {channel.country && (
              <span className="text-[10px] text-text-muted mt-1">{channel.country}</span>
            )}
          </div>
        </>
      )}

      {/* ═══ HOVER OVERLAY — Play button ═══ */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center z-20">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100"
          style={{
            background: 'rgba(157, 78, 221, 0.9)',
            boxShadow: '0 0 24px rgba(157, 78, 221, 0.5)',
          }}
        >
          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
        </div>
      </div>

      {/* ═══ LIVE BADGE — OG red pulse ═══ */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full z-30"
        style={{
          background: 'linear-gradient(135deg, #FF006E 0%, #E50040 100%)',
          animation: 'pulse-badge 2s ease-in-out infinite',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-white">Live</span>
      </div>

      {/* ═══ FAVORITE ═══ */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 hover:bg-black/60"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-white/80'
            }`}
          />
        </button>
      )}

      {/* ═══ BOTTOM NAME BAR — OG gradient bar ═══ */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2.5 py-2 z-20 transition-all duration-300"
        style={{
          background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.9))',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white truncate flex-1">
            {hasImage ? channel.name : ''}
          </span>
          {channel.quality && (
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded ml-1 flex-shrink-0"
              style={{
                background: 'rgba(157, 78, 221, 0.25)',
                color: '#C77DFF',
              }}
            >
              {channel.quality}
            </span>
          )}
        </div>
        {hasImage && channel.country && (
          <span className="text-[10px] text-text-muted">{channel.country}</span>
        )}
      </div>

    </div>
  );
};
