import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tap, click, confirm, heavy } from '@/lib/haptics';

/* ════════════════════════════════════════════════════════════════════
   useTactileGestures + <TactileSurface> — "Motion as identity," lifted out.

   The gesture grammar that used to live ONLY inside TactilePosterCard, now a
   content-agnostic, reusable layer ANY surface can wear:

   • DRAG    — 1:1 INSTANT. translate3d tracks the finger exactly (GPU). Locks
               to horizontal intent; vertical bails so the page scrolls.
   • SWIPE L — past COMMIT_FRACTION of width OR a flick (vel ≥ FLICK_VELOCITY)
               → onSwipeLeft. (A poster flings off-left + hides; a hero, which
               must not be swiped-away, simply omits this callback → springs.)
   • SWIPE R — past commit OR flick → onSwipeRight.
   • LONG-PRESS (LIFT_MS) → the surface LIFTS (scale + depth shadow + glow), the
               WORLD BLURS, and a radial menu of `longPressActions[]` fans out.
               Drag onto an action to arm (highlight + haptic); release fires it,
               release on the surface cancels. All in-place — NO route change.
   • TAP     — a press-release with no drag and no lift → onTap.
   • RELEASE without commit → SPRING back (SNAP).

   The EXACT feel is preserved: constants, snap curve, lift blur, haptics.

   USAGE — two ways, same engine:
     1. <TactileSurface actions={[…]} width={w} onTap={…} onSwipeLeft={…}>
          {child}
        </TactileSurface>
     2. const g = useTactileGestures({ actions, width, onTap, … });
        return <div {...g.handlers}>{g.overlay}<div style={g.bodyStyle}>…</div></div>
        (use this when a surface needs to weave the lift transform into its OWN
         layout — e.g. the player, which owns a full-screen container.)
   ════════════════════════════════════════════════════════════════════ */

// ── FEEL CONSTANTS (the user's signature — do not soften) ──────────────
export const COMMIT_FRACTION = 0.3;   // 30% of width = committed swipe
export const FLICK_VELOCITY = 0.3;    // px/ms — a flick commits regardless of distance
export const SNAP = 'transform 0.36s cubic-bezier(0.34,1.26,0.4,1)'; // overshoot spring
export const LIFT_MS = 280;           // long-press threshold
export const LIFT_BLUR = 11;          // world blur on lift (px)
const DRAG_LOCK_PX = 8;               // movement before we lock horizontal intent

// Warm-luxury palette
const VIOLET = '#9D4EDD';
const SEAL = '#1A0F2E';

// One-time keyframe injection (we may not touch globals.css).
let _kfInjected = false;
function injectKeyframes() {
  if (_kfInjected || typeof document === 'undefined') return;
  _kfInjected = true;
  const s = document.createElement('style');
  s.textContent = `
@keyframes tactile-veil-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tactile-action-in { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(s);
}

/** A single radial menu action. `id` is free-form so any surface can name its own. */
export interface TactileAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onFire: () => void;
}

export interface TactileConfig {
  /** Surface width in px — drives commit math + ring radius. */
  width: number;
  /** Radial menu fanned out on long-press. Empty/omitted → long-press is inert. */
  actions?: TactileAction[];
  onTap?: () => void;
  /** Committed left swipe (flick or past commit). Omit → left swipe springs back. */
  onSwipeLeft?: () => void;
  /** Committed right swipe. Omit → right swipe springs back. */
  onSwipeRight?: () => void;
  /** Notified when THIS surface grabs/releases — drives cluster drift etc. */
  onActiveChange?: (active: boolean) => void;
  /** Fling the body off-edge on a committed swipe (poster hide). Default false:
   *  the surface stays put and only the callback fires (hero / player). */
  flingOnSwipe?: boolean;
  /** Master switch — when false the engine is inert (handlers no-op). */
  enabled?: boolean;
}

export type TactilePhase = 'idle' | 'dragging' | 'lifted' | 'flung-left' | 'flung-right';

export interface TactileGestures {
  /** Spread onto the surface element. */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
  /** Ref to attach to the body element being moved (for ring hit-testing geometry). */
  surfaceRef: React.RefObject<HTMLDivElement>;
  phase: TactilePhase;
  /** Live horizontal offset (1:1) in px. */
  dx: number;
  lifted: boolean;
  dragging: boolean;
  fling: boolean;
  /** 0→1 progress toward a swipe commit (telegraphs intent). */
  commitT: number;
  /** Currently-armed action id (while lifted), or null. */
  armed: string | null;
  /** The world-blur veil + radial ring — render this ABOVE the surface body. */
  overlay: React.ReactNode;
  /** A ready-made transform for the body (lift scale + 1:1 dx + tilt). */
  bodyTransform: string;
  /** A ready-made transition string matching the current phase. */
  bodyTransition: string;
}

export function useTactileGestures(config: TactileConfig): TactileGestures {
  const {
    width,
    actions = [],
    onTap,
    onSwipeLeft,
    onSwipeRight,
    onActiveChange,
    flingOnSwipe = false,
    enabled = true,
  } = config;

  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const [phase, setPhase] = useState<TactilePhase>('idle');
  const [dx, setDx] = useState(0);
  const [armed, setArmed] = useState<string | null>(null);
  const [ringIn, setRingIn] = useState(false);

  // Gesture bookkeeping — refs so the move handler reads them without re-render.
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const lockedH = useRef(false);
  const liftTimer = useRef<number | null>(null);
  const liftedRef = useRef(false);
  const movedRef = useRef(false); // did the finger travel? (tap vs drag)
  const phaseRef = useRef<TactilePhase>('idle');
  const dxRef = useRef(0);
  useEffect(() => { dxRef.current = dx; }, [dx]);

  const setPhaseBoth = (p: TactilePhase) => { phaseRef.current = p; setPhase(p); };
  const setActive = useCallback((a: boolean) => onActiveChange?.(a), [onActiveChange]);

  // Latest config without re-creating handlers each render.
  const cbRef = useRef({ actions, onTap, onSwipeLeft, onSwipeRight, flingOnSwipe, enabled, width });
  cbRef.current = { actions, onTap, onSwipeLeft, onSwipeRight, flingOnSwipe, enabled, width };

  useEffect(() => { injectKeyframes(); }, []);
  useEffect(() => {
    if (phase === 'lifted') {
      setRingIn(false);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setRingIn(true)));
      return () => cancelAnimationFrame(id);
    }
    setRingIn(false);
  }, [phase]);

  // Geometry of the ring (centered on the surface, fanned across an upward arc).
  const RING_R = Math.max(96, width * 0.92);
  const ringPos = useCallback((i: number, n: number) => {
    const a0 = -200, a1 = 20;
    const t = n === 1 ? 0.5 : i / (n - 1);
    const deg = a0 + (a1 - a0) * t;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad) * RING_R, y: Math.sin(rad) * RING_R };
  }, [RING_R]);

  // Which action (if any) the finger is hovering, while lifted.
  const hitTest = useCallback((px: number, py: number): string | null => {
    const el = ref.current;
    const acts = cbRef.current.actions;
    if (!el || acts.length === 0) return null;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const fx = px - cx;
    const fy = py - cy;
    if (Math.abs(fx) < r.width / 2 && Math.abs(fy) < r.height / 2) return null; // cancel zone
    let best: string | null = null;
    let bestD = 64 * 64; // 64px pickup radius
    acts.forEach((a, i) => {
      const p = ringPos(i, acts.length);
      const d = (fx - p.x) ** 2 + (fy - p.y) ** 2;
      if (d < bestD) { bestD = d; best = a.id; }
    });
    return best;
  }, [ringPos]);

  const clearLiftTimer = () => {
    if (liftTimer.current !== null) { clearTimeout(liftTimer.current); liftTimer.current = null; }
  };

  // ── POINTER DOWN — start tracking, arm the long-press lift timer ────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!cbRef.current.enabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    velocity.current = 0;
    lockedH.current = false;
    liftedRef.current = false;
    movedRef.current = false;
    setArmed(null);
    setActive(true);
    setPhaseBoth('dragging');

    // Only arm the lift if there's a menu to fan out.
    if (cbRef.current.actions.length > 0) {
      liftTimer.current = window.setTimeout(() => {
        if (Math.abs(dxRef.current) < 12) {
          liftedRef.current = true;
          setPhaseBoth('lifted');
          setDx(0); dxRef.current = 0;
          heavy(); // "it lifted off the table" thunk
        }
      }, LIFT_MS) as unknown as number;
    }
  }, [setActive]);

  // ── POINTER MOVE — 1:1 drag, or hit-test the ring while lifted ──────────
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!cbRef.current.enabled) return;
    const now = performance.now();
    const mx = e.clientX - startX.current;
    const my = e.clientY - startY.current;

    if (liftedRef.current) {
      const hit = hitTest(e.clientX, e.clientY);
      setArmed((prev) => { if (hit !== prev && hit) tap(); return hit; });
      return;
    }

    if (!lockedH.current) {
      if (Math.abs(mx) > DRAG_LOCK_PX || Math.abs(my) > DRAG_LOCK_PX) {
        movedRef.current = true;
        if (Math.abs(my) > Math.abs(mx)) { releaseRef.current(false); return; }
        lockedH.current = true;
        clearLiftTimer(); // moved → it's a swipe, not a press
      } else {
        return;
      }
    }

    const dt = now - lastT.current || 1;
    const vx = (e.clientX - lastX.current) / dt;
    velocity.current = velocity.current * 0.6 + vx * 0.4;
    lastX.current = e.clientX;
    lastT.current = now;

    setDx(mx); // 1:1 INSTANT — the surface IS the finger
  }, [hitTest]);

  // ── COMMIT / SPRING-BACK ────────────────────────────────────────────────
  const release = useCallback((doHit: boolean) => {
    const c = cbRef.current;
    clearLiftTimer();
    setActive(false);

    // Lifted release → fire armed action or cancel.
    if (liftedRef.current) {
      const a = c.actions.find((x) => x.id === armed);
      if (doHit && a) { click(); a.onFire(); }
      liftedRef.current = false;
      setArmed(null);
      setPhaseBoth('idle');
      setDx(0);
      return;
    }

    // Pure tap — pressed + released, never travelled, never lifted.
    if (doHit && !movedRef.current && !lockedH.current) {
      c.onTap?.();
      setPhaseBoth('idle');
      setDx(0);
      return;
    }

    const committedDist = Math.abs(dxRef.current) > c.width * COMMIT_FRACTION;
    const flick = Math.abs(velocity.current) >= FLICK_VELOCITY;
    const goRight = dxRef.current > 0;

    if ((committedDist || flick) && lockedH.current) {
      const handler = goRight ? c.onSwipeRight : c.onSwipeLeft;
      if (handler) {
        if (goRight) {
          // RIGHT — confirm pulse.
          confirm();
          handler();
          if (c.flingOnSwipe) {
            setPhaseBoth('flung-right');
            setDx(c.width * 1.15);
            window.setTimeout(() => { setPhaseBoth('idle'); setDx(0); }, 240);
          } else {
            setPhaseBoth('idle');
            setDx(0);
          }
        } else {
          // LEFT.
          heavy();
          if (c.flingOnSwipe) {
            setPhaseBoth('flung-left');
            setDx(-c.width * 1.4);
            window.setTimeout(() => { handler(); setPhaseBoth('idle'); setDx(0); }, 300);
          } else {
            handler();
            setPhaseBoth('idle');
            setDx(0);
          }
        }
        lockedH.current = false;
        return;
      }
    }

    // No commit (or no handler) → SPRING BACK with overshoot.
    setPhaseBoth('idle');
    setDx(0);
    lockedH.current = false;
  }, [armed, setActive]);

  // releaseRef lets onPointerMove call the latest release without a dep cycle.
  const releaseRef = useRef(release);
  useEffect(() => { releaseRef.current = release; }, [release]);

  const onPointerUp = useCallback(() => { if (cbRef.current.enabled) release(true); }, [release]);
  const onPointerCancel = useCallback(() => { if (cbRef.current.enabled) release(false); }, [release]);

  useEffect(() => () => clearLiftTimer(), []);

  // ── DERIVED VISUALS ─────────────────────────────────────────────────────
  const lifted = phase === 'lifted';
  const dragging = phase === 'dragging' && lockedH.current;
  const fling = phase === 'flung-left' || phase === 'flung-right';
  const commitT = Math.min(1, Math.abs(dx) / (width * COMMIT_FRACTION));
  const rot = (dx / width) * 7;

  const bodyTransition = dragging
    ? 'none'
    : lifted
    ? 'transform 0.22s cubic-bezier(0.34,1.26,0.4,1), box-shadow 0.22s ease'
    : phase === 'flung-left'
    ? 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s ease'
    : phase === 'flung-right'
    ? 'transform 0.24s cubic-bezier(0.2,0.8,0.3,1)'
    : SNAP;

  const bodyTransform = `translate3d(${dx}px, 0, 0) rotate(${lifted ? 0 : rot}deg) scale(${lifted ? 1.08 : 1})`;

  const acts = actions;
  const overlay = (
    <>
      {/* World-blur veil — only while lifted. NO route change. */}
      {lifted && (
        <div
          className="fixed inset-0 z-[60]"
          style={{
            backdropFilter: `blur(${LIFT_BLUR}px)`,
            WebkitBackdropFilter: `blur(${LIFT_BLUR}px)`,
            background: 'radial-gradient(circle at center, rgba(26,15,46,0.30) 0%, rgba(8,5,16,0.66) 100%)',
            animation: 'tactile-veil-in 0.22s ease both',
          }}
          onPointerUp={onPointerUp}
          onPointerMove={onPointerMove}
        />
      )}
      {/* Radial action ring — fans over the blurred world while lifted. */}
      {lifted && acts.map((a, i) => {
        const p = ringPos(i, acts.length);
        const isArmed = armed === a.id;
        return (
          <div
            key={a.id}
            className="absolute left-1/2 top-1/2 flex flex-col items-center gap-1 pointer-events-none"
            style={{
              transform: ringIn
                ? `translate(-50%,-50%) translate3d(${p.x}px, ${p.y}px, 0) scale(${isArmed ? 1.18 : 1})`
                : `translate(-50%,-50%) translate3d(0px, 0px, 0) scale(0.4)`,
              transition: `transform 0.3s cubic-bezier(0.34,1.26,0.4,1) ${i * 0.022}s, opacity 0.2s ease`,
              opacity: ringIn ? 1 : 0,
              zIndex: 80,
            }}
          >
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                color: '#fff',
                background: isArmed ? a.color : 'rgba(26,15,46,0.85)',
                border: `1px solid ${isArmed ? a.color : 'rgba(157,78,221,0.4)'}`,
                boxShadow: isArmed
                  ? `0 0 0 4px ${a.color}33, 0 8px 28px ${a.color}66`
                  : '0 6px 20px rgba(0,0,0,0.5)',
              }}
            >
              {a.icon}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide whitespace-nowrap"
              style={{ color: isArmed ? a.color : 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {a.label}
            </span>
          </div>
        );
      })}
    </>
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    surfaceRef: ref,
    phase,
    dx,
    lifted,
    dragging,
    fling,
    commitT,
    armed,
    overlay,
    bodyTransform,
    bodyTransition,
  };
}

/* ─────────────────────────────────────────────────────────────────────
   <TactileSurface> — the thin wrapper. Wears the engine for surfaces that
   want a drop-in: pass a width + action set + callbacks, give it a child,
   and it handles the veil, ring, lift transform, and swipe-intent telegraph.
   `renderSwipeHint` lets a surface paint its own L/R intent overlays.
   ───────────────────────────────────────────────────────────────────── */
export const TactileSurface: React.FC<{
  children: React.ReactNode;
  width: number;
  actions?: TactileAction[];
  onTap?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onActiveChange?: (active: boolean) => void;
  flingOnSwipe?: boolean;
  enabled?: boolean;
  /** Extra box-shadow recipe per phase (poster vs hero differ). */
  shadow?: (phase: { lifted: boolean; dragging: boolean }) => string | undefined;
  borderRadius?: number;
  /** Paint custom L/R swipe-intent overlays (gets live dx + commitT). */
  renderSwipeHint?: (s: { dx: number; commitT: number; dragging: boolean }) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  width,
  actions,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  onActiveChange,
  flingOnSwipe = false,
  enabled = true,
  shadow,
  borderRadius = 14,
  renderSwipeHint,
  className,
  style,
}) => {
  const g = useTactileGestures({
    width, actions, onTap, onSwipeLeft, onSwipeRight, onActiveChange, flingOnSwipe, enabled,
  });
  const fadeOnHide = g.phase === 'flung-left' ? 0 : 1;

  return (
    <>
      {g.overlay}
      <div
        ref={g.surfaceRef}
        className={`relative select-none touch-none ${className ?? ''}`}
        style={{
          width,
          zIndex: g.lifted ? 70 : g.dragging || g.fling ? 40 : 'auto',
          touchAction: 'pan-y',
          ...style,
        }}
        {...g.handlers}
      >
        <div
          style={{
            transform: g.bodyTransform,
            transition: g.bodyTransition,
            opacity: fadeOnHide,
            willChange: 'transform',
            borderRadius,
            boxShadow: shadow?.({ lifted: g.lifted, dragging: g.dragging }) ?? 'none',
          }}
        >
          {children}
          {renderSwipeHint?.({ dx: g.dx, commitT: g.commitT, dragging: g.dragging })}
        </div>
      </div>
    </>
  );
};

export { VIOLET as TACTILE_VIOLET, SEAL as TACTILE_SEAL };
