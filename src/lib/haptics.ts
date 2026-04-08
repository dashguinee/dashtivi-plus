/**
 * Haptics — Android-native feel for PWA interactions.
 * Maps to HapticFeedbackConstants equivalents via Web Vibration API.
 * Silent no-op on iOS/desktop (API not supported, fails gracefully).
 */

const HAS_VIBRATE = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Light tick — nav taps, scroll snap, toggle, selection */
export function tick() {
  if (HAS_VIBRATE) navigator.vibrate(5);
}

/** Medium click — modal open, sheet snap, long-press trigger */
export function click() {
  if (HAS_VIBRATE) navigator.vibrate(12);
}

/** Heavy — destructive confirm, error */
export function heavy() {
  if (HAS_VIBRATE) navigator.vibrate([10, 30, 10, 30, 10]);
}

/** Success — pull-to-refresh confirm, action complete */
export function confirm() {
  if (HAS_VIBRATE) navigator.vibrate([10, 40, 15]);
}

/**
 * Scroll snap haptic — debounced tick for horizontal carousel snap.
 * Call on every scrollend; internal debounce prevents motor saturation.
 */
let lastSnap = 0;
export function snap() {
  if (!HAS_VIBRATE) return;
  const now = Date.now();
  if (now - lastSnap < 100) return; // 100ms debounce
  lastSnap = now;
  navigator.vibrate(4);
}

/**
 * Global scroll haptics — finessed, tasteful feedback.
 *
 * Philosophy: feel like detents on a premium dial, not a buzzy motor.
 * - Carousel scroll: gentle 1ms tick only when a NEW card snaps into the leading edge
 * - Scroll settle: soft 3ms when momentum stops (the "click into place" feel)
 * - Throttled to prevent motor saturation — max 1 tick per 150ms
 *
 * Attaches to .scrollbar-hide containers (all horizontal rows).
 * MutationObserver catches dynamically added containers.
 */
export function initScrollHaptics() {
  if (!HAS_VIBRATE) return;

  const tracked = new WeakSet<Element>();

  function attach(el: Element) {
    if (tracked.has(el)) return;
    tracked.add(el);

    const htmlEl = el as HTMLElement;
    // Detect card width from first child
    const getCardWidth = () => {
      const first = htmlEl.firstElementChild as HTMLElement | null;
      return first ? first.offsetWidth + 12 : 130; // width + gap estimate
    };

    let lastSlot = -1;
    let lastTickAt = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    el.addEventListener('scroll', () => {
      const cardW = getCardWidth();
      const slot = Math.floor(htmlEl.scrollLeft / cardW);
      const now = Date.now();

      // Card boundary crossing — ultra-subtle detent
      if (slot !== lastSlot && lastSlot !== -1 && now - lastTickAt > 150) {
        navigator.vibrate(1);
        lastTickAt = now;
      }
      lastSlot = slot;

      // Settle — soft click when scroll stops
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        navigator.vibrate(3);
      }, 100);
    }, { passive: true });
  }

  // Attach to existing + watch for new containers
  document.querySelectorAll('.scrollbar-hide').forEach(attach);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList?.contains('scrollbar-hide')) attach(node);
        node.querySelectorAll?.('.scrollbar-hide').forEach(attach);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
