import { useEffect } from 'react';

/**
 * Scroll Ambient — AUTONOMOUS ambient atmosphere.
 *
 * ROOT-CAUSE REWRITE: every decorative effect here used to READ scroll/
 * intersection state and write style on each input frame — that coupling
 * IS the flicker/jank. Both effects now run on their own clock via pure
 * CSS keyframes (see globals.css). This hook reads NO pointer/scroll state.
 *
 * 1. AMBIENT GRADIENT — #scroll-ambient drifts up/down via the
 *    `ambient-glow-drift` CSS keyframe. (Was: --ambient-y ← window.scrollY.)
 *
 * 2. ROW DEPTH-OF-FIELD — rows gently breathe opacity via the
 *    `goggle-breathe` CSS keyframe. (Was: IntersectionObserver wrote inline
 *    opacity from scroll proximity.) Here we only ASSIGN a randomized
 *    duration + delay per row ONCE so they're not visibly synced — never
 *    reading scroll. New lazy rows get randomized as they appear.
 *
 * Performance: zero scroll/pointer listeners, zero per-frame style writes,
 * GPU-composited CSS only, no React re-render. Respects reduced-motion.
 */
export function useScrollAmbient() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SELECTOR = '[data-goggle], .row-tier-hero, .row-tier-featured, .row-tier-standard';

    // Give each row its own breathe clock so they never pulse in lockstep —
    // organic, not mechanical. Pure phase randomization, no input state.
    const randomizePhase = (el: HTMLElement) => {
      if (el.dataset.gbPhased) return;
      el.dataset.gbPhased = '1';
      const dur = (7 + Math.random() * 6).toFixed(2);   // 7s – 13s
      const delay = (-Math.random() * 13).toFixed(2);   // negative → start mid-cycle
      el.style.setProperty('--gb-dur', `${dur}s`);
      el.style.setProperty('--gb-delay', `${delay}s`);
    };

    document.querySelectorAll<HTMLElement>(SELECTOR).forEach(randomizePhase);

    // Randomize new rows as lazy pages mount them (NOT a scroll listener).
    const mutObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          node.querySelectorAll?.<HTMLElement>(SELECTOR).forEach(randomizePhase);
          if (node.matches?.(SELECTOR)) randomizePhase(node as HTMLElement);
        }
      }
    });
    mutObs.observe(document.body, { childList: true, subtree: true });

    return () => mutObs.disconnect();
  }, []);
}
