import { useEffect } from 'react';

/**
 * Scroll Ambient — premium scroll-reactive atmosphere.
 *
 * Two effects, one scroll listener, zero layout thrash:
 *
 * 1. AMBIENT GRADIENT — a soft radial glow that follows scroll position.
 *    Like a spotlight tracking you down the page. Moves via CSS custom
 *    property `--ambient-y` on a fixed-position element.
 *
 * 2. ROW PROXIMITY — rows nearest viewport center get opacity 1,
 *    rows at edges soften to 0.88. Creates a natural depth-of-field
 *    where your eye goes to the brightest row. Uses IntersectionObserver
 *    with multiple thresholds — no per-frame style writes.
 *
 * Performance:
 *   - Single rAF-throttled scroll listener for gradient
 *   - IntersectionObserver for rows (browser-native, off main thread)
 *   - Only GPU-composited properties (opacity, transform via CSS var)
 *   - Respects prefers-reduced-motion
 */
export function useScrollAmbient() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ── 1. Ambient gradient follows scroll ──
    const ambientEl = document.getElementById('scroll-ambient');
    let ticking = false;

    // PERF: `scrollHeight` is a forced-layout read. Reading it EVERY scroll frame
    // (as before) reflowed the page once per frame during scroll — and on Home the
    // DOM is dirty mid-scroll (cv-row reveals, proximity opacity writes, images
    // loading), so each read flushed a full reflow → the Home scroll-FPS floor.
    // Cache it instead; recompute only when the layout actually changes (resize +
    // a ResizeObserver on body, both OFF the scroll path where layout is clean).
    let maxScroll = 1;
    const recomputeMax = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    recomputeMax();

    const updateGradient = () => {
      if (!ambientEl) return;
      // window.scrollY is a cheap cached read — NO forced layout here anymore.
      const scrollPct = Math.min(1, window.scrollY / maxScroll);
      // Move gradient vertically: 20% → 80% of viewport
      const y = 20 + scrollPct * 60;
      ambientEl.style.setProperty('--ambient-y', `${y}%`);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateGradient);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', recomputeMax, { passive: true });
    // Body height changes (lazy rows, cv reveals) update the cache off the
    // scroll path — RO fires after layout, so this read never forces a reflow.
    const sizeObs = new ResizeObserver(recomputeMax);
    sizeObs.observe(document.body);

    // ── 2. Row proximity — dim rows at viewport edges ──
    const rows = document.querySelectorAll('[data-goggle], .row-tier-hero, .row-tier-featured, .row-tier-standard');

    const proximityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            // Map intersection ratio to opacity: 0.88 at edges → 1.0 at center
            const ratio = entry.intersectionRatio;
            const opacity = 0.88 + ratio * 0.12;
            el.style.opacity = String(opacity);
            el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
          } else {
            el.style.opacity = '0.88';
          }
        }
      },
      {
        root: null,
        // Multiple thresholds for smooth opacity ramp
        threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0],
      }
    );

    rows.forEach(row => proximityObserver.observe(row));

    // Re-observe when new rows appear (lazy pages)
    const mutObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          const newRows = node.querySelectorAll?.('[data-goggle], .row-tier-hero, .row-tier-featured, .row-tier-standard');
          newRows?.forEach(r => proximityObserver.observe(r));
          if (node.matches?.('[data-goggle], .row-tier-hero, .row-tier-featured, .row-tier-standard')) {
            proximityObserver.observe(node);
          }
        }
      }
    });
    mutObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', recomputeMax);
      sizeObs.disconnect();
      proximityObserver.disconnect();
      mutObs.disconnect();
    };
  }, []);
}
