import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Search, X, ChevronRight, LayoutGrid, Trophy, Sparkles, Radio, Baby, Film, Music, Globe, Heart } from 'lucide-react';
import { t, useLanguage } from '@/i18n';
import type { XtreamCredentials, LiveStream, GroupedChannel, FreeChannel } from '@/lib/xtream';
import { getLiveStreams, getAllLiveStreams, buildLiveUrl, groupChannelsByQuality, fetchVpsHealth, isCategoryDead, probeChannels, isChannelProbeAlive, sortGemsFirst, fetchServerProbeData, seedProbeCacheFromServer, getFreeChannels, freeToLiveStream, buildFreeUrlMap, isFreeChannel } from '@/lib/xtream';
import {
  LIVETV_THEMES, SPORT_TYPES, ENTERTAINMENT_TYPES, KIDS_TYPES,
  CINEMA_TYPES, MUSIC_TYPES, DISCOVERY_TYPES, FAITH_TYPES, PREMIUM4K_TYPES,
  BROWSE_EXPERIENCES, DEAD_CATEGORY_IDS,
} from '@/lib/collections';
import type { LiveTheme, SportType, BrowseExperience } from '@/lib/collections';
import { getSmartThemeOrder, recordThemeWatch } from '@/lib/intelligence';

// Map theme IDs to their child experience sub-tabs
const THEME_SUBTYPES: Record<string, SportType[]> = {
  'sports': SPORT_TYPES,
  'entertainment': ENTERTAINMENT_TYPES,
  'kids': KIDS_TYPES,
  'movies247': CINEMA_TYPES,
  'music': MUSIC_TYPES,
  'documentary': DISCOVERY_TYPES,
  'faith': FAITH_TYPES,
  'premium4k': PREMIUM4K_TYPES,
  'news': [], // News doesn't need sub-tabs
};
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed, setAmbientExperience } from '@/lib/ambient-audio';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isDead } from '@/hooks/useChannelHealth';
import type { Channel } from '@/types';


// Map theme IDs to free channel experience tags
const THEME_TO_EXPERIENCE: Record<string, string[]> = {
  'sports': ['sports'],
  'news': ['news'],
  'entertainment': ['entertainment', 'african', 'indian', 'arabic', 'french'],
  'kids': ['kids'],
  'movies247': ['movies'],
  'documentary': ['documentary'],
  'music': ['music'],
  'premium4k': ['sports', 'movies', 'documentary'],
};

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const LiveTVPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();


  // ── Search state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LiveStream[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Probe staleness ─────────────────────────────────────────────
  const [probeStale, setProbeStale] = useState(false);

  // ── Theme state (Discover mode) ───────────────────────────────
  const [themeStreams, setThemeStreams] = useState<Record<string, LiveStream[]>>({});
  const [themesLoading, setThemesLoading] = useState(true);

  // ── Free channel URL map (stream_id -> HLS URL) ────────────
  const [freeUrlMap, setFreeUrlMap] = useState<Record<number, string>>({});

  // ── Browse state (experience-based, not raw categories) ────────
  const [showBrowse, setShowBrowse] = useState(false);
  const [activeExperience, setActiveExperience] = useState<string>(BROWSE_EXPERIENCES[0].id);
  const [browseStreams, setBrowseStreams] = useState<LiveStream[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState(false);

  const isSearching = debouncedQuery.trim().length > 0;

  // ── Debounce search ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Search across all channels (Xtream + free) ─────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) { setSearchResults([]); return; }
    let mounted = true;
    async function search() {
      setSearchLoading(true);
      try {
        const [all, freeAll] = await Promise.all([
          getAllLiveStreams(credentials),
          getFreeChannels(),
        ]);
        const q = debouncedQuery.toLowerCase();
        const xtreamResults = all.filter(s => s.name.toLowerCase().includes(q))
          .filter(s => isChannelProbeAlive(s.stream_id));
        const freeResults = freeAll.filter(ch => ch.name.toLowerCase().includes(q));
        const freeAsLive = freeResults.map(freeToLiveStream);
        // Populate URL map for free results
        if (freeResults.length > 0) {
          setFreeUrlMap(prev => ({ ...prev, ...buildFreeUrlMap(freeResults) }));
        }
        if (mounted) setSearchResults([...xtreamResults, ...freeAsLive]);
      } catch {
        if (mounted) setSearchResults([]);
      } finally {
        if (mounted) setSearchLoading(false);
      }
    }
    search();
    return () => { mounted = false; };
  }, [debouncedQuery, credentials]);

  // ── Smart theme ordering based on user affinity ─────────────────
  const smartThemeOrder = React.useMemo(() => {
    const defaultOrder = LIVETV_THEMES.map(t => t.id);
    const orderedIds = getSmartThemeOrder(defaultOrder);
    return orderedIds.map(id => LIVETV_THEMES.find(t => t.id === id)!).filter(Boolean);
  }, []);

  // ── Load theme streams on mount (Xtream + free channels merged) ─
  useEffect(() => {
    let mounted = true;
    async function loadThemes() {
      try {
        const [healthData, probeData] = await Promise.all([
          fetchVpsHealth(),
          fetchServerProbeData(),
        ]);
        if (probeData) {
          seedProbeCacheFromServer(probeData);
          // Check if probe data is stale (>48h old or no timestamp)
          const STALE_MS = 48 * 60 * 60 * 1000;
          const probeTs = probeData.ts ? new Date(probeData.ts).getTime() : 0;
          if (!probeTs || Date.now() - probeTs > STALE_MS) {
            setProbeStale(true);
          }
        } else {
          // No probe data at all — treat as stale
          setProbeStale(true);
        }

        // Load free channels in parallel with Xtream themes
        const freeChannelsPromise = getFreeChannels();

        const results = await Promise.allSettled(
          LIVETV_THEMES.map(async (theme) => {
            const activeCats = theme.categoryIds.filter(id => !isCategoryDead(healthData, id));
            const cats = activeCats.length > 0 ? activeCats : theme.categoryIds;
            const streams = await Promise.allSettled(
              cats.map(id => getLiveStreams(credentials, id).catch(() => [] as LiveStream[]))
            );
            const xtreamStreams = dedupeStreams(streams.flatMap(r => r.status === 'fulfilled' ? r.value : []));

            // Merge matching free channels
            const experiences = THEME_TO_EXPERIENCE[theme.id];
            let freeStreams: FreeChannel[] = [];
            if (experiences) {
              const allFree = await freeChannelsPromise;
              freeStreams = allFree.filter(ch => experiences.includes(ch.experience));
            }
            const freeAsLive = freeStreams.map(freeToLiveStream);
            return {
              id: theme.id,
              streams: [...xtreamStreams, ...freeAsLive],
              freeChannels: freeStreams,
            };
          })
        );
        if (!mounted) return;
        const map: Record<string, LiveStream[]> = {};
        const urlMap: Record<number, string> = {};
        for (const r of results) {
          if (r.status === 'fulfilled') {
            map[r.value.id] = r.value.streams;
            Object.assign(urlMap, buildFreeUrlMap(r.value.freeChannels));
          }
        }
        setThemeStreams(map);
        setFreeUrlMap(prev => ({ ...prev, ...urlMap }));
      } catch {
        // silent — themes are best-effort
      } finally {
        if (mounted) setThemesLoading(false);
      }
    }
    loadThemes();
    return () => { mounted = false; };
  }, [credentials]);

  // ── Load browse streams for active experience ──────────────────
  useEffect(() => {
    if (!showBrowse || !activeExperience) return;
    const exp = BROWSE_EXPERIENCES.find(e => e.id === activeExperience);
    if (!exp) return;
    let mounted = true;
    async function load() {
      setBrowseLoading(true);
      setBrowseError(false);
      try {
        const promises = exp!.categoryIds
          .filter(id => !DEAD_CATEGORY_IDS.has(id))
          .map(id => getLiveStreams(credentials, id).catch(() => [] as LiveStream[]));
        const results = await Promise.all(promises);
        if (!mounted) return;
        // Dedup by stream_id, gems first
        const seen = new Set<number>();
        const all: LiveStream[] = [];
        for (const batch of results) {
          for (const s of batch) {
            if (!seen.has(s.stream_id)) { seen.add(s.stream_id); all.push(s); }
          }
        }
        setBrowseStreams(sortGemsFirst(all));
      } catch {
        if (mounted) { setBrowseStreams([]); setBrowseError(true); }
      } finally {
        if (mounted) setBrowseLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [showBrowse, activeExperience, credentials]);

  // ── Play handler with playlist context ────────────────────────
  const handlePlayFromList = useCallback(
    (stream: LiveStream, allStreams: LiveStream[]) => {
      const channels = allStreams
        .filter(s => !isDead(`live-${s.stream_id}`) && isChannelProbeAlive(s.stream_id))
        .map(s => ({
          id: `live-${s.stream_id}`,
          name: s.name,
          url: isFreeChannel(s.stream_id)
            ? freeUrlMap[s.stream_id] || ''  // Direct HLS URL for free channels
            : buildLiveUrl(credentials, s.stream_id),  // VPS proxy for Xtream
          logo: s.stream_icon,
          category: 'live' as const,
        }));
      setPlaylist(channels);
      const ch = channels.find(c => c.id === `live-${stream.stream_id}`);
      if (ch) {
        setCurrentChannel(ch.id);
        onPlay(ch);
        // Track theme affinity
        const catId = stream.category_id;
        const themeId = smartThemeOrder.find(t => t.categoryIds.includes(catId))?.id;
        if (themeId) recordThemeWatch(themeId);
      }
    },
    [credentials, onPlay, freeUrlMap, smartThemeOrder]
  );

  return (
    <div className="pt-16 pb-32 min-h-screen">
      {/* ── Search bar ───────────────────────────────────────────── */}
      <div className="sticky top-14 z-20 py-4 px-4 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'searchChannels')}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-colors"
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
        {isSearching && (
          <p className="text-xs text-text-secondary mt-2">
            {searchLoading ? t(lang, 'searching') : `${searchResults.length} ${searchResults.length !== 1 ? t(lang, 'channelsFound') : t(lang, 'channelFound')}`}
          </p>
        )}
      </div>

      {/* ── Stale probe warning ────────────────────────────────── */}
      {probeStale && !themesLoading && (
        <div className="flex items-center gap-1.5 px-4 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
          <span className="text-xs text-white/25">{t(lang, 'channelDataUpdating')}</span>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {isSearching ? (
        /* Search results */
        searchLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="lg" text={t(lang, 'searching')} />
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-text-muted text-sm">
            {t(lang, 'noChannelsMatch')}
          </div>
        ) : (
          <SearchGrid streams={searchResults} credentials={credentials} onPlay={onPlay} freeUrlMap={freeUrlMap} />
        )
      ) : (
        <>
          {/* ── Theme Rows (Discover) ──────────────────────────── */}
          {themesLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" text={t(lang, 'loadingChannels')} />
            </div>
          ) : (
            <div className="pt-4">
              {smartThemeOrder.map((theme) => (
                <ThemeRow
                  key={theme.id}
                  theme={theme}
                  streams={themeStreams[theme.id] || []}
                  credentials={credentials}
                  onPlay={handlePlayFromList}
                  onThemeSelect={(themeId) => {
                    setAmbientExperience(themeId);
                    setAmbientSpeed(0.85);
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Browse All Categories ─────────────────────────── */}
          <div className="px-4 mt-4">
            <button
              onClick={() => setShowBrowse(!showBrowse)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors duration-300 ${
                showBrowse
                  ? 'bg-primary/10 border-primary/25 text-white'
                  : 'bg-white/[0.03] border-white/8 text-text-secondary hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm font-medium">{t(lang, 'browseAllCategories')}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showBrowse ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showBrowse && (
            <div className="mt-4">
              {/* Experience pills */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
                {BROWSE_EXPERIENCES.map((exp) => (
                  <CategoryPill
                    key={exp.id}
                    label={exp.name}
                    active={activeExperience === exp.id}
                    onClick={() => setActiveExperience(exp.id)}
                  />
                ))}
              </div>

              {/* Browse grid */}
              {browseLoading ? (
                <div className="flex items-center justify-center py-24">
                  <LoadingSpinner size="md" text={t(lang, 'loading')} />
                </div>
              ) : browseError ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <p className="text-text-muted text-sm">{t(lang, 'unableToLoad')}</p>
                  <button
                    onClick={() => setBrowseError(false)}
                    className="px-4 py-2 bg-primary rounded-xl text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    {t(lang, 'retry')}
                  </button>
                </div>
              ) : browseStreams.length === 0 ? (
                <div className="flex items-center justify-center py-24 text-text-muted text-sm">
                  {t(lang, 'noChannelsInCategory')}
                </div>
              ) : (
                <BrowseGrid
                  streams={browseStreams}
                  credentials={credentials}
                  onPlay={handlePlayFromList}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────

function dedupeStreams(streams: LiveStream[]): LiveStream[] {
  const seen = new Set<number>();
  return streams.filter((s) => {
    if (seen.has(s.stream_id)) return false;
    seen.add(s.stream_id);
    return true;
  });
}

// ── Theme Row ─────────────────────────────────────────────────────

function ThemeRow({
  theme,
  streams,
  credentials,
  onPlay,
  onThemeSelect,
}: {
  theme: LiveTheme;
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (stream: LiveStream, allStreams: LiveStream[]) => void;
  onThemeSelect?: (themeId: string) => void;
}) {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<string>('all');

  const alive = streams.filter((s) => !isDead(`live-${s.stream_id}`) && isChannelProbeAlive(s.stream_id));
  if (alive.length === 0) return null;

  // Get sub-tabs for this theme (if any)
  const subtypes = THEME_SUBTYPES[theme.id] || [];

  // Apply sub-tab filter
  let filtered = alive;
  if (subtypes.length > 0 && activeSubTab !== 'all') {
    const subtype = subtypes.find(t => t.id === activeSubTab);
    if (subtype) {
      const catSet = new Set(subtype.categoryIds);
      filtered = alive.filter(s => catSet.has(String(s.category_id)));
    }
  }

  // Group quality variants (beIN 1 4K + HD + SD → one card showing best)
  const grouped = groupChannelsByQuality(filtered);
  // Convert back to LiveStream using best quality variant
  const deduped = grouped.map(g => {
    const best = g.variants.reduce((a, b) => {
      const order: Record<string, number> = { '4k': 4, 'fhd': 3, 'hd': 2, 'sd': 1, 'unknown': 0 };
      return (order[b.quality] || 0) > (order[a.quality] || 0) ? b : a;
    });
    return filtered.find(s => s.stream_id === best.streamId) || filtered[0];
  }).filter(Boolean);
  const sorted = sortGemsFirst(deduped);
  const displayed = expanded ? sorted : sorted.slice(0, 25);

  return (
    <div className="mb-8">
      {/* Theme header */}
      <div className="flex items-center gap-2 px-4 mb-3">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
          {({
            sports: <Trophy className="w-3.5 h-3.5 text-white/80" />,
            entertainment: <Sparkles className="w-3.5 h-3.5 text-white/80" />,
            news: <Radio className="w-3.5 h-3.5 text-white/80" />,
            kids: <Baby className="w-3.5 h-3.5 text-white/80" />,
            movies247: <Film className="w-3.5 h-3.5 text-white/80" />,
            music: <Music className="w-3.5 h-3.5 text-white/80" />,
            documentary: <Globe className="w-3.5 h-3.5 text-white/80" />,
            premium4k: <Sparkles className="w-3.5 h-3.5 text-white/80" />,
            faith: <Heart className="w-3.5 h-3.5 text-white/80" />,
          } as Record<string, React.ReactNode>)[theme.id] || <Sparkles className="w-3.5 h-3.5 text-white/80" />}
        </div>
        <h2 className="text-[15px] font-bold text-white">{theme.name}</h2>
        <span className="text-[11px] text-text-muted">{sorted.length}</span>
        <button
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            if (next) onThemeSelect?.(theme.id);
          }}
          className="ml-auto flex items-center gap-0.5 text-xs text-primary-light hover:text-white transition-colors"
        >
          {expanded ? t(lang, 'seeLess') : t(lang, 'seeAll')}
          <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Child experience sub-tabs */}
      {subtypes.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 mb-3">
          {subtypes.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id)}
              className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full transition-colors duration-300 ${
                activeSubTab === sub.id
                  ? `bg-gradient-to-r ${theme.gradient} text-white border border-white/20`
                  : 'bg-white/5 text-white/50 border border-transparent hover:text-white/80'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Horizontal scroll of channels */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {displayed.map((stream) => (
          <button
            key={stream.stream_id}
            onClick={() => onPlay(stream, sorted)}
            className="flex-shrink-0 w-[88px] group"
          >
            <div className="relative w-[88px] h-[60px] rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center overflow-hidden
                            group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:scale-[1.03]
                            active:scale-95 transition-colors duration-300">
              <ChannelIcon src={stream.stream_icon} name={stream.name} size="sm" />
              {/* Play hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
                <Play className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-[10px] text-text-secondary text-center mt-1.5 truncate px-0.5
                          group-hover:text-white transition-colors">
              {stream.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Browse Grid (with quality grouping + probing) ─────────────────

const QUALITY_COLORS: Record<string, string> = {
  'SD': 'bg-white/10 text-white/40',
  'HD': 'bg-blue-500/20 text-blue-400',
  'FHD': 'bg-emerald-500/20 text-emerald-400',
  '4K': 'bg-amber-500/20 text-amber-400',
  'UHD': 'bg-purple-500/20 text-purple-400',
};

function BrowseGrid({
  streams,
  credentials,
  onPlay,
}: {
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (stream: LiveStream, allStreams: LiveStream[]) => void;
}) {
  const { lang } = useLanguage();
  const [selectedGroup, setSelectedGroup] = useState<GroupedChannel | null>(null);
  const [, setProbeVersion] = useState(0);

  // Background probe (throttled to every 30 min)
  useEffect(() => {
    if (streams.length === 0) return;
    const PROBE_INTERVAL_MS = 30 * 60 * 1000;
    const lastProbe = Number(localStorage.getItem('tivi_last_probe') || '0');
    if (Date.now() - lastProbe < PROBE_INTERVAL_MS) return;
    localStorage.setItem('tivi_last_probe', String(Date.now()));
    probeChannels(credentials, streams.map(s => s.stream_id)).then((results) => {
      if (Object.keys(results).length > 0) setProbeVersion(v => v + 1);
    });
  }, [streams, credentials]);

  const alive = streams.filter(s => !isDead(`live-${s.stream_id}`) && isChannelProbeAlive(s.stream_id));
  const sorted = sortGemsFirst(alive);
  const grouped = groupChannelsByQuality(sorted);

  const playVariant = (streamId: number, name: string, icon: string) => {
    setSelectedGroup(null);
    const stream = streams.find(s => s.stream_id === streamId);
    if (stream) onPlay(stream, sorted);
  };

  const handleTap = (group: GroupedChannel) => {
    if (group.variants.length === 1) {
      const v = group.variants[0];
      playVariant(v.streamId, v.name, v.icon);
    } else {
      setSelectedGroup(group);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {grouped.map((group) => (
          <button
            key={group.name}
            onClick={() => handleTap(group)}
            className="group relative bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-white/10 hover:border-primary/30 transition-colors duration-300"
          >
            <ChannelIcon src={group.icon} name={group.name} size="md" />
            <p className="text-xs text-text-secondary text-center truncate w-full group-hover:text-white transition-colors">
              {group.name}
            </p>
            {group.variants.length > 1 ? (
              <div className="flex gap-1">
                {group.variants.map((v) => (
                  <span key={v.quality} className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${QUALITY_COLORS[v.quality] || QUALITY_COLORS.HD}`}>
                    {v.quality}
                  </span>
                ))}
              </div>
            ) : (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${QUALITY_COLORS[group.bestQuality] || QUALITY_COLORS.HD}`}>
                {group.bestQuality}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quality picker modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedGroup(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <ChannelIcon src={selectedGroup.icon} name={selectedGroup.name} size="md" />
              <div>
                <h3 className="font-semibold text-white">{selectedGroup.name}</h3>
                <p className="text-xs text-white/40">{t(lang, 'selectQuality')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {selectedGroup.variants
                .sort((a, b) => (QUALITY_COLORS[b.quality] ? 1 : 0) - (QUALITY_COLORS[a.quality] ? 1 : 0))
                .map((v) => (
                <button
                  key={v.streamId}
                  onClick={() => playVariant(v.streamId, v.name, v.icon)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 transition-colors"
                >
                  <span className="text-sm text-white">{v.quality}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${QUALITY_COLORS[v.quality] || QUALITY_COLORS.HD}`}>
                    {v.quality === 'UHD' ? 'Best' : v.quality === '4K' ? 'High' : v.quality === 'HD' ? 'Standard' : v.quality}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Search Grid (simple, no quality grouping) ─────────────────────

function SearchGrid({ streams, credentials, onPlay, freeUrlMap }: {
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
  freeUrlMap: Record<number, string>;
}) {
  const alive = streams.filter(s => isChannelProbeAlive(s.stream_id));

  const handlePlay = useCallback(
    (stream: LiveStream) => {
      // Build playlist from alive search results
      const channels = alive.map(s => ({
        id: `live-${s.stream_id}`,
        name: s.name,
        url: isFreeChannel(s.stream_id)
          ? freeUrlMap[s.stream_id] || ''
          : buildLiveUrl(credentials, s.stream_id),
        logo: s.stream_icon,
        category: 'live' as const,
      }));
      setPlaylist(channels);
      const ch = channels.find(c => c.id === `live-${stream.stream_id}`);
      if (ch) {
        setCurrentChannel(ch.id);
        onPlay(ch);
      }
    },
    [alive, credentials, onPlay, freeUrlMap]
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
      {alive.slice(0, 100).map((stream) => (
        <button
          key={stream.stream_id}
          onClick={() => handlePlay(stream)}
          className="group relative bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-white/10 hover:border-primary/30 transition-colors duration-300"
        >
          <ChannelIcon src={stream.stream_icon} name={stream.name} size="md" />
          <p className="text-xs text-text-secondary text-center truncate w-full group-hover:text-white transition-colors">
            {stream.name}
          </p>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Category Pill ─────────────────────────────────────────────────

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
        active
          ? 'bg-primary text-white shadow-lg shadow-primary/20'
          : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white border border-white/10'
      }`}
    >
      {label}
    </button>
  );
}
