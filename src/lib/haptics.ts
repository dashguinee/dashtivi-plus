/**
 * DashTivi+ Haptic System — Luxury PWA Haptics
 *
 * Design philosophy: Every interaction has ONE precise response.
 * Like a Swiss watch — you feel the mechanism, not the motor.
 *
 * Haptic vocabulary:
 *   tick     (1ms)  — carousel card crossing, subtle selection change
 *   tap      (4ms)  — button press, nav item, tab switch
 *   click    (8ms)  — modal open, sheet snap, meaningful action
 *   confirm  (pattern) — success, completion, pull-to-refresh done
 *   heavy    (pattern) — error, destructive action
 *
 * Silent no-op on iOS/desktop (Vibration API not supported).
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// ── Interaction primitives ───────────────────────────────────────

/** Whisper — carousel card boundary, barely perceptible */
export function tick() { if (V) navigator.vibrate(1); }

/** Tap — nav press, tab switch, toggle. Crisp, immediate */
export function tap() { if (V) navigator.vibrate(4); }

/** Click — modal open, detail sheet, play button. Medium weight */
export function click() { if (V) navigator.vibrate(8); }

/** Confirm — success, refresh complete. Warm double-pulse */
export function confirm() { if (V) navigator.vibrate([6, 50, 8]); }

/** Heavy — error, destructive. Sharp triple-knock */
export function heavy() { if (V) navigator.vibrate([8, 30, 8, 30, 8]); }

// ── Carousel scroll haptics ──────────────────────────────────────
//
// Precisely ONE tick per card crossing. Not on every scroll pixel.
// Measures actual card width from DOM, fires when the leading edge
// crosses a card boundary. No settle buzz — just the crossing.

export function initScrollHaptics() {
  if (!V) return;

  const tracked = new WeakSet<Element>();

  function attach(el: Element) {
    if (tracked.has(el)) return;
    tracked.add(el);

    const htmlEl = el as HTMLElement;
    let cardW = 0;
    let lastSlot = -1;

    el.addEventListener('scroll', () => {
      // Lazy measure — cache after first read
      if (!cardW) {
        const first = htmlEl.firstElementChild as HTMLElement | null;
        if (!first) return;
        cardW = first.offsetWidth + 12; // card + gap (avoid getComputedStyle)
      }

      // Round = fires at card midpoint (feels instant vs floor which waits till end)
      const slot = Math.round(htmlEl.scrollLeft / cardW);
      if (slot !== lastSlot) {
        if (lastSlot !== -1) navigator.vibrate(1);
        lastSlot = slot;
      }
    }, { passive: true });
  }

  // Attach to all horizontal scrollers
  document.querySelectorAll('.scrollbar-hide').forEach(attach);

  // Watch for dynamically added containers (lazy pages, VEE rows)
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
