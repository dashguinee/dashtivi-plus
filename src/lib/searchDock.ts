import { useSyncExternalStore } from 'react';

/**
 * searchDock — a tiny, module-level SESSION store for whether the master search
 * is "docked" into the app header (true) or floating as the pebble (false).
 *
 * Intentionally NOT persisted (no localStorage). It lives only in memory, so a
 * refresh/relaunch resets it to `false` and the floating pebble returns.
 */

let docked = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Set the docked state and notify subscribers (no-op if unchanged). */
export function setSearchDocked(next: boolean): void {
  if (docked === next) return;
  docked = next;
  emit();
}

/** Current docked state (imperative read). */
export function getSearchDocked(): boolean {
  return docked;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook — re-renders the caller when the docked state changes. */
export function useSearchDocked(): boolean {
  return useSyncExternalStore(subscribe, getSearchDocked, getSearchDocked);
}
