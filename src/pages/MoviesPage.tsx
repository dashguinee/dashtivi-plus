import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Download, Play, Search, X } from 'lucide-react';
import type { XtreamCredentials, LiveCategory, VodStream } from '@/lib/xtream';
import { getVodCategories, getVodStreams, buildVodUrl, getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Channel } from '@/types';

// Featured category IDs (verified against Starshare API)
const FEATURED_CATS = [
  { id: '749', name: 'English 2026' },
  { id: '597', name: 'English 2025' },
  { id: '525', name: 'English 2024' },
  { id: '240', name: 'Oscar Winning' },
  { id: '122', name: 'English 4K' },
  { id: '169', name: 'Netflix English' },
  { id: '168', name: 'Netflix Hindi' },
  { id: '88', name: 'Arabic' },
  { id: '772', name: 'Turkish 2026' },
];

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const MoviesPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string>(FEATURED_CATS[0].id);
  const [movies, setMovies] = useState<VodStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [moviesError, setMoviesError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VodStream[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [detailMovie, setDetailMovie] = useState<VodStream | null>(null);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search: filter current category for short queries, multi-category for 3+ chars
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let mounted = true;
    const q = debouncedQuery.toLowerCase();

    const SEARCH_LIMIT = 50; // #20: cap search results

    async function search() {
      setSearchLoading(true);
      setSearchTruncated(false);
      try {
        if (debouncedQuery.trim().length < 3) {
          // Short query: filter within current loaded movies
          const filtered = movies.filter(m => m.name.toLowerCase().includes(q));
          // #20: cap at 50
          const truncated = filtered.length > SEARCH_LIMIT;
          if (mounted) { setSearchResults(filtered.slice(0, SEARCH_LIMIT)); setSearchTruncated(truncated); }
        } else {
          // 3+ chars: fetch from multiple featured categories and merge
          const catIds = FEATURED_CATS.map(c => c.id);
          const results = await Promise.all(
            catIds.map(id => getVodStreams(credentials, id).catch(() => [] as VodStream[]))
          );
          const all = results.flat();
          // Deduplicate by stream_id
          const seen = new Set<number>();
          const unique: VodStream[] = [];
          for (const m of all) {
            if (!seen.has(m.stream_id)) {
              seen.add(m.stream_id);
              unique.push(m);
            }
          }
          const filtered = unique.filter(m => m.name.toLowerCase().includes(q));
          // #20: cap at 50
          const truncated = filtered.length > SEARCH_LIMIT;
          if (mounted) { setSearchResults(filtered.slice(0, SEARCH_LIMIT)); setSearchTruncated(truncated); }
        }
      } catch {
        if (mounted) setSearchResults([]);
      } finally {
        if (mounted) setSearchLoading(false);
      }
    }
    search();
    return () => { mounted = false; };
  }, [debouncedQuery, credentials, movies]);

  // Lazy-load TMDB map for detail modal metadata
  useEffect(() => {
    getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP));
  }, []);

  const isSearching = debouncedQuery.trim().length > 0;

  // Load categories
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cats = await getVodCategories(credentials);
        if (mounted) setCategories(cats);
      } catch {
        // silent
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials]);

  // Load movies for active category
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setMoviesError(false);
      try {
        const result = await getVodStreams(credentials, activeCat);
        if (mounted) setMovies(result);
      } catch {
        // #13: show error state on failure
        if (mounted) { setMovies([]); setMoviesError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials, activeCat, retryKey]);

  const handlePlay = useCallback(
    (movie: VodStream) => {
      onPlay({
        id: `vod-${movie.stream_id}`,
        name: movie.name,
        url: buildVodUrl(credentials, movie.stream_id, movie.container_extension || 'mp4'),
        logo: movie.stream_icon,
        category: 'movie',
      });
    },
    [credentials, onPlay]
  );

  // Merge featured cats with any remaining from API
  const displayCats: { id: string; name: string }[] = [...FEATURED_CATS];
  const featuredIds = new Set(FEATURED_CATS.map((c) => c.id));
  for (const cat of categories) {
    if (!featuredIds.has(cat.category_id)) {
      displayCats.push({ id: cat.category_id, name: cat.category_name });
    }
  }

  const displayMovies = isSearching ? searchResults : movies;
  const displayLoading = isSearching ? searchLoading : loading;

  return (
    <div className="pt-16 pb-4">
      {/* Search bar + Category pills */}
      <div className="sticky top-14 z-20 py-3 px-4 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5">
        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-3 h-3 text-text-secondary" />
            </button>
          )}
        </div>
        {/* Category pills — hidden during search */}
        {!isSearching && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {displayCats.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCat === cat.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
        {isSearching && (
          <p className="text-xs text-text-secondary pb-1">
            {searchLoading
              ? 'Searching...'
              : searchTruncated
                ? `Showing top 50 results`
                : `${searchResults.length} movie${searchResults.length !== 1 ? 's' : ''} found`}
          </p>
        )}
      </div>

      {/* Movie grid */}
      {displayLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text={isSearching ? 'Searching movies...' : 'Loading movies...'} />
        </div>
      ) : moviesError && !isSearching ? (
        // #13: error state for failed fetch
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-text-muted text-sm">Unable to load — tap to retry</p>
          <button
            onClick={() => { setMoviesError(false); setLoading(true); setRetryKey(k => k + 1); }}
            className="px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors"
          >
            Retry
          </button>
        </div>
      ) : displayMovies.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm">
          {isSearching ? 'No movies match your search' : 'No movies found in this category'}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
          {displayMovies.map((movie) => (
            <div key={movie.stream_id} className="relative group/card">
              <PosterCard
                title={movie.name}
                poster={movie.stream_icon}
                rating={movie.rating}
                categoryId={activeCat}
                tmdbData={tmdbMap[`m:${movie.stream_id}`]}
                onClick={() => setDetailMovie(movie)}
              />
              {/* Download button overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = buildVodUrl(credentials, movie.stream_id, movie.container_extension || 'mp4');
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-10 hover:bg-black/90"
                title="Download"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Movie Detail Modal */}
      {detailMovie && (
        <ContentDetailModal
          streamId={detailMovie.stream_id}
          name={detailMovie.name}
          poster={detailMovie.stream_icon}
          rating={detailMovie.rating}
          categoryId={activeCat}
          containerExtension={detailMovie.container_extension}
          type="movie"
          tmdbData={tmdbMap[`m:${detailMovie.stream_id}`]}
          credentials={credentials}
          onPlay={(knownDuration) => {
            // Fallback chain for duration: VOD info → TMDB → undefined
            const tmdb = tmdbMap[`m:${detailMovie.stream_id}`];
            const duration = knownDuration || (tmdb?.t ? tmdb.t * 60 : undefined);
            onPlay({
              id: `vod-${detailMovie.stream_id}`,
              name: detailMovie.name,
              url: buildVodUrl(credentials, detailMovie.stream_id, detailMovie.container_extension || 'mp4'),
              logo: detailMovie.stream_icon,
              category: 'movie',
              knownDuration: duration,
            });
            setDetailMovie(null);
          }}
          onClose={() => setDetailMovie(null)}
        />
      )}
    </div>
  );
};
