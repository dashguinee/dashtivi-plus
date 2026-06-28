import React, { useState, useCallback, useEffect, useDeferredValue, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { AccessCodeLogin } from '@/components/ui/AccessCodeLogin';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { StreamLimitOverlay } from '@/components/player/StreamLimitOverlay';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/hooks/useAuth';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { getItem, setItem } from '@/lib/storage';
import { setCurrentChannel } from '@/lib/playlist';
import { SearchWidget } from '@/components/ui/SearchWidget';
import { setActiveTier } from '@/lib/catalog';
import { startPreload, preloadApiData } from '@/lib/preloader';
import { initScrollHaptics } from '@/lib/haptics';
import { playDashCinemaSound } from '@/lib/cinema-sound';
import { muteAmbient, unmuteAmbient, startAmbient, isAmbientEnabled, getAmbientPulse, initAudioReactive } from '@/lib/ambient-audio';
import { LanguageProvider, useLanguage } from '@/i18n';
import type { Channel } from '@/types';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollAmbient } from '@/hooks/useScrollAmbient';
import { DynamicIsland } from '@/components/ui/DynamicIsland';
import { Crown, X } from 'lucide-react';
import { SurfaceProvider, useSurfaces, useSurfacePortalTarget } from '@/components/system/SurfaceStack';
import { useBackGuard } from '@/hooks/useBackGuard';
import { createPortal } from 'react-dom';

// Stable id for the full-screen player surface (the proof flow for SurfaceStack).
const PLAYER_SURFACE_ID = 'player';

// Start preloading immediately on script load — before React even mounts
startPreload();
// Global scroll haptics — micro-ticks on card boundaries in all carousels
initScrollHaptics();

// Lazy load with auto-reload on stale chunk (handles deploy cache mismatch)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRetry(factory: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    factory().catch(() => {
      // Stale chunk — clear caches and reload
      if ('caches' in window) caches.keys().then(k => k.forEach(c => caches.delete(c)));
      window.location.reload();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Promise<{ default: React.ComponentType<any> }>(() => {});
    })
  );
}

const HomePage = lazyRetry(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LiveTVPage = lazyRetry(() => import('@/pages/LiveTVPage').then((m) => ({ default: m.LiveTVPage })));
const MoviesPage = lazyRetry(() => import('@/pages/MoviesPage').then((m) => ({ default: m.MoviesPage })));
const SeriesPage = lazyRetry(() => import('@/pages/SeriesPage').then((m) => ({ default: m.SeriesPage })));
const FrenchPage = lazyRetry(() => import('@/pages/FrenchPage').then((m) => ({ default: m.FrenchPage })));
const DaHubPage = lazyRetry(() => import('@/pages/DaHubPage').then((m) => ({ default: m.DaHubPage })));
const WelcomePage = lazyRetry(() => import('@/pages/WelcomePage').then((m) => ({ default: m.WelcomePage })));
const PlatformsPage = lazyRetry(() => import('@/pages/PlatformsPage').then((m) => ({ default: m.PlatformsPage })));
const ExperienceHomePage = lazyRetry(() => import('@/pages/ExperienceHomePage').then((m) => ({ default: m.ExperienceHomePage })));
const ExplorePage = lazyRetry(() => import('@/pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const NbaPage = lazyRetry(() => import('@/pages/NbaPage').then((m) => ({ default: m.NbaPage })));
const LibraryPage = lazyRetry(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const TestChannelsPage = lazyRetry(() => import('@/pages/TestChannelsPage'));

// SNAPPY NAV: warm the main route chunks on idle (after the home is interactive),
// so shifting Home → Movies → Series → Live is INSTANT — the chunk is already in
// memory, no Suspense flash. Runs once, only when the browser is idle, so it never
// competes with the first paint. Cheap (the chunks are tiny + then cached by the SW).
(() => {
  // Primary nav chunks — warmed first so the most-used switches are instant.
  const warm = () => {
    import('@/pages/MoviesPage');
    import('@/pages/SeriesPage');
    import('@/pages/LiveTVPage');
    import('@/pages/ExperienceHomePage');
  };
  // EVERY remaining page chunk — warmed on a later idle window so the FIRST
  // visit to ANY page never hits the Suspense skeleton (the page-switch glitch),
  // and so all route JS lands in the SW runtime cache → every page works OFFLINE
  // after the first online session. Spread over idle so it never competes with
  // first paint and stays gentle on weak West-African networks.
  const warmRest = () => {
    import('@/pages/FrenchPage').catch(() => {});
    import('@/pages/DaHubPage').catch(() => {});
    import('@/pages/PlatformsPage').catch(() => {});
    import('@/pages/ExplorePage').catch(() => {});
    import('@/pages/NbaPage').catch(() => {});
    import('@/pages/LibraryPage').catch(() => {});
    import('@/pages/WelcomePage').catch(() => {});
  };
  // SNAPPY PLAY: the hls.js engine (~162KB gzip) is lazy-loaded on first play.
  // On weak West-African networks that download would block the very first
  // tap→play. So we warm the engine chunk during a LATER idle window (after the
  // nav chunks), making first play instant. Pure module prefetch — it only
  // *defines* the Hls class, never instantiates, so zero side-effects, zero
  // interaction/visual change. mpegts is an empty chunk, so it's skipped.
  const warmPlayerEngine = () => { import('hls.js').catch(() => {}); };
  if (typeof window === 'undefined') return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (ric) {
    ric(warm, { timeout: 4000 });
    ric(warmRest, { timeout: 7000 });
    ric(warmPlayerEngine, { timeout: 9000 });
  } else {
    setTimeout(warm, 2500);
    setTimeout(warmRest, 4500);
    setTimeout(warmPlayerEngine, 6500);
  }
})();

// Build-time version stamp — compared against remote version.json
const APP_VERSION = __APP_VERSION__;

function UpdateButton() {
  const [available, setAvailable] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    // Also listen for SW-based updates as fallback
    const swHandler = () => setAvailable(true);
    window.addEventListener('tivi-update-available', swHandler);

    // Remote version gate — polls every 2 minutes
    let active = true;
    async function checkVersion() {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== APP_VERSION) {
          if (data.force) {
            setForceUpdate(true);
            // Clear caches AND unregister the SW so the reload can't be served a
            // stale shell — the #1 reason updates didn't reach the device.
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              } catch { /* ignore */ }
            }
            window.location.reload();
          } else {
            setAvailable(true);
          }
        }
      } catch { /* offline or error — skip */ }
    }

    checkVersion();
    const interval = setInterval(() => { if (active) checkVersion(); }, 15 * 60 * 1000);
    // Also check the instant the app returns to foreground — a backgrounded PWA
    // throttles the timer, so this is what catches it the moment you reopen it.
    const onVisible = () => { if (active && document.visibilityState === 'visible') checkVersion(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      active = false; clearInterval(interval);
      window.removeEventListener('tivi-update-available', swHandler);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  if (forceUpdate) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#060609] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-bold text-white mb-2">Updating DashTivi+</h1>
          <div className="w-10 h-[2px] mx-auto rounded-full overflow-hidden bg-white/5">
            <div className="h-full w-full bg-primary/50 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!available) return null;

  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-20 right-4 z-[9998] flex items-center gap-2 px-4 py-2.5 rounded-full
                 bg-primary/15 border border-primary/30 backdrop-blur-md
                 shadow-lg shadow-primary/20
                 animate-pulse hover:animate-none hover:bg-primary/25 hover:border-primary/50
                 transition-colors duration-300"
    >
      <span className="w-2 h-2 rounded-full bg-primary-light animate-ping" />
      <span className="text-xs font-semibold text-primary-light tracking-wide">Update available</span>
    </button>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Navigation = movement through media spaces, not page transitions. Content
// CONDENSES over the persistent world (background, header, navbar stay) instead
// of hard-cutting, and a single ambient bloom (#merge-breath) swells then
// dissolves on every route change — the merge, not a horizontal shift.
//
// MOVIES SPACE: when the destination is /movies, the bloom turns deep VIOLET —
// a purple breath dissolves the live world and the cinema condenses out of it.
// Routing is untouched (real route, back/forward intact); only the *transition*
// becomes a breath. Respects prefers-reduced-motion (the CSS no-ops the breath).
// Bloom-breath ONLY (no content remount). Fires the ambient #merge-breath on each
// route change. The old keyed `merge-infuse` wrapper is GONE for the primary tabs —
// they're kept ALIVE (not remounted), so on a tab switch the section headers don't
// replay their entrance, the pills don't re-animate, and the cards don't re-fade.
function MergeBreath({ pathname }: { pathname: string }) {
  React.useEffect(() => {
    const el = document.getElementById('merge-breath');
    if (el) {
      // Movies = the purple breath; everything else = the soft neutral whisper.
      if (pathname.startsWith('/movies')) el.setAttribute('data-space', 'movies');
      else el.removeAttribute('data-space');
      // Restart the one-shot breath cycle (remove → reflow → add).
      el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
    }
  }, [pathname]);
  return null;
}

// ── KEEP-ALIVE pane ──────────────────────────────────────────────────────────
// Mounts its page on FIRST activation, then keeps it mounted forever and only
// toggles visibility (display:none when inactive). Switching tabs therefore
// REVEALS an already-built, already-painted page instead of unmounting one and
// rebuilding the other — which is what caused "reloads on carousel change":
//   · headers/pills flickered  = entrance animations replaying on a fresh mount
//   · cards re-faded            = images re-painting from opacity 0 on remount
//   · layout shifted ~0.27      = the destination rebuilding from scratch
// Kept alive, none of that happens — the page is already there, just hidden.
function KeepAlivePane({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(active);
  React.useEffect(() => { if (active) setMounted(true); }, [active]);
  if (!mounted) return null;
  return (
    <div style={{ display: active ? 'block' : 'none' }} aria-hidden={!active}>
      <ErrorBoundary>
        <Suspense fallback={null}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  );
}

function AppContent({ guestMode, onRequestCode, onLogout }: { guestMode?: boolean; onRequestCode?: (code: string) => Promise<unknown>; onLogout?: () => void }) {
  const { credentials, logout, tier } = useAuth();
  // Sign-out must reset the AUTH-GATING state (the one in AppRouter), not just this
  // component's own useAuth copy — otherwise the screen only flips on a manual
  // refresh. Prefer the threaded gating logout; fall back to local for safety.
  const handleLogout = useCallback(() => { (onLogout || logout)(); }, [onLogout, logout]);
  const { t } = useLanguage();
  // STATIC CATALOG: tier-gate channels (Full sees all, Starter sees starter-only).
  useEffect(() => { setActiveTier(guestMode ? 'starter' : tier); }, [tier, guestMode]);
  const player = usePlayer();
  const { addToHistory, getResume, updateDuration } = useWatchHistory();
  const ambientStartedRef = React.useRef(false);

  // INP: keep tab/route switches responsive. The live location commits the URL
  // instantly (fast paint of the current view), while the HEAVY route-tree
  // render is driven by a DEFERRED location — React renders it concurrently /
  // interruptibly off the input-critical path, so the tap responds in <1 frame
  // instead of blocking the main thread for the new page's full sync render.
  const routerLocation = useLocation();
  const deferredRouteLoc = useDeferredValue(routerLocation);

  // The full-screen player now mounts as a RISING SURFACE over the persistent
  // world (SurfaceStack), instead of a plain z-index overlay. `showFullPlayer`
  // is derived from "is the player surface up" so all the existing video /
  // background / mini-player logic keeps working unchanged.
  const surfaces = useSurfaces();
  const playerSurfaceUp = surfaces.has(PLAYER_SURFACE_ID);
  const playerPortalTarget = useSurfacePortalTarget(PLAYER_SURFACE_ID);
  const showFullPlayer = playerSurfaceUp;
  // Exact scroll position of the world beneath the player, captured at rise and
  // restored at recede — so closing the player returns to precisely where you
  // were (the page never unmounted; this guards against the <video> taking
  // focus and nudging the document scroll to 0 when it fills the screen).
  const worldScrollRef = React.useRef(0);
  const [showCodeOverlay, setShowCodeOverlay] = useState(false);
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);
  const [codeInput, setCodeInput] = useState('');

  // ── Movable mini-player position (shared) ──────────────────────────────
  // The minimized <video> and the MiniPlayer chrome card are two separate fixed
  // elements that must move together as one unit. We hold ONE position here and
  // apply the identical left/top to both so they stay pixel-aligned while dragged.
  // `null` = not yet dragged → use the default bottom-right anchor.
  const [miniPos, setMiniPos] = useState<{ x: number; y: number } | null>(null);
  // viewport tick so the default anchor recomputes on resize/rotate.
  const [miniVp, setMiniVp] = useState(0);
  useEffect(() => {
    const onResize = () => setMiniVp((n) => n + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  // Card geometry — must match MiniPlayer's tailwind size (w-72 / sm:w-80, 16:9).
  const miniW = typeof window !== 'undefined' && window.innerWidth >= 640 ? 320 : 288;
  const miniH = Math.round((miniW * 9) / 16);
  // Default anchor = the old resting spot: right-4, bottom-20 (mobile) / bottom-4 (lg).
  const defaultMiniPos = React.useMemo(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const bottomPx = window.innerWidth >= 1024 ? 16 : 80;
    return {
      x: window.innerWidth - miniW - 16,
      y: window.innerHeight - miniH - bottomPx,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniVp, miniW, miniH]);
  const effectiveMiniPos = miniPos ?? defaultMiniPos;
  // Re-clamp a dragged position back inside the viewport after a resize/rotate.
  useEffect(() => {
    if (!miniPos) return;
    const cx = Math.max(6, Math.min(window.innerWidth - miniW - 6, miniPos.x));
    const cy = Math.max(56, Math.min(window.innerHeight - miniH - 8, miniPos.y));
    if (cx !== miniPos.x || cy !== miniPos.y) setMiniPos({ x: cx, y: cy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniVp]);

  // Layered back: system/browser BACK closes the Go-Premium modal (pops the top
  // layer) instead of leaving the app.
  const closeCodeOverlay = useCallback(() => setShowCodeOverlay(false), []);
  useBackGuard(showCodeOverlay, closeCodeOverlay, 'go-premium');

  const handleAmbientStart = React.useCallback(() => {
    if (!ambientStartedRef.current && isAmbientEnabled()) {
      ambientStartedRef.current = true;
      startAmbient();
    }
  }, []);

  const handlePlayChannel = useCallback(
    (channel: Channel) => {
      // Guest mode: gate only actual streams, not trailers/previews
      if (guestMode && (channel.url?.includes('/live?') || channel.url?.includes('/vod?') || channel.url?.includes('/movie/') || channel.url?.includes('/series/'))) {
        setPendingChannel(channel);
        setShowCodeOverlay(true);
        return;
      }
      // Free channels + trailers play immediately for guests
      const isVod = channel.category === 'movie' || channel.category === 'series';
      if (isVod) playDashCinemaSound();
      muteAmbient();
      // Remember exactly where the world is scrolled before the player rises.
      if (!surfaces.has(PLAYER_SURFACE_ID)) worldScrollRef.current = window.scrollY;
      // Smart-resume — for movies/series, hand the saved position to the player so
      // it picks up where the member left off (0 = start; near-finished = start).
      const resumeFrom = isVod ? getResume(channel.id) : 0;
      player.playChannel(channel, resumeFrom).catch(() => {});
      addToHistory(channel);
      setCurrentChannel(channel.id);
      // Rise the player surface over the world (no-op if already up).
      surfaces.push({ id: PLAYER_SURFACE_ID, portal: true });
    },
    [player, addToHistory, getResume, guestMode, surfaces]
  );

  // Smart-resume — persist VOD playback position as it plays, so reopening a
  // title resumes and the Keep Watching row stays current. ontimeupdate already
  // throttles to ~1/s in usePlayer; we additionally guard to ~every 5s of progress
  // to keep localStorage writes (and re-renders) cheap.
  const lastSavedRef = React.useRef(0);
  useEffect(() => {
    const ch = player.state.channel;
    if (!ch) return;
    const isVod = ch.category === 'movie' || ch.category === 'series';
    if (!isVod) return;
    const ct = player.state.currentTime;
    const dur = player.state.duration;
    if (ct <= 5 || dur <= 0) return;
    if (Math.abs(ct - lastSavedRef.current) < 5) return;
    lastSavedRef.current = ct;
    updateDuration(ch.id, dur, ct, dur);
  }, [player.state.currentTime, player.state.channel, player.state.duration, updateDuration]);

  const handleCodeSubmit = async () => {
    if (onRequestCode && codeInput.trim()) {
      const ok = await onRequestCode(codeInput.trim());
      if (ok) {
        setShowCodeOverlay(false);
        if (pendingChannel) handlePlayChannel(pendingChannel);
      }
    }
    setCodeInput('');
  };

  // Restore the world's exact scroll position as the player recedes. Applied
  // across several frames + short timers so it outlasts any late layout/focus
  // scroll nudges (e.g. the <video> shrinking back to the mini slot), through
  // the full recede transition (~420ms).
  const restoreWorldScroll = useCallback(() => {
    const y = worldScrollRef.current;
    const apply = () => window.scrollTo(0, y);
    apply();
    requestAnimationFrame(apply);
    requestAnimationFrame(() => requestAnimationFrame(apply));
    [60, 160, 320, 460].forEach((ms) => setTimeout(apply, ms));
  }, []);

  const handleClosePlayer = useCallback(() => {
    // Don't unmute ambient — video still plays in MiniPlayer
    // Ambient only unmutes when video fully stops (handleStopPlayer)
    // Recede the player surface back into the world; restore exact scroll —
    // the page underneath never unmounted.
    surfaces.pop(PLAYER_SURFACE_ID);
    restoreWorldScroll();
  }, [surfaces, restoreWorldScroll]);

  // Layered back: when the player surface recedes for ANY reason — including a
  // system/browser BACK press (SurfaceStack pops the top surface on popstate) —
  // restore the exact world scroll, same as the close button does. Guard on a
  // true→false transition so it only fires on recede, not on rise.
  const playerWasUpRef = React.useRef(false);
  useEffect(() => {
    if (playerWasUpRef.current && !playerSurfaceUp) {
      restoreWorldScroll();
    }
    playerWasUpRef.current = playerSurfaceUp;
  }, [playerSurfaceUp, restoreWorldScroll]);

  const handleStopPlayer = useCallback(() => {
    surfaces.pop(PLAYER_SURFACE_ID);
    restoreWorldScroll();
    player.stop();
    unmuteAmbient();
  }, [player, surfaces, restoreWorldScroll]);

  const handleExpandMini = useCallback(() => {
    worldScrollRef.current = window.scrollY;
    surfaces.push({ id: PLAYER_SURFACE_ID, portal: true });
  }, [surfaces]);

  // Swipe-surf from the mini card — play the adjacent channel WITHOUT raising
  // the full player (the new-era remote keeps you in the mini context). Reuses
  // the existing play path; just skips the surface push that handlePlayChannel
  // does. Guest-gated streams still go through the code overlay.
  const handleMiniSurf = useCallback((channel: Channel) => {
    if (guestMode && (channel.url?.includes('/live?') || channel.url?.includes('/vod?') || channel.url?.includes('/movie/') || channel.url?.includes('/series/'))) {
      setPendingChannel(channel);
      setShowCodeOverlay(true);
      return;
    }
    player.playChannel(channel).catch(() => {});
    addToHistory(channel);
    setCurrentChannel(channel.id);
  }, [player, addToHistory, guestMode]);

  // Unlock screen orientation — overrides manifest (works without reinstall)
  React.useEffect(() => {
    try { screen.orientation?.unlock?.(); } catch {}
  }, []);

  // Ambient blobs — organic morphing glow + audio-reactive scale
  // PERF FIX: throttled rAF loop — only runs when scrolled past threshold (blobs visible).
  // When hidden (opacity 0), loop yields to save GPU frames.
  const blobsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    initAudioReactive();
    let running = true;
    let isVisible = false;
    // PERF: --pulse drives a slow (~0.2Hz) CSS breathing on card glow + the luminance
    // band, document-wide. Writing it at 60fps forced a full-document style recalc every
    // frame even at rest. Throttle to ~20fps (imperceptible for so slow an effect) and
    // skip redundant writes so a settled pulse costs zero invalidation. Same look.
    const PULSE_MS = 1000 / 20;
    let lastWrite = 0;
    let lastPulse = -1;
    const animate = (now: number) => {
      if (!running) return;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      const el = blobsRef.current;
      if (el) {
        const shouldShow = window.scrollY > 80;
        if (shouldShow && !isVisible) {
          el.style.opacity = '1';
          isVisible = true;
        } else if (!shouldShow && isVisible) {
          el.style.opacity = '0';
          isVisible = false;
        }
        if (now - lastWrite >= PULSE_MS) {
          lastWrite = now;
          // Audio pulse — drives blob scale + goggle lens breathing
          const pulse = getAmbientPulse();
          if (isVisible) {
            el.style.transform = `translateX(-50%) scale(${(1.0 + pulse * 0.03).toFixed(4)})`;
          }
          // Broadcast pulse as CSS variable — goggle lens + card glow breathe with music.
          // Only write on meaningful change to avoid needless document-wide recalc.
          if (Math.abs(pulse - lastPulse) > 0.004) {
            lastPulse = pulse;
            document.documentElement.style.setProperty('--pulse', pulse.toFixed(3));
          }
        }
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, []);

  // Disable pull-to-refresh while the full player is open — a downward category-surf
  // swipe in the player must not hard-reload the page mid-stream.
  const ptr = usePullToRefresh({ enabled: !showFullPlayer });
  useScrollAmbient();

  if (!credentials && !guestMode) return null;

  return (
    <div className="min-h-screen bg-bg relative" onClick={handleAmbientStart}>
      <OfflineBanner />
      {/* Pull-to-refresh indicator */}
      {ptr.pulling && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9998] flex items-center justify-center transition-opacity duration-200"
          style={{ top: Math.max(0, ptr.pullY - 20), opacity: ptr.pullY > 20 ? Math.min(1, ptr.pullY / 60) : 0 }}
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center backdrop-blur-sm"
            style={{
              background: ptr.refreshing ? 'rgba(199,125,255,0.2)' : 'rgba(0,0,0,0.6)',
              borderColor: ptr.pullY > 40 ? 'rgba(199,125,255,0.5)' : 'rgba(255,255,255,0.15)',
              transform: `rotate(${ptr.pullY * 3}deg)`,
            }}
          >
            {ptr.refreshing ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Hide all background layers when full player is active — prevents visual leak + saves GPU */}
      {!showFullPlayer && (
        <>
          <CosmicBackground />
          <div ref={blobsRef} className="ambient-blobs">
            <div className="ambient-blob ambient-blob-1" />
            <div className="ambient-blob ambient-blob-2" />
          </div>
          <div className="brand-atmosphere" />
          <div className="goggle-lens" />
          {/* Scroll ambient — radial glow that follows scroll position */}
          <div id="scroll-ambient" className="fixed inset-0 pointer-events-none z-[1]" style={{
            background: 'radial-gradient(ellipse 60% 35% at 50% var(--ambient-y, 30%), rgba(157,78,221,0.04) 0%, transparent 70%)',
            transition: 'none',
            // PERF: no `will-change: background` — `background` is NOT a compositable
            // property, so the hint only pinned a permanent wasted GPU layer (529-layer
            // explosion) without helping. The --ambient-y scroll update still works.
          }} />
        </>
      )}
      {/* Media-space breath — the ambient bloom that swells then dissolves on
          route change (purple when entering the Movies space). Hidden during
          full-screen playback. Styling + reduced-motion guard live in globals.css. */}
      {!showFullPlayer && <div id="merge-breath" aria-hidden="true" />}
      <div className="relative z-10">
        <ScrollToTop />
        {/* ONE pill up there — the Dynamic Island. The standalone purple
            "Turn on alerts" pill is gone; the alerts opt-in re-homes inside the
            island next. */}
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9997] pointer-events-auto flex items-center gap-2">
          <DynamicIsland appCode="tivi" guestMode={guestMode} />
        </div>
        <Header onLogout={handleLogout} />
        <Navbar />
        {(credentials || guestMode) && <SearchWidget credentials={credentials} onPlay={handlePlayChannel} />}
        <main className="pb-20 lg:pb-0 lg:pl-[72px] safe-bottom-content">
          <ErrorBoundary>
            {/* Ambient bloom-breath on every route change (no content remount). */}
            <MergeBreath pathname={deferredRouteLoc.pathname} />

            {/* PRIMARY TABS — KEPT ALIVE. Mounted once on first visit, then only
                shown/hidden. Switching Home↔Movies↔Series↔Live reveals an
                already-built, already-painted page: headers don't re-animate, cards
                don't re-fade, pills stay, and there's zero rebuild/layout-shift. */}
            <KeepAlivePane active={deferredRouteLoc.pathname === '/'}>
              <HomePage credentials={credentials} onPlay={handlePlayChannel} />
            </KeepAlivePane>
            <KeepAlivePane active={deferredRouteLoc.pathname === '/movies'}>
              <MoviesPage credentials={credentials} onPlay={handlePlayChannel} />
            </KeepAlivePane>
            <KeepAlivePane active={deferredRouteLoc.pathname === '/series'}>
              <SeriesPage credentials={credentials} onPlay={handlePlayChannel} />
            </KeepAlivePane>
            <KeepAlivePane active={deferredRouteLoc.pathname === '/live'}>
              <LiveTVPage credentials={credentials} onPlay={handlePlayChannel} />
            </KeepAlivePane>

            {/* SECONDARY routes — visited less often; normal mount/unmount. Only
                rendered when NOT on a primary tab (so they never overlay them). */}
            {!['/', '/movies', '/series', '/live'].includes(deferredRouteLoc.pathname) && (
              <Suspense fallback={<div className="pt-20 px-4 space-y-6 animate-pulse"><div className="h-[22vh] rounded-2xl bg-white/[0.02]" /><div className="flex gap-2">{[1,2,3,4].map(i=><div key={i} className="h-8 w-16 rounded-full bg-white/[0.03]" />)}</div><div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 rounded-xl bg-white/[0.02]" />)}</div></div>}>
                <Routes location={deferredRouteLoc}>
                  <Route path="/live/:experienceId" element={<ErrorBoundary><ExperienceHomePage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/nba" element={<ErrorBoundary><NbaPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/french" element={<ErrorBoundary><FrenchPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/hub" element={<ErrorBoundary><DaHubPage /></ErrorBoundary>} />
                  <Route path="/library" element={<ErrorBoundary><LibraryPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/explore" element={<ErrorBoundary><ExplorePage /></ErrorBoundary>} />
                  {/* /streamore + /originals retired → redirect home / series. */}
                  <Route path="/streamore" element={<Navigate to="/" replace />} />
                  <Route path="/originals" element={<Navigate to="/series" replace />} />
                  <Route path="/test" element={<ErrorBoundary><TestChannelsPage onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            )}
          </ErrorBoundary>
        </main>
        {/* Player controls ride the RISING SURFACE: rendered here (so player.state
            stays live — no stale closure) but PORTALED into the surface-layer's
            mount node, which owns the rise/recede animation + keep-alive. The
            persistent <video> below stays in the shell behind it. */}
        {showFullPlayer && player.state.channel && playerPortalTarget &&
          createPortal(
            <VideoPlayer state={player.state} videoRef={player.videoRef} containerRef={player.containerRef}
              onTogglePlay={player.togglePlay} onToggleMute={player.toggleMute} onVolumeChange={player.setVolume}
              onToggleFullscreen={player.toggleFullscreen} onTogglePiP={player.togglePiP}
              onQualityChange={player.changeQuality}
              onClose={handleClosePlayer} onRetry={handlePlayChannel} onBack={handleClosePlayer} onSeek={player.seek}
              credentials={credentials} />,
            playerPortalTarget
          )}
        {player.streamLimit && (
          <StreamLimitOverlay
            info={player.streamLimit}
            onDismiss={player.dismissStreamLimit}
            onUpgrade={(plan) => {
              // Open WhatsApp with pre-filled upgrade message
              const msg = plan === 'familyPlan'
                ? "Hi! I'd like to upgrade to the Family Plan (5 screens) for DashTivi+"
                : "Hi! I'd like to add a Second Screen to my DashTivi+ account";
              window.open(`https://wa.me/224611361300?text=${encodeURIComponent(msg)}`, '_blank');
              player.dismissStreamLimit();
            }}
          />
        )}
        <MiniPlayer state={player.state} videoRef={player.videoRef} onTogglePlay={player.togglePlay}
          onClose={handleStopPlayer} onExpand={handleExpandMini} onSurf={handleMiniSurf}
          visible={!showFullPlayer && !!player.state.channel}
          pos={effectiveMiniPos} dragged={!!miniPos} onMove={setMiniPos}
          cardW={miniW} cardH={miniH} />
        {/* Single persistent <video> element — NEVER unmounted.
            Full player mode: fills screen behind VideoPlayer controls overlay.
            Mini mode: becomes the small picture-in-picture rectangle (bottom-right),
            still playing — the MiniPlayer card renders its chrome on top (z-[41]) of
            this video (z-40), both sharing the exact same fixed box so they align.
            Hidden mode (no channel): not rendered.
            createMediaElementSource only works once per element — this stays alive forever. */}
        <video
          ref={player.videoRef as React.RefObject<HTMLVideoElement>}
          className={showFullPlayer && player.state.channel
            ? `fixed inset-0 z-50 w-full h-full object-contain bg-black transition-[filter,transform] duration-500 ${
                player.state.isLoading && !player.state.isPlaying ? 'blur-sm scale-[1.01]' : ''
              }`
            : player.state.channel
              ? 'fixed z-40 w-72 sm:w-80 aspect-video rounded-2xl object-cover bg-black'
              : 'hidden'
          }
          // Mini mode: explicit left/top from the SHARED position so the video
          // tracks the MiniPlayer card 1:1 while it's dragged. (No effect in
          // full-player mode — inset-0 classes win.)
          style={!showFullPlayer && player.state.channel
            ? { left: effectiveMiniPos.x, top: effectiveMiniPos.y, transition: miniPos ? 'none' : undefined }
            : undefined}
          crossOrigin="anonymous"
          playsInline
          autoPlay
        />
        {/* Frozen-frame overlay — previous channel's last frame (blurred + dimmed) shown
            over the <video> during a channel switch, masking the black gap until the new
            stream paints. Cleared in usePlayer's onplaying handler. Full-player only. */}
        {showFullPlayer && player.state.channel && player.switchSnapshot && (
          <img
            src={player.switchSnapshot}
            alt=""
            aria-hidden="true"
            className="fixed inset-0 z-50 w-full h-full object-contain bg-black pointer-events-none transition-opacity duration-300"
            style={{
              filter: 'blur(14px) brightness(0.7)',
              transform: 'scale(1.06)',
            }}
          />
        )}
        <UpdateButton />

        {/* ── GO PREMIUM modal — gold-shimmer exclusive invitation ──────────
            Color law: GOLD #FFD700 = premium/pride/exclusive (NOT green —
            green is reserved for the free gift). Primary CTA opens WhatsApp
            with a premium-interest prefill (the upsell moment). Members who
            already hold a code can still redeem it (secondary). */}
        {showCodeOverlay && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/35 backdrop-blur-sm" onClick={() => setShowCodeOverlay(false)}>
            <style>{`
              @keyframes gold-shimmer { 0% { background-position: -180% 0; } 100% { background-position: 180% 0; } }
              .gold-cta-shimmer::after {
                content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
                background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 48%, transparent 66%);
                background-size: 220% 100%; animation: gold-shimmer 2.6s ease-in-out infinite;
              }
            `}</style>
            <div
              className="relative mx-4 w-full max-w-sm rounded-2xl p-6 overflow-hidden"
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(160deg, #14110a 0%, #0c0a06 60%, #0a0a0d 100%)',
                border: '1px solid rgba(255,215,0,0.35)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 44px rgba(255,215,0,0.10), inset 0 1px 0 rgba(255,215,0,0.12)',
              }}
            >
              {/* gold corner wash — the exclusive/pride glow */}
              <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.22) 0%, transparent 70%)' }} />
              {/* Visible close — no modal wall. */}
              <button
                onClick={() => setShowCodeOverlay(false)}
                aria-label="Close"
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,215,0,0.25)' }}
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
              <div className="relative text-center mb-5">
                <span
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #FFE680 0%, #FFD700 45%, #C9A100 100%)',
                    boxShadow: '0 6px 18px rgba(201,161,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <Crown className="w-6 h-6" style={{ color: '#1a1400' }} />
                </span>
                <h3 className="text-xl font-black tracking-tight mt-1"
                  style={{ fontFamily: "'Outfit', sans-serif", background: 'linear-gradient(135deg,#FFE680,#FFD700,#C9A100)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {t('goPremiumTitle')}
                </h3>
                <p className="text-[12.5px] text-white/55 mt-1.5 leading-snug px-2">
                  {t('goPremiumSubtitle')}
                </p>
              </div>
              <a
                href={`https://wa.me/224611361300?text=${encodeURIComponent(t('goPremiumWhatsappPrefill'))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gold-cta-shimmer relative block w-full text-center py-3.5 rounded-xl text-sm font-black mb-3 active:scale-[0.98] transition-transform overflow-hidden"
                style={{
                  color: '#1a1400',
                  background: 'linear-gradient(135deg, #FFE680 0%, #FFD700 48%, #E6B800 100%)',
                  boxShadow: '0 8px 22px rgba(201,161,0,0.4), inset 0 1px 0 rgba(255,255,255,0.55)',
                }}
              >
                {t('goPremiumCta')}
              </a>
              {/* Secondary — already have a code? redeem it. */}
              <input
                type="text"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                placeholder={t('goPremiumCodePlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white bg-white/[0.04] border border-white/10 focus:border-[rgba(255,215,0,0.45)] focus:outline-none mb-2 text-center tracking-wider placeholder:text-white/25"
                style={{ fontFamily: "'Space Grotesk', monospace" }}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              />
              <button
                onClick={handleCodeSubmit}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white/70 bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:text-white transition-colors active:scale-95"
              >
                {t('goPremiumUnlock')}
              </button>
              {/* Soft escape — never trap the member on the upsell. */}
              <button
                onClick={() => setShowCodeOverlay(false)}
                className="w-full mt-2.5 py-2 text-[12.5px] font-medium text-white/40 hover:text-white/70 transition-colors"
              >
                {t('goPremiumLater')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthedApp({ credentials, guestMode, onRequestCode, onLogout }: { credentials: { username: string; password: string } | null; guestMode?: boolean; onRequestCode?: (code: string) => Promise<unknown>; onLogout?: () => void }) {
  useEffect(() => {
    if (credentials) {
      preloadApiData((import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim(), credentials.username, credentials.password);
    }
  }, [credentials]);
  return <AppContent guestMode={guestMode} onRequestCode={onRequestCode} onLogout={onLogout} />;
}

function AppRouter() {
  const [showSplash, setShowSplash] = useState(() => !getItem<boolean>('splash_seen_plus', false));
  const guestCredentials = { username: 'guest', password: 'guest' };
  const auth = useAuth();
  const location = useLocation();

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setItem('splash_seen_plus', true);
    if (isAmbientEnabled()) startAmbient();
  }, []);

  // Always remove pre-splash overlay (it's only needed before React mounts)
  useEffect(() => {
    document.getElementById('pre-splash')?.remove();
  }, []);

  // Failsafe: if stuck loading for 4s, force show login.
  // MUST run unconditionally (above the /welcome early return) so hook order is stable.
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    if (!auth.isLoading) return;
    const t = setTimeout(() => setForceReady(true), 4000);
    return () => clearTimeout(t);
  }, [auth.isLoading]);

  if (location.pathname === '/welcome') {
    return (<Suspense fallback={<FullPageLoader />}><WelcomePage /></Suspense>);
  }

  const effectiveLoading = auth.isLoading && !forceReady;

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} authReady={!auth.isLoading} />}
      {!showSplash && effectiveLoading && (
        <div style={{ position: 'fixed', inset: 0, background: '#060609', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: 'white', fontFamily: "'Space Grotesk',system-ui", letterSpacing: '-0.02em' }}>DASH</span>
            <span style={{ fontSize: 26, fontWeight: 300, color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit',system-ui", marginLeft: 2 }}>tivi</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#C77DFF', marginLeft: 4 }}>+</span>
            <div style={{ marginTop: 16, width: 40, height: 3, background: 'rgba(199,125,255,0.4)', borderRadius: 2, margin: '20px auto 0', animation: 'loading-bar 1s ease infinite' }} />
            <p style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Connecting...</p>
          </div>
          <style>{`@keyframes loading-bar { 0%,100% { opacity:0.3; transform:scaleX(0.5) } 50% { opacity:1; transform:scaleX(1.5) } }`}</style>
        </div>
      )}
      {!showSplash && !effectiveLoading && !auth.isAuthenticated && (
        <AccessCodeLogin
          onLoginPin={async (id, pin) => { if (isAmbientEnabled()) startAmbient(); return auth.loginWithPin(id, pin); }}
          onLogin={async (code) => { if (isAmbientEnabled()) startAmbient(); return auth.login(code); }}
        />
      )}
      {auth.isAuthenticated && (
        <AuthedApp
          credentials={auth.credentials || guestCredentials}
          /* No anonymous browsing: everyone is a logged-in member. A member whose
             id+pin is valid but who has NO active entitlement is a FREE member
             (tier 'guest', no creds) — gate premium like a free user. */
          guestMode={auth.tier === 'guest'}
          onRequestCode={auth.login}
          /* Instant sign-out: this is the auth-gating instance, so calling it
             flips isAuthenticated → drops to login with no refresh. */
          onLogout={auth.logout}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <SurfaceProvider>
          <AppRouter />
        </SurfaceProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
