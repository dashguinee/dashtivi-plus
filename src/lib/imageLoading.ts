/**
 * Image / loading layer — FOCALIZED + ANTICIPATORY loading.
 *
 * Philosophy (the "camera" model): keep what's ON SCREEN sharp + fully loaded,
 * and PRE-FOCUS on what's about to enter the viewport so it's already painted
 * by the time the user scrolls to it. Far-offscreen stays lazy so we never
 * fetch the whole catalog at once.
 *
 *  - prefetchDecode(url): warm the HTTP + decoded-bitmap cache OFF the main
 *    paint path (img.decode()), so the visible <img> paints instantly.
 *  - useNearViewport(): fires `near=true` once an element is within ~one screen
 *    of the viewport (generous rootMargin), then stops observing. Components
 *    use it to flip a logo/poster to eager + high priority + decode AHEAD of
 *    being seen. One shared IntersectionObserver for the whole app (cheap).
 */

import { useEffect, useRef, useState } from 'react';

// ── Painted-source registry (durable, boot-seeded) ───────────────────
// A URL is "painted" once it has rendered fully at least once on this device.
// Logo + poster components consult this to decide their INITIAL opacity: a URL
// already known-painted starts at full opacity (no fade-in), so art never
// re-fades on a re-render, a scroll back, a tab reveal, or — crucially — after
// a full reload/restart, because the registry is SEEDED from the Service
// Worker's durable caches at boot (seedPaintedFromCache). This is what makes
// the shell "always there, never re-fades", with only the video stream loading.
const _painted = new Set<string>();

/** Remember that a URL has fully painted (called from an <img> onLoad). */
export function markPainted(url?: string | null): void {
  if (url) _painted.add(url);
}

/** Has this exact URL already painted on this device (in-session or on disk)? */
export function isPainted(url?: string | null): boolean {
  return !!url && _painted.has(url);
}

// Cache names must match public/sw.js (durable logo cache + bounded poster cache).
const _DURABLE_CACHES = ['tivi-logos-stable-1', 'tivi-img-stable-1'];

/**
 * Seed the painted registry from the SW's durable caches, so any logo/poster
 * already stored on-device is treated as already-painted and renders at full
 * opacity on the very first frame after a reload — zero re-fade. Best-effort:
 * never throws, resolves quickly, and silently no-ops where Cache Storage is
 * unavailable. Call once, early, before the shell renders.
 */
export async function seedPaintedFromCache(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    for (const name of _DURABLE_CACHES) {
      if (!(await caches.has(name))) continue;
      const cache = await caches.open(name);
      const keys = await cache.keys();
      for (const req of keys) _painted.add(req.url);
    }
  } catch {
    /* best-effort — a cold cache just means the first paint may fade in once */
  }
}

// ── Decode-ahead cache ───────────────────────────────────────────────
const _decoded = new Set<string>();

/** Warm + decode an image URL off the main thread. Dedupes; never throws. */
export function prefetchDecode(url?: string | null): void {
  if (!url || _decoded.has(url)) return;
  _decoded.add(url);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    // decode() resolves once the bitmap is ready — keeps the decode cost off
    // the paint that happens when the real on-screen <img> mounts.
    void img.decode?.().catch(() => {});
  } catch {
    /* ignore — best-effort prefetch */
  }
}

// ── Shared near-viewport observer ────────────────────────────────────
type Cb = () => void;
let _io: IntersectionObserver | null = null;
const _cbs = new WeakMap<Element, Cb>();

function ensureIO(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!_io) {
    _io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const cb = _cbs.get(e.target);
            _io!.unobserve(e.target);
            _cbs.delete(e.target);
            cb?.();
          }
        }
      },
      // ~one screen of anticipation above + below the fold.
      { rootMargin: '700px 0px', threshold: 0 },
    );
  }
  return _io;
}

/**
 * Returns a [callbackRef, near] pair. Attach the ref to the card wrapper.
 * `near` flips true once the wrapper is within ~700px of the viewport, then
 * the element is unobserved (one-shot). Falls back to immediately-near when
 * IntersectionObserver is unavailable (SSR / very old engines).
 */
export function useNearViewport(): [(el: Element | null) => void, boolean] {
  const [near, setNear] = useState(false);
  const elRef = useRef<Element | null>(null);
  const firedRef = useRef(false);

  const setRef = useRef((el: Element | null) => {
    if (elRef.current) {
      _io?.unobserve(elRef.current);
      _cbs.delete(elRef.current);
    }
    elRef.current = el;
    if (!el || firedRef.current) return;
    const io = ensureIO();
    if (!io) {
      firedRef.current = true;
      setNear(true);
      return;
    }
    _cbs.set(el, () => {
      firedRef.current = true;
      setNear(true);
    });
    io.observe(el);
  }).current;

  useEffect(
    () => () => {
      if (elRef.current) {
        _io?.unobserve(elRef.current);
        _cbs.delete(elRef.current);
      }
    },
    [],
  );

  return [setRef, near];
}
