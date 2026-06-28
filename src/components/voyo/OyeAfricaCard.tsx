/**
 * OyeAfricaCard — Tivi+ cross-sell teaser for VOYO's Oyé Africa.
 * Clean DASH golden-bronze bed (no colour mix), the AfricaSpark, one signature
 * micro-bounce at rest. Tap → opens VOYO.
 */

import { useState, useEffect, useRef } from 'react';
import { AfricaSpark } from './AfricaSpark';
import { VOYO_LINK } from './VoyoSurface';

// Clean DASH golden-bronze — one warm metallic family, no green, no mix.
const GOLD = '#E0A93E';   // lit gold
const BRONZE = '#8A5A1E'; // deep bronze

interface OyeAfricaCardProps {
  className?: string;
}

export function OyeAfricaCard({ className = '' }: OyeAfricaCardProps) {
  const [pressed, setPressed] = useState(false);

  // Only animate while on-screen — mid-range Androids drop frames otherwise.
  const ref = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      onClick={() => window.open(VOYO_LINK, '_blank', 'noopener,noreferrer')}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-label="Open Oyé Africa in VOYO"
      className={`oye-card group relative w-full text-left rounded-2xl overflow-hidden ${inView ? 'in-view' : ''} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${GOLD}26 0%, rgba(28,18,8,0.55) 45%, ${BRONZE}2e 100%)`,
        border: `1px solid ${GOLD}40`,
        boxShadow: `inset 0 0 28px rgba(138,90,30,0.12), 0 8px 26px ${BRONZE}33`,
        transform: pressed ? 'scale(0.97)' : undefined,
        transition: 'transform 140ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      {/* Top-left flourish */}
      <div
        aria-hidden
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: 44,
          height: 44,
          background: `linear-gradient(135deg, ${GOLD}55 0%, transparent 62%)`,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />
      {/* Soft warm wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{ background: 'radial-gradient(120% 80% at 24% 30%, rgba(224,169,62,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative flex items-center gap-3 sm:gap-4 p-4">
        <AfricaSpark size={56} orbitSpeed={9} paused={!inView} />

        <div className="min-w-0 flex-1">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest mb-1.5"
            style={{ background: `${GOLD}1f`, border: `1px solid ${GOLD}55`, color: GOLD, letterSpacing: '0.12em' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: GOLD }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: GOLD }} />
            </span>
            VOYO ON AIR
          </div>
          <h3 className="font-bold text-white text-lg leading-tight tracking-tight line-clamp-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            Oyé Africa
          </h3>
          <p className="text-white/70 text-sm font-medium mt-0.5 line-clamp-1">
            The cheer of the continent — tap in.
          </p>
        </div>

        {/* The Oyé chip — bounces with celebratory cheer at rest */}
        <span
          className="oye-chip shrink-0 inline-flex items-center px-3 py-1.5 rounded-full font-extrabold text-[13px]"
          style={{
            color: '#1a1206',
            background: `linear-gradient(135deg, #FFD46B 0%, ${GOLD} 48%, #B97E18 100%)`,
            boxShadow: '0 5px 14px rgba(138,90,30,0.4), inset 0 1px 0 rgba(255,236,180,0.5)',
            border: '1px solid rgba(255,236,180,0.5)',
            letterSpacing: '0.02em',
          }}
        >
          Oyé!
        </span>
      </div>

      <style>{`
        .oye-card.in-view { animation: oye-card-breathe 4.2s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
        @keyframes oye-card-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        .oye-card.in-view:hover .oye-chip,
        .oye-card.in-view:active .oye-chip,
        .oye-card.in-view:focus-visible .oye-chip { animation: oye-chip-cheer 1.2s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
        @keyframes oye-chip-cheer {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          40%      { transform: translateY(-3px) scale(1.07) rotate(-2deg); }
          58%      { transform: translateY(0.5px) scale(0.98) rotate(0.5deg); }
        }
        @media (prefers-reduced-motion: reduce) { .oye-card, .oye-chip { animation: none !important; } }
      `}</style>
    </button>
  );
}

export default OyeAfricaCard;
