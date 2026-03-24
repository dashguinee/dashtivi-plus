import React, { useState, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { AccessCodeLogin } from '@/components/ui/AccessCodeLogin';
import { VideoPlayer } from '@/components/player/VideoPlayer';
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
import { muteAmbient, unmuteAmbient, startAmbient, isAmbientEnabled } from '@/lib/ambient-audio';
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

function AppContent() {
  const { credentials, logout } = useAuth();
  const player = usePlayer();
  const { addToHistory } = useWatchHistory();
  const ambientStartedRef = React.useRef(false);

  const [showFullPlayer, setShowFullPlayer] = useState(false);

  // Ambient starts on any click — the simplest way
  const handleAmbientStart = React.useCallback(() => {
    if (!ambientStartedRef.current && isAmbientEnabled()) {
      ambientStartedRef.current = true;
      startAmbient();
    }
  }, []);

  const handlePlayChannel = useCallback(
    (channel: Channel) => {
      // Play cinema sound on user gesture (VOD only) — must be in click handler for AudioContext
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

  if (!credentials) return null;

  return (
    <div className="min-h-screen bg-bg relative" onClick={handleAmbientStart}>
      <CosmicBackground />

      <div className="relative z-10">
        <Header onLogout={logout} />
        <Navbar />

        <main className="pb-20 lg:pb-0 lg:pl-[72px]">
          <ErrorBoundary>
            <Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <HomePage
                      credentials={credentials}
                      onPlay={handlePlayChannel}
                    />
                  }
                />
                <Route
                  path="/live"
                  element={
                    <LiveTVPage
                      credentials={credentials}
                      onPlay={handlePlayChannel}
                    />
                  }
                />
                <Route
                  path="/movies"
                  element={
                    <MoviesPage
                      credentials={credentials}
                      onPlay={handlePlayChannel}
                    />
                  }
                />
                <Route
                  path="/series"
                  element={
                    <SeriesPage
                      credentials={credentials}
                      onPlay={handlePlayChannel}
                    />
                  }
                />
                <Route
                  path="/french"
                  element={
                    <FrenchPage
                      credentials={credentials}
                      onPlay={handlePlayChannel}
                    />
                  }
                />
                <Route
                  path="/originals"
                  element={
                    <PlatformsPage
                      credentials={credentials}
                      onPlay={handlePlayChannel}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        {showFullPlayer && player.state.channel && (
          <VideoPlayer
            state={player.state}
            videoRef={player.videoRef}
            containerRef={player.containerRef}
            onTogglePlay={player.togglePlay}
            onToggleMute={player.toggleMute}
            onVolumeChange={player.setVolume}
            onToggleFullscreen={player.toggleFullscreen}
            onTogglePiP={player.togglePiP}
            onQualityChange={(_quality: string, _index: number) => {
              // Quality changed — reconnect current channel with new quality
              if (player.state.channel) handlePlayChannel(player.state.channel);
            }}
            onClose={handleClosePlayer}
            onRetry={handlePlayChannel}
            onBack={handleClosePlayer}
            onSeek={player.seek}
          />
        )}

        <MiniPlayer
          state={player.state}
          videoRef={player.videoRef}
          onTogglePlay={player.togglePlay}
          onClose={handleStopPlayer}
          onExpand={handleExpandMini}
          visible={!showFullPlayer && !!player.state.channel}
        />

        {!showFullPlayer && player.state.channel && (
          <video
            ref={player.videoRef as React.RefObject<HTMLVideoElement>}
            className="fixed -top-[9999px] -left-[9999px] w-1 h-1"
            playsInline
            autoPlay
          />
        )}
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
    // Splash dismiss is a user gesture — start ambient
    if (isAmbientEnabled()) startAmbient();
  }, []);

  // /welcome is a public route — no splash, no auth gate
  if (location.pathname === '/welcome') {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <WelcomePage />
      </Suspense>
    );
  }

  return (
    <>
      {/* Layer 1: Splash */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Layer 2: Access Code Login */}
      {!showSplash && !auth.isAuthenticated && (
        <AccessCodeLogin onLogin={async (code) => {
          // Login button click = user gesture → start ambient
          if (isAmbientEnabled()) startAmbient();
          return auth.login(code);
        }} />
      )}

      {/* Layer 3: Main app — preload API data on auth */}
      {auth.isAuthenticated && (() => {
        if (auth.credentials) {
          preloadApiData(
            (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim(),
            auth.credentials.username,
            auth.credentials.password
          );
        }
        return <AppContent />;
      })()}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
