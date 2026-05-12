import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Search, X, ChevronRight, Trophy, Sparkles, Radio, Baby, Film, Music, Globe, Heart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NeonGate, cardScaleStyle } from '@/components/ui/NeonGate';
import { t, useLanguage } from '@/i18n';
import type { XtreamCredentials, LiveStream, GroupedChannel, FreeChannel } from '@/lib/xtream';
import { getLiveStreams, buildLiveUrl, groupChannelsByQuality, fetchVpsHealth, isCategoryDead, probeChannels, isChannelPlayable, sortGemsFirst, fetchServerProbeData, seedProbeCacheFromServer, fetchVerifiedData, seedVerifiedSet, getExperienceIds, getExperienceCategoryIds, fetchCuratorData, getCuratorExperience, curatorToLiveStreams, hasCuratorData, getFreeChannels, freeToLiveStream, buildFreeUrlMap, isFreeChannel } from '@/lib/xtream';
import {
  LIVETV_THEMES, SPORT_TYPES, ENTERTAINMENT_TYPES, KIDS_TYPES,
  CINEMA_TYPES, MUSIC_TYPES, DISCOVERY_TYPES, FAITH_TYPES, PREMIUM4K_TYPES,
  NEWS_TYPES,
} from '@/lib/collections';
import type { LiveTheme, SportType } from '@/lib/collections';
import { getSmartThemeOrder, recordThemeWatch } from '@/lib/intelligence';
import { useSmartSticky } from '@/hooks/useSmartSticky';

// Map theme IDs to their child experience sub-tabs
const THEME_SUBTYPES: Record<string, SportType[]> = {
  'sports': SPORT_TYPES,
  'entertainment': ENTERTAINMENT_TYPES,
  'kids': KIDS_TYPES,
  'movies247': CINEMA_TYPES,
  'music': MUSIC_TYPES,
  'faith': FAITH_TYPES,
  'premium4k': PREMIUM4K_TYPES,
  'news': NEWS_TYPES,
};
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed, setAmbientExperience } from '@/lib/ambient-audio';
import { ChannelIcon, ChannelBadge } from '@/components/ui/ChannelIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

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
  // premium4k falls through to Xtream API — uses real 4K category IDs from collections.ts
};

// Map theme IDs to free channel experience tags
const THEME_TO_EXPERIENCE: Record<string, string[]> = {
  'sports': ['sports'],
  'news': ['news'],
  'entertainment': ['entertainment', 'african', 'indian', 'arabic', 'french'],
  'kids': ['kids'],
  'movies247': ['movies'],
  'music': ['music'],
  'faith': ['faith'],
  'premium4k': ['sports', 'movies'],
};

// Category filter options for search — maps to curator experience IDs
const SEARCH_CATEGORY_OPTIONS = [
  { id: 'sports',        label: 'Sports',        emoji: '\u26BD' },
  { id: 'entertainment', label: 'Entertainment', emoji: '\uD83C\uDFAD' },
  { id: 'news',          label: 'News',          emoji: '\uD83D\uDCF0' },
  { id: 'kids',          label: 'Kids',          emoji: '\uD83E\uDDF8' },
  { id: 'movies',        label: 'Cinema',        emoji: '\uD83C\uDFAC' },
  { id: 'music',         label: 'Music',         emoji: '\uD83C\uDFB5' },
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
  // Browse state removed — replaced by StreamMoreSection

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

  // ── Play handler with playlist context ────────────────────────
  const handlePlayFromList = useCallback(
    (stream: LiveStream, allStreams: LiveStream[]) => {
      const channels = allStreams
        .filter(s => isChannelPlayable(s.stream_id))
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
          opacity: stickyHidden ? 0 : 1,
          transform: stickyHidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: stickyHidden
            ? 'transform 0.35s cubic-bezier(0.4,0,1,1), opacity 0.25s ease-out, top 0.35s cubic-bezier(0.4,0,1,1), background 0.3s, padding 0.3s'
            : 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s cubic-bezier(0.16,1,0.3,1), top 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s, padding 0.3s',
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

          {/* ── WorldEX Portal ──────────────────────────────── */}
          <div className="mx-4 mt-6 mb-2">
            <button
              onClick={() => navigate('/french')}
              className="w-full rounded-2xl overflow-hidden relative group active:scale-[0.98] transition-transform duration-200"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-violet-900/15 to-transparent pointer-events-none" />
              <div className="relative p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #D97706, #7C3AED)', boxShadow: '0 0 16px rgba(217,119,6,0.2)' }}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white tracking-tight">WorldEX</h3>
                    <p className="text-[10px] text-white/25">11 regions — Africa, Arabic, Europe, Asia & more</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </button>
          </div>

          {/* ── Stream More — full channel universe ────────────── */}
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
                <Radio className="w-4 h-4" />
                <div className="text-left">
                  <span className="text-sm font-medium">Stream More</span>
                  <span className="text-[10px] text-white/20 ml-2">Free + Premium</span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showBrowse ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showBrowse && (
            <StreamMoreSection credentials={credentials} onPlay={handlePlayFromList} freeUrlMap={freeUrlMap} setFreeUrlMap={setFreeUrlMap} />
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

  const alive = streams.filter(s => isChannelPlayable(s.stream_id));

  // Filter by subtab if active
  let filtered = alive;
  if (activeSubTab !== 'all' && subtypes) {
    const sub = subtypes.find(s => s.id === activeSubTab);
    if (sub) {
      // Name-based filtering (primary — works with curated channels)
      if (sub.nameFilter?.length || sub.nameExclude?.length) {
        filtered = alive.filter(s => {
          const n = (s.name || '').toLowerCase();
          if (sub.nameExclude?.length && sub.nameExclude.some(k => n.includes(k.toLowerCase()))) return false;
          if (sub.nameFilter?.length && !sub.nameFilter.some(k => n.includes(k.toLowerCase()))) return false;
          return true;
        });
      } else if (sub.categoryIds?.length) {
        // Category-based fallback (Xtream API channels)
        const catSet = new Set(sub.categoryIds);
        filtered = alive.filter(s => isFreeChannel(s.stream_id) || catSet.has(String(s.category_id)));
      }
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

  const alive = streams.filter((s) => isChannelPlayable(s.stream_id));
  if (alive.length === 0) return null;

  // Get sub-tabs for this theme (if any)
  const subtypes = THEME_SUBTYPES[theme.id] || [];

  // Apply sub-tab filter
  let filtered = alive;
  if (subtypes.length > 0 && activeSubTab !== 'all') {
    const subtype = subtypes.find(t => t.id === activeSubTab);
    if (subtype) {
      if (subtype.nameFilter?.length || subtype.nameExclude?.length) {
        filtered = alive.filter(s => {
          const n = (s.name || '').toLowerCase();
          if (subtype.nameExclude?.length && subtype.nameExclude.some(k => n.includes(k.toLowerCase()))) return false;
          if (subtype.nameFilter?.length && !subtype.nameFilter.some(k => n.includes(k.toLowerCase()))) return false;
          return true;
        });
      } else if (subtype.categoryIds?.length) {
        const catSet = new Set(subtype.categoryIds);
        filtered = alive.filter(s => catSet.has(String(s.category_id)));
      }
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

// ── Experience display names for search filter chips ────────────────

const EXP_DISPLAY_NAMES: Record<string, string> = {
  sports: 'Sports',
  entertainment: 'Entertainment',
  news: 'News',
  kids: 'Kids',
  movies: 'Cinema',
  faith: 'Faith',
  music: 'Music',
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
  const alive = streams.filter(s => isChannelPlayable(s.stream_id));

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

// ── Stream More — unified free + Xtream channel grid ─────────────

function StreamMoreSection({
  credentials,
  onPlay,
  freeUrlMap: parentFreeUrlMap,
  setFreeUrlMap: setParentFreeUrlMap,
}: {
  credentials: XtreamCredentials;
  onPlay: (stream: LiveStream, allStreams: LiveStream[]) => void;
  freeUrlMap: Record<number, string>;
  setFreeUrlMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}) {
  const [freeChannels, setFreeChannels] = useState<FreeChannel[]>([]);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'free' | 'premium'>('all');
  const [filterExp, setFilterExp] = useState('all');
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Load free channels on mount — update parent URL map so play handler works
  useEffect(() => {
    getFreeChannels().then(chs => {
      setFreeChannels(chs);
      const urlMap = buildFreeUrlMap(chs);
      setParentFreeUrlMap(prev => ({ ...prev, ...urlMap }));
      setLoading(false);
    });
  }, [setParentFreeUrlMap]);

  // Get all curator channels (Xtream) flattened
  const allXtream = React.useMemo(() => {
    if (!hasCuratorData()) return [];
    const seen = new Set<number>();
    const all: LiveStream[] = [];
    for (const expId of ['sports', 'entertainment', 'news', 'kids', 'movies', 'music', 'faith',
                          'africa', 'americas', 'arabic', 'europe', 'french', 'pakistan', 'south_asian']) {
      const ch = getCuratorExperience(expId);
      if (!ch) continue;
      for (const c of curatorToLiveStreams(ch)) {
        if (!seen.has(c.stream_id)) { seen.add(c.stream_id); all.push(c); }
      }
    }
    return all;
  }, [loading]); // re-compute once free channels load (curator is already cached)

  // Merge free as LiveStream
  const allFree = React.useMemo(() =>
    freeChannels.map(freeToLiveStream)
  , [freeChannels]);

  // Experience options from free channels
  const experienceOptions = React.useMemo(() => {
    const set = new Set(freeChannels.map(c => c.experience));
    return ['all', ...Array.from(set).sort()];
  }, [freeChannels]);

  // Combined + filtered
  const filtered = React.useMemo(() => {
    let pool: LiveStream[] = [];
    if (filterSource === 'free') pool = allFree;
    else if (filterSource === 'premium') pool = allXtream;
    else pool = [...allXtream, ...allFree];

    // Experience filter (only applies to free channels)
    if (filterExp !== 'all') {
      const matchingFreeIds = new Set(
        freeChannels.filter(c => c.experience === filterExp).map(c => freeToLiveStream(c).stream_id)
      );
      pool = pool.filter(s => !isFreeChannel(s.stream_id) || matchingFreeIds.has(s.stream_id));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      pool = pool.filter(s => s.name.toLowerCase().includes(q));
    }

    return pool;
  }, [allXtream, allFree, freeChannels, filterSource, filterExp, search]);

  // Reset pagination on filter change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filterSource, filterExp, search]);

  const handlePlay = React.useCallback((stream: LiveStream) => {
    onPlay(stream, filtered);
  }, [onPlay, filtered]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><LoadingSpinner size="md" text="Loading channels..." /></div>;
  }

  return (
    <div className="mt-4 px-4">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="Search all channels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Source pills */}
      <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide pb-1">
        {(['all', 'premium', 'free'] as const).map(src => (
          <button key={src} onClick={() => setFilterSource(src)}
            className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: filterSource === src ? 'rgba(201,240,60,0.15)' : 'rgba(255,255,255,0.04)',
              color: filterSource === src ? 'rgba(201,240,60,0.9)' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${filterSource === src ? 'rgba(201,240,60,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {src === 'all' ? `All (${allXtream.length + allFree.length})` : src === 'premium' ? `Premium (${allXtream.length})` : `Free (${allFree.length})`}
          </button>
        ))}
      </div>

      {/* Experience pills (when free or all selected) */}
      {filterSource !== 'premium' && (
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
          {experienceOptions.map(exp => (
            <button key={exp} onClick={() => setFilterExp(exp)}
              className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: filterExp === exp ? 'rgba(157,78,221,0.15)' : 'rgba(255,255,255,0.04)',
                color: filterExp === exp ? 'rgba(157,78,221,0.9)' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${filterExp === exp ? 'rgba(157,78,221,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {exp}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-[10px] text-white/15 mb-3 font-mono">{filtered.length} channels</p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.slice(0, visibleCount).map((stream) => {
          const isFree = isFreeChannel(stream.stream_id);
          return (
            <button
              key={stream.stream_id}
              onClick={() => handlePlay(stream)}
              className="group relative rounded-xl overflow-hidden text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  <ChannelIcon src={stream.stream_icon} name={stream.name} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/60 font-medium truncate leading-tight">{stream.name}</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono mt-0.5 inline-block"
                    style={{
                      background: isFree ? 'rgba(201,240,60,0.08)' : 'rgba(157,78,221,0.08)',
                      color: isFree ? 'rgba(201,240,60,0.5)' : 'rgba(157,78,221,0.5)',
                    }}>
                    {isFree ? 'free' : 'premium'}
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                <Play className="w-5 h-5 text-white" fill="white" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Load more */}
      {filtered.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          className="w-full mt-4 py-3 rounded-xl text-[11px] font-medium tracking-wider uppercase transition-all hover:scale-[1.005] active:scale-[0.995]"
          style={{
            background: 'rgba(157,78,221,0.06)',
            border: '1px solid rgba(157,78,221,0.1)',
            color: 'rgba(157,78,221,0.5)',
          }}
        >
          Load more ({visibleCount} / {filtered.length})
        </button>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/20 text-sm">No channels match</p>
        </div>
      )}
    </div>
  );
}
