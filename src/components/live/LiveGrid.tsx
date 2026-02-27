import React from 'react';
import { Tv } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { ChannelTile } from './ChannelTile';
import { useChannels } from '@/hooks/useChannels';
import type { Channel } from '@/types';

interface Props {
  onPlay: (channel: Channel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export const LiveGrid: React.FC<Props> = ({ onPlay, isFavorite, onToggleFavorite }) => {
  const { channels, activeCategory, changeCategory, totalCount } = useChannels();

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="px-4 lg:px-6 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tv className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Live TV</h1>
            <p className="text-sm text-text-secondary">{totalCount} channels streaming now</p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="sticky top-14 z-20 bg-bg/95 backdrop-blur-md">
        <CategoryFilter active={activeCategory} onChange={changeCategory} />
      </div>

      {/* Grid */}
      <div className="px-4 lg:px-6 py-4">
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">📡</div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">No channels found</h3>
            <p className="text-sm text-text-secondary">Try a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {channels.map((ch) => (
              <ChannelTile
                key={ch.id}
                channel={ch}
                onPlay={onPlay}
                isFavorite={isFavorite(ch.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result count */}
      {channels.length > 0 && (
        <div className="px-4 lg:px-6 pb-24 text-center">
          <p className="text-xs text-text-muted">
            Showing {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};
