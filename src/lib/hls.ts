export interface HlsInstance {
  hls: any | null;
  destroy: () => void;
}

// ── Network-aware ABR seeding ──────────────────────────────────────────────────
// The Network Information API (Android Chrome, Edge) exposes real measured
// downlink speed. We seed HLS.js's EWMA estimate with it so ABR starts at the
// CORRECT quality for THIS user's connection — no more "starts blurry → climbs."
// Bandwidth is also persisted across sessions so repeat viewers skip the warm-up.

const BW_STORAGE_KEY = 'dash_bw_est_bps';
const BW_MAX_AGE_MS  = 30 * 60 * 1000; // 30 min — stale after that

// Effective-type → conservative baseline in bps (floor when no downlink reading)
const EFFECTIVE_TYPE_BPS: Record<string, number> = {
  'slow-2g': 100_000,
  '2g':      300_000,
  '3g':    1_500_000,
  '4g':    4_000_000,
};

/**
 * Returns the best available bandwidth estimate in bps, in priority order:
 * 1. navigator.connection.downlink  (live, most accurate)
 * 2. localStorage persisted value   (last good session, < 30 min old)
 * 3. effectiveType baseline         (coarse but real)
 * 4. 2 Mbps static fallback
 */
export function getNetworkEstimate(): number {
  const conn = (navigator as any).connection
    ?? (navigator as any).mozConnection
    ?? (navigator as any).webkitConnection;

  // Live reading — use 85% for headroom
  if (conn?.downlink && conn.downlink > 0) {
    const bps = conn.downlink * 1_000_000 * 0.85;
    persistBandwidth(bps);
    return bps;
  }

  // Persisted last-session value
  try {
    const raw = localStorage.getItem(BW_STORAGE_KEY);
    if (raw) {
      const { bps, ts } = JSON.parse(raw);
      if (Date.now() - ts < BW_MAX_AGE_MS && bps > 0) return bps;
    }
  } catch { /* localStorage unavailable */ }

  // effectiveType baseline
  if (conn?.effectiveType && EFFECTIVE_TYPE_BPS[conn.effectiveType]) {
    return EFFECTIVE_TYPE_BPS[conn.effectiveType];
  }

  return 2_000_000; // static fallback
}

/** Call when HLS measures a good playback bandwidth — persists for next session. */
export function persistBandwidth(bps: number): void {
  if (bps <= 0) return;
  try {
    localStorage.setItem(BW_STORAGE_KEY, JSON.stringify({ bps, ts: Date.now() }));
  } catch { /* quota exceeded / private mode */ }
}

/**
 * Listen for network-type changes (WiFi ↔ 4G ↔ 3G) and call back with new estimate.
 * Returns a cleanup function — call it when the player is destroyed.
 */
export function watchNetworkChanges(onEstimate: (bps: number) => void): () => void {
  const conn = (navigator as any).connection
    ?? (navigator as any).mozConnection
    ?? (navigator as any).webkitConnection;
  if (!conn) return () => {};

  const handler = () => onEstimate(getNetworkEstimate());
  conn.addEventListener('change', handler);
  return () => conn.removeEventListener('change', handler);
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
    stashInitialSize: 512,              // was 384 — slightly more initial buffer
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 7.0,  // was 6.0 — more cushion before chasing live edge
    liveBufferLatencyMinRemain: 2.0,   // was 1.5 — keep a bit more buffer before catch-up
    // Prevents memory growth on long sessions (30+ min). Without this the SourceBuffer
    // keeps accumulating decoded frames → sluggish video/audio decoder over time.
    autoCleanupSourceBuffer: true,
    autoCleanupMinBackwardDuration: 30,
    autoCleanupMaxBackwardDuration: 60,
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

  // Seed ABR with the real measured network bandwidth — no more cold-start quality climb.
  const initialEstimate = getNetworkEstimate();

  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: false,
    progressive: true,
    testBandwidth: true,
    startLevel: -1,                    // auto-select best quality at start (ABR-driven)
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    abrEwmaDefaultEstimate: initialEstimate,  // real network speed, not a static guess
    abrEwmaFastLive: 2.0,
    abrEwmaSlowLive: 6.0,
    abrEwmaFastVoD: 2.0,
    abrEwmaSlowVoD: 6.0,
    abrBandWidthUpFactor: 0.82,        // was 0.70 — upgrade quality less conservatively
    abrBandWidthFactor: 0.8,
    // ── Pre-buffer: deeper cushion so transient network dips don't surface as stalls.
    // Soft target 60s (was 45); hard ceiling kept at 120s to bound memory on low-end
    // Android (the SL market). backBufferLength trimmed to 12 to claw that headroom back.
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    backBufferLength: 12,
    maxBufferHole: 0.5,                // was 1.5 — patch gaps faster → fewer micro-freezes
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

  // Persist real measured bandwidth after each fragment loads — seeds the next session.
  hls.on(Hls.Events.FRAG_LOADED, (_event: any, data: any) => {
    const bw = data?.stats?.bwEstimate;
    if (bw && bw > 100_000) persistBandwidth(bw);
  });

  // React to network type changes mid-session (WiFi → 4G, etc.)
  const stopWatchingNetwork = watchNetworkChanges((bps) => {
    if (!destroyed) hls.bandwidthEstimate = bps;
  });

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

    // ── PiP SURVIVAL: while we ARE the floating Picture-in-Picture window (the app is
    // typically backgrounded), NEVER tear the stream down on a transient fatal error —
    // keep recovering so the OS PiP window keeps playing. Backgrounding throttles the
    // network/decoder and can briefly surface fatal errors; destroying here is what
    // kills PiP. Normal (foreground) teardown resumes once we're not in PiP.
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      try {
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else hls.startLoad();
      } catch { /* loader mid-teardown — ignore */ }
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
      stopWatchingNetwork();
      hls.destroy();
    },
  };
}

export function setQuality(hls: any | null, levelIndex: number): void {
  if (!hls) return;
  hls.currentLevel = levelIndex - 1;
}
