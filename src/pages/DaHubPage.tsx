import React from 'react';
import {
  Users, MessageCircle, Play, Music, Gamepad2, Zap,
  Eye, Send, ChevronRight, Headphones, Sparkles,
} from 'lucide-react';

// ── Mock Data ─────────────────────────────────────────────────────

const FRIENDS = [
  { initials: 'KA', name: 'Kai', color: '#C77DFF' },
  { initials: 'ZY', name: 'Zi Yi', color: '#9D4EDD' },
  { initials: 'AM', name: 'Amie', color: '#c9f03c' },
  { initials: 'IZ', name: 'Izzie', color: '#f472b6' },
  { initials: 'MO', name: 'Moussa', color: '#fb923c' },
  { initials: 'DA', name: 'Dash', color: '#38bdf8' },
  { initials: 'LI', name: 'Lisa', color: '#a78bfa' },
];

const WATCHING = [
  { name: 'Kai', activity: 'Watching Premier League', emoji: '\u26BD', time: '12m ago' },
  { name: 'Zi Yi', activity: 'Browsing Movies', emoji: '\uD83C\uDFAC', time: '3m ago' },
  { name: 'Amie', activity: 'Listening to Afrobeats', emoji: '\uD83C\uDFB5', time: 'now' },
  { name: 'Moussa', activity: 'Watching Motherland TV', emoji: '\u2600\uFE0F', time: '8m ago' },
];

const MESSAGES = [
  { from: 'Kai', text: 'Yo check this match bro \uD83D\uDD25', time: '2:14 PM', incoming: true },
  { from: 'You', text: 'On it! Switching to Live TV now', time: '2:15 PM', incoming: false },
  { from: 'Amie', text: 'Can you add me to the watch party? \uD83D\uDE4F', time: '2:16 PM', incoming: true },
];

const VOYO_GENRES = ['Afrobeats', 'Hip-Hop', 'Amapiano', 'R&B'];

const ECOSYSTEM = [
  {
    id: 'voyo',
    name: 'VOYO',
    tagline: 'Music streaming',
    icon: Music,
    logo: '/logos/voyo.svg',
    color: '#a78bfa',
    gradient: 'from-violet-500/20 to-purple-600/10',
    url: 'https://music.dasuperhub.com',
  },
  {
    id: 'games',
    name: 'DASH Games',
    tagline: 'Casual games arcade',
    icon: Gamepad2,
    logo: '/logos/gaming.svg',
    color: '#fb923c',
    gradient: 'from-orange-500/20 to-amber-600/10',
    url: 'https://games.dasuperhub.com',
  },
  {
    id: 'daclub',
    name: 'DaClub',
    tagline: 'Social gaming & hangouts',
    icon: Gamepad2,
    logo: '/logos/daclub.svg',
    color: '#f472b6',
    gradient: 'from-pink-500/20 to-rose-600/10',
    url: 'https://daclub.dasuperhub.com',
  },
];

// ── DaHub Page ───────────────────────────────────────────────────

export const DaHubPage: React.FC = () => {
  return (
    <div className="pt-16 pb-32 min-h-screen">
      <style>{`
        @keyframes dahub-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes dahub-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes dahub-wave {
          0% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
          100% { transform: scaleY(0.3); }
        }
        @keyframes dahub-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dahub-glow-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,240,60,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(201,240,60,0); }
        }
        @keyframes dahub-presence {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes dahub-typing {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        .dahub-stagger-1 { animation: dahub-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }
        .dahub-stagger-2 { animation: dahub-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both; }
        .dahub-stagger-3 { animation: dahub-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
        .dahub-stagger-4 { animation: dahub-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.28s both; }
      `}</style>

      {/* ── Section A: Social Header ─────────────────────────────── */}
      <div className="relative overflow-hidden dahub-stagger-1" style={{ height: '140px' }}>
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#c9f03c]/8 via-[#9D4EDD]/6 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9f03c]/4 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9f03c]/15 to-transparent" />

        <div className="relative h-full flex items-end px-5 pb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/[0.08] relative"
              style={{
                background: 'linear-gradient(135deg, rgba(201,240,60,0.2) 0%, rgba(157,78,221,0.15) 100%)',
                boxShadow: '0 0 20px rgba(201,240,60,0.1)',
              }}
            >
              <Users className="w-6 h-6 text-white/90" />
              {/* Pulse dot */}
              <span
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{
                  background: '#c9f03c',
                  animation: 'dahub-pulse 2s ease-in-out infinite',
                  boxShadow: '0 0 8px rgba(201,240,60,0.6)',
                }}
              />
            </div>
            <div>
              <h1
                className="text-[30px] font-black text-white tracking-tight leading-none"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Da<span style={{ color: '#c9f03c' }}>Hub</span>
              </h1>
              <p className="text-[11px] text-white/25 tracking-[0.2em] uppercase mt-1.5">
                Watch together. Discover together.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section B: Friends & Activity ─────────────────────────── */}
      <div className="px-4 mt-4 space-y-4 dahub-stagger-2">

        {/* Friends row */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-3 px-1">
          {FRIENDS.map((friend, i) => (
            <div key={friend.name} className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 56 }}>
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold text-white/90 transition-transform duration-300 hover:scale-110 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${friend.color}40, ${friend.color}20)`,
                    boxShadow: `0 0 0 2px ${friend.color}40`,
                    animation: `dahub-float 3s ease-in-out ${i * 0.3}s infinite`,
                  }}
                >
                  {friend.initials}
                </div>
                {/* Online indicator */}
                {i < 3 && (
                  <span
                    className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#060609]"
                    style={{
                      background: '#c9f03c',
                      animation: 'dahub-glow-ring 2s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] text-white/40 font-medium">{friend.name}</span>
            </div>
          ))}
        </div>

        {/* Who's Watching */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Eye className="w-4 h-4 text-[#c9f03c]/60" />
            <h3 className="text-sm font-semibold text-white/70 tracking-wide">Who's Watching</h3>
            <span className="text-[10px] text-white/20 ml-auto">
              {WATCHING.length} friends active
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {WATCHING.map((w, i) => (
              <div
                key={w.name}
                className="relative overflow-hidden rounded-xl p-3.5 border transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                {/* Subtle hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(135deg, rgba(201,240,60,0.04), transparent)' }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{w.emoji}</span>
                    <span className="text-xs font-bold text-white/80">{w.name}</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed">{w.activity}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: '#c9f03c',
                        animation: 'dahub-presence 2s ease-in-out infinite',
                      }}
                    />
                    <span className="text-[9px] text-white/20">{w.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages Preview */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <MessageCircle className="w-4 h-4 text-[#C77DFF]/60" />
            <h3 className="text-sm font-semibold text-white/70 tracking-wide">Messages</h3>
            <span
              className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(157,78,221,0.15)',
                color: '#C77DFF',
                border: '1px solid rgba(157,78,221,0.2)',
              }}
            >
              2 new
            </span>
          </div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="p-4 space-y-3">
              {MESSAGES.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.incoming ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className="max-w-[75%] rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: msg.incoming
                        ? 'rgba(255,255,255,0.05)'
                        : 'linear-gradient(135deg, rgba(157,78,221,0.2), rgba(157,78,221,0.1))',
                      borderBottomLeftRadius: msg.incoming ? '4px' : undefined,
                      borderBottomRightRadius: msg.incoming ? undefined : '4px',
                    }}
                  >
                    {msg.incoming && (
                      <p className="text-[10px] font-semibold text-[#C77DFF]/70 mb-0.5">{msg.from}</p>
                    )}
                    <p className="text-[12px] text-white/75 leading-relaxed">{msg.text}</p>
                    <p className="text-[9px] text-white/20 mt-1 text-right">{msg.time}</p>
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-1"
                  style={{ background: 'rgba(255,255,255,0.03)', borderBottomLeftRadius: '4px' }}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-white/30"
                      style={{ animation: `dahub-typing 1.4s ease-in-out ${d * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div
                className="flex-1 rounded-full px-4 py-2.5 text-[12px] text-white/20"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                Type a message...
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(157,78,221,0.15)', border: '1px solid rgba(157,78,221,0.2)' }}
              >
                <Send className="w-4 h-4 text-[#C77DFF]/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section VEE: AI Intelligence Carousel ──────────────────── */}
      <div className="mt-6 dahub-stagger-3">
        <div className="flex items-center gap-2 mb-3 px-5">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(201,240,60,0.12)' }}
          >
            <Sparkles className="w-3 h-3 text-[#c9f03c]/70" />
          </div>
          <h3 className="text-sm font-semibold text-white/60 tracking-wide">VEE</h3>
          <span className="text-[10px] text-white/15 ml-1">for you</span>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-3">
          {/* Card 1: Personalization prompt */}
          <div
            className="flex-shrink-0 w-[260px] rounded-2xl p-4 border relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(201,240,60,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#c9f03c]/[0.03] to-transparent" />
            <div className="relative">
              <p className="text-[11px] text-[#c9f03c]/50 font-semibold tracking-wide uppercase mb-2">Personalize</p>
              <p className="text-[13px] text-white/70 leading-relaxed mb-3">What's your favorite football team?</p>
              <div className="flex flex-wrap gap-1.5">
                {['Barcelona', 'Man United', 'PSG', 'Real Madrid', 'Arsenal'].map(team => (
                  <button
                    key={team}
                    className="text-[10px] px-2.5 py-1 rounded-full font-medium transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'rgba(201,240,60,0.06)',
                      color: 'rgba(201,240,60,0.6)',
                      border: '1px solid rgba(201,240,60,0.1)',
                    }}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Smart insight */}
          <div
            className="flex-shrink-0 w-[240px] rounded-2xl p-4 border relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="relative">
              <p className="text-[11px] text-white/30 font-semibold tracking-wide uppercase mb-2">Insight</p>
              <p className="text-[13px] text-white/70 leading-relaxed">You watched 3 Premier League matches this week. Arsenal plays Chelsea tomorrow at 20:00.</p>
              <div className="flex items-center gap-1.5 mt-3">
                <Eye className="w-3 h-3 text-[#c9f03c]/40" />
                <span className="text-[10px] text-[#c9f03c]/40 font-medium">Set reminder</span>
              </div>
            </div>
          </div>

          {/* Card 3: Content suggestion */}
          <div
            className="flex-shrink-0 w-[240px] rounded-2xl p-4 border relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="relative">
              <p className="text-[11px] text-white/30 font-semibold tracking-wide uppercase mb-2">For You</p>
              <p className="text-[13px] text-white/70 leading-relaxed">Based on your African cinema taste — try Motherland TV tonight. 12 new episodes dropped.</p>
              <div className="flex items-center gap-1.5 mt-3">
                <Play className="w-3 h-3 text-[#c9f03c]/40" />
                <span className="text-[10px] text-[#c9f03c]/40 font-medium">Watch now</span>
              </div>
            </div>
          </div>

          {/* Card 4: Social insight */}
          <div
            className="flex-shrink-0 w-[240px] rounded-2xl p-4 border relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(157,78,221,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#9D4EDD]/[0.03] to-transparent" />
            <div className="relative">
              <p className="text-[11px] text-[#C77DFF]/40 font-semibold tracking-wide uppercase mb-2">Social</p>
              <p className="text-[13px] text-white/70 leading-relaxed">Kai and 2 others are watching the same series as you. Start a watch party?</p>
              <div className="flex items-center gap-1.5 mt-3">
                <Users className="w-3 h-3 text-[#C77DFF]/40" />
                <span className="text-[10px] text-[#C77DFF]/40 font-medium">Create party</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section C: VOYO Music Teaser ─────────────────────────── */}
      <div className="px-4 mt-8 dahub-stagger-3">
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            background: 'linear-gradient(145deg, rgba(124,58,237,0.08) 0%, rgba(88,28,135,0.04) 50%, rgba(0,0,0,0.2) 100%)',
            borderColor: 'rgba(124,58,237,0.15)',
          }}
        >
          {/* VOYO decorative glow */}
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent)' }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10 blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.5), transparent)' }}
          />

          <div className="relative p-5">
            {/* VOYO header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.15))',
                    boxShadow: '0 0 16px rgba(139,92,246,0.2)',
                  }}
                >
                  <Music className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h2
                    className="text-xl font-black tracking-tight"
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      background: 'linear-gradient(135deg, #c4b5fd, #a78bfa, #8b5cf6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    VOYO
                  </h2>
                  <p className="text-[10px] text-violet-300/40 tracking-widest uppercase">Music + Vibes</p>
                </div>
              </div>
              <a
                href="https://music.dasuperhub.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full hover:scale-105 transition-transform duration-300"
                style={{
                  background: 'rgba(139,92,246,0.12)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}
              >
                Explore
              </a>
            </div>

            {/* Mock player card */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(139,92,246,0.1)',
              }}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Album art */}
                <div
                  className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #4c1d95, #581c87)',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                    animation: 'dahub-float 4s ease-in-out infinite',
                  }}
                >
                  <Headphones className="w-7 h-7 text-white/60" />
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/80 truncate">Midnight in Lagos</p>
                  <p className="text-[11px] text-white/30 mt-0.5">Kizz Daniel ft. Davido</p>
                  {/* Waveform animation */}
                  <div className="flex items-end gap-[3px] mt-2.5 h-4">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full"
                        style={{
                          background: i < 12
                            ? 'linear-gradient(to top, #7c3aed, #a78bfa)'
                            : 'rgba(139,92,246,0.15)',
                          height: '100%',
                          animation: i < 12
                            ? `dahub-wave 1.2s ease-in-out ${i * 0.08}s infinite`
                            : 'none',
                          transformOrigin: 'bottom',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Play button */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    boxShadow: '0 0 20px rgba(139,92,246,0.3)',
                  }}
                >
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 pb-3">
                <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '38%',
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] text-white/15">1:24</span>
                  <span className="text-[9px] text-white/15">3:42</span>
                </div>
              </div>
            </div>

            {/* Genre pills */}
            <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
              {VOYO_GENRES.map((genre) => (
                <span
                  key={genre}
                  className="flex-shrink-0 text-[11px] font-semibold px-3.5 py-1.5 rounded-full cursor-pointer hover:scale-105 transition-transform duration-300"
                  style={{
                    background: 'rgba(139,92,246,0.08)',
                    color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,0.15)',
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Tagline */}
            <a
              href="https://music.dasuperhub.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-5 hover:opacity-80 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400/40" />
              <p className="text-[11px] text-violet-300/30 tracking-wider uppercase font-medium">
                Open VOYO Music
              </p>
              <Sparkles className="w-3.5 h-3.5 text-violet-400/40" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Section D: DASH Ecosystem ────────────────────────────── */}
      <div className="px-4 mt-8 dahub-stagger-4">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Zap className="w-4 h-4 text-[#c9f03c]/50" />
          <h3 className="text-sm font-semibold text-white/60 tracking-wide">DASH Ecosystem</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ECOSYSTEM.map((product) => {
            const Icon = product.icon;
            return (
              <div
                key={product.id}
                className="relative overflow-hidden rounded-xl border p-4 group cursor-pointer hover:scale-[1.02] transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
                onClick={() => product.url && window.open(product.url, '_blank')}
              >
                {/* Hover glow */}
                <div
                  className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${product.gradient}`}
                />
                <div className="relative flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 overflow-hidden"
                    style={{
                      background: `${product.color}15`,
                      border: `1px solid ${product.color}20`,
                    }}
                  >
                    {product.logo ? (
                      <img src={product.logo} alt={product.name} className="w-7 h-7 object-contain" />
                    ) : (
                      <Icon className="w-5 h-5" style={{ color: `${product.color}99` }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors truncate">
                      {product.tagline}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors flex-shrink-0"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — product logos */}
        <div className="mt-10 flex flex-col items-center gap-5">
          <div className="flex items-center gap-6">
            {ECOSYSTEM.map((product) => (
              <a
                key={product.id}
                href={product.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-70 transition-opacity duration-300"
              >
                {product.logo ? (
                  <img src={product.logo} alt={product.name} className="w-8 h-8 object-contain" />
                ) : (
                  <product.icon className="w-6 h-6" style={{ color: product.color }} />
                )}
                <span className="text-[8px] font-bold tracking-wider uppercase text-white/30">
                  {product.name}
                </span>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-1.5 opacity-25">
            <span
              className="text-sm font-black tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              DASH
            </span>
            <span className="text-[10px] text-white/40 font-light">tivi</span>
            <span className="text-[10px] font-bold text-[#C77DFF]">+</span>
          </div>
        </div>
      </div>
    </div>
  );
};
