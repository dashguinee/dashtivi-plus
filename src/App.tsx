import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
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
import { PushBell } from '@/components/ui/PushBell';
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
const TestChannelsPage = lazyRetry(() => import('@/pages/TestChannelsPage'));

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
            // Clear caches then reload
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            window.location.reload();
          } else {
            setAvailable(true);
          }
        }
      } catch { /* offline or error — skip */ }
    }

    checkVersion();
    const interval = setInterval(() => { if (active) checkVersion(); }, 2 * 60 * 1000);
    return () => { active = false; clearInterval(interval); window.removeEventListener('tivi-update-available', swHandler); };
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
      onClick={async () => {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        window.location.reload();
      }}
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

// Country-not-buildings: content infuses over the persistent world (background,
// header, navbar stay) instead of hard-cutting. A soft ambient "breath" blooms
// on every route change — the merge, not a horizontal shift.
function MergeTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  React.useEffect(() => {
    const el = document.getElementById('merge-breath');
    if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
  }, [pathname]);
  return <div key={pathname} className="merge-infuse">{children}</div>;
}

function AppContent({ guestMode, onRequestCode }: { guestMode?: boolean; onRequestCode?: (code: string) => Promise<unknown> }) {
  const { credentials, logout, tier } = useAuth();
  const { t } = useLanguage();
  // STATIC CATALOG: tier-gate channels (Full sees all, Starter sees starter-only).
  useEffect(() => { setActiveTier(guestMode ? 'starter' : tier); }, [tier, guestMode]);
  const player = usePlayer();
  const { addToHistory } = useWatchHistory();
  const ambientStartedRef = React.useRef(false);

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
      player.playChannel(channel).catch(() => {});
      addToHistory(channel);
      setCurrentChannel(channel.id);
      // Rise the player surface over the world (no-op if already up).
      surfaces.push({ id: PLAYER_SURFACE_ID, portal: true });
    },
    [player, addToHistory, guestMode, surfaces]
  );

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
    const animate = () => {
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
        // Audio pulse — drives blob scale + goggle lens breathing
        const pulse = getAmbientPulse();
        if (isVisible) {
          el.style.transform = `translateX(-50%) scale(${1.0 + pulse * 0.03})`;
        }
        // Broadcast pulse as CSS variable — goggle lens + card glow breathe with music
        document.documentElement.style.setProperty('--pulse', pulse.toFixed(3));
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, []);

  const ptr = usePullToRefresh();
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
            willChange: 'background',
          }} />
        </>
      )}
      <div className="relative z-10">
        <ScrollToTop />
        {/* Cross-app notification pill + push opt-in */}
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9997] pointer-events-auto flex items-center gap-2">
          <DynamicIsland appCode="tivi" guestMode={guestMode} />
          <PushBell appCode="tivi" />
        </div>
        <Header onLogout={logout} />
        <Navbar />
        {credentials && <SearchWidget credentials={credentials} onPlay={handlePlayChannel} />}
        <main className="pb-20 lg:pb-0 lg:pl-[72px] safe-bottom-content">
          <ErrorBoundary>
            <Suspense fallback={<div className="pt-20 px-4 space-y-6 animate-pulse"><div className="h-[22vh] rounded-2xl bg-white/[0.02]" /><div className="flex gap-2">{[1,2,3,4].map(i=><div key={i} className="h-8 w-16 rounded-full bg-white/[0.03]" />)}</div><div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 rounded-xl bg-white/[0.02]" />)}</div></div>}>
                <Routes>
                  <Route path="/" element={<ErrorBoundary><HomePage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/live/:experienceId" element={<ErrorBoundary><ExperienceHomePage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/live" element={<ErrorBoundary><LiveTVPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/nba" element={<ErrorBoundary><NbaPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/movies" element={<ErrorBoundary><MoviesPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/series" element={<ErrorBoundary><SeriesPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/french" element={<ErrorBoundary><FrenchPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/hub" element={<ErrorBoundary><DaHubPage /></ErrorBoundary>} />
                  <Route path="/explore" element={<ErrorBoundary><ExplorePage /></ErrorBoundary>} />
                  {/* /streamore retired — Stream+ is now the continuation of the ONE
                      home canvas (woven free + village), not a separate page/tab.
                      Old deep-links redirect home. */}
                  <Route path="/streamore" element={<Navigate to="/" replace />} />
                  {/* /originals (PlatformsPage) was data-less after the static migration ("No series found"); /series already does platform-organized series. Redirect to the working page. */}
                  <Route path="/originals" element={<Navigate to="/series" replace />} />
                  <Route path="/test" element={<ErrorBoundary><TestChannelsPage onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
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
              onClose={handleClosePlayer} onRetry={handlePlayChannel} onBack={handleClosePlayer} onSeek={player.seek} />,
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
          visible={!showFullPlayer && !!player.state.channel} />
        {/* Single persistent <video> element — NEVER unmounted.
            Full player mode: fills screen behind VideoPlayer controls overlay.
            Mini/hidden mode: 1x1 offscreen, keeps playing (no orphaned audio).
            createMediaElementSource only works once per element — this stays alive forever. */}
        <video
          ref={player.videoRef as React.RefObject<HTMLVideoElement>}
          className={showFullPlayer && player.state.channel
            ? `fixed inset-0 z-50 w-full h-full object-contain bg-black transition-[filter,transform] duration-500 ${
                player.state.isLoading && !player.state.isPlaying ? 'blur-sm scale-[1.01]' : ''
              }`
            : player.state.channel
              ? 'fixed -top-[9999px] -left-[9999px] w-1 h-1'
              : 'hidden'
          }
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

function AuthedApp({ credentials, guestMode, onRequestCode }: { credentials: { username: string; password: string } | null; guestMode?: boolean; onRequestCode?: (code: string) => Promise<unknown> }) {
  useEffect(() => {
    if (credentials) {
      preloadApiData((import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim(), credentials.username, credentials.password);
    }
  }, [credentials]);
  return <AppContent guestMode={guestMode} onRequestCode={onRequestCode} />;
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

  if (location.pathname === '/welcome') {
    return (<Suspense fallback={<FullPageLoader />}><WelcomePage /></Suspense>);
  }

  // Failsafe: if stuck loading for 4s, force show login
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    if (!auth.isLoading) return;
    const t = setTimeout(() => setForceReady(true), 4000);
    return () => clearTimeout(t);
  }, [auth.isLoading]);

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
