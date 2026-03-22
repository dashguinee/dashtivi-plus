import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Globe, Headphones, ChevronRight } from 'lucide-react';
import type { XtreamCredentials, LiveStream, FreeChannel } from '@/lib/xtream';
import { getLiveStreams, buildLiveUrl, fetchVpsHealth, isCategoryDead, probeChannels, isChannelProbeAlive, sortByIconQuality, fetchServerProbeData, seedProbeCacheFromServer, getFreeChannelsByCulture, freeToLiveStream, buildFreeUrlMap, isFreeChannel, type VpsHealthData } from '@/lib/xtream';
import { REGION_GENRES } from '@/lib/collections';
import type { RegionGenre } from '@/lib/collections';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isDead } from '@/hooks/useChannelHealth';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import type { Channel } from '@/types';

// ── WorldEX Region Portals ───────────────────────────────────────

interface WorldRegion {
  id: string;
  categoryIds: string[];
  name: string;
  flag: string;
  vibe: string;
  gradient: string;
  glowColor: string;
}

const REGIONS: WorldRegion[] = [
  {
    id: 'africa',
    categoryIds: ['336', '345'],
    name: 'Africa',
    flag: '\uD83C\uDF0D',
    vibe: 'Canal+ \u00B7 DSTV \u00B7 SuperSport',
    gradient: 'from-amber-500 to-orange-700',
    glowColor: 'shadow-amber-500/30',
  },
  {
    id: 'france',
    categoryIds: ['11', '336'],
    name: 'France',
    flag: '\uD83C\uDDEB\uD83C\uDDF7',
    vibe: 'TF1 \u00B7 Canal+ \u00B7 France 2',
    gradient: 'from-blue-500 to-indigo-700',
    glowColor: 'shadow-blue-500/30',
  },
  {
    id: 'uk',
    categoryIds: ['414'],
    name: 'UK',
    flag: '\uD83C\uDDEC\uD83C\uDDE7',
    vibe: 'BBC \u00B7 Sky \u00B7 ITV',
    gradient: 'from-red-500 to-rose-700',
    glowColor: 'shadow-red-500/30',
  },
  {
    id: 'usa',
    categoryIds: ['2'],
    name: 'USA',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    vibe: 'CNN \u00B7 ESPN \u00B7 Fox',
    gradient: 'from-sky-500 to-blue-700',
    glowColor: 'shadow-sky-500/30',
  },
  {
    id: 'arabic',
    categoryIds: ['86', '165', '156'],
    name: 'Arab World',
    flag: '\u2728',
    vibe: 'MBC \u00B7 Al Jazeera \u00B7 beIN',
    gradient: 'from-emerald-500 to-teal-700',
    glowColor: 'shadow-emerald-500/30',
  },
  {
    id: 'india',
    categoryIds: ['247', '9', '7', '732', '729', '5', '18', '730', '356'],
    name: 'India',
    flag: '\uD83C\uDDEE\uD83C\uDDF3',
    vibe: 'Star \u00B7 Zee \u00B7 Sony \u00B7 Cricket',
    gradient: 'from-orange-500 to-red-700',
    glowColor: 'shadow-orange-500/30',
  },
  {
    id: 'pakistan',
    categoryIds: ['98'],
    name: 'Pakistan',
    flag: '\uD83C\uDDF5\uD83C\uDDF0',
    vibe: 'ARY \u00B7 Geo \u00B7 Bol',
    gradient: 'from-green-600 to-emerald-800',
    glowColor: 'shadow-green-500/30',
  },
  {
    id: 'turkey',
    categoryIds: ['25'],
    name: 'Turkey',
    flag: '\uD83C\uDDF9\uD83C\uDDF7',
    vibe: 'TRT \u00B7 beIN \u00B7 Show TV',
    gradient: 'from-red-600 to-rose-800',
    glowColor: 'shadow-red-500/30',
  },
];

// Map region IDs to free channel culture tags
const REGION_TO_CULTURE: Record<string, string> = {
  'africa': 'africa',
  'france': 'france',
  'uk': 'uk',
  'usa': 'usa',
  'arabic': 'arabic',
  'india': 'india',
};

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const FrenchPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const [activeRegion, setActiveRegion] = useState<string>('africa');
  const [activeGenre, setActiveGenre] = useState<string>('all');
  const [regionStreams, setRegionStreams] = useState<Record<string, LiveStream[]>>({});
  const [genreStreams, setGenreStreams] = useState<Record<string, LiveStream[]>>({});
  const [loading, setLoading] = useState(true);
  const [regionLoading, setRegionLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const portalScrollRef = useRef<HTMLDivElement>(null);

  // Free channel URL map (stream_id -> HLS URL)
  const [freeUrlMap, setFreeUrlMap] = useState<Record<number, string>>({});

  // Initial load: fetch first region + health check + free channels
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [healthData, probeData] = await Promise.all([
          fetchVpsHealth(),
          fetchServerProbeData(),
        ]);
        if (probeData) seedProbeCacheFromServer(probeData);
        const first = REGIONS[0];
        const xtreamStreams = await loadRegionStreams(first, healthData, credentials);

        // Merge free channels for this region's culture
        const culture = REGION_TO_CULTURE[first.id];
        let freeChannels: FreeChannel[] = [];
        if (culture) {
          freeChannels = await getFreeChannelsByCulture(culture);
        }
        const freeAsLive = freeChannels.map(freeToLiveStream);
        const merged = [...xtreamStreams, ...freeAsLive];

        if (!mounted) return;
        setRegionStreams({ [first.id]: merged });
        if (freeChannels.length > 0) {
          setFreeUrlMap(prev => ({ ...prev, ...buildFreeUrlMap(freeChannels) }));
        }
      } catch {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [credentials]);

  // Load region streams on demand (Xtream + free merged)
  const switchRegion = useCallback(async (regionId: string) => {
    setActiveRegion(regionId);
    setActiveGenre('all');
    if (regionStreams[regionId]) return; // Already loaded

    setRegionLoading(true);
    try {
      const region = REGIONS.find((r) => r.id === regionId);
      if (!region) return;
      const healthData = await fetchVpsHealth();
      const xtreamStreams = await loadRegionStreams(region, healthData, credentials);

      // Merge free channels for this region's culture
      const culture = REGION_TO_CULTURE[regionId];
      let freeChannels: FreeChannel[] = [];
      if (culture) {
        freeChannels = await getFreeChannelsByCulture(culture);
      }
      const freeAsLive = freeChannels.map(freeToLiveStream);
      const merged = [...xtreamStreams, ...freeAsLive];

      setRegionStreams((prev) => ({ ...prev, [regionId]: merged }));
      if (freeChannels.length > 0) {
        setFreeUrlMap(prev => ({ ...prev, ...buildFreeUrlMap(freeChannels) }));
      }
    } catch {
      // silent
    } finally {
      setRegionLoading(false);
    }
  }, [credentials, regionStreams]);

  // Load genre streams on demand
  const switchGenre = useCallback(async (genreId: string) => {
    setActiveGenre(genreId);
    if (genreId === 'all') return;

    const cacheKey = `${activeRegion}_${genreId}`;
    if (genreStreams[cacheKey]) return; // Already loaded

    const genres = REGION_GENRES[activeRegion] || [];
    const genre = genres.find((g: RegionGenre) => g.id === genreId);
    if (!genre || genre.categoryIds.length === 0) return;

    setGenreLoading(true);
    try {
      const healthData = await fetchVpsHealth();
      const fakeRegion = { id: activeRegion, categoryIds: genre.categoryIds, name: '', flag: '', vibe: '', gradient: '', glowColor: '' };
      const streams = await loadRegionStreams(fakeRegion, healthData, credentials);
      setGenreStreams((prev) => ({ ...prev, [cacheKey]: streams }));
    } catch {
      // silent
    } finally {
      setGenreLoading(false);
    }
  }, [activeRegion, credentials, genreStreams]);

  const active = REGIONS.find((r) => r.id === activeRegion) || REGIONS[0];
  const streams = regionStreams[activeRegion] || [];
  const genres = REGION_GENRES[activeRegion] || [{ id: 'all', name: 'All', categoryIds: [] }];
  const displayStreams = activeGenre === 'all'
    ? streams
    : (genreStreams[`${activeRegion}_${activeGenre}`] || []);
  const sortedStreams = sortByIconQuality(displayStreams);

  const handlePlay = useCallback(
    (stream: LiveStream) => {
      // Set playlist from current region's channels for prev/next navigation
      const regionChannels = displayStreams.filter(s => !isDead(`live-${s.stream_id}`));
      const playlist = regionChannels.map(s => ({
        id: `live-${s.stream_id}`,
        name: s.name,
        url: isFreeChannel(s.stream_id)
          ? freeUrlMap[s.stream_id] || ''
          : buildLiveUrl(credentials, s.stream_id),
        logo: s.stream_icon,
        category: 'live' as const,
      }));
      setPlaylist(playlist);
      const channel = {
        id: `live-${stream.stream_id}`,
        name: stream.name,
        url: isFreeChannel(stream.stream_id)
          ? freeUrlMap[stream.stream_id] || ''
          : buildLiveUrl(credentials, stream.stream_id),
        logo: stream.stream_icon,
        category: 'live' as const,
      };
      setCurrentChannel(channel.id);
      onPlay(channel);
    },
    [credentials, onPlay, displayStreams, freeUrlMap]
  );

  if (loading) {
    return (
      <div className="pt-16 flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Entering WorldEX..." />
      </div>
    );
  }

  return (
    <div className="pt-16 pb-4 min-h-screen">
      {/* ── WorldEX Header ──────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">WorldEX</h1>
            <p className="text-[11px] text-text-secondary tracking-wide">A taste of the world</p>
          </div>
        </div>
      </div>

      {/* ── AmbiLive Teaser ─────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/8 to-primary-dark/10 border border-primary/15 p-4 hover:border-primary/25 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
              <Headphones className="w-5 h-5 text-primary-light" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">AmbiLive</h3>
              <p className="text-[11px] text-text-secondary">Watch English content in French. Coming soon.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-light transition-colors" />
          </div>
        </div>
      </div>

      {/* ── Region Portals (horizontal scroll) ──────────────── */}
      <div ref={portalScrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4">
        {REGIONS.map((region) => {
          const isActive = region.id === activeRegion;
          return (
            <button
              key={region.id}
              onClick={() => switchRegion(region.id)}
              className={`flex-shrink-0 relative overflow-hidden rounded-2xl transition-all duration-300 ${
                isActive
                  ? `w-36 shadow-xl ${region.glowColor} scale-[1.02]`
                  : 'w-28 hover:scale-[1.03] active:scale-[0.97]'
              }`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${region.gradient} ${isActive ? 'opacity-100' : 'opacity-40'} transition-opacity duration-300`} />
              <div className="absolute inset-0 bg-black/20" />

              {/* Content */}
              <div className={`relative p-3 ${isActive ? 'py-4' : 'py-3'} transition-all duration-300`}>
                <span className="text-2xl block mb-1.5">{region.flag}</span>
                <p className={`font-bold text-white text-sm ${isActive ? '' : 'text-xs'} transition-all`}>
                  {region.name}
                </p>
                {isActive && (
                  <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{region.vibe}</p>
                )}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Genre Pills ─────────────────────────────────────── */}
      {genres.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
          {genres.map((genre: RegionGenre) => (
            <button
              key={genre.id}
              onClick={() => switchGenre(genre.id)}
              className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full font-medium transition-all ${
                activeGenre === genre.id
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Active Region Content ───────────────────────────── */}
      <div className="px-4 pt-2">
        {/* Region title bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{active.flag}</span>
            <h2 className="text-lg font-bold text-white">{active.name}</h2>
          </div>
          <span className="text-xs text-text-muted">
            {regionLoading || genreLoading ? 'Loading...' : `${sortedStreams.length} channels`}
          </span>
        </div>

        {/* Channel grid */}
        {regionLoading || genreLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" text={`Exploring ${active.name}...`} />
          </div>
        ) : sortedStreams.length > 0 ? (
          <ChannelGrid streams={sortedStreams} credentials={credentials} onPlay={handlePlay} />
        ) : (
          <div className="flex items-center justify-center py-16 text-text-muted text-sm">
            No channels available for {active.name}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────

async function loadRegionStreams(
  region: WorldRegion,
  healthData: VpsHealthData,
  credentials: XtreamCredentials
): Promise<LiveStream[]> {
  const activeCats = region.categoryIds.filter((id) => !isCategoryDead(healthData, id));
  if (activeCats.length === 0) {
    // Fallback: try anyway even if health says dead
    const results = await Promise.allSettled(
      region.categoryIds.map((id) => getLiveStreams(credentials, id).catch(() => [] as LiveStream[]))
    );
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  }
  const results = await Promise.allSettled(
    activeCats.map((id) => getLiveStreams(credentials, id).catch(() => [] as LiveStream[]))
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

// ── Channel Grid with VOYO-style glow ─────────────────────────────

function ChannelGrid({
  streams,
  credentials,
  onPlay,
}: {
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (stream: LiveStream) => void;
}) {
  const [, setProbeVersion] = useState(0);

  useEffect(() => {
    if (streams.length === 0) return;
    probeChannels(credentials, streams.map((s) => s.stream_id)).then((results) => {
      if (Object.keys(results).length > 0) setProbeVersion((v) => v + 1);
    });
  }, [streams, credentials]);

  const alive = streams.filter(
    (s) => !isDead(`live-${s.stream_id}`) && isChannelProbeAlive(s.stream_id)
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {alive.map((stream) => (
        <button
          key={stream.stream_id}
          onClick={() => onPlay(stream)}
          className="group relative bg-white/[0.04] border border-white/8 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-white/[0.08] hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
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
