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
  // Keep the NEW cycling routing (Movies → Series → Live → Home → loop)…
  const { onTap } = useVeeCycle();

  // …but the ORIGINAL, understated V look (pre-v.47): a small 46px pink→violet→blue
  // pebble, gently breathing — no oversized FAB disc, no big radial glow, no hint label.
  return (
    <button
      onClick={onTap}
      aria-label="Vee — tap to cycle Movies / Series / Live / Home"
      className="relative flex items-center justify-center h-full w-14"
    >
      <style>{`
        @keyframes vee-breathe {
          0%,100% { box-shadow: 0 6px 16px rgba(168,85,247,0.40), 0 0 18px rgba(255,107,157,0.22), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.28); transform: scale(1); }
          50%     { box-shadow: 0 8px 26px rgba(168,85,247,0.60), 0 0 30px rgba(59,130,246,0.30), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.28); transform: scale(1.045); }
        }
      `}</style>
      <div
        style={{
          width: 46, height: 46, borderRadius: 15, marginTop: -4,
          background: 'radial-gradient(circle at 35% 30%, #FF8AD0, #A855F7 52%, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'vee-breathe 3.4s ease-in-out infinite',
          touchAction: 'none',
        }}
      >
        <span style={{
          color: 'rgba(255,255,255,0.97)', fontSize: 22, fontWeight: 300, lineHeight: 1,
          fontFamily: "'Outfit','Inter',system-ui,sans-serif",
          textShadow: '0 1px 3px rgba(0,0,0,0.35)', letterSpacing: '0.01em',
        }}>V</span>
      </div>
    </button>
  );
};
