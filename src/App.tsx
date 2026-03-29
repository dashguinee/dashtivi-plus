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
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/hooks/useAuth';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { getItem, setItem } from '@/lib/storage';
import { setCurrentChannel } from '@/lib/playlist';
import { startPreload, preloadApiData } from '@/lib/preloader';
import { playDashCinemaSound } from '@/lib/cinema-sound';
import { muteAmbient, unmuteAmbient, startAmbient, isAmbientEnabled, getAmbientPulse, initAudioReactive } from '@/lib/ambient-audio';
import { LanguageProvider } from '@/i18n';
import type { Channel } from '@/types';

// Start preloading immediately on script load — before React even mounts
startPreload();

// Lazy load pages
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LiveTVPage = lazy(() => import('@/pages/LiveTVPage').then((m) => ({ default: m.LiveTVPage })));
const MoviesPage = lazy(() => import('@/pages/MoviesPage').then((m) => ({ default: m.MoviesPage })));
const SeriesPage = lazy(() => import('@/pages/SeriesPage').then((m) => ({ default: m.SeriesPage })));
const FrenchPage = lazy(() => import('@/pages/FrenchPage').then((m) => ({ default: m.FrenchPage })));
const WelcomePage = lazy(() => import('@/pages/WelcomePage').then((m) => ({ default: m.WelcomePage })));
const PlatformsPage = lazy(() => import('@/pages/PlatformsPage').then((m) => ({ default: m.PlatformsPage })));

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
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== APP_VERSION) {
          console.log('[UPDATE] Remote version:', data.version, '| Local:', APP_VERSION);
          if (data.force) {
            console.log('[UPDATE] Force update — reloading now');
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
        console.log('[UPDATE] User tapped — clearing caches and reloading');
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
    unmuteAmbient();
    setShowFullPlayer(false);
  }, []);

  const handleStopPlayer = useCallback(() => {
    unmuteAmbient();
    setShowFullPlayer(false);
    player.stop();
  }, [player]);

  const handleExpandMini = useCallback(() => {
    setShowFullPlayer(true);
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
        // Audio pulse — only update scale when visible, throttled
        if (isVisible) {
          const pulse = getAmbientPulse();
          el.style.transform = `translateX(-50%) scale(${1.0 + pulse * 0.03})`;
        }
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, []);

  if (!credentials) return null;

  return (
    <div className="min-h-screen bg-bg relative" onClick={handleAmbientStart}>
      <CosmicBackground />
      {/* PERF FIX: removed blob-3 (orange) — 2 blobs sufficient, less GPU load */}
      <div ref={blobsRef} className="ambient-blobs">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>
      <div className="relative z-10">
        <Header onLogout={logout} />
        <Navbar />
        <main className="pb-20 lg:pb-0 lg:pl-[72px]">
          <ErrorBoundary>
            <Suspense fallback={<div className="pt-20 px-4 space-y-6 animate-pulse"><div className="h-[22vh] rounded-2xl bg-white/[0.02]" /><div className="flex gap-2">{[1,2,3,4].map(i=><div key={i} className="h-8 w-16 rounded-full bg-white/[0.03]" />)}</div><div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 rounded-xl bg-white/[0.02]" />)}</div></div>}>
              <Routes>
                <Route path="/" element={<HomePage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/live" element={<LiveTVPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/movies" element={<MoviesPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/series" element={<SeriesPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/french" element={<FrenchPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/originals" element={<PlatformsPage credentials={credentials} onPlay={handlePlayChannel} />} />
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
        {!showFullPlayer && player.state.channel && (
          <video ref={player.videoRef as React.RefObject<HTMLVideoElement>} className="fixed -top-[9999px] -left-[9999px] w-1 h-1" playsInline autoPlay />
        )}
        <UpdateButton />
      </div>
    </div>
  );
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

  if (location.pathname === '/welcome') {
    return (<Suspense fallback={<FullPageLoader />}><WelcomePage /></Suspense>);
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} authReady={!auth.isLoading} />}
      {!showSplash && !auth.isAuthenticated && (
        <AccessCodeLogin onLogin={async (code) => { if (isAmbientEnabled()) startAmbient(); return auth.login(code); }} />
      )}
      {auth.isAuthenticated && (() => {
        if (auth.credentials) {
          preloadApiData((import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim(), auth.credentials.username, auth.credentials.password);
        }
        return <AppContent />;
      })()}
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
