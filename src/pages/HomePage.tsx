import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, ChevronRight, Clock, Trophy, Radio, Globe, Music, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { t, useLanguage } from '@/i18n';
import type { Lang, TranslationKey } from '@/i18n';
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
  fetchVerifiedData,
  seedVerifiedSet,
  fetchCuratorData,
  getCuratorExperience,
  curatorToLiveStreams,
  hasCuratorData,
  isChannelProbeAlive,
  getTmdbMap,
  safeImageUrl,
  sortGemsFirst,
  fetchVeeData,
  getVeeData,
} from '@/lib/xtream';
import type { VeePlaylist } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import {
  HOMEPAGE_COLLECTIONS,
  COLLECTION_CARDS,
  getFeaturedHero,
} from '@/lib/collections';
import type { Collection, SmartCollection } from '@/lib/collections';
import { dailyShuffle } from '@/lib/intelligence';
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
import { FeedSection } from '@/components/ui/FeedSection';
import { HexCard } from '@/components/ui/HexCard';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useScrollFocus } from '@/hooks/useScrollFocus';

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

function timeAgo(ts: number, lang: Lang): string {
  if (!ts || !isFinite(ts) || isNaN(ts)) return t(lang, 'recently');
  const diff = Date.now() - ts;
  if (!isFinite(diff) || isNaN(diff)) return t(lang, 'recently');
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t(lang, 'justNow');
  if (mins < 60) return `${mins}${t(lang, 'minsAgo')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t(lang, 'hoursAgo')}`;
  const days = Math.floor(hours / 24);
  return `${days}${t(lang, 'daysAgo')}`;
}

// ── Sport tabs config ─────────────────────────────────────────────

const SPORT_TABS = [
  { id: 'football', labelKey: 'football' as TranslationKey, color: '#9D4EDD', catIds: ['234'], keywords: ['fc', 'fan', 'club', 'united', 'lfc', 'mutv', 'arsenal', 'chelsea', 'barca', 'real madrid', 'milan', 'inter', 'psg', 'bayern'] },
  { id: 'bein', labelKey: 'beinZone' as TranslationKey, color: '#EF4444', catIds: ['85'], keywords: ['bein', 'sports', 'football', 'champions', 'league', 'la liga', 'serie a', 'ligue 1'] },
  { id: 'tennis', labelKey: 'tennis' as TranslationKey, color: '#F97316', catIds: ['342', '234'], keywords: ['tennis', 'atp', 'wta', 'wimbledon', 'roland', 'us open', 'australian open'] },
];

// ── i18n mapping: collection names → translation keys ────────────
const COLLECTION_NAME_MAP: Record<string, TranslationKey> = {
  'Live Sports': 'liveSports',
  'Just Dropped': 'justDropped',
  'Kids & Family': 'kidsFamily',
  'Stay Informed': 'stayInformed',
  '4K Experience': 'fourKExperience',
  'Binge-Worthy': 'bingeWorthy',
  'Around the World': 'aroundTheWorld',
};

const HERO_TITLE_MAP: Record<string, TranslationKey> = {
  'Good Morning': 'heroGoodMorning',
  'Afternoon Escape': 'heroAfternoonEscape',
  'Prime Time': 'heroPrimeTime',
  'Late Night': 'heroLateNight',
};

const HERO_SUBTITLE_MAP: Record<string, TranslationKey> = {
  'Start your day informed. World-class news and morning entertainment.': 'heroGoodMorningSubtitle',
  'Award-winning movies and handpicked series. Your next favorite is here.': 'heroAfternoonSubtitle',
  'Live sports, fresh cinema, and curated series. Your evening, elevated.': 'heroPrimeTimeSubtitle',
  'The best series for those who stay up. Something new awaits.': 'heroLateNightSubtitle',
};

const HERO_CTA_MAP: Record<string, TranslationKey> = {
  'Start Watching': 'heroCTAStartWatching',
  'Explore': 'heroCTAExplore',
  'Watch Now': 'heroCTAWatchNow',
  'Dive In': 'heroCTADiveIn',
};

const PILL_NAME_MAP: Record<string, TranslationKey> = {
  'Sports': 'sports',
  'News': 'news',
  'Movies': 'movies',
  'Series': 'series',
  'Africa': 'africa',
  'Kids': 'kids',
  'Music': 'music',
  'Faith': 'faith',
};

// ── i18n mapping: collection descriptions → translation keys ────
const COLLECTION_DESC_MAP: Record<string, TranslationKey> = {
  'Live Sports': 'liveSportsDesc',
  'Just Dropped': 'justDroppedDesc',
  'Kids & Family': 'kidsFamilyDesc',
  'Stay Informed': 'stayInformedDesc',
  '4K Experience': 'fourKExperienceDesc',
  'Binge-Worthy': 'bingeWorthyDesc',
  'Around the World': 'aroundTheWorldDesc',
};

// ── Data loaders for each collection type ─────────────────────────

// Map homepage collection IDs to curator experience IDs
const COLLECTION_TO_EXPERIENCE: Record<string, string> = {
  'live-sports': 'sports',
  'world-cinema': 'entertainment',
  'news-world': 'news',
  'kids-family': 'kids',
};

// Map collection IDs → VEE experience IDs (same as COLLECTION_TO_EXPERIENCE but explicit)
const COLLECTION_TO_VEE: Record<string, string> = {
  'live-sports': 'homepage_sports',
  'world-cinema': 'homepage_entertainment',
  'news-world': 'homepage_news',
  'kids-family': 'homepage_kids',
};

async function loadLiveCollection(
  credentials: XtreamCredentials,
  collection: Collection,
  healthCatIds: string[],
  cache?: Record<string, LiveStream[]>,
  veeHomepage?: VeePlaylist[] | null
): Promise<LiveStream[]> {
  // VEE PATH (highest priority): AI-curated, time-aware playlist
  if (veeHomepage && veeHomepage.length > 0) {
    const veeId = COLLECTION_TO_VEE[collection.id];
    if (veeId) {
      const veeRow = veeHomepage.find(h => h.id === veeId);
      if (veeRow && veeRow.channels.length > 0) {
        console.log('[VEE] Using VEE row for %s (%s) — %d channels', collection.id, veeId, veeRow.channels.length);
        return curatorToLiveStreams(veeRow.channels).slice(0, collection.limit);
      }
    }
  }

  // CURATOR PATH: if curator data available, use it directly
  if (hasCuratorData()) {
    const expId = COLLECTION_TO_EXPERIENCE[collection.id];
    if (expId) {
      const curatorChannels = getCuratorExperience(expId);
      if (curatorChannels && curatorChannels.length > 0) {
        const streams = curatorToLiveStreams(curatorChannels);
        return dailyShuffle(streams, collection.id).slice(0, collection.limit);
      }
    }
  }

  // FALLBACK: category-based loading
  const activeCats = collection.categoryIds.filter(
    (id) => healthCatIds.length === 0 || healthCatIds.includes(id)
  );
  if (activeCats.length === 0) return [];

  const results = await Promise.allSettled(
    activeCats.map((catId) => {
      if (cache && cache[catId]) return Promise.resolve(cache[catId]);
      return getLiveStreams(credentials, catId).then(items => {
        if (cache) cache[catId] = items;
        return items;
      });
    })
  );
  const all: LiveStream[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  const alive = all.filter(s => isChannelProbeAlive(s.stream_id));
  const shuffled = dailyShuffle(alive.length > 0 ? alive : all, collection.id);
  return sortGemsFirst(shuffled).slice(0, collection.limit);
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
  return dailyShuffle(all, collection.id).slice(0, collection.limit);
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

function DiscoverSports({ credentials, onPlay, navigate, categoryCache }: { credentials: XtreamCredentials; onPlay: (ch: Channel) => void; navigate: (path: string) => void; categoryCache: React.MutableRefObject<Record<string, LiveStream[]>> }) {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState(SPORT_TABS[0].id);
  const [channels, setChannels] = useState<Record<string, LiveStream[]>>({});

  const tab = SPORT_TABS.find(t => t.id === activeTab)!;

  useEffect(() => {
    if (channels[activeTab]) return;
    let mounted = true;
    // Use shared category cache to avoid duplicate fetches for the same catId
    Promise.allSettled(tab.catIds.map(c => {
      if (categoryCache.current[c]) return Promise.resolve(categoryCache.current[c]);
      return getLiveStreams(credentials, c).then(items => {
        categoryCache.current[c] = items;
        return items;
      });
    }))
      .then(results => {
        if (!mounted) return;
        const all: LiveStream[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...(r.value as LiveStream[]));
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
    <section className="mb-2 py-3 reveal">
      <div className="flex flex-col items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: tab.color, boxShadow: `0 0 6px ${tab.color}60` }} />
          <h2 className="text-[20px] font-black tracking-tight text-white">{t(lang, 'discover')}</h2>
        </div>
        <button onClick={() => navigate('/live')} className="text-[11px] text-white/20 hover:text-white/50 transition-colors tracking-wide mt-1">{t(lang, 'more')}</button>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-2 justify-center px-4 mb-3">
        {SPORT_TABS.map(st => (
          <button
            key={st.id}
            onClick={() => setActiveTab(st.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors duration-300"
            style={activeTab === st.id ? {
              background: `${st.color}18`,
              border: `1px solid ${st.color}30`,
              color: 'rgba(255,255,255,0.9)',
              boxShadow: `0 0 10px ${st.color}15`,
            } : {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {t(lang, st.labelKey)}
          </button>
        ))}
      </div>

      {/* Channels */}
      <div data-focus-lens className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3 items-end">
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
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { getRecent } = useWatchHistory();
  const { profile } = useUserProfile();
  const [rows, setRows] = useState<RowData[]>([]);
  const [smartRows, setSmartRows] = useState<RowData[]>([]);
  const [veeHomepageData, setVeeHomepageData] = useState<VeePlaylist[] | null>(null);
  const [veeHotRow, setVeeHotRow] = useState<VeePlaylist | null>(null);
  const [veeExploreRow, setVeeExploreRow] = useState<VeePlaylist | null>(null);
  const [veeSocialProof, setVeeSocialProof] = useState<VeePlaylist | null>(null);
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

  // Shared cache: prevents duplicate fetches for the same live category (e.g. 234 = Football)
  const categoryCache = useRef<Record<string, LiveStream[]>>({});

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
      console.log('[HOME] Loading started');
      const t0 = Date.now();
      try {
        // Fetch curator (Supabase-backed) + VEE + health + legacy fallbacks in parallel
        const [curatorResult, veeResult, health, verifiedData, probeData] = await Promise.all([
          fetchCuratorData(),
          fetchVeeData(),
          fetchVpsHealth(),
          fetchVerifiedData(),
          fetchServerProbeData(),
        ]);
        // verbose: '[HOME] Data loaded'
        if (curatorResult) {
          // verbose: '[HOME] Using curator'
        } else if (verifiedData) {
          seedVerifiedSet(verifiedData);
          // verbose: '[HOME] Fallback to verified set'
        } else if (probeData) {
          seedProbeCacheFromServer(probeData);
          // verbose: '[HOME] Fallback to legacy probe'
        }
        // Store VEE homepage rows for tagline overlay + new special rows
        if (veeResult) {
          setVeeHomepageData(veeResult.homepage || null);
          setVeeHotRow(veeResult.vee_hot || null);
          setVeeExploreRow(veeResult.vee_explore || null);
          setVeeSocialProof(veeResult.social_proof || null);
        }
        const liveCatIds: string[] = health.liveCategories || [];

        // Load collections progressively — each row appears as it resolves
        let anyLoaded = false;
        // verbose: '[HOME] Loading collections'
        const rowPromises = HOMEPAGE_COLLECTIONS.map(async (collection) => {
          const rowData: RowData = { collection };
          try {
            if (collection.type === 'live') {
              rowData.liveStreams = await loadLiveCollection(credentials, collection, liveCatIds, categoryCache.current, veeResult?.homepage);
            } else if (collection.type === 'vod') {
              rowData.vodStreams = await loadVodCollection(credentials, collection);
            } else if (collection.type === 'series') {
              rowData.seriesItems = await loadSeriesCollection(credentials, collection);
            }
          } catch (err) {
            console.warn('[HOME] Row failed:', collection.id, err);
          }
          const count = (rowData.liveStreams?.length || 0) + (rowData.vodStreams?.length || 0) + (rowData.seriesItems?.length || 0);
          // verbose: '[HOME] Row ready'
          // Append this row immediately when it resolves
          if (!mounted) return;
          const hasContent = count > 0;
          if (hasContent) {
            anyLoaded = true;
            setLoading(false);
            setRows(prev => {
              if (prev.some(r => r.collection.id === collection.id)) return prev;
              // Insert in original HOMEPAGE_COLLECTIONS order
              const ordered = [...prev, rowData].sort((a, b) => {
                const ai = HOMEPAGE_COLLECTIONS.findIndex(c => c.id === a.collection.id);
                const bi = HOMEPAGE_COLLECTIONS.findIndex(c => c.id === b.collection.id);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
              });
              return ordered;
            });
          }
        });

        await Promise.allSettled(rowPromises);
        if (!mounted) return;
        // verbose: '[HOME] All collections done'
        if (!anyLoaded) setError(true);
      } catch (err) {
        console.error('[HOME] Fatal load error:', err);
        if (mounted) setError(true);
      } finally {
        console.log('[HOME] Load complete — total:', Date.now() - t0, 'ms');
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [credentials, retryKey]);

  // ── Smart Rows (lazy, after main content loads) ─────────────────

  useEffect(() => {
    // Defer smart rows until main content is loaded (saves 4.5MB on first paint)
    if (!credentials || loading) return;
    const userProfile = profile; // may be null on first visit
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
        if (moviePool.length > 0 && userProfile) {
          const forYou = getForYouItems(moviePool, 'movie', userProfile, TMDB_MAP, 15);
          if (forYou.length > 0) {
            const smartCollection: SmartCollection = {
              id: 'smart-for-you',
              name: '__forYou__',
              emoji: '',
              description: '__forYouDesc__',
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
        if (userProfile && userProfile.lastWatched.length > 0) {
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
                name: `__becauseYouWatched__ ${cleanName}`,
                emoji: '',
                description: `__similarTo__ ${cleanName}`,
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
  }, [credentials, loading]);

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

    // Hottest Fixtures — live sports (uses shared categoryCache)
    Promise.allSettled(['234', '85', '492'].map(c => {
      if (categoryCache.current[c]) return Promise.resolve(categoryCache.current[c]);
      return getLiveStreams(credentials, c).then(items => {
        categoryCache.current[c] = items;
        return items;
      });
    }))
      .then(results => {
        if (!mounted) return;
        const all: LiveStream[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...(r.value as LiveStream[]));
        }
        const alive = all.filter(s => isChannelProbeAlive(s.stream_id));
        setFixturesHex(alive.slice(0, 6));
      });

    // Discover Football — fan channels (uses shared categoryCache, cleaned keywords)
    const fetchFootball = categoryCache.current['234']
      ? Promise.resolve(categoryCache.current['234'])
      : getLiveStreams(credentials, '234').then(items => {
          categoryCache.current['234'] = items;
          return items;
        });
    fetchFootball.then(items => {
      if (!mounted) return;
      const fanKeywords = ['fc', 'fan', 'club', 'united', 'lfc', 'mutv', 'arsenal', 'chelsea', 'barca', 'real madrid', 'milan', 'inter', 'psg', 'bayern', 'ajax', 'celtic', 'rangers', 'porto', 'benfica', 'sporting'];
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
        const tmdbData = await getTmdbMap();
        const TMDB = tmdbData?.TMDB_MAP || {};
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
              // Prioritize items with posters (Xtream OR TMDB)
              const withArt = items.filter(i => {
                if (i.poster && !i.poster.includes('webhop') && !i.poster.includes('paste.pics')) return true;
                const tmdb = TMDB[`s:${i.id}`];
                return tmdb?.p;
              });
              const picked = withArt.length >= 3 ? withArt.slice(0, 3) : items.slice(0, 3);
              return { platform: p, items: picked, tmdbMap: TMDB };
            } catch { return { platform: p, items: [] as any[], tmdbMap: TMDB }; }
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

  // ── Scroll reveal ──────────────────────────────────────────────
  const scrollRef = useScrollReveal([loading, rows, smartRows, platformData, fixturesHex]);
  useScrollFocus();

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div ref={scrollRef} className="pt-16 pb-32">
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
          <h2 className="text-[22px] font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>{HERO_TITLE_MAP[hero.title] ? t(lang, HERO_TITLE_MAP[hero.title]) : hero.title}</h2>
          <p className="text-[11px] mb-4 max-w-sm leading-relaxed hero-subtitle-reveal">
            {recentHistory.length > 0
              ? (HERO_SUBTITLE_MAP[hero.subtitle] ? t(lang, HERO_SUBTITLE_MAP[hero.subtitle]) : hero.subtitle)
              : t(lang, 'heroDefault')}
          </p>
          <button
            onClick={() => navigate(hero.navigateTo)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-[14px] tracking-wide spring-press w-fit text-white"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 60%, #6D28D9 100%)',
              boxShadow: '0 0 24px rgba(157,78,221,0.35), 0 4px 16px rgba(157,78,221,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Play className="w-4.5 h-4.5" fill="white" />
            {HERO_CTA_MAP[hero.cta] ? t(lang, HERO_CTA_MAP[hero.cta]) : hero.cta}
          </button>
        </div>
      </div>

      {/* ── Quick Navigation — clean pills ───────────────────── */}
      <div className="px-4 mb-5 reveal">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth-x pb-1">
          {COLLECTION_CARDS.map((card) => {
            const IconMap: Record<string, React.ReactNode> = {
              sports: <Trophy className="w-3 h-3" />,
              news: <Radio className="w-3 h-3" />,
              africa: <Globe className="w-3 h-3" />,
              faith: <Heart className="w-3 h-3" />,
            };
            const icon = IconMap[card.id];
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.navigateTo)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-[7px] rounded-full card-press hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {icon && <span className="text-white/40">{icon}</span>}
                <span className="text-[11px] font-medium text-white/50 whitespace-nowrap">{PILL_NAME_MAP[card.name] ? t(lang, PILL_NAME_MAP[card.name]) : card.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Continue Watching ─────────────────────────────────── */}
      {recentHistory.length > 0 && (
        <section className="mb-6 reveal">
          <SectionHeader emoji="" title={t(lang, 'continueWatching')} icon={<Clock className="w-4 h-4 text-primary-light" />} />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2">
            {recentHistory.map((entry, idx) => (
              <button
                key={entry.channelId}
                onClick={() => playHistoryItem(entry)}
                className="flex-shrink-0 w-40 group"
                style={idx < 12 ? { animation: `vee-card-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 90}ms both` } : undefined}
              >
                <div
                  className="relative aspect-video rounded-xl overflow-hidden mb-2 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/10"
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
                      {entry.category === 'live' ? t(lang, 'live') : entry.category === 'movie' ? t(lang, 'movie') : entry.category === 'series' ? t(lang, 'typeSeries') : entry.category}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/50 rounded text-[9px] text-white/50">
                    {timeAgo(entry.watchedAt, lang)}
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
      <div className="mx-8 my-1 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.06), transparent)' }} />

      {/* ── Vee Smart Picks ─────────────────────────────────── */}
      {/* V1 LOCKDOWN: always render container to prevent layout shift when data loads */}
      <section className={`mt-6 mb-2 transition-opacity duration-500 ${veePool.length > 0 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {veePool.length > 0 && (
          <VeeWidget
            items={veePool}
            onPlay={(item) => playMovie(item as unknown as VodStream)}
            onTrailer={(key, title, poster, overview) => setTrailerState({ youtubeKey: key, title, poster, overview })}
            tmdbMap={veeTmdbMap}
          />
        )}
      </section>

      {/* ── Zone divider ── */}
      <div className="mx-8 my-2 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.06), transparent)' }} />

      {/* ── DASH Feed — curated community experience ── */}
      <FeedSection />

      {/* ── Platform Originals Showcase ────────────────────── */}
      {/* V1 LOCKDOWN: fade in without shifting layout */}
      <div className={`transition-opacity duration-500 ${platformData.length > 0 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {platformData.length > 0 && (
          <PlatformShowcase
            platforms={platformData}
            onNavigate={navigate}
          />
        )}
      </div>

      {/* ── Because You Watched — intimate, grey-orange, firefly glow ──── */}
      {/* V1 LOCKDOWN: fade in without shifting layout */}
      {becauseRow && becauseRow.vodStreams && (
        <section className="mb-1 relative reveal">
          <div className="px-4 mb-3">
            <p className="text-[11px] font-bold tracking-[3px] uppercase" style={{
              background: 'linear-gradient(90deg, rgba(210,180,140,0.5), rgba(255,200,150,0.4), rgba(210,180,140,0.3))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {becauseRow.collection.name.replace('__becauseYouWatched__ ', `${t(lang, 'sinceYouLiked')} `)}
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
            <div data-focus-lens className="flex gap-5 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
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
        <span className="text-[10px] font-medium text-white/15 tracking-[4px] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t(lang, 'sportsBreak')}</span>
      </div>

      {/* ── Hottest Fixtures — soft glowing circles ────────── */}
      {/* V1 LOCKDOWN: collapse to 0 height when empty, fade in when loaded */}
      {fixturesHex.length > 0 && (
        <section className="mb-2 py-3 reveal" style={{ contain: 'layout' }}>
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 live-badge-pulse" style={{ boxShadow: '0 0 6px rgba(248,113,113,0.4)' }} />
              <h2 className="text-[20px] font-black tracking-tight text-white">{t(lang, 'hottestFixtures')}</h2>
            </div>
            <button onClick={() => navigate('/live')} className="text-[11px] text-white/30 hover:text-white/60 transition-colors mt-1">{t(lang, 'seeAll')}</button>
          </div>
          <div data-focus-lens className="flex gap-4 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x justify-center px-4 pb-3 items-center">
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
                className="flex-shrink-0 flex flex-col items-center gap-2 group card-press hover:scale-[1.03] active:scale-[0.96]"
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
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #F97316, #EF4444, #9D4EDD)' }}>
                    <span className="w-1 h-1 rounded-full bg-white live-badge-pulse" />
                    <span className="text-[7px] font-bold text-white">{t(lang, 'live').toUpperCase()}</span>
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
      <DiscoverSports credentials={credentials} onPlay={onPlay} navigate={navigate} categoryCache={categoryCache} />

      {/* ── Section Breaker: Back to Entertainment ── */}
      <div className="flex flex-col items-center py-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.3))' }} />
          <span className="text-[11px] font-medium text-white/20 tracking-[3px] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t(lang, 'diveRightBackIn')}</span>
          <div className="w-8 h-[0.5px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(157,78,221,0.3))' }} />
        </div>
      </div>

      {/* ── DASH Exclusives — cinema ticket cards (4 posters per ticket) ── */}
      {dashOriginalsHex.length > 0 && (
        <section className="mb-2 py-3 reveal" style={{ contain: 'layout' }}>
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-baseline gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mb-0.5" style={{ boxShadow: '0 0 6px rgba(157,78,221,0.4)' }} />
              <h2 className="text-[20px] font-black tracking-tight text-white">{t(lang, 'dashExclusives')}</h2>
            </div>
            <button onClick={() => navigate('/movies')} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">{t(lang, 'seeAll')}</button>
          </div>
          <div data-focus-lens className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3 items-end">

            {/* ── Art Ticket — clickable, 4 posters, shimmer ── */}
            <button
              onClick={() => navigate('/movies')}
              className="flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer card-press hover:scale-[1.03] active:scale-[0.97]"
              style={{
                width: 270,
                height: 165,
                boxShadow: '0 4px 20px rgba(157, 78, 221, 0.08)',
              }}
            >
              <div className="flex h-full">
                {dashOriginalsHex.slice(0, 4).map((m) => (
                  <div key={m.stream_id} className="flex-1 relative overflow-hidden">
                    {safeImageUrl(m.stream_icon) ? (
                      <img src={safeImageUrl(m.stream_icon)!} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                <p className="text-[9px] font-bold text-primary-light/40 tracking-widest uppercase text-center">{t(lang, 'dPlusCollection')}</p>
              </div>
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(157,78,221,0.2) 50%, transparent 90%)' }} />
            </button>

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
                  className="flex-shrink-0 relative rounded-xl overflow-hidden card-press hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    width: 95 * arriving,
                    height: 142 * arriving,
                    animation: 'dash-neon-pulse 4s ease-in-out infinite',
                    animationDelay: pulseDelay,
                  }}
                >
                  {safeImageUrl(m.stream_icon) ? (
                    <img src={safeImageUrl(m.stream_icon)!} alt="" className="w-full h-full object-cover" loading="lazy" />
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
      {loading && allRows.length === 0 && !error && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-full w-full bg-primary/30 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-text-muted text-sm">{t(lang, 'unableToLoadTapRetry')}</p>
          <button
            onClick={() => { setLoading(true); setRetryKey((k) => k + 1); }}
            className="px-5 py-2.5 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors"
          >
            {t(lang, 'retry')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {allRows.map((row, i) => (
            <React.Fragment key={row.collection.id}>
              {/* Breaker after Fresh Movies */}
              {row.collection.id === 'kids-family' && (
                <div className="flex flex-col items-center py-5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.25))' }} />
                    <span className="text-[10px] font-bold text-white/15 tracking-[3px] uppercase">{t(lang, 'getInComfortZone')}</span>
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(157,78,221,0.25))' }} />
                  </div>
                </div>
              )}
              {/* Breaker before 4K Cinema */}
              {row.collection.id === 'cinema-4k' && (
                <div className="flex flex-col items-center py-5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-[0.5px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.25))' }} />
                    <span className="text-[10px] font-bold text-white/15 tracking-[3px] uppercase">{t(lang, 'trySomethingNew')}</span>
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
                veeTagline={veeHomepageData?.find(h => h.id === COLLECTION_TO_VEE[row.collection.id])?.tagline}
              />
            </React.Fragment>
          ))}

          {/* ── Popular Right Now — social proof row ─────────────── */}
          {veeSocialProof && veeSocialProof.channels.length > 0 && (
            <VeeLiveRow
              playlist={veeSocialProof}
              label="Popular Right Now"
              credentials={credentials}
              onPlayLive={playLive}
              accent="social"
            />
          )}

          {/* ── VEE Hot — AI trending channels ─────────────────── */}
          {veeHotRow && veeHotRow.channels.length > 0 && (
            <VeeLiveRow
              playlist={veeHotRow}
              label="VEE Hot"
              credentials={credentials}
              onPlayLive={playLive}
            />
          )}

          {/* ── VEE Explore — diversity pick ─────────────────────── */}
          {veeExploreRow && veeExploreRow.channels.length > 0 && (
            <VeeLiveRow
              playlist={veeExploreRow}
              label="VEE Explore"
              credentials={credentials}
              onPlayLive={playLive}
            />
          )}
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
  subtitle,
  veeTagline,
  icon,
  seeAllTo,
  onNavigate,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  veeTagline?: string;
  icon?: React.ReactNode;
  seeAllTo?: string;
  onNavigate?: (path: string) => void;
}) {
  const { lang } = useLanguage();
  // Translate collection name if a mapping exists
  const translatedTitle = COLLECTION_NAME_MAP[title]
    ? t(lang, COLLECTION_NAME_MAP[title])
    : title.startsWith('__forYou__') ? t(lang, 'forYou')
    : title.startsWith('__becauseYouWatched__') ? `${t(lang, 'becauseYouWatched')} ${title.replace('__becauseYouWatched__ ', '')}`
    : title;

  // VEE tagline takes priority over hardcoded description, then fall back to translated desc
  const translatedSubtitle = veeTagline
    ? veeTagline
    : COLLECTION_DESC_MAP[title]
    ? t(lang, COLLECTION_DESC_MAP[title])
    : subtitle || undefined;

  // Thin accent line under the title — different color per section vibe
  const isLive = title.includes('Sports') || title.includes('NBA') || title.includes('Fixtures');
  const isEntertainment = title.includes('Movies') || title.includes('Cinema') || title.includes('Drama') || title.includes('Dropped') || title.includes('Binge') || title.includes('4K') || title.includes('World');

  return (
    <div className="px-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mb-0.5 ${isLive ? 'live-badge-pulse' : ''}`}
            style={{
              background: isLive ? '#EF4444' : isEntertainment ? '#9D4EDD' : '#7C3AED',
              boxShadow: isLive ? '0 0 6px rgba(239,68,68,0.4)' : '0 0 6px rgba(157,78,221,0.3)',
            }}
          />
          <h2
            className="text-[20px] font-black tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(157,78,221,0.08)' }}
          >
            {translatedTitle}
          </h2>
        </div>
        {seeAllTo && onNavigate && (
          <button
            onClick={() => onNavigate(seeAllTo)}
            className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/50 transition-colors tracking-wide"
          >
            {t(lang, 'more')}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {translatedSubtitle && (
        <p className="text-[11px] text-white/25 mt-0.5 pl-3.5">{translatedSubtitle}</p>
      )}
    </div>
  );
}

// ── VEE Live Row — special AI-curated live channel rows ──────────

function VeeLiveRow({
  playlist,
  label,
  credentials,
  onPlayLive,
  accent,
}: {
  playlist: VeePlaylist;
  label: string;
  credentials: XtreamCredentials;
  onPlayLive: (stream: LiveStream, allStreams?: LiveStream[]) => void;
  accent?: 'hot' | 'explore' | 'social';
}) {
  const { lang } = useLanguage();
  const streams = curatorToLiveStreams(playlist.channels);
  const aliveStreams = streams.filter(s => isChannelProbeAlive(s.stream_id));
  if (aliveStreams.length === 0) return null;

  const mode = accent ?? (label === 'VEE Hot' ? 'hot' : label === 'Popular Right Now' ? 'social' : 'explore');
  const dotColor = mode === 'hot' ? '#F97316' : mode === 'social' ? '#10B981' : '#3B82F6';
  const dotGlow = mode === 'hot' ? 'rgba(249,115,22,0.5)' : mode === 'social' ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)';
  const badgeColor = mode === 'hot' ? '#FB923C' : mode === 'social' ? '#34D399' : '#60A5FA';

  return (
    <section className="mb-1 reveal">
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mb-0.5"
              style={{ background: dotColor, boxShadow: `0 0 6px ${dotGlow}` }}
            />
            <h2 className="text-[20px] font-black tracking-tight text-white" style={{ textShadow: '0 0 40px rgba(157,78,221,0.08)' }}>
              {label}
            </h2>
          </div>
        </div>
        {playlist.tagline && (
          <p className="text-[11px] text-white/25 mt-0.5 pl-3.5">{playlist.tagline}</p>
        )}
      </div>
      <div data-focus-lens className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
        {aliveStreams.map((stream, i) => (
          <button
            key={stream.stream_id}
            onClick={() => onPlayLive(stream, aliveStreams)}
            className="flex-shrink-0 group"
            style={{ width: i === 0 ? 160 : 140, ...(i < 12 ? { animation: `vee-card-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 90}ms both` } : {}) }}
          >
            <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/8"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <ChannelIcon src={stream.stream_icon} name={stream.name} size="lg" className="!w-full !h-full !rounded-xl" />
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded text-[8px] font-semibold"
                style={{ color: badgeColor }}>
                <span className="w-1 h-1 rounded-full live-badge-pulse" style={{ background: dotColor }} />
                {t(lang, 'live').toUpperCase()}
              </div>
            </div>
            <p className="text-[10px] text-white/40 truncate group-hover:text-white/70 transition-colors">{stream.name}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Collection Row Renderer ───────────────────────────────────────

function CollectionRow({
  row,
  onPlayLive,
  onPlayMovie,
  onOpenDetail,
  onNavigate,
  veeTagline,
}: {
  row: RowData;
  onPlayLive: (stream: LiveStream, allStreams?: LiveStream[]) => void;
  onPlayMovie: (movie: VodStream) => void;
  onOpenDetail?: (movie: VodStream, tmdbMap?: Record<string, TmdbEntry>) => void;
  onNavigate: (path: string) => void;
  veeTagline?: string;
}) {
  const { lang } = useLanguage();
  const { collection } = row;

  // ── Live channel row — wider landscape cards ────────────────
  if (collection.type === 'live' && row.liveStreams) {
    const aliveStreams = row.liveStreams.filter(s => isChannelProbeAlive(s.stream_id));
    if (aliveStreams.length === 0) return null;
    return (
      <section className="mb-1 reveal">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          subtitle={'description' in collection ? collection.description : undefined}
          veeTagline={veeTagline}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div data-focus-lens className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
          {aliveStreams.map((stream, i) => (
            <button
              key={stream.stream_id}
              onClick={() => onPlayLive(stream, aliveStreams)}
              className="flex-shrink-0 group"
              style={{ width: i === 0 ? 160 : 140, ...(i < 12 ? { animation: `vee-card-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 90}ms both` } : {}) }}
            >
              <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/8"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <ChannelIcon src={stream.stream_icon} name={stream.name} size="lg" className="!w-full !h-full !rounded-xl" />
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded text-[8px] font-semibold text-red-400">
                  <span className="w-1 h-1 rounded-full bg-red-400 live-badge-pulse" />
                  {t(lang, 'live').toUpperCase()}
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
      <section className="mb-1 reveal">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          subtitle={'description' in collection ? collection.description : undefined}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div data-focus-lens className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
          {row.vodStreams.map((movie, i) => {
            const tmdb = row.tmdbMap?.[`m:${movie.stream_id}`];
            return (
              <div key={movie.stream_id} className="flex-shrink-0" style={{ width: i === 0 ? 140 : 125, ...(i < 12 ? { animation: `vee-card-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 90}ms both` } : {}) }}>
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
      <section className="mb-1 reveal">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          subtitle={'description' in collection ? collection.description : undefined}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div data-focus-lens className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
          {row.vodStreams.map((movie, i) => (
            <div key={movie.stream_id} className="flex-shrink-0 w-[115px]" style={i < 12 ? { animation: `vee-card-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 90}ms both` } : undefined}>
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
      <section className="mb-1 reveal">
        <SectionHeader
          emoji={collection.emoji}
          title={collection.name}
          subtitle={'description' in collection ? collection.description : undefined}
          seeAllTo={collection.navigateTo}
          onNavigate={onNavigate}
        />
        <div data-focus-lens className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
          {row.seriesItems.map((series, i) => (
            <div key={series.series_id} className="flex-shrink-0 w-[110px]" style={i < 12 ? { animation: `vee-card-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 90}ms both` } : undefined}>
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
