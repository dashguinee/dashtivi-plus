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
}

export interface Collection {
  key: string;
  title: string;
  description: string;
  icon: string;
  type?: string;
  featured?: boolean;
  priority?: number;
  dynamic?: boolean;
  movies: (number | string)[];
  series?: number[];
  filter?: {
    categories?: string[];
    series_categories?: string[];
    movie_categories?: string[];
    extensions?: string[];
  };
  keywords?: string[];
}

export type CategoryId =
  | 'all'
  | 'africa'
  | 'news'
  | 'sports'
  | 'entertainment'
  | 'kids'
  | 'music'
  | 'documentary'
  | 'religious'
  | 'movies'
  | 'france'
  | 'general';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string;
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
}

export interface FavoriteEntry {
  channelId: string;
  addedAt: number;
}

export interface WatchHistoryEntry {
  channelId: string;
  watchedAt: number;
  duration: number;
}
