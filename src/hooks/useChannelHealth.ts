import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Dynamic Channel Health System
 *
 * Tracks which channels fail to play and excludes them from the UI.
 * - On play failure: marks channel as dead with timestamp
 * - Dead channels are hidden from all channel lists
 * - Channels expire from dead list after 6 hours (they may come back)
 * - Persisted in localStorage so it survives refreshes
 * - Max 2000 entries to prevent storage bloat
 */

const STORAGE_KEY = 'tivi_dead_channels';
const EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 2000;

interface DeadEntry {
  t: number; // timestamp when marked dead
  r: string; // reason (short)
}

type DeadMap = Record<string, DeadEntry>;

// ─── Singleton store (shared across all hook instances) ────────

let deadMap: DeadMap = loadFromStorage();
let listeners = new Set<() => void>();

function loadFromStorage(): DeadMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DeadMap;
    // Purge expired entries on load
    const now = Date.now();
    const cleaned: DeadMap = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (now - entry.t < EXPIRY_MS) {
        cleaned[id] = entry;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function persist() {
  try {
    // Enforce max entries — drop oldest
    const entries = Object.entries(deadMap);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => a[1].t - b[1].t);
      deadMap = Object.fromEntries(entries.slice(entries.length - MAX_ENTRIES));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deadMap));
  } catch {
    // Storage full — clear and retry
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* give up */ }
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): DeadMap {
  return deadMap;
}

// ─── Public API ────────────────────────────────────────────────

export function markDead(channelId: string, reason: string) {
  deadMap = { ...deadMap, [channelId]: { t: Date.now(), r: reason } };
  persist();
  notify();
}

export function markAlive(channelId: string) {
  if (!(channelId in deadMap)) return;
  const { [channelId]: _, ...rest } = deadMap;
  deadMap = rest;
  persist();
  notify();
}

export function isDead(channelId: string): boolean {
  const entry = deadMap[channelId];
  if (!entry) return false;
  if (Date.now() - entry.t >= EXPIRY_MS) {
    // Expired — remove it
    const { [channelId]: _, ...rest } = deadMap;
    deadMap = rest;
    persist();
    return false;
  }
  return true;
}

export function getDeadCount(): number {
  return Object.keys(deadMap).length;
}

export function clearDead() {
  deadMap = {};
  persist();
  notify();
}

// ─── React Hook ────────────────────────────────────────────────

export function useChannelHealth() {
  const dead = useSyncExternalStore(subscribe, getSnapshot);

  const isChannelDead = useCallback((id: string) => isDead(id), [dead]);

  const deadCount = Object.keys(dead).length;

  return {
    isChannelDead,
    markDead,
    markAlive,
    clearDead,
    deadCount,
  };
}
