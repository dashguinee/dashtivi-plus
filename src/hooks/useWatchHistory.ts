import { useState, useCallback } from 'react';
import { getItem, setItem } from '@/lib/storage';
import type { WatchHistoryEntry, Channel } from '@/types';

const KEY = 'watch_history';
const MAX_HISTORY = 50;

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryEntry[]>(() => getItem(KEY, []));

  const addToHistory = useCallback((channelOrId: string | Channel) => {
    setHistory((prev) => {
      const isChannel = typeof channelOrId !== 'string';
      const channelId = isChannel ? channelOrId.id : channelOrId;

      // Remove existing entry for this channel
      const filtered = prev.filter((h) => h.channelId !== channelId);
      const entry: WatchHistoryEntry = {
        channelId,
        watchedAt: Date.now(),
        duration: 0,
        ...(isChannel
          ? {
              name: channelOrId.name,
              logo: channelOrId.logo,
              url: channelOrId.url,
              category: channelOrId.category,
            }
          : {}),
      };
      const next = [entry, ...filtered].slice(0, MAX_HISTORY);
      setItem(KEY, next);
      return next;
    });
  }, []);

  const getRecent = useCallback(
    (count: number = 10) => {
      return history.slice(0, count);
    },
    [history]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setItem(KEY, []);
  }, []);

  return { history, addToHistory, getRecent, clearHistory };
}
