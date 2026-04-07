export interface Channel {
  id: string;
  name: string;
  url: string;
  country?: string;
  category?: string;
  quality?: string;
  group?: string;
  needsProxy?: boolean;
  logo?: string;
  /** Known duration in seconds from TMDB — used when browser can't detect duration */
  knownDuration?: number;
  /** FFmpeg remux URL — used as fallback when direct proxy fails (wrong extension, container mismatch) */
  fallbackUrl?: string;
}

export interface PlayerState {
  channel: Channel | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  isPiP: boolean;
  quality: string;
  qualities: string[];
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
}

export interface FavoriteEntry {
  channelId: string;
  addedAt: number;
}

export interface WatchHistoryEntry {
  channelId: string;
  watchedAt: number;
  duration: number;
  /** Where the user stopped (seconds from start) */
  currentTime?: number;
  /** Total content length in seconds */
  totalDuration?: number;
  /** Channel metadata for "Continue Watching" — stored alongside history */
  name?: string;
  logo?: string;
  url?: string;
  category?: string;
}
