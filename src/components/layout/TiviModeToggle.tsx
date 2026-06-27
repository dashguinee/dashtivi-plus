import React, { useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tap } from '@/lib/haptics';

/**
 * VEE — the cycling navigator at the heart of the nav.
 *
 * MECHANIC: each TAP advances through Movies → Series → Live → Home → (loop).
 * Position is derived from the current route when it's one of the cycle targets,
 * otherwise from a persisted index — so consecutive taps always advance.
 *
 * LOOK: an elevated, FAB-ish lilac disc in the 3rd of 4 slots (right-of-center)
 * that reads as the centered HERO of the bar — bigger than the sibling tabs,
 * breathing glow, the capital-"V" signature.
 */
const CYCLE = ['/movies', '/series', '/live', '/'];

function routeIndex(path: string): number {
  return CYCLE.findIndex((r) => (r === '/' ? path === '/' : path.startsWith(r)));
}

/** Shared cycling logic — used by the mobile pebble AND the desktop sidebar. */
export function useVeeCycle() {
  const navigate = useNavigate();
  const location = useLocation();
  const idxRef = useRef(0);

  const cur = routeIndex(location.pathname);

  const onTap = useCallback(() => {
    tap();
    // Position: from the route when on a cycle target, else the stored index.
    const base = cur >= 0 ? cur : idxRef.current;
    const next = (base + 1) % CYCLE.length;
    idxRef.current = next;
    navigate(CYCLE[next]);
  }, [navigate, cur]);

  // Active only on the *content* targets (movies/series/live) — Home owns its tab.
  const isVeeActive = cur >= 0 && cur < 3;
  // Tiny hint of where the next tap leads.
  const LABELS = ['Films', 'Séries', 'Live', 'Home'];
  const base = cur >= 0 ? cur : idxRef.current;
  const nextLabel = LABELS[(base + 1) % CYCLE.length];

  return { onTap, isVeeActive, nextLabel };
}

export const TiviModeToggle: React.FC = () => {
  const { onTap, isVeeActive, nextLabel } = useVeeCycle();

  return (
    <button
      onClick={onTap}
      aria-label="Vee — tap to cycle Movies / Series / Live / Home"
      className="relative flex items-center justify-center flex-1 h-full"
    >
      <style>{`
        @keyframes vee-breathe {
          0%,100% { box-shadow: 0 7px 18px rgba(168,85,247,0.42), 0 0 20px rgba(199,125,255,0.24), inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -2px 3px rgba(0,0,0,0.30); transform: scale(1); }
          50%     { box-shadow: 0 9px 28px rgba(168,85,247,0.62), 0 0 34px rgba(123,44,191,0.34), inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -2px 3px rgba(0,0,0,0.30); transform: scale(1.05); }
        }
      `}</style>

      {/* Elevated lilac hero disc */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 17,
          marginTop: -20,
          background: 'radial-gradient(circle at 35% 28%, #E9C9FF, #C77DFF 46%, #9D4EDD 74%, #7B2CBF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'vee-breathe 3.4s ease-in-out infinite',
          border: isVeeActive ? '1.5px solid rgba(233,201,255,0.85)' : '1.5px solid rgba(255,255,255,0.12)',
          touchAction: 'none',
          transition: 'border-color 0.2s ease-out',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.98)',
            fontSize: 25,
            fontWeight: 300,
            lineHeight: 1,
            fontFamily: "'Outfit','Inter',system-ui,sans-serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.38)',
            letterSpacing: '0.01em',
          }}
        >
          V
        </span>
      </div>

      {/* Tiny next-destination hint */}
      <span
        className="absolute text-[8px] font-semibold tracking-wide"
        style={{
          bottom: 4,
          color: isVeeActive ? '#E9C9FF' : 'rgba(199,125,255,0.65)',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        {nextLabel}
      </span>
    </button>
  );
};
