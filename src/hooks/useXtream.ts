import { useState, useEffect, useCallback } from 'react';
import type { XtreamCredentials, LiveCategory, LiveStream, VodStream, SeriesItem, SeriesInfo } from '@/lib/xtream';
import {
  getLiveCategories,
  getLiveStreams,
  getAllLiveStreams,
  getVodCategories,
  getVodStreams,
  getSeriesCategories,
  getSeries,
  getSeriesInfo,
} from '@/lib/xtream';

interface UseXtreamResult {
  // Live
  liveCategories: LiveCategory[];
  loadLiveCategories: () => Promise<void>;
  loadLiveStreams: (catId: string) => Promise<LiveStream[]>;
  loadAllLiveStreams: () => Promise<LiveStream[]>;

  // VOD
  vodCategories: LiveCategory[];
  loadVodCategories: () => Promise<void>;
  loadVodStreams: (catId: string) => Promise<VodStream[]>;

  // Series
  seriesCategories: LiveCategory[];
  loadSeriesCategories: () => Promise<void>;
  loadSeries: (catId: string) => Promise<SeriesItem[]>;
  loadSeriesInfo: (seriesId: number) => Promise<SeriesInfo>;

  // State
  loading: boolean;
  error: string | null;
}

export function useXtream(credentials: XtreamCredentials | null): UseXtreamResult {
  const [liveCategories, setLiveCategories] = useState<LiveCategory[]>([]);
  const [vodCategories, setVodCategories] = useState<LiveCategory[]>([]);
  const [seriesCategories, setSeriesCategories] = useState<LiveCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLiveCategories = useCallback(async () => {
    if (!credentials) return;
    try {
      setLoading(true);
      setError(null);
      const cats = await getLiveCategories(credentials);
      setLiveCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const loadLiveStreams = useCallback(
    async (catId: string): Promise<LiveStream[]> => {
      if (!credentials) return [];
      try {
        return await getLiveStreams(credentials, catId);
      } catch {
        return [];
      }
    },
    [credentials]
  );

  const loadAllLiveStreams = useCallback(async (): Promise<LiveStream[]> => {
    if (!credentials) return [];
    try {
      return await getAllLiveStreams(credentials);
    } catch {
      return [];
    }
  }, [credentials]);

  const loadVodCategories = useCallback(async () => {
    if (!credentials) return;
    try {
      setLoading(true);
      setError(null);
      const cats = await getVodCategories(credentials);
      setVodCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load VOD categories');
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const loadVodStreams = useCallback(
    async (catId: string): Promise<VodStream[]> => {
      if (!credentials) return [];
      try {
        return await getVodStreams(credentials, catId);
      } catch {
        return [];
      }
    },
    [credentials]
  );

  const loadSeriesCategories = useCallback(async () => {
    if (!credentials) return;
    try {
      setLoading(true);
      setError(null);
      const cats = await getSeriesCategories(credentials);
      setSeriesCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load series categories');
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const loadSeries = useCallback(
    async (catId: string): Promise<SeriesItem[]> => {
      if (!credentials) return [];
      try {
        return await getSeries(credentials, catId);
      } catch {
        return [];
      }
    },
    [credentials]
  );

  const loadSeriesInfo = useCallback(
    async (seriesId: number): Promise<SeriesInfo> => {
      if (!credentials) return { episodes: {} };
      try {
        return await getSeriesInfo(credentials, seriesId);
      } catch {
        return { episodes: {} };
      }
    },
    [credentials]
  );

  // Auto-load categories on mount
  useEffect(() => {
    if (credentials) {
      loadLiveCategories();
      loadVodCategories();
      loadSeriesCategories();
    }
  }, [credentials, loadLiveCategories, loadVodCategories, loadSeriesCategories]);

  return {
    liveCategories,
    loadLiveCategories,
    loadLiveStreams,
    loadAllLiveStreams,
    vodCategories,
    loadVodCategories,
    loadVodStreams,
    seriesCategories,
    loadSeriesCategories,
    loadSeries,
    loadSeriesInfo,
    loading,
    error,
  };
}
