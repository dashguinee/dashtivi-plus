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

    // Per-tile last-applied values — lets the WRITE pass skip no-op style writes
    // (compositor stays quiet when the row is still or barely moving).
    const lastApplied = new WeakMap<HTMLElement, { s: number; o: number; z: string }>();
    // Scratch buffer reused across frames — zero per-frame allocation.
    let focusBuf: number[] = [];

    const apply = () => {
      ticking = false;
      if (!active) return;
      const n = tiles.length;
      if (n === 0) return;

      // ── READ PASS — every layout read first, so the browser flushes layout
      //    ONCE per frame. No interleaved writes ⇒ zero layout thrashing. ──
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const sigma = sigmaOpt ?? ((tiles[0].offsetWidth || 120) * 1.15); // offsetWidth = unscaled
      const twoSigmaSq = 2 * sigma * sigma;
      if (focusBuf.length !== n) focusBuf = new Array(n);
      let bestFocus = -1;
      let heroIdx = -1;
      for (let i = 0; i < n; i++) {
        const r = tiles[i].getBoundingClientRect();
        const dist = (r.left + r.width / 2) - centerX;
        const focus = Math.exp(-(dist * dist) / twoSigmaSq); // gaussian bell, 1 centre → 0 edges
        focusBuf[i] = focus;
        if (focus > bestFocus) { bestFocus = focus; heroIdx = i; }
      }

      // ── WRITE PASS — transform/opacity only (GPU; no layout/paint reflow). ──
      for (let i = 0; i < n; i++) {
        const tile = tiles[i];
        const focus = focusBuf[i];
        const scale = minScale + (maxScale - minScale) * focus;
        const opacity = minOpacity + (1 - minOpacity) * focus;
        const z = focus > 0.5 ? '2' : '1';
        const prev = lastApplied.get(tile);
        if (prev && Math.abs(prev.s - scale) < 0.002 && Math.abs(prev.o - opacity) < 0.004 && prev.z === z) {
          continue; // imperceptible delta — skip the write
        }
        tile.style.transform = `scale(${scale.toFixed(4)})`;
        tile.style.opacity = opacity.toFixed(3);
        if (!prev || prev.z !== z) tile.style.zIndex = z; // magnified tile paints above neighbours
        lastApplied.set(tile, { s: scale, o: opacity, z });
      }

      // BEAM: glow only the most-centred tile, toggled on hero CHANGE (not every
      // frame) → near-zero cost.
      const hero = heroIdx >= 0 ? tiles[heroIdx] : null;
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
