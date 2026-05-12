import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
import { onStreamSuccess, onStreamFail, getStreamQuality, setStreamQuality, tierUp, tierDown, FLOW_MIN_BANDWIDTH } from '@/lib/xtream';
import type { FlowTier } from '@/lib/xtream';
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
  const userMutedRef = useRef(false); // Tracks explicit user mute — respected across channel switches

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

      // Generation guard — increment early so rapid switches abort the fade-out
      const gen = ++playGeneration.current;

      // Smooth fade-out (250ms — 5 steps, ease-out curve)
      if (isSwitch && video) {
        const startVol = video.volume;
        for (let i = 1; i <= 5; i++) {
          if (gen !== playGeneration.current) break; // rapid switch — abort fade
          const t = i / 5;
          video.volume = Math.max(0, startVol * (1 - t * t));
          await new Promise(r => setTimeout(r, 50));
        }
        video.volume = 0;
        video.pause();
      }
      if (gen !== playGeneration.current) return; // superseded — bail entirely

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

      // Preserve fullscreen + pip + mute + playing state across channel switches
      // Keep isPlaying:true so frozen frame stays visible — no blank screen
      const modeLabel = (m: string) => m === 'auto' ? 'AUTO' : m === 'source' ? 'Source' : m === 'hd720' ? '720p' : m === 'eco' ? '480p' : '360p';
      const initQuality = modeLabel(getStreamQuality());
      setState((prev) => ({
        channel,
        isPlaying: isSwitch, // Keep playing=true on switch (frozen frame), false on first play
        isMuted: prev.isMuted,
        volume: prev.volume,
        isFullscreen: prev.isFullscreen,
        isPiP: prev.isPiP,
        quality: initQuality,
        qualities: ['AUTO', 'Source', '720p', '480p', '360p'],
        isLoading: true, // Thin bar on blurred frame during switch, full load on first play
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
          url = url.replace(/&q=(source|hd720|eco|low)/, '');
          const mode = getStreamQuality();
          if (mode === 'auto' && isLive) {
            // Estimate tier BEFORE src assignment — prevents double-load
            try {
              const conn = (navigator as any).connection;
              if (conn?.downlink) {
                const bps = conn.downlink * 1000000;
                if (bps < FLOW_MIN_BANDWIDTH.low) url += '&q=low';
                else if (bps < FLOW_MIN_BANDWIDTH.eco) url += '&q=eco';
                else if (bps < FLOW_MIN_BANDWIDTH.hd720) url += '&q=hd720';
                // else source (no param)
              }
            } catch {}
          } else if (mode !== 'auto' && mode !== 'source') {
            url += '&q=' + mode;
          }
        }

        let retryCount = 0;
        let connectionResolved = false;
        let connectionTimeout: ReturnType<typeof setTimeout> | undefined;
        // Generation guard — reuse gen from outer scope (incremented before fade-out)
        const generation = gen;
        const isStale = () => generation !== playGeneration.current;

        // Mute before any source change to prevent audio leak between channels
        video.muted = true;
        video.volume = 0;

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
          // Channel switch: keep last frame frozen, set new src directly — no blank screen
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
                console.debug('[PLAYER] Direct proxy failed, trying FFmpeg remux fallback');
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
          // Unmute now that new source is playing (was muted during source switch to prevent audio leak)
          // Respect user's explicit mute preference
          if (!userMutedRef.current) {
            video.muted = false;
            setState((prev) => ({ ...prev, isMuted: false }));
          }
          // Smooth fade-in: 12 steps × 40ms = 480ms
          const targetVol = userMutedRef.current ? 0 : 1;
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

        // ── Flow v3: Multi-tier adaptive streaming ──
        // 4 tiers: source > hd720 > eco > low
        // Auto mode: estimate bandwidth → pick tier → oscillate on buffer
        // Manual modes: user locks to a tier, no auto-switching
        if (isLive) {
          const streamId = url.match(/id=(\d+)/)?.[1] || '';
          const userMode = getStreamQuality();
          const sourceUrl = url.replace(/&q=(source|hd720|eco|low)/, '');

          if (userMode === 'auto') {
            let currentTier: FlowTier;
            let switchCount = 0;
            const MAX_SWITCHES = 4;
            let bufferStalls: number[] = [];
            const STALL_WINDOW = 45000;
            const STALL_THRESHOLD = 2;
            let recoveryCheck: ReturnType<typeof setInterval> | null = null;
            let recoveryStarted = 0;
            const RECOVERY_DELAY = 90000;
            // Lock out failed recovery at 120s too
            let failedRecoveryTier: FlowTier | null = null;

            const tierUrl = (t: FlowTier) => t === 'source' ? sourceUrl : sourceUrl + '&q=' + t;

            // Estimate starting tier from Network Information API
            const estimateTier = (): FlowTier => {
              try {
                const conn = (navigator as any).connection;
                if (conn?.downlink) {
                  const bps = conn.downlink * 1000000;
                  if (bps >= FLOW_MIN_BANDWIDTH.source) return 'source';
                  if (bps >= FLOW_MIN_BANDWIDTH.hd720) return 'hd720';
                  if (bps >= FLOW_MIN_BANDWIDTH.eco) return 'eco';
                  return 'low';
                }
              } catch {}
              return 'eco';
            };

            currentTier = estimateTier();

            // Initial tier already set in URL before src assignment — no double-load
            setState((prev) => ({ ...prev, qualities: ['AUTO', 'Source', '720p', '480p', '360p'] }));

            const readResolution = () => {
              if (!video) return;
              const h = video.videoHeight;
              if (h > 0) {
                const res = h >= 2160 ? '4K' : h >= 1080 ? '1080p' : h >= 720 ? '720p' : h >= 480 ? '480p' : h >= 360 ? '360p' : `${h}p`;
                const mode = getStreamQuality();
                const prefix = mode === 'auto' ? 'AUTO' : mode === 'source' ? 'Source' : mode === 'hd720' ? '720p' : mode === 'eco' ? '480p' : '360p';
                setState((prev) => ({ ...prev, quality: prefix + ' · ' + res }));
              }
            };

            const switchTier = (to: FlowTier) => {
              if (switchCount >= MAX_SWITCHES || to === currentTier || to === failedRecoveryTier) return;
              currentTier = to;
              switchCount++;
              bufferStalls = [];
              recoveryStarted = 0;
              video.src = tierUrl(to);
              video.play().catch(() => {});
            };

            // Buffer stall detection
            const origWaiting = video.onwaiting;
            video.onwaiting = () => {
              if (isStale()) return;
              if (typeof origWaiting === 'function') origWaiting.call(video, new Event('waiting'));
              else setState((prev) => ({ ...prev, isLoading: true }));

              const now = Date.now();
              bufferStalls.push(now);
              bufferStalls = bufferStalls.filter(t => now - t < STALL_WINDOW);

              if (bufferStalls.length >= STALL_THRESHOLD && switchCount < MAX_SWITCHES) {
                const lower = tierDown(currentTier);
                if (lower !== currentTier && lower !== failedRecoveryTier) {
                  bufferStalls = [];
                  switchTier(lower);
                }
              }
            };

            // Recovery: try higher tier after sustained stability
            recoveryCheck = setInterval(() => {
              if (isStale() || switchCount >= MAX_SWITCHES) return;
              if (!video || video.paused) return;
              readResolution();

              const ahead = video.buffered.length > 0
                ? video.buffered.end(video.buffered.length - 1) - video.currentTime
                : 0;

              if (ahead >= 10) {
                if (!recoveryStarted) { recoveryStarted = Date.now(); return; }
                if (Date.now() - recoveryStarted >= RECOVERY_DELAY) {
                  const higher = tierUp(currentTier);
                  if (higher !== currentTier && higher !== failedRecoveryTier) {
                    // Try recovery — if it triggers a stall within 30s, lock this tier out
                    const tryTier = higher;
                    const stallBefore = bufferStalls.length;
                    const preRecoveryTier = currentTier;
                    switchTier(tryTier);
                    setTimeout(() => {
                      if (isStale()) return;
                      if (bufferStalls.length > stallBefore) {
                        // Recovery failed — drop back and lock
                        failedRecoveryTier = tryTier;
                        switchTier(preRecoveryTier);
                      }
                    }, 30000);
                  }
                  recoveryStarted = 0;
                }
              } else {
                recoveryStarted = 0;
              }
            }, 5000);

            video.addEventListener('loadeddata', readResolution, { once: true });

            const origDestroy = destroyRef.current;
            destroyRef.current = () => {
              if (recoveryCheck) clearInterval(recoveryCheck);
              if (origDestroy) origDestroy();
            };
          }
        }

        // VOD time tracking — skip for live (infinite duration, no seek bar)
        // For remux streams with &start=N, video.currentTime starts at 0 but real position = start + currentTime
        const startMatch = url.match(/[&?]start=(\d+)/);
        const remuxOffset = startMatch ? parseInt(startMatch[1]) : 0;
        let lastTimeUpdate = 0;
        video.ontimeupdate = () => {
          if (isLive) return;
          const now = Date.now();
          if (now - lastTimeUpdate < 1000) return; // throttle to 1/sec
          lastTimeUpdate = now;
          setState((prev) => ({ ...prev, currentTime: video.currentTime + remuxOffset }));
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
    userMutedRef.current = video.muted;
    setState((prev) => ({ ...prev, isMuted: video.muted }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = vol;
    video.muted = vol === 0;
    userMutedRef.current = vol === 0;
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

  const changeQuality = useCallback(() => {
    const modes: Array<'auto' | 'source' | 'hd720' | 'eco' | 'low'> = ['auto', 'source', 'hd720', 'eco', 'low'];
    const current = getStreamQuality();
    const idx = modes.indexOf(current);
    const next = modes[(idx + 1) % modes.length];
    setStreamQuality(next);
    if (state.channel) {
      playChannel(state.channel);
    }
  }, [state.channel, playChannel]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const src = video.src || '';
    const isRemux = src.includes('/vod?');
    if (isRemux) {
      const base = src.replace(/&start=\d+/, '');
      const seekUrl = base + '&start=' + Math.floor(time);
      setState((prev) => ({ ...prev, currentTime: time }));
      video.src = seekUrl;
      video.play().catch(() => {});
    } else {
      video.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
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
