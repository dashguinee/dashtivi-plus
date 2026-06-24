import React, { useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tap } from '@/lib/haptics';
import { VeeWheel, type VeeAction } from './VeeWheel';

/**
 * VeePebble — the AI concierge at the heart of the nav.
 * Technique = the Giraf "G" textured pebble (radial off-center light = soft 3D),
 * recolored to VEE's identity: iridescent pink→violet→blue, BREATHING.
 *   TAP  = toggle Live → Movies → Series
 *   HOLD = Vee's floating quick-actions wheel (Giraf OrbitalWheel)
 */
const CYCLE = ['/', '/movies', '/series'];
function nextRoute(path: string): string {
  const i = CYCLE.findIndex((r) => (r === '/' ? path === '/' : path.startsWith(r)));
  return CYCLE[(i < 0 ? 0 : i + 1) % CYCLE.length];
}

export const TiviModeToggle: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);
  const [wheel, setWheel] = useState<{ x: number; y: number } | null>(null);

  const openWheel = useCallback(() => {
    held.current = true;
    tap();
    const r = ref.current?.getBoundingClientRect();
    if (r) setWheel({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }, []);

  const onDown = useCallback(() => {
    held.current = false;
    tap();
    holdTimer.current = setTimeout(openWheel, 420);
  }, [openWheel]);

  const onUp = useCallback(() => {
    clearTimeout(holdTimer.current);
    if (!held.current && !wheel) navigate(nextRoute(location.pathname));
  }, [navigate, location.pathname, wheel]);

  const onLeave = useCallback(() => { clearTimeout(holdTimer.current); }, []);

  const onSelect = useCallback((a: VeeAction) => {
    setWheel(null); held.current = false;
    if (a === 'live') navigate('/');
    else if (a === 'movies') navigate('/movies');
    else if (a === 'series') navigate('/series');
    else if (a === 'ask') { navigate('/explore'); }
    else if (a === 'search') navigate('/movies');
  }, [navigate]);

  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onLeave}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Vee — tap to switch Live / Movies / Series, hold for actions"
      className="relative flex items-center justify-center flex-1 h-full"
    >
      <style>{`
        @keyframes vee-breathe {
          0%,100% { box-shadow: 0 6px 16px rgba(168,85,247,0.40), 0 0 18px rgba(255,107,157,0.22), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.28); transform: scale(1); }
          50%     { box-shadow: 0 8px 26px rgba(168,85,247,0.60), 0 0 30px rgba(59,130,246,0.30), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.28); transform: scale(1.045); }
        }
      `}</style>
      <div
        ref={ref}
        style={{
          width: 46, height: 46, borderRadius: 15, marginTop: -14,
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
      <VeeWheel
        active={!!wheel}
        centerX={wheel?.x ?? 0}
        centerY={wheel?.y ?? 0}
        onSelect={onSelect}
        onClose={() => { setWheel(null); held.current = false; }}
      />
    </button>
  );
};
