import React, { useEffect, useState } from 'react';
import { Play, ChevronRight, Tv, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { XtreamCredentials, LiveStream, VodStream, SeriesItem } from '@/lib/xtream';
import {
  getLiveStreams,
  getVodStreams,
  getSeries,
  buildLiveUrl,
  buildVodUrl,
  fetchVpsHealth,
} from '@/lib/xtream';
import {
  HOMEPAGE_COLLECTIONS,
  COLLECTION_CARDS,
  getFeaturedHero,
} from '@/lib/collections';
import type { Collection } from '@/lib/collections';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { PosterCard } from '@/components/ui/PosterCard';
import { SkeletonRow } from '@/components/ui/LoadingSpinner';
import type { Channel, WatchHistoryEntry } from '@/types';

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function timeAgo(ts: number): string {
  if (!ts || !isFinite(ts) || isNaN(ts)) return 'Recently';
  const diff = Date.now() - ts;
  if (!isFinite(diff) || isNaN(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Data loaders for each collection type ─────────────────────────

async function loadLiveCollection(
  credentials: XtreamCredentials,
  collection: Collection,
  healthCatIds: string[]
): Promise<LiveStream[]> {
  // Only load categories that are actually live
  const activeCats = collection.categoryIds.filter(
    (id) => healthCatIds.length === 0 || healthCatIds.includes(id)
  );
  if (activeCats.length === 0) return [];

  const results = await Promise.allSettled(
    activeCats.slice(0, 4).map((catId) => getLiveStreams(credentials, catId))
  );
  const all: LiveStream[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return shuffle(all).slice(0, collection.limit);
}

async function loadVodCollection(
  credentials: XtreamCredentials,
  collection: Collection
): Promise<VodStream[]> {
  const results = await Promise.allSettled(
    collection.categoryIds.map((catId) => getVodStreams(credentials, catId))
  );
  const all: VodStream[] = [];
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const m of r.value) {
        if (!seen.has(m.stream_id)) {
          seen.add(m.stream_id);
          all.push(m);
        }
      }
    }
  }
  return shuffle(all).slice(0, collection.limit);
}

async function loadSeriesCollection(
  credentials: XtreamCredentials,
  collection: Collection
): Promise<SeriesItem[]> {
  const results = await Promise.allSettled(
    collection.categoryIds.map((catId) => getSeries(credentials, catId))
  );
  const all: SeriesItem[] = [];
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const s of r.value) {
        if (!seen.has(s.series_id)) {
          seen.add(s.series_id);
          all.push(s);
        }
      }
    }
  }
  return shuffle(all).slice(0, collection.limit);
}

// ── Types for loaded row data ─────────────────────────────────────

interface RowData {
  collection: Collection;
  liveStreams?: LiveStream[];
  vodStreams?: VodStream[];
  seriesItems?: SeriesItem[];
}

// ── Main Component ────────────────────────────────────────────────

export const HomePage: React.FC<Props> = ({ credentials, onPlay }) => {
  const navigate = useNavigate();
  const { getRecent } = useWatchHistory();
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const recentHistory = getRecent(10).filter(
    (h): h is WatchHistoryEntry & { name: string; url: string } =>
      !!h.name && !!h.url
  );

  const hero = getFeaturedHero();

  useEffect(() => {
    let mounted = true;

    async function load() {
      setError(false);
      try {
        // Fetch health data for live category filtering
        const health = await fetchVpsHealth();
        const liveCatIds: string[] = health.liveCategories || [];

        // Load all collections in parallel
        const rowPromises = HOMEPAGE_COLLECTIONS.map(async (collection) => {
          const rowData: RowData = { collection };
          try {
            if (collection.type === 'live') {
              rowData.liveStreams = await loadLiveCollection(credentials, collection, liveCatIds);
            } else if (collection.type === 'vod') {
              rowData.vodStreams = await loadVodCollection(credentials, collection);
            } else if (collection.type === 'series') {
              rowData.seriesItems = await loadSeriesCollection(credentials, collection);
            }
          } catch {
            // Individual row failure is OK — just show empty
          }
          return rowData;
        });

        const results = await Promise.allSettled(rowPromises);
        if (!mounted) return;

        const loadedRows: RowData[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const row = r.value;
            // Only include rows that have content
            const hasContent =
              (row.liveStreams && row.liveStreams.length > 0) ||
              (row.vodStreams && row.vodStreams.length > 0) ||
              (row.seriesItems && row.seriesItems.length > 0);
            if (hasContent) loadedRows.push(row);
          }
        }

        if (loadedRows.length === 0) {
          setError(true);
        } else {
          setRows(loadedRows);
        }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [credentials, retryKey]);

  // ── Play handlers ───────────────────────────────────────────────

  const playLive = (stream: LiveStream, allStreams?: LiveStream[]) => {
    if (allStreams && allStreams.length > 1) {
      const channels = allStreams.map(s => ({
        id: `live-${s.stream_id}`,
        name: s.name,
        url: buildLiveUrl(credentials, s.stream_id),
        logo: s.stream_icon,
        category: 'live' as const,
      }));
      setPlaylist(channels);
    }
    const channel = {
      id: `live-${stream.stream_id}`,
      name: stream.name,
      url: buildLiveUrl(credentials, stream.stream_id),
      logo: stream.stream_icon,
      category: 'live' as const,
    };
    setCurrentChannel(channel.id);
    onPlay(channel);
  };

  const playMovie = (movie: VodStream) => {
    onPlay({
      id: `vod-${movie.stream_id}`,
      name: movie.name,
      url: buildVodUrl(credentials, movie.stream_id, movie.container_extension || 'mp4'),
      logo: movie.stream_icon,
      category: 'movie',
    });
  };

  const playHistoryItem = (entry: WatchHistoryEntry & { name: string; url: string }) => {
    onPlay({
      id: entry.channelId,
      name: entry.name,
      url: entry.url,
      logo: entry.logo,
      category: entry.category,
    });
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="pt-16 pb-4">
      {/* ── Hero Banner (time-aware) ─────────────────────────── */}
      <div className="relative h-[42vh] min-h-[300px] max-h-[460px] mb-2 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${hero.gradient}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-8 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-wide">
              <span className="text-gradient">DashTivi</span>
              <span className="text-primary-light text-xl font-black">+</span>
            </h1>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{hero.title}</h2>
          <p className="text-text-secondary text-sm mb-4 max-w-md">
            {recentHistory.length > 0
              ? hero.subtitle
              : 'Premium live TV, movies, and series. Thousands of channels from around the world.'}
          </p>
          <button
            onClick={() => navigate(hero.navigateTo)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 w-fit"
          >
            <Play className="w-4 h-4" />
            {hero.cta}
          </button>
        </div>
      </div>

      {/* ── Quick Collection Cards (vibes) ───────────────────── */}
      <div className="px-4 mb-6">
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
          {COLLECTION_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => navigate(card.navigateTo)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${card.gradient} border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              <span className="text-base">{card.emoji}</span>
              <span className="text-sm font-semibold text-white whitespace-nowrap">{card.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Continue Watching ─────────────────────────────────── */}
      {recentHistory.length > 0 && (
        <section className="mb-6">
          <SectionHeader emoji="" title="Continue Watching" icon={<Clock className="w-4 h-4 text-primary-light" />} />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
            {recentHistory.map((entry) => (
              <button
                key={entry.channelId}
                onClick={() => playHistoryItem(entry)}
                className="flex-shrink-0 w-40 group"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-2 group-hover:border-primary/30 transition-colors">
                  <ChannelIcon
                    src={entry.logo}
                    name={entry.name}
                    size="lg"
                    className="!w-full !h-full !rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  {entry.category && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 backdrop-blur-sm rounded text-[10px] font-bold text-white uppercase">
                      {entry.category === 'live' ? 'Live' : entry.category === 'movie' ? 'Movie' : entry.category}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white/70">
                    {timeAgo(entry.watchedAt)}
                  </div>
                </div>
                <p className="text-xs text-text-secondary truncate group-hover:text-white transition-colors">
                  {entry.name}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Dynamic Collection Rows ──────────────────────────── */}
      {loading ? (
        <div className="space-y-8 px-1">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-text-muted text-sm">Unable to load — tap to retry</p>
          <button
            onClick={() => { setLoading(true); setRetryKey((k) => k + 1); }}
            className="px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <CollectionRow
              key={row.collection.id}
              row={row}
              onPlayLive={playLive}
              onPlayMovie={playMovie}
              onNavigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Section Header ────────────────────────────────────────────────

function SectionHeader({
  emoji,
  title,
  icon,
  seeAllTo,
  onNavigate,
}: {
  emoji: string;
  title: string;
  icon?: React.ReactNode;
  seeAllTo?: string;
  onNavigate?: (path: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-2">
        {emoji && <span className="text-base">{emoji}</span>}
        {icon}
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {seeAllTo && onNavigate && (
        <button
          onClick={() => onNavigate(seeAllTo)}
          className="flex items-center gap-1 text-xs text-primary-light hover:text-white transition-colors"
        >
          See All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Collection Row Renderer ───────────────────────────────────────

function CollectionRow({
  row,
  onPlayLive,
  onPlayMovie,
  onNavigate,
}: {
  row: RowData;
  onPlayLive: (stream: LiveStream, allStreams?: LiveStream[]) => void;
  onPlayMovie: (movie: VodStream) => void;
  onNavigate: (path: string) => void;
}) {
  const { collection } = row;

  // ── Live channel row ────────────────────────────────────────
  if (collection.type === 'live' && row.liveStreams) {
    return (
      <section>
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
          {row.liveStreams.map((stream) => (
            <button
              key={stream.stream_id}
              onClick={() => onPlayLive(stream, row.liveStreams)}
              className="flex-shrink-0 w-36 group"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-2 group-hover:border-primary/30 transition-colors">
                <ChannelIcon
                  src={stream.stream_icon}
                  name={stream.name}
                  size="lg"
                  className="!w-full !h-full !rounded-xl"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-green-500/90 rounded text-[10px] font-bold text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              </div>
              <p className="text-xs text-text-secondary truncate group-hover:text-white transition-colors">
                {stream.name}
              </p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ── Movie row (poster style) ────────────────────────────────
  if (collection.type === 'vod' && row.vodStreams) {
    return (
      <section>
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
          {row.vodStreams.map((movie) => (
            <div key={movie.stream_id} className="flex-shrink-0 w-32">
              <PosterCard
                title={movie.name}
                poster={movie.stream_icon}
                rating={movie.rating}
                onClick={() => onPlayMovie(movie)}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Series row (poster style) ───────────────────────────────
  if (collection.type === 'series' && row.seriesItems) {
    return (
      <section>
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
          {row.seriesItems.map((series) => (
            <div key={series.series_id} className="flex-shrink-0 w-32">
              <PosterCard
                title={series.name}
                poster={series.cover}
                rating={series.rating}
                onClick={() => onNavigate('/series')}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
