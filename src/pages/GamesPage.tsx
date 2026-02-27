import React, { useState } from 'react';
import { Gamepad2, Play, Star, Trophy, Users, Zap, ArrowRight, ExternalLink } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   DASH Games Lobby — Part of DASH Lifestyle
   Curated game cards, coming soon titles, play links
   ═══════════════════════════════════════════════════════════ */

interface Game {
  id: string;
  name: string;
  tagline: string;
  gradient: string;
  accent: string;
  emoji: string;
  status: 'playable' | 'coming_soon';
  url?: string;
  players?: string;
  category: string;
}

const games: Game[] = [
  {
    id: 'dash-hub',
    name: 'DASH Game Store',
    tagline: 'Any game, any platform — 3x cheaper',
    gradient: 'from-orange-500 to-amber-900',
    accent: '#FF7900',
    emoji: '🎮',
    status: 'playable',
    url: 'https://games.dasuperhub.com',
    players: 'All Platforms',
    category: 'Store',
  },
  {
    id: 'snake',
    name: 'Neon Snake',
    tagline: 'Classic snake with a DASH twist',
    gradient: 'from-green-500 to-emerald-900',
    accent: '#00C853',
    emoji: '🐍',
    status: 'playable',
    url: 'https://freetown-games.vercel.app',
    players: '1 Player',
    category: 'Arcade',
  },
  {
    id: 'tetris',
    name: 'Block Drop',
    tagline: 'Stack blocks, clear lines, chase the score',
    gradient: 'from-cyan-500 to-blue-900',
    accent: '#00BCD4',
    emoji: '🧱',
    status: 'playable',
    url: 'https://freetown-games.vercel.app',
    players: '1 Player',
    category: 'Puzzle',
  },
  {
    id: 'trivia',
    name: 'Africa Trivia',
    tagline: 'Test your knowledge of the motherland',
    gradient: 'from-amber-500 to-orange-900',
    accent: '#FFB300',
    emoji: '🌍',
    status: 'coming_soon',
    players: '1-4 Players',
    category: 'Trivia',
  },
  {
    id: 'racer',
    name: 'Conakry Rush',
    tagline: 'Race through the streets of Guinea',
    gradient: 'from-red-500 to-rose-900',
    accent: '#FF5252',
    emoji: '🏎️',
    status: 'coming_soon',
    players: '1-2 Players',
    category: 'Racing',
  },
  {
    id: 'cards',
    name: 'Dash Cards',
    tagline: 'West African card game — online multiplayer',
    gradient: 'from-purple-500 to-violet-900',
    accent: '#9D4EDD',
    emoji: '🃏',
    status: 'coming_soon',
    players: '2-6 Players',
    category: 'Multiplayer',
  },
  {
    id: 'music-quiz',
    name: 'Beat Match',
    tagline: 'Guess the Afrobeat track in 5 seconds',
    gradient: 'from-fuchsia-500 to-pink-900',
    accent: '#E040FB',
    emoji: '🎵',
    status: 'coming_soon',
    players: '1-8 Players',
    category: 'Music',
  },
];

const GameCard: React.FC<{ game: Game }> = ({ game }) => {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
      style={{
        boxShadow: hovering ? `0 20px 60px ${game.accent}30` : '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => {
        if (game.url) window.open(game.url, '_blank');
      }}
    >
      <div className={`relative h-48 sm:h-56 bg-gradient-to-br ${game.gradient} p-5 flex flex-col justify-between`}>
        {/* Ambient glow */}
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-30 transition-opacity duration-300 group-hover:opacity-50"
          style={{ backgroundColor: game.accent }}
        />

        {/* Top row — category + status */}
        <div className="flex items-center justify-between relative z-10">
          <span className="px-2.5 py-1 text-[10px] font-semibold bg-white/10 backdrop-blur-sm rounded-lg text-white/80">
            {game.category}
          </span>
          {game.status === 'playable' ? (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-green-500/20 backdrop-blur-sm rounded-lg">
              <Zap className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-bold text-green-300">Play Now</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-semibold bg-white/10 backdrop-blur-sm rounded-lg text-white/50">
              Coming Soon
            </span>
          )}
        </div>

        {/* Big emoji */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl opacity-15 group-hover:opacity-25 group-hover:scale-110 transition-all duration-500">
          {game.emoji}
        </div>

        {/* Bottom — name + info */}
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-0.5">{game.name}</h3>
          <p className="text-sm text-white/60 mb-2">{game.tagline}</p>
          <div className="flex items-center gap-3">
            {game.players && (
              <span className="flex items-center gap-1 text-[11px] text-white/50">
                <Users className="w-3 h-3" />
                {game.players}
              </span>
            )}
            {game.status === 'playable' && (
              <span className="flex items-center gap-1 text-[11px] text-white font-medium group-hover:text-green-300 transition-colors">
                <Play className="w-3 h-3 fill-current" />
                Launch
                <ExternalLink className="w-3 h-3 opacity-50" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GamesPage: React.FC = () => {
  const playable = games.filter((g) => g.status === 'playable');
  const upcoming = games.filter((g) => g.status === 'coming_soon');

  return (
    <div className="min-h-screen pt-16">
      {/* Hero */}
      <div className="px-4 lg:px-6 pt-6 pb-8">
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
            <p className="text-sm text-text-secondary">Play, compete, and vibe</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Gamepad2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-text-secondary">{games.length} Games</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-text-secondary">{playable.length} Playable Now</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-text-secondary">Leaderboards Soon</span>
          </div>
        </div>
      </div>

      {/* Play Now Section */}
      {playable.length > 0 && (
        <section className="px-4 lg:px-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Play Now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playable.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Coming Soon Section */}
      {upcoming.length > 0 && (
        <section className="px-4 lg:px-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Coming Soon</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <div className="px-4 lg:px-6 pb-24">
        <div
          className="relative bg-gradient-to-r from-primary/10 via-bg-surface to-accent/10 rounded-2xl p-6 border border-white/5 overflow-hidden text-center"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          <Gamepad2 className="w-8 h-8 text-primary-light mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            Got a game idea?
          </h3>
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
            DASH Games Studio is building the first African casual gaming platform. Your idea could be next.
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
