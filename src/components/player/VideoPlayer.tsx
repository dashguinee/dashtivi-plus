import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerControls } from './PlayerControls';
import { RefreshCw, AlertTriangle, Waves, ChevronLeft as ChevLeft, ChevronRight as ChevRight, SkipForward, SkipBack } from 'lucide-react';
import { useAdjacentChannels, usePlaylistState, setCurrentChannel } from '@/lib/playlist';
import { useKeyboard } from '@/hooks/useKeyboard';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { SmartMatch } from './SmartMatch';
import { EpgWidget } from './EpgWidget';
import { getStreamQuality, setStreamQuality } from '@/lib/xtream';
import type { Channel, PlayerState } from '@/types';

function detectVod(state: PlayerState): boolean {
  const cat = state.channel?.category?.toLowerCase() ?? '';
  if (cat === 'movie' || cat === 'series') return true;
  const url = state.channel?.url ?? '';
  if (url.includes('/vod?') || url.includes('/series/')) return true;
  if (/\.(mp4|mkv|avi)/.test(decodeURIComponent(url))) return true;
  return false;
}

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
  const switchCooldownRef = useRef(false); // suppresses controls flash on live channel switch
  const prevChannelIdRef = useRef<string | null>(null);
  const [showEcoPrompt, setShowEcoPrompt] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(false);
  const [seekDirection, setSeekDirection] = useState<'forward' | 'backward'>('forward');

  const isVod = detectVod(state);

  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapRef = useRef<{ x: number; t: number }>({ x: 0, t: 0 });
  const { prev: adjPrev, next: adjNext } = useAdjacentChannels();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const elapsed = Date.now() - start.t;

    // Horizontal swipe: >50px horizontal, <30px vertical, <300ms — live channels only
    if (absDx > 50 && absDy < 30 && elapsed < 300 && !isVod) {
      if (dx < 0 && adjNext) {
        setCurrentChannel(adjNext.id);
        onRetry(adjNext);
      } else if (dx > 0 && adjPrev) {
        setCurrentChannel(adjPrev.id);
        onRetry(adjPrev);
      }
      return;
    }

    // Double-tap: +10s forward (right side) or -10s backward (left side) — VOD only
    if (isVod && absDx < 20 && absDy < 20) {
      const now = Date.now();
      const screenW = window.innerWidth;
      const isRightSide = touch.clientX > screenW * 0.55;
      const isLeftSide = touch.clientX < screenW * 0.45;
      if ((isRightSide || isLeftSide) && now - lastTapRef.current.t < 300 && Math.abs(touch.clientX - lastTapRef.current.x) < 60) {
        if (onSeek && state.duration > 0) {
          if (isRightSide) {
            onSeek(Math.min(state.duration, state.currentTime + 10));
          } else {
            onSeek(Math.max(0, state.currentTime - 10));
          }
          setSeekIndicator(true);
          setSeekDirection(isRightSide ? 'forward' : 'backward');
          setTimeout(() => setSeekIndicator(false), 600);
        }
        lastTapRef.current = { x: 0, t: 0 };
        return;
      }
      lastTapRef.current = { x: touch.clientX, t: now };
    }
  }, [isVod, adjPrev, adjNext, onRetry, onSeek, state.duration, state.currentTime]);

  // Auto-retry with backoff: 3s → 6s → 10s, then give up to manual
  const autoRetryRef = useRef(0);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (state.error && !state.error.includes('Retry') && !state.isPlaying && state.channel) {
      if (autoRetryRef.current < 3) {
        const delay = [3000, 6000, 10000][autoRetryRef.current] || 10000;
        autoRetryTimerRef.current = setTimeout(() => {
          autoRetryRef.current += 1;
          onRetry(state.channel!);
        }, delay);
      }
    }
    if (state.isPlaying) autoRetryRef.current = 0;
    return () => { if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current); };
  }, [state.error, state.isPlaying, state.channel, onRetry]);
  const [hasSubs, setHasSubs] = useState(false);
  const [subsOn, setSubsOn] = useState(false);
  const [subsUnavailable, setSubsUnavailable] = useState(false);
  const bufferCountRef = useRef(0);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Live TV: suppress controls on channel switch — let stream settle first
  // But keep carousel/recommendations visible for continuous browsing
  const [switchingChannel, setSwitchingChannel] = useState(false);
  useEffect(() => {
    const id = state.channel?.id ?? null;
    if (id && id !== prevChannelIdRef.current && prevChannelIdRef.current !== null && !isVod) {
      switchCooldownRef.current = true;
      setSwitchingChannel(true);
      setControlsVisible(false);
    }
    prevChannelIdRef.current = id;
  }, [state.channel?.id, isVod]);

  // Cinema intro — shows until video is READY (not a fixed timer)
  const [showCinemaIntro, setShowCinemaIntro] = useState(false);
  // Post-cinema blackout: pure black screen between intro and playback (no overlay, no controls)
  const [postCinemaBlackout, setPostCinemaBlackout] = useState(false);
  const cinemaChannelRef = useRef<string | null>(null);
  const cinemaMinTimeRef = useRef(false); // has minimum 2.5s elapsed?

  const cinemaMinTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const cinemaMaxTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Trigger cinema intro when a VOD channel starts loading
  const cinemaAbortedRef = useRef(false);
  const cinemaMutedByUsRef = useRef(false); // tracks if cinema intro owns the mute
  useEffect(() => {
    const isVod = state.channel?.category === 'movie' || state.channel?.category === 'series';
    const channelId = state.channel?.id ?? null;

    if (isVod && state.isLoading && channelId !== cinemaChannelRef.current) {
      cinemaChannelRef.current = channelId;
      cinemaMinTimeRef.current = false;
      cinemaAbortedRef.current = false;
      setShowCinemaIntro(true);
      // Mute during cinema intro — directly, without touching userMutedRef
      if (videoRef.current && !state.isMuted) {
        videoRef.current.muted = true;
        cinemaMutedByUsRef.current = true;
      }
      cinemaMinTimerRef.current = setTimeout(() => { cinemaMinTimeRef.current = true; }, 2500);
      // Bug 2 fix: check aborted flag before unmuting at max timeout
      cinemaMaxTimerRef.current = setTimeout(() => {
        if (cinemaAbortedRef.current) return;
        // Cinema time expired — transition to black screen, unmute deferred to blackout lift
        setShowCinemaIntro(false);
        setPostCinemaBlackout(true);
        setControlsVisible(false);
      }, 8000);
    } else if (!state.channel) {
      cinemaChannelRef.current = null;
      setShowCinemaIntro(false);
      setPostCinemaBlackout(false);
    }

    return () => {
      cinemaAbortedRef.current = true;
      clearTimeout(cinemaMinTimerRef.current);
      clearTimeout(cinemaMaxTimerRef.current);
      // Only unmute if cinema intro owned the mute — don't force unmute on channel switch
      if (cinemaMutedByUsRef.current && videoRef.current) {
        videoRef.current.muted = false;
      }
      cinemaMutedByUsRef.current = false;
    };
  }, [state.channel, state.isLoading]);

  // Dismiss cinema intro when video starts playing AND min time elapsed
  useEffect(() => {
    if (showCinemaIntro && state.isPlaying && cinemaMinTimeRef.current) {
      const video = videoRef.current;
      // Verify video has actually decoded frames (readyState >= HAVE_CURRENT_DATA)
      if (video && video.readyState >= 2) {
        if (cinemaMutedByUsRef.current) {
          video.muted = false;
          cinemaMutedByUsRef.current = false;
        }
        cinemaAbortedRef.current = true;
        setControlsVisible(false);
        setShowCinemaIntro(false);
        // No blackout needed — video is already playing with frames decoded
      } else {
        // Video not fully ready — enter blackout (pure black until frames arrive)
        cinemaAbortedRef.current = true;
        setShowCinemaIntro(false);
        setPostCinemaBlackout(true);
        setControlsVisible(false);
        // Unmute will happen when blackout lifts
      }
    }
  }, [showCinemaIntro, state.isPlaying]);

  // Also enter blackout when cinema max timer fires but video isn't playing yet
  // (the 8s max timer in the cinema effect above sets showCinemaIntro=false)

  // Lift blackout once video has decoded frames
  useEffect(() => {
    if (postCinemaBlackout && state.isPlaying) {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        // Unmute if cinema intro owned the mute
        if (cinemaMutedByUsRef.current) {
          video.muted = false;
          cinemaMutedByUsRef.current = false;
        }
        setPostCinemaBlackout(false);
        // Let movie breathe — controls hidden for 3s
        setControlsVisible(false);
        hideTimerRef.current = setTimeout(() => setControlsVisible(true), 3000);
      } else {
        // Not fully decoded yet — poll briefly
        const poll = setInterval(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            clearInterval(poll);
            if (cinemaMutedByUsRef.current) {
              if (videoRef.current.muted) onToggleMute();
              cinemaMutedByUsRef.current = false;
            }
            setPostCinemaBlackout(false);
            setControlsVisible(false);
          }
        }, 200);
        return () => clearInterval(poll);
      }
    }
  }, [postCinemaBlackout, state.isPlaying]);

  const isPlayingRef = useRef(state.isPlaying);
  useEffect(() => { isPlayingRef.current = state.isPlaying; }, [state.isPlaying]);

  const showControls = useCallback(() => {
    if (switchCooldownRef.current) return; // During live switch cooldown, don't flash controls
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) setControlsVisible(false);
    }, 4500);
  }, []);

  // Live TV: hide controls on channel switch, reveal gently after 2s
  // VOD: show controls when paused
  useEffect(() => {
    if (!state.isPlaying) {
      if (!switchCooldownRef.current && !showCinemaIntro && !postCinemaBlackout) {
        setControlsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
    } else if (!isVod && switchCooldownRef.current) {
      // Live channel just started playing — wait 2s, then gently show, then auto-hide
      setSwitchingChannel(false);
      setControlsVisible(false);
      hideTimerRef.current = setTimeout(() => {
        switchCooldownRef.current = false;
        setControlsVisible(true);
        hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
      }, 2000);
    } else {
      switchCooldownRef.current = false;
      setSwitchingChannel(false);
      showControls();
    }
  }, [state.isPlaying, showControls, isVod]);

  // Keyboard controls — extracted to useKeyboard hook
  const handleNextChannel = useCallback(() => {
    if (adjNext) { setCurrentChannel(adjNext.id); onRetry(adjNext); }
  }, [adjNext, onRetry]);

  const handlePrevChannel = useCallback(() => {
    if (adjPrev) { setCurrentChannel(adjPrev.id); onRetry(adjPrev); }
  }, [adjPrev, onRetry]);

  useKeyboard({
    isActive: !!state.channel,
    isPlaying: state.isPlaying,
    isMuted: state.isMuted,
    isVod,
    onTogglePlay,
    onToggleMute,
    onToggleFullscreen,
    onSeek,
    currentTime: state.currentTime,
    duration: state.duration,
    onNext: adjNext ? handleNextChannel : undefined,
    onPrev: adjPrev ? handlePrevChannel : undefined,
    onClose,
    onShowControls: showControls,
  });

  // Buffering detection — suggest Eco mode after repeated buffering
  useEffect(() => {
    const video = videoRef.current;
    if (!video || getStreamQuality() === 'eco') return;

    const isLive = state.channel?.url?.includes('/live?') || state.channel?.url?.includes('.m3u8') || state.channel?.category === 'live';
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
    const subsAbort = new AbortController();

    let activeBlobUrl: string | null = null;

    fetch(subsUrl, { signal: subsAbort.signal }).then(res => {
      if (res.status === 200) {
        return res.blob().then(blob => {
          activeBlobUrl = URL.createObjectURL(blob);
          // Remove existing tracks (proper iteration — don't use querySelector loop)
          Array.from(video.querySelectorAll('track')).forEach(t => {
            if (t.src) URL.revokeObjectURL(t.src);
            t.remove();
          });
          // Add new track
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = 'English';
          track.srclang = 'en';
          track.src = activeBlobUrl;
          track.default = false;
          video.appendChild(track);
          setHasSubs(true);
          setSubsUnavailable(false);
        });
      } else {
        setHasSubs(false);
        setSubsUnavailable(true);
      }
    }).catch((err) => { if (err.name !== 'AbortError') { setHasSubs(false); setSubsUnavailable(true); } });

    return () => {
      subsAbort.abort();
      // Revoke blob URL on cleanup — prevents memory leak
      if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
      // Remove tracks from video element
      if (video) Array.from(video.querySelectorAll('track')).forEach(t => t.remove());
    };
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
      className="fixed inset-0 z-[51] flex items-center justify-center"
      onMouseMove={showControls}
      onTouchStart={(e) => { showControls(); handleTouchStart(e); }}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (controlsVisible) showControls();
        else setControlsVisible(true);
      }}
    >
      {/* Video element lives in App.tsx (persistent, never unmounts).
          It renders at z-50 behind this overlay when full player is active.
          No <video> here — eliminates mount/unmount audio orphaning. */}

      {/* Cinema intro — VOD only, runs independently of loading state */}
      {showCinemaIntro && (
        <>
          <DashCinemaLoader title={state.channel?.name} />
          {/* Escape hatch — always accessible during cinema intro */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowCinemaIntro(false); onClose(); }}
            className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="absolute bottom-6 left-6 z-[60] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Pause"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><rect x="2" y="1" width="3.5" height="12" rx="1"/><rect x="8.5" y="1" width="3.5" height="12" rx="1"/></svg>
          </button>
        </>
      )}

      {seekIndicator && (
        <div className={`absolute ${seekDirection === 'forward' ? 'right-16' : 'left-16'} top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-pulse`}>
          <div className="flex items-center gap-1 bg-black/60 rounded-full px-3 py-2">
            {seekDirection === 'forward' ? (
              <SkipForward className="w-5 h-5 text-white" />
            ) : (
              <SkipBack className="w-5 h-5 text-white" />
            )}
            <span className="text-sm text-white font-medium">10s</span>
          </div>
        </div>
      )}

      {/* Post-cinema blackout — pure black screen while video buffers after DASH intro */}
      {postCinemaBlackout && (
        <div className="absolute inset-0 z-40 bg-[#060609]" />
      )}

      {/* Subtle loading — no branding, just a thin beam on translucent overlay */}
      {state.isLoading && !state.error && !state.isPlaying && !showCinemaIntro && !postCinemaBlackout && (
        <div className={`absolute inset-0 flex items-center justify-center z-40 transition-opacity duration-500 ${
          state.channel ? 'bg-black/40' : 'bg-[#060609]'
        }`}>
          <div className="w-12 h-[1.5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: '40%',
                background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.4), rgba(157,78,221,0.6), rgba(157,78,221,0.4), transparent)',
                animation: 'dash-beam 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* Unified reconnection flow — seamless between inner retries and outer retries */}
      {state.error && !state.isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#060609]/90 z-40">
          {state.error.includes('Retry') || autoRetryRef.current < 3 ? (
            <div className="text-center">
              <p className="text-[12px] text-white/25 font-light tracking-wide">Reconnecting</p>
              <div className="mt-3 mx-auto w-8 h-[2px] rounded-full overflow-hidden bg-white/5">
                <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.2s ease-in-out infinite' }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-sm text-white/40">{state.error || 'Unable to connect — tap to try again'}</p>
              <button
                onClick={() => { autoRetryRef.current = 0; state.channel && onRetry(state.channel); }}
                className="flex items-center gap-2 px-6 py-3 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reconnect
              </button>
            </div>
          )}
        </div>
      )}

      {/* StreamFlow suggestion — shows after repeated buffering */}
      {showEcoPrompt && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-black/90 border border-primary/30 rounded-2xl backdrop-blur-sm shadow-lg">
            <Waves className="w-5 h-5 text-primary-light flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Unstable connection</p>
              <p className="text-[11px] text-white/50">Switch to StreamFlow for smooth playback</p>
            </div>
            <button
              onClick={handleSwitchToEco}
              className="px-4 py-1.5 bg-primary rounded-lg text-xs font-bold text-white hover:bg-primary-light transition-colors flex-shrink-0"
            >
              Flow
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

      {/* Channel switching arrows — large edge zones (live only, hidden for VOD) */}
      {!isVod && (
        <ChannelArrows
          controlsVisible={controlsVisible}
          isLive={!!state.channel?.url?.includes('/live?')}
          onRetry={onRetry}
          showControls={showControls}
        />
      )}

      {/* Top corner prev/next hints (live only, hidden for VOD) */}
      {!isVod && (
        <ChannelHints
          visible={controlsVisible}
          isLive={!!state.channel?.url?.includes('/live?')}
          onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
        />
      )}

      {/* Landscape genre quick-switch (live only, hidden for VOD) */}
      {!isVod && (
        <LandscapeGenreBar
          visible={controlsVisible}
          isFullscreen={state.isFullscreen}
          isLive={!!state.channel?.url?.includes('/live?')}
          onGenreSwitch={onGenreSwitch}
        />
      )}

      {/* EPG Widget — bottom-left now playing + schedule */}
      <EpgWidget
        streamId={state.channel?.id ? parseInt(state.channel.id.replace(/^live-/, ''), 10) || null : null}
        visible={controlsVisible}
        isLive={!!state.channel?.url?.includes('/live?')}
      />

      {/* Smart Match — quality variants + family channels (live only, hidden for VOD) */}
      {/* Stays visible during channel switch so user can keep browsing */}
      {!isVod && (
        <SmartMatchOverlay
          channel={state.channel}
          visible={(controlsVisible || switchingChannel) && !showEcoPrompt}
          isLive={!!state.channel?.url?.includes('/live?')}
          onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
        />
      )}

      {/* Channel carousel — concave arc conveyor belt (live only, hidden for VOD) */}
      {/* Stays visible during channel switch so user can keep browsing */}
      {!isVod && (
        <ChannelCarousel
          visible={(controlsVisible || switchingChannel) && !showEcoPrompt}
          isLive={!!state.channel?.url?.includes('/live?')}
          onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
        />
      )}

      {/* Controls overlay — hidden during cinema intro and post-cinema blackout */}
      {!showCinemaIntro && !postCinemaBlackout && (
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
      )}
    </div>
  );
};

/** DASH Cinema Loader — cinematic intro that masks buffer time for VOD content.
 *  Phase timeline (~2.5s total):
 *    0 (0-200ms)      — Pure black, screen settles
 *    1 (200-700ms)    — Purple glow emanates from center + "Zzzzoum" sound
 *    2 (700-1200ms)   — "DASH" text fades in, letter-spacing widens + "toundoum" impact
 *    3 (1200-2000ms)  — Movie title fades in, subtle pulse on glow
 *    4 (2000-2500ms)  — Everything fades to transparent, video takes over
 */
function DashCinemaLoader({ title }: { title?: string }) {
  const [phase, setPhase] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 0 → 1: Black settles, then glow + sound
    // Sound plays from App.tsx click handler (user gesture required for AudioContext)
    timers.push(setTimeout(() => setPhase(1), 200));

    // Phase 1 → 2: DASH text appears (synced with "toundoum" at ~500ms into sound)
    timers.push(setTimeout(() => setPhase(2), 700));

    // Phase 2 → 3: Movie title fades in
    timers.push(setTimeout(() => setPhase(3), 1200));

    // Phase 3 → 4: Fade out — video takes over
    timers.push(setTimeout(() => setPhase(4), 2000));

    // Final dismiss after fade-out transition completes
    timers.push(setTimeout(() => setDismissed(true), 2500));

    return () => timers.forEach(clearTimeout);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: 'black',
        opacity: phase >= 4 ? 0 : 1,
        transition: 'opacity 500ms ease-out',
        pointerEvents: phase >= 4 ? 'none' : 'auto',
      }}
    >
      {/* Purple radial glow — expands from center */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(157,78,221,0.35) 0%, rgba(157,78,221,0.12) 35%, rgba(157,78,221,0.03) 60%, transparent 75%)',
          transform: `scale(${phase >= 1 ? (phase >= 2 ? 1.8 : 1.2) : 0})`,
          opacity: phase >= 1 ? (phase >= 4 ? 0 : 1) : 0,
          transition: phase >= 2 ? 'transform 800ms ease-out, opacity 500ms ease-out' : 'transform 500ms ease-out, opacity 400ms ease-out',
        }}
      />

      {/* Glow pulse ring — synced with "toundoum" bass hit */}
      {phase >= 2 && phase < 4 && (
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            border: '1px solid rgba(157,78,221,0.2)',
            animation: 'cinema-pulse 1.5s ease-out forwards',
          }}
        />
      )}

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* DASH text — letter-spacing animates from tight to wide */}
        <h2
          className="text-3xl sm:text-4xl font-black uppercase select-none"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: `translateY(${phase >= 2 ? 0 : 12}px)`,
            letterSpacing: phase >= 2 ? (phase >= 3 ? '0.5em' : '0.15em') : '0.05em',
            color: '#C77DFF',
            textShadow: phase >= 2
              ? '0 0 30px rgba(157,78,221,0.6), 0 0 60px rgba(157,78,221,0.2)'
              : 'none',
            transition: 'opacity 400ms ease-out, transform 400ms ease-out, letter-spacing 800ms cubic-bezier(0.16, 1, 0.3, 1), text-shadow 400ms ease-out',
          }}
        >
          DASH
        </h2>

        {/* Thin accent line under DASH */}
        <div
          style={{
            width: phase >= 2 ? 60 : 0,
            height: 1,
            marginTop: 12,
            background: 'linear-gradient(90deg, transparent, rgba(199,125,255,0.5), transparent)',
            opacity: phase >= 2 ? (phase >= 4 ? 0 : 0.7) : 0,
            transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-out',
          }}
        />

        {/* Movie title */}
        {title && (
          <p
            className="mt-5 text-sm sm:text-base text-center max-w-xs select-none"
            style={{
              opacity: phase >= 3 ? (phase >= 4 ? 0 : 0.4) : 0,
              transform: `translateY(${phase >= 3 ? 0 : 8}px)`,
              color: 'rgba(255,255,255,0.4)',
              transition: 'opacity 500ms ease-out, transform 500ms ease-out',
            }}
          >
            {title}
          </p>
        )}
      </div>

      <style>{`
        @keyframes cinema-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center
                          bg-black/25 backdrop-blur-sm border border-white/8
                          group-hover:bg-primary/15 group-hover:border-primary/40
                          group-hover:shadow-lg group-hover:shadow-primary/25
                          group-active:scale-90 transition-[transform,background-color,border-color,box-shadow] duration-300">
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
          <div className="absolute inset-0 bg-gradient-to-l from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center
                          bg-black/25 backdrop-blur-sm border border-white/8
                          group-hover:bg-primary/15 group-hover:border-primary/40
                          group-hover:shadow-lg group-hover:shadow-primary/25
                          group-active:scale-90 transition-[transform,background-color,border-color,box-shadow] duration-300">
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
                      transition-opacity duration-300
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
                      transition-opacity duration-300
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
    { id: 'sports',        name: 'Sports',        gradient: 'from-red-500 to-orange-700' },
    { id: 'news',          name: 'News',           gradient: 'from-blue-500 to-sky-700' },
    { id: 'entertainment', name: 'Entertainment',  gradient: 'from-purple-500 to-violet-700' },
    { id: 'kids',          name: 'Kids',           gradient: 'from-pink-500 to-rose-600' },
    { id: 'movies247',     name: 'Movies',         gradient: 'from-red-500 to-rose-700' },
    { id: 'documentary',   name: 'Discovery',      gradient: 'from-blue-500 to-indigo-700' },
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
                  transition-[opacity,transform] duration-300
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
                          transition-[transform,color,border-color] duration-300 active:scale-95
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

/** SmartMatch overlay — bridges playlist state to SmartMatch component */
function SmartMatchOverlay({
  channel,
  visible,
  isLive,
  onSwitch,
}: {
  channel: Channel | null;
  visible: boolean;
  isLive: boolean;
  onSwitch: (channel: Channel) => void;
}) {
  const { channels } = usePlaylistState();

  if (!isLive || !channel || channels.length <= 1) return null;

  return (
    <SmartMatch
      currentChannel={channel}
      allChannels={channels}
      onSwitch={onSwitch}
      visible={visible}
    />
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
      className={`absolute bottom-[72px] sm:bottom-[80px] left-0 right-0 z-30 transition-[opacity,transform] duration-300
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
                className={`flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl transition-[transform,background-color,border-color,box-shadow] duration-300
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
