import React from 'react';
import { Play, Heart } from 'lucide-react';
import type { Channel } from '@/types';

interface Props {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  compact?: boolean;
}

// Generate a deterministic color for channel cards
function getChannelColor(name: string): string {
  const colors = [
    'from-violet-600/40 to-purple-900/40',
    'from-blue-600/40 to-indigo-900/40',
    'from-emerald-600/40 to-teal-900/40',
    'from-rose-600/40 to-red-900/40',
    'from-amber-600/40 to-orange-900/40',
    'from-cyan-600/40 to-blue-900/40',
    'from-pink-600/40 to-fuchsia-900/40',
    'from-lime-600/40 to-green-900/40',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const ChannelCard: React.FC<Props> = ({ channel, onPlay, isFavorite, onToggleFavorite, compact }) => {
  const gradient = getChannelColor(channel.name);

  return (
    <div
      className={`relative group flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer card-shine card-glow transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_48px_rgba(157,78,221,0.3)] ${
        compact ? 'w-36 sm:w-40' : 'w-40 sm:w-48'
      }`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      onClick={() => onPlay(channel)}
    >
      {/* Background */}
      <div className={`bg-gradient-to-br ${gradient} ${compact ? 'h-20 sm:h-24' : 'h-24 sm:h-28'}`}>
        {/* Channel initial */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-white/20">
            {channel.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded-md backdrop-blur-sm">
          <span className="live-pulse !w-1.5 !h-1.5" />
          <span className="text-[9px] font-semibold uppercase text-success">Live</span>
        </div>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(channel.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70"
          >
            <Heart
              className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>
        )}

        {/* Quality badge */}
        {channel.quality && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-medium text-primary-light backdrop-blur-sm">
            {channel.quality}
          </div>
        )}
      </div>

      {/* Info — OG card bottom */}
      <div className="p-2.5 bg-bg-card border-t border-white/5">
        <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">{channel.name}</h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          {channel.country && (
            <span className="text-[10px] text-text-muted truncate">{channel.country}</span>
          )}
          {channel.category && (
            <>
              <span className="text-text-muted text-[10px]">/</span>
              <span className="text-[10px] text-text-muted capitalize truncate">{channel.category}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
