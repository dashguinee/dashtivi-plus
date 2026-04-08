/**
 * DashTivi+ Haptic System — Maybach Edition
 *
 * Design: You should barely know it's there. When you feel it,
 * it confirms what your eyes already saw — never announces itself.
 *
 * Like a Maybach on cobblestone: the road exists, but the cabin
 * absorbs it into something that feels intentional, not accidental.
 *
 * Rules:
 *   - Fast flings = silence (you're traveling, no bumps)
 *   - Slow browse = whisper tick per card (you're looking, we confirm)
 *   - Actions = single precise pulse, never a pattern
 *   - Nothing fires twice for the same gesture
 *
 * Silent no-op on iOS/desktop.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// ── Interaction vocabulary ───────────────────────────────────────

/** Whisper — carousel card crossing during slow browse. 1ms, barely there */
export function tick() { if (V) navigator.vibrate(1); }

/** Tap — nav press, tab switch, pill selection. Crisp 3ms */
export function tap() { if (V) navigator.vibrate(3); }

/** Click — modal open, detail sheet, play. Firm 6ms */
export function click() { if (V) navigator.vibrate(6); }

/** Confirm — success, refresh done. Soft double-knock */
export function confirm() { if (V) navigator.vibrate([4, 60, 6]); }

/** Heavy — error, destructive. Sharp but brief */
export function heavy() { if (V) navigator.vibrate([6, 30, 6]); }

// ── Scroll haptics — velocity-aware ──────────────────────────────
//
// The key insight: fast flings should feel SMOOTH (no haptics),
// slow browsing should feel PRECISE (one tick per card).
// This mimics how luxury suspension absorbs speed bumps at high
// velocity but lets you feel the driveway texture at walking pace.

export function initScrollHaptics() {
  if (!V) return;

  const tracked = new WeakSet<Element>();

  function attach(el: Element) {
    if (tracked.has(el)) return;
    tracked.add(el);

    const htmlEl = el as HTMLElement;
    let cardW = 0;
    let lastSlot = -1;
    let lastScrollLeft = 0;
    let lastScrollTime = 0;

    el.addEventListener('scroll', () => {
      // Lazy measure card width
      if (!cardW) {
        const first = htmlEl.firstElementChild as HTMLElement | null;
        if (!first) return;
        cardW = first.offsetWidth + 12;
      }

      const now = performance.now();
      const dx = Math.abs(htmlEl.scrollLeft - lastScrollLeft);
      const dt = now - lastScrollTime;
      lastScrollLeft = htmlEl.scrollLeft;
      lastScrollTime = now;

      // Velocity px/ms — above 1.5 = fling, silence
      // Below 1.5 = browsing, feel the cards
      const velocity = dt > 0 ? dx / dt : 0;
      if (velocity > 1.5) { lastSlot = Math.round(htmlEl.scrollLeft / cardW); return; }

      const slot = Math.round(htmlEl.scrollLeft / cardW);
      if (slot !== lastSlot) {
        if (lastSlot !== -1) navigator.vibrate(1);
        lastSlot = slot;
      }
    }, { passive: true });
  }

  document.querySelectorAll('.scrollbar-hide').forEach(attach);

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList?.contains('scrollbar-hide')) attach(node);
        node.querySelectorAll?.('.scrollbar-hide').forEach(attach);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
