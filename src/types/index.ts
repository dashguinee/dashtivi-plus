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
  /** Channel metadata for "Continue Watching" — stored alongside history */
  name?: string;
  logo?: string;
  url?: string;
  category?: string;
}
