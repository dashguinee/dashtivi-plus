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
