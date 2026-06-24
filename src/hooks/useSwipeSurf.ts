/**
 * useSwipeSurf — the "new-era remote".
 *
 * Swipe LEFT/RIGHT on a video surface to surf channels (next/prev). The swipe
 * IS the remote — no buttons. A reusable hook any playing surface can attach.
 *
 * COEXISTENCE (this is where swipe gestures usually go wrong — handled here):
 *   • Only a HORIZONTAL-DOMINANT swipe past a threshold triggers a surf:
 *       |dx| > threshold  AND  |dx| > |dy| * ratio.
 *     Swipe-right → onPrev, swipe-left → onNext.
 *   • Vertical swipes, taps, and short drags PASS THROUGH untouched — so this
 *     does NOT fight page scroll, the close/minimize gesture, the seek scrubber,
 *     or tap-to-toggle-controls. We never call preventDefault unless we have
 *     already committed to a horizontal surf.
 *   • Gestures that START on an interactive control are ignored — opt out with
 *     a `data-no-surf` attribute, or just be a <button>/<input>/[role=slider].
 *
 * Returns handlers to spread onto a surface element. Pointer Events cover both
 * touch and mouse (so it's testable with a synthesized desktop drag too).
 */
import { useCallback, useRef } from 'react';

export interface SwipeSurfOptions {
  /** Swipe-right → previous channel. */
  onPrev?: () => void;
  /** Swipe-left → next channel. */
  onNext?: () => void;
  /** Master switch — when false the hook is inert (e.g. disable on VOD). */
  enabled?: boolean;
  /** Minimum horizontal distance (px) to commit a surf. Default 60. */
  threshold?: number;
  /** dx must exceed dy by this ratio to count as horizontal. Default 1.5. */
  ratio?: number;
  /**
   * Optional visual hook — called continuously with the live horizontal drag
   * delta (px) while a horizontal-dominant gesture is in progress, then with 0
   * when the gesture settles. Lets a surface render a subtle slide/peek.
   */
  onDrag?: (dx: number) => void;
  /** Cooldown (ms) after a surf before another can fire. Default 350. */
  cooldown?: number;
}

interface Tracker {
  id: number;
  x: number;
  y: number;
  t: number;
  /** Has this gesture locked into a horizontal surf intent? */
  locked: boolean;
  /** Did it start on an interactive / opt-out target? */
  ignored: boolean;
}

const INTERACTIVE = 'button, a, input, textarea, select, [role="slider"], [data-no-surf]';

function startsOnInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(INTERACTIVE);
}

export function useSwipeSurf(opts: SwipeSurfOptions) {
  const {
    onPrev,
    onNext,
    enabled = true,
    threshold = 60,
    ratio = 1.5,
    onDrag,
    cooldown = 350,
  } = opts;

  const trackRef = useRef<Tracker | null>(null);
  const lastSurfRef = useRef(0);

  // Keep latest callbacks/flags without re-creating the handlers each render.
  const cbRef = useRef({ onPrev, onNext, enabled, threshold, ratio, onDrag, cooldown });
  cbRef.current = { onPrev, onNext, enabled, threshold, ratio, onDrag, cooldown };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const c = cbRef.current;
    if (!c.enabled) return;
    // Only primary pointer (ignore multi-touch — that's pinch/other gestures).
    if (!e.isPrimary) { trackRef.current = null; return; }
    trackRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      locked: false,
      ignored: startsOnInteractive(e.target),
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const t = trackRef.current;
    const c = cbRef.current;
    if (!t || t.id !== e.pointerId || t.ignored || !c.enabled) return;

    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!t.locked) {
      // Decide direction once we've moved enough to read intent.
      if (absDx < 10 && absDy < 10) return; // still a tap-sized jitter — wait
      if (absDy > absDx) {
        // Vertical-dominant — this is a scroll / close gesture. Bow out for the
        // rest of this pointer sequence; let it pass through cleanly.
        t.ignored = true;
        return;
      }
      // Horizontal-dominant — lock into surf intent.
      t.locked = true;
    }

    // Locked horizontal: report drag for the slide/peek visual.
    c.onDrag?.(dx);
  }, []);

  const finish = useCallback((e: React.PointerEvent) => {
    const t = trackRef.current;
    const c = cbRef.current;
    trackRef.current = null;
    if (!t || t.id !== e.pointerId) return;
    c.onDrag?.(0); // settle the visual regardless of outcome
    if (t.ignored || !t.locked || !c.enabled) return;

    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Final gate: horizontal-dominant AND past threshold.
    if (absDx <= c.threshold || absDx <= absDy * c.ratio) return;

    const now = Date.now();
    if (now - lastSurfRef.current < c.cooldown) return;
    lastSurfRef.current = now;

    if (dx > 0) c.onPrev?.();
    else c.onNext?.();
  }, []);

  const onPointerUp = finish;
  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    const t = trackRef.current;
    trackRef.current = null;
    if (t && t.id === e.pointerId) cbRef.current.onDrag?.(0);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
