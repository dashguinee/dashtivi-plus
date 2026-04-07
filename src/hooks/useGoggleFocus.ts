import { useEffect, useRef } from 'react';

/**
 * useGoggleFocus — "space goggle" viewport sweet spot.
 *
 * v2: IntersectionObserver approach — NO scroll listeners, NO per-frame transforms.
 * Sections get `data-goggle-zone` attribute based on viewport intersection.
 * CSS handles all visual transitions (glow, opacity, scale) via attribute selectors.
 *
 * Three zones:
 *   "lit"    — center 60% of viewport (the sweet spot, Tinkerbell zone)
 *   "dim"    — outer edges (subtle fade-out)
 *   removed  — fully offscreen (no attribute = base state)
 *
 * Why IntersectionObserver:
 *   - Async, off-main-thread intersection checks
 *   - Doesn't fight image loading (no layout reads)
 *   - No race conditions with height changes
 *   - Browser-optimized, zero scroll jank
 */
export function useGoggleFocus(scrollRef: React.RefObject<HTMLElement | null>) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = scrollRef.current;
    if (!el) return;

    // Two observers: one for the "lit" center zone, one for the "visible" full zone
    // Lit zone: center 60% of viewport (20% margin top/bottom excluded)
    const litObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            target.setAttribute('data-goggle-zone', 'lit');
          } else {
            // Only set to dim if still visible (handled by visibleObserver)
            if (target.getAttribute('data-goggle-zone') === 'lit') {
              target.setAttribute('data-goggle-zone', 'dim');
            }
          }
        }
      },
      {
        // Shrink the intersection zone — only the center 60% of viewport triggers "lit"
        rootMargin: '-18% 0px -22% 0px',
        threshold: 0,
      }
    );

    const visibleObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            // Entering viewport — start as dim
            if (!target.hasAttribute('data-goggle-zone')) {
              target.setAttribute('data-goggle-zone', 'dim');
            }
          } else {
            // Fully offscreen — remove attribute
            target.removeAttribute('data-goggle-zone');
          }
        }
      },
      {
        rootMargin: '50px 0px 50px 0px',
        threshold: 0,
      }
    );

    // Observe all goggle sections
    const observe = () => {
      const sections = el.querySelectorAll<HTMLElement>('[data-goggle]');
      sections.forEach((s) => {
        litObserver.observe(s);
        visibleObserver.observe(s);
      });
    };

    // Initial + re-observe when new sections load (lazy content)
    const timer = setTimeout(observe, 300);
    const mutationObserver = new MutationObserver(() => {
      // Only re-observe if new data-goggle elements appeared
      const current = el.querySelectorAll('[data-goggle]').length;
      if (current !== observedCount) {
        observedCount = current;
        observe();
      }
    });
    let observedCount = 0;
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      litObserver.disconnect();
      visibleObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [scrollRef]);
}
