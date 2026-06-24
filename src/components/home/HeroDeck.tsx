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
const COMMIT_FRACTION = 0.25;
const FLICK_VELOCITY = 0.45; // px/ms

export function HeroDeck({ slides, lang }: { slides: HeroSlide[]; lang: Lang }) {
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
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
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
            transition: snapping ? 'transform 0.42s cubic-bezier(0.22,1,0.36,1)' : 'none',
            willChange: 'transform',
          }}
          onTransitionEnd={() => setSnapping(false)}
        >
          {deck.map((s, i) => {
            const active = i === index;
            const near = Math.abs(i - index) <= 1; // active ± 1 mount heavy content
            return (
              <div
                key={s.key}
                className="flex-shrink-0 w-full"
                style={{ width: '100%' }}
                aria-hidden={!active}
              >
                {near ? (
                  <div
                    className="relative"
                    style={
                      active
                        ? {
                            // Entrance — fade + slight scale-in on settle, then calm.
                            animation: `hero-deck-enter 0.5s cubic-bezier(0.22,1,0.36,1) both`,
                          }
                        : undefined
                    }
                    // Re-key the active slide on each settle so the entrance replays.
                    key={active ? `${s.key}-${settleNonce}` : s.key}
                  >
                    {/* Accent edge-glow bloom — blooms once on settle, then fades. */}
                    {active && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-2xl"
                        style={{
                          boxShadow: `0 0 0 1px ${s.accent}, 0 0 38px ${s.accent}`,
                          animation: `hero-deck-bloom 0.9s ease-out both`,
                          zIndex: 5,
                        }}
                        key={`bloom-${settleNonce}`}
                      />
                    )}
                    <CategoryHero
                      title={s.title}
                      accent={s.accent}
                      channels={s.channels}
                      lang={lang}
                      onPlay={s.onPlay}
                      onSeeAll={s.onSeeAll}
                    />
                  </div>
                ) : (
                  // Light placeholder for far slides — keeps layout, no heavy mount.
                  <div
                    className="rounded-2xl"
                    style={{
                      height: '34vh',
                      minHeight: 220,
                      maxHeight: 300,
                      background: `linear-gradient(160deg, rgba(${hexToRgb(s.accent)},0.06), rgba(8,10,14,0.9))`,
                      border: `1px solid rgba(${hexToRgb(s.accent)},0.12)`,
                    }}
                  />
                )}
              </div>
            );
          })}
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
        @keyframes hero-deck-enter {
          0%   { opacity: 0.25; transform: scale(0.965); }
          100% { opacity: 1;    transform: scale(1); }
        }
        @keyframes hero-deck-bloom {
          0%   { opacity: 0; }
          30%  { opacity: 0.55; }
          100% { opacity: 0; }
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
