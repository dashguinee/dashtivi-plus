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

// ── Quality level memory ───────────────────────────────────────────────────────
// Survives channel switches within a session. On switch, HLS starts at the LAST
// known-good quality level instead of crawling up from 0 every time.
// Separate from bandwidth — level index is stream-specific, bps is universal.
const QL_STORAGE_KEY = 'dash_last_quality_level';

let _sessionQualityLevel = (() => {
  try {
    const v = sessionStorage.getItem(QL_STORAGE_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
})();

export function getLastQualityLevel(): number { return _sessionQualityLevel; }

export function rememberQualityLevel(level: number): void {
  if (level < 0) return;
  _sessionQualityLevel = level;
  try { sessionStorage.setItem(QL_STORAGE_KEY, String(level)); } catch { /* noop */ }
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
    // Bigger stash + a fatter live buffer cushion (5–20s vs the old 2–7s) so a
    // mid-stream upstream dip is ridden out from buffer instead of rebuffering the
    // viewer. Costs a few more seconds behind live — smooth > low-latency for flaky
    // IPTV feeds. (Z 2026-07-11 — Aziz "some buffers are mid-stream".)
    stashInitialSize: 128 * 1024,
    // Parallelizes MSE SourceOpen event and first network request instead of
    // serializing them. Safe because stash buffer holds incoming data until MSE ready.
    deferLoadAfterSourceOpen: false,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 20.0,
    liveBufferLatencyMinRemain: 5.0,
    // Don't chase the live edge while the video is paused (e.g. blocked autoplay).
    // Avoids burning 3G bandwidth accumulating segments that get discarded on resume.
    liveBufferLatencyChasingOnPaused: false,
    autoCleanupSourceBuffer: true,
    autoCleanupMinBackwardDuration: 30,
    autoCleanupMaxBackwardDuration: 60,
  });

  player.attachMediaElement(videoEl);
  player.load();
  try { player.play(); } catch { /* autoplay may be blocked */ }

  let mpegtsRetries = 0;
  player.on(mpegts.Events.ERROR, (_errType: any, _detail: any) => {
    if (mpegtsRetries < 4) {
      mpegtsRetries++;
      const delay = Math.min(600 * mpegtsRetries, 5000);
      setTimeout(() => {
        try { player.unload(); player.load(); } catch { /* player mid-teardown */ }
      }, delay);
    } else {
      onError?.('Stream error — channel may be offline');
    }
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
    // Start at the last quality level that worked — skips the climb on channel switches.
    // First load in session = 0 (safe floor). After first channel plays successfully,
    // LEVEL_SWITCHED writes to sessionStorage. Next switch starts there instantly.
    startLevel: getLastQualityLevel(),
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    abrEwmaDefaultEstimate: initialEstimate, // Network Info API seed — still used for ongoing ABR
    // ── THE MICRO-STALL FIX ──────────────────────────────────────────────────────────
    // Fast 3.0: less reactive to momentary dips → fewer panic drops
    // Slow 7.0: 7s of sustained bandwidth required before ABR earns an upgrade.
    // Tight enough to respond to real improvement, slow enough to stop oscillation.
    abrEwmaFastLive: 3.0,
    abrEwmaSlowLive: 7.0,
    abrEwmaFastVoD: 3.0,
    abrEwmaSlowVoD: 7.0,
    abrBandWidthUpFactor: 0.68,   // needs clear headroom before upgrading quality
    abrBandWidthFactor: 0.82,
    // ── Pre-buffer: deep cushion for weak GN/SL mobile networks
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    backBufferLength: 12,
    maxBufferSize: 20 * 1024 * 1024, // 20MB cap — prevents GC pauses on low-end Android
    // 1.0s (was 0.5 → too tight, IPTV segments have natural ~0.5-1s boundary gaps.
    // At 0.5 HLS.js was detecting normal gaps as holes and seeking to patch = stall.
    maxBufferHole: 1.0,
    maxStarvationDelay: 4,
    maxLoadingDelay: 2,
    nudgeMaxRetry: 8,
    nudgeOffset: 0.2,
    highBufferWatchdogPeriod: 2, // 2s (was 1s) — 1s was triggering too aggressively
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

  // Remember the quality level that actually played — next channel switch starts here.
  hls.on(Hls.Events.LEVEL_SWITCHED, (_event: any, data: any) => {
    rememberQualityLevel(data.level);
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
        // Codec negotiation failures and other unknown fatals are often transient
        // on Android WebViews — retry up to 4 times with exponential backoff.
        if (retryCount < 4) {
          const delay = retryCount === 0 ? 500 : Math.min(Math.pow(2, retryCount) * 800, 12000);
          retryCount++;
          setTimeout(() => {
            if (!destroyed) { hls.loadSource(url); hls.startLoad(); }
          }, delay);
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
