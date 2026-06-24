import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useSyncExternalStore,
} from 'react';

/**
 * SurfaceStack — the "no-page-break living place" primitive.
 *
 * Surfaces RISE over a persistent shell (the world never unmounts) and RECEDE
 * on pop. While a surface is in the stack it is kept MOUNTED (the layer's DOM
 * node persists; the phase class changes, never an unmount) so any scroll
 * position + React state inside it is preserved — returning restores the exact
 * view, no reset, no white flash.
 *
 * The DNA ease is cubic-bezier(0.23,1,0.32,1) — the one organic heartbeat.
 *
 * Two content modes (a surface picks one):
 *  1. SELF-CONTAINED — pass `render()`. The surface owns + renders its content.
 *     Best for simple, static-prop surfaces. Content is a closure captured at
 *     push time, so avoid this mode when the content needs frequently-changing
 *     live props (it would go stale — SurfaceStackRenderer is not a child of
 *     the caller, so context/state don't cross into it).
 *  2. PORTAL HOST — pass `portal: true` (no `render`). The surface only owns an
 *     animated, kept-mounted DOM mount point. The caller renders its LIVE
 *     content in its own tree and React-portals it into that node via
 *     `useSurfacePortalTarget(id)`. This keeps live props correct (the player
 *     uses this — VideoPlayer stays in AppContent's tree, so player.state stays
 *     live, while SurfaceStack owns the rise/recede + keep-alive lifecycle).
 *
 * SCOPE: additive. Does NOT replace React-Router; it sits ABOVE the routed
 * shell. In-app moves that should feel like a place (the player today) push a
 * surface instead of swapping a route.
 */

export interface Surface {
  /** Stable id — used as the React key so the surface keeps its identity (and
   *  thus its scroll/state) for its whole lifetime in the stack. */
  id: string;
  /** SELF-CONTAINED mode: the content that rises, kept mounted while stacked. */
  render?: () => React.ReactNode;
  /** PORTAL HOST mode: the surface owns only an animated mount node; the caller
   *  portals live content into it. Mutually exclusive with `render`. */
  portal?: boolean;
}

interface SurfaceEntry extends Surface {
  /** 'rising' on mount → 'open' after first frame; 'receding' while popping. */
  phase: 'rising' | 'open' | 'receding';
}

interface SurfaceApi {
  /** Push a surface that rises over the world. No-op if id already present. */
  push: (s: Surface) => void;
  /** Pop the top surface (recede), or a specific id if given. */
  pop: (id?: string) => void;
  /** Replace the top surface with a new one (no double-rise). */
  replace: (s: Surface) => void;
  /** True while a given surface id is present and not receding. */
  has: (id: string) => boolean;
  /** Ids currently in the stack (bottom → top). */
  ids: string[];
}

const SurfaceContext = createContext<SurfaceApi | null>(null);

export function useSurfaces(): SurfaceApi {
  const ctx = useContext(SurfaceContext);
  if (!ctx) throw new Error('useSurfaces must be used inside <SurfaceProvider>');
  return ctx;
}

/* ── Portal-target registry ────────────────────────────────────────────────
 * Portal-host surfaces register their DOM mount node here. Callers subscribe
 * via useSurfacePortalTarget(id) and portal their live content into it. A tiny
 * external store keeps this independent of the React render tree. */
type PortalListener = () => void;
const portalTargets = new Map<string, HTMLElement>();
const portalListeners = new Set<PortalListener>();
function setPortalTarget(id: string, el: HTMLElement | null) {
  if (el) portalTargets.set(id, el);
  else portalTargets.delete(id);
  portalListeners.forEach((l) => l());
}
function subscribePortals(l: PortalListener) {
  portalListeners.add(l);
  return () => { portalListeners.delete(l); };
}

/** Returns the DOM node a portal-host surface mounts into, or null if not up. */
export function useSurfacePortalTarget(id: string): HTMLElement | null {
  return useSyncExternalStore(
    subscribePortals,
    () => portalTargets.get(id) ?? null,
    () => null
  );
}

/** Recede→unmount duration (must match the CSS transition below). */
const RECEDE_MS = 420;

export function SurfaceProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<SurfaceEntry[]>([]);
  const recedeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /* ── LAYERED BACK (system/browser back recedes the TOP surface) ──────────
   * VOYO-style: "back is the previous layer/page". Each surface that rises
   * pushes ONE history entry; system back (popstate) recedes the top surface
   * instead of leaving the app. A close button calls pop() directly — that
   * pop also consumes its own history entry (history.back) so the two stay in
   * lockstep with no leak and no loop.
   *
   *  - pushCount: how many history entries WE own (one per live surface).
   *  - popFromHistory: set while a popstate is being serviced, so the pop()
   *    triggered by it does NOT call history.back again (would double-pop).
   *  - skipNextPop: set when WE call history.back() from a button-driven pop,
   *    so the resulting popstate is swallowed (it's our own bookkeeping, not a
   *    user back-press to act on). */
  const pushCount = useRef(0);
  const popFromHistory = useRef(false);
  const skipNextPop = useRef(false);

  // Promote a freshly-pushed surface from 'rising' → 'open' on the next frame
  // so the CSS transition fires (rise from translateY/opacity to rest).
  const promote = useCallback((id: string) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setStack((prev) =>
          prev.map((e) => (e.id === id && e.phase === 'rising' ? { ...e, phase: 'open' } : e))
        );
      })
    );
  }, []);

  const push = useCallback(
    (s: Surface) => {
      let added = false;
      setStack((prev) => {
        if (prev.some((e) => e.id === s.id)) return prev; // already present
        added = true;
        return [...prev, { ...s, phase: 'rising' }];
      });
      if (added && typeof window !== 'undefined') {
        // One history entry per surface — system back recedes it.
        pushCount.current += 1;
        window.history.pushState({ surfaceStack: s.id, ts: Date.now() }, '');
      }
      promote(s.id);
    },
    [promote]
  );

  const pop = useCallback((id?: string) => {
    let didRecede = false;
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const targetId = id ?? prev[prev.length - 1].id;
      const target = prev.find((e) => e.id === targetId);
      if (!target || target.phase === 'receding') return prev;
      didRecede = true;
      // Schedule unmount after the recede transition completes.
      const t = setTimeout(() => {
        setStack((cur) => cur.filter((e) => e.id !== targetId));
        recedeTimers.current.delete(targetId);
      }, RECEDE_MS);
      recedeTimers.current.set(targetId, t);
      return prev.map((e) => (e.id === targetId ? { ...e, phase: 'receding' } : e));
    });
    // Keep history in lockstep: a button-driven pop consumes its history entry.
    // A pop that ORIGINATED from popstate must NOT call history.back (the
    // browser already moved us back one entry).
    if (didRecede && typeof window !== 'undefined') {
      if (popFromHistory.current) {
        if (pushCount.current > 0) pushCount.current -= 1;
      } else if (pushCount.current > 0) {
        pushCount.current -= 1;
        skipNextPop.current = true; // swallow the popstate our back() will emit
        window.history.back();
      }
    }
  }, []);

  // System/browser BACK → recede the top surface (never leave the app while a
  // surface is up). One handler for the whole stack.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      if (skipNextPop.current) {
        // This popstate is the echo of our own history.back() during a
        // button-driven pop — bookkeeping only, nothing to recede.
        skipNextPop.current = false;
        return;
      }
      if (pushCount.current <= 0) return; // no surface owns a history entry
      popFromHistory.current = true;
      try {
        pop(); // recede the TOP surface only
      } finally {
        popFromHistory.current = false;
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [pop]);

  const replace = useCallback((s: Surface) => {
    setStack((prev) => {
      if (prev.length === 0) return [{ ...s, phase: 'open' as const }];
      const next = [...prev];
      next[next.length - 1] = { ...s, phase: 'open' };
      return next;
    });
  }, []);

  const api = useMemo<SurfaceApi>(
    () => ({
      push,
      pop,
      replace,
      has: (id: string) => stack.some((e) => e.id === id && e.phase !== 'receding'),
      ids: stack.map((e) => e.id),
    }),
    [push, pop, replace, stack]
  );

  // Clean up timers on unmount.
  React.useEffect(() => {
    const timers = recedeTimers.current;
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }, []);

  return (
    <SurfaceContext.Provider value={api}>
      {children}
      <SurfaceStackRenderer stack={stack} />
    </SurfaceContext.Provider>
  );
}

/**
 * Renders the stacked surfaces above the persistent shell. Each surface lives
 * in its own fixed layer, kept mounted for its whole stack lifetime — only the
 * phase class changes (rising/open/receding), so CSS animates the rise/recede
 * and inner scroll/state survive. Portal-host layers expose their node to the
 * registry; self-contained layers render their closure.
 */
function SurfaceStackRenderer({ stack }: { stack: SurfaceEntry[] }) {
  if (stack.length === 0) return null;
  return (
    <div className="surface-stack-root">
      {stack.map((entry, i) => (
        // Base 55 keeps surfaces above the routed <main> AND the persistent
        // full-player <video> (z-50 in the shell) so player controls — which
        // ride the surface — sit on top of the stream, with the world below.
        <SurfaceLayer key={entry.id} entry={entry} z={55 + i} />
      ))}
    </div>
  );
}

function SurfaceLayer({ entry, z }: { entry: SurfaceEntry; z: number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Portal hosts publish their mount node to the registry for the lifetime of
  // the layer; self-contained layers don't touch it.
  React.useEffect(() => {
    if (!entry.portal) return;
    setPortalTarget(entry.id, mountRef.current);
    return () => setPortalTarget(entry.id, null);
  }, [entry.id, entry.portal]);

  return (
    <div
      data-surface-id={entry.id}
      data-phase={entry.phase}
      className={`surface-layer surface-${entry.phase}`}
      style={{ zIndex: z }}
    >
      {entry.portal ? (
        <div ref={mountRef} className="surface-portal-mount" />
      ) : (
        entry.render?.()
      )}
    </div>
  );
}
