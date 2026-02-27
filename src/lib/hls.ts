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
  // If native HLS support (Safari/iOS), use it directly
  if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url;
    videoEl.play().catch(() => {});
    return { hls: null, destroy: () => { videoEl.src = ''; } };
  }

  if (!Hls.isSupported()) {
    onError?.('HLS is not supported in this browser');
    return { hls: null, destroy: () => {} };
  }

  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    startLevel: -1, // Auto quality
    capLevelToPlayerSize: true,
    progressive: true,
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
    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          onError?.('Network error - channel may be offline');
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          onError?.('Media error - trying to recover');
          hls.recoverMediaError();
          break;
        default:
          onError?.('Channel is currently unavailable');
          hls.destroy();
          break;
      }
    }
  });

  return {
    hls,
    destroy: () => {
      hls.destroy();
    },
  };
}

export function setQuality(hls: Hls | null, levelIndex: number): void {
  if (!hls) return;
  // -1 for auto
  hls.currentLevel = levelIndex - 1;
}
