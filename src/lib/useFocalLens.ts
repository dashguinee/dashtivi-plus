/**
 * useFocalLens — a FISH-EYE FOCAL PLANE for horizontal channel rows.
 *
 * A flat row is democratic; nothing draws the eye. This makes the row see like
 * an EYE: tiles passing through the horizontal CENTER of the viewport magnify
 * and come alive; edge tiles recede (smaller, softer). As you scroll, focus
 * FLOWS — the centered channel is the hero, the next inherits focus as it slides
 * in. Scrolling becomes looking.
 *
 * MECHANIC: each tile's transform `scale` (+ a subtle opacity) is driven by its
 * REAL-TIME distance from the row's horizontal centre, through a smooth gaussian
 * falloff (~3 centre tiles sit in the zoomed zone). The most-centred tile gets a
 * `lens-hero` class = the soft focal BEAM that follows the focus.
 *
 * PERF: transform/opacity only (GPU, no layout/paint reflow). One rAF-coalesced
 * write per scroll frame — NO standing rAF loop, so it sleeps when idle. Pauses
 * when the row is offscreen (IntersectionObserver) or the tab is hidden. Reads
 * are batched before writes. Respects prefers-reduced-motion (no-op, flat row).
 *
 * Usage:
 *   const lensRef = useFocalLens<HTMLDivElement>();
 *   <div ref={lensRef} className="flex overflow-x-auto ...">
 *     <button data-lens-tile className="lens-tile">…</button>   // each tile
 *     <NeonGate />                                              // non-tiles ignored
 *   </div>
 */
import { useEffect, useRef } from 'react';

interface LensOptions {
  /** Scale of the most-centred tile. Default 1.14 (tasteful, not nauseating). */
  maxScale?: number;
  /** Scale of the edge tiles. Default 0.92. */
  minScale?: number;
  /** Opacity floor for the edge tiles. Default 0.72. */
  minOpacity?: number;
  /** Falloff width in px. Default ≈ 1.15 × tile width (~3 centre tiles zoom). */
  sigma?: number;
}

export function useFocalLens<T extends HTMLElement = HTMLDivElement>(opts: LensOptions = {}) {
  const ref = useRef<T | null>(null);
  const maxScale = opts.maxScale ?? 1.14;
  const minScale = opts.minScale ?? 0.92;
  const minOpacity = opts.minOpacity ?? 0.72;
  const sigmaOpt = opts.sigma;

  useEffect(() => {
    const container = ref.current;
    if (!container || typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tiles: HTMLElement[] = [];
    const refreshTiles = () => {
      tiles = Array.from(container.querySelectorAll<HTMLElement>('[data-lens-tile]'));
    };
    refreshTiles();

    // Reduced motion → flat, democratic row. Clear any prior lens styles.
    if (reduce) {
      for (const tile of tiles) { tile.style.transform = ''; tile.style.opacity = ''; tile.style.zIndex = ''; }
      return;
    }

    let currentHero: HTMLElement | null = null;
    let ticking = false;
    let active = true; // false when offscreen or tab hidden

    const apply = () => {
      ticking = false;
      if (!active || tiles.length === 0) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const firstW = tiles[0].getBoundingClientRect().width || 120;
      const sigma = sigmaOpt ?? firstW * 1.15;
      const twoSigmaSq = 2 * sigma * sigma;

      let bestFocus = -1;
      let hero: HTMLElement | null = null;

      for (const tile of tiles) {
        const r = tile.getBoundingClientRect();
        const tc = r.left + r.width / 2;
        const dist = tc - centerX;
        // Gaussian bell: 1 at centre, smoothly → 0 toward the edges.
        const focus = Math.exp(-(dist * dist) / twoSigmaSq);
        const scale = minScale + (maxScale - minScale) * focus;
        const opacity = minOpacity + (1 - minOpacity) * focus;
        tile.style.transform = `scale(${scale.toFixed(4)})`;
        tile.style.opacity = opacity.toFixed(3);
        // Magnified tile must paint above its smaller neighbours.
        tile.style.zIndex = focus > 0.5 ? '2' : '1';
        if (focus > bestFocus) { bestFocus = focus; hero = tile; }
      }

      // BEAM: glow only the most-centred tile, and only when it's truly centred.
      // Toggled on hero CHANGE (not every frame) → near-zero cost.
      if (hero !== currentHero) {
        currentHero?.classList.remove('lens-hero');
        if (hero && bestFocus > 0.62) { hero.classList.add('lens-hero'); currentHero = hero; }
        else currentHero = null;
      } else if (currentHero && bestFocus <= 0.62) {
        currentHero.classList.remove('lens-hero');
        currentHero = null;
      }
    };

    const requestApply = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    };

    container.addEventListener('scroll', requestApply, { passive: true });

    // Re-measure when the row resizes or its tiles change (subtab filter etc.).
    const ro = new ResizeObserver(() => { requestApply(); });
    ro.observe(container);
    const mo = new MutationObserver(() => { refreshTiles(); requestApply(); });
    mo.observe(container, { childList: true });

    // Sleep when the row scrolls offscreen.
    const io = new IntersectionObserver((entries) => {
      active = entries[0]?.isIntersecting ?? true;
      if (active) requestApply();
    }, { threshold: 0 });
    io.observe(container);

    const onVis = () => { active = !document.hidden; if (active) requestApply(); };
    document.addEventListener('visibilitychange', onVis);

    // Initial paint + a follow-up after images/layout settle.
    requestApply();
    const settle = window.setTimeout(requestApply, 350);

    return () => {
      container.removeEventListener('scroll', requestApply);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.clearTimeout(settle);
      currentHero?.classList.remove('lens-hero');
    };
  }, [maxScale, minScale, minOpacity, sigmaOpt]);

  return ref;
}
