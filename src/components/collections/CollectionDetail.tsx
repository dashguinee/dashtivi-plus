import React from 'react';
import { ArrowLeft, Lock, Play, Star, Film } from 'lucide-react';
import { getCollectionGradient, getCollectionEmoji } from '@/data/collections';
import type { Collection } from '@/types';

interface Props {
  collection: Collection;
  onBack: () => void;
}

export const CollectionDetail: React.FC<Props> = ({ collection, onBack }) => {
  const gradient = getCollectionGradient(collection.key);
  const emoji = getCollectionEmoji(collection.icon);
  const totalItems = collection.movies.length + (collection.series?.length || 0);
  const isPremium = collection.movies.some((m) => typeof m === 'number' && m > 0);

  return (
    <div className="min-h-screen pt-14">
      {/* Hero Header */}
      <div className={`relative bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Background emoji pattern */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-6xl select-none"
              style={{
                left: `${(i * 23 + 7) % 100}%`,
                top: `${(i * 31 + 11) % 100}%`,
                transform: `rotate(${i * 30}deg)`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />

        {/* Content */}
        <div className="relative px-4 lg:px-6 pt-6 pb-8">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Collections
          </button>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/10">
              <span className="text-4xl">{emoji}</span>
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
                {collection.title}
              </h1>
              <p className="text-sm text-white/60 line-clamp-2 mb-3">
                {collection.description}
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-primary-light font-medium">
                  <Film className="w-3.5 h-3.5" />
                  {totalItems} titles
                </span>
                {isPremium && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md font-medium">
                    <Lock className="w-3 h-3" />
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 lg:px-6 py-6">
        {isPremium ? (
          /* Premium Gate */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-6 border border-amber-500/20">
              <Lock className="w-12 h-12 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Premium Collection
            </h2>
            <p className="text-sm text-text-secondary max-w-md mb-6">
              Unlock {totalItems} titles including movies and series from Starshare Premium.
              Get access to the full catalog with a premium subscription.
            </p>
            <button className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-semibold text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all hover:scale-105 active:scale-95">
              Upgrade to Premium — 40,000 GNF/month
            </button>
            <p className="text-[11px] text-text-muted mt-3">
              Cancel anytime. Stream on any device.
            </p>
          </div>
        ) : (
          /* Free Content Grid */
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-secondary">
                Available Content
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: Math.min(totalItems, 24) }).map((_, i) => (
                <div
                  key={i}
                  className={`bg-gradient-to-br ${gradient} rounded-xl h-40 sm:h-48 relative overflow-hidden group cursor-pointer transition-all hover:scale-105 card-shine`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl opacity-15">{emoji}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 shadow-lg shadow-primary/40">
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-[10px] text-text-secondary">
                        {(4 + Math.random()).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalItems > 24 && (
              <p className="text-xs text-text-muted text-center mt-6">
                Showing 24 of {totalItems} titles
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
