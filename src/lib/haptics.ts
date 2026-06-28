/**
 * DashTivi+ Haptic System — PUNCTUATION, not a soundtrack.
 *
 * Philosophy: a haptic marks an INTENTIONAL, meaningful moment — a tap-to-play,
 * a channel switch/surf, a dock-to-header, a key toggle. It is NEVER an ambient
 * texture: no scroll ticks, no per-card-boundary buzz, no machine-gunning on a
 * flurry of taps. Sparse + purposeful + soft = premium.
 *
 * Two central guarantees enforced here so every call site stays honest:
 *   1. RATE GATE — a leading-edge gate drops any tick that lands within ~90ms of
 *      the previous one, so rapid/redundant interactions can't buzz the motor.
 *   2. SOFT — short, light durations only (4–10ms). No patterns/arrays (rumble).
 *
 *   tap / light / select  ≈ 4ms   (gentle tick — selection/press)
 *   click                 ≈ 6ms   (play / open)
 *   confirm               ≈ 9ms   (success — important, bypasses the gate)
 *   heavy                 ≈ 10ms  (error/destructive — important, bypasses gate)
 *
 * Unsupported (iOS Safari / Desktop) → silent no-op.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// Leading-edge rate gate: the first tick fires, rapid follow-ups within the
// window are suppressed — the single biggest cure for "too much haptic globally".
const MIN_GAP_MS = 90;
let lastTickAt = -Infinity;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Single short, soft tick. Gated against rapid-fire unless `force` (rare, important). */
function tick(ms: number, force = false) {
  if (!V) return;
  const t = now();
  if (!force && t - lastTickAt < MIN_GAP_MS) return; // drop the buzz
  lastTickAt = t;
  navigator.vibrate(ms);
}

// ── Interaction vocabulary ───────────────────────────────────────
// Discrete, soft confirmations only — callable from every site, but the gate
// above guarantees a flurry collapses to a single gentle tick.

/** Tap — nav press, tab switch, selection. */
export function tap() { tick(4); }

/** Light — same gentle tick as tap. */
export function light() { tick(4); }

/** Select — list/segment pick. */
export function select() { tick(4); }

/** Click — play, modal open, detail sheet. */
export function click() { tick(6); }

/** Confirm — success, refresh done. Important + rare → bypasses the rate gate. */
export function confirm() { tick(9, true); }

/** Heavy — error, destructive. Important + rare → bypasses the rate gate. */
export function heavy() { tick(10, true); }

// ── Scroll haptics — OFF ─────────────────────────────────────────
// Scrolling and browsing are vibration-free by design (haptics are punctuation,
// not a soundtrack). Kept as an exported no-op so the App.tsx call still resolves.
export function initScrollHaptics() { /* intentionally a no-op */ }
