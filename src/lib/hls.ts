import mpegts from 'mpegts.js';

export interface HlsInstance {
  hls: any | null;
  destroy: () => void;
}

/**
 * Create an MPEG-TS player for raw .ts streams (proxied from Starshare)
 * Used for Live TV — needed for every live channel (primary use case)
 */
export function createMpegTsPlayer(
  videoEl: HTMLVideoElement,
  url: string,
  onError?: (msg: string) => void
): HlsInstance {

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
    maxBufferLength: 30,
    maxMaxBufferLength: 120,
    backBufferLength: 10,
    maxBufferHole: 1.5,
    maxStarvationDelay: 2,
    maxLoadingDelay: 2,
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
    if (!data.fatal) return;

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        if (retryCount < 6) {
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
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
