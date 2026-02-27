import { useState, useCallback, useRef, useEffect } from 'react';
import { createHlsPlayer, setQuality } from '@/lib/hls';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
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
      cleanup();

      setState((prev) => ({
        ...prev,
        channel,
        isPlaying: true,
        isLoading: true,
        error: null,
        qualities: ['Auto'],
        quality: 'Auto',
      }));

      // Small delay to ensure video element is mounted
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;

        const { hls, destroy } = createHlsPlayer(
          video,
          channel.url,
          (levels) => {
            setState((prev) => ({ ...prev, qualities: levels, isLoading: false }));
          },
          (error) => {
            markDead(channel.id, error);
            setState((prev) => ({ ...prev, error, isLoading: false }));
          }
        );

        hlsRef.current = hls;
        destroyRef.current = destroy;

        video.onplaying = () => {
          markAlive(channel.id);
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
        };
        video.onpause = () => setState((prev) => ({ ...prev, isPlaying: false }));
        video.onwaiting = () => setState((prev) => ({ ...prev, isLoading: true }));
        video.oncanplay = () => setState((prev) => ({ ...prev, isLoading: false }));
        // Stall recovery — if stuck buffering for 8s, force quality drop or reload
        video.onstalled = () => {
          if (hls && hls.currentLevel > 0) {
            hls.currentLevel = 0; // force lowest quality
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
    stop,
  };
}
