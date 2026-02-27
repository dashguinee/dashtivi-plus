import React, { useRef, useEffect } from 'react';
import { Search, X, Film, Radio, TrendingUp } from 'lucide-react';
import { ChannelTile } from '@/components/live/ChannelTile';
import { useSearch } from '@/hooks/useSearch';
import { getCollectionGradient, getCollectionEmoji } from '@/data/collections';
import { totalChannelCount } from '@/data/channels';
import type { Channel, Collection } from '@/types';

interface Props {
  onPlayChannel: (channel: Channel) => void;
  onSelectCollection: (collection: Collection) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

const popularTags = [
  'Africa', 'News', 'Sports', 'Kids', 'Music',
  'Movies', 'France', 'Documentary', 'Entertainment',
];

export const SearchPage: React.FC<Props> = ({
  onPlayChannel,
  onSelectCollection,
  isFavorite,
  onToggleFavorite,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, clearSearch, isSearching } = useSearch();

  useEffect(() => {
    // Auto-focus search input
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen pt-16">
      {/* Search Header */}
      <div className="px-4 lg:px-6 pt-4 pb-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${totalChannelCount}+ channels and collections...`}
            className="w-full pl-12 pr-12 py-3.5 bg-bg-surface border border-white/10 rounded-2xl text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
          />
          {isSearching && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center hover:bg-bg-hover transition-colors"
            >
              <X className="w-3.5 h-3.5 text-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Results or Discovery */}
      {isSearching ? (
        <div className="px-4 lg:px-6 pb-24 animate-fade-in">
          {results.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">No results found</h3>
              <p className="text-sm text-text-secondary max-w-xs">
                Try searching for a channel name, country, or category
              </p>
            </div>
          ) : (
            <>
              {/* Result count */}
              <p className="text-xs text-text-muted mb-4">
                {results.total} result{results.total !== 1 ? 's' : ''} for "{query}"
              </p>

              {/* Collection results */}
              {results.collections.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-text-secondary">Collections</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {results.collections.map((col) => {
                      const gradient = getCollectionGradient(col.key);
                      const emoji = getCollectionEmoji(col.icon);
                      return (
                        <div
                          key={col.key}
                          onClick={() => onSelectCollection(col)}
                          className={`bg-gradient-to-br ${gradient} rounded-xl p-4 cursor-pointer group transition-all hover:scale-[1.02] hover:shadow-lg overflow-hidden card-shine`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{emoji}</span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-white truncate">{col.title}</h4>
                              <p className="text-[11px] text-white/50 truncate">{col.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Channel results */}
              {results.channels.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Radio className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text-secondary">
                      Channels ({results.channels.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {results.channels.slice(0, 30).map((ch) => (
                      <ChannelTile
                        key={ch.id}
                        channel={ch}
                        onPlay={onPlayChannel}
                        isFavorite={isFavorite(ch.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    ))}
                  </div>
                  {results.channels.length > 30 && (
                    <p className="text-xs text-text-muted text-center mt-4">
                      Showing 30 of {results.channels.length} channels
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      ) : (
        /* Discovery / Empty state */
        <div className="px-4 lg:px-6 pb-24 animate-fade-in">
          {/* Popular searches */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-text-secondary">Popular Searches</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="px-4 py-2 bg-bg-surface border border-white/5 rounded-xl text-sm text-white hover:bg-bg-elevated hover:border-primary/20 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* Browse hint */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">
              Find your next stream
            </h3>
            <p className="text-sm text-text-secondary max-w-xs">
              Search by channel name, country, or category across {totalChannelCount}+ live streams
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
