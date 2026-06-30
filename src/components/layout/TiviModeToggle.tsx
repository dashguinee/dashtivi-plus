import React, { useCallback, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tap } from '@/lib/haptics';
import { VeeWheel } from '@/components/ui/VeeWheel';

/**
 * VEE — the cycling navigator at the heart of the nav.
 *
 * SHORT TAP  → cycle through Movies → Series → Live → Home (original behavior).
 * LONG PRESS → the OrbitalWheel blooms outward from the pebble center —
 *              five district orbs arc above, frosted world behind, thumb picks a
 *              destination. The DNA's "summon from the thumb" pattern, alive.
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
    const base = cur >= 0 ? cur : idxRef.current;
    const next = (base + 1) % CYCLE.length;
    idxRef.current = next;
    navigate(CYCLE[next]);
  }, [navigate, cur]);

  const isVeeActive = cur >= 0 && cur < 3;
  const LABELS = ['Films', 'Séries', 'Live', 'Home'];
  const base = cur >= 0 ? cur : idxRef.current;
  const nextLabel = LABELS[(base + 1) % CYCLE.length];

  return { onTap, isVeeActive, nextLabel };
}

const TiviModeToggleImpl: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onTap } = useVeeCycle();

  const [wheelOpen, setWheelOpen] = useState(false);
  const [orbCenter, setOrbCenter] = useState({ x: 0, y: 0 });

  const btnRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const openWheel = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setOrbCenter({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setWheelOpen(true);
  }, []);

  const onPointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      tap();
      openWheel();
    }, 480);
  }, [openWheel]);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onPointerCancel = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onClick = useCallback(() => {
    // Long-press already handled — skip the short-tap cycle.
    if (didLongPress.current) return;
    onTap();
  }, [onTap]);

  const onWheelSelect = useCallback((path: string) => {
    tap();
    setWheelOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
        aria-label="Vee — tap to cycle, hold for district wheel"
        className="relative flex items-center justify-center h-full w-14"
        style={{ transform: 'translateX(-1px) translateZ(0)', touchAction: 'none' }}
      >
        <style>{`
          @keyframes vee-breathe-scale {
            0%,100% { transform: translateZ(0) scale(1); }
            50%     { transform: translateZ(0) scale(1.045); }
          }
          @keyframes vee-glow-pulse {
            0%,100% { opacity: 0.55; }
            50%     { opacity: 1; }
          }
        `}</style>
        <div style={{ position: 'relative', width: 46, height: 46, marginTop: -1 }}>
          {/* Composited glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: -7, borderRadius: 20,
              background: 'radial-gradient(circle at 50% 60%, rgba(168,85,247,0.55) 0%, rgba(59,130,246,0.28) 55%, rgba(255,107,157,0.12) 75%, transparent 82%)',
              filter: 'blur(5px)',
              animation: 'vee-glow-pulse 3.4s ease-in-out infinite',
              willChange: 'opacity',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 46, height: 46, borderRadius: 15,
              background: 'radial-gradient(circle at 35% 30%, #FF8AD0, #A855F7 52%, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 7px 20px rgba(168,85,247,0.50), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.28)',
              animation: 'vee-breathe-scale 3.4s ease-in-out infinite',
              touchAction: 'none',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          >
            <span style={{
              color: 'rgba(255,255,255,0.97)', fontSize: 22, fontWeight: 300, lineHeight: 1,
              fontFamily: "'Outfit','Inter',system-ui,sans-serif",
              textShadow: '0 1px 3px rgba(0,0,0,0.35)', letterSpacing: '0.01em',
            }}>V</span>
          </div>
        </div>
      </button>

      <VeeWheel
        active={wheelOpen}
        currentPath={location.pathname}
        onSelect={onWheelSelect}
        onClose={() => setWheelOpen(false)}
        centerX={orbCenter.x}
        centerY={orbCenter.y}
      />
    </>
  );
};

// Memoised alongside Navbar: the breathing V pebble re-renders only on its own
// route-driven state, never on unrelated parent re-renders → no replayed breathe.
export const TiviModeToggle = React.memo(TiviModeToggleImpl);
