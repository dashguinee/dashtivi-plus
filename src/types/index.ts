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
  /** True ONLY during a deliberate channel-switch / first-play transition (frozen
   *  frame + connecting card up). False during a plain rebuffer of the current
   *  channel — lets the UI keep controls sharp + visible while buffering. */
  isSwitching: boolean;
  /** Predictive Flow: true while the adaptive controller is actively stepping
   *  tiers (down to fit a shrinking pipe, or quietly back up on recovery). Drives
   *  the subtle blinking "Flow" mark — "holding it together". Clears once the
   *  stream is stable at the chosen tier. */
  flowAdapting?: boolean;
  /** Graceful floor: true when Flow is already at its LOWEST tier (360p) and the
   *  pipe STILL can't sustain it. Drives the calm "Weak connection — try another
   *  channel, or hold on." message. Playback keeps quietly retrying underneath —
   *  this is NEVER a hard error wall, and clears the moment the pipe recovers. */
  weakConnection?: boolean;
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
