import React from 'react';
import { Play, Heart } from 'lucide-react';
import type { Channel } from '@/types';

interface Props {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

function getChannelGradient(name: string): string {
  const gradients = [
    'from-violet-800/30 to-indigo-900/30',
    'from-blue-800/30 to-cyan-900/30',
    'from-emerald-800/30 to-teal-900/30',
    'from-rose-800/30 to-pink-900/30',
    'from-amber-800/30 to-orange-900/30',
    'from-fuchsia-800/30 to-purple-900/30',
    'from-sky-800/30 to-blue-900/30',
    'from-lime-800/30 to-green-900/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export const ChannelTile: React.FC<Props> = ({ channel, onPlay, isFavorite, onToggleFavorite }) => {
  const gradient = getChannelGradient(channel.name);

  return (
    <div
      onClick={() => onPlay(channel)}
      className="group relative bg-bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.05] border border-white/5 hover:border-primary/20 card-shine card-glow"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
    >
      {/* Thumbnail area */}
      <div className={`relative h-28 sm:h-32 bg-gradient-to-br ${gradient}`}>
        {/* Channel initial */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black text-white/10">
            {channel.name.charAt(0)}
          </span>
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 shadow-lg shadow-primary/40">
            <Play className="w-6 h-6 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Live indicator */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded-md backdrop-blur-sm">
          <span className="live-pulse !w-1.5 !h-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-success">Live</span>
        </div>

        {/* Favorite */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(channel.id);
            }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-white/80'
              }`}
            />
          </button>
        )}

        {/* Quality badge */}
        {channel.quality && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-medium text-primary-light">
            {channel.quality}
          </div>
        )}
      </div>

      {/* Info — OG depth */}
      <div className="p-3 border-t border-white/5">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
          {channel.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            {channel.country && (
              <span className="text-[11px] text-text-muted">{channel.country}</span>
            )}
            {channel.category && (
              <>
                <span className="text-text-muted/30 text-[10px]">|</span>
                <span className="text-[11px] text-text-muted capitalize">{channel.category}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
