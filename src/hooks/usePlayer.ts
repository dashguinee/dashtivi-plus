import { useState, useCallback, useRef, useEffect } from 'react';
import { createHlsPlayer, createMpegTsPlayer, setQuality } from '@/lib/hls';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
import { onStreamSuccess, onStreamFail, getStreamQuality } from '@/lib/xtream';
import type { Channel, PlayerState } from '@/types';
import type Hls from 'hls.js';

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
  const hlsRef = useRef<Hls | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cleanup = useCallback(() => {
    if (destroyRef.current) {
      destroyRef.current();
      destroyRef.current = null;
    }
    hlsRef.current = null;
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

        console.log(`[PLAYER] Loading: ${channel.name} | url=${url.substring(0, 100)} | isLive=${isLive}`);
        video.src = url;
        video.play().catch((e) => console.log(`[PLAYER] play() rejected: ${e.message}`));

        const maxRetries = isLive ? 5 : 3;
        video.onerror = () => {
          const mediaErr = video.error;
          const errCode = mediaErr?.code || 0;
          const errMsg = mediaErr?.message || 'unknown';
          console.error(`[PLAYER] Error on ${channel.name}: code=${errCode} msg="${errMsg}" src="${url.substring(0, 80)}"`);
          console.error(`[PLAYER] readyState=${video.readyState} networkState=${video.networkState} currentTime=${video.currentTime}`);

          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[PLAYER] Retry ${retryCount}/${maxRetries}...`);
            setState((prev) => ({ ...prev, error: `Retry ${retryCount}/${maxRetries}`, isPlaying: false }));
            setTimeout(() => {
              setState((prev) => ({ ...prev, error: null }));
              video.src = url;
              video.play().catch(() => {});
            }, 2000);
          } else {
            console.error(`[PLAYER] All retries exhausted for ${channel.name}`);
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

        video.onloadstart = () => console.log(`[PLAYER] loadstart`);
        video.onloadedmetadata = () => console.log(`[PLAYER] metadata loaded: ${video.videoWidth}x${video.videoHeight} duration=${video.duration}`);
        video.oncanplay = () => {
          console.log(`[PLAYER] canplay`);
          setState((prev) => ({ ...prev, isLoading: false }));
        };
        video.onplaying = () => {
          retryCount = 0;
          console.log(`[PLAYER] PLAYING: ${channel.name}`);
          markAlive(channel.id);
          const idMatch = url.match(/[?&]id=(\d+)/);
          if (idMatch) onStreamSuccess(parseInt(idMatch[1]));
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
        };
        video.onpause = () => setState((prev) => ({ ...prev, isPlaying: false }));
        video.onwaiting = () => {
          console.log(`[PLAYER] waiting/buffering at ${video.currentTime}s`);
          setState((prev) => ({ ...prev, isLoading: true }));
        };
        // VOD time tracking
        video.ontimeupdate = () => {
          setState((prev) => ({ ...prev, currentTime: video.currentTime }));
        };
        video.ondurationchange = () => {
          const dur = video.duration;
          if (dur && isFinite(dur)) {
            setState((prev) => ({ ...prev, duration: dur }));
          }
        };

        // Stall recovery for HLS — force quality drop
        video.onstalled = () => {
          const hls = hlsRef.current;
          if (hls && hls.currentLevel > 0) {
            hls.currentLevel = 0;
          }
        };
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

  const changeQuality = useCallback((quality: string, index: number) => {
    setQuality(hlsRef.current, index);
    setState((prev) => ({ ...prev, quality }));
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

  return {
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
  };
}
