import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerControls } from './PlayerControls';
import { RefreshCw, AlertTriangle, Zap, ChevronLeft as ChevLeft, ChevronRight as ChevRight } from 'lucide-react';
import { useAdjacentChannels, usePlaylistState, setCurrentChannel } from '@/lib/playlist';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { getStreamQuality, setStreamQuality } from '@/lib/xtream';
import type { Channel, PlayerState } from '@/types';

interface Props {
  state: PlayerState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onQualityChange: (quality: string, index: number) => void;
  onClose: () => void;
  onRetry: (channel: Channel) => void;
  onBack?: () => void;
  onSeek?: (time: number) => void;
  onGenreSwitch?: (themeId: string) => void;
}

export const VideoPlayer: React.FC<Props> = ({
  state,
  videoRef,
  containerRef,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
  onTogglePiP,
  onQualityChange,
  onClose,
  onRetry,
  onBack,
  onSeek,
  onGenreSwitch,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [showEcoPrompt, setShowEcoPrompt] = useState(false);
  const [hasSubs, setHasSubs] = useState(false);
  const [subsOn, setSubsOn] = useState(false);
  const [subsUnavailable, setSubsUnavailable] = useState(false);
  const bufferCountRef = useRef(0);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (state.isPlaying) setControlsVisible(false);
    }, 3000);
  }, [state.isPlaying]);

  // Show controls when paused
  useEffect(() => {
    if (!state.isPlaying) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showControls();
    }
  }, [state.isPlaying, showControls]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          onToggleMute();
          break;
        case 'Escape':
          if (state.isFullscreen) onToggleFullscreen();
          else onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(1, state.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(0, state.volume - 0.1));
          break;
        case 'ArrowLeft':
          if (onSeek && state.duration > 0) {
            e.preventDefault();
            onSeek(Math.max(0, state.currentTime - 10));
          }
          break;
        case 'ArrowRight':
          if (onSeek && state.duration > 0) {
            e.preventDefault();
            onSeek(Math.min(state.duration, state.currentTime + 10));
          }
          break;
        case 'Home':
          if (onSeek && state.duration > 0 && !state.channel?.url?.includes('/live?')) {
            e.preventDefault();
            onSeek(0);
          }
          break;
        case 'End':
          if (onSeek && state.duration > 0 && !state.channel?.url?.includes('/live?')) {
            e.preventDefault();
            onSeek(Math.max(0, state.duration - 2));
          }
          break;
      }
      showControls();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, onTogglePlay, onToggleFullscreen, onToggleMute, onVolumeChange, onClose, showControls]);

  // Buffering detection — suggest Eco mode after repeated buffering
  useEffect(() => {
    const video = videoRef.current;
    if (!video || getStreamQuality() === 'eco') return;

    const isLive = state.channel?.url?.includes('/live?');
    if (!isLive) return; // Only for live TV

    const onWaiting = () => {
      bufferCountRef.current++;
      if (bufferCountRef.current >= 3 && !showEcoPrompt) {
        setShowEcoPrompt(true);
      }
    };

    // Reset buffer count every 60s
    bufferTimerRef.current = setInterval(() => {
      bufferCountRef.current = 0;
    }, 60000);

    video.addEventListener('waiting', onWaiting);
    return () => {
      video.removeEventListener('waiting', onWaiting);
      if (bufferTimerRef.current) clearInterval(bufferTimerRef.current);
    };
  }, [state.channel, videoRef, showEcoPrompt]);

  // Load subtitles for MKV VOD content
  useEffect(() => {
    const video = videoRef.current;
    const url = state.channel?.url;
    if (!video || !url || !url.includes('/vod?')) {
      setHasSubs(false);
      setSubsOn(false);
      setSubsUnavailable(false);
      return;
    }

    // Build subs URL from VOD URL params
    const subsUrl = url.replace('/vod?', '/subs?');

    fetch(subsUrl).then(res => {
      if (res.status === 200) {
        return res.blob().then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          // Remove existing tracks
          while (video.textTracks.length > 0) {
            const track = video.querySelector('track');
            if (track) track.remove();
            else break;
          }
          // Add new track
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = 'English';
          track.srclang = 'en';
          track.src = blobUrl;
          track.default = false;
          video.appendChild(track);
          setHasSubs(true);
          setSubsUnavailable(false);
        });
      } else {
        setHasSubs(false);
        setSubsUnavailable(true);
      }
    }).catch(() => { setHasSubs(false); setSubsUnavailable(true); });
  }, [state.channel, videoRef]);

  const toggleSubs = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks[0]) return;
    const newState = !subsOn;
    video.textTracks[0].mode = newState ? 'showing' : 'hidden';
    setSubsOn(newState);
  }, [subsOn, videoRef]);

  const handleSwitchToEco = useCallback(() => {
    setStreamQuality('eco');
    setShowEcoPrompt(false);
    bufferCountRef.current = 0;
    // Reconnect immediately with Eco quality
    if (state.channel) {
      // Rebuild channel URL with eco quality param
      const ch = state.channel;
      onRetry({ ...ch });
    }
  }, [state.channel, onRetry]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!state.channel) return null;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center ${
        state.isFullscreen ? '' : ''
      }`}
      onMouseMove={showControls}
      onClick={() => {
        if (controlsVisible) showControls();
        else setControlsVisible(true);
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
      />

      {/* Loading — DASH Cinema loader for movies, spinner for live */}
      {state.isLoading && !state.error && !state.isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {state.channel?.category === 'movie' || state.channel?.category === 'series' ? (
            <DashCinemaLoader title={state.channel?.name} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-white/50">Connecting...</p>
            </div>
          )}
        </div>
      )}

      {/* Reconnecting — auto-retry in progress */}
      {state.error && state.error.includes('Retry') && !state.isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-white/50">Reconnecting...</p>
          </div>
        </div>
      )}

      {/* Stream interrupted — manual reconnect needed */}
      {state.error && !state.error.includes('Retry') && !state.isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-sm text-white/40">Channel unavailable</p>
            <button
              onClick={() => state.channel && onRetry(state.channel)}
              className="flex items-center gap-2 px-6 py-3 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </button>
          </div>
        </div>
      )}

      {/* Eco mode suggestion — shows after repeated buffering */}
      {showEcoPrompt && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-black/90 border border-primary/30 rounded-2xl backdrop-blur-sm shadow-lg">
            <Zap className="w-5 h-5 text-primary-light flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Slow connection?</p>
              <p className="text-[11px] text-white/50">Switch to Eco for smooth playback</p>
            </div>
            <button
              onClick={handleSwitchToEco}
              className="px-4 py-1.5 bg-primary rounded-lg text-xs font-bold text-white hover:bg-primary-light transition-colors flex-shrink-0"
            >
              Eco
            </button>
            <button
              onClick={() => setShowEcoPrompt(false)}
              className="text-white/30 hover:text-white/60 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* CC unavailable indicator — shown when subtitle fetch failed for a VOD */}
      {subsUnavailable && state.channel?.url?.includes('/vod?') && (
        <div className="absolute bottom-20 right-4 z-40 pointer-events-none">
          <span className="text-[10px] text-white/40 bg-black/60 px-2 py-0.5 rounded">CC unavailable</span>
        </div>
      )}

      {/* Channel switching arrows — large edge zones */}
      <ChannelArrows
        controlsVisible={controlsVisible}
        isLive={!!state.channel?.url?.includes('/live?')}
        onRetry={onRetry}
        showControls={showControls}
      />

      {/* Top corner prev/next hints */}
      <ChannelHints
        visible={controlsVisible}
        isLive={!!state.channel?.url?.includes('/live?')}
        onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
      />

      {/* Landscape genre quick-switch */}
      <LandscapeGenreBar
        visible={controlsVisible}
        isFullscreen={state.isFullscreen}
        isLive={!!state.channel?.url?.includes('/live?')}
        onGenreSwitch={onGenreSwitch}
      />

      {/* Channel carousel — concave arc conveyor belt */}
      <ChannelCarousel
        visible={controlsVisible}
        isLive={!!state.channel?.url?.includes('/live?')}
        onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
      />

      {/* Controls overlay */}
      <PlayerControls
        state={state}
        onTogglePlay={onTogglePlay}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onToggleFullscreen={onToggleFullscreen}
        onTogglePiP={onTogglePiP}
        onQualityChange={onQualityChange}
        onClose={onClose}
        onBack={onBack}
        onSeek={onSeek}
        visible={controlsVisible}
        hasSubs={hasSubs}
        subsOn={subsOn}
        onToggleSubs={toggleSubs}
      />
    </div>
  );
};

/** DASH Cinema Loader — Netflix-style branded loading screen that hides buffer time */
function DashCinemaLoader({ title }: { title?: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);  // fade in
    const t2 = setTimeout(() => setPhase(2), 600);  // glow expand
    const t3 = setTimeout(() => setPhase(3), 1200); // title appear
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Central glow */}
      <div
        className="absolute rounded-full transition-all duration-1000 ease-out"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(157,78,221,0.4) 0%, rgba(157,78,221,0.1) 40%, transparent 70%)',
          transform: `scale(${phase >= 1 ? 1.5 : 0})`,
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* Logo + text */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Lightning bolt icon */}
        <div
          className="transition-all duration-500 ease-out"
          style={{
            transform: `scale(${phase >= 1 ? 1 : 0.3}) translateY(${phase >= 1 ? 0 : 20}px)`,
            opacity: phase >= 1 ? 1 : 0,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD, #7B2CBF)',
              boxShadow: phase >= 2 ? '0 0 40px rgba(157,78,221,0.6), 0 0 80px rgba(157,78,221,0.3)' : '0 0 10px rgba(157,78,221,0.3)',
              transition: 'box-shadow 0.8s ease',
            }}
          >
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
        </div>

        {/* DASH text */}
        <h2
          className="mt-4 text-2xl font-black tracking-[6px] transition-all duration-500"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: `translateY(${phase >= 2 ? 0 : 10}px)`,
            color: '#C77DFF',
            textShadow: '0 0 20px rgba(157,78,221,0.5)',
          }}
        >
          DASH
        </h2>

        {/* Movie title */}
        {title && (
          <p
            className="mt-6 text-sm text-white/40 text-center max-w-xs transition-all duration-500"
            style={{
              opacity: phase >= 3 ? 1 : 0,
              transform: `translateY(${phase >= 3 ? 0 : 10}px)`,
            }}
          >
            {title}
          </p>
        )}

        {/* Loading bar */}
        <div
          className="mt-6 h-0.5 bg-white/10 rounded-full overflow-hidden transition-all duration-500"
          style={{
            width: phase >= 2 ? 120 : 0,
            opacity: phase >= 2 ? 1 : 0,
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
            style={{
              animation: 'dash-load 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes dash-load {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

/** Channel switching arrows — large edge zones between top bar and carousel */
function ChannelArrows({
  controlsVisible,
  isLive,
  onRetry,
  showControls,
}: {
  controlsVisible: boolean;
  isLive: boolean;
  onRetry: (channel: import('@/types').Channel) => void;
  showControls: () => void;
}) {
  const { prev, next } = useAdjacentChannels();

  const switchTo = useCallback((channel: import('@/types').Channel) => {
    setCurrentChannel(channel.id);
    onRetry(channel);
  }, [onRetry]);

  // Keyboard: PageUp/PageDown for channel switching
  useEffect(() => {
    if (!isLive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'PageUp' && prev) {
        e.preventDefault();
        switchTo(prev);
        showControls();
      } else if (e.key === 'PageDown' && next) {
        e.preventDefault();
        switchTo(next);
        showControls();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLive, prev, next, switchTo, showControls]);

  if (!isLive || (!prev && !next)) return null;

  // Safe zone: below top bar (56px), above carousel+controls (~160px from bottom)
  return (
    <>
      {/* Left edge — large tap zone spanning safe middle area */}
      {prev && (
        <button
          onClick={(e) => { e.stopPropagation(); switchTo(prev); }}
          className={`absolute left-0 top-[56px] bottom-[160px] w-12 sm:w-14 z-40
                      flex items-center justify-center group
                      transition-opacity duration-300
                      ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label={`Previous: ${prev.name}`}
        >
          {/* Gradient edge glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center
                          bg-black/25 backdrop-blur-sm border border-white/8
                          group-hover:bg-primary/15 group-hover:border-primary/40
                          group-hover:shadow-lg group-hover:shadow-primary/25
                          group-active:scale-90 transition-all duration-200">
            <ChevLeft
              className="w-5 h-5 text-white/50 group-hover:text-primary-light transition-colors"
              style={{ filter: 'drop-shadow(0 0 4px rgba(157, 78, 221, 0.3))' }}
            />
          </div>
        </button>
      )}

      {/* Right edge — same, mirrored */}
      {next && (
        <button
          onClick={(e) => { e.stopPropagation(); switchTo(next); }}
          className={`absolute right-0 top-[56px] bottom-[160px] w-12 sm:w-14 z-40
                      flex items-center justify-center group
                      transition-opacity duration-300
                      ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label={`Next: ${next.name}`}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center
                          bg-black/25 backdrop-blur-sm border border-white/8
                          group-hover:bg-primary/15 group-hover:border-primary/40
                          group-hover:shadow-lg group-hover:shadow-primary/25
                          group-active:scale-90 transition-all duration-200">
            <ChevRight
              className="w-5 h-5 text-white/50 group-hover:text-primary-light transition-colors"
              style={{ filter: 'drop-shadow(0 0 4px rgba(157, 78, 221, 0.3))' }}
            />
          </div>
        </button>
      )}
    </>
  );
}

/** Top corner prev/next channel hints — subtle VOYO SmallCard style */
function ChannelHints({
  visible,
  isLive,
  onSwitch,
}: {
  visible: boolean;
  isLive: boolean;
  onSwitch: (channel: import('@/types').Channel) => void;
}) {
  const { prev, next } = useAdjacentChannels();

  if (!isLive || (!prev && !next)) return null;

  return (
    <>
      {/* Previous channel — top left, below the top bar */}
      {prev && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentChannel(prev.id); onSwitch(prev); }}
          className={`absolute top-[56px] left-3 z-35 flex items-center gap-2 px-2 py-1.5 rounded-xl
                      transition-all duration-300
                      ${visible ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <ChevLeft className="w-3 h-3 text-white/40" />
          <div className="w-6 h-6 flex-shrink-0">
            <ChannelIcon src={prev.logo} name={prev.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
          </div>
          <span className="text-[9px] text-white/40 max-w-[60px] truncate hidden sm:block">{prev.name}</span>
        </button>
      )}

      {/* Next channel — top right, below the top bar, offset from X button */}
      {next && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentChannel(next.id); onSwitch(next); }}
          className={`absolute top-[56px] right-14 z-35 flex items-center gap-2 px-2 py-1.5 rounded-xl
                      transition-all duration-300
                      ${visible ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span className="text-[9px] text-white/40 max-w-[60px] truncate hidden sm:block">{next.name}</span>
          <div className="w-6 h-6 flex-shrink-0">
            <ChannelIcon src={next.logo} name={next.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
          </div>
          <ChevRight className="w-3 h-3 text-white/40" />
        </button>
      )}
    </>
  );
}

/** Landscape genre quick-switch bar — fullscreen-only horizontal pill row */
function LandscapeGenreBar({
  visible,
  isFullscreen,
  isLive,
  onGenreSwitch,
}: {
  visible: boolean;
  isFullscreen: boolean;
  isLive: boolean;
  onGenreSwitch?: (themeId: string) => void;
}) {
  const themes = [
    { id: 'sports',        name: 'Sports',        gradient: 'from-green-500 to-emerald-700' },
    { id: 'news',          name: 'News',           gradient: 'from-blue-500 to-sky-700' },
    { id: 'entertainment', name: 'Entertainment',  gradient: 'from-purple-500 to-violet-700' },
    { id: 'kids',          name: 'Kids',           gradient: 'from-pink-500 to-rose-600' },
    { id: 'movies247',     name: 'Movies',         gradient: 'from-red-500 to-rose-700' },
    { id: 'documentary',   name: 'Discovery',      gradient: 'from-teal-500 to-cyan-700' },
    { id: 'music',         name: 'Music',           gradient: 'from-fuchsia-500 to-pink-700' },
  ];

  // Only visible in fullscreen live mode
  if (!isFullscreen || !isLive) return null;

  const handlePill = (themeId: string) => {
    if (onGenreSwitch) {
      onGenreSwitch(themeId);
    } else {
      // No-op: brief visual flash handled via CSS active state
    }
  };

  return (
    <div
      className={`absolute bottom-[130px] sm:bottom-[140px] left-0 right-0 z-30
                  transition-all duration-300
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
    >
      {/* Glass container */}
      <div
        className="mx-4 rounded-2xl px-3 py-2 flex justify-center"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handlePill(theme.id)}
              className={`flex-shrink-0 text-[10px] px-3 py-1.5 rounded-full font-medium
                          transition-all duration-200 active:scale-95
                          bg-black/30 backdrop-blur-sm text-white/50 border border-white/[0.08]
                          hover:text-white/80 hover:border-white/20`}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Channel carousel — concave arc conveyor belt (VOYO CompassArc adapted) */
function ChannelCarousel({
  visible,
  isLive,
  onSwitch,
}: {
  visible: boolean;
  isLive: boolean;
  onSwitch: (channel: import('@/types').Channel) => void;
}) {
  const { channels, currentId } = usePlaylistState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to center the current channel
  useEffect(() => {
    if (!scrollRef.current || !currentId) return;
    const el = scrollRef.current.querySelector(`[data-chid="${currentId}"]`) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentId]);

  if (!isLive || channels.length <= 1) return null;

  // Compute arc offsets relative to current channel index
  const currentIdx = channels.findIndex(c => c.id === currentId);

  return (
    <div
      className={`absolute bottom-[72px] sm:bottom-[80px] left-0 right-0 z-30 transition-all duration-300
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      {/* Glass background */}
      <div className="mx-2 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(157, 78, 221, 0.12)',
        }}
      >
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-2 py-2 items-end"
          style={{ minHeight: 56 }}
          onClick={(e) => e.stopPropagation()}
        >
          {channels.map((ch, i) => {
            const isCurrent = ch.id === currentId;
            // Concave arc: cards further from center dip down + shrink
            const absOffset = currentIdx >= 0 ? Math.abs(i - currentIdx) : 0;
            const yShift = Math.min(absOffset * absOffset * 1.5, 12); // quadratic dip, max 12px
            const scale = Math.max(1 - absOffset * 0.04, 0.85); // subtle shrink
            const opacity = isCurrent ? 1 : Math.max(1 - absOffset * 0.12, 0.4);

            return (
              <button
                key={ch.id}
                data-chid={ch.id}
                onClick={() => { if (!isCurrent) onSwitch(ch); }}
                className={`flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl transition-all duration-300
                  ${isCurrent
                    ? 'bg-primary/20 border border-primary/50 shadow-md shadow-primary/20'
                    : 'bg-white/[0.04] border border-transparent hover:bg-white/[0.08] hover:border-white/15 active:scale-95'
                  }`}
                style={{
                  transform: `translateY(${yShift}px) scale(${scale})`,
                  opacity,
                }}
              >
                <div className="w-7 h-7 flex-shrink-0">
                  <ChannelIcon src={ch.logo} name={ch.name} size="sm" className="!w-7 !h-7 !text-[10px] !rounded-lg" />
                </div>
                <span className={`text-[10px] whitespace-nowrap max-w-[70px] truncate leading-tight
                  ${isCurrent ? 'text-primary-light font-semibold' : 'text-white/50'}`}>
                  {ch.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
