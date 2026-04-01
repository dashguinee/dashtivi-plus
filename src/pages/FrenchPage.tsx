import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Globe, Headphones, ChevronRight } from 'lucide-react';
import { t, useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { XtreamCredentials, LiveStream, FreeChannel } from '@/lib/xtream';
import { getLiveStreams, buildLiveUrl, fetchVpsHealth, isCategoryDead, probeChannels, isChannelProbeAlive, sortGemsFirst, fetchServerProbeData, seedProbeCacheFromServer, fetchVerifiedData, seedVerifiedSet, getFreeChannelsByCulture, freeToLiveStream, buildFreeUrlMap, isFreeChannel, type VpsHealthData } from '@/lib/xtream';
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
    id: 'motherland',
    categoryIds: ['336', '428', '343', '427', '345', '429', '344', '430', '347', '431', '346', '85', '11'],
    name: 'Motherland',
    flag: '\u2600',
    vibe: 'Canal+ Africa \u00B7 DStv \u00B7 SuperSport \u00B7 beIN \u00B7 120+ Free',
    gradient: 'from-amber-600 to-orange-800',
    glowColor: 'shadow-amber-500/30',
  },
  {
    id: 'sahara',
    categoryIds: ['86', '165', '83', '175', '181', '180', '178', '549', '555', '553', '548', '129', '556', '554', '87', '156', '13'],
    name: 'Crossing the Sahara',
    flag: '\u2728',
    vibe: 'MBC \u00B7 Al Jazeera \u00B7 beIN Movies \u00B7 Gulf',
    gradient: 'from-emerald-600 to-teal-800',
    glowColor: 'shadow-emerald-500/30',
  },
  {
    id: 'isles',
    categoryIds: ['3', '414', '413', '410', '415', '416', '417', '19', '483', '353', '411', '139'],
    name: 'The Isles',
    flag: '\u265B',
    vibe: 'BBC \u00B7 Sky \u00B7 ITV \u00B7 Premier League',
    gradient: 'from-red-500 to-rose-700',
    glowColor: 'shadow-red-500/30',
  },
  {
    id: 'europe',
    categoryIds: ['11', '14', '60', '579', '582', '63', '39', '15', '44', '29', '21', '774', '20', '10', '35', '132', '25'],
    name: 'From Paris to Rome',
    flag: '\u2726',
    vibe: 'France \u00B7 Germany \u00B7 Italy \u00B7 Poland \u00B7 Scandinavia',
    gradient: 'from-blue-500 to-indigo-700',
    glowColor: 'shadow-blue-500/30',
  },
  {
    id: 'southasia',
    categoryIds: ['247', '338', '18', '337', '732', '729', '728', '733', '731', '727', '730', '9', '7', '73', '81', '75', '76', '5', '77', '340', '339', '341', '270', '287', '291', '290', '292', '274', '283', '285', '360', '405', '560', '140', '356', '72'],
    name: 'Welcome to South Asia',
    flag: '\u0950',
    vibe: 'Bollywood \u00B7 Cricket \u00B7 Tamil \u00B7 Malayalam \u00B7 Telugu',
    gradient: 'from-orange-500 to-red-700',
    glowColor: 'shadow-orange-500/30',
  },
  {
    id: 'crescent',
    categoryIds: ['4', '98', '42', '64', '272'],
    name: 'Crescent & Star',
    flag: '\u262A',
    vibe: 'Pakistan \u00B7 Nepal \u00B7 Sri Lanka',
    gradient: 'from-green-600 to-emerald-800',
    glowColor: 'shadow-green-500/30',
  },
  {
    id: 'usa',
    categoryIds: ['2', '24'],
    name: 'Big USA',
    flag: '\u2605',
    vibe: 'CNN \u00B7 ESPN \u00B7 Fox \u00B7 24/7',
    gradient: 'from-sky-500 to-blue-700',
    glowColor: 'shadow-sky-500/30',
  },
  {
    id: 'persian',
    categoryIds: ['751', '28'],
    name: 'The Gulf & Persian',
    flag: '\u2741',
    vibe: 'Iran International \u00B7 BBC Persian \u00B7 Afghan voices',
    gradient: 'from-cyan-600 to-teal-800',
    glowColor: 'shadow-cyan-500/30',
  },
  {
    id: 'pacific',
    categoryIds: ['90', '54'],
    name: 'The Pacific',
    flag: '\u2307',
    vibe: 'Philippines \u00B7 Australia',
    gradient: 'from-teal-500 to-cyan-700',
    glowColor: 'shadow-teal-500/30',
  },
  {
    id: 'americas',
    categoryIds: ['31', '741', '66'],
    name: 'The Americas',
    flag: '\u2302',
    vibe: 'Canada \u00B7 CTV \u00B7 Global',
    gradient: 'from-red-600 to-amber-700',
    glowColor: 'shadow-red-500/30',
  },
  {
    id: 'spinthewheel',
    categoryIds: ['275', '282', '57', '280', '274', '283'],
    name: 'Always On',
    flag: '\u221E',
    vibe: '24/7 Movies \u00B7 Web Series \u00B7 Spin the Wheel',
    gradient: 'from-purple-600 to-violet-800',
    glowColor: 'shadow-purple-500/30',
  },
];

// Map region names to i18n translation keys
const REGION_NAME_MAP: Record<string, TranslationKey> = {
  'Motherland': 'regionMotherland',
  'Crossing the Sahara': 'regionSahara',
  'From Paris to Rome': 'regionEurope',
  'The Gulf & Persian': 'regionPersian',
  'Welcome to South Asia': 'regionSouthAsia',
  'Crescent & Star': 'regionCrescent',
  'The Isles': 'regionIsles',
  'Big USA': 'regionUSA',
  'The Pacific': 'regionPacific',
  'The Americas': 'regionAmericas',
  'Always On': 'regionAlwaysOn',
};

// Map common genre names to i18n keys
const GENRE_PILL_MAP: Record<string, TranslationKey> = {
  'All': 'genreAll',
  'News': 'news',
  'Sports': 'sports',
  'Entertainment': 'themeEntertainment',
  'Music': 'music',
  'Movies': 'movies',
  'Kids': 'kids',
  'Discovery': 'themeDiscovery',
  'Docs': 'genreDocumentary',
};

// Map region IDs to free channel culture tags
const REGION_TO_CULTURE: Record<string, string> = {
  'motherland': 'africa',
  'europe': 'france',
  'isles': 'uk',
  'usa': 'usa',
  'sahara': 'arabic',
  'southasia': 'india',
};

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const FrenchPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();
  const [activeRegion, setActiveRegion] = useState<string>('motherland');
  const [activeGenre, setActiveGenre] = useState<string>('all');
  const [regionStreams, setRegionStreams] = useState<Record<string, LiveStream[]>>({});
  const [genreStreams, setGenreStreams] = useState<Record<string, LiveStream[]>>({});
  const [loading, setLoading] = useState(true);
  const [regionLoading, setRegionLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const [aliveCount, setAliveCount] = useState<number | null>(null);
  const portalScrollRef = useRef<HTMLDivElement>(null);

  // Free channel URL map (stream_id -> HLS URL)
  const [freeUrlMap, setFreeUrlMap] = useState<Record<number, string>>({});

  // Initial load: fetch first region + health check + free channels
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [healthData, verifiedData, probeData] = await Promise.all([
          fetchVpsHealth(),
          fetchVerifiedData(),
          fetchServerProbeData(),
        ]);
        if (verifiedData) seedVerifiedSet(verifiedData);
        else if (probeData) seedProbeCacheFromServer(probeData);
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
    setAliveCount(null);
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
    setAliveCount(null);
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
  const sortedStreams = sortGemsFirst(displayStreams);

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
      <div className="pt-16 flex items-center justify-center py-24">
        <LoadingSpinner size="lg" text={t(lang, 'enteringWorldEX')} />
      </div>
    );
  }

  return (
    <div className="pt-16 pb-32 min-h-screen">
      {/* ── Page Identity Header — The Global Village ── */}
      <div className="relative overflow-hidden" style={{ height: '120px' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/20 via-amber-900/15 to-[#060609]" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-700/8 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
        <div className="relative h-full flex items-end px-5 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/25 via-primary/20 to-indigo-500/25 flex items-center justify-center shadow-lg shadow-primary/15 ring-1 ring-white/[0.06]">
              <Globe className="w-6 h-6 text-white/90" />
            </div>
            <div>
              <h1 className="text-[28px] font-black text-white tracking-tight leading-none">WorldEX</h1>
              <p className="text-[11px] text-white/25 tracking-widest uppercase mt-1.5">{t(lang, 'aTasteOfTheWorld')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AmbiLive Teaser ─────────────────────────────────── */}
      <div className="px-4 mb-8 mt-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/8 to-primary-dark/10 border border-primary/15 p-4 hover:border-primary/25 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
              <Headphones className="w-5 h-5 text-primary-light" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">AmbiLive</h3>
              <p className="text-[11px] text-text-secondary">{t(lang, 'ambiLiveDesc')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-light transition-colors" />
          </div>
        </div>
      </div>

      {/* ── Region Portals (horizontal scroll) ──────────────── */}
      <div ref={portalScrollRef} className="flex gap-3.5 overflow-x-auto scrollbar-hide px-5 pb-8">
        {REGIONS.map((region) => {
          const isActive = region.id === activeRegion;
          return (
            <button
              key={region.id}
              onClick={() => switchRegion(region.id)}
              className={`flex-shrink-0 relative overflow-hidden rounded-2xl card-press transition-[transform,opacity,box-shadow] duration-300 ${
                isActive
                  ? `w-36 shadow-xl ${region.glowColor} scale-[1.02]`
                  : 'w-28 hover:scale-[1.03] active:scale-[0.97] opacity-75 hover:opacity-100'
              }`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${region.gradient} ${isActive ? 'opacity-100' : 'opacity-50'} transition-opacity duration-300`} />
              <div className={`absolute inset-0 ${isActive ? 'bg-black/10' : 'bg-black/30'}`} />

              {/* Active glow ring */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
              )}

              {/* Content */}
              <div className={`relative p-3 ${isActive ? 'py-4' : 'py-3'} transition-[transform,opacity] duration-300`}>
                <span className={`block mb-1.5 ${isActive ? 'text-3xl' : 'text-2xl'} transition-all duration-300`}>{region.flag}</span>
                <p className={`font-bold text-white ${isActive ? 'text-sm' : 'text-xs'} transition-colors`}>
                  {REGION_NAME_MAP[region.name] ? t(lang, REGION_NAME_MAP[region.name]) : region.name}
                </p>
                {isActive && (
                  <p className="text-[10px] text-white/60 mt-1 leading-tight">{region.vibe}</p>
                )}
              </div>

              {/* Active indicator bar */}
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${region.gradient}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Section divider ── */}
      <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent mb-5" />

      {/* ── Genre Pills ─────────────────────────────────────── */}
      {genres.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-5 pb-5">
          {genres.map((genre: RegionGenre) => (
            <button
              key={genre.id}
              onClick={() => switchGenre(genre.id)}
              className={`flex-shrink-0 text-[11px] px-3.5 py-1.5 rounded-full font-semibold transition-all duration-300 ${
                activeGenre === genre.id
                  ? `bg-gradient-to-r ${active.gradient} text-white shadow-md ${active.glowColor}`
                  : 'bg-white/[0.04] text-text-secondary border border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {GENRE_PILL_MAP[genre.name] ? t(lang, GENRE_PILL_MAP[genre.name]) : genre.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Active Region Content ───────────────────────────── */}
      <div className="px-5 pt-8">
        {/* Region title bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{active.flag}</span>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{REGION_NAME_MAP[active.name] ? t(lang, REGION_NAME_MAP[active.name]) : active.name}</h2>
              <p className="text-[10px] text-text-muted">{active.vibe}</p>
            </div>
          </div>
          <span className="text-[11px] text-text-muted tabular-nums">
            {regionLoading || genreLoading ? t(lang, 'loading') : `${aliveCount ?? sortedStreams.length} ${t(lang, 'channels')}`}
          </span>
        </div>

        {/* Channel grid */}
        {regionLoading || genreLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="md" text={`${t(lang, 'exploring')} ${REGION_NAME_MAP[active.name] ? t(lang, REGION_NAME_MAP[active.name]) : active.name}...`} />
          </div>
        ) : sortedStreams.length > 0 ? (
          <ChannelGrid streams={sortedStreams} credentials={credentials} onPlay={handlePlay} onAliveCount={setAliveCount} />
        ) : (
          <div className="flex items-center justify-center py-24 text-text-muted text-sm">
            {t(lang, 'noChannelsFor')} {REGION_NAME_MAP[active.name] ? t(lang, REGION_NAME_MAP[active.name]) : active.name}
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
  onAliveCount,
}: {
  streams: LiveStream[];
  credentials: XtreamCredentials;
  onPlay: (stream: LiveStream) => void;
  onAliveCount?: (count: number) => void;
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

  // Report actual visible channel count to parent
  useEffect(() => {
    onAliveCount?.(alive.length);
  }, [alive.length, onAliveCount]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {alive.map((stream) => (
        <button
          key={stream.stream_id}
          onClick={() => onPlay(stream)}
          className="group relative bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center gap-3 card-press hover:scale-[1.03] active:scale-[0.96] hover:bg-white/[0.07] hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-[background-color,border-color,box-shadow] duration-300"
        >
          <ChannelIcon src={stream.stream_icon} name={stream.name} size="md" />
          <p className="text-[11px] text-text-secondary text-center truncate w-full group-hover:text-white transition-colors leading-tight">
            {stream.name}
          </p>
          <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
