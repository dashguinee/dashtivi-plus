/**
 * OyeAfricaCard — Tivi+ cross-sell teaser for VOYO's Oyé Africa.
 *
 * "Oyé!" is a cheer. The card celebrates: a warm green→gold African bed, the
 * AfricaSpark bouncing on the DASH signature ease, and ONE signature
 * micro-bounce on the whole card at rest (subtle, alive — not a circus, per
 * the DASH quiet-luxury restraint). Tap → VOYO rises borderless straight into
 * Oyé Africa via useOpenVoyo('oye').
 *
 * Adapted from VOYO's OyeButton narralogy (purple→gold "arrived") but recolored
 * to the celebratory African green #007749 / gold #FFB612 of StationHero, and
 * tuned bouncy-cheering instead of the lightning "cooking" pulse.
 */

import { useState } from 'react';
import { AfricaSpark } from './AfricaSpark';
import { useOpenVoyo } from './VoyoSurface';

const GREEN = '#007749';
const GOLD = '#FFB612';

interface OyeAfricaCardProps {
  className?: string;
}

export function OyeAfricaCard({ className = '' }: OyeAfricaCardProps) {
  const open = useOpenVoyo('oye');
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={() => open()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-label="Open Oyé Africa in VOYO"
      className={`oye-card group relative w-full text-left rounded-2xl overflow-hidden ${className}`}
      style={{
        background: [
          'linear-gradient(135deg,',
          `${GREEN}26 0%,`,
          'rgba(20,12,6,0.55) 40%,',
          `${GOLD}1f 100%)`,
        ].join(' '),
        border: `1px solid ${GOLD}40`,
        boxShadow: `inset 0 0 28px rgba(0,119,73,0.10), 0 8px 26px ${GREEN}26`,
        transform: pressed ? 'scale(0.97)' : undefined,
        transition: 'transform 140ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      {/* Top-left African flourish */}
      <div
        aria-hidden
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: 44,
          height: 44,
          background: `linear-gradient(135deg, ${GREEN}55 0%, transparent 62%)`,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />
      {/* Soft celebratory wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          background:
            'radial-gradient(120% 80% at 24% 30%, rgba(255,182,18,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex items-center gap-4 p-4">
        <AfricaSpark size={56} orbitSpeed={9} />

        <div className="min-w-0 flex-1">
          <div
            className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest mb-1.5"
            style={{
              background: `${GREEN}33`,
              border: `1px solid ${GREEN}77`,
              color: GOLD,
              letterSpacing: '0.14em',
            }}
          >
            VOYO
          </div>
          <h3
            className="font-bold text-white text-lg leading-tight tracking-tight"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
          >
            Oyé Africa
          </h3>
          <p className="text-white/70 text-sm font-medium mt-0.5">
            The cheer of the continent — tap in.
          </p>
        </div>

        {/* The Oyé chip — bounces with celebratory cheer at rest */}
        <span
          className="oye-chip shrink-0 inline-flex items-center px-3 py-1.5 rounded-full font-extrabold text-[13px]"
          style={{
            color: '#15240a',
            background: `linear-gradient(135deg, #FFD46B 0%, ${GOLD} 48%, #C98A14 100%)`,
            boxShadow: '0 5px 14px rgba(201,138,20,0.4), inset 0 1px 0 rgba(255,236,180,0.5)',
            border: '1px solid rgba(255,236,180,0.5)',
            letterSpacing: '0.02em',
          }}
        >
          Oyé!
        </span>
      </div>

      <style>{`
        /* ONE signature card bounce — alive, subtle, on the DNA ease. */
        .oye-card { animation: oye-card-breathe 4.2s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
        @keyframes oye-card-breathe {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        /* The cheer accent — the Oyé chip springs a little harder, celebratory. */
        .oye-chip { animation: oye-chip-cheer 2.4s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
        @keyframes oye-chip-cheer {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          40%      { transform: translateY(-3px) scale(1.07) rotate(-2deg); }
          58%      { transform: translateY(0.5px) scale(0.98) rotate(0.5deg); }
        }
        .oye-card:active .oye-chip,
        .oye-card:focus-visible .oye-chip { animation-duration: 1.2s; }
        @media (prefers-reduced-motion: reduce) {
          .oye-card, .oye-chip { animation: none; }
        }
      `}</style>
    </button>
  );
}

export default OyeAfricaCard;
