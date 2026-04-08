/**
 * DashTivi+ Haptic System — Rolls Royce Edition
 *
 * Three speed tiers, like a luxury drivetrain:
 *
 *   BROWSING (slow):  Feel every card. Precise. 1ms per card.
 *                     Like walking through a gallery — each piece announces itself.
 *
 *   CRUISING (medium): Smooth rhythm. 2ms per card.
 *                      Like highway driving — you feel the road, not the bumps.
 *
 *   FLYING (fast):    Immersive pulse. 3ms every 2nd card.
 *                     Like a jet on takeoff — a deep, spaced rhythm that
 *                     says "you're moving fast and everything is under control."
 *
 * Actions: substantial but never sharp. Each one is a single confident pulse.
 *
 * Silent no-op on iOS/desktop.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// ── Actions ──────────────────────────────────────────────────────

/** Tap — nav press, tab switch, pill select. Confident 4ms */
export function tap() { if (V) navigator.vibrate(4); }

/** Click — modal open, sheet snap, play button. Firm 8ms */
export function click() { if (V) navigator.vibrate(8); }

/** Confirm — success, refresh complete. Warm double-knock with breathing room */
export function confirm() { if (V) navigator.vibrate([5, 50, 8]); }

/** Heavy — error, destructive. Two firm knocks */
export function heavy() { if (V) navigator.vibrate([8, 25, 8]); }

// ── Scroll haptics — 3 velocity tiers ────────────────────────────

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
    // For fast fling: only vibrate every Nth card
    let flingSkip = 0;

    el.addEventListener('scroll', () => {
      // Lazy measure
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

      // Velocity: px/ms
      const vel = dt > 0 ? dx / dt : 0;

      if (vel < 1.0) {
        // BROWSING — precise, feel every card
        navigator.vibrate(1);
        flingSkip = 0;
      } else if (vel < 2.5) {
        // CRUISING — smooth rhythm, every card but slightly firmer
        navigator.vibrate(2);
        flingSkip = 0;
      } else {
        // FLYING — immersive pulse every 2nd card, deeper vibration
        flingSkip++;
        if (flingSkip % 2 === 0) {
          navigator.vibrate(3);
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
