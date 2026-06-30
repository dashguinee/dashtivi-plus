import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { markDead, markAlive } from '@/hooks/useChannelHealth';
import { onStreamSuccess, onStreamFail, getStreamQuality, setStreamQuality, tierUp, tierDown, FLOW_TIERS, seedTierSync, probeBandwidthBps, tierForBps } from '@/lib/xtream';
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
  /** True when the proxy returned 503 "at capacity" (server full) rather than a
   *  409 per-account stream limit — the overlay reframes its copy accordingly. */
  atCapacity?: boolean;
}

// Fallback upgrade shape for a 503 at-capacity response (the proxy's 503 body may
// not carry the rich `upgrade` block that the 409 stream_limit response does).
const DEFAULT_UPGRADE: StreamLimitInfo['upgrade'] = {
  secondScreen: { label: 'Second Screen', discount: '', screens: 2 },
  familyPlan: { label: 'Family Plan', discount: '', screens: 5 },
};

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
    isSwitching: false,
    flowAdapting: false,
    error: null,
    currentTime: 0,
    duration: 0,
  });

  const [streamLimit, setStreamLimit] = useState<StreamLimitInfo | null>(null);
  // Frozen-frame snapshot (data URL) captured right before a channel-switch src swap.
  // Rendered blurred over the <video> to mask the black gap until the new stream paints.
  // null = no overlay. Cleared in onplaying when the new stream actually renders.
  const [switchSnapshot, setSwitchSnapshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fadeInRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // Safety: auto-clears frozen-frame overlay if stream never renders
  const liveStallTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // Live-only: fires a reconnect if a stalled live stream never resumes (upstream death)
  const playGeneration = useRef(0); // Guards against stale handlers from rapid channel switches
  const userMutedRef = useRef(false); // Tracks explicit user mute — respected across channel switches
  const userPausedRef = useRef(false); // Tracks explicit user pause — so PiP keep-alive never fights a deliberate pause
  const wasPiPRef = useRef(false); // User intent: was in PiP — re-request after source swap
  const switchingPiPRef = useRef(false); // True while a channel switch drops PiP (suppresses intent-clear)
  const pendingSeekRef = useRef(0); // Smart-resume: seconds to seek to once a direct-VOD stream is ready (0 = none)
  const remuxOffsetRef = useRef(0); // Remux VOD: server-side &start=N offset, kept live so seek() updates it (display clock stays correct)

  // Capture the current video frame to a data URL so we can overlay it (blurred)
  // during the black gap of a channel switch. Returns null on failure (e.g. tainted
  // canvas from cross-origin video, or no painted frame yet) — caller falls back to
  // the existing blur-on-loading behavior.
  const captureFrame = useCallback((video: HTMLVideoElement): string | null => {
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h || video.readyState < 2) return null;
      // Cap canvas size — a blurred overlay doesn't need full res, keeps it cheap
      const scale = Math.min(1, 640 / w);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // toDataURL throws on tainted (cross-origin) canvas — caught below
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch {
      return null; // tainted canvas or other failure — fall back to plain blur
    }
  }, []);

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
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = undefined;
    }
    if (liveStallTimerRef.current) {
      clearTimeout(liveStallTimerRef.current);
      liveStallTimerRef.current = undefined;
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
    async (channel: Channel, resumeFrom: number = 0) => {
      // Disconnect previous Web Audio boost chain before setting up new stream
      disconnectBoost();
      // Smart-resume: clear any stale pending direct-VOD seek from a prior play.
      pendingSeekRef.current = 0;
      // New channel = fresh intent; clear any prior deliberate-pause flag.
      userPausedRef.current = false;

      // If we're currently in PiP, the imminent src swap will auto-drop it. Flag this
      // so the leave listener doesn't treat it as a user-intent change — we re-request
      // PiP once the new source is playing (onplaying).
      switchingPiPRef.current = !!document.pictureInPictureElement;

      // Abort any previous pre-flight fetch
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      const video = videoRef.current;
      // A "switch" is any channel change when a stream is already loaded —
      // paused state is irrelevant (error recovery, hold gesture, blocked autoplay
      // all leave the stream paused but still loaded). The old !video.paused check
      // silently skipped the frozen-frame capture and the early isSwitching:true
      // whenever the video happened to be paused → black flash, no connecting card.
      const isSwitch = !!video && !!video.src;

      // On a channel switch, snapshot the currently-painted frame BEFORE any teardown.
      // We overlay it (blurred) to mask the black gap until the new stream renders.
      if (isSwitch && video) {
        const snap = captureFrame(video);
        if (snap) {
          setSwitchSnapshot(snap);
          // Safety net — never let the overlay linger past 12s if the stream stalls/errors
          if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
          snapshotTimerRef.current = setTimeout(() => setSwitchSnapshot(null), 12000);
        }
      }

      // Generation guard — increment early so rapid switches abort the fade-out
      const gen = ++playGeneration.current;

      // Quick win: on a SWITCH, push the NEW channel into state RIGHT NOW —
      // before the ~250ms audio fade-out below — so the central "connecting"
      // card (next channel's logo + name, driven by state.channel/isLoading in
      // VideoPlayer) flips to the new channel the instant the user taps, instead
      // of ~250ms later. The frozen-frame snapshot was just captured above, so
      // the connecting card renders cleanly over it. Keep isPlaying:true so the
      // frozen frame stays visible while the fade-out + teardown + load run
      // underneath. gen was already bumped, so the prior stream's now-stale
      // handlers can't clobber this. First-play (non-switch) is untouched — it
      // keeps its single setState below. The post-fade setState re-affirms the
      // same channel id (no flicker) plus the remaining fields.
      if (isSwitch) {
        setState((prev) => ({
          ...prev,
          channel,
          isPlaying: true,
          isLoading: true,
          isSwitching: true,
          error: null,
          currentTime: 0,
          duration: 0,
        }));
      }

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
        video.onended = null;
        video.ontimeupdate = null;
        video.ondurationchange = null;
      }
      // Cancel any pending live-stall watchdog from the stream we're replacing.
      if (liveStallTimerRef.current) { clearTimeout(liveStallTimerRef.current); liveStallTimerRef.current = undefined; }

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
        isSwitching: true, // Deliberate transition — gates blur + connecting card + control-hide
        flowAdapting: false, // fresh stream — predictive controller re-arms below
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
          // A rapid second tap during the mount-wait await may have superseded us —
          // bail so the stale invocation can't proceed to set src / install handlers.
          if (gen !== playGeneration.current) return;
        }

        let url = channel.url;
        const isLive = url.includes('/live?');
        const isVod = url.includes('/vod?');
        const isHlsUrl = url.endsWith('.m3u8') || url.includes('.m3u8?');

        if (isLive || isVod) {
          url = url.replace(/&q=(source|hd720|eco|low)/, '');
          const mode = getStreamQuality();
          if (mode === 'auto' && isLive) {
            // Seed the tier BEFORE src assignment — prevents a double-load. Uses the
            // cached bandwidth-probe result (seedTierSync) instead of the dead
            // navigator.connection.downlink guess (undefined on iOS → everyone got
            // 480p). The async probe + predictive loop (Flow block below) refine it.
            const seed = seedTierSync();
            if (seed !== 'source') url += '&q=' + seed;
          } else if (mode !== 'auto' && mode !== 'source') {
            url += '&q=' + mode;
          }
        }

        // ── Smart-resume — seek the new VOD stream to the saved position ──
        // Two seam shapes, mirroring the `seek()` helper:
        //   • remux (/vod?) — server-side seek: begin the stream at &start=N.
        //     remuxOffset (parsed below from the URL) then keeps the clock right.
        //   • direct (/movie|series/…) — client seek: stash N and apply it via
        //     video.currentTime once the element can play (pendingSeekRef).
        const isVodContent = channel.category === 'movie' || channel.category === 'series';
        if (isVodContent && resumeFrom > 1) {
          if (isVod) {
            url = url.replace(/&start=\d+/, '') + '&start=' + Math.floor(resumeFrom);
          } else {
            pendingSeekRef.current = resumeFrom;
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
            if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
            setSwitchSnapshot(null); // Reveal error UI — don't mask it behind the frozen frame
            markDead(channel.id, errMsg);
            setState((prev) => ({ ...prev, error: 'Stream interrupted — tap Reconnect to resume', isLoading: false, isSwitching: false }));
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
              // 409 = per-account stream limit · 503 = server at capacity. BOTH surface
              // the upgrade modal (not a black error). Without the 503 branch the
              // at-capacity case fell through to a generic black screen.
              if (probe.status === 409 || probe.status === 503) {
                const data = await probe.json().catch(() => ({} as Record<string, unknown>));
                if (probe.status === 409 && data.error === 'stream_limit') {
                  setStreamLimit({ activeChannel: data.activeChannel as string, upgrade: data.upgrade as StreamLimitInfo['upgrade'] });
                  setState((prev) => ({ ...prev, isLoading: false, isSwitching: false, error: null }));
                  return;
                }
                if (probe.status === 503) {
                  setStreamLimit({
                    activeChannel: (data.activeChannel as string) || channel.name || '',
                    upgrade: (data.upgrade as StreamLimitInfo['upgrade']) || DEFAULT_UPGRADE,
                    atCapacity: true,
                  });
                  setState((prev) => ({ ...prev, isLoading: false, isSwitching: false, error: null }));
                  return;
                }
              }
              probe.body?.cancel();
            } catch { /* timeout or network — let video element try anyway */ }
          }
          // A rapid second tap aborts our probe (AbortError caught above) and starts a
          // newer play. Without this guard the stale invocation falls through and clobbers
          // video.src + installs dead onerror/oncanplay/onplaying handlers (all early-return
          // via isStale()) → frozen frame stuck until the connect timeout. Mirror the HLS bail.
          if (isStale()) return;
          setStreamLimit(null);
          video.volume = 0;
          video.src = url;
          video.play().catch(() => {});

          // Connection timeout — VOD gets 15s (large files), live gets 7s.
          const timeout = (isVod || url.includes('?url=')) ? 15000 : 7000;
          connectionTimeout = setTimeout(() => {
            if (!connectionResolved && !video.readyState && destroyRef.current) {
              // Zero data after the window = the stream is never coming. The common
              // cause for a LIVE channel is NO ACTIVE PACKAGE — the proxy accepts the
              // request but the panel returns nothing. Don't spin on retries: the
              // player is already open, so just tell the member the real reason.
              if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
              setSwitchSnapshot(null);
              markDead(channel.id, 'no data');
              setState((prev) => ({
                ...prev,
                isLoading: false,
                isSwitching: false,
                error: isLive
                  ? 'No active package for this channel — please upgrade ⚡'
                  : 'Connection timed out — tap to retry',
              }));
            }
          }, timeout);

          const maxRetries = isLive ? 3 : 4;
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
            // PiP survival: while we're the floating PiP window (backgrounded), a transient
            // media error must NOT reassign src (that drops PiP) or surface a terminal error.
            // Nudge playback and keep the stream alive — real teardown waits for foreground.
            if (typeof document !== 'undefined' && document.pictureInPictureElement === video) {
              video.play().catch(() => {});
              return;
            }
            if (retryCount < maxRetries) {
              retryCount++;
              setState((prev) => ({ ...prev, error: `Retry ${retryCount}/${maxRetries}`, isPlaying: false }));
              // Smarter backoff: quicker first retry (1500ms), steady 2000ms after
              const retryDelay = retryCount === 1 ? 1500 : 2000;
              setTimeout(() => {
                setState((prev) => ({ ...prev, error: null }));
                video.src = url;
                video.play().catch(() => {});
              }, retryDelay);
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
              if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
              setSwitchSnapshot(null);
              const idMatch = url.match(/[?&]id=(\d+)/);
              if (idMatch) onStreamFail(parseInt(idMatch[1]));
              markDead(channel.id, 'Stream error');
              setState((prev) => ({ ...prev, error: isLive
                ? 'No active package for this channel — please upgrade ⚡'
                : 'Stream unavailable — tap Reconnect', isLoading: false, isSwitching: false }));
            } else {
              clearTimeout(connectionTimeout);
              if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
              setSwitchSnapshot(null);
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

              setState((prev) => ({ ...prev, error: errorMsg, isLoading: false, isSwitching: false }));
            }
          };

          destroyRef.current = () => {
            clearTimeout(connectionTimeout);
            if (fadeInRef.current) { clearInterval(fadeInRef.current); fadeInRef.current = undefined; }
            if (liveStallTimerRef.current) { clearTimeout(liveStallTimerRef.current); liveStallTimerRef.current = undefined; }
            video.onerror = null;
            video.onended = null;
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
          // Smart-resume for direct VOD: apply the saved position once, now that
          // the element can actually seek. Remux VOD already started at &start=.
          if (pendingSeekRef.current > 1) {
            const target = pendingSeekRef.current;
            pendingSeekRef.current = 0;
            try {
              if (isFinite(video.duration) && video.duration > 0) {
                video.currentTime = Math.min(target, video.duration - 5);
              } else {
                video.currentTime = target;
              }
            } catch { /* seek not ready — skip resume rather than break playback */ }
          }
          setState((prev) => ({ ...prev, isLoading: false }));
        };
        video.onplaying = () => {
          if (isStale()) return;
          retryCount = 0;
          // Recovered — cancel the live-stall watchdog.
          if (liveStallTimerRef.current) { clearTimeout(liveStallTimerRef.current); liveStallTimerRef.current = undefined; }
          // New stream is painting — fade out / remove the frozen-frame overlay
          if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
          setSwitchSnapshot(null);
          markAlive(channel.id);
          const idMatch = url.match(/[?&]id=(\d+)/);
          if (idMatch) onStreamSuccess(parseInt(idMatch[1]));
          // Connect audio presence EQ (warmth, body, clarity — always on)
          connectBoost(video);
          // Switch transition is over — frozen frame + connecting card come down here
          // (snapshot cleared just above). isSwitching:false reveals sharp controls.
          // Single setState — was two sequential calls causing a double render right
          // at the moment the stream starts, producing a visible control-layer flicker.
          setState((prev) => ({
            ...prev,
            isPlaying: true,
            isLoading: false,
            isSwitching: false,
            error: null,
            isMuted: userMutedRef.current ? prev.isMuted : false,
          }));
          if (!userMutedRef.current) video.muted = false;

          // Best-effort: if the user was in PiP and the source just changed (PiP dropped
          // when video.src was reassigned), re-enter PiP now that the new stream paints.
          if (
            wasPiPRef.current &&
            (document as Document).pictureInPictureEnabled &&
            !document.pictureInPictureElement &&
            typeof video.requestPictureInPicture === 'function'
          ) {
            video.requestPictureInPicture()
              .then(() => setState((prev) => ({ ...prev, isPiP: true })))
              .catch(() => {})
              .finally(() => { switchingPiPRef.current = false; });
          } else {
            switchingPiPRef.current = false;
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

        // ── P0: live disconnect recovery (proxied-live upstream death) ──────────
        // A LIVE stream must never "end". When the proxy's upstream source dies its
        // ffmpeg exits cleanly → the <video> fires `ended` (or stalls on the last
        // frame) → frozen frame, no error, no Reconnect. The old code had NO `ended`
        // handler for the proxied/direct path, so live stranded silently. Treat an
        // unexpected LIVE `ended` (and a never-resuming LIVE stall, below) as a
        // disconnect and route into the SAME auto-reconnect path the error flow uses:
        // set the error → VideoPlayer shows the connecting/Reconnect state and its
        // auto-retry re-attaches the src. A VOD `ended` (movie genuinely finished) is
        // left alone — gated on category, not on the URL shape (direct-mp4 VOD has no
        // /vod? marker, so url-based isVod would misclassify it). `isVodContent` is
        // already derived above (smart-resume) from channel.category — reuse it.
        const flagLiveDisconnect = (reason: string) => {
          if (isStale()) return;
          if (liveStallTimerRef.current) { clearTimeout(liveStallTimerRef.current); liveStallTimerRef.current = undefined; }
          if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
          setSwitchSnapshot(null);
          markDead(channel.id, reason);
          setState((prev) => ({ ...prev, isPlaying: false, isLoading: false, isSwitching: false, error: 'Stream interrupted — reconnecting…' }));
        };
        video.onended = () => {
          if (isStale() || isVodContent) return; // VOD finished legitimately — leave it
          flagLiveDisconnect('upstream ended');
        };

        video.onwaiting = () => {
          if (isStale()) return;
          setState((prev) => ({ ...prev, isLoading: true }));
          // Live-stall watchdog: if a live stream stalls and `playing` never resumes
          // within the window, the upstream is dead with no clean `ended`. Conservative
          // 15s so a slow-but-recovering buffer is never false-tripped (onplaying clears
          // it the instant playback resumes). VOD stalls are left alone (long buffers on
          // big files are normal).
          if (!isVodContent) {
            if (liveStallTimerRef.current) clearTimeout(liveStallTimerRef.current);
            liveStallTimerRef.current = setTimeout(() => flagLiveDisconnect('live stall (upstream dead)'), 8000);
          }
        };

        // ── Flow v4: PREDICTIVE multi-tier adaptive streaming ──
        // 4 tiers: source > hd720 > eco > low. North star on weak West-Africa /
        // France / SL mobile pipes (the NORMAL case here): NEVER a buffer spinner,
        // NEVER a hard freeze. We watch the buffer LEAD (seconds buffered ahead of
        // the playhead) on a 1s interval and step the tier DOWN *before* it empties
        // — driven by the TREND, not by waiting for onwaiting/the stall. The
        // anti-thrash cap LOOSENS when the buffer is genuinely collapsing
        // (continuity wins). At the floor we keep quietly retrying in the
        // background (no user-facing message — Flow handles it). When the pipe
        // stabilises we climb back up quietly.
        if (isLive) {
          const userMode = getStreamQuality();
          const sourceUrl = url.replace(/&q=(source|hd720|eco|low)/, '');

          if (userMode === 'auto') {
            const tierUrl = (t: FlowTier) => t === 'source' ? sourceUrl : sourceUrl + '&q=' + t;

            // Seed from the cached bandwidth probe (sync) — the async probe below
            // refines it within ~2.5s on the first play of the session.
            let currentTier: FlowTier = seedTierSync();
            const playStartedAt = Date.now();

            // Anti-thrash budget for PREDICTIVE (non-stall) down-steps. Loosened
            // automatically when the buffer is collapsing (see SOFT_CAP usage).
            const SOFT_CAP = 3;
            let downSteps = 0;
            let failedUpTier: FlowTier | null = null; // a step-up that re-stalled is locked out

            // Buffer-lead thresholds (seconds ahead of the playhead).
            const LEAD_HEALTHY = 8;   // ≥ this, sustained → stable: fade the indicator, allow step-up
            const LEAD_WATCH = 5;     // ≤ this AND shrinking → predictive step DOWN
            const LEAD_CRITICAL = 2;  // ≤ this → collapse: step DOWN now, ignore the soft cap

            const SAMPLE_MS = 1000;
            const SWITCH_COOLDOWN_MS = 6000;  // after a swap, let the new buffer fill before deciding
            const RECOVERY_STABLE_MS = 45000; // sustained-healthy before a quiet step UP

            let leadHistory: number[] = [];
            let lastSwitchAt = 0;
            let stableSince = 0;
            let adapting = false;
            let predictiveCheck: ReturnType<typeof setInterval> | null = null;

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

            const setAdapting = (on: boolean) => {
              if (on === adapting) return;
              adapting = on;
              setState((prev) => ({ ...prev, flowAdapting: on }));
            };
            const bufferedLead = () => (video.buffered.length > 0
              ? video.buffered.end(video.buffered.length - 1) - video.currentTime
              : 0);

            // Trend = is the lead shrinking toward empty across the recent window?
            const trendShrinking = () => {
              if (leadHistory.length < 3) return false;
              const w = leadHistory.slice(-4);
              return (w[0] - w[w.length - 1]) >= 0.8; // lead fell ~0.8s+ across the window
            };

            const switchTier = (to: FlowTier, _reason: string) => {
              if (to === currentTier || to === failedUpTier) return;
              const goingDown = FLOW_TIERS.indexOf(to) > FLOW_TIERS.indexOf(currentTier);
              currentTier = to;
              if (goingDown) downSteps++;
              leadHistory = [];
              stableSince = 0;
              lastSwitchAt = Date.now();
              setAdapting(true); // blink the Flow mark while the swap settles
              // Mask the re-buffer hitch of the hard src-swap with a frozen frame
              // (revealed in onplaying when the new tier paints). Prime never shows
              // a black flash on an adaptive quality change — neither should we.
              const snap = captureFrame(video);
              if (snap) {
                setSwitchSnapshot(snap);
                if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
                snapshotTimerRef.current = setTimeout(() => setSwitchSnapshot(null), 12000);
              }
              video.src = tierUrl(to);
              video.play().catch(() => {});
            };

            // Real bandwidth probe — corrects the seeded tier within ~2.5s on the
            // first play of the session (cached after → later switches are instant).
            // Replaces the dead navigator.connection.downlink guess (iOS quick win).
            probeBandwidthBps().then((bps) => {
              if (isStale() || bps == null) return;
              const probed = tierForBps(bps);
              // Only correct while still early and before we've adapted off the seed.
              if (probed !== currentTier && downSteps === 0 && Date.now() - playStartedAt < 8000) {
                switchTier(probed, 'probe');
              }
            }).catch(() => {});

            // Backstop: a real stall (onwaiting) means prediction was too late — force
            // a step DOWN ignoring the soft cap. Predictive should make this rare.
            const origWaiting = video.onwaiting;
            video.onwaiting = () => {
              if (isStale()) return;
              if (typeof origWaiting === 'function') origWaiting.call(video, new Event('waiting'));
              else setState((prev) => ({ ...prev, isLoading: true }));
              if (currentTier !== 'low' && Date.now() - lastSwitchAt > 2500) {
                switchTier(tierDown(currentTier), 'stall');
              }
              // Already at the floor and still stalling → keep quietly retrying
              // (the background play() nudge below handles it); no user-facing pill.
            };

            // ── PREDICTIVE control loop (1s) — the core ──
            predictiveCheck = setInterval(() => {
              if (isStale()) return;
              if (!video || video.paused) return;
              readResolution();

              const lead = bufferedLead();
              leadHistory.push(lead);
              if (leadHistory.length > 8) leadHistory.shift();

              const now = Date.now();
              const inCooldown = now - lastSwitchAt < SWITCH_COOLDOWN_MS;
              const collapsing = lead <= LEAD_CRITICAL;
              const shrinking = lead <= LEAD_WATCH && trendShrinking();

              // ── PREDICTIVE STEP-DOWN — step BEFORE the stall ──
              if (!inCooldown && currentTier !== 'low' && (collapsing || shrinking)) {
                // Loosen the anti-thrash cap when genuinely collapsing — continuity wins.
                if (downSteps < SOFT_CAP || collapsing) {
                  switchTier(tierDown(currentTier), collapsing ? 'collapse' : 'predictive');
                  return;
                }
              }

              // ── GRACEFUL FLOOR — at lowest tier, pipe still can't hold it ──
              // Keep the Flow mark alive + quietly retry in the background. No
              // user-facing "weak connection" message (Flow handles the network).
              if (currentTier === 'low' && (collapsing || shrinking)) {
                setAdapting(true);
                if (video.paused) video.play().catch(() => {}); // keep quietly retrying
                // don't return — the recovery branch below can still clear it
              }

              // ── STABLE / RECOVER UP (quiet) ──
              if (lead >= LEAD_HEALTHY) {
                if (!stableSince) stableSince = now;
                if (adapting && now - stableSince > 4000) setAdapting(false);
                if (currentTier !== 'source' && !inCooldown && now - stableSince > RECOVERY_STABLE_MS) {
                  const higher = tierUp(currentTier);
                  if (higher !== currentTier && higher !== failedUpTier) {
                    const preTier = currentTier;
                    const tryTier = higher;
                    switchTier(tryTier, 'recover-up');
                    // If the step-up re-stalls within 25s, drop back + lock it out so
                    // recovery feels smooth, never a yo-yo.
                    setTimeout(() => {
                      if (isStale()) return;
                      if (currentTier === tryTier && bufferedLead() < LEAD_CRITICAL) {
                        failedUpTier = tryTier;
                        switchTier(preTier, 'recover-rollback');
                      }
                    }, 25000);
                  }
                }
              } else {
                stableSince = 0;
              }
            }, SAMPLE_MS);

            video.addEventListener('loadeddata', readResolution, { once: true });

            const origDestroy = destroyRef.current;
            destroyRef.current = () => {
              if (predictiveCheck) clearInterval(predictiveCheck);
              if (origDestroy) origDestroy();
            };
          }
        }

        // VOD time tracking — skip for live (infinite duration, no seek bar)
        // For remux streams with &start=N, video.currentTime starts at 0 but real position = start + currentTime
        const startMatch = url.match(/[&?]start=(\d+)/);
        remuxOffsetRef.current = startMatch ? parseInt(startMatch[1]) : 0;
        let lastTimeUpdate = 0;
        video.ontimeupdate = () => {
          if (isLive) return;
          const now = Date.now();
          if (now - lastTimeUpdate < 1000) return; // throttle to 1/sec
          lastTimeUpdate = now;
          // Read the offset from a ref — seek() updates it when it swaps src to &start=N
          setState((prev) => ({ ...prev, currentTime: video.currentTime + remuxOffsetRef.current }));
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
      userPausedRef.current = false;
      video.play().catch(() => {});
    } else {
      userPausedRef.current = true; // deliberate pause — PiP keep-alive must respect it
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
    const video = videoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    }) | null;
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
    };

    const fsElement = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement;
    const iosVideoFs = !!(video && video.webkitDisplayingFullscreen);

    // ── Exit path ──
    if (fsElement || iosVideoFs) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (video?.webkitExitFullscreen) video.webkitExitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
      return;
    }

    // ── Enter path ──
    // iOS Safari (iPhone) can ONLY fullscreen the <video> element itself — a div/
    // document requestFullscreen is absent or no-ops there. Feature-detect first,
    // guard with an iOS check, then fall back to video.webkitEnterFullscreen.
    const isIOS = /iP(hone|od|ad)/.test(navigator.platform) ||
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document); // iPadOS reports as Mac

    // CRITICAL: the persistent <video> (shell element, z-50) and our overlay
    // controls (portaled into the surface stack, z-55) live in SEPARATE fixed
    // layers — the controls container is NOT an ancestor of the <video>.
    // Fullscreening the container therefore shows BLACK (the video stays outside
    // the fullscreened subtree and keeps playing audio only). Fullscreen the
    // document element instead: BOTH the video AND the controls render inside it
    // with their normal z-stacking (video below, controls on top), so fullscreen
    // shows the picture + keeps our overlay controls — for LIVE and VOD alike.
    const root = document.documentElement as (HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
    });
    const rootReq = root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen;

    if (rootReq && !isIOS) {
      // Standard / prefixed fullscreen on the document — keeps the video visible
      // AND our overlay controls (Flow button, genre bar, next/prev) on top.
      try {
        const r = rootReq.call(root);
        if (r && typeof (r as Promise<void>).then === 'function') (r as Promise<void>).catch(() => {});
      } catch { /* fall through silently */ }
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else if (video?.webkitEnterFullscreen) {
      // iOS path — native fullscreen on the actual <video>. It owns its own exit
      // button; reflect the exit back into our state.
      try { video.webkitEnterFullscreen(); } catch { /* ignore */ }
      const onEnd = () => {
        setState((prev) => ({ ...prev, isFullscreen: false }));
        video.removeEventListener('webkitendfullscreen', onEnd);
      };
      video.addEventListener('webkitendfullscreen', onEnd);
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else if (rootReq) {
      // No iOS video API but a (prefixed) document API exists — use it.
      try {
        const r = rootReq.call(root);
        if (r && typeof (r as Promise<void>).then === 'function') (r as Promise<void>).catch(() => {});
      } catch { /* ignore */ }
      setState((prev) => ({ ...prev, isFullscreen: true }));
    }
  }, []);

  const portraitFullscreen = useCallback(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const fsElement = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fsElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setState((prev) => ({ ...prev, isFullscreen: false }));
      return;
    }
    const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) {
      try {
        const p = req.call(root);
        if (p && typeof (p as Promise<void>).then === 'function') {
          (p as Promise<void>).catch(() => {});
        }
      } catch { /* ignore */ }
      setState((prev) => ({ ...prev, isFullscreen: true }));
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    // Never throw on unsupported — guard both the document flag and the element method.
    if (!document.pictureInPictureEnabled || typeof video.requestPictureInPicture !== 'function') {
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        wasPiPRef.current = false; // explicit user exit — don't auto-re-enter on next switch
        await document.exitPictureInPicture();
        setState((prev) => ({ ...prev, isPiP: false }));
      } else {
        await video.requestPictureInPicture();
        wasPiPRef.current = true; // remember intent across channel switches
        setState((prev) => ({ ...prev, isPiP: true }));
      }
    } catch {
      // Rejected (not ready / disabled) — keep state consistent with reality.
      setState((prev) => ({ ...prev, isPiP: !!document.pictureInPictureElement }));
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
      const startN = Math.floor(time);
      const seekUrl = base + '&start=' + startN;
      // Keep the offset ref in sync: the new stream restarts at currentTime 0, so the
      // display clock must add startN (not the stale load-time offset) going forward.
      remuxOffsetRef.current = startN;
      // GLITCH FIX: a remux seek hard-swaps video.src, which black-flashes until the
      // new position paints. Mask the seam with a frozen frame of the current picture
      // (same recipe as channel-switch / tier-switch) — cleared in onplaying when the
      // new position renders. Direct (mp4) seek needs none; it just sets currentTime.
      const snap = captureFrame(video);
      if (snap) {
        setSwitchSnapshot(snap);
        if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = setTimeout(() => setSwitchSnapshot(null), 12000);
      }
      setState((prev) => ({ ...prev, currentTime: time }));
      video.src = seekUrl;
      video.play().catch(() => {});
    } else {
      video.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, [captureFrame]);

  const stop = useCallback(() => {
    cleanup();
    wasPiPRef.current = false;
    switchingPiPRef.current = false;
    if (snapshotTimerRef.current) { clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = undefined; }
    setSwitchSnapshot(null);
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
      isSwitching: false,
      flowAdapting: false,
      error: null,
      currentTime: 0,
      duration: 0,
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Fullscreen change listener (standard + webkit/moz prefixed)
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element; mozFullScreenElement?: Element };
    const handler = () => {
      const fs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement);
      setState((prev) => ({ ...prev, isFullscreen: fs }));
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    document.addEventListener('mozfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
      document.removeEventListener('mozfullscreenchange', handler);
    };
  }, []);

  // PiP change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const enter = () => setState((prev) => ({ ...prev, isPiP: true }));
    const leave = () => {
      setState((prev) => ({ ...prev, isPiP: false }));
      // A leave fired NOT during a channel switch = the user (or the PiP window's own
      // close button) ended it. Clear the re-enter intent. A switch-driven drop keeps it.
      if (!switchingPiPRef.current) wasPiPRef.current = false;
    };
    video.addEventListener('enterpictureinpicture', enter);
    video.addEventListener('leavepictureinpicture', leave);
    return () => {
      video.removeEventListener('enterpictureinpicture', enter);
      video.removeEventListener('leavepictureinpicture', leave);
    };
  }, []);

  // ── PLAYBACK + PiP SURVIVE BACKGROUNDING ──────────────────────────────────
  // When the document goes hidden (tab switch / app backgrounded / screen lock)
  // the stream must keep running. The shell <video> is NEVER display:none'd while
  // a channel is live — it lives in the persistent shell, not inside a keep-alive
  // route pane — and nothing in this hook pauses on hide. This is a belt-and-
  // suspenders that RE-ASSERTS playback if a platform throttle (notably the Android
  // WebView) or a transient stall paused it while hidden, UNLESS the user
  // deliberately paused. It covers BOTH the floating PiP window AND normal
  // background playback (e.g. keeping a news/sports channel audible while the app
  // is backgrounded). A deliberate user pause is always respected, so this never
  // fights the user; it only nudges an *unintended* hidden-state pause back to life.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      const video = videoRef.current;
      if (!video) return;
      if (userPausedRef.current) return;            // respect a deliberate pause
      if (!video.currentSrc && !video.src) return;  // nothing loaded — leave it
      if (video.paused) video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const dismissStreamLimit = useCallback(() => setStreamLimit(null), []);

  return useMemo(() => ({
    state,
    videoRef,
    containerRef,
    switchSnapshot,
    playChannel,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
    portraitFullscreen,
    togglePiP,
    changeQuality,
    seek,
    stop,
    streamLimit,
    dismissStreamLimit,
  }), [state, switchSnapshot, playChannel, togglePlay, toggleMute, setVolume, toggleFullscreen, portraitFullscreen, togglePiP, changeQuality, seek, stop, streamLimit, dismissStreamLimit]);
}
