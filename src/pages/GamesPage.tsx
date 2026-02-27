import React, { useState } from 'react';
import { Gamepad2, Play, ShoppingBag, ArrowRight, ExternalLink, Zap, Trophy, Crown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   DASH Games — Crossroads Page
   Gateway to Game Store (orange) + Game Lobby (purple)
   OG ChannelTile overlay DNA: image → bottom fade → text
   ═══════════════════════════════════════════════════════════ */

const GAMES_HUB = 'https://games.dasuperhub.com';
const GAMES_SHOP = 'https://games.dasuperhub.com/#/shop';
const GAMES_CDN = 'https://games.dasuperhub.com/icons';

/* ─── Featured Items ─── */

interface FeaturedItem {
  id: string;
  name: string;
  tagline: string;
  image: string;
  emoji: string;
  type: 'store' | 'lobby';
  url: string;
}

const featured: FeaturedItem[] = [
  // Store games (orange overlay)
  {
    id: 'fifa-25',
    name: 'FIFA 25',
    tagline: 'The beautiful game, latest edition',
    image: `${GAMES_CDN}/football.jpg`,
    emoji: '\u26BD',
    type: 'store',
    url: `https://wa.me/224611361300?text=${encodeURIComponent('Hi DASH, I want to buy FIFA 25')}`,
  },
  {
    id: 'gta-v',
    name: 'GTA V',
    tagline: 'Open world, endless possibilities',
    image: `${GAMES_CDN}/rush.jpg`,
    emoji: '\uD83C\uDFAE',
    type: 'store',
    url: `https://wa.me/224611361300?text=${encodeURIComponent('Hi DASH, I want to buy GTA V')}`,
  },
  // Lobby games (purple overlay) — best 3 from the real 15
  {
    id: 'kalishoo',
    name: 'Kalich\u26BDo',
    tagline: 'Glow Hockey \u2014 frappe le palet!',
    image: `${GAMES_CDN}/kalishoo.jpg`,
    emoji: '\uD83C\uDFD2',
    type: 'lobby',
    url: `${GAMES_HUB}/#/games/kalishoo`,
  },
  {
    id: 'rush',
    name: 'Conakry Rush',
    tagline: 'Esquive le trafic fou de Conakry!',
    image: `${GAMES_CDN}/rush.jpg`,
    emoji: '\uD83D\uDE95',
    type: 'lobby',
    url: `${GAMES_HUB}/#/games/rush`,
  },
  {
    id: 'ludo',
    name: 'Ludo African',
    tagline: 'Le classique africain r\u00E9invent\u00E9',
    image: `${GAMES_CDN}/ludo.jpg`,
    emoji: '\uD83C\uDFB2',
    type: 'lobby',
    url: `${GAMES_HUB}/#/games/ludo`,
  },
  {
    id: 'fanta',
    name: 'Fanta 1+1',
    tagline: 'D\u00E9fi math\u00E9matique contre Fanta!',
    image: `${GAMES_CDN}/fanta.jpg`,
    emoji: '\uD83E\uDDEE',
    type: 'lobby',
    url: `${GAMES_HUB}/#/games/fanta`,
  },
  {
    id: 'bundess',
    name: 'Bundess',
    tagline: 'Football tactique tour par tour',
    image: `${GAMES_CDN}/bundess.jpg`,
    emoji: '\u26BD',
    type: 'lobby',
    url: `${GAMES_HUB}/#/games/bundess`,
  },
];

/* ─── Hero Card — Store / Lobby gateway with AI-generated backgrounds ─── */

const HeroCard: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  type: 'store' | 'lobby';
  tag?: string;
  url: string;
  bgImage: string;
}> = ({ title, subtitle, icon, type, tag, url, bgImage }) => {
  const [hovering, setHovering] = useState(false);
  const isStore = type === 'store';
  const tintColor = isStore ? 'rgba(255,121,0,0.35)' : 'rgba(157,78,221,0.35)';

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 card-shine card-glow"
      style={{
        aspectRatio: '16/9',
        boxShadow: hovering
          ? `0 20px 60px ${isStore ? 'rgba(255,121,0,0.3)' : 'rgba(157,78,221,0.3)'}`
          : '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => window.open(url, '_blank')}
    >
      {/* Background image */}
      <img
        src={bgImage}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {/* Color tint overlay */}
      <div className="absolute inset-0" style={{ background: tintColor }} />

      {/* OG bottom fade — ChannelTile DNA */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.3) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Tag — top left */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {tag && (
          <span
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg backdrop-blur-sm"
            style={{
              background: 'rgba(255,215,0,0.15)',
              color: '#FFD700',
              border: '1px solid rgba(255,215,0,0.25)',
            }}
          >
            {tag}
          </span>
        )}
      </div>

      {/* Icon — top right */}
      <div className="absolute top-3 right-3 z-10">
        <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
          {icon}
          <ExternalLink className="w-3 h-3 text-white/50" />
        </span>
      </div>

      {/* Content — bottom, over the fade */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 drop-shadow-lg">{title}</h3>
        <p className="text-sm text-white/70 drop-shadow-md">{subtitle}</p>
      </div>
    </div>
  );
};

/* ─── Featured Game Card — OG ChannelTile overlay style ─── */

const FeaturedCard: React.FC<{ item: FeaturedItem }> = ({ item }) => {
  const [hovering, setHovering] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isStore = item.type === 'store';
  const tintColor = isStore ? 'rgba(255,121,0,0.25)' : 'rgba(157,78,221,0.25)';
  const accentGlow = isStore ? 'rgba(255,121,0,0.3)' : 'rgba(157,78,221,0.3)';
  const borderColor = isStore ? 'rgba(255,121,0,0.2)' : 'rgba(157,78,221,0.2)';

  return (
    <div
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 card-shine card-glow"
      style={{
        aspectRatio: '16/9',
        border: `1px solid ${borderColor}`,
        boxShadow: hovering ? `0 12px 40px ${accentGlow}` : '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => window.open(item.url, '_blank')}
    >
      {/* Background image or emoji fallback */}
      {item.image && !imgError ? (
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
          {item.emoji}
        </div>
      )}

      {/* Color tint overlay — orange for store, purple for lobby */}
      <div className="absolute inset-0" style={{ background: tintColor }} />

      {/* OG bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Type badge — top right */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className="px-2 py-0.5 text-[9px] font-bold rounded-md backdrop-blur-sm uppercase tracking-wider"
          style={{
            background: isStore ? 'rgba(255,121,0,0.3)' : 'rgba(157,78,221,0.3)',
            color: isStore ? '#FFB74D' : '#CE93D8',
            border: `1px solid ${isStore ? 'rgba(255,121,0,0.3)' : 'rgba(157,78,221,0.3)'}`,
          }}
        >
          {isStore ? 'STORE' : 'PLAY'}
        </span>
      </div>

      {/* Bottom info — over the fade */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h4 className="text-sm font-bold text-white leading-tight drop-shadow-lg">{item.name}</h4>
        <p className="text-[10px] text-white/60 mt-0.5 drop-shadow-md">{item.tagline}</p>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */

export const GamesPage: React.FC = () => {
  const storeItems = featured.filter((f) => f.type === 'store');
  const lobbyItems = featured.filter((f) => f.type === 'lobby');

  return (
    <div className="min-h-screen pt-16">
      {/* Hero */}
      <div className="px-4 lg:px-6 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.15), rgba(255, 107, 53, 0.15))',
              border: '1px solid rgba(157, 78, 221, 0.2)',
            }}
          >
            <Gamepad2 className="w-6 h-6 text-primary-light" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Games <span className="text-gradient">Lobby</span>
            </h1>
            <p className="text-sm text-text-secondary">Buy, play, and vibe</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-text-secondary">Game Store</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-text-secondary">15+ Playable</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-text-secondary">Leaderboards</span>
          </div>
        </div>
      </div>

      {/* ═══ PLAY NOW — Two Hero Cards with AI backgrounds ═══ */}
      <section className="px-4 lg:px-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-green-400 fill-green-400" />
          <h2 className="text-lg font-bold text-white">Play Now</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HeroCard
            title="DASH Game Store"
            subtitle="Any game, any platform \u2014 3x cheaper"
            icon={<ShoppingBag className="w-4 h-4 text-white" />}
            type="store"
            url={GAMES_SHOP}
            bgImage="/games/store-hero.jpg"
          />
          <HeroCard
            title="DASH Games"
            subtitle="15 original games \u2014 play instantly"
            icon={<Gamepad2 className="w-4 h-4 text-white" />}
            type="lobby"
            tag="DASH Original"
            url={GAMES_HUB}
            bgImage="/games/lobby-hero.jpg"
          />
        </div>
      </section>

      {/* ═══ FEATURED — Grid cards, real images, OG overlay ═══ */}
      <section className="px-4 lg:px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Featured</h2>
          </div>
          <button
            onClick={() => window.open(GAMES_HUB, '_blank')}
            className="flex items-center gap-1 text-xs text-primary-light font-semibold hover:text-primary transition-colors"
          >
            All Games
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...storeItems, ...lobbyItems].map((item) => (
            <FeaturedCard key={item.id} item={item} />
          ))}
        </div>

        {/* More button */}
        <button
          onClick={() => window.open(GAMES_HUB, '_blank')}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/8 text-sm font-semibold text-primary-light hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95"
        >
          More Games
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* ═══ GOT A GAME YOU WANT? CTA ═══ */}
      <div className="px-4 lg:px-6 pb-24">
        <div className="relative bg-gradient-to-r from-primary/10 via-bg-surface to-accent/10 rounded-2xl p-6 border border-white/5 overflow-hidden text-center">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          <Gamepad2 className="w-8 h-8 text-primary-light mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Got a Game You Want?</h3>
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
            We'll find it. DASH Games Studio is building the first African casual gaming platform. Your idea could be next.
          </p>
          <button
            onClick={() => window.open('https://dasuperhub.com', '_blank')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary rounded-xl text-sm font-semibold text-white hover:bg-primary-light transition-all hover:scale-105 active:scale-95"
          >
            Submit Your Idea
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
