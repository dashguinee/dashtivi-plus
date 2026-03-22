import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
import { onStreamSuccess, onStreamFail, getStreamQuality } from '@/lib/xtream';
import type { Channel, PlayerState } from '@/types';

export function usePlayer() {
  const [state, setState] = useState<PlayerState>({
    channel: null,
    isPlaying: false,
    isMuted: false,
    volume: 1,
    isFullscreen: false,
    isPiP: false,
    quality: 'Auto',
    qualities: ['Auto'],
    isLoading: false,
    error: null,
    currentTime: 0,
    duration: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cleanup = useCallback(() => {
    if (destroyRef.current) {
      destroyRef.current();
      destroyRef.current = null;
    }
  }, []);

  const playChannel = useCallback(
    (channel: Channel) => {
      // Full cleanup — kill any existing stream
      cleanup();
      const video = videoRef.current;
      if (video) {
        video.onerror = null;
        video.onplaying = null;
        video.src = '';
        video.load();
      }

      setState({
        channel,
        isPlaying: false,
        isMuted: false,
        volume: 1,
        isFullscreen: false,
        isPiP: false,
        quality: 'Auto',
        qualities: ['Auto'],
        isLoading: true,
        error: null,
        currentTime: 0,
        duration: 0,
      });

      // Small delay to ensure video element is clean
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;

        // Rebuild URL with CURRENT quality setting (URL may be stale from initial play)
        let url = channel.url;
        const isLive = url.includes('/live?');
        const isVod = url.includes('/vod?');
        if (isLive || isVod) {
          url = url.replace(/&q=eco/, '');
          if (getStreamQuality() === 'eco') url += '&q=eco';
        }
        let retryCount = 0;

        video.src = url;
        video.play().catch(() => {});

        const maxRetries = isLive ? 5 : 3;
        video.onerror = () => {
          if (retryCount < maxRetries) {
            retryCount++;
            setState((prev) => ({ ...prev, error: `Retry ${retryCount}/${maxRetries}`, isPlaying: false }));
            setTimeout(() => {
              setState((prev) => ({ ...prev, error: null }));
              video.src = url;
              video.play().catch(() => {});
            }, 2000);
          } else {
            const idMatch = url.match(/[?&]id=(\d+)/);
            if (idMatch) onStreamFail(parseInt(idMatch[1]));
            markDead(channel.id, 'Stream error');
            setState((prev) => ({ ...prev, error: 'Stream interrupted — tap Reconnect to resume', isLoading: false }));
          }
        };

        destroyRef.current = () => {
          video.onerror = null;
          video.src = '';
          video.load();
        };
        setState((prev) => ({ ...prev, isLoading: false }));

        video.oncanplay = () => {
          setState((prev) => ({ ...prev, isLoading: false }));
        };
        video.onplaying = () => {
          retryCount = 0;
          markAlive(channel.id);
          const idMatch = url.match(/[?&]id=(\d+)/);
          if (idMatch) onStreamSuccess(parseInt(idMatch[1]));
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
        };
        video.onpause = () => setState((prev) => ({ ...prev, isPlaying: false }));
        video.onwaiting = () => {
          setState((prev) => ({ ...prev, isLoading: true }));
        };
        // VOD time tracking — skip for live (infinite duration, no seek bar)
        let lastTimeUpdate = 0;
        video.ontimeupdate = () => {
          if (isLive) return;
          const now = Date.now();
          if (now - lastTimeUpdate < 1000) return; // throttle to 1/sec
          lastTimeUpdate = now;
          setState((prev) => ({ ...prev, currentTime: video.currentTime }));
        };
        video.ondurationchange = () => {
          const dur = video.duration;
          if (dur && isFinite(dur)) {
            // For FFmpeg remux (MKV/AVI), browser reports fragment duration (~4s) not full movie.
            // Use TMDB knownDuration if browser duration is suspiciously short (<60s for a movie).
            const knownDur = channel.knownDuration;
            if (knownDur && knownDur > 60 && dur < 60) {
              setState((prev) => ({ ...prev, duration: knownDur }));
            } else {
              setState((prev) => ({ ...prev, duration: dur }));
            }
          }
        };
        // Also set known duration immediately if available (before browser detects it)
        if (channel.knownDuration && channel.knownDuration > 60) {
          setState((prev) => ({ ...prev, duration: channel.knownDuration! }));
        }

      });
    },
    [cleanup]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setState((prev) => ({ ...prev, isMuted: video.muted }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = vol;
    video.muted = vol === 0;
    setState((prev) => ({ ...prev, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
    } else {
      container.requestFullscreen().catch(() => {});
      setState((prev) => ({ ...prev, isFullscreen: true }));
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setState((prev) => ({ ...prev, isPiP: false }));
      } else {
        await video.requestPictureInPicture();
        setState((prev) => ({ ...prev, isPiP: true }));
      }
    } catch {
      // PiP not supported
    }
  }, []);

  const changeQuality = useCallback((_quality: string, _index: number) => {
    // Quality switching via HLS.js not currently active — streams play natively
    // When HLS integration is added, this will call hls.currentLevel = index
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const stop = useCallback(() => {
    cleanup();
    const video = videoRef.current;
    if (video) {
      video.src = '';
      video.load();
    }
    setState({
      channel: null,
      isPlaying: false,
      isMuted: false,
      volume: 1,
      isFullscreen: false,
      isPiP: false,
      quality: 'Auto',
      qualities: ['Auto'],
      isLoading: false,
      error: null,
      currentTime: 0,
      duration: 0,
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => {
      setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // PiP change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const enter = () => setState((prev) => ({ ...prev, isPiP: true }));
    const leave = () => setState((prev) => ({ ...prev, isPiP: false }));
    video.addEventListener('enterpictureinpicture', enter);
    video.addEventListener('leavepictureinpicture', leave);
    return () => {
      video.removeEventListener('enterpictureinpicture', enter);
      video.removeEventListener('leavepictureinpicture', leave);
    };
  }, []);

  return useMemo(() => ({
    state,
    videoRef,
    containerRef,
    playChannel,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
    togglePiP,
    changeQuality,
    seek,
    stop,
  }), [state, playChannel, togglePlay, toggleMute, setVolume, toggleFullscreen, togglePiP, changeQuality, seek, stop]);
}
