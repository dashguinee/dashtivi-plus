import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  TrendingUp, Clock, Zap, Globe, Star, ChevronRight, Play,
  Tv, Crown, Sparkles, ArrowRight, Shuffle, Film, Gamepad2
} from 'lucide-react';
import { HeroBanner } from '@/components/home/HeroBanner';
import { ChannelCard } from '@/components/home/ChannelCard';
import { CollectionCard } from '@/components/home/CollectionCard';
import { useHomeRows } from '@/hooks/useChannels';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import {
  getFeaturedChannels, getChannelById, allChannels, totalChannelCount,
  categoryCounts, getChannelsByCategory
} from '@/data/channels';
import { featuredCollections, allCollections } from '@/data/collections';
import { useNavigate } from 'react-router-dom';
import type { Channel, Collection } from '@/types';

interface Props {
  onPlayChannel: (channel: Channel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

/* ─── Category Banner Data ───────────────────────────── */
const categoryBanners = [
  { id: 'sports', label: 'Sports', emoji: '\u26BD', gradient: 'from-green-600 to-emerald-900' },
  { id: 'news', label: 'News 24/7', emoji: '\uD83D\uDCF0', gradient: 'from-blue-600 to-indigo-900' },
  { id: 'kids', label: 'Kids Zone', emoji: '\uD83E\uDDF8', gradient: 'from-pink-500 to-rose-900' },
  { id: 'music', label: 'Music', emoji: '\uD83C\uDFB5', gradient: 'from-purple-600 to-violet-900' },
  { id: 'entertainment', label: 'Entertainment', emoji: '\uD83C\uDFAC', gradient: 'from-amber-600 to-orange-900' },
  { id: 'africa', label: 'Africa', emoji: '\uD83C\uDF0D', gradient: 'from-yellow-600 to-red-900' },
  { id: 'france', label: 'France', emoji: '\uD83C\uDDEB\uD83C\uDDF7', gradient: 'from-blue-500 to-red-800' },
  { id: 'documentary', label: 'Documentary', emoji: '\uD83D\uDD2C', gradient: 'from-teal-600 to-cyan-900' },
];

/* ─── Category Banner Card ───────────────────────────── */
const CategoryBannerCard: React.FC<{
  banner: typeof categoryBanners[0];
  count: number;
  index: number;
  onClick: () => void;
}> = ({ banner, count, index, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex-shrink-0 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div
        onClick={onClick}
        className={`relative w-64 h-32 bg-gradient-to-br ${banner.gradient} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl hover:shadow-white/10 border border-white/10 group`}
      >
        {/* Ambient glow */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white" />

        {/* Emoji top-left */}
        <div className="absolute top-3 left-4">
          <span className="text-3xl">{banner.emoji}</span>
        </div>

        {/* Large background emoji */}
        <div className="absolute -bottom-2 -right-2 text-7xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 transform group-hover:scale-110">
          {banner.emoji}
        </div>

        {/* Content bottom-left */}
        <div className="absolute bottom-3 left-4">
          <h3 className="text-xl font-bold text-white leading-tight">{banner.label}</h3>
          <p className="text-xs text-white/60 mt-0.5">
            {count.toLocaleString()} channels
          </p>
        </div>

        {/* Arrow on hover */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ArrowRight className="w-5 h-5 text-white/70" />
        </div>
      </div>
    </div>
  );
};

/* ─── Streaming Service Card ──────────────────────────── */
const streamingServices = [
  {
    id: 'netflix',
    name: 'Netflix',
    tagline: 'Unlimited movies & TV',
    gradient: 'from-red-600 to-red-900',
    glow: 'shadow-red-500/30',
    accent: '#E50914',
    logo3d: '/logos/netflix-3d.png',
    logoText: 'N',
    count: '15,000+',
    features: ['4K Ultra HD', 'Download & Go', 'Originals'],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    tagline: 'Movies, TV & more',
    gradient: 'from-sky-500 to-blue-900',
    glow: 'shadow-sky-500/30',
    accent: '#00A8E1',
    logo3d: '/logos/prime-3d.webp',
    logoText: '\u25B6',
    count: '24,000+',
    features: ['X-Ray', 'Live Sports', 'Channels'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    tagline: 'Music for every moment',
    gradient: 'from-green-500 to-emerald-900',
    glow: 'shadow-green-500/30',
    accent: '#1DB954',
    logo3d: '/logos/spotify-3d.webp',
    logoText: 'S',
    count: '100M+',
    features: ['Podcasts', 'Playlists', 'Offline'],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    tagline: 'The home of anime',
    gradient: 'from-orange-500 to-orange-900',
    glow: 'shadow-orange-500/30',
    accent: '#F47521',
    logo3d: '/logos/crunchyroll-3d.webp',
    logoText: 'CR',
    count: '1,200+',
    features: ['Simulcast', 'Manga', 'Dub & Sub'],
  },
  {
    id: 'disney',
    name: 'Disney+',
    tagline: 'Marvel, Star Wars & more',
    gradient: 'from-blue-600 to-indigo-900',
    glow: 'shadow-blue-500/30',
    accent: '#113CCF',
    logo3d: '',
    logoText: 'D+',
    count: '10,000+',
    features: ['IMAX Enhanced', 'GroupWatch', 'Extras'],
  },
];

/* ─── Now Streaming — Blockbusters via DASH WebTV (TMDB posters) ─── */
const nowStreaming = [
  { id: 'oppenheimer', title: 'Oppenheimer', year: '2023', rating: '8.1', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', source: 'Netflix' },
  { id: 'barbie', title: 'Barbie', year: '2023', rating: '7.0', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', source: 'Prime' },
  { id: 'spiderman-nwh', title: 'Spider-Man: No Way Home', year: '2022', rating: '8.2', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/uJYYizSuA9Y3DCs0qS4qWvHfZg4.jpg', source: 'Disney+' },
  { id: 'john-wick-4', title: 'John Wick 4', year: '2023', rating: '7.7', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', source: 'Prime' },
  { id: 'the-batman', title: 'The Batman', year: '2022', rating: '7.7', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/74xTEgt7R36Fpooo50r9T25onhq.jpg', source: 'HBO' },
  { id: 'top-gun', title: 'Top Gun: Maverick', year: '2022', rating: '8.3', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/i0FHyNF9VvQTXOi4yKnZJ1zql1.jpg', source: 'Prime' },
  { id: 'interstellar', title: 'Interstellar', year: '2014', rating: '8.7', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', source: 'Netflix' },
  { id: 'deadpool-wolverine', title: 'Deadpool & Wolverine', year: '2024', rating: '7.7', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', source: 'Disney+' },
  { id: 'inside-out-2', title: 'Inside Out 2', year: '2024', rating: '7.6', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', source: 'Disney+' },
  { id: 'beetlejuice-2', title: 'Beetlejuice Beetlejuice', year: '2024', rating: '6.9', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/kKgQzkUCnQmeTPkyIwHly2t6ZFI.jpg', source: 'HBO' },
  { id: 'dune-2', title: 'Dune: Part Two', year: '2024', rating: '8.1', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', source: 'HBO' },
  { id: 'wild-robot', title: 'The Wild Robot', year: '2024', rating: '8.2', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/8RvwVVjYel1Ga0AmqbK15Q0llOy.jpg', source: 'Netflix' },
  { id: 'furiosa', title: 'Furiosa', year: '2024', rating: '7.4', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/iADOJ8Zymht2JPMoy3R7xceZprc.jpg', source: 'HBO' },
  { id: 'joker', title: 'Joker', year: '2019', rating: '8.2', poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', source: 'Netflix' },
];

const sourceColors: Record<string, string> = {
  'Netflix': '#E50914',
  'Prime': '#00A8E1',
  'Disney+': '#113CCF',
  'HBO': '#B535F6',
};

/* ─── Movie Poster Card ─── */
const MoviePosterCard: React.FC<{ movie: typeof nowStreaming[0]; index: number }> = ({ movie, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex-shrink-0 w-[140px] sm:w-[160px] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl hover:shadow-white/10">
        <div className="aspect-[2/3]">
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        </div>
        {/* Bottom fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Source badge */}
        <div className="absolute top-2 right-2">
          <span
            className="px-1.5 py-0.5 text-[9px] font-bold rounded-md text-white"
            style={{ backgroundColor: sourceColors[movie.source] || '#666' }}
          >
            {movie.source}
          </span>
        </div>
        {/* Rating */}
        <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-md">
          <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] font-semibold text-white">{movie.rating}</span>
        </div>
        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">{movie.title}</h4>
          <p className="text-[10px] text-white/50 mt-0.5">{movie.year}</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Featured Game Card for Home ─── */
const GAMES_HUB = 'https://games.dasuperhub.com';
const GAMES_CDN = 'https://games.dasuperhub.com/icons';

const homeGames = [
  { id: 'gta-online', name: 'GTA Online', image: '/games/store-5.jpg', tagline: 'Open World Multiplayer', url: `https://wa.me/224611361300?text=${encodeURIComponent('Hi DASH, I want GTA Online')}`, type: 'store' as const },
  { id: 'fanta', name: 'Fanta 1+1', image: `${GAMES_CDN}/fanta.jpg`, tagline: 'Defi mathematique', url: `${GAMES_HUB}/#/games/fanta`, type: 'lobby' as const },
  { id: 'bundess', name: 'Bundess', image: `${GAMES_CDN}/bundess.jpg`, tagline: 'Football tactique', url: `${GAMES_HUB}/#/games/bundess`, type: 'lobby' as const },
  { id: 'fm26', name: 'FM26', image: '/games/store-3.jpg', tagline: 'Build your dream squad', url: `https://wa.me/224611361300?text=${encodeURIComponent('Hi DASH, I want FM26')}`, type: 'store' as const },
];

const HomeGameCard: React.FC<{ game: typeof homeGames[0]; index: number }> = ({ game, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const isStore = game.type === 'store';
  const overlayColor = isStore ? 'rgba(255,121,0,0.2)' : 'rgba(157,78,221,0.2)';
  const badgeColor = isStore ? '#FF7900' : '#9D4EDD';
  const badgeText = isStore ? 'STORE' : 'ORIGINAL';

  return (
    <div
      ref={ref}
      className={`flex-shrink-0 w-[200px] sm:w-[220px] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div
        className="relative h-[140px] rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
        onClick={() => window.open(game.url, '_blank')}
      >
        <img src={game.image} alt={game.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        <div className="absolute inset-0" style={{ background: overlayColor }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Badge */}
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md text-white" style={{ backgroundColor: badgeColor }}>
            {badgeText}
          </span>
        </div>
        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h4 className="text-sm font-bold text-white drop-shadow-lg">{game.name}</h4>
          <p className="text-[10px] text-white/60">{game.tagline}</p>
        </div>
      </div>
    </div>
  );
};

const ServiceCard: React.FC<{ service: typeof streamingServices[0]; index: number }> = ({
  service,
  index,
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    navigate('/services');
  };

  return (
    <div
      ref={ref}
      className={`relative group flex-shrink-0 w-72 sm:w-80 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div
        className={`relative h-[280px] bg-gradient-to-br ${service.gradient} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${service.glow} border border-white/10`}
        onClick={handleClick}
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: service.accent }}
        />

        {/* Logo — 3D image or text fallback */}
        <div className="absolute top-4 left-4">
          {service.logo3d ? (
            <img
              src={service.logo3d}
              alt={service.name}
              className="w-16 h-16 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 -mt-1"
              style={{ filter: `drop-shadow(0 4px 16px ${service.accent}60)` }}
            />
          ) : (
            <span
              className="text-3xl font-black tracking-tighter"
              style={{ color: 'rgba(255,255,255,0.9)', textShadow: `0 0 20px ${service.accent}80` }}
            >
              {service.logoText}
            </span>
          )}
        </div>

        {/* Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg">
          <Crown className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold text-white/80">via DASH Lifestyle</span>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <h3 className="text-xl font-bold text-white mb-0.5">{service.name}</h3>
          <p className="text-sm text-white/60 mb-3">{service.tagline}</p>

          {/* Features */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {service.features.map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 text-[10px] font-medium bg-white/10 backdrop-blur-sm rounded-md text-white/70"
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">{service.count} titles</span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-white group-hover:text-primary-light transition-colors">
              Explore
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Content Row ─────────────────────────────────────── */
const ContentRow: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSeeAll?: () => void;
}> = ({ title, subtitle, icon, children, onSeeAll }) => (
  <section className="mb-8">
    <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
      <div className="flex items-center gap-2.5">
        {icon && <div className="text-primary">{icon}</div>}
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors font-medium"
        >
          See All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 lg:px-6 pb-2 gradient-mask-r">
      {children}
    </div>
  </section>
);

/* ─── Home Page ───────────────────────────────────────── */
export const HomePage: React.FC<Props> = ({ onPlayChannel, isFavorite, onToggleFavorite }) => {
  const navigate = useNavigate();
  const rows = useHomeRows();
  const { history } = useWatchHistory();
  const heroChannels = useMemo(() => getFeaturedChannels(), []);

  const continueWatching = useMemo(() => {
    return history
      .slice(0, 12)
      .map((h) => getChannelById(h.channelId))
      .filter(Boolean) as Channel[];
  }, [history]);

  const trending = useMemo(() => {
    return allChannels
      .filter((ch) => ch.quality?.includes('1080'))
      .slice(0, 20);
  }, []);

  // Popular Right Now - 20 random channels, shuffled on mount
  const popularRightNow = useMemo(() => {
    const pool = [...allChannels];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 20);
  }, []);

  // Category banner counts (dynamic)
  const bannerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const banner of categoryBanners) {
      if (banner.id === 'africa' || banner.id === 'france') {
        counts[banner.id] = getChannelsByCategory(banner.id).length;
      } else {
        counts[banner.id] = categoryCounts[banner.id] || 0;
      }
    }
    return counts;
  }, []);

  // Count unique categories for stats
  const categoryCount = useMemo(() => {
    return Object.keys(categoryCounts).length;
  }, []);

  // Featured collections with channel counts > 0
  const validCollections = useMemo(() => {
    return featuredCollections.filter(
      (c) => c.movies.length + (c.series?.length || 0) > 0
    );
  }, []);

  const handleSelectCollection = (collection: Collection) => {
    navigate(`/collections/${collection.key}`);
  };

  return (
    <div className="min-h-screen pt-14">
      {/* ═══ 1. HERO BANNER ═══ */}
      <HeroBanner channels={heroChannels} onPlay={onPlayChannel} />

      {/* ═══ 2. QUICK STATS (updated counts) ═══ */}
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface rounded-xl border border-white/5 flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white">{totalChannelCount.toLocaleString()}</span>
            <span className="text-xs text-text-muted">Live Channels</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface rounded-xl border border-white/5 flex-shrink-0">
            <Globe className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-white">{categoryCount}</span>
            <span className="text-xs text-text-muted">Categories</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface rounded-xl border border-white/5 flex-shrink-0">
            <Tv className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-medium text-white">{allCollections.length}</span>
            <span className="text-xs text-text-muted">Collections</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface rounded-xl border border-white/5 flex-shrink-0">
            <Star className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-white">FREE</span>
            <span className="text-xs text-text-muted">Live TV</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. CATEGORY BANNERS (NEW) ═══ */}
      <section className="mb-8">
        <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="text-primary"><Globe className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-white">Browse by Category</h2>
              <p className="text-xs text-text-muted mt-0.5">Dive into what you love</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/live')}
            className="flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors font-medium"
          >
            All Channels
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 lg:px-6 pb-2">
          {categoryBanners.map((banner, i) => (
            <CategoryBannerCard
              key={banner.id}
              banner={banner}
              count={bannerCounts[banner.id] || 0}
              index={i}
              onClick={() => navigate('/live')}
            />
          ))}
        </div>
      </section>

      {/* ═══ 4. CONTINUE WATCHING ═══ */}
      {continueWatching.length > 0 && (
        <ContentRow
          title="Continue Watching"
          icon={<Clock className="w-5 h-5" />}
        >
          {continueWatching.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onPlay={onPlayChannel}
              isFavorite={isFavorite(ch.id)}
              onToggleFavorite={onToggleFavorite}
              compact
            />
          ))}
        </ContentRow>
      )}

      {/* ═══ 5. TRENDING NOW ═══ */}
      {trending.length > 0 && (
        <ContentRow
          title="Trending Now"
          subtitle="HD & Full HD streams"
          icon={<TrendingUp className="w-5 h-5" />}
          onSeeAll={() => navigate('/live')}
        >
          {trending.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onPlay={onPlayChannel}
              isFavorite={isFavorite(ch.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ContentRow>
      )}

      {/* ═══ 5b. NOW STREAMING — Blockbusters via DASH WebTV ═══ */}
      <section className="mb-8">
        <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Now Streaming</h2>
              <p className="text-xs text-text-muted mt-0.5">Blockbusters via DASH Lifestyle</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/services')}
            className="flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors font-medium"
          >
            Browse All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 lg:px-6 pb-2">
          {nowStreaming.map((movie, i) => (
            <MoviePosterCard key={movie.id} movie={movie} index={i} />
          ))}
        </div>
      </section>

      {/* ═══ 5c. DASH GAMES — Highlights ═══ */}
      <section className="mb-8">
        <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-orange-500/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">DASH Games</h2>
              <p className="text-xs text-text-muted mt-0.5">Play or shop — your move</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/games')}
            className="flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors font-medium"
          >
            All Games
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 lg:px-6 pb-2">
          {homeGames.map((game, i) => (
            <HomeGameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      </section>

      {/* ═══ 6. STREAMING SERVICES ═══ */}
      <section className="mb-10 mt-2">
        <div className="px-4 lg:px-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Your Streaming Universe</h2>
              <p className="text-xs text-text-muted">All your platforms. One destination.</p>
            </div>
          </div>
        </div>

        {/* Service Cards - horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-6 pb-4">
          {streamingServices.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>

        {/* CTA Banner */}
        <div className="px-4 lg:px-6 mt-2">
          <div
            className="relative bg-gradient-to-r from-primary/10 via-bg-surface to-accent/10 rounded-2xl p-5 border border-white/5 overflow-hidden cursor-pointer group"
            onClick={() => window.open('https://dasuperhub.com', '_blank')}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">
                  Unlock the Full Universe
                </h3>
                <p className="text-xs text-text-muted">
                  Access Netflix, Prime, Disney+ and more through DASH SuperHub
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-semibold text-white group-hover:bg-primary-light transition-all group-hover:scale-105 flex-shrink-0">
                Get Access
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 7. POPULAR RIGHT NOW (NEW) ═══ */}
      {popularRightNow.length > 0 && (
        <ContentRow
          title="Popular Right Now"
          subtitle="On TIVI"
          icon={<Shuffle className="w-5 h-5" />}
          onSeeAll={() => navigate('/live')}
        >
          {popularRightNow.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onPlay={onPlayChannel}
              isFavorite={isFavorite(ch.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ContentRow>
      )}

      {/* ═══ 8. FEATURED COLLECTIONS (enhanced) ═══ */}
      {validCollections.length > 0 && (
        <ContentRow
          title="Featured Collections"
          subtitle="Curated just for you"
          onSeeAll={() => navigate('/collections')}
        >
          {validCollections.map((col) => (
            <CollectionCard
              key={col.key}
              collection={col}
              onClick={handleSelectCollection}
            />
          ))}
        </ContentRow>
      )}

      {/* ═══ 9. CATEGORY ROWS ═══ */}
      {rows.map((row) => (
        <ContentRow
          key={row.categoryId}
          title={row.title}
          onSeeAll={() => navigate('/live')}
        >
          {row.channels.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onPlay={onPlayChannel}
              isFavorite={isFavorite(ch.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ContentRow>
      ))}

      {/* ═══ 10. FOOTER ═══ */}
      <footer className="px-4 lg:px-6 py-12 text-center border-t border-white/5 mt-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gradient">DASH Lifestyle</span>
        </div>
        <p className="text-xs text-text-muted mb-1">
          Your streaming universe. Live TV, Movies, Games & more.
        </p>
        <p className="text-[10px] text-text-muted/50">
          DASH Etation &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
