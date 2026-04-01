import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, Search, X, Trophy, Baby, Sparkles, Radio, Film, Music, Globe, Heart, Home } from 'lucide-react';
import { t, useLanguage } from '@/i18n';
import type { XtreamCredentials, LiveStream, CuratorChannel } from '@/lib/xtream';
import {
  fetchCuratorData,
  getCuratorExperience,
  curatorToLiveStreams,
  hasCuratorData,
  buildLiveUrl,
  isChannelProbeAlive,
  sortGemsFirst,
  fetchVeeData,
  getVeeData,
  getFreeChannels,
  freeToLiveStream,
  buildFreeUrlMap,
  isFreeChannel,
  groupChannelsByQuality,
  safeImageUrl,
} from '@/lib/xtream';
import type { VeePlaylist } from '@/lib/xtream';
import {
  SPORT_TYPES, KIDS_TYPES, ENTERTAINMENT_TYPES, CINEMA_TYPES,
  MUSIC_TYPES, DISCOVERY_TYPES, FAITH_TYPES, NEWS_TYPES,
} from '@/lib/collections';
import type { SportType } from '@/lib/collections';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed, setAmbientExperience } from '@/lib/ambient-audio';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isDead } from '@/hooks/useChannelHealth';
import type { Channel } from '@/types';

// ── Experience Configs ──────────────────────────────────────────────

interface ExperienceConfig {
  id: string;
  curatorId: string;       // ID in curator.json experiences
  veeHomepageId: string;   // ID in vee.json homepage rows
  name: string;
  tagline: string;
  heroGradient: string;
  accentColor: string;
  accentGlow: string;
  icon: React.ReactNode;
  subtypes: SportType[];
  timeGreetings: Record<string, string>;
  crossExperiences: { id: string; name: string; gradient: string; icon: React.ReactNode }[];
}

const EXPERIENCE_CONFIGS: Record<string, ExperienceConfig> = {
  sports: {
    id: 'sports',
    curatorId: 'sports',
    veeHomepageId: 'homepage_sports',
    name: 'Sports',
    tagline: 'Every match. Every league. Every moment.',
    heroGradient: 'from-emerald-900/40 via-[#060609] to-blue-900/20',
    accentColor: '#10B981',
    accentGlow: 'rgba(16,185,129,0.3)',
    icon: <Trophy className="w-5 h-5" />,
    subtypes: SPORT_TYPES,
    timeGreetings: {
      morning: 'Morning highlights & replays',
      afternoon: 'Live action this afternoon',
      evening: 'Prime time kick-off',
      late_night: 'Late night replays & classics',
    },
    crossExperiences: [
      { id: 'kids', name: 'Kids', gradient: 'from-pink-500/30 to-purple-500/20', icon: <Baby className="w-4 h-4" /> },
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'news', name: 'News', gradient: 'from-red-500/30 to-orange-500/20', icon: <Radio className="w-4 h-4" /> },
      { id: 'music', name: 'Music', gradient: 'from-violet-500/30 to-pink-500/20', icon: <Music className="w-4 h-4" /> },
      { id: 'movies', name: 'Cinema', gradient: 'from-amber-500/30 to-red-500/20', icon: <Film className="w-4 h-4" /> },
    ],
  },
  kids: {
    id: 'kids',
    curatorId: 'kids',
    veeHomepageId: 'homepage_kids',
    name: 'Kids & Family',
    tagline: 'Safe, fun, always on. Let them explore.',
    heroGradient: 'from-pink-900/40 via-[#060609] to-purple-900/20',
    accentColor: '#EC4899',
    accentGlow: 'rgba(236,72,153,0.3)',
    icon: <Baby className="w-5 h-5" />,
    subtypes: KIDS_TYPES,
    timeGreetings: {
      morning: 'Good morning cartoons',
      afternoon: 'Afternoon adventures',
      evening: 'Wind down with family favorites',
      late_night: 'Bedtime stories',
    },
    crossExperiences: [
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'music', name: 'Music', gradient: 'from-violet-500/30 to-pink-500/20', icon: <Music className="w-4 h-4" /> },
      { id: 'movies', name: 'Cinema', gradient: 'from-amber-500/30 to-red-500/20', icon: <Film className="w-4 h-4" /> },
      { id: 'faith', name: 'Faith', gradient: 'from-yellow-500/30 to-amber-500/20', icon: <Heart className="w-4 h-4" /> },
    ],
  },
  entertainment: {
    id: 'entertainment',
    curatorId: 'entertainment',
    veeHomepageId: 'homepage_entertainment',
    name: 'Entertainment',
    tagline: 'BBC, HBO, Canal+, Nollywood — prime time, every time.',
    heroGradient: 'from-blue-900/40 via-[#060609] to-purple-900/20',
    accentColor: '#818CF8',
    accentGlow: 'rgba(129,140,248,0.3)',
    icon: <Sparkles className="w-5 h-5" />,
    subtypes: ENTERTAINMENT_TYPES,
    timeGreetings: {
      morning: 'Morning shows & reruns',
      afternoon: 'Afternoon drama & reality',
      evening: 'Prime time is your time',
      late_night: 'Late night binge',
    },
    crossExperiences: [
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'movies', name: 'Cinema', gradient: 'from-amber-500/30 to-red-500/20', icon: <Film className="w-4 h-4" /> },
      { id: 'news', name: 'News', gradient: 'from-red-500/30 to-orange-500/20', icon: <Radio className="w-4 h-4" /> },
      { id: 'music', name: 'Music', gradient: 'from-violet-500/30 to-pink-500/20', icon: <Music className="w-4 h-4" /> },
      { id: 'kids', name: 'Kids', gradient: 'from-pink-500/30 to-purple-500/20', icon: <Baby className="w-4 h-4" /> },
    ],
  },
  news: {
    id: 'news',
    curatorId: 'news',
    veeHomepageId: 'homepage_news',
    name: 'News',
    tagline: 'CNN, BBC, Al Jazeera — stay informed, stay sharp.',
    heroGradient: 'from-red-900/35 via-[#060609] to-slate-900/20',
    accentColor: '#EF4444',
    accentGlow: 'rgba(239,68,68,0.3)',
    icon: <Radio className="w-5 h-5" />,
    subtypes: NEWS_TYPES,
    timeGreetings: {
      morning: 'Morning briefing',
      afternoon: 'Afternoon headlines',
      evening: 'Evening roundup',
      late_night: 'Overnight world desk',
    },
    crossExperiences: [
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'documentary', name: 'Docs', gradient: 'from-teal-500/30 to-green-500/20', icon: <Globe className="w-4 h-4" /> },
      { id: 'movies', name: 'Cinema', gradient: 'from-amber-500/30 to-red-500/20', icon: <Film className="w-4 h-4" /> },
      { id: 'faith', name: 'Faith', gradient: 'from-yellow-500/30 to-amber-500/20', icon: <Heart className="w-4 h-4" /> },
    ],
  },
  music: {
    id: 'music',
    curatorId: 'music',
    veeHomepageId: 'homepage_music',
    name: 'Music & Vibes',
    tagline: 'Trace, MTV, gospel — vibes for every mood.',
    heroGradient: 'from-violet-900/40 via-[#060609] to-fuchsia-900/20',
    accentColor: '#A855F7',
    accentGlow: 'rgba(168,85,247,0.3)',
    icon: <Music className="w-5 h-5" />,
    subtypes: MUSIC_TYPES,
    timeGreetings: {
      morning: 'Wake up vibes',
      afternoon: 'Afternoon groove',
      evening: 'Evening session',
      late_night: 'After hours',
    },
    crossExperiences: [
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'kids', name: 'Kids', gradient: 'from-pink-500/30 to-purple-500/20', icon: <Baby className="w-4 h-4" /> },
      { id: 'movies', name: 'Cinema', gradient: 'from-amber-500/30 to-red-500/20', icon: <Film className="w-4 h-4" /> },
      { id: 'faith', name: 'Faith', gradient: 'from-yellow-500/30 to-amber-500/20', icon: <Heart className="w-4 h-4" /> },
    ],
  },
  movies: {
    id: 'movies',
    curatorId: 'movies',
    veeHomepageId: 'homepage_movies',
    name: 'Cinema',
    tagline: 'HBO, Sky Cinema, Nollywood — 24/7 showtime.',
    heroGradient: 'from-amber-900/40 via-[#060609] to-orange-900/20',
    accentColor: '#F59E0B',
    accentGlow: 'rgba(245,158,11,0.3)',
    icon: <Film className="w-5 h-5" />,
    subtypes: CINEMA_TYPES,
    timeGreetings: {
      morning: 'Morning classics',
      afternoon: 'Afternoon escape',
      evening: 'Showtime',
      late_night: 'Late night cinema',
    },
    crossExperiences: [
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'music', name: 'Music', gradient: 'from-violet-500/30 to-pink-500/20', icon: <Music className="w-4 h-4" /> },
      { id: 'documentary', name: 'Docs', gradient: 'from-teal-500/30 to-green-500/20', icon: <Globe className="w-4 h-4" /> },
      { id: 'kids', name: 'Kids', gradient: 'from-pink-500/30 to-purple-500/20', icon: <Baby className="w-4 h-4" /> },
    ],
  },
  documentary: {
    id: 'documentary',
    curatorId: 'documentary',
    veeHomepageId: 'homepage_documentary',
    name: 'Docs & Discovery',
    tagline: 'Discovery, NatGeo, BBC Earth — feed your curiosity.',
    heroGradient: 'from-teal-900/40 via-[#060609] to-green-900/20',
    accentColor: '#14B8A6',
    accentGlow: 'rgba(20,184,166,0.3)',
    icon: <Globe className="w-5 h-5" />,
    subtypes: DISCOVERY_TYPES,
    timeGreetings: {
      morning: 'Morning curiosity',
      afternoon: 'Afternoon exploration',
      evening: 'Deep dive tonight',
      late_night: 'Night documentaries',
    },
    crossExperiences: [
      { id: 'news', name: 'News', gradient: 'from-red-500/30 to-orange-500/20', icon: <Radio className="w-4 h-4" /> },
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'movies', name: 'Cinema', gradient: 'from-amber-500/30 to-red-500/20', icon: <Film className="w-4 h-4" /> },
      { id: 'faith', name: 'Faith', gradient: 'from-yellow-500/30 to-amber-500/20', icon: <Heart className="w-4 h-4" /> },
    ],
  },
  faith: {
    id: 'faith',
    curatorId: 'faith',
    veeHomepageId: 'homepage_faith',
    name: 'Faith',
    tagline: 'Quran, Gospel, Prayer — nourish your soul.',
    heroGradient: 'from-yellow-900/30 via-[#060609] to-amber-900/20',
    accentColor: '#D97706',
    accentGlow: 'rgba(217,119,6,0.3)',
    icon: <Heart className="w-5 h-5" />,
    subtypes: FAITH_TYPES,
    timeGreetings: {
      morning: 'Morning devotion',
      afternoon: 'Afternoon reflection',
      evening: 'Evening prayer',
      late_night: 'Night worship',
    },
    crossExperiences: [
      { id: 'music', name: 'Music', gradient: 'from-violet-500/30 to-pink-500/20', icon: <Music className="w-4 h-4" /> },
      { id: 'documentary', name: 'Docs', gradient: 'from-teal-500/30 to-green-500/20', icon: <Globe className="w-4 h-4" /> },
      { id: 'news', name: 'News', gradient: 'from-red-500/30 to-orange-500/20', icon: <Radio className="w-4 h-4" /> },
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'kids', name: 'Kids', gradient: 'from-pink-500/30 to-purple-500/20', icon: <Baby className="w-4 h-4" /> },
    ],
  },
  africa: {
    id: 'africa',
    curatorId: 'africa',
    veeHomepageId: 'homepage_africa',
    name: 'Popular Here',
    tagline: 'What everyone around you is watching.',
    heroGradient: 'from-orange-900/40 via-[#060609] to-yellow-900/20',
    accentColor: '#F97316',
    accentGlow: 'rgba(249,115,22,0.3)',
    icon: <Globe className="w-5 h-5" />,
    subtypes: [],
    timeGreetings: {
      morning: 'Good morning Africa',
      afternoon: 'African afternoon — the continent is live',
      evening: 'Motherland prime time',
      late_night: 'African nights — the continent never sleeps',
    },
    crossExperiences: [
      { id: 'sports', name: 'Sports', gradient: 'from-emerald-500/30 to-blue-500/20', icon: <Trophy className="w-4 h-4" /> },
      { id: 'entertainment', name: 'Entertainment', gradient: 'from-blue-500/30 to-purple-500/20', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'kids', name: 'Kids', gradient: 'from-pink-500/30 to-purple-500/20', icon: <Baby className="w-4 h-4" /> },
      { id: 'music', name: 'Music', gradient: 'from-violet-500/30 to-pink-500/20', icon: <Music className="w-4 h-4" /> },
      { id: 'news', name: 'News', gradient: 'from-red-500/30 to-orange-500/20', icon: <Radio className="w-4 h-4" /> },
    ],
  },
};

// ── Helper: Get time slot ────────────────────────────────────────────

function getTimeSlot(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'late_night';
}

// ── Main Component ──────────────────────────────────────────────────

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const ExperienceHomePage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { experienceId } = useParams<{ experienceId: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const config = experienceId ? EXPERIENCE_CONFIGS[experienceId] : null;

  const [loading, setLoading] = useState(true);
  const [allStreams, setAllStreams] = useState<LiveStream[]>([]);
  const [veeRow, setVeeRow] = useState<VeePlaylist | null>(null);
  const [veeSocialProof, setVeeSocialProof] = useState<VeePlaylist | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [freeUrlMap, setFreeUrlMap] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const timeSlot = getTimeSlot();

  // Redirect to /live if experience not found
  useEffect(() => {
    if (experienceId && !EXPERIENCE_CONFIGS[experienceId]) {
      navigate('/live', { replace: true });
    }
  }, [experienceId, navigate]);

  // Set ambient mood
  useEffect(() => {
    if (config) {
      setAmbientExperience(config.id);
      setAmbientSpeed(config.id === 'sports' ? 1.2 : 0.6);
    }
  }, [config]);

  // Load data
  useEffect(() => {
    if (!config) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [curatorResult, veeResult, freeChannels] = await Promise.all([
          fetchCuratorData(),
          fetchVeeData(),
          getFreeChannels(),
        ]);

        if (!mounted) return;

        // Get channels from curator
        let streams: LiveStream[] = [];
        if (curatorResult) {
          const channels = getCuratorExperience(config!.curatorId);
          if (channels && channels.length > 0) {
            streams = curatorToLiveStreams(channels);
          }
        }

        // Merge free channels for this experience
        const freeForExp = freeChannels.filter(ch => {
          const tags = (ch as { experiences?: string[] }).experiences || [];
          return tags.includes(config!.curatorId);
        });
        if (freeForExp.length > 0) {
          const freeAsLive = freeForExp.map(freeToLiveStream);
          setFreeUrlMap(buildFreeUrlMap(freeForExp));
          streams = [...streams, ...freeAsLive];
        }

        // Filter alive + sort gems first
        streams = streams.filter(s => isChannelProbeAlive(s.stream_id));
        streams = sortGemsFirst(streams);
        setAllStreams(streams);

        // VEE data
        if (veeResult) {
          const row = veeResult.homepage.find(h => h.id === config!.veeHomepageId);
          setVeeRow(row || null);
          setVeeSocialProof(veeResult.social_proof || null);
        }
      } catch (e) {
        console.warn('[EXP] Load failed:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [config, credentials]);

  // Play handler
  const handlePlay = useCallback(
    (stream: LiveStream, playlist?: LiveStream[]) => {
      const list = (playlist || allStreams)
        .filter(s => isChannelProbeAlive(s.stream_id))
        .map(s => ({
          id: `live-${s.stream_id}`,
          name: s.name,
          url: isFreeChannel(s.stream_id)
            ? freeUrlMap[s.stream_id] || ''
            : buildLiveUrl(credentials, s.stream_id),
          logo: s.stream_icon,
          category: 'live' as const,
        }));
      setPlaylist(list);
      const ch = list.find(c => c.id === `live-${stream.stream_id}`);
      if (ch) {
        setCurrentChannel(ch.id);
        onPlay(ch);
      }
    },
    [credentials, onPlay, freeUrlMap, allStreams]
  );

  if (!config) return null;

  // Filter by sub-tab
  let filtered = allStreams;
  if (activeSubTab !== 'all' && config.subtypes.length > 0) {
    const sub = config.subtypes.find(s => s.id === activeSubTab);
    if (sub) {
      const catSet = new Set(sub.categoryIds);
      filtered = allStreams.filter(s => catSet.has(String(s.category_id)));
    }
  }

  // Search filter
  const searchFiltered = searchQuery.trim()
    ? filtered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filtered;

  // VEE-curated top picks (from engine — already ordered by platform intelligence)
  const veeStreams = veeRow
    ? curatorToLiveStreams(veeRow.channels).filter(s => isChannelProbeAlive(s.stream_id))
    : [];

  // Social proof channels (cross-experience trending)
  const socialStreams = veeSocialProof
    ? curatorToLiveStreams(veeSocialProof.channels).filter(s => isChannelProbeAlive(s.stream_id))
    : [];

  // Group quality variants for the main grid
  const grouped = groupChannelsByQuality(searchFiltered);
  const deduped = grouped.map(g => {
    const best = g.variants.reduce((a, b) => {
      const order: Record<string, number> = { '4k': 4, 'fhd': 3, 'hd': 2, 'sd': 1, 'unknown': 0 };
      return (order[b.quality] || 0) > (order[a.quality] || 0) ? b : a;
    });
    return searchFiltered.find(s => s.stream_id === best.streamId) || searchFiltered[0];
  }).filter(Boolean);

  return (
    <div className="pt-14 pb-32 min-h-screen">
      {/* ── Hero Banner ────────────────────────────────────────────── */}
      <div className={`relative px-4 pt-6 pb-8 bg-gradient-to-b ${config.heroGradient}`}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/50 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs">Back</span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: config.accentColor, boxShadow: `0 0 20px ${config.accentGlow}` }}
          >
            {config.icon}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{config.name}</h1>
            <p className="text-xs text-white/40">{allStreams.length} channels live</p>
          </div>
        </div>

        <p className="text-sm text-white/60 mt-1">{config.tagline}</p>

        {/* Time-aware greeting */}
        <div className="mt-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.accentColor }} />
          <span className="text-xs text-white/30">{config.timeGreetings[timeSlot]}</span>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="sticky top-14 z-20 px-4 py-3 bg-[#060609]/95 backdrop-blur-lg border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${config.name.toLowerCase()}...`}
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10"
            >
              <X className="w-3 h-3 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* ── VEE Curated Row (AI picks for this experience) ───────── */}
          {veeStreams.length > 0 && !searchQuery && (
            <section className="mt-4 mb-6">
              <div className="px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.accentColor, boxShadow: `0 0 6px ${config.accentGlow}` }} />
                  <h2 className="text-lg font-black text-white">Top Picks</h2>
                </div>
                {veeRow?.tagline && (
                  <p className="text-[11px] text-white/25 mt-0.5 pl-3.5">{veeRow.tagline}</p>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth-x px-4 pb-2">
                {veeStreams.slice(0, 15).map((stream, i) => (
                  <button
                    key={stream.stream_id}
                    onClick={() => handlePlay(stream, veeStreams)}
                    className="flex-shrink-0 group"
                    style={{ width: i === 0 ? 160 : 140, ...(i < 10 ? { animation: `vee-card-in 0.6s ease ${i * 70}ms both` } : {}) }}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 transition-all duration-300 group-hover:shadow-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', boxShadow: i === 0 ? `0 0 20px ${config.accentGlow}` : undefined }}>
                      <ChannelIcon src={stream.stream_icon} name={stream.name} size="lg" className="!w-full !h-full !rounded-xl" />
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-semibold"
                        style={{ color: config.accentColor }}>
                        <span className="w-1 h-1 rounded-full live-badge-pulse" style={{ background: config.accentColor }} />
                        LIVE
                      </div>
                      {i === 0 && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[7px] font-bold bg-black/60"
                          style={{ color: config.accentColor }}>
                          #1 PICK
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 truncate group-hover:text-white/70 transition-colors">{stream.name}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Sub-tab filters ─────────────────────────────────────── */}
          {config.subtypes.length > 0 && !searchQuery && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 mb-4 pb-1">
              {config.subtypes.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id)}
                  className="flex-shrink-0 text-[11px] px-3 py-2 rounded-full transition-all duration-300"
                  style={activeSubTab === sub.id ? {
                    background: config.accentColor,
                    color: '#fff',
                    boxShadow: `0 0 12px ${config.accentGlow}`,
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Channel Grid ────────────────────────────────────────── */}
          <section className="px-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white/70">
                {searchQuery ? `Results` : activeSubTab === 'all' ? 'All Channels' : config.subtypes.find(s => s.id === activeSubTab)?.name || 'Channels'}
              </h2>
              <span className="text-[11px] text-white/25">{deduped.length} channels</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {deduped.map((stream, i) => (
                <button
                  key={stream.stream_id}
                  onClick={() => handlePlay(stream, deduped)}
                  className="group"
                  style={i < 20 ? { animation: `vee-card-in 0.5s ease ${i * 30}ms both` } : undefined}
                >
                  <div className="relative aspect-[4/3] rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center overflow-hidden
                    group-hover:border-white/20 group-hover:shadow-lg active:scale-95 transition-all duration-300"
                    style={{ boxShadow: `0 0 0 0 ${config.accentGlow}` }}>
                    <ChannelIcon src={stream.stream_icon} name={stream.name} size="sm" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-[9px] text-white/30 text-center mt-1 truncate px-0.5 group-hover:text-white/60 transition-colors">
                    {stream.name}
                  </p>
                </button>
              ))}
            </div>
            {deduped.length === 0 && (
              <div className="text-center py-12 text-white/20 text-sm">
                {searchQuery ? 'No channels match your search' : 'No channels available'}
              </div>
            )}
          </section>

          {/* ── Social Proof Row (Popular Right Now) ─────────────────── */}
          {socialStreams.length > 0 && !searchQuery && (
            <section className="mb-8">
              <div className="px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
                  <h2 className="text-base font-black text-white">Popular Right Now</h2>
                </div>
                <p className="text-[11px] text-white/20 mt-0.5 pl-3.5">What everyone is watching across all experiences</p>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth-x px-4 pb-2">
                {socialStreams.slice(0, 12).map((stream, i) => (
                  <button
                    key={stream.stream_id}
                    onClick={() => handlePlay(stream, socialStreams)}
                    className="flex-shrink-0 w-[120px] group"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5 bg-white/[0.03]">
                      <ChannelIcon src={stream.stream_icon} name={stream.name} size="lg" className="!w-full !h-full !rounded-xl" />
                      <div className="absolute top-1 left-1 flex items-center gap-1 px-1 py-0.5 bg-black/60 rounded text-[7px] font-semibold text-emerald-300">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 live-badge-pulse" />
                        LIVE
                      </div>
                    </div>
                    <p className="text-[9px] text-white/30 truncate group-hover:text-white/60 transition-colors">{stream.name}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Explore Other Experiences ────────────────────────────── */}
          {!searchQuery && (
            <section className="mb-8 px-4">
              <h2 className="text-base font-black text-white mb-3">Explore More</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {config.crossExperiences.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => {
                      if (EXPERIENCE_CONFIGS[exp.id]) {
                        navigate(`/live/${exp.id}`);
                      } else {
                        navigate('/live');
                      }
                    }}
                    className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${exp.gradient} border border-white/5 hover:border-white/15 transition-all duration-300 active:scale-[0.97]`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">{exp.icon}</span>
                      <span className="text-sm font-bold text-white/80">{exp.name}</span>
                    </div>
                    <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  </button>
                ))}

                {/* Always include Home */}
                <button
                  onClick={() => navigate('/')}
                  className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 hover:border-white/15 transition-all duration-300 active:scale-[0.97]"
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-white/70" />
                    <span className="text-sm font-bold text-white/80">Home</span>
                  </div>
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                </button>
              </div>
            </section>
          )}

          {/* ── Bottom callback — sticky quick nav ───────────────────── */}
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/80 backdrop-blur-lg border border-white/10 shadow-lg"
            style={{ boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 10px ${config.accentGlow}` }}>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
            <div className="w-px h-4 bg-white/10" />
            {config.crossExperiences.slice(0, 3).map((exp) => (
              <button
                key={exp.id}
                onClick={() => {
                  if (EXPERIENCE_CONFIGS[exp.id]) {
                    navigate(`/live/${exp.id}`);
                  } else {
                    navigate('/live');
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                {exp.icon}
              </button>
            ))}
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => navigate('/live')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              All
            </button>
          </div>
        </>
      )}
    </div>
  );
};
