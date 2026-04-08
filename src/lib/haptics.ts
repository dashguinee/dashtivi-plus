/**
 * DashTivi+ Haptic System
 *
 * Everything soft, spread, inner. Not taps — hums.
 * A single 1ms vibrate feels like a "click". But [1,1,1] at the
 * same total energy feels like a "hum" because the motor never
 * fully engages — it flutters instead of striking.
 *
 * Silent no-op on iOS/desktop.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Tap — nav, tab switch. Soft flutter, not a click */
export function tap() { if (V) navigator.vibrate([2, 1, 2]); }

/** Click — modal open, sheet. Slightly wider flutter */
export function click() { if (V) navigator.vibrate([2, 2, 3]); }

/** Confirm — success. Breathing double-hum */
export function confirm() { if (V) navigator.vibrate([2, 1, 2, 60, 2, 1, 3]); }

/** Heavy — error. Firm but still spread */
export function heavy() { if (V) navigator.vibrate([3, 2, 3, 30, 3, 2, 3]); }

// ── Scroll haptics ───────────────────────────────────────────────

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
    let lastTime = 0;
    let flingCount = 0;

    el.addEventListener('scroll', () => {
      if (!cardW) {
        const first = htmlEl.firstElementChild as HTMLElement | null;
        if (!first) return;
        cardW = first.offsetWidth + 12;
      }

      const now = performance.now();
      const dx = Math.abs(htmlEl.scrollLeft - lastScrollLeft);
      const dt = now - lastTime;
      lastScrollLeft = htmlEl.scrollLeft;
      lastTime = now;

      const slot = Math.round(htmlEl.scrollLeft / cardW);
      if (slot === lastSlot) return;
      const moved = lastSlot !== -1;
      lastSlot = slot;
      if (!moved) return;

      const vel = dt > 0 ? dx / dt : 0;

      if (vel < 1.0) {
        // Browse — soft flutter per card
        navigator.vibrate([1, 1, 1]);
        flingCount = 0;
      } else if (vel < 2.5) {
        // Cruise — quieter flutter per card
        navigator.vibrate([1, 2, 1]);
        flingCount = 0;
      } else {
        // Fling — every 2nd card, wider spread
        flingCount++;
        if (flingCount % 2 === 0) {
          navigator.vibrate([1, 1, 2, 1, 1]);
        }
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
