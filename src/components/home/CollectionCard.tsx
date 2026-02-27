import React from 'react';
import { Lock } from 'lucide-react';
import type { Collection } from '@/types';
import { getCollectionGradient, getCollectionEmoji, getCollectionChannelCount } from '@/data/collections';

interface Props {
  collection: Collection;
  onClick: (collection: Collection) => void;
}

export const CollectionCard: React.FC<Props> = ({ collection, onClick }) => {
  const gradient = getCollectionGradient(collection.key);
  const emoji = getCollectionEmoji(collection.icon);
  const channelCount = getCollectionChannelCount(collection.key);
  const itemCount = channelCount || (collection.movies.length + (collection.series?.length || 0));
  const isPremium = !collection.channelFilter && collection.movies.some((m) => typeof m === 'number' && m > 0);

  return (
    <div
      onClick={() => onClick(collection)}
      className="relative group flex-shrink-0 w-36 sm:w-44 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-primary/10 card-shine"
    >
      {/* Background gradient */}
      <div className={`h-48 sm:h-56 bg-gradient-to-br ${gradient} relative`}>
        {/* Emoji icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity group-hover:scale-110 transform duration-300">
            {emoji}
          </span>
        </div>

        {/* Premium badge */}
        {isPremium && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500/80 rounded-md backdrop-blur-sm">
            <Lock className="w-2.5 h-2.5" />
            <span className="text-[9px] font-bold uppercase">Premium</span>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-sm font-semibold text-white leading-tight">{collection.title}</h3>
          <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">
            {collection.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-primary-light font-medium">
              {itemCount} {collection.channelFilter ? 'channels' : 'titles'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
