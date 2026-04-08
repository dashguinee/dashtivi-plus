import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Search, X, ChevronRight, LayoutGrid, Trophy, Sparkles, Radio, Baby, Film, Music, Globe, Heart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NeonGate, cardScaleStyle } from '@/components/ui/NeonGate';
import { t, useLanguage } from '@/i18n';
import type { XtreamCredentials, LiveStream, GroupedChannel, FreeChannel } from '@/lib/xtream';
import { getLiveStreams, buildLiveUrl, groupChannelsByQuality, fetchVpsHealth, isCategoryDead, probeChannels, isChannelProbeAlive, sortGemsFirst, fetchServerProbeData, seedProbeCacheFromServer, fetchVerifiedData, seedVerifiedSet, getExperienceIds, getExperienceCategoryIds, fetchCuratorData, getCuratorExperience, curatorToLiveStreams, hasCuratorData, getFreeChannels, freeToLiveStream, buildFreeUrlMap, isFreeChannel } from '@/lib/xtream';
import {
  LIVETV_THEMES, SPORT_TYPES, ENTERTAINMENT_TYPES, KIDS_TYPES,
  CINEMA_TYPES, MUSIC_TYPES, DISCOVERY_TYPES, FAITH_TYPES, PREMIUM4K_TYPES,
  NEWS_TYPES, BROWSE_EXPERIENCES, DEAD_CATEGORY_IDS,
} from '@/lib/collections';
import type { LiveTheme, SportType, BrowseExperience } from '@/lib/collections';
import { getSmartThemeOrder, recordThemeWatch } from '@/lib/intelligence';
import { useSmartSticky } from '@/hooks/useSmartSticky';

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
  'news': NEWS_TYPES,
};
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed, setAmbientExperience } from '@/lib/ambient-audio';
import { ChannelIcon, ChannelBadge } from '@/components/ui/ChannelIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { isDead } from '@/hooks/useChannelHealth';
import type { Channel } from '@/types';


// Map theme IDs → classified experience IDs (name-based, per-channel)
// This supplements category-based loading with cross-category channels
const THEME_TO_CLASSIFIED: Record<string, string> = {
  'sports': 'sports',
  'entertainment': 'entertainment',
  'news': 'news',
  'kids': 'kids',
  'movies247': 'movies',
  'faith': 'faith',
  'music': 'music',
  'documentary': 'documentary',
  'premium4k': 'sports',  // 4K sports channels
};

// Map theme IDs to free channel experience tags
const THEME_TO_EXPERIENCE: Record<string, string[]> = {
  'sports': ['sports'],
  'news': ['news'],
  'entertainment': ['entertainment', 'african', 'indian', 'arabic', 'french'],
  'kids': ['kids'],
  'movies247': ['movies'],
  'documentary': ['documentary'],
  'music': ['music'],
  'faith': ['faith'],
  'premium4k': ['sports', 'movies', 'documentary'],
};

// Category filter options for search — maps to curator experience IDs
const SEARCH_CATEGORY_OPTIONS = [
  { id: 'sports',        label: 'Sports',        emoji: '\u26BD' },
  { id: 'entertainment', label: 'Entertainment', emoji: '\uD83C\uDFAD' },
  { id: 'news',          label: 'News',          emoji: '\uD83D\uDCF0' },
  { id: 'kids',          label: 'Kids',          emoji: '\uD83E\uDDF8' },
  { id: 'movies',        label: 'Cinema',        emoji: '\uD83C\uDFAC' },
  { id: 'music',         label: 'Music',         emoji: '\uD83C\uDFB5' },
  { id: 'documentary',   label: 'Discovery',     emoji: '\uD83C\uDF0D' },
  { id: 'faith',         label: 'Faith',         emoji: '\u2728' },
] as const;

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const LiveTVPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();


  // ── Search state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LiveStream[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchExpFilter, setSearchExpFilter] = useState<string[]>([]);
  const [searchExpMap, setSearchExpMap] = useState<Record<number, string[]>>({});
  // Persistent category filter — visible always in search bar area
  const [searchCategory, setSearchCategory] = useState<string | null>(null);

  // ── Smart sticky — hides search on sustained scroll, peeks back after idle ──
  const { stickyHidden, headerVisible } = useSmartSticky();

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
  const [browseRetryKey, setBrowseRetryKey] = useState(0);

  const isSearching = debouncedQuery.trim().length > 0 || searchCategory !== null;

  // ── Debounce search ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Search across all channels (curator-first + free) ──────────
  // Triggers on text query change OR category filter change
  useEffect(() => {
    const hasText = debouncedQuery.trim().length > 0;
    const hasCat = searchCategory !== null;
    if (!hasText && !hasCat) { setSearchResults([]); setSearchExpFilter([]); setSearchExpMap({}); return; }
    let mounted = true;
    async function search() {
      setSearchLoading(true);
      try {
        // Ensure curator data is loaded
        const curatorResult = await fetchCuratorData();
        const freeAll = await getFreeChannels();
        const q = hasText ? debouncedQuery.toLowerCase() : '';

        // Search ALL curator experiences (already verified + alive)
        // Build experience map: channel id -> experience ids it belongs to
        const seen = new Set<number>();
        const allCuratorChannels: LiveStream[] = [];
        const expMap: Record<number, string[]> = {};
        if (curatorResult?.experiences) {
          for (const [expId, channels] of Object.entries(curatorResult.experiences)) {
            if (Array.isArray(channels)) {
              for (const ch of channels) {
                if (!expMap[ch.id]) expMap[ch.id] = [];
                if (!expMap[ch.id].includes(expId)) expMap[ch.id].push(expId);
                if (!seen.has(ch.id)) {
                  seen.add(ch.id);
                  allCuratorChannels.push(...curatorToLiveStreams([ch]));
                }
              }
            }
          }
        }

        // Apply category filter first (if active), then text filter
        let curatorPool = allCuratorChannels;
        if (hasCat) {
          curatorPool = curatorPool.filter(s => {
            const exps = expMap[s.stream_id];
            return exps && exps.includes(searchCategory!);
          });
        }

        const curatorResults = hasText
          ? curatorPool.filter(s => s.name.toLowerCase().includes(q))
          : curatorPool;

        // Free channels — filter by category experience tag, then text
        let freePool = freeAll;
        if (hasCat) {
          freePool = freePool.filter(ch => ch.experience === searchCategory);
        }
        const freeResults = hasText
          ? freePool.filter(ch => ch.name.toLowerCase().includes(q))
          : freePool;
        const freeAsLive = freeResults.map(freeToLiveStream);
        if (freeResults.length > 0) {
          setFreeUrlMap(prev => ({ ...prev, ...buildFreeUrlMap(freeResults) }));
        }

        // Add free channels to expMap so they show in experience filters
        for (const f of freeAsLive) {
          if (!expMap[f.stream_id]) expMap[f.stream_id] = [];
          if (!expMap[f.stream_id].includes('free')) expMap[f.stream_id].push('free');
        }

        // Merge: curator + free (no duplicates)
        const freeIds = new Set(freeAsLive.map(s => s.stream_id));
        const merged = [...curatorResults.filter(s => !freeIds.has(s.stream_id)), ...freeAsLive];
        console.info('[SEARCH] q="%s" cat=%s -> %d results (curator:%d free:%d)', q || '(none)', searchCategory || 'all', merged.length, curatorResults.length, freeAsLive.length);
        if (mounted) {
          setSearchResults(sortGemsFirst(merged));
          setSearchExpMap(expMap);
          setSearchExpFilter([]); // Reset sub-filter on new search
        }
      } catch (err) {
        console.error('[SEARCH] Failed:', err);
        if (mounted) setSearchResults([]);
      } finally {
        if (mounted) setSearchLoading(false);
      }
    }
    search();
    return () => { mounted = false; };
  }, [debouncedQuery, searchCategory, credentials]);

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
        // Try curator data first (Supabase-backed, full metadata, no category fetching)
        const curatorResult = await fetchCuratorData();

        if (curatorResult) {
          // CURATOR PATH: Database-backed, clean, no category loading needed
          // verbose: '[LIVE] Using curator data'

          const freeChannelsPromise = getFreeChannels();
          const map: Record<string, LiveStream[]> = {};
          const urlMap: Record<number, string> = {};

          for (const theme of LIVETV_THEMES) {
            const classifiedExp = THEME_TO_CLASSIFIED[theme.id];
            if (!classifiedExp) {
              console.warn('[LIVE] Theme "%s" has no THEME_TO_CLASSIFIED mapping', theme.id);
            }
            const curatorChannels = classifiedExp ? getCuratorExperience(classifiedExp) : null;

            let streams: LiveStream[] = [];
            if (curatorChannels && curatorChannels.length > 0) {
              streams = curatorToLiveStreams(curatorChannels);
              // verbose: '[LIVE] Theme curator channels'
            } else {
              console.warn('[LIVE] Theme %s: curator returned %s for "%s"', theme.id, curatorChannels === null ? 'null' : '0 channels', classifiedExp);
            }

            // Merge free channels
            const experiences = THEME_TO_EXPERIENCE[theme.id];
            if (experiences) {
              const allFree = await freeChannelsPromise;
              const freeStreams = allFree.filter(ch => experiences.includes(ch.experience));
              const freeAsLive = freeStreams.map(freeToLiveStream);
              streams = [...streams, ...freeAsLive];
              Object.assign(urlMap, buildFreeUrlMap(freeStreams));
            }

            map[theme.id] = streams;
          }

          // Summary — always log so Dash can see in devtools
          const total = Object.values(map).reduce((s, arr) => s + arr.length, 0);
          const empty = Object.entries(map).filter(([, v]) => v.length === 0).map(([k]) => k);
          console.info('[LIVE] Loaded %d streams across %d themes%s', total, Object.keys(map).length, empty.length ? ' | EMPTY: ' + empty.join(', ') : '');

          if (!mounted) return;
          setThemeStreams(map);
          setFreeUrlMap(prev => ({ ...prev, ...urlMap }));
          setThemesLoading(false);
          return;
        }

        // FALLBACK: Legacy category-based loading (if curator unavailable)

        const [healthData, verifiedData, probeData] = await Promise.all([
          fetchVpsHealth(),
          fetchVerifiedData(),
          fetchServerProbeData(),
        ]);
        if (verifiedData) {
          seedVerifiedSet(verifiedData);
          const STALE_MS = 48 * 60 * 60 * 1000;
          const vTs = verifiedData.ts ? new Date(verifiedData.ts).getTime() : 0;
          if (!vTs || Date.now() - vTs > STALE_MS) setProbeStale(true);
        } else if (probeData) {
          seedProbeCacheFromServer(probeData);
          const STALE_MS = 48 * 60 * 60 * 1000;
          const probeTs = probeData.ts ? new Date(probeData.ts).getTime() : 0;
          if (!probeTs || Date.now() - probeTs > STALE_MS) setProbeStale(true);
        } else {
          setProbeStale(true);
        }

        // Load free channels in parallel with Xtream themes
        const freeChannelsPromise = getFreeChannels();

        // Build stream lookup from all theme category loads (shared across themes)
        const streamById = new Map<number, LiveStream>();

        const results = await Promise.allSettled(
          LIVETV_THEMES.map(async (theme) => {
            const activeCats = theme.categoryIds.filter(id => !isCategoryDead(healthData, id));
            const cats = activeCats.length > 0 ? activeCats : theme.categoryIds;
            const streams = await Promise.allSettled(
              cats.map(id => getLiveStreams(credentials, id).catch(() => [] as LiveStream[]))
            );
            const xtreamStreams = dedupeStreams(streams.flatMap(r => r.status === 'fulfilled' ? r.value : []));

            // Add to shared lookup
            for (const s of xtreamStreams) streamById.set(s.stream_id, s);

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

        // --- Phase 2: Fetch extra categories for classified channel reach ---
        // Find categories NOT already loaded by any theme that contain classified channels.
        // Capped at 20 extra fetches to keep load time reasonable.
        const allLoadedCats = new Set<string>();
        for (const theme of LIVETV_THEMES) {
          for (const cid of theme.categoryIds) allLoadedCats.add(cid);
        }

        // Collect extra categories needed across all experiences, ranked by demand
        const extraCatDemand = new Map<string, number>(); // catId -> number of themes that need it
        for (const theme of LIVETV_THEMES) {
          const classifiedExp = THEME_TO_CLASSIFIED[theme.id];
          if (!classifiedExp) continue;
          const expCatIds = getExperienceCategoryIds(classifiedExp);
          if (!expCatIds) continue;
          for (const cid of expCatIds) {
            if (!allLoadedCats.has(cid) && !isCategoryDead(healthData, cid)) {
              extraCatDemand.set(cid, (extraCatDemand.get(cid) || 0) + 1);
            }
          }
        }

        // Fetch top 20 most-demanded extra categories
        const MAX_EXTRA = 20;
        const extraCatsToFetch = [...extraCatDemand.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAX_EXTRA)
          .map(([cid]) => cid);

        if (extraCatsToFetch.length > 0 && mounted) {
          const extraResults = await Promise.allSettled(
            extraCatsToFetch.map(id => getLiveStreams(credentials, id).catch(() => [] as LiveStream[]))
          );
          for (const r of extraResults) {
            if (r.status === 'fulfilled') {
              for (const s of r.value) streamById.set(s.stream_id, s);
            }
          }
        }

        // --- Phase 3: Supplement themes with classified per-channel mapping ---
        // Uses streamById built from all category loads + extra fetches above
        for (const theme of LIVETV_THEMES) {
          const classifiedExp = THEME_TO_CLASSIFIED[theme.id];
          if (!classifiedExp || !map[theme.id]) continue;
          const expIds = getExperienceIds(classifiedExp);
          if (!expIds) continue;
          const existingIds = new Set(map[theme.id].map(s => s.stream_id));
          const supplemental: LiveStream[] = [];
          for (const sid of expIds) {
            if (!existingIds.has(sid) && streamById.has(sid)) {
              supplemental.push(streamById.get(sid)!);
            }
          }
          if (supplemental.length > 0) {
            map[theme.id] = [...map[theme.id], ...supplemental];
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
    let mounted = true;
    async function load() {
      setBrowseLoading(true);
      setBrowseError(false);
      try {
        // CURATOR PATH — use database-curated channels when available
        if (hasCuratorData()) {
          const curatorChannels = getCuratorExperience(activeExperience);
          if (curatorChannels) {
            if (mounted) setBrowseStreams(curatorToLiveStreams(curatorChannels));
            if (mounted) setBrowseLoading(false);
            return;
          }
        }
        // FALLBACK — category-based loading from Xtream API
        const exp = BROWSE_EXPERIENCES.find(e => e.id === activeExperience);
        if (!exp) { if (mounted) setBrowseLoading(false); return; }
        const promises = exp.categoryIds
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
  }, [showBrowse, activeExperience, credentials, browseRetryKey]);

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
      {/* ── Search bar — frosted glass, smart sticky ── */}
      <div
        className="sticky z-20 py-4"
        style={{
          top: headerVisible ? '3.5rem' : '0px',
          background: headerVisible ? 'rgba(10,10,10,0.92)' : 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: headerVisible ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
          padding: headerVisible ? '1rem 1rem' : '0.75rem 1.5rem',
          opacity: stickyHidden ? 0.07 : 1,
          transform: stickyHidden ? 'translateY(0)' : 'translateY(0)',
          transition: 'top 0.5s ease-out, background 0.6s ease-out, border-color 0.6s ease-out, padding 0.5s ease-out, opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: stickyHidden ? 'none' : 'auto',
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'searchChannels')}
            className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none transition-all duration-500 ${
              headerVisible
                ? 'bg-white/5 border border-white/10 focus:border-primary/50 focus:bg-white/[0.07]'
                : 'bg-white/[0.06] border border-white/[0.08] shadow-[0_0_15px_rgba(201,240,60,0.04)] focus:border-primary/30 focus:bg-white/[0.08]'
            }`}
            style={!headerVisible ? {
              backgroundImage: 'linear-gradient(135deg, rgba(201,240,60,0.03) 0%, transparent 40%, transparent 60%, rgba(201,240,60,0.02) 100%)',
            } : undefined}
          />
          {(searchQuery || searchCategory) && (
            <button
              onClick={() => { setSearchQuery(''); setSearchCategory(null); searchInputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-3 h-3 text-text-secondary" />
            </button>
          )}
        </div>
        {/* ── Category filter pills ──────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 -mx-1 px-1 pb-1">
          {SEARCH_CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSearchCategory(searchCategory === opt.id ? null : opt.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                searchCategory === opt.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                  : 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
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
          <EmptyState icon="tv" title={t(lang, 'noChannelsMatch')} subtitle="Try a different search" />
        ) : (
          <SearchResultsWithFilter
            streams={searchResults}
            credentials={credentials}
            onPlay={onPlay}
            freeUrlMap={freeUrlMap}
            expMap={searchExpMap}
            activeFilter={searchExpFilter}
            onFilterChange={setSearchExpFilter}
          />
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
              {smartThemeOrder.map((theme, idx) => {
                // Skip ThemeRow if this theme has a showcase card (no double headers)
                const hasShowcase = !!SHOWCASE_CONFIG[theme.id];
                return (
                <React.Fragment key={theme.id}>
                  {!hasShowcase && (
                    <ThemeRow
                      theme={theme}
                      streams={themeStreams[theme.id] || []}
                      credentials={credentials}
                      onPlay={handlePlayFromList}
                      onThemeSelect={(themeId) => {
                        setAmbientExperience(themeId);
                        setAmbientSpeed(0.85);
                      }}
                    />
                  )}
                  {/* Experience Showcase — mapped by theme ID */}
                  {SHOWCASE_CONFIG[theme.id] && (
                    <ExperienceShowcase
                      experienceId={theme.id}
                      streams={themeStreams[theme.id] || []}
                      onPlay={handlePlayFromList}
                      subtypes={THEME_SUBTYPES[theme.id]}
                    />
                  )}
                </React.Fragment>
                );
              })}
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
                    onClick={() => { setBrowseError(false); setBrowseRetryKey(k => k + 1); }}
                    className="group px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(157,78,221,0.15) 0%, rgba(157,78,221,0.06) 100%)',
                      border: '1px solid rgba(157,78,221,0.25)',
                      color: 'rgba(157,78,221,0.85)',
                    }}
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

// ── Experience Showcase — visual break between theme rows ─────────

const SHOWCASE_CONFIG: Record<string, {
  name: string;
  tagline: string;
  route: string;
  gradient: string;
  accentColor: string;
  accentGlow: string;
  icon: React.ReactNode;
}> = {
  sports: {
    name: 'Sports',
    tagline: '',
    route: '/live/sports',
    gradient: 'from-cyan-900/50 via-cyan-900/20 to-transparent',
    accentColor: '#00D4FF',
    accentGlow: 'rgba(0,212,255,0.25)',
    icon: <Trophy className="w-5 h-5" />,
  },
  kids: {
    name: 'Kids & Family',
    tagline: '',
    route: '/live/kids',
    gradient: 'from-pink-900/50 via-pink-900/20 to-transparent',
    accentColor: '#EC4899',
    accentGlow: 'rgba(236,72,153,0.25)',
    icon: <Baby className="w-5 h-5" />,
  },
  entertainment: {
    name: 'Entertainment',
    tagline: '',
    route: '/live/entertainment',
    gradient: 'from-indigo-900/50 via-indigo-900/20 to-transparent',
    accentColor: '#818CF8',
    accentGlow: 'rgba(129,140,248,0.25)',
    icon: <Sparkles className="w-5 h-5" />,
  },
  news: {
    name: 'News',
    tagline: '',
    route: '/live/news',
    gradient: 'from-red-900/50 via-red-900/20 to-transparent',
    accentColor: '#EF4444',
    accentGlow: 'rgba(239,68,68,0.25)',
    icon: <Radio className="w-5 h-5" />,
  },
  music: {
    name: 'Music & Vibes',
    tagline: '',
    route: '/live/music',
    gradient: 'from-violet-900/50 via-violet-900/20 to-transparent',
    accentColor: '#A855F7',
    accentGlow: 'rgba(168,85,247,0.25)',
    icon: <Music className="w-5 h-5" />,
  },
  documentary: {
    name: 'Docs & Discovery',
    tagline: '',
    route: '/live/documentary',
    gradient: 'from-blue-900/50 via-blue-900/20 to-transparent',
    accentColor: '#6366F1',
    accentGlow: 'rgba(99,102,241,0.25)',
    icon: <Globe className="w-5 h-5" />,
  },
  movies: {
    name: 'Cinema',
    tagline: '',
    route: '/live/movies',
    gradient: 'from-amber-900/50 via-amber-900/20 to-transparent',
    accentColor: '#F59E0B',
    accentGlow: 'rgba(245,158,11,0.25)',
    icon: <Film className="w-5 h-5" />,
  },
  // Alias: theme ID is movies247 but showcase config key is movies
  movies247: {
    name: 'Cinema',
    tagline: '',
    route: '/live/movies',
    gradient: 'from-amber-900/50 via-amber-900/20 to-transparent',
    accentColor: '#F59E0B',
    accentGlow: 'rgba(245,158,11,0.25)',
    icon: <Film className="w-5 h-5" />,
  },
  faith: {
    name: 'Faith',
    tagline: '',
    route: '/live/faith',
    gradient: 'from-amber-900/40 via-yellow-900/20 to-transparent',
    accentColor: '#D97706',
    accentGlow: 'rgba(217,119,6,0.25)',
    icon: <Heart className="w-5 h-5" />,
  },
  premium4k: {
    name: 'Premium 4K',
    tagline: '',
    route: '/live/premium4k',
    gradient: 'from-yellow-900/40 via-amber-900/20 to-transparent',
    accentColor: '#EAB308',
    accentGlow: 'rgba(234,179,8,0.25)',
    icon: <Sparkles className="w-5 h-5" />,
  },
};

function ExperienceShowcase({
  experienceId,
  streams,
  onPlay,
  subtypes,
}: {
  experienceId: string;
  streams: LiveStream[];
  onPlay: (stream: LiveStream, allStreams: LiveStream[]) => void;
  subtypes?: SportType[];
}) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const config = SHOWCASE_CONFIG[experienceId];
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  if (!config) return null;

  const alive = streams.filter(s => !isDead(`live-${s.stream_id}`) && isChannelProbeAlive(s.stream_id));

  // Filter by subtab if active
  let filtered = alive;
  if (activeSubTab !== 'all' && subtypes) {
    const sub = subtypes.find(s => s.id === activeSubTab);
    if (sub) {
      const catSet = new Set(sub.categoryIds);
      filtered = alive.filter(s => isFreeChannel(s.stream_id) || catSet.has(String(s.category_id)));
    }
  }

  const top = sortGemsFirst(filtered).slice(0, 8);
  if (alive.length === 0) return null;

  return (
    <div className="mx-4 mb-8 rounded-2xl overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {/* Gradient backdrop */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} pointer-events-none`} />

      <div className="relative p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ background: config.accentColor, boxShadow: `0 0 16px ${config.accentGlow}` }}
            >
              {config.icon}
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">{config.name}</h3>
            </div>
          </div>
          <button
            onClick={() => navigate(config.route)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: config.accentColor,
              color: '#fff',
              boxShadow: `0 0 12px ${config.accentGlow}`,
            }}
          >
            Explore
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Subtab pills — only if subtypes exist and more than 2 */}
        {subtypes && subtypes.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3">
            {subtypes.slice(0, 8).map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id === activeSubTab ? 'all' : sub.id)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors duration-200 ${
                  sub.id === activeSubTab
                    ? 'text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/70'
                }`}
                style={sub.id === activeSubTab ? { background: config.accentColor, boxShadow: `0 0 8px ${config.accentGlow}` } : undefined}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Channel strip */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 items-end">
          {top.map((stream, i) => (
            <button
              key={stream.stream_id}
              onClick={() => onPlay(stream, filtered)}
              className="flex-shrink-0 group"
              style={{ width: i === 0 ? 150 : 125, ...cardScaleStyle(i), ...(i < 8 ? { animation: `vee-card-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 90}ms both` } : {}) }}
            >
              <div
                className="relative aspect-[16/10] rounded-xl overflow-hidden transition-all duration-300 group-hover:ring-1 flex items-center justify-center card-glass"
                style={{
                  boxShadow: i === 0 ? `0 0 16px ${config.accentGlow}` : undefined,
                  ['--tw-ring-color' as string]: config.accentColor,
                }}
              >
                <ChannelIcon src={stream.stream_icon} name={stream.name} size="md" eager />
                <ChannelBadge streamId={stream.stream_id} compact />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                  <Play className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[9px] text-white/30 text-center mt-1.5 truncate group-hover:text-white/50 transition-colors">
                {stream.name}
              </p>
            </button>
          ))}
          <NeonGate navigateTo={config.route} />
        </div>

        {/* Channel count footer */}
        <div className="flex items-center justify-center mt-3 gap-1.5">
          <div className="w-1 h-1 rounded-full" style={{ background: config.accentColor, opacity: 0.5 }} />
          <span className="text-[9px] text-white/20">{filtered.length} channels</span>
        </div>
      </div>
    </div>
  );
}

function dedupeStreams(streams: LiveStream[]): LiveStream[] {
  const seen = new Set<number>();
  return streams.filter((s) => {
    if (seen.has(s.stream_id)) return false;
    seen.add(s.stream_id);
    return true;
  });
}

// ── Theme Row ─────────────────────────────────────────────────────

const ThemeRow = React.memo(function ThemeRow({
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

  // Experience page route (if one exists)
  const expRoute = SHOWCASE_CONFIG[theme.id]?.route;
  const navigate = useNavigate();

  return (
    <div className="mb-10">
      {/* Theme header */}
      <div className="flex items-center gap-2.5 px-4 mb-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
          {({
            sports: <Trophy className="w-4 h-4 text-white/80" />,
            entertainment: <Sparkles className="w-4 h-4 text-white/80" />,
            news: <Radio className="w-4 h-4 text-white/80" />,
            kids: <Baby className="w-4 h-4 text-white/80" />,
            movies247: <Film className="w-4 h-4 text-white/80" />,
            music: <Music className="w-4 h-4 text-white/80" />,
            documentary: <Globe className="w-4 h-4 text-white/80" />,
            premium4k: <Sparkles className="w-4 h-4 text-white/80" />,
            faith: <Heart className="w-4 h-4 text-white/80" />,
          } as Record<string, React.ReactNode>)[theme.id] || <Sparkles className="w-4 h-4 text-white/80" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold text-white">{theme.name}</h2>
            <span className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{sorted.length}</span>
          </div>
        </div>
        {expRoute ? (
          <button
            onClick={() => navigate(expRoute)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-all active:scale-95"
          >
            Explore
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={() => {
              const next = !expanded;
              setExpanded(next);
              if (next) onThemeSelect?.(theme.id);
            }}
            className="flex items-center gap-0.5 text-xs text-primary-light hover:text-white transition-colors"
          >
            {expanded ? t(lang, 'seeLess') : t(lang, 'seeAll')}
            <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* Child experience sub-tabs */}
      {subtypes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 mb-3">
          {subtypes.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id)}
              className={`flex-shrink-0 text-[11px] px-3 py-2 min-h-[36px] rounded-full transition-all duration-300 flex items-center justify-center ${
                activeSubTab === sub.id
                  ? `bg-gradient-to-r ${theme.gradient} text-white border border-white/20`
                  : 'bg-white/5 text-white/40 border border-transparent hover:text-white/70'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Horizontal scroll of channels — larger cards */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 items-end">
        {displayed.map((stream, i) => (
          <button
            key={stream.stream_id}
            onClick={() => onPlay(stream, sorted)}
            className={`flex-shrink-0 group ${i === 0 ? 'w-[140px]' : 'w-[110px]'}`}
            style={cardScaleStyle(i)}
          >
            <div className={`relative rounded-xl flex items-center justify-center overflow-hidden
                            group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:scale-[1.03]
                            active:scale-95 transition-all duration-300 ${i === 0 ? 'w-[140px] h-[90px] card-hero' : 'w-[110px] h-[72px] card-surface'}`}>
              <ChannelIcon src={stream.stream_icon} name={stream.name} size="sm" />
              <ChannelBadge streamId={stream.stream_id} compact />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
                <Play className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-1.5 truncate px-0.5
                          group-hover:text-white/70 transition-colors">
              {stream.name}
            </p>
          </button>
        ))}
        {expRoute && <NeonGate navigateTo={expRoute} />}
      </div>
    </div>
  );
});

// ── Browse Grid (with quality grouping + probing) ─────────────────

const QUALITY_COLORS: Record<string, string> = {
  'SD': 'bg-white/10 text-white/40',
  'HD': 'bg-blue-500/20 text-blue-400',
  'FHD': 'bg-violet-500/20 text-violet-400',
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
  const BROWSE_PAGE_SIZE = 60;
  const [browseVisibleCount, setBrowseVisibleCount] = useState(BROWSE_PAGE_SIZE);

  // Reset visible count when streams change (new experience selected)
  useEffect(() => { setBrowseVisibleCount(BROWSE_PAGE_SIZE); }, [streams]);

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
        {grouped.slice(0, browseVisibleCount).map((group) => (
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

      {grouped.length > browseVisibleCount && (
        <div className="flex flex-col items-center gap-1 px-4 mt-2 mb-4">
          <button
            onClick={() => setBrowseVisibleCount(prev => prev + BROWSE_PAGE_SIZE)}
            className="group w-full relative overflow-hidden rounded-2xl py-3.5 transition-all duration-300 hover:scale-[1.005] active:scale-[0.995]"
            style={{
              background: 'linear-gradient(135deg, rgba(157,78,221,0.06) 0%, rgba(157,78,221,0.02) 100%)',
              border: '1px solid rgba(157,78,221,0.1)',
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(157,78,221,0.04) 50%, transparent 100%)' }}
            />
            <div className="relative flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium tracking-[0.15em] uppercase" style={{ color: 'rgba(157,78,221,0.55)' }}>
                  {t(lang, 'showMore') || 'Discover more'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:translate-y-0.5 transition-transform duration-300">
                  <path d="M6 2v8M2 6l4 4 4-4" stroke="rgba(157,78,221,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {browseVisibleCount} / {grouped.length}
              </span>
            </div>
          </button>
        </div>
      )}

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

// ── Experience display names for search filter chips ────────────────

const EXP_DISPLAY_NAMES: Record<string, string> = {
  sports: 'Sports',
  entertainment: 'Entertainment',
  news: 'News',
  kids: 'Kids',
  movies: 'Cinema',
  faith: 'Faith',
  music: 'Music',
  documentary: 'Discovery',
  premium4k: '4K',
  african: 'Africa',
  indian: 'India',
  arabic: 'Arabic',
  french: 'French',
};

// ── Search Results with Category Filter ─────────────────────────────

function SearchResultsWithFilter({ streams, credentials, onPlay, freeUrlMap, expMap, activeFilter, onFilterChange }: {
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
  freeUrlMap: Record<number, string>;
  expMap: Record<number, string[]>;
  activeFilter: string[];
  onFilterChange: (filter: string[]) => void;
}) {
  const expCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of streams) {
      const exps = expMap[s.stream_id];
      if (exps) {
        for (const e of exps) {
          counts[e] = (counts[e] || 0) + 1;
        }
      }
    }
    return counts;
  }, [streams, expMap]);

  const availableExps = React.useMemo(() => {
    return Object.entries(expCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [expCounts]);

  const filtered = React.useMemo(() => {
    if (activeFilter.length === 0) return streams;
    return streams.filter(s => {
      const exps = expMap[s.stream_id];
      if (!exps) return false;
      return activeFilter.some(f => exps.includes(f));
    });
  }, [streams, activeFilter, expMap]);

  if (availableExps.length <= 1) {
    return <SearchGrid streams={streams} credentials={credentials} onPlay={onPlay} freeUrlMap={freeUrlMap} />;
  }

  const toggleFilter = (expId: string) => {
    if (activeFilter.includes(expId)) {
      onFilterChange(activeFilter.filter(f => f !== expId));
    } else {
      onFilterChange([...activeFilter, expId]);
    }
  };

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pt-2 pb-1">
        <button
          onClick={() => onFilterChange([])}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
            activeFilter.length === 0
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70'
          }`}
        >
          All ({streams.length})
        </button>
        {availableExps.map(expId => (
          <button
            key={expId}
            onClick={() => toggleFilter(expId)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
              activeFilter.includes(expId)
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {EXP_DISPLAY_NAMES[expId] || expId} ({expCounts[expId]})
          </button>
        ))}
      </div>
      <SearchGrid streams={filtered} credentials={credentials} onPlay={onPlay} freeUrlMap={freeUrlMap} />
    </div>
  );
}

// ── Search Grid (simple, no quality grouping) ─────────────────────

function SearchGrid({ streams, credentials, onPlay, freeUrlMap }: {
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
  freeUrlMap: Record<number, string>;
}) {
  const [limit, setLimit] = useState(60);
  const alive = streams.filter(s => !isDead(`live-${s.stream_id}`) && isChannelProbeAlive(s.stream_id));

  const handlePlay = useCallback(
    (stream: LiveStream) => {
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
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {alive.slice(0, limit).map((stream) => (
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
      {alive.length > limit && (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-[11px] text-white/30">{Math.min(limit, alive.length)} of {alive.length}</p>
          <button
            onClick={() => setLimit(l => l + 60)}
            className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Show more
          </button>
        </div>
      )}
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
