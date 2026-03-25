import React, { useEffect, useState, useCallback } from 'react';
import { Play, ChevronRight, Tv, Clock, Trophy, Radio, Film, MonitorPlay, Globe, Sparkles, Music, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { XtreamCredentials, LiveStream, VodStream, SeriesItem } from '@/lib/xtream';
import {
  getLiveStreams,
  getVodStreams,
  getSeries,
  buildLiveUrl,
  buildVodUrl,
  fetchVpsHealth,
  fetchServerProbeData,
  seedProbeCacheFromServer,
  isChannelProbeAlive,
  getTmdbMap,
} from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import {
  HOMEPAGE_COLLECTIONS,
  COLLECTION_CARDS,
  getFeaturedHero,
} from '@/lib/collections';
import type { Collection, SmartCollection } from '@/lib/collections';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getForYouItems, getBecauseYouWatched } from '@/lib/recommend';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { PosterCard } from '@/components/ui/PosterCard';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { TrailerModal } from '@/components/ui/TrailerModal';
import { VeeWidget } from '@/components/ui/VeeWidget';
import { SkeletonRow } from '@/components/ui/LoadingSpinner';
// WelcomeStory removed — replaced with simple inline welcome text
import { setAmbientSpeed } from '@/lib/ambient-audio';
import type { Channel, WatchHistoryEntry } from '@/types';
import { PlatformShowcase, PLATFORMS } from '@/components/ui/PlatformShowcase';
import { HexCard, HexRow, CLUB_COLORS } from '@/components/ui/HexCard';

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

// ── Sport tabs config ─────────────────────────────────────────────

const SPORT_TABS = [
  { id: 'football', label: 'Football', color: '#9D4EDD', catIds: ['234'], keywords: ['fc', 'tv', 'fan', 'club', 'united', 'city', 'lfc', 'mutv', 'arsenal', 'chelsea', 'barca', 'real madrid', 'milan', 'inter', 'psg', 'bayern'] },
  { id: 'basketball', label: 'Basketball', color: '#EF4444', catIds: ['773'], keywords: ['nba', 'basketball', 'lakers', 'celtics', 'warriors', 'nets', 'bulls', 'heat', 'bucks'] },
  { id: 'nfl', label: 'NFL', color: '#3B82F6', catIds: ['516'], keywords: ['nfl', 'football', 'chiefs', 'eagles', 'cowboys', 'patriots', 'packers', '49ers'] },
  { id: 'tennis', label: 'Tennis', color: '#F97316', catIds: ['342', '234'], keywords: ['tennis', 'atp', 'wta', 'wimbledon', 'roland', 'us open', 'australian open'] },
];

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
  // Priority order: first category fills first, then subsequent categories fill remaining slots
  // This ensures e.g. 2026 movies appear before 2025 in "Fresh Movies"
  const picked: VodStream[] = [];
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const batch: VodStream[] = [];
      for (const m of r.value) {
        if (!seen.has(m.stream_id)) {
          seen.add(m.stream_id);
          batch.push(m);
        }
      }
      // Shuffle within each category, take what fits
      const shuffled = shuffle(batch);
      const remaining = collection.limit - picked.length;
      if (remaining > 0) picked.push(...shuffled.slice(0, remaining));
    }
  }
  return picked;
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
  collection: Collection | SmartCollection;
  liveStreams?: LiveStream[];
  vodStreams?: VodStream[];
  seriesItems?: SeriesItem[];
  tmdbMap?: Record<string, TmdbEntry>;
}

// ── Discover Sports — tabbed sport channels ──────────────────────

function DiscoverSports({ credentials, onPlay, navigate }: { credentials: XtreamCredentials; onPlay: (ch: Channel) => void; navigate: (path: string) => void }) {
  const [activeTab, setActiveTab] = useState(SPORT_TABS[0].id);
  const [channels, setChannels] = useState<Record<string, LiveStream[]>>({});

  const tab = SPORT_TABS.find(t => t.id === activeTab)!;

  useEffect(() => {
    if (channels[activeTab]) return;
    let mounted = true;
    Promise.allSettled(tab.catIds.map(c => getLiveStreams(credentials, c)))
      .then(results => {
        if (!mounted) return;
        const all: LiveStream[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...r.value);
        }
        const filtered = all.filter(s => {
          const nl = s.name.toLowerCase();
          return tab.keywords.some(k => nl.includes(k)) && isChannelProbeAlive(s.stream_id);
        });
        setChannels(prev => ({ ...prev, [activeTab]: filtered.slice(0, 8) }));
      });
    return () => { mounted = false; };
  }, [activeTab, credentials, tab]);

  const items = channels[activeTab] || [];

  return (
    <section className="mb-2 py-3">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-baseline gap-2">
          <div className="w-1.5 h-1.5 rounded-full mb-0.5" style={{ background: tab.color, boxShadow: `0 0 6px ${tab.color}60` }} />
          <h2 className="text-[20px] font-black tracking-tight text-white">Discover</h2>
        </div>
        <button onClick={() => navigate('/live')} className="text-[11px] text-white/20 hover:text-white/50 transition-colors tracking-wide">More</button>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-2 px-4 mb-3">
        {SPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300"
            style={activeTab === t.id ? {
              background: `${t.color}18`,
              border: `1px solid ${t.color}30`,
              color: 'rgba(255,255,255,0.9)',
              boxShadow: `0 0 10px ${t.color}15`,
            } : {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Channels */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3 items-end">
        {items.length > 0 ? items.map((s, i) => {
          const depth = i < 2 ? 1.0 : i < 4 ? 0.93 : i < 6 ? 0.87 : 0.8;
          return (
            <HexCard
              key={s.stream_id}
              variant="discover"
              title={s.name}
              icon={s.stream_icon}
              isLive
              scale={depth}
              onClick={() => {
                const ch = {
                  id: `live-${s.stream_id}`,
                  name: s.name,
                  url: buildLiveUrl(credentials, s.stream_id),
                  logo: s.stream_icon,
                  category: 'live' as const,
                };
                setCurrentChannel(ch.id);
                onPlay(ch);
              }}
            />
          );
        }) : (
          // Skeleton while loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-hex" style={{ animationDelay: `${i * 150}ms` }} />
          ))
        )}
      </div>
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────

export const HomePage: React.FC<Props> = ({ credentials, onPlay }) => {
  const navigate = useNavigate();
  const { getRecent } = useWatchHistory();
  const { profile } = useUserProfile();
  const [rows, setRows] = useState<RowData[]>([]);
  const [smartRows, setSmartRows] = useState<RowData[]>([]);
  const [veePool, setVeePool] = useState<VodStream[]>([]);
  const [veeTmdbMap, setVeeTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [trailerState, setTrailerState] = useState<{ youtubeKey: string; title: string; poster?: string; overview?: string } | null>(null);
  const [detailMovie, setDetailMovie] = useState<{ movie: VodStream; tmdbMap?: Record<string, TmdbEntry> } | null>(null);
  const [platformData, setPlatformData] = useState<{ platform: typeof PLATFORMS[0]; items: { id: number; name: string; poster?: string; rating?: string }[]; tmdbMap?: Record<string, TmdbEntry> }[]>([]);
  const [netflixHex, setNetflixHex] = useState<SeriesItem[]>([]);
  const [dashOriginalsHex, setDashOriginalsHex] = useState<VodStream[]>([]);
  const [fixturesHex, setFixturesHex] = useState<LiveStream[]>([]);
  const [footballHex, setFootballHex] = useState<LiveStream[]>([]);

  const recentHistory = getRecent(10).filter(
    (h): h is WatchHistoryEntry & { name: string; url: string } =>
      !!h.name && !!h.url
  );

  const hero = getFeaturedHero();

  // Set ambient speed for home — comfortable pace
  useEffect(() => {
    setAmbientSpeed(0.8);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setError(false);
      try {
        // Fetch health + probe data in parallel
        const [health, probeData] = await Promise.all([
          fetchVpsHealth(),
          fetchServerProbeData(),
        ]);
        if (probeData) seedProbeCacheFromServer(probeData);
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

  // ── Smart Rows (lazy, after main content loads) ─────────────────

  useEffect(() => {
    // Only run after main rows loaded + profile exists
    if (loading || rows.length === 0 || !profile) return;
    const userProfile = profile; // capture non-null for async closure
    let mounted = true;

    async function loadSmartRows() {
      try {
        const tmdbData = await getTmdbMap();
        if (!tmdbData || !mounted) return;
        const { TMDB_MAP } = tmdbData;

        // Fetch movies from multiple categories for the recommendation pool
        const forYouCatIds = ['749', '597', '525', '122'];
        const catResults = await Promise.allSettled(
          forYouCatIds.map((catId) => getVodStreams(credentials, catId))
        );
        const moviePool: VodStream[] = [];
        const seen = new Set<number>();
        for (const r of catResults) {
          if (r.status === 'fulfilled') {
            for (const m of r.value) {
              if (!seen.has(m.stream_id)) {
                seen.add(m.stream_id);
                moviePool.push(m);
              }
            }
          }
        }

        if (!mounted) return;
        // Feed the Vee widget with the movie pool + TMDB data
        setVeePool(moviePool);
        setVeeTmdbMap(TMDB_MAP);
        const newSmartRows: RowData[] = [];

        // "For You" row
        if (moviePool.length > 0) {
          const forYou = getForYouItems(moviePool, 'movie', userProfile, TMDB_MAP, 15);
          if (forYou.length > 0) {
            const smartCollection: SmartCollection = {
              id: 'smart-for-you',
              name: 'For You',
              emoji: '',
              description: 'Personalized picks based on your taste',
              type: 'smart-vod',
              contentType: 'vod',
              navigateTo: '/movies',
            };
            newSmartRows.push({
              collection: smartCollection,
              vodStreams: forYou,
              tmdbMap: TMDB_MAP,
            });
          }
        }

        // "Because You Watched" row
        if (userProfile.lastWatched.length > 0) {
          const lastItem = userProfile.lastWatched.find((w) => w.genres.length > 0);
          if (lastItem && moviePool.length > 0) {
            const similar = getBecauseYouWatched(
              lastItem.genres,
              lastItem.name,
              moviePool,
              'movie',
              TMDB_MAP,
              15
            );
            if (similar.length >= 3) {
              // Parse clean name for display
              const cleanName = lastItem.name.replace(/\s*\(\d{4}\)\s*$/, '');
              const smartCollection: SmartCollection = {
                id: 'smart-because-watched',
                name: `Because You Watched ${cleanName}`,
                emoji: '',
                description: `Similar to ${cleanName}`,
                type: 'smart-vod',
                contentType: 'vod',
                navigateTo: '/movies',
              };
              newSmartRows.push({
                collection: smartCollection,
                vodStreams: similar,
                tmdbMap: TMDB_MAP,
              });
            }
          }
        }

        if (mounted && newSmartRows.length > 0) {
          setSmartRows(newSmartRows);
        }
        // Enrich regular VOD rows with TMDB data for detail modal
        if (mounted && TMDB_MAP) {
          setRows(prev => prev.map(row =>
            (row.collection.type === 'vod' && row.vodStreams && !row.tmdbMap)
              ? { ...row, tmdbMap: TMDB_MAP }
              : row
          ));
        }
      } catch {
        // Smart rows are additive — failure is silent
      }
    }

    loadSmartRows();
    return () => { mounted = false; };
  }, [loading, rows, profile, credentials]);

  // ── Hex Sections — independent loading ──────────────────────
  useEffect(() => {
    if (loading || rows.length === 0) return;
    let mounted = true;

    // Netflix hex — top 8 series
    getSeries(credentials, '106').then(items => {
      if (!mounted) return;
      setNetflixHex(items.slice(0, 8));
    }).catch(() => {});

    // DASH Exclusives — Oscar Winners + Blockbusters
    Promise.allSettled([getVodStreams(credentials, '240'), getVodStreams(credentials, '34')])
      .then(results => {
        if (!mounted) return;
        const all: VodStream[] = [];
        const seen = new Set<number>();
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const m of r.value) {
              if (!seen.has(m.stream_id)) { seen.add(m.stream_id); all.push(m); }
            }
          }
        }
        setDashOriginalsHex(all.slice(0, 20));
      });

    // Hottest Fixtures — live sports
    Promise.allSettled(['234', '85', '492'].map(c => getLiveStreams(credentials, c)))
      .then(results => {
        if (!mounted) return;
        const all: LiveStream[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...r.value);
        }
        const alive = all.filter(s => isChannelProbeAlive(s.stream_id));
        setFixturesHex(alive.slice(0, 6));
      });

    // Discover Football — fan channels
    getLiveStreams(credentials, '234').then(items => {
      if (!mounted) return;
      const fanKeywords = ['fc', 'tv', 'fan', 'club', 'united', 'city', 'lfc', 'mutv', 'arsenal', 'chelsea', 'barca', 'real madrid', 'milan', 'inter', 'psg', 'bayern', 'ajax', 'celtic', 'rangers', 'porto', 'benfica', 'sporting'];
      const fans = items.filter(s => {
        const nl = s.name.toLowerCase();
        return fanKeywords.some(k => nl.includes(k)) && isChannelProbeAlive(s.stream_id);
      });
      setFootballHex(fans.slice(0, 8));
    }).catch(() => {});

    // Platform previews — load directly, no delay
    (async () => {
      if (!mounted) return;
      try {
        const previews = await Promise.all(
          PLATFORMS.map(async (p) => {
            try {
              const results = await Promise.allSettled(
                p.categoryIds.slice(0, 1).map(catId => getSeries(credentials, catId))
              );
              const items: { id: number; name: string; poster?: string; rating?: string }[] = [];
              const seen = new Set<number>();
              for (const r of results) {
                if (r.status === 'fulfilled') {
                  for (const s of r.value) {
                    if (!seen.has(s.series_id)) { seen.add(s.series_id); items.push({ id: s.series_id, name: s.name, poster: s.cover, rating: s.rating }); }
                  }
                }
              }
              return { platform: p, items: items.slice(0, 4) };
            } catch { return { platform: p, items: [] as any[] }; }
          })
        );
        if (mounted) setPlatformData(previews.filter(p => p.items.length > 0));
      } catch {}
    })();

    return () => { mounted = false; };
  }, [loading, rows, credentials]);

  // ── Merge rows: smart rows prepended ──────────────────────────
  // Split smart rows: "Because You Watched" renders separately after Originals
  const becauseRow = smartRows.find(r => r.collection.id === 'smart-because-watched');
  const topSmartRows = smartRows.filter(r => r.collection.id !== 'smart-because-watched');
  const allRows = [...topSmartRows, ...rows];

  // ── Play handlers ───────────────────────────────────────────────

  const playLive = useCallback((stream: LiveStream, allStreams?: LiveStream[]) => {
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
  }, [credentials, onPlay]);

  const playMovie = useCallback((movie: VodStream) => {
    // Get TMDB runtime for duration display (browser can't detect for MKV remux)
    const tmdb = veeTmdbMap[`m:${movie.stream_id}`];
    const knownDuration = tmdb?.t ? tmdb.t * 60 : undefined; // TMDB stores minutes, player needs seconds
    onPlay({
      id: `vod-${movie.stream_id}`,
      name: movie.name,
      url: buildVodUrl(credentials, movie.stream_id, movie.container_extension || 'mp4'),
      logo: movie.stream_icon,
      category: 'movie',
      knownDuration,
    });
  }, [credentials, onPlay, veeTmdbMap]);

  const playHistoryItem = useCallback((entry: WatchHistoryEntry & { name: string; url: string }) => {
    onPlay({
      id: entry.channelId,
      name: entry.name,
      url: entry.url,
      logo: entry.logo,
      category: entry.category,
    });
  }, [onPlay]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="pt-16 pb-4 animate-fade-in">
      {/* ── Hero Banner (time-aware) ── */}
      <div
        className="relative mb-2 overflow-hidden"
        style={{
          height: '22vh',
          minHeight: '160px',
          maxHeight: '220px',
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${hero.gradient}`} />

        <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-5 max-w-2xl">
          <h2 className="text-lg font-semibold text-white mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{hero.title}</h2>
          <p className="text-text-secondary text-xs mb-3 max-w-md leading-relaxed">
            {recentHistory.length > 0
              ? hero.subtitle
              : 'Premium live TV, movies, and series. Thousands of channels from around the world.'}
          </p>
          <button
            onClick={() => navigate(hero.navigateTo)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-all duration-300 w-fit"
            style={{ boxShadow: '0 0 20px rgba(157,78,221,0.3), 0 4px 12px rgba(157,78,221,0.2)' }}
          >
            <Play className="w-4 h-4" />
            {hero.cta}
          </button>
        </div>
      </div>

      {/* ── Quick Navigation — floating pills ───────────────────── */}
      <div className="px-4 mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {COLLECTION_CARDS.map((card) => {
            const IconMap: Record<string, React.ReactNode> = {
              sports: <Trophy className="w-3.5 h-3.5" />,
              news: <Radio className="w-3.5 h-3.5" />,
              movies: <Film className="w-3.5 h-3.5" />,
              series: <MonitorPlay className="w-3.5 h-3.5" />,
              africa: <Globe className="w-3.5 h-3.5" />,
              kids: <Sparkles className="w-3.5 h-3.5" />,
              music: <Music className="w-3.5 h-3.5" />,
              faith: <Heart className="w-3.5 h-3.5" />,
            };
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.navigateTo)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: 'rgba(157,78,221,0.06)',
                  border: '1px solid rgba(157,78,221,0.1)',
                  boxShadow: '0 0 8px rgba(157,78,221,0.04)',
                }}
              >
                <span className="text-primary-light/70">{IconMap[card.id]}</span>
                <span className="text-[12px] font-medium text-white/70 whitespace-nowrap">{card.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Continue Watching ─────────────────────────────────── */}
      {recentHistory.length > 0 && (
        <section className="mb-6">
          <SectionHeader emoji="" title="Continue Watching" icon={<Clock className="w-4 h-4 text-primary-light" />} />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2">
            {recentHistory.map((entry) => (
              <button
                key={entry.channelId}
                onClick={() => playHistoryItem(entry)}
                className="flex-shrink-0 w-40 group"
              >
                <div
                  className="relative aspect-video rounded-xl overflow-hidden mb-2 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <ChannelIcon
                    src={entry.logo}
                    name={entry.name}
                    size="lg"
                    className="!w-full !h-full !rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-7 h-7 text-white/90" />
                  </div>
                  {entry.category && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 rounded text-[9px] font-semibold text-white/80 uppercase tracking-wide">
                      {entry.category === 'live' ? 'Live' : entry.category === 'movie' ? 'Movie' : entry.category}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/50 rounded text-[9px] text-white/50">
                    {timeAgo(entry.watchedAt)}
                  </div>
                </div>
                <p className="text-xs text-text-secondary truncate group-hover:text-white transition-colors">
                  {entry.name.replace(/\s*\(\d{4}\)\s*$/, '')}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Zone divider ── */}
      <div className="mx-8 my-2 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.08), transparent)' }} />

      {/* ── Vee Smart Picks ─────────────────────────────────── */}
      {veePool.length > 0 && (
        <section className="mt-6 mb-2">
          <VeeWidget
            items={veePool}
            onPlay={(item) => playMovie(item as unknown as VodStream)}
            onTrailer={(key, title, poster, overview) => setTrailerState({ youtubeKey: key, title, poster, overview })}
            tmdbMap={veeTmdbMap}
          />
        </section>
      )}

      {/* ── Zone divider ── */}
      <div className="mx-8 my-2 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.06), transparent)' }} />

      {/* ── Platform Originals Showcase ────────────────────── */}
      {platformData.length > 0 && (
        <PlatformShowcase
          platforms={platformData}
          onNavigate={navigate}
        />
      )}

      {/* ── Because You Watched — intimate, grey-orange, firefly glow ──── */}
      {becauseRow && becauseRow.vodStreams && (
        <section className="mb-1 relative">
          <div className="px-4 mb-3">
            <p className="text-[11px] font-bold tracking-[3px] uppercase" style={{
              background: 'linear-gradient(90deg, rgba(210,180,140,0.5), rgba(255,200,150,0.4), rgba(210,180,140,0.3))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {becauseRow.collection.name.replace('Because You Watched ', 'SINCE YOU LIKED ')}
            </p>
          </div>
          <div className="relative">
            {/* Wandering orange firefly */}
            <div
              className="absolute w-16 h-16 rounded-full pointer-events-none z-10"
              style={{
                background: 'radial-gradient(circle, rgba(249,168,80,0.1) 0%, rgba(249,168,80,0.03) 40%, transparent 70%)',
                filter: 'blur(8px)',
                animation: 'firefly-glide 12s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
            <div className="flex gap-5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3">
              {becauseRow.vodStreams.map((movie) => {
                const tmdb = becauseRow.tmdbMap?.[`m:${movie.stream_id}`];
                return (
                  <div key={movie.stream_id} className="flex-shrink-0 w-[115px] relative rounded-xl overflow-hidden">
                    <PosterCard
                      title={movie.name}
                      poster={movie.stream_icon}
                      rating={movie.rating}
                      tmdbData={tmdb}
                      onClick={() => playMovie(movie)}
                    />
                    {/* Warm brown-orange overlay at 10% */}
                    <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(160deg, rgba(180,120,60,0.1) 0%, rgba(200,150,80,0.08) 50%, rgba(160,100,40,0.06) 100%)' }} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Section Breaker: Sports ── */}
      <div className="flex flex-col items-center py-6 gap-3">
        <div className="w-3 h-3 rounded-full bg-primary/40" style={{ animation: 'sports-ball-float 3s ease-in-out infinite' }} />
        <span className="text-[10px] font-medium text-white/15 tracking-[4px] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sports Break</span>
      </div>

      {/* ── Hottest Fixtures — soft glowing circles ────────── */}
      {fixturesHex.length > 0 && (
        <section className="mb-2 py-3">
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-baseline gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mb-0.5 animate-pulse" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.4)' }} />
              <h2 className="text-[20px] font-black tracking-tight text-white">Hottest Fixtures</h2>
            </div>
            <button onClick={() => navigate('/live')} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">See All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3 items-center">
            {fixturesHex.map((s) => (
              <button
                key={s.stream_id}
                onClick={() => {
                  const ch = {
                    id: `live-${s.stream_id}`,
                    name: s.name,
                    url: buildLiveUrl(credentials, s.stream_id),
                    logo: s.stream_icon,
                    category: 'live' as const,
                  };
                  setCurrentChannel(ch.id);
                  onPlay(ch);
                }}
                className="flex-shrink-0 flex flex-col items-center gap-2 group transition-transform duration-300 hover:scale-[1.06] active:scale-[0.96]"
                style={{ width: 90 }}
              >
                {/* Circle with soft glow */}
                <div
                  className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center hex-anim-pulse"
                  style={{
                    background: 'rgba(157, 78, 221, 0.04)',
                    boxShadow: '0 0 12px rgba(157, 78, 221, 0.12), 0 0 24px rgba(59, 130, 246, 0.06)',
                    border: '1px solid rgba(157, 78, 221, 0.1)',
                  }}
                >
                  <ChannelIcon src={s.stream_icon} name={s.name} size="md" className="!w-10 !h-10 !rounded-full" />
                  {/* LIVE dot */}
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/80">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    <span className="text-[7px] font-bold text-white">LIVE</span>
                  </div>
                </div>
                {/* Name */}
                <span className="text-[9px] text-white/50 text-center leading-tight line-clamp-2 group-hover:text-white/80 transition-colors">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Discover Sports — tabbed: Football, Basketball, NFL, Tennis ── */}
      <DiscoverSports credentials={credentials} onPlay={onPlay} navigate={navigate} />

      {/* ── Section Breaker: Back to Entertainment ── */}
      <div className="flex flex-col items-center py-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.3))' }} />
          <span className="text-[11px] font-medium text-white/20 tracking-[3px] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dive Right Back In</span>
          <div className="w-8 h-[0.5px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(157,78,221,0.3))' }} />
        </div>
      </div>

      {/* ── DASH Exclusives — cinema ticket cards (4 posters per ticket) ── */}
      {dashOriginalsHex.length > 0 && (
        <section className="mb-2 py-3">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-baseline gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mb-0.5" style={{ boxShadow: '0 0 6px rgba(157,78,221,0.4)' }} />
              <h2 className="text-[20px] font-black tracking-tight text-white">DASH Exclusives</h2>
            </div>
            <button onClick={() => navigate('/movies')} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">See All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3 items-end">

            {/* ── Art Ticket — non-clickable, 4 posters, shimmer ── */}
            <div
              className="flex-shrink-0 relative rounded-2xl overflow-hidden"
              style={{
                width: 270,
                height: 165,
                boxShadow: '0 4px 20px rgba(157, 78, 221, 0.08)',
              }}
            >
              <div className="flex h-full">
                {dashOriginalsHex.slice(0, 4).map((m) => (
                  <div key={m.stream_id} className="flex-1 relative overflow-hidden">
                    {m.stream_icon ? (
                      <img src={m.stream_icon} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary-dark/10" />
                    )}
                    <div className="absolute right-0 top-[8%] bottom-[8%] w-[0.5px] bg-black/30" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(157,78,221,0.04) 40%, rgba(0,0,0,0.25) 70%, rgba(157,78,221,0.06) 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 bottom-0 w-[30%]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.06), rgba(255,255,255,0.03), rgba(157,78,221,0.04), transparent)', animation: 'dash-ticket-shimmer 7s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)' }} />
              <div className="absolute bottom-0 inset-x-0 px-3 pb-2 pointer-events-none">
                <p className="text-[9px] font-bold text-primary-light/40 tracking-widest uppercase text-center">D+ Collection</p>
              </div>
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(157,78,221,0.2) 50%, transparent 90%)' }} />
            </div>

            {/* ── Portrait Cards — gradual scale reduction at tail ── */}
            {dashOriginalsHex.slice(4).map((m, i, arr) => {
              const fromEnd = arr.length - 1 - i;
              const arriving = fromEnd < 3 ? 0.92 - (2 - fromEnd) * 0.04 : 1;
              const pulseDelay = `${i * 0.6}s`;
              return (
                <button
                  key={m.stream_id}
                  onClick={() => {
                    onPlay({
                      id: `vod-${m.stream_id}`,
                      name: m.name,
                      url: buildVodUrl(credentials, m.stream_id, m.container_extension || 'mp4'),
                      logo: m.stream_icon,
                      category: 'movie',
                    });
                  }}
                  className="flex-shrink-0 relative rounded-xl overflow-hidden transition-transform duration-300 hover:scale-[1.05] active:scale-[0.97]"
                  style={{
                    width: 95 * arriving,
                    height: 142 * arriving,
                    animation: 'dash-neon-pulse 4s ease-in-out infinite',
                    animationDelay: pulseDelay,
                  }}
                >
                  {m.stream_icon ? (
                    <img src={m.stream_icon} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary-dark/10" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/65 to-transparent" />
                  {/* Floating shadow beneath */}
                  <div className="absolute -bottom-1 inset-x-1 h-4 bg-primary/10 blur-md rounded-full" />
                  <div className="absolute bottom-0 inset-x-0 p-1.5">
                    <p className="text-[8px] font-semibold text-white/80 text-center leading-tight line-clamp-1" style={{ textShadow: '0 0 5px rgba(157,78,221,0.25)' }}>
                      {m.name.replace(/\s*\(\d{4}\)\s*$/, '')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Zone divider ── */}
      <div className="mx-8 my-2 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.06), transparent)' }} />

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
        <div className="space-y-5">
          {allRows.map((row, i) => (
            <React.Fragment key={row.collection.id}>
              {/* Breaker after Fresh Movies */}
              {row.collection.id === 'kids-family' && (
                <div className="flex flex-col items-center py-5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.25))' }} />
                    <span className="text-[10px] font-bold text-white/15 tracking-[3px] uppercase">Get in Your Comfort Zone</span>
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(157,78,221,0.25))' }} />
                  </div>
                </div>
              )}
              {/* Breaker before 4K Cinema */}
              {row.collection.id === 'cinema-4k' && (
                <div className="flex flex-col items-center py-5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.25))' }} />
                    <span className="text-[10px] font-bold text-white/15 tracking-[3px] uppercase">Try Something New</span>
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(157,78,221,0.25))' }} />
                  </div>
                </div>
              )}
              <CollectionRow
                row={row}
                onPlayLive={playLive}
                onPlayMovie={playMovie}
                onOpenDetail={(movie, tmdb) => setDetailMovie({ movie, tmdbMap: tmdb })}
                onNavigate={navigate}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Movie Detail Modal ─────────────────────────────────── */}
      {detailMovie && (
        <ContentDetailModal
          streamId={detailMovie.movie.stream_id}
          name={detailMovie.movie.name}
          poster={detailMovie.movie.stream_icon}
          rating={detailMovie.movie.rating}
          containerExtension={detailMovie.movie.container_extension}
          type="movie"
          tmdbData={detailMovie.tmdbMap?.[`m:${detailMovie.movie.stream_id}`]}
          credentials={credentials}
          onPlay={(knownDuration) => {
            const tmdb = detailMovie.tmdbMap?.[`m:${detailMovie.movie.stream_id}`];
            const duration = knownDuration || (tmdb?.t ? tmdb.t * 60 : undefined);
            onPlay({
              id: `vod-${detailMovie.movie.stream_id}`,
              name: detailMovie.movie.name,
              url: buildVodUrl(credentials, detailMovie.movie.stream_id, detailMovie.movie.container_extension || 'mp4'),
              logo: detailMovie.movie.stream_icon,
              category: 'movie',
              knownDuration: duration,
            });
            setDetailMovie(null);
          }}
          onClose={() => setDetailMovie(null)}
        />
      )}

      {/* ── Trailer Modal ──────────────────────────────────────── */}
      {trailerState && (
        <TrailerModal
          youtubeKey={trailerState.youtubeKey}
          title={trailerState.title}
          poster={trailerState.poster}
          overview={trailerState.overview}
          onClose={() => setTrailerState(null)}
        />
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
  // Thin accent line under the title — different color per section vibe
  const isLive = title.includes('Sports') || title.includes('NBA') || title.includes('Fixtures');
  const isEntertainment = title.includes('Movies') || title.includes('Cinema') || title.includes('Drama');

  return (
    <div className="px-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mb-0.5 ${isLive ? 'animate-pulse' : ''}`}
            style={{
              background: isLive ? '#4ADE80' : isEntertainment ? '#9D4EDD' : '#7C3AED',
              boxShadow: isLive ? '0 0 6px rgba(74,222,128,0.4)' : '0 0 6px rgba(157,78,221,0.3)',
            }}
          />
          <h2
            className="text-[20px] font-black tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(157,78,221,0.08)' }}
          >
            {title}
          </h2>
        </div>
        {seeAllTo && onNavigate && (
          <button
            onClick={() => onNavigate(seeAllTo)}
            className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/50 transition-colors tracking-wide"
          >
            More
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Collection Row Renderer ───────────────────────────────────────

function CollectionRow({
  row,
  onPlayLive,
  onPlayMovie,
  onOpenDetail,
  onNavigate,
}: {
  row: RowData;
  onPlayLive: (stream: LiveStream, allStreams?: LiveStream[]) => void;
  onPlayMovie: (movie: VodStream) => void;
  onOpenDetail?: (movie: VodStream, tmdbMap?: Record<string, TmdbEntry>) => void;
  onNavigate: (path: string) => void;
}) {
  const { collection } = row;

  // ── Live channel row — wider landscape cards ────────────────
  if (collection.type === 'live' && row.liveStreams) {
    const aliveStreams = row.liveStreams.filter(s => isChannelProbeAlive(s.stream_id));
    if (aliveStreams.length === 0) return null;
    return (
      <section className="mb-1">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3">
          {aliveStreams.map((stream, i) => (
            <button
              key={stream.stream_id}
              onClick={() => onPlayLive(stream, aliveStreams)}
              className="flex-shrink-0 group"
              style={{ width: i === 0 ? 160 : 140 }}
            >
              <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/8"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <ChannelIcon src={stream.stream_icon} name={stream.name} size="lg" className="!w-full !h-full !rounded-xl" />
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded text-[8px] font-semibold text-green-400">
                  <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </div>
              </div>
              <p className="text-[10px] text-white/40 truncate group-hover:text-white/70 transition-colors">{stream.name}</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ── Smart VOD row — larger spotlight cards (personalized) ─────
  if (collection.type === 'smart-vod' && row.vodStreams) {
    return (
      <section className="mb-1">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3">
          {row.vodStreams.map((movie, i) => {
            const tmdb = row.tmdbMap?.[`m:${movie.stream_id}`];
            return (
              <div key={movie.stream_id} className="flex-shrink-0" style={{ width: i === 0 ? 140 : 125 }}>
                <PosterCard
                  title={movie.name}
                  poster={movie.stream_icon}
                  rating={movie.rating}
                  tmdbData={tmdb}
                  onClick={() => onOpenDetail ? onOpenDetail(movie, row.tmdbMap) : onPlayMovie(movie)}
                />
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ── Movie row — standard portrait with depth ──────────────────
  if (collection.type === 'vod' && row.vodStreams) {
    return (
      <section className="mb-1">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3">
          {row.vodStreams.map((movie) => (
            <div key={movie.stream_id} className="flex-shrink-0 w-[115px]">
              <PosterCard
                title={movie.name}
                poster={movie.stream_icon}
                rating={movie.rating}
                onClick={() => onOpenDetail ? onOpenDetail(movie, row.tmdbMap) : onPlayMovie(movie)}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Series row — taller portrait cards ─────────────────────────
  if (collection.type === 'series' && row.seriesItems) {
    return (
      <section className="mb-1">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3">
          {row.seriesItems.map((series) => (
            <div key={series.series_id} className="flex-shrink-0 w-[110px]">
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
