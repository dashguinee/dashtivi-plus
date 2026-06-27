import { useState, useCallback } from 'react';
import { getItem, setItem } from '@/lib/storage';
import type { WatchHistoryEntry, Channel } from '@/types';

const KEY = 'watch_history';
const MAX_HISTORY = 50;

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryEntry[]>(() => getItem(KEY, []));

  const addToHistory = useCallback((channelOrId: string | Channel, duration?: number, currentTime?: number, totalDuration?: number) => {
    setHistory((prev) => {
      const isChannel = typeof channelOrId !== 'string';
      const channelId = isChannel ? channelOrId.id : channelOrId;

      // Carry over the prior saved resume position so simply re-opening a title
      // (which calls addToHistory with no time) never wipes "Keep Watching".
      const prevEntry = prev.find((h) => h.channelId === channelId);
      const keepTime = currentTime != null ? currentTime : prevEntry?.currentTime;
      const keepTotal = totalDuration != null ? totalDuration : prevEntry?.totalDuration;

      // Remove existing entry for this channel
      const filtered = prev.filter((h) => h.channelId !== channelId);
      const entry: WatchHistoryEntry = {
        channelId,
        watchedAt: Date.now(),
        duration: duration || prevEntry?.duration || 0,
        ...(keepTime != null ? { currentTime: keepTime } : {}),
        ...(keepTotal != null ? { totalDuration: keepTotal } : {}),
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

  const updateDuration = useCallback((channelId: string, duration: number, currentTime?: number, totalDuration?: number) => {
    setHistory((prev) => {
      const idx = prev.findIndex((h) => h.channelId === channelId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        duration,
        ...(currentTime != null ? { currentTime } : {}),
        ...(totalDuration != null ? { totalDuration } : {}),
      };
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

  // Smart-resume position for a title: the saved second-offset to seek to, or 0
  // when there's nothing worth resuming (no progress, too early, or near-finished).
  const getResume = useCallback((channelId: string): number => {
    const e = history.find((h) => h.channelId === channelId);
    return e ? resumePosition(e) : 0;
  }, [history]);

  return { history, addToHistory, getRecent, clearHistory, updateDuration, getResume };
}

/** Minimum watched seconds before a title is worth resuming. */
export const RESUME_MIN_SECONDS = 30;
/** Past this fraction a title counts as finished — mark watched, don't resume. */
export const NEAR_END_FRACTION = 0.92;

/** Saved resume offset for an entry, or 0 if it shouldn't resume (finished/too early). */
export function resumePosition(e: WatchHistoryEntry): number {
  const ct = e.currentTime ?? 0;
  const total = e.totalDuration ?? 0;
  if (ct < RESUME_MIN_SECONDS || total <= 0) return 0;
  if (ct >= total * NEAR_END_FRACTION) return 0; // near the end → finished
  return ct;
}

/** True when an entry is an in-progress movie/series for the Keep Watching row. */
export function isInProgress(e: WatchHistoryEntry): boolean {
  const isVod = e.category === 'movie' || e.category === 'series';
  return isVod && resumePosition(e) > 0;
}
