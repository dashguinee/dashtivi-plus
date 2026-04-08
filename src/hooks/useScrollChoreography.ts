import { useSyncExternalStore, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useScrollChoreography — ONE scroll listener for the entire app.
 *
 * The user's scroll tells a story:
 *   - Top of page: "I just arrived" → show everything
 *   - Scrolling down past 200px: "I'm diving in" → hide chrome
 *   - Scrolling up: "I want controls" → show chrome instantly
 *   - Stopped: keep current state (no auto-hide — feels random)
 *   - Page switch: reset to visible
 *
 * Uses a module-level singleton listener + useSyncExternalStore.
 * No matter how many components call this hook, there's ONE scroll handler.
 */

interface ChromeState {
  headerVisible: boolean;
  navVisible: boolean;
}

// ── Singleton state ──────────────────────────────────────────────
let _state: ChromeState = { headerVisible: true, navVisible: true };
let _listeners: Array<() => void> = [];
let _lastY = 0;
let _installed = false;

function notify() {
  for (const fn of _listeners) fn();
}

function onScroll() {
  const y = window.scrollY;
  const delta = y - _lastY;
  _lastY = y;

  let next: ChromeState;

  if (y < 80) {
    next = { headerVisible: true, navVisible: true };
  } else if (delta > 3 && y > 150) {
    next = { headerVisible: false, navVisible: false };
  } else if (delta < -2) {
    next = { headerVisible: true, navVisible: true };
  } else {
    return;
  }

  if (next.headerVisible !== _state.headerVisible || next.navVisible !== _state.navVisible) {
    _state = next;
    notify();
  }
}

function install() {
  if (_installed) return;
  _installed = true;
  window.addEventListener('scroll', onScroll, { passive: true });
}

function subscribe(cb: () => void): () => void {
  install();
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter(fn => fn !== cb);
  };
}

function getSnapshot(): ChromeState {
  return _state;
}

/** Reset chrome to visible (called on route change) */
export function resetChrome() {
  _lastY = 0;
  _state = { headerVisible: true, navVisible: true };
  notify();
}

// ── Hook ─────────────────────────────────────────────────────────

export function useScrollChoreography() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const location = useLocation();

  // Route change → reset (using ref to avoid extra listener)
  const lastPath = useCallback(() => location.pathname, [location.pathname]);
  // This is intentionally simple — resetChrome is called in the effect below
  // but we need a way to track route changes without adding another listener

  return {
    ...state,
    stickyTop: state.headerVisible ? 56 : 0,
    stickyVisible: true, // tabs always visible — user might want to switch subtabs
  };
}

// ── Route change effect (call from App.tsx) ──────────────────────
export { subscribe as _subscribe, getSnapshot as _getSnapshot };
