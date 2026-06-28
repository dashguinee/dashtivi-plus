/**
 * StationsCard — Tivi+ cross-sell teaser for VOYO Stations.
 * VOYO's own palette: deep violet + lit lavender, spinning halo, breathing
 * on-air dot, metallic Join pill. Tap → opens VOYO.
 */

import { useState, useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';
import { VOYO_LINK } from './VoyoSurface';

// VOYO palette — violet base + lavender accent.
const GREEN = '#7C3AED'; // deep violet (base / depth)
const GOLD = '#C77DFF';  // lit lavender (accent / glow)

interface StationsCardProps {
  className?: string;
}

export function StationsCard({ className = '' }: StationsCardProps) {
  const [pressed, setPressed] = useState(false);

  // Pause all loops (breathe / halo spin / disc / dot) when off-screen.
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
      aria-label="Open VOYO Stations"
      className={`stations-card group relative w-full text-left rounded-2xl overflow-hidden ${inView ? 'in-view' : ''} ${className}`}
      style={{
        background: [
          'linear-gradient(135deg,',
          'rgba(212,175,110,0.18) 0%,',
          `${GREEN}1f 52%,`,
          `${GOLD}14 100%)`,
        ].join(' '),
        border: `1px solid ${GOLD}40`,
        boxShadow: `inset 0 0 30px rgba(212,175,110,0.07), 0 8px 26px ${GREEN}22`,
        transform: pressed ? 'scale(0.97)' : undefined,
        transition: 'transform 140ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      {/* Top-right spinning halo — the "tuning" signal */}
      <div
        aria-hidden
        className="stations-halo absolute top-3 right-3 w-9 h-9 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${GOLD}55 0%, ${GREEN}33 60%, transparent 100%)`,
          border: `1px solid ${GOLD}66`,
        }}
      />

      <div className="relative flex items-center gap-4 p-4">
        <span
          className="stations-disc shrink-0 relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 34% 26%, #1c1c24 0%, #0d0d12 70%)`,
            border: `1px solid ${GOLD}55`,
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.08), 0 0 14px ${GREEN}33`,
          }}
        >
          <Radio size={24} style={{ color: GOLD }} />
        </span>

        <div className="min-w-0 flex-1">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest mb-1.5"
            style={{
              background: `${GREEN}33`,
              border: `1px solid ${GREEN}77`,
              color: GOLD,
              letterSpacing: '0.14em',
            }}
          >
            <span
              className="stations-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: GREEN, boxShadow: `0 0 6px ${GREEN}` }}
            />
            On Air
          </div>
          <h3
            className="font-bold text-white text-lg leading-tight tracking-tight line-clamp-2"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
          >
            Stations
          </h3>
          <p className="text-white/70 text-sm font-medium mt-0.5 line-clamp-1">
            Always-tuning African radio. Join one.
          </p>
        </div>

        {/* Metallic Join pill — distilled from StationHero's finished-product treatment */}
        <span
          className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full font-bold text-[13px]"
          style={{
            color: '#0f0f15',
            background:
              'linear-gradient(135deg, #f7f7fa 0%, #e4e4ea 28%, #b9b9c1 55%, #d8d8df 78%, #f1f1f4 100%)',
            boxShadow: '0 5px 14px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.35)',
            letterSpacing: '0.02em',
          }}
        >
          Join
        </span>
      </div>

      <style>{`
        /* All loops run ONLY while the card is on-screen (.in-view) — keeps
           scroll at 60fps on mid-range Androids, saves battery off-screen. */
        .stations-card.in-view { animation: stations-breathe 4.6s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
        @keyframes stations-breathe {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        .stations-card.in-view .stations-halo { animation: stations-spin 13s linear infinite; }
        @keyframes stations-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* Disc gives a tiny celebratory bounce so it's alive, not static. */
        .stations-card.in-view .stations-disc { animation: stations-disc-bounce 3.2s cubic-bezier(0.23, 1, 0.32, 1) infinite; transform-origin: 50% 80%; }
        @keyframes stations-disc-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          46%      { transform: translateY(-2px) scale(1.04); }
        }
        .stations-card.in-view .stations-dot { animation: stations-dot-breathe 2s ease-in-out infinite; }
        @keyframes stations-dot-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          .stations-card, .stations-halo, .stations-disc, .stations-dot { animation: none !important; }
        }
      `}</style>
    </button>
  );
}

export default StationsCard;
