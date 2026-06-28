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
