import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
import { onStreamSuccess, onStreamFail, getStreamQuality, setStreamQuality } from '@/lib/xtream';
import { createHlsPlayer } from '@/lib/hls';
import { connectBoost, disconnectBoost } from '@/lib/audio-boost';
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
  const fadeInRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const playGeneration = useRef(0); // Guards against stale handlers from rapid channel switches

  const cleanup = useCallback(() => {
    disconnectBoost();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (fadeInRef.current) {
      clearInterval(fadeInRef.current);
      fadeInRef.current = undefined;
    }
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
      // Disconnect previous Web Audio boost chain before setting up new stream
      disconnectBoost();

      // Abort any previous pre-flight fetch
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      const video = videoRef.current;
      const isSwitch = !!video && !!video.src && !video.paused;

      // Smooth fade-out (250ms — 5 steps, ease-out curve)
      if (isSwitch && video) {
        const startVol = video.volume;
        for (let i = 1; i <= 5; i++) {
          const t = i / 5;
          video.volume = Math.max(0, startVol * (1 - t * t)); // ease-out: fast start, gentle zero
          await new Promise(r => setTimeout(r, 50));
        }
        video.volume = 0;
        video.pause();
      }

      // Stop event handlers so old stream doesn't trigger state changes
      if (video) {
        video.onerror = null;
        video.onplaying = null;
        video.oncanplay = null;
        video.onpause = null;
        video.onwaiting = null;
        video.ontimeupdate = null;
        video.ondurationchange = null;
      }

      // Cleanup HLS/destroy refs but DON'T clear video.src yet
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (destroyRef.current) { destroyRef.current(); destroyRef.current = null; }
      if (fadeInRef.current) { clearInterval(fadeInRef.current); fadeInRef.current = undefined; }

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

      // Start loading new stream — wait for video element if not yet mounted (first play)
      const loadVideo = async () => {
        let video = videoRef.current;
        if (!video) {
          // First play: React hasn't rendered the <video> element yet — wait for mount
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 25));
            video = videoRef.current;
            if (video) break;
          }
          if (!video) return;
        }

        let url = channel.url;
        const isLive = url.includes('/live?');
        const isVod = url.includes('/vod?');
        const isHlsUrl = url.endsWith('.m3u8') || url.includes('.m3u8?');

        if (isLive || isVod) {
          url = url.replace(/&q=eco/, '');
          if (getStreamQuality() === 'eco') url += '&q=eco';
        }

        let retryCount = 0;
        let connectionResolved = false;
        let connectionTimeout: ReturnType<typeof setTimeout> | undefined;
        // Generation guard — if playChannel is called again, stale handlers bail out
        const generation = ++playGeneration.current;
        const isStale = () => generation !== playGeneration.current;

        if (isHlsUrl) {
          // Clear old stream right before HLS attach (HLS needs clean element)
          video.src = '';
          video.load();
          const hlsInstance = await createHlsPlayer(video, url, undefined, (errMsg) => {
            if (isStale()) return; // Don't update state for superseded streams
            markDead(channel.id, errMsg);
            setState((prev) => ({ ...prev, error: 'Stream interrupted — tap Reconnect to resume', isLoading: false }));
          });
          if (isStale()) { hlsInstance.destroy(); return; } // Rapid switch — bail
          hlsRef.current = hlsInstance;
          destroyRef.current = () => {
            hlsInstance.destroy();
            hlsRef.current = null;
            video.onerror = null;
          };
        } else {
          // Skip pre-flight on channel switch — just set src directly
          // Pre-flight only on first play (isSwitch=false) to detect stream limits
          let probeStatus = 0;
          if (isLive && !isSwitch) {
            try {
              const probe = await fetch(url, { method: 'GET', signal });
              probeStatus = probe.status;
              if (probe.status === 409) {
                const data = await probe.json();
                if (data.error === 'stream_limit') {
                  setStreamLimit({ activeChannel: data.activeChannel, upgrade: data.upgrade });
                  setState((prev) => ({ ...prev, isLoading: false, error: null }));
                  return;
                }
              }
              probe.body?.cancel();
            } catch { /* timeout or network — let video element try anyway */ }
          }
          setStreamLimit(null);
          video.volume = 0;
          video.pause();
          video.removeAttribute('src');
          video.src = url;
          video.play().catch(() => {});

          // Connection timeout — VOD gets 15s (large files), live gets 8s
          const timeout = (isVod || url.includes('?url=')) ? 15000 : 8000;
          connectionTimeout = setTimeout(() => {
            if (!connectionResolved && !video.readyState && destroyRef.current) {
              video.onerror?.(new Event('timeout'));
            }
          }, timeout);

          const maxRetries = isLive ? 5 : 4;
          let triedFallback = false;

          // VOD fallback: parse direct proxy URL → construct /vod? remux URL
          // Direct proxy: ${PROXY}?url=http://host/movie/u/p/id.ext
          // Remux:        ${PROXY}/vod?id=X&u=U&p=P&ext=E&type=T
          function buildFallbackUrl(): string | null {
            if (isLive || isVod) return null; // Already a structured URL
            if (!url.includes('?url=')) return null;
            try {
              const encoded = url.split('?url=')[1];
              if (!encoded) return null;
              const decoded = decodeURIComponent(encoded);
              // Pattern: http://host/{type}/{user}/{pass}/{id}.{ext}
              const m = decoded.match(/\/(movie|series)\/([^/]+)\/([^/]+)\/(\d+)\.(\w+)/);
              if (!m) return null;
              const [, type, u, p, id, ext] = m;
              const proxy = url.split('?url=')[0];
              return `${proxy}/vod?id=${id}&u=${u}&p=${p}&ext=${ext}&type=${type}`;
            } catch { return null; }
          }

          video.onerror = (evt) => {
            if (isStale()) return;
            if (retryCount < maxRetries) {
              retryCount++;
              setState((prev) => ({ ...prev, error: `Retry ${retryCount}/${maxRetries}`, isPlaying: false }));
              setTimeout(() => {
                setState((prev) => ({ ...prev, error: null }));
                video.src = url;
                video.play().catch(() => {});
              }, 2000);
            } else if (!triedFallback) {
              // Last chance: try FFmpeg remux for VOD (handles wrong extension, container mismatch)
              const fallback = channel.fallbackUrl || buildFallbackUrl();
              if (fallback) {
                triedFallback = true;
                retryCount = 0;
                console.log('[PLAYER] Direct proxy failed, trying FFmpeg remux fallback');
                setState((prev) => ({ ...prev, error: null, isLoading: true }));
                url = fallback;
                video.src = fallback;
                video.play().catch(() => {});
                return;
              }
              // No fallback available — show error
              clearTimeout(connectionTimeout);
              const idMatch = url.match(/[?&]id=(\d+)/);
              if (idMatch) onStreamFail(parseInt(idMatch[1]));
              markDead(channel.id, 'Stream error');
              setState((prev) => ({ ...prev, error: 'Stream unavailable — tap Reconnect', isLoading: false }));
            } else {
              clearTimeout(connectionTimeout);
              const idMatch = url.match(/[?&]id=(\d+)/);
              if (idMatch) onStreamFail(parseInt(idMatch[1]));
              markDead(channel.id, 'Stream error');

              let errorMsg = 'Stream interrupted — tap Reconnect to resume';
              const isTimeout = evt instanceof Event && evt.type === 'timeout';
              if (isTimeout) {
                errorMsg = 'Connection timed out — tap to retry';
              } else if (probeStatus === 403) {
                errorMsg = 'Access denied — stream unavailable';
              } else if (probeStatus === 409) {
                errorMsg = 'Stream limit reached — close other streams';
              } else if (probeStatus === 404) {
                errorMsg = 'Channel not found';
              }

              setState((prev) => ({ ...prev, error: errorMsg, isLoading: false }));
            }
          };

          destroyRef.current = () => {
            clearTimeout(connectionTimeout);
            if (fadeInRef.current) { clearInterval(fadeInRef.current); fadeInRef.current = undefined; }
            video.onerror = null;
            // Don't video.src=''+load() — it pops the audio chain.
            // The new src assignment in playChannel will replace cleanly.
            video.pause();
            video.volume = 0;
          };
        }
        setState((prev) => ({ ...prev, isLoading: false }));

        video.oncanplay = () => {
          if (isStale()) return;
          connectionResolved = true;
          setState((prev) => ({ ...prev, isLoading: false }));
        };
        video.onplaying = () => {
          if (isStale()) return;
          retryCount = 0;
          markAlive(channel.id);
          const idMatch = url.match(/[?&]id=(\d+)/);
          if (idMatch) onStreamSuccess(parseInt(idMatch[1]));
          // Connect audio presence EQ (warmth, body, clarity — always on)
          connectBoost(video);
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
          // Smooth fade-in: 12 steps × 40ms = 480ms
          const targetVol = video.muted ? 0 : 1;
          if (targetVol > 0 && video.volume < targetVol) {
            if (fadeInRef.current) clearInterval(fadeInRef.current);
            video.volume = 0; // Ensure clean start from silence
            let step = 0;
            const totalSteps = 12;
            fadeInRef.current = setInterval(() => {
              step++;
              // Ease-out curve — fast start, gentle end
              const t = step / totalSteps;
              video.volume = Math.min(targetVol, targetVol * (1 - Math.pow(1 - t, 3)));
              if (step >= totalSteps) {
                video.volume = targetVol;
                clearInterval(fadeInRef.current);
                fadeInRef.current = undefined;
              }
            }, 40);
          }
        };
        video.onpause = () => setState((prev) => ({ ...prev, isPlaying: false }));
        video.onwaiting = () => {
          if (isStale()) return;
          setState((prev) => ({ ...prev, isLoading: true }));
        };

        // ── Flow: passthrough-first adaptive streaming ──
        // Always start with SOURCE (passthrough) — 86% of channels are SD/HD,
        // they stream fine without transcoding. Don't penalize good connections.
        //
        // On buffer stall: let the browser recover naturally (it has its own buffer).
        // On SECOND stall within 30s: drop to eco (480p FFmpeg) for this channel.
        // Remember per-channel: if a channel needed eco, start on eco next time.
        // After 60s stable on eco: try source again (one attempt only).
        //
        // Flow pill reads video.videoHeight for actual resolution display.
        if (isLive) {
          const sourceUrl = url.replace(/&q=eco/, '');
          const ecoUrl = sourceUrl + '&q=eco';

          // Per-channel memory: did this channel need eco before?
          const channelFlowKey = 'flow-eco-' + (url.match(/id=(\d+)/)?.[1] || '');
          const needsEco = !!localStorage.getItem(channelFlowKey);
          let onSource = !needsEco;
          let stallCount = 0;
          let firstStallAt = 0;
          let ecoRecoveryDone = false;

          // Start on eco if channel previously needed it
          if (needsEco && !url.includes('&q=eco')) {
            video.src = ecoUrl;
            video.play().catch(() => {});
          }

          const readResolution = () => {
            if (!video) return;
            const h = video.videoHeight;
            if (h > 0) {
              const label = h >= 2160 ? '4K' : h >= 1080 ? '1080p' : h >= 720 ? '720p' : h >= 480 ? '480p' : `${h}p`;
              setState((prev) => prev.quality !== label ? { ...prev, quality: label } : prev);
            }
          };

          const dropToEco = () => {
            if (!onSource) return;
            const resolution = video.videoHeight;
            onSource = false;
            stallCount = 0;
            firstStallAt = 0;
            localStorage.setItem(channelFlowKey, '1');
            // Mute before quality switch to prevent audio pop
            const prevVol = video.volume;
            video.volume = 0;
            video.pause();
            video.removeAttribute('src');
            video.src = ecoUrl;
            video.play().catch(() => {});
            // Restore volume after new source loads
            video.addEventListener('playing', () => { video.volume = prevVol; }, { once: true });
            // Telemetry — fire and forget
            const streamId = url.match(/id=(\d+)/)?.[1];
            if (streamId) {
              const sbUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim();
              const sbKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
              if (sbKey) {
                fetch(`${sbUrl}/rest/v1/tivi_flow_events`, {
                  method: 'POST',
                  headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                  body: JSON.stringify({ stream_id: parseInt(streamId), resolution: resolution > 0 ? `${resolution}p` : null, stall_count: 2 }),
                }).catch(() => {});
              }
            }
          };

          const flowCheck = () => {
            if (!video || video.paused) return;
            readResolution();

            // On eco: try source recovery once after 60s stable
            if (!onSource && !ecoRecoveryDone) {
              if (video.buffered.length > 0) {
                const ahead = video.buffered.end(video.buffered.length - 1) - video.currentTime;
                if (ahead >= 8) {
                  // Been stable long enough — try source one more time
                  if (!firstStallAt) { firstStallAt = Date.now(); return; }
                  if (Date.now() - firstStallAt >= 60000) {
                    ecoRecoveryDone = true;
                    onSource = true;
                    stallCount = 0;
                    firstStallAt = 0;
                    const vol = video.volume;
                    video.volume = 0;
                    video.pause();
                    video.removeAttribute('src');
                    video.src = sourceUrl;
                    video.addEventListener('playing', () => { video.volume = vol; }, { once: true });
                    video.play().catch(() => {});
                  }
                }
              }
            }
          };

          const flowInterval = setInterval(flowCheck, 3000);
          video.addEventListener('loadeddata', readResolution, { once: true });

          const origWaiting = video.onwaiting;
          video.onwaiting = () => {
            if (isStale()) return; // Guard against stale closures from rapid channel switches
            if (typeof origWaiting === 'function') origWaiting.call(video, new Event('waiting'));
            else setState((prev) => ({ ...prev, isLoading: true }));

            if (!onSource) return; // already on eco, let browser buffer naturally

            stallCount++;
            if (stallCount === 1) {
              // First stall: let browser recover, just note the time
              firstStallAt = Date.now();
            } else if (stallCount >= 2 && firstStallAt && Date.now() - firstStallAt < 30000) {
              // Second stall within 30s of first: this channel can't handle source
              dropToEco();
            } else {
              // Second stall but >30s apart: reset, it was a one-off
              stallCount = 1;
              firstStallAt = Date.now();
            }
          };

          const origDestroy = destroyRef.current;
          destroyRef.current = () => {
            clearInterval(flowInterval);
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
          fetch('/tmdb-data.json', { signal: AbortSignal.timeout(10000) }).then(r => r.json()).then((data: Record<string, { t?: number }>) => {
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

      };
      loadVideo();
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
      // Don't video.src=''+load() — it invalidates the MediaElementSourceNode.
      // Just pause and silence. The element stays alive for the EQ chain.
      video.pause();
      video.volume = 0;
      video.removeAttribute('src');
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
