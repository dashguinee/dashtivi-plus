/**
 * DashTivi+ Haptic System — Ghost Mode
 *
 * 70% reduced from previous. The motor barely wakes up.
 * You feel it the way you feel silk — you know it's there
 * but you'd never call it "vibration."
 *
 * Silent no-op on iOS/desktop.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Tap — nav, tab switch. Single 1ms, nothing more */
export function tap() { if (V) navigator.vibrate(1); }

/** Click — modal open, sheet. Spread micro-flutter */
export function click() { if (V) navigator.vibrate([1, 3, 1]); }

/** Confirm — success. Two ghosts separated by silence */
export function confirm() { if (V) navigator.vibrate([1, 80, 1, 2, 1]); }

/** Heavy — error. Just enough to notice */
export function heavy() { if (V) navigator.vibrate([1, 2, 1, 40, 1, 2, 1]); }

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
        // Browse — single 1ms ghost per card
        navigator.vibrate(1);
        flingCount = 0;
      } else if (vel < 2.5) {
        // Cruise — same ghost, every card
        navigator.vibrate(1);
        flingCount = 0;
      } else {
        // Fling — every 2nd card, still just 1ms
        flingCount++;
        if (flingCount % 2 === 0) {
          navigator.vibrate(1);
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
