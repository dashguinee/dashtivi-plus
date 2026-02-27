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
    startLevel: -1,
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    abrEwmaDefaultEstimate: 500000,
    maxBufferLength: 15,
    maxMaxBufferLength: 60,
    backBufferLength: 30,
    maxBufferHole: 0.5,
    maxStarvationDelay: 4,
    maxLoadingDelay: 4,
    manifestLoadingTimeOut: 10000,
    fragLoadingTimeOut: 8000,
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
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
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
        } else {
          onError?.('Media error - unable to recover');
        }
        break;

      default:
        onError?.('Channel is currently unavailable');
        hls.destroy();
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
