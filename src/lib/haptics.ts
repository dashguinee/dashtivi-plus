/**
 * DashTivi+ Haptic System — Feedback, not dominance.
 *
 * Philosophy: a haptic is a *confirmation* of a real button press, never an
 * ambient texture. Scrolling and browsing are completely vibration-free.
 *
 *   tap / light / select  ≈ 6ms   (gentle tick)
 *   click                 ≈ 8ms
 *   heavy / confirm       ≈ 12ms  (heaviest allowed — still a tick, not a thud)
 *
 * No patterns/arrays (those rumble). No scroll-boundary haptics at all.
 * Unsupported (iOS/Desktop) → silent no-op.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Single short, soft tick. No-op silently if unsupported. */
function tick(ms: number) {
  if (V) navigator.vibrate(ms);
}

// ── Interaction vocabulary ───────────────────────────────────────
// Short + soft. Discrete confirmations only — callable from every site.

/** Tap — nav press, tab switch. */
export function tap() { tick(6); }

/** Light — same gentle tick as tap. */
export function light() { tick(6); }

/** Select — list/segment pick. */
export function select() { tick(6); }

/** Click — modal open, detail sheet, play. */
export function click() { tick(8); }

/** Confirm — success, refresh done. */
export function confirm() { tick(12); }

/** Heavy — error, destructive. The heaviest we allow: still a tick. */
export function heavy() { tick(12); }

// ── Scroll haptics — NEUTRALIZED ─────────────────────────────────
// Was firing a vibration on every card boundary while scrolling, which
// dominated the feel. Scrolling is now silky/silent. Kept as an exported
// no-op so the App.tsx call still resolves.
export function initScrollHaptics() { /* intentionally a no-op */ }
