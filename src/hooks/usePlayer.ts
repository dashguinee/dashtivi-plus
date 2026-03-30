import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
import { onStreamSuccess, onStreamFail, getStreamQuality, setStreamQuality } from '@/lib/xtream';
import { createHlsPlayer } from '@/lib/hls';
import type { HlsInstance } from '@/lib/hls';
import type { Channel, PlayerState } from '@/types';

export interface StreamLimitInfo {
  activeChannel: string;
  upgrade: {
    secondScreen: { label: string; discount: string; screens: number };
    familyPlan: { label: string; discount: string; screens: number };
  };
}

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

  const [streamLimit, setStreamLimit] = useState<StreamLimitInfo | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    // Destroy HLS.js instance if active (free channels)
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (destroyRef.current) {
      destroyRef.current();
      destroyRef.current = null;
    }
  }, []);

  const playChannel = useCallback(
    async (channel: Channel) => {
      // Abort any previous pre-flight fetch
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      const video = videoRef.current;
      const isSwitch = !!video && !!video.src && !video.paused;

      // Smooth audio fade-out before killing stream (500ms — matches visual transition)
      if (isSwitch && video) {
        const startVol = video.volume;
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          video.volume = Math.max(0, startVol * (1 - i / steps));
          await new Promise(r => setTimeout(r, 50));
        }
      }

      // Full cleanup — kill any existing stream
      cleanup();
      if (video) {
        video.onerror = null;
        video.onplaying = null;
        video.src = '';
        video.load();
      }

      // Preserve fullscreen + pip + mute state across channel switches
      setState((prev) => ({
        channel,
        isPlaying: false,
        isMuted: prev.isMuted,
        volume: prev.volume,
        isFullscreen: prev.isFullscreen,
        isPiP: prev.isPiP,
        quality: 'Auto',
        qualities: ['Auto'],
        isLoading: true,
        error: null,
        currentTime: 0,
        duration: 0,
      }));

      // Small delay to ensure video element is clean
      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video) return;

        // Rebuild URL with CURRENT quality setting (URL may be stale from initial play)
        let url = channel.url;
        const isLive = url.includes('/live?');
        const isVod = url.includes('/vod?');
        const isHlsUrl = url.endsWith('.m3u8') || url.includes('.m3u8?');

        if (isLive || isVod) {
          url = url.replace(/&q=eco/, '');
          if (getStreamQuality() === 'eco') url += '&q=eco';
        }

        let retryCount = 0;

        // Free HLS channels — use createHlsPlayer (handles Safari native + HLS.js)
        if (isHlsUrl) {
          const hlsInstance = createHlsPlayer(video, url, undefined, (errMsg) => {
            markDead(channel.id, errMsg);
            setState((prev) => ({ ...prev, error: 'Stream interrupted — tap Reconnect to resume', isLoading: false }));
          });
          hlsRef.current = hlsInstance;
          destroyRef.current = () => {
            hlsInstance.destroy();
            hlsRef.current = null;
            video.onerror = null;
          };
        } else {
          // Xtream proxy channels — pre-flight to detect stream limit
          if (isLive) {
            try {
              const probe = await fetch(url, { method: 'GET', signal });
              if (probe.status === 409) {
                const data = await probe.json();
                if (data.error === 'stream_limit') {
                  setStreamLimit({ activeChannel: data.activeChannel, upgrade: data.upgrade });
                  setState((prev) => ({ ...prev, isLoading: false, error: null }));
                  return;
                }
              }
              // Got a valid response — cancel it, let video element handle the actual stream
              probe.body?.cancel();
            } catch { /* timeout or network — let video element try anyway */ }
          }
          setStreamLimit(null);
          video.volume = 0.65; // Start warm, not silent — subtle ramp to full
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
        }
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
          // Smooth audio fade-in (500ms — matches visual transition)
          const targetVol = video.muted ? 0 : 1;
          if (video.volume < targetVol) {
            let v = video.volume;
            const step = (targetVol - v) / 10;
            const fadeIn = setInterval(() => {
              v = Math.min(targetVol, v + step);
              video.volume = v;
              if (v >= targetVol) clearInterval(fadeIn);
            }, 50);
          }
        };
        video.onpause = () => setState((prev) => ({ ...prev, isPlaying: false }));
        video.onwaiting = () => {
          setState((prev) => ({ ...prev, isLoading: true }));
        };

        // ── Adaptive quality ladder for live channels ──
        // Tiers: eco (480p) → 720p → 1080p → direct (passthrough)
        // Starts at current setting, measures bandwidth, steps up safely.
        // Any buffering at a tier → step back down permanently to previous tier.
        if (isLive) {
          type QTier = 'eco' | '720' | '1080' | 'direct';
          const TIERS: QTier[] = ['eco', '720', '1080', 'direct'];
          const TIER_LABELS: Record<QTier, string> = { eco: '480p', '720': '720p', '1080': '1080p', direct: 'HD' };
          const TIER_PARAMS: Record<QTier, string> = { eco: '&q=eco', '720': '&q=720', '1080': '&q=1080', direct: '' };

          // Start at eco or current setting
          const startQuality = getStreamQuality();
          let currentTier: QTier = startQuality === 'eco' ? 'eco' : 'direct';
          let maxTier: QTier = 'direct'; // ceiling — drops on failure
          let stableStart = 0;
          let bufferCount = 0;
          const STABLE_TIME = 8000; // 8s stable before stepping up
          const BUFFER_LIMIT = 2; // 2 buffers at any tier → step down

          setState((prev) => ({ ...prev, quality: TIER_LABELS[currentTier] }));

          const buildUrl = (tier: QTier) => {
            const base = url.replace(/&q=(eco|720|1080)/, '');
            return base + TIER_PARAMS[tier];
          };

          const switchTo = (tier: QTier) => {
            currentTier = tier;
            bufferCount = 0;
            stableStart = 0;
            setState((prev) => ({ ...prev, quality: TIER_LABELS[tier], isLoading: true }));
            video.src = buildUrl(tier);
            video.play().catch(() => {});
          };

          const stepDown = () => {
            const idx = TIERS.indexOf(currentTier);
            if (idx > 0) {
              maxTier = TIERS[idx - 1]; // lock ceiling
              switchTo(TIERS[idx - 1]);
            }
          };

          const stepUp = () => {
            const idx = TIERS.indexOf(currentTier);
            const maxIdx = TIERS.indexOf(maxTier);
            if (idx < maxIdx) {
              switchTo(TIERS[idx + 1]);
            }
          };

          const checkUpgrade = () => {
            if (!video || video.paused) return;
            const idx = TIERS.indexOf(currentTier);
            const maxIdx = TIERS.indexOf(maxTier);
            if (idx >= maxIdx) return; // already at ceiling

            if (!stableStart) { stableStart = Date.now(); return; }
            if (Date.now() - stableStart < STABLE_TIME) return;

            // Check buffer health
            const buffered = video.buffered;
            if (buffered.length > 0) {
              const ahead = buffered.end(buffered.length - 1) - video.currentTime;
              if (ahead >= 3) stepUp();
            }
          };

          const adaptiveInterval = setInterval(checkUpgrade, 2000);

          const origWaiting = video.onwaiting;
          video.onwaiting = () => {
            stableStart = 0;
            bufferCount++;
            if (bufferCount >= BUFFER_LIMIT && TIERS.indexOf(currentTier) > 0) {
              stepDown();
            }
            if (typeof origWaiting === 'function') origWaiting.call(video, new Event('waiting'));
            else setState((prev) => ({ ...prev, isLoading: true }));
          };

          const origDestroy = destroyRef.current;
          destroyRef.current = () => {
            clearInterval(adaptiveInterval);
            if (origDestroy) origDestroy();
          };
        }

        // VOD time tracking — skip for live (infinite duration, no seek bar)
        let lastTimeUpdate = 0;
        video.ontimeupdate = () => {
          if (isLive) return;
          const now = Date.now();
          if (now - lastTimeUpdate < 1000) return; // throttle to 1/sec
          lastTimeUpdate = now;
          setState((prev) => ({ ...prev, currentTime: video.currentTime }));
        };
        // Duration: multiple sources, bulletproof chain
        let durationLocked = false;

        // Source 1: knownDuration from Channel (TMDB/VOD info, passed by caller)
        if (channel.knownDuration && channel.knownDuration > 60) {
          setState((prev) => ({ ...prev, duration: channel.knownDuration! }));
          durationLocked = true;
        }

        // Source 2: fetch from TMDB JSON (async, no main thread blocking)
        if (!durationLocked && !isLive) {
          const streamId = channel.id.replace(/^(vod|series)-/, '');
          const prefix = channel.id.startsWith('series-') ? 's' : 'm';
          fetch('/tmdb-data.json').then(r => r.json()).then((data: Record<string, { t?: number }>) => {
            const entry = data[`${prefix}:${streamId}`];
            if (entry?.t && entry.t > 1 && !durationLocked) {
              durationLocked = true;
              setState((prev) => ({ ...prev, duration: (entry.t ?? 0) * 60 }));
            }
          }).catch(() => {});
        }

        // Source 3: browser's ondurationchange (only if nothing else worked)
        video.ondurationchange = () => {
          const dur = video.duration;
          if (dur && isFinite(dur) && !durationLocked) {
            // Accept browser duration only if > 120s (avoid fragment durations)
            if (dur > 120) {
              durationLocked = true;
              setState((prev) => ({ ...prev, duration: dur }));
            }
            // If browser reports < 120s and we have no other source, still show it
            // but don't lock (allow TMDB to override later)
            else {
              setState((prev) => ({ ...prev, duration: dur }));
            }
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

  const dismissStreamLimit = useCallback(() => setStreamLimit(null), []);

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
    streamLimit,
    dismissStreamLimit,
  }), [state, playChannel, togglePlay, toggleMute, setVolume, toggleFullscreen, togglePiP, changeQuality, seek, stop, streamLimit, dismissStreamLimit]);
}
