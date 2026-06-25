import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Plus, Heart, Clapperboard, Info, Share2 } from 'lucide-react';
import { tap, click, confirm, heavy } from '@/lib/haptics';

/* ════════════════════════════════════════════════════════════════════
   TactilePosterCard — "Motion as identity."

   A movie poster that behaves like a PHYSICAL OBJECT on a table, not a
   tile in a grid. Three gestures, one feel: 1:1, instant, satisfying.

   • DRAG    — 1:1 INSTANT. translate3d tracks the finger EXACTLY, no lag,
               pure GPU. Horizontal intent only (locks out vertical scroll).
   • SWIPE L — past COMMIT_FRACTION of width OR a flick (vel ≥ FLICK_VELOCITY)
               → Hide. Card flings off-left + fades, "Hidden" ghost label.
   • SWIPE R — past commit OR flick → Watch Later. Flings right with a
               "＋ Watch Later" confirmation pulse, then settles.
   • LONG-PRESS (LIFT_MS) → the card LIFTS off the surface (scale + depth
               shadow + soft glow), the WORLD BLURS, and a radial action
               menu fans out: ▶ ＋ ❤ 🎬 ℹ 🔗. Drag onto an action to arm it
               (highlight + haptic), release to fire; release on card cancels.
               All in-place over the blurred world — NO route change.
   • RELEASE without commit → SPRING back (SNAP).

   Skin: warm-luxury — seal/violet base, gold accents, POV depth. Calm.
   ════════════════════════════════════════════════════════════════════ */

// ── FEEL CONSTANTS (the user's signature — do not soften) ──────────────
const COMMIT_FRACTION = 0.3;   // 30% of width = committed swipe
const FLICK_VELOCITY = 0.3;    // px/ms — a flick commits regardless of distance
const SNAP = 'transform 0.36s cubic-bezier(0.34,1.26,0.4,1)'; // overshoot spring
const LIFT_MS = 280;           // long-press threshold
const LIFT_BLUR = 11;          // world blur on lift (px)
const DRAG_LOCK_PX = 8;        // movement before we lock horizontal intent

// Warm-luxury palette
const VIOLET = '#9D4EDD';
const SEAL = '#1A0F2E';
const GOLD = '#E8C170';

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

export interface TactileAction {
  id: 'play' | 'later' | 'favorite' | 'trailer' | 'details' | 'share';
  label: string;
  icon: React.ReactNode;
  color: string;
  onFire: () => void;
}

interface Props {
  children: React.ReactNode;        // the poster visual (e.g. a PosterCard)
  width: number;                    // card width in px (for commit math)
  isFavorite?: boolean;
  isWatchLater?: boolean;
  actions: {
    onPlay: () => void;
    onWatchLater: () => void;
    onFavorite: () => void;
    onTrailer: () => void;
    onDetails: () => void;
    onShare: () => void;
    onHide: () => void;
  };
  /** Notified when THIS card grabs/releases — drives cluster drift in the parent. */
  onActiveChange?: (active: boolean) => void;
  labels?: { later: string; hidden: string };
}

type Phase = 'idle' | 'dragging' | 'lifted' | 'flung-left' | 'flung-right';

export const TactilePosterCard: React.FC<Props> = ({
  children,
  width,
  isFavorite,
  isWatchLater,
  actions,
  onActiveChange,
  labels = { later: '＋ Watch Later', hidden: 'Hidden' },
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [dx, setDx] = useState(0);              // live horizontal offset (1:1)
  const [armed, setArmed] = useState<TactileAction['id'] | null>(null);
  const [removed, setRemoved] = useState(false); // post-hide collapse
  const [ringIn, setRingIn] = useState(false);   // radial fan-out pop

  // Gesture bookkeeping — refs so the move handler reads them without re-render.
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const lockedH = useRef(false);
  const liftTimer = useRef<number | null>(null);
  const liftedRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const setActive = useCallback((a: boolean) => onActiveChange?.(a), [onActiveChange]);

  // Keyframes + radial pop-in: scale from collapsed to fanned-out on lift.
  useEffect(() => { injectKeyframes(); }, []);
  useEffect(() => {
    if (phase === 'lifted') {
      setRingIn(false);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setRingIn(true)));
      return () => cancelAnimationFrame(id);
    }
    setRingIn(false);
  }, [phase]);

  // Radial action ring — six actions fanned over the top arc of the lifted card.
  const ACTIONS: TactileAction[] = [
    { id: 'play', label: 'Play', icon: <Play className="w-5 h-5" fill="currentColor" />, color: VIOLET, onFire: actions.onPlay },
    { id: 'later', label: 'Watch Later', icon: <Plus className="w-5 h-5" />, color: GOLD, onFire: actions.onWatchLater },
    { id: 'favorite', label: 'Favorite', icon: <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />, color: '#FF5C8A', onFire: actions.onFavorite },
    { id: 'trailer', label: 'Trailer', icon: <Clapperboard className="w-5 h-5" />, color: '#7FC8FF', onFire: actions.onTrailer },
    { id: 'details', label: 'Details', icon: <Info className="w-5 h-5" />, color: '#C9A8FF', onFire: actions.onDetails },
    { id: 'share', label: 'Share', icon: <Share2 className="w-5 h-5" />, color: '#9AE6B4', onFire: actions.onShare },
  ];

  // Geometry of the ring (centered on the card, fanned across an upward arc).
  const RING_R = Math.max(96, width * 0.92);
  const ringPos = (i: number, n: number) => {
    // Fan from -200° to 20° so buttons arc over and around the card top.
    const a0 = -200, a1 = 20;
    const t = n === 1 ? 0.5 : i / (n - 1);
    const deg = a0 + (a1 - a0) * t;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad) * RING_R, y: Math.sin(rad) * RING_R };
  };

  // Which action (if any) the finger is hovering, while lifted.
  const hitTest = useCallback((px: number, py: number): TactileAction['id'] | null => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const fx = px - cx;
    const fy = py - cy;
    // Inside the card footprint → cancel zone.
    if (Math.abs(fx) < r.width / 2 && Math.abs(fy) < r.height / 2) return null;
    let best: TactileAction['id'] | null = null;
    let bestD = 64 * 64; // 64px pickup radius
    ACTIONS.forEach((a, i) => {
      const p = ringPos(i, ACTIONS.length);
      const d = (fx - p.x) ** 2 + (fy - p.y) ** 2;
      if (d < bestD) { bestD = d; best = a.id; }
    });
    return best;
  }, [width]);

  const clearLiftTimer = () => {
    if (liftTimer.current !== null) { clearTimeout(liftTimer.current); liftTimer.current = null; }
  };

  // ── POINTER DOWN — start tracking, arm the long-press lift timer ────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (removed) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    velocity.current = 0;
    lockedH.current = false;
    liftedRef.current = false;
    setArmed(null);
    setActive(true);
    setPhaseBoth('dragging');

    liftTimer.current = window.setTimeout(() => {
      // Only lift if the finger basically stayed put (a press, not a swipe).
      if (Math.abs(dxRef.current) < 12) {
        liftedRef.current = true;
        setPhaseBoth('lifted');
        setDx(0); dxRef.current = 0;
        heavy(); // satisfying "it lifted off the table" thunk
      }
    }, LIFT_MS) as unknown as number;
  };

  // Mirror dx into a ref so the lift timer + handlers can read it synchronously.
  const dxRef = useRef(0);
  useEffect(() => { dxRef.current = dx; }, [dx]);

  // ── POINTER MOVE — 1:1 drag, or hit-test the ring while lifted ──────────
  const onPointerMove = (e: React.PointerEvent) => {
    if (removed) return;
    const now = performance.now();
    const mx = e.clientX - startX.current;
    const my = e.clientY - startY.current;

    if (liftedRef.current) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit !== armed) { setArmed(hit); if (hit) tap(); }
      return;
    }

    // Lock to horizontal intent once movement exceeds the threshold; if it's
    // a vertical drag, bail out so the page scrolls normally.
    if (!lockedH.current) {
      if (Math.abs(mx) > DRAG_LOCK_PX || Math.abs(my) > DRAG_LOCK_PX) {
        if (Math.abs(my) > Math.abs(mx)) { release(false); return; }
        lockedH.current = true;
        clearLiftTimer(); // moved → it's a swipe, not a press
      } else {
        return;
      }
    }

    // velocity (px/ms), smoothed lightly
    const dt = now - lastT.current || 1;
    const vx = (e.clientX - lastX.current) / dt;
    velocity.current = velocity.current * 0.6 + vx * 0.4;
    lastX.current = e.clientX;
    lastT.current = now;

    // 1:1 INSTANT — the card IS the finger. (Tiny rubber-band past full width.)
    setDx(mx);
  };

  // ── COMMIT / SPRING-BACK ────────────────────────────────────────────────
  const release = useCallback((doHit: boolean) => {
    clearLiftTimer();
    setActive(false);

    // Lifted release → fire armed action or cancel.
    if (liftedRef.current) {
      const a = ACTIONS.find((x) => x.id === armed);
      if (doHit && a) { click(); a.onFire(); }
      liftedRef.current = false;
      setArmed(null);
      setPhaseBoth('idle');
      setDx(0);
      return;
    }

    const committedDist = Math.abs(dxRef.current) > width * COMMIT_FRACTION;
    const flick = Math.abs(velocity.current) >= FLICK_VELOCITY;
    const goRight = dxRef.current > 0;

    if ((committedDist || flick) && lockedH.current) {
      if (goRight) {
        // WATCH LATER — fling right, confirm pulse, then settle back.
        confirm();
        actions.onWatchLater();
        setPhaseBoth('flung-right');
        setDx(width * 1.15);
        window.setTimeout(() => { setPhaseBoth('idle'); setDx(0); }, 240);
      } else {
        // HIDE — fling off-left + fade, then collapse the slot.
        heavy();
        setPhaseBoth('flung-left');
        setDx(-width * 1.4);
        window.setTimeout(() => { setRemoved(true); actions.onHide(); }, 300);
      }
      return;
    }

    // No commit → SPRING BACK with overshoot.
    setPhaseBoth('idle');
    setDx(0);
    lockedH.current = false;
  }, [armed, width, actions]);

  const onPointerUp = () => { if (!removed) release(true); };
  const onPointerCancel = () => { if (!removed) release(false); };

  useEffect(() => () => clearLiftTimer(), []);

  // ── DERIVED VISUALS ─────────────────────────────────────────────────────
  const lifted = phase === 'lifted';
  const dragging = phase === 'dragging' && lockedH.current;
  const fling = phase === 'flung-left' || phase === 'flung-right';
  // Tilt + fade as the card slides toward a commit edge — physical, not flat.
  const commitT = Math.min(1, Math.abs(dx) / (width * COMMIT_FRACTION));
  const rot = (dx / width) * 7; // up to ~7° lean in the drag direction
  const fadeOnHide = phase === 'flung-left' ? 0 : 1;

  // Transition: NONE while finger-tracking (1:1), SNAP otherwise.
  const transition = dragging
    ? 'none'
    : lifted
    ? 'transform 0.22s cubic-bezier(0.34,1.26,0.4,1), box-shadow 0.22s ease'
    : phase === 'flung-left'
    ? 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s ease'
    : phase === 'flung-right'
    ? 'transform 0.24s cubic-bezier(0.2,0.8,0.3,1)'
    : SNAP;

  if (removed) {
    return <div style={{ width, height: 0, transition: 'height 0.3s ease', overflow: 'hidden' }} />;
  }

  return (
    <>
      {/* World blur veil — only while lifted. Sits over the page, under the card.
          NO route change — this is the whole "in-place" promise. */}
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

      <div
        ref={ref}
        className="relative select-none touch-none"
        style={{
          width,
          zIndex: lifted ? 70 : dragging || fling ? 40 : 'auto',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Radial action ring — fans out over the blurred world while lifted. */}
        {lifted && ACTIONS.map((a, i) => {
          const p = ringPos(i, ACTIONS.length);
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

        {/* The card body — the one thing the finger moves. */}
        <div
          style={{
            transform: `translate3d(${dx}px, 0, 0) rotate(${lifted ? 0 : rot}deg) scale(${lifted ? 1.08 : 1})`,
            transition,
            opacity: fadeOnHide,
            willChange: 'transform',
            borderRadius: 14,
            boxShadow: lifted
              ? `0 28px 60px rgba(8,4,16,0.7), 0 0 0 1px ${VIOLET}66, 0 0 44px ${VIOLET}55`
              : dragging
              ? `0 14px 36px rgba(8,4,16,0.5), 0 0 0 1px rgba(157,78,221,0.25)`
              : 'none',
          }}
        >
          {children}

          {/* Swipe-intent overlays — gold "＋ Watch Later" right, seal "Hidden" left.
              They breathe in with commitT so the gesture telegraphs its outcome. */}
          {dragging && dx > 4 && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-[14px] pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, ${GOLD}26)`, opacity: commitT }}
            >
              <span
                className="px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide"
                style={{
                  color: SEAL, background: GOLD,
                  transform: `scale(${0.8 + commitT * 0.25})`,
                  boxShadow: `0 4px 18px ${GOLD}88`,
                }}
              >
                {labels.later}
              </span>
            </div>
          )}
          {dragging && dx < -4 && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-[14px] pointer-events-none"
              style={{ background: `linear-gradient(270deg, transparent, rgba(26,15,46,0.55))`, opacity: commitT }}
            >
              <span
                className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(20,12,34,0.8)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  transform: `scale(${0.8 + commitT * 0.2})`,
                }}
              >
                {labels.hidden}
              </span>
            </div>
          )}

          {/* Persistent state ticks — tiny gold dot if already on Watch Later. */}
          {isWatchLater && !dragging && !lifted && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TactilePosterCard;
