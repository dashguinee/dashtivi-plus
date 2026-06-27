const PREFIX = 'tivi_';

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    // Shape sanity check: corrupt-but-valid JSON of the wrong type (e.g. {} where an
    // array is expected, via cross-tab race / bad migration / manual tamper) would
    // otherwise reach store selectors (cache.some/filter/slice) and throw during render
    // → white screen. Reject anything whose top-level shape doesn't match the fallback.
    if (Array.isArray(fallback) !== Array.isArray(parsed)) return fallback;
    if (
      parsed === null ||
      (typeof parsed !== typeof fallback && fallback !== null && fallback !== undefined)
    ) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function evictXtreamCaches(): boolean {
  // Reclaim space by dropping transient API caches (never user data like tivi_likes/downloads/history).
  let evicted = false;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('xtream_')) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
      evicted = true;
    }
  } catch {
    // ignore
  }
  return evicted;
}

export function setItem<T>(key: string, value: T): void {
  const payload = JSON.stringify(value);
  try {
    localStorage.setItem(PREFIX + key, payload);
  } catch (err) {
    // Quota exceeded: evict transient xtream_* caches and retry once so user data
    // (likes/downloads/history — no DB mirror) isn't silently lost on reload.
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    if (isQuota && evictXtreamCaches()) {
      try {
        localStorage.setItem(PREFIX + key, payload);
      } catch {
        // Still failing after eviction — surface to console so the save isn't silently dropped.
        console.warn('[storage] setItem failed after eviction:', PREFIX + key);
      }
    }
    // else: storage unavailable (private mode / disabled) — nothing actionable.
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore
  }
}
