import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { Lang } from '@/i18n';
import type { CatalogChannel } from '@/lib/catalog';
import { tap } from '@/lib/haptics';
import { CategoryHero } from './CategoryHero';

/**
 * HeroDeck — a horizontally swipeable deck of CategoryHeros, one per category.
 *
 * Tivi+ home used to open on a single World Cup hero. This turns that top slot
 * into a deck you swipe through: World Cup first, then each non-empty category
 * in experienceOrder, capped at 10. Each slide carries its OWN accent color.
 *
 * Feel:
 *   - Drag/swipe horizontally (pointer events). touch-action: pan-y keeps
 *     vertical page scroll alive — only an intentional horizontal drag grabs.
 *   - Spring snap to the nearest slide on release (transform translateX, no
 *     rubber-band). Fast flick or >25% drag advances; else snaps back.
 *   - When a slide SETTLES, a subtle entrance: the hero fades + scales in and
 *     its accent edge-glow blooms once, then calms. One signature, premium.
 *   - tap() haptic on each settle. Accent-tinted dot indicators.
 *
 * Performance: only the active slide ± 1 mount the real CategoryHero; the rest
 * are light placeholders, so swiping never mounts 10 heavy heros at once.
 */

export interface HeroSlide {
  /** Stable key (category display name). */
  key: string;
  /** Title to render (e.g. "World Cup", "Cinéma Live"). */
  title: string;
  accent: string;
  channels: CatalogChannel[];
  onPlay: (ch: CatalogChannel) => void;
  onSeeAll?: () => void;
}

const MAX_SLIDES = 10;
// Past this fraction of slide width (or a quick flick), commit to next/prev.
// Tactile-glass: a modest push commits — the pane goes where you shove it.
const COMMIT_FRACTION = 0.18;
const FLICK_VELOCITY = 0.32; // px/ms — a light flick advances

// A few fairy-dust motes trailing the brush stroke — hand-placed so they read
// as following the diagonal sweep (top-left → bottom-right), not random noise.
// Restrained: 6 motes, staggered delays, varied sizes. Accent-colored at render.
const SPARKLES: { left: string; top: string; size: number; delay: number }[] = [
  { left: '24%', top: '30%', size: 4, delay: 0.16 },
  { left: '40%', top: '54%', size: 3, delay: 0.26 },
  { left: '52%', top: '22%', size: 5, delay: 0.32 },
  { left: '63%', top: '60%', size: 3, delay: 0.40 },
  { left: '74%', top: '38%', size: 4, delay: 0.46 },
  { left: '85%', top: '56%', size: 3, delay: 0.54 },
];

export function HeroDeck({
  slides,
  lang,
  onActiveChange,
}: {
  slides: HeroSlide[];
  lang: Lang;
  /** Fires with the active slide index whenever the deck settles (and on mount).
   *  Lets the page DRIVE a top hero from the carousel's current category. */
  onActiveChange?: (index: number) => void;
}) {
  // Cap + skip empties (defensive — callers should already skip, but enforce).
  const deck = useMemo(
    () => slides.filter((s) => s.channels.length > 0).slice(0, MAX_SLIDES),
    [slides],
  );

  const [index, setIndex] = useState(0);
  // settleNonce changes each time a slide settles → retriggers the entrance.
  const [settleNonce, setSettleNonce] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);

  // Drag state (refs — no re-render per pointer move).
  const dragging = useRef(false);
  const grabbed = useRef(false); // crossed the horizontal-intent threshold
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const [dragOffset, setDragOffset] = useState(0); // live px offset while grabbed
  const [snapping, setSnapping] = useState(false);

  const clampIdx = useCallback(
    (i: number) => Math.max(0, Math.min(deck.length - 1, i)),
    [deck.length],
  );

  const settleTo = useCallback((i: number) => {
    const next = clampIdx(i);
    setIndex(next);
    setSnapping(true);
    setDragOffset(0);
    // The entrance + haptic fire when the slide has settled into place.
    setSettleNonce((n) => n + 1);
    tap();
  }, [clampIdx]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (deck.length <= 1) return;
    dragging.current = true;
    grabbed.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    velocity.current = 0;
    setSnapping(false);
  }, [deck.length]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Decide intent once: horizontal drag grabs; vertical lets the page scroll.
    if (!grabbed.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical — release to the page scroll, abandon this gesture.
        dragging.current = false;
        return;
      }
      grabbed.current = true;
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* noop */ }
    }

    const now = performance.now();
    const dt = now - lastT.current;
    if (dt > 0) velocity.current = (e.clientX - lastX.current) / dt;
    lastX.current = e.clientX;
    lastT.current = now;

    // Edge resistance — soft, no bouncy rubber-band.
    let off = dx;
    const atStart = index === 0 && dx > 0;
    const atEnd = index === deck.length - 1 && dx < 0;
    if (atStart || atEnd) off = dx * 0.32;
    setDragOffset(off);
  }, [index, deck.length]);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!grabbed.current) return; // tap / vertical — nothing to snap
    grabbed.current = false;

    const w = widthRef.current || 1;
    const off = dragOffset;
    const v = velocity.current;
    let target = index;
    if (off < -w * COMMIT_FRACTION || v < -FLICK_VELOCITY) target = index + 1;
    else if (off > w * COMMIT_FRACTION || v > FLICK_VELOCITY) target = index - 1;

    const clamped = clampIdx(target);
    if (clamped !== index) {
      settleTo(clamped);
    } else {
      // Snap back to current — still a settle (re-bloom feels intentional).
      setSnapping(true);
      setDragOffset(0);
    }
  }, [dragOffset, index, clampIdx, settleTo]);

  // Report the active category to the page so it can drive the top hero.
  // Fires on mount (index 0) and on every settle / dot-jump (index change).
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  useEffect(() => {
    onActiveChangeRef.current?.(index);
  }, [index]);

  // Measure slide width (the track width = one slide).
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) widthRef.current = trackRef.current.clientWidth;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (deck.length === 0) return null;

  const w = widthRef.current || 0;
  const baseTranslate = w > 0 ? -(index * w) : 0;
  const translate = baseTranslate + (grabbed.current ? dragOffset : 0);

  // ── Fairy / water TRAIL that follows the DRAG (Task C) ──────────────
  // A soft accent glow streak + a few drifting motes that ride the live
  // dragOffset, then dissolve as the slide settles into the paintbrush reveal.
  // GPU-cheap: only transforms/opacity, accent-driven, no per-frame JS beyond
  // the dragOffset we already track.
  const activeAccent = deck[index]?.accent || '#22C55E';
  const activeAccentRgb = hexToRgb(activeAccent);
  const dragActive = grabbed.current && Math.abs(dragOffset) > 4;
  // Normalize drag progress (0→1) for trail intensity; cap so it never blooms out.
  const dragMag = w > 0 ? Math.min(1, Math.abs(dragOffset) / (w * 0.6)) : 0;
  // Lag the trail a touch behind the finger so it reads as a wake, not a cursor.
  const trailX = dragOffset * 0.82;

  return (
    <section className="px-4 select-none">
      <div
        className="relative overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translate3d(${translate}px,0,0)`,
            // Tactile-glass snap: quick + decisive with a touch of weight (slight
            // overshoot = the pane "docking" into place, not drifting in).
            transition: snapping ? 'transform 0.36s cubic-bezier(0.34,1.26,0.4,1)' : 'none',
            willChange: 'transform',
          }}
          onTransitionEnd={() => setSnapping(false)}
        >
          {deck.map((s, i) => {
            const active = i === index;
            // EVERY slide mounts the real CategoryHero — these are light cards
            // (icon + gradient, no video), so there's no win in placeholders and
            // a real card is ready the instant you swipe to it (no pop-in).
            return (
              <div
                key={s.key}
                className="flex-shrink-0 w-full"
                style={{ width: '100%' }}
                aria-hidden={!active}
              >
                <div
                  className="relative"
                  style={
                    active
                      ? {
                          // Fairy paintbrush — the hero is "painted in" by a
                          // diagonal neon clip-path wipe (the stroke), accent
                          // driven via --accent, then it calms. No per-frame JS.
                          ['--accent' as string]: s.accent,
                          animation: `hero-deck-paint 0.72s cubic-bezier(0.22,1,0.36,1) both`,
                          clipPath: 'inset(0 0 0 0)',
                        }
                      : undefined
                  }
                  // Re-key the active slide on each settle so the entrance replays.
                  key={active ? `${s.key}-${settleNonce}` : s.key}
                >
                  {active && (
                    <>
                      {/* The glowing neon BRUSH HEAD — an accent-tinted stroke
                          of light that sweeps diagonally across, painting the
                          frame in as it passes. */}
                      <div
                        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                        style={{ zIndex: 6 }}
                        key={`brush-${settleNonce}`}
                      >
                        <div
                          className="absolute top-0 bottom-0"
                          style={{
                            width: '46%',
                            left: '-50%',
                            background:
                              `linear-gradient(105deg, transparent 0%, ${s.accent}00 30%, ${s.accent}aa 48%, #ffffffcc 50%, ${s.accent}aa 52%, ${s.accent}00 70%, transparent 100%)`,
                            filter: 'blur(2px)',
                            mixBlendMode: 'screen',
                            animation: 'hero-deck-brush 0.72s cubic-bezier(0.5,0,0.2,1) both',
                          }}
                        />
                      </div>

                      {/* Fairy-dust SPARKLES — a few accent motes trailing the
                          stroke, then they twinkle out. Pure transform/opacity. */}
                      <div
                        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                        style={{ zIndex: 7 }}
                        key={`spark-${settleNonce}`}
                      >
                        {SPARKLES.map((sp, si) => (
                          <span
                            key={si}
                            className="absolute rounded-full"
                            style={{
                              left: sp.left,
                              top: sp.top,
                              width: sp.size,
                              height: sp.size,
                              background: s.accent,
                              boxShadow: `0 0 6px ${s.accent}, 0 0 12px ${s.accent}`,
                              opacity: 0,
                              animation: `hero-deck-sparkle 0.9s ease-out ${sp.delay}s both`,
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <CategoryHero
                    title={s.title}
                    accent={s.accent}
                    channels={s.channels}
                    lang={lang}
                    onPlay={s.onPlay}
                    onSeeAll={s.onSeeAll}
                    /* PERF: only the on-screen slide runs its perpetual ambient
                       animations (light-sweep + play-lens breathe). The deck keeps
                       all slides mounted for instant swipe, but off-screen ones must
                       not burn per-frame style work. */
                    active={active}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DRAG TRAIL — a neon/water "fairy wake" following the swipe. Lives
            above the track (NOT translated by it) so it tracks the finger in
            viewport space. Opacity rides drag magnitude; dissolves on settle. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 8,
            opacity: dragActive ? 1 : 0,
            transition: 'opacity 0.32s ease-out',
            // JUST THE EFFECT — no hard clipped panel. The rounded rectangle +
            // overflow-hidden gave the glow its OWN hard background box, which
            // broke continuity and clipped a sharp edge over the dots. Removed the
            // clip; a full vertical feather gives soft top/bottom edges, the streak
            // already feathers left/right + blurs → a soft edgeless light that
            // blends into the page. No box, no rectangle, no clash with the dots.
            maskImage: 'linear-gradient(180deg, transparent 0%, #000 24%, #000 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 24%, #000 72%, transparent 100%)',
          }}
          aria-hidden
        >
          {/* Soft glow streak — a vertical accent band centered on the drag,
              lagging slightly so it reads as a wake. */}
          <div
            className="absolute top-0 bottom-0 left-1/2"
            style={{
              width: '58%',
              transform: `translate3d(calc(-50% + ${trailX}px), 0, 0)`,
              background: `linear-gradient(90deg, transparent 0%, rgba(${activeAccentRgb},${0.05 + dragMag * 0.16}) 38%, rgba(${activeAccentRgb},${0.10 + dragMag * 0.28}) 50%, rgba(${activeAccentRgb},${0.05 + dragMag * 0.16}) 62%, transparent 100%)`,
              filter: 'blur(10px)',
              mixBlendMode: 'screen',
            }}
          />
          {/* Drifting sparkle motes — ride the wake, drift opposite the drag so
              they trail behind the finger. Pure transform/opacity. */}
          {SPARKLES.map((sp, si) => (
            <span
              key={`trail-${si}`}
              className="absolute rounded-full"
              style={{
                left: sp.left,
                top: sp.top,
                width: sp.size,
                height: sp.size,
                background: activeAccent,
                boxShadow: `0 0 6px ${activeAccent}, 0 0 12px ${activeAccent}`,
                opacity: dragActive ? 0.35 + dragMag * 0.6 : 0,
                transform: `translate3d(${trailX - dragOffset * sp.delay * 1.4}px, 0, 0)`,
                transition: 'opacity 0.25s ease-out',
              }}
            />
          ))}
        </div>
      </div>

      {/* Dot indicators — accent-tinted, current slide highlighted. */}
      {deck.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {deck.map((s, i) => {
            const on = i === index;
            return (
              <button
                key={s.key}
                onClick={() => { tap(); settleTo(i); }}
                aria-label={`Slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: on ? 18 : 6,
                  height: 6,
                  background: on ? s.accent : 'rgba(255,255,255,0.2)',
                  boxShadow: on ? `0 0 8px ${s.accent}` : 'none',
                }}
              />
            );
          })}
        </div>
      )}

      <style>{`
        /* Fairy paintbrush — the frame is REVEALED by a diagonal clip-path wipe,
           as if a neon brush stroke paints it in from one corner to the other.
           Inset clip animated so the start corner is "unpainted" until the
           stroke sweeps past. Settles fully visible (inset 0). */
        @keyframes hero-deck-paint {
          0%   { clip-path: inset(0 100% 0 0); opacity: 0.4; }
          12%  { opacity: 1; }
          100% { clip-path: inset(0 0 0 0);    opacity: 1; }
        }
        /* The glowing neon brush HEAD sweeps left→right across the frame. */
        @keyframes hero-deck-brush {
          0%   { transform: translateX(0)    skewX(-12deg); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateX(330%) skewX(-12deg); opacity: 0; }
        }
        /* Fairy-dust motes — pop, drift up a touch, twinkle out. */
        @keyframes hero-deck-sparkle {
          0%   { opacity: 0; transform: scale(0.2) translateY(4px); }
          35%  { opacity: 1; transform: scale(1.15) translateY(-2px); }
          70%  { opacity: 0.8; transform: scale(0.9) translateY(-6px); }
          100% { opacity: 0; transform: scale(0.3) translateY(-12px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="hero-deck-paint"] { animation: none !important; clip-path: none !important; }
          [style*="hero-deck-brush"],
          [style*="hero-deck-sparkle"] { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </section>
  );
}

// Local lightweight hex→"r,g,b" for placeholder tint (CategoryHero has its own).
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return `${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)}`;
}
