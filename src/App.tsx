import React, { useState, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { CinematicLogin } from '@/components/ui/CinematicLogin';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePlayer } from '@/hooks/usePlayer';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useWatchGate } from '@/hooks/useWatchGate';
import { getCollectionByKey } from '@/data/collections';
import { getItem, setItem } from '@/lib/storage';
import type { Channel, Collection } from '@/types';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LiveGrid = lazy(() =>
  import('@/components/live/LiveGrid').then((m) => ({ default: m.LiveGrid }))
);
const SearchPage = lazy(() =>
  import('@/components/search/SearchPage').then((m) => ({ default: m.SearchPage }))
);
const CollectionBrowser = lazy(() =>
  import('@/components/collections/CollectionBrowser').then((m) => ({ default: m.CollectionBrowser }))
);
const CollectionDetail = lazy(() =>
  import('@/components/collections/CollectionDetail').then((m) => ({ default: m.CollectionDetail }))
);
const SettingsPage = lazy(() =>
  import('@/components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ServicesPage = lazy(() =>
  import('@/pages/ServicesPage').then((m) => ({ default: m.ServicesPage }))
);
const GamesPage = lazy(() =>
  import('@/pages/GamesPage').then((m) => ({ default: m.GamesPage }))
);
const WatchGate = lazy(() =>
  import('@/components/gate/WatchGate').then((m) => ({ default: m.WatchGate }))
);

function AppContent() {
  const navigate = useNavigate();
  const player = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToHistory, clearHistory } = useWatchHistory();
  const [gateState, gateActions] = useWatchGate();

  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);

  const playChannelNow = useCallback(
    (channel: Channel) => {
      player.playChannel(channel);
      addToHistory(channel.id);
      setShowFullPlayer(true);
    },
    [player, addToHistory]
  );

  const handlePlayChannel = useCallback(
    (channel: Channel) => {
      const shouldGate = gateActions.recordSwitch();
      if (shouldGate) {
        setPendingChannel(channel);
        return;
      }
      playChannelNow(channel);
    },
    [gateActions, playChannelNow]
  );

  const handleGateDismiss = useCallback(() => {
    gateActions.dismiss();
    if (pendingChannel) {
      playChannelNow(pendingChannel);
      setPendingChannel(null);
    }
  }, [gateActions, pendingChannel, playChannelNow]);

  const handleGateCreateAccount = useCallback(() => {
    gateActions.createAccount();
    if (pendingChannel) {
      playChannelNow(pendingChannel);
      setPendingChannel(null);
    }
  }, [gateActions, pendingChannel, playChannelNow]);

  const handleGateSubscribe = useCallback(() => {
    gateActions.subscribe();
  }, [gateActions]);

  const handleClosePlayer = useCallback(() => {
    setShowFullPlayer(false);
  }, []);

  const handleStopPlayer = useCallback(() => {
    setShowFullPlayer(false);
    player.stop();
  }, [player]);

  const handleExpandMini = useCallback(() => {
    setShowFullPlayer(true);
  }, []);

  const handleSelectCollection = useCallback(
    (collection: Collection) => {
      navigate(`/collections/${collection.key}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-bg relative">
      {/* Cosmic depth layer */}
      <CosmicBackground />

      {/* App shell */}
      <div className="relative z-10">
      <Header />
      <Navbar />

      <main className="pb-20 lg:pb-0 lg:pl-[72px]">
        <ErrorBoundary>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    onPlayChannel={handlePlayChannel}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                }
              />
              <Route
                path="/live"
                element={
                  <LiveGrid
                    onPlay={handlePlayChannel}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                }
              />
              <Route
                path="/search"
                element={
                  <SearchPage
                    onPlayChannel={handlePlayChannel}
                    onSelectCollection={handleSelectCollection}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                }
              />
              <Route
                path="/collections"
                element={<CollectionBrowser onSelect={handleSelectCollection} />}
              />
              <Route
                path="/collections/:key"
                element={<CollectionDetailPage onPlayChannel={handlePlayChannel} />}
              />
              <Route
                path="/games"
                element={<GamesPage />}
              />
              <Route
                path="/services"
                element={<ServicesPage />}
              />
              <Route
                path="/settings"
                element={<SettingsPage onClearHistory={clearHistory} />}
              />
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
          onQualityChange={player.changeQuality}
          onClose={handleClosePlayer}
          onRetry={handlePlayChannel}
          onBack={handleClosePlayer}
        />
      )}

      {gateState.isGated && (
        <Suspense fallback={null}>
          <WatchGate
            canDismiss={gateState.canDismiss}
            onDismiss={handleGateDismiss}
            onCreateAccount={handleGateCreateAccount}
            onSubscribe={handleGateSubscribe}
          />
        </Suspense>
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

function CollectionDetailPage({ onPlayChannel }: { onPlayChannel?: (channel: Channel) => void }) {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const collection = key ? getCollectionByKey(key) : undefined;

  if (!collection) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Collection not found</h2>
          <button
            onClick={() => navigate('/collections')}
            className="text-primary text-sm hover:text-primary-light"
          >
            Back to Collections
          </button>
        </div>
      </div>
    );
  }

  return <CollectionDetail collection={collection} onBack={() => navigate('/collections')} onPlayChannel={onPlayChannel} />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !getItem<boolean>('splash_seen', false));
  const [isLoggedIn, setIsLoggedIn] = useState(() => getItem<boolean>('tivi_login', false));

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setItem('splash_seen', true);
  }, []);

  const handleLogin = useCallback(() => {
    setIsLoggedIn(true);
    setItem('tivi_login', true);
  }, []);

  return (
    <BrowserRouter>
      {/* Layer 1: Splash (first visit only) */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Layer 2: Cinematic Login gate */}
      {!showSplash && !isLoggedIn && <CinematicLogin onLogin={handleLogin} />}

      {/* Layer 3: Main app */}
      {isLoggedIn && <AppContent />}
    </BrowserRouter>
  );
}
