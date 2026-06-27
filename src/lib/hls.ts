export interface HlsInstance {
  hls: any | null;
  destroy: () => void;
}

/**
 * Create an MPEG-TS player for raw .ts streams (proxied from Starshare)
 * Used for Live TV — needed for every live channel (primary use case)
 */
export async function createMpegTsPlayer(
  videoEl: HTMLVideoElement,
  url: string,
  onError?: (msg: string) => void
): Promise<HlsInstance> {
  // PERF: mpegts.js (~273KB) loaded dynamically — only if a raw .ts stream is
  // ever played, never on home arrival. (hls.js already gets this below.)
  const { default: mpegts } = await import('mpegts.js');

  if (!mpegts.isSupported()) {
    onError?.('MPEG-TS playback is not supported in this browser');
    return { hls: null, destroy: () => {} };
  }

  const player = mpegts.createPlayer({
    type: 'mpegts',
    url,
    isLive: true,
  }, {
    enableWorker: true,
    enableStashBuffer: true,
    stashInitialSize: 384,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 6.0,
    liveBufferLatencyMinRemain: 1.5,
  });

  player.attachMediaElement(videoEl);
  player.load();
  try { player.play(); } catch { /* autoplay may be blocked */ }

  player.on(mpegts.Events.ERROR, () => {
    onError?.('Stream error — channel may be offline');
  });

  return {
    hls: null,
    destroy: () => {
      player.pause();
      player.unload();
      player.detachMediaElement();
      player.destroy();
    },
  };
}

/**
 * Create an HLS player for free .m3u8 streams
 * PERF: hls.js (522KB) loaded dynamically — only when a free HLS channel is played
 * Safari uses native HLS — no library loaded at all
 */
export async function createHlsPlayer(
  videoEl: HTMLVideoElement,
  url: string,
  onQualityLevels?: (levels: string[]) => void,
  onError?: (msg: string) => void
): Promise<HlsInstance> {
  // Safari: native HLS — no library needed at all
  if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url;
    videoEl.play().catch(() => {});
    return { hls: null, destroy: () => { videoEl.src = ''; } };
  }

  const { default: Hls } = await import('hls.js');

  if (!Hls.isSupported()) {
    onError?.('HLS is not supported in this browser');
    return { hls: null, destroy: () => {} };
  }

  let retryCount = 0;
  let mediaErrorRecoveryAttempt = 0;
  let destroyed = false;

  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: false,
    progressive: true,
    testBandwidth: true,
    startLevel: 0,
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    abrEwmaDefaultEstimate: 300_000,
    abrEwmaFastLive: 2.0,
    abrEwmaSlowLive: 6.0,
    abrEwmaFastVoD: 2.0,
    abrEwmaSlowVoD: 6.0,
    abrBandWidthUpFactor: 0.7,
    abrBandWidthFactor: 0.8,
    // ── Pre-buffer: deeper cushion so transient network dips don't surface as stalls.
    // Soft target 60s (was 45); hard ceiling kept at 120s to bound memory on low-end
    // Android (the SL market). backBufferLength trimmed to 12 to claw that headroom back.
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    backBufferLength: 12,
    maxBufferHole: 1.5,
    maxStarvationDelay: 4,
    maxLoadingDelay: 2,
    // ── Auto-heal small stalls: let hls.js nudge the playhead more before giving up.
    nudgeMaxRetry: 8,            // was default 3 — recover micro-stalls instead of freezing
    nudgeOffset: 0.2,
    highBufferWatchdogPeriod: 1, // was default 2s — detect a stall sooner
    // ── Live cushion (free .m3u8 live): a few segments of slack > chasing the edge.
    liveSyncDuration: 6,
    liveMaxLatencyDuration: 18,
    // ── Retries: more attempts on weak networks before the stream is declared dead.
    manifestLoadingTimeOut: 15000,
    manifestLoadingMaxRetry: 6,  // was 4
    manifestLoadingRetryDelay: 1000,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 8,      // was 6
    fragLoadingRetryDelay: 1000,
    levelLoadingTimeOut: 15000,
    levelLoadingMaxRetry: 6,     // was 4
    levelLoadingRetryDelay: 1000,
  });

  hls.loadSource(url);
  hls.attachMedia(videoEl);

  hls.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
    const levels = data.levels.map((l: any) => {
      if (l.height) return `${l.height}p`;
      if (l.bitrate) return `${Math.round(l.bitrate / 1000)}k`;
      return 'Auto';
    });
    onQualityLevels?.(levels.length > 0 ? ['Auto', ...levels] : ['Auto']);
    videoEl.play().catch(() => {});
  });

  hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
    if (destroyed) return;

    // ── Fast non-fatal recovery: a buffer stall should NOT freeze the picture.
    // Kick the loader (and nudge the playhead past a tiny gap) immediately instead
    // of waiting for it to escalate to a fatal error.
    if (!data.fatal) {
      if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
        try { hls.startLoad(); } catch { /* loader may be mid-teardown */ }
      }
      return;
    }

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        if (retryCount < 6) {
          // First retry is near-instant (300ms), then exponential backoff capped at 30s.
          const delay = retryCount === 0 ? 300 : Math.min(Math.pow(2, retryCount) * 1000, 30000);
          retryCount++;
          setTimeout(() => { if (!destroyed) hls.startLoad(); }, delay);
        } else {
          onError?.('Network error - channel may be offline');
        }
        break;

      case Hls.ErrorTypes.MEDIA_ERROR:
        if (mediaErrorRecoveryAttempt === 0) {
          mediaErrorRecoveryAttempt++;
          hls.recoverMediaError();
        } else if (mediaErrorRecoveryAttempt === 1) {
          mediaErrorRecoveryAttempt++;
          hls.swapAudioCodec();
          hls.recoverMediaError();
        } else {
          onError?.('Media error - unable to recover');
          hls.destroy();
        }
        break;

      default:
        if (retryCount === 0) {
          retryCount++;
          setTimeout(() => {
            if (!destroyed) { hls.loadSource(url); hls.startLoad(); }
          }, 2000);
        } else {
          onError?.('Channel is currently unavailable');
          hls.destroy();
        }
        break;
    }
  });

  return {
    hls,
    destroy: () => {
      destroyed = true;
      hls.destroy();
    },
  };
}

export function setQuality(hls: any | null, levelIndex: number): void {
  if (!hls) return;
  hls.currentLevel = levelIndex - 1;
}
