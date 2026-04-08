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
import { startPreload, preloadApiData } from '@/lib/preloader';
import { initScrollHaptics } from '@/lib/haptics';
import { playDashCinemaSound } from '@/lib/cinema-sound';
import { muteAmbient, unmuteAmbient, startAmbient, isAmbientEnabled, getAmbientPulse, initAudioReactive } from '@/lib/ambient-audio';
import { LanguageProvider } from '@/i18n';
import type { Channel } from '@/types';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

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

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="page-enter">{children}</div>;
}

function AppContent() {
  const { credentials, logout } = useAuth();
  const player = usePlayer();
  const { addToHistory } = useWatchHistory();
  const ambientStartedRef = React.useRef(false);

  const [showFullPlayer, setShowFullPlayer] = useState(false);

  const handleAmbientStart = React.useCallback(() => {
    if (!ambientStartedRef.current && isAmbientEnabled()) {
      ambientStartedRef.current = true;
      startAmbient();
    }
  }, []);

  const handlePlayChannel = useCallback(
    (channel: Channel) => {
      const isVod = channel.category === 'movie' || channel.category === 'series';
      if (isVod) playDashCinemaSound();
      muteAmbient();
      player.playChannel(channel);
      addToHistory(channel);
      setCurrentChannel(channel.id);
      setShowFullPlayer(true);
    },
    [player, addToHistory]
  );

  const handleClosePlayer = useCallback(() => {
    // Don't unmute ambient — video still plays in MiniPlayer
    // Ambient only unmutes when video fully stops (handleStopPlayer)
    setShowFullPlayer(false);
  }, []);

  const handleStopPlayer = useCallback(() => {
    setShowFullPlayer(false);
    player.stop();
    unmuteAmbient();
  }, [player]);

  const handleExpandMini = useCallback(() => {
    setShowFullPlayer(true);
  }, []);

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

  if (!credentials) return null;

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
        </>
      )}
      <div className="relative z-10">
        <ScrollToTop />
        <Header onLogout={logout} />
        <Navbar />
        <main className="pb-20 lg:pb-0 lg:pl-[72px] safe-bottom-content">
          <ErrorBoundary>
            <Suspense fallback={<div className="pt-20 px-4 space-y-6 animate-pulse"><div className="h-[22vh] rounded-2xl bg-white/[0.02]" /><div className="flex gap-2">{[1,2,3,4].map(i=><div key={i} className="h-8 w-16 rounded-full bg-white/[0.03]" />)}</div><div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 rounded-xl bg-white/[0.02]" />)}</div></div>}>
                <Routes>
                  <Route path="/" element={<ErrorBoundary><HomePage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/live/:experienceId" element={<ErrorBoundary><ExperienceHomePage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/live" element={<ErrorBoundary><LiveTVPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/movies" element={<ErrorBoundary><MoviesPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/series" element={<ErrorBoundary><SeriesPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/french" element={<ErrorBoundary><FrenchPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/hub" element={<ErrorBoundary><DaHubPage /></ErrorBoundary>} />
                  <Route path="/originals" element={<ErrorBoundary><PlatformsPage credentials={credentials} onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="/test" element={<ErrorBoundary><TestChannelsPage onPlay={handlePlayChannel} /></ErrorBoundary>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        {showFullPlayer && player.state.channel && (
          <VideoPlayer state={player.state} videoRef={player.videoRef} containerRef={player.containerRef}
            onTogglePlay={player.togglePlay} onToggleMute={player.toggleMute} onVolumeChange={player.setVolume}
            onToggleFullscreen={player.toggleFullscreen} onTogglePiP={player.togglePiP}
            onQualityChange={(_quality: string, _index: number) => { if (player.state.channel) handlePlayChannel(player.state.channel); }}
            onClose={handleClosePlayer} onRetry={handlePlayChannel} onBack={handleClosePlayer} onSeek={player.seek} />
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
          onClose={handleStopPlayer} onExpand={handleExpandMini} visible={!showFullPlayer && !!player.state.channel} />
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
        <UpdateButton />
      </div>
    </div>
  );
}

function AuthedApp({ credentials }: { credentials: { username: string; password: string } | null }) {
  useEffect(() => {
    if (credentials) {
      preloadApiData((import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim(), credentials.username, credentials.password);
    }
  }, [credentials]);
  return <AppContent />;
}

function AppRouter() {
  const [showSplash, setShowSplash] = useState(() => !getItem<boolean>('splash_seen_plus', false));
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
        <AccessCodeLogin onLogin={async (code) => { if (isAmbientEnabled()) startAmbient(); return auth.login(code); }} />
      )}
      {auth.isAuthenticated && <AuthedApp credentials={auth.credentials} />}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </LanguageProvider>
  );
}
