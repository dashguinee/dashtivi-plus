import React from 'react';
import { Library, Lock } from 'lucide-react';
import { allCollections, getCollectionGradient, getCollectionEmoji, getCollectionChannelCount } from '@/data/collections';
import type { Collection } from '@/types';

interface Props {
  onSelect: (collection: Collection) => void;
}

export const CollectionBrowser: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="px-4 lg:px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Collections</h1>
            <p className="text-sm text-text-secondary">{allCollections.length} curated collections</p>
          </div>
        </div>
      </div>

      {/* Featured collections */}
      <div className="px-4 lg:px-6 mb-8">
        <h2 className="text-lg font-semibold mb-3 text-text-secondary">Featured</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCollections
            .filter((c) => c.featured)
            .map((collection) => {
              const gradient = getCollectionGradient(collection.key);
              const emoji = getCollectionEmoji(collection.icon);
              const channelCount = getCollectionChannelCount(collection.key);
              const totalItems = channelCount || (collection.movies.length + (collection.series?.length || 0));
              const isLive = !!collection.channelFilter;

              return (
                <div
                  key={collection.key}
                  onClick={() => onSelect(collection)}
                  className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-6 cursor-pointer group transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 overflow-hidden card-shine min-h-[160px]`}
                >
                  {/* Background emoji */}
                  <span className="absolute -right-4 -bottom-4 text-8xl opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-300">
                    {emoji}
                  </span>

                  {isLive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/80 rounded-md text-[10px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Live
                    </div>
                  )}

                  <div className="relative z-10">
                    <span className="text-3xl mb-3 block">{emoji}</span>
                    <h3 className="text-lg font-bold text-white mb-1">{collection.title}</h3>
                    <p className="text-sm text-white/60 line-clamp-2 mb-3">{collection.description}</p>
                    <span className="text-xs text-primary-light font-medium">
                      {totalItems} {isLive ? 'channels' : 'titles'}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* All collections grid */}
      <div className="px-4 lg:px-6 pb-24">
        <h2 className="text-lg font-semibold mb-3 text-text-secondary">All Collections</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {allCollections.map((collection) => {
            const gradient = getCollectionGradient(collection.key);
            const emoji = getCollectionEmoji(collection.icon);
            const channelCount = getCollectionChannelCount(collection.key);
            const totalItems = channelCount || (collection.movies.length + (collection.series?.length || 0));
            const isLive = !!collection.channelFilter;

            return (
              <div
                key={collection.key}
                onClick={() => onSelect(collection)}
                className="group cursor-pointer transition-all hover:scale-105"
              >
                <div
                  className={`bg-gradient-to-br ${gradient} rounded-xl h-40 sm:h-48 relative overflow-hidden card-shine`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-300">
                      {emoji}
                    </span>
                  </div>

                  {isLive && totalItems > 0 && (
                    <div className="absolute top-2 right-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-sm font-semibold text-white truncate">{collection.title}</h3>
                    <span className="text-[10px] text-primary-light">{totalItems} {isLive ? 'channels' : 'titles'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
