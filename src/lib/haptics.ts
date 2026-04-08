/**
 * DashTivi+ Haptic System — Maybach Edition
 *
 * Progressive enhancement:
 *   Chrome Android 120+ → VibrationActuator (amplitude control 0.0-1.0)
 *   Other Android       → navigator.vibrate (binary on/off)
 *   iOS/Desktop         → silent no-op
 *
 * With VibrationActuator we get REAL intensity control:
 *   scroll tick = 0.05 magnitude (ghost-level)
 *   tap = 0.12
 *   click = 0.20
 *   confirm = two pulses at 0.08 and 0.15
 *
 * Fallback keeps the proven Maybach patterns.
 */

const V = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// VibrationActuator — Chrome Android 120+ amplitude control
const actuator: any = typeof navigator !== 'undefined' && (navigator as any).vibrationActuator || null;
const hasActuator = !!actuator?.playEffect;

function pulse(duration: number, strong: number, weak: number) {
  if (hasActuator) {
    actuator.playEffect('dual-rumble', { duration, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  } else if (V) {
    navigator.vibrate(duration);
  }
}

// ── Interaction vocabulary ───────────────────────────────────────

/** Tap — nav press, tab switch. */
export function tap() { pulse(4, 0.12, 0.06); }

/** Click — modal open, detail sheet, play. */
export function click() { pulse(8, 0.20, 0.10); }

/** Confirm — success, refresh done. */
export function confirm() {
  if (hasActuator) {
    actuator.playEffect('dual-rumble', { duration: 5, strongMagnitude: 0.08, weakMagnitude: 0.04 }).catch(() => {});
    setTimeout(() => actuator.playEffect('dual-rumble', { duration: 7, strongMagnitude: 0.15, weakMagnitude: 0.08 }).catch(() => {}), 65);
  } else if (V) {
    navigator.vibrate([4, 60, 6]);
  }
}

/** Heavy — error, destructive. */
export function heavy() {
  if (hasActuator) {
    actuator.playEffect('dual-rumble', { duration: 8, strongMagnitude: 0.25, weakMagnitude: 0.12 }).catch(() => {});
    setTimeout(() => actuator.playEffect('dual-rumble', { duration: 8, strongMagnitude: 0.25, weakMagnitude: 0.12 }).catch(() => {}), 40);
  } else if (V) {
    navigator.vibrate([6, 30, 6]);
  }
}

// ── Scroll haptics — velocity-aware ──────────────────────────────

// Scroll tick — ultra-quiet with actuator, 1ms binary without
function scrollTick(intensity: number) {
  if (hasActuator) {
    actuator.playEffect('dual-rumble', { duration: 3, strongMagnitude: intensity, weakMagnitude: intensity * 0.5 }).catch(() => {});
  } else if (V) {
    navigator.vibrate(1);
  }
}

export function initScrollHaptics() {
  if (!V && !hasActuator) return;

  const tracked = new WeakSet<Element>();

  function attach(el: Element) {
    if (tracked.has(el)) return;
    tracked.add(el);

    const htmlEl = el as HTMLElement;
    let cardW = 0;
    let lastSlot = -1;
    let lastScrollLeft = 0;
    let lastScrollTime = 0;
    let flingCount = 0;

    el.addEventListener('scroll', () => {
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

      const velocity = dt > 0 ? dx / dt : 0;
      const slot = Math.round(htmlEl.scrollLeft / cardW);
      if (slot === lastSlot) return;
      const moved = lastSlot !== -1;
      lastSlot = slot;
      if (!moved) return;

      if (velocity > 1.5) {
        // Fling — soft pulse every 3rd card
        flingCount++;
        if (flingCount % 3 === 0) scrollTick(0.03);
      } else {
        // Browse — whisper per card
        scrollTick(0.05);
        flingCount = 0;
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
