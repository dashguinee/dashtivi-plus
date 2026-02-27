import Hls from 'hls.js';

export interface HlsInstance {
  hls: Hls | null;
  destroy: () => void;
}

export function createHlsPlayer(
  videoEl: HTMLVideoElement,
  url: string,
  onQualityLevels?: (levels: string[]) => void,
  onError?: (msg: string) => void
): HlsInstance {
  if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url;
    videoEl.play().catch(() => {});
    return { hls: null, destroy: () => { videoEl.src = ''; } };
  }

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

    // Start at lowest quality — upgrade fast, never buffer on load
    startLevel: 0,
    capLevelToPlayerSize: true,
    startFragPrefetch: true,

    // Conservative bandwidth estimate for West Africa (300kbps baseline)
    abrEwmaDefaultEstimate: 300_000,
    // Faster ABR reaction — drop quality quickly when bandwidth dips
    abrEwmaFastLive: 2.0,
    abrEwmaSlowLive: 6.0,
    abrEwmaFastVoD: 2.0,
    abrEwmaSlowVoD: 6.0,
    // Drop quality fast on bandwidth drops, recover slow
    abrBandWidthUpFactor: 0.7,
    abrBandWidthFactor: 0.8,

    // Large buffer = resilience against network jitter
    maxBufferLength: 30,
    maxMaxBufferLength: 120,
    // Minimal back-buffer to save memory on low-end devices
    backBufferLength: 10,
    // Tolerate bigger gaps without stalling
    maxBufferHole: 1.5,
    // React fast to starvation — drop quality after 2s, not 4s
    maxStarvationDelay: 2,
    maxLoadingDelay: 2,

    // Generous timeouts for slow African networks
    manifestLoadingTimeOut: 15000,
    manifestLoadingMaxRetry: 4,
    manifestLoadingRetryDelay: 1000,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 1000,
    levelLoadingTimeOut: 15000,
    levelLoadingMaxRetry: 4,
    levelLoadingRetryDelay: 1000,
  });

  hls.loadSource(url);
  hls.attachMedia(videoEl);

  hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
    const levels = data.levels.map((l) => {
      if (l.height) return `${l.height}p`;
      if (l.bitrate) return `${Math.round(l.bitrate / 1000)}k`;
      return 'Auto';
    });
    onQualityLevels?.(levels.length > 0 ? ['Auto', ...levels] : ['Auto']);
    videoEl.play().catch(() => {});
  });

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (destroyed) return;

    if (!data.fatal) return;

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        // 6 retries with exponential backoff (1s → 2s → 4s → 8s → 16s → 32s)
        if (retryCount < 6) {
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
          retryCount++;
          setTimeout(() => {
            if (!destroyed) hls.startLoad();
          }, delay);
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
        } else if (mediaErrorRecoveryAttempt === 2) {
          // Last resort: full reload from scratch
          mediaErrorRecoveryAttempt++;
          hls.destroy();
          if (!destroyed) {
            const fresh = new Hls(hls.config);
            fresh.loadSource(url);
            fresh.attachMedia(videoEl);
          }
        } else {
          onError?.('Media error - unable to recover');
        }
        break;

      default:
        // Try one full reload before giving up
        if (retryCount === 0) {
          retryCount++;
          setTimeout(() => {
            if (!destroyed) {
              hls.loadSource(url);
              hls.startLoad();
            }
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

export function setQuality(hls: Hls | null, levelIndex: number): void {
  if (!hls) return;
  hls.currentLevel = levelIndex - 1;
}
