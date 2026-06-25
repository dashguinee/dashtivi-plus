import React, { useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tap } from '@/lib/haptics';
import { VeeCanvas, type VeeAction } from './VeeCanvas';

/**
 * VeePebble — the AI concierge at the heart of the nav.
 * Technique = the Giraf "G" textured pebble (radial off-center light = soft 3D),
 * recolored to VEE's identity: iridescent pink→violet→blue, BREATHING.
 *   TAP  = toggle Live → Movies → Series
 *   HOLD = "Vee's canvas" — a full-screen ambient hold experience, PORTALED to
 *          document.body (z 10000) so it escapes the Navbar stacking context
 *          that used to mask the old wheel.
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
  const [canvasOpen, setCanvasOpen] = useState(false);

  const openCanvas = useCallback(() => {
    // Vee HOLD DISABLED for now — the canvas was rendering black on device.
    // Tap-cycle (Live/Movies/Series) only. Re-enable by restoring:
    //   held.current = true; tap(); setCanvasOpen(true);
    // (setCanvasOpen is still used by VeeCanvas's onClose, so no dead code.)
    void setCanvasOpen;
  }, []);

  const onDown = useCallback((e: React.PointerEvent) => {
    held.current = false;
    tap();
    // Capture the pointer for the whole hold — without this the release landed on
    // the canvas backdrop and dissolved it the instant it opened (the "fudge").
    e.currentTarget.setPointerCapture?.(e.pointerId);
    holdTimer.current = setTimeout(openCanvas, 420);
  }, [openCanvas]);

  const onUp = useCallback(() => {
    clearTimeout(holdTimer.current);
    if (!held.current && !canvasOpen) navigate(nextRoute(location.pathname));
  }, [navigate, location.pathname, canvasOpen]);

  // The canvas itself dispatches Live/Movies/Series/Search/Ask navigation;
  // selecting Live/Movies/Series/Search closes the canvas, Ask keeps it open
  // (it drops the founder into the compose surface).
  const onSelect = useCallback((a: VeeAction) => {
    held.current = false;
    if (a !== 'ask') setCanvasOpen(false);
  }, []);

  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
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
          // While the canvas is open the pebble fades + contracts — the bar
          // reads as having *collapsed into* the morphed Vee pill above, not
          // as a separate overlay popping in.
          opacity: canvasOpen ? 0 : 1,
          transform: canvasOpen ? 'scale(0.7)' : 'scale(1)',
          transition: 'opacity 0.32s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <span style={{
          color: 'rgba(255,255,255,0.97)', fontSize: 22, fontWeight: 300, lineHeight: 1,
          fontFamily: "'Outfit','Inter',system-ui,sans-serif",
          textShadow: '0 1px 3px rgba(0,0,0,0.35)', letterSpacing: '0.01em',
        }}>V</span>
      </div>
      <VeeCanvas
        active={canvasOpen}
        onSelect={onSelect}
        onClose={() => { setCanvasOpen(false); held.current = false; }}
      />
    </button>
  );
};
