import { useState, useCallback } from 'react';
import { getItem, setItem } from '@/lib/storage';

/* ════════════════════════════════════════════════════════════════════
   useMovieShelf — local-first Watch Later + Hidden stores.

   TODO(store): the app has no dedicated Watch-Later / Hidden backend yet
   (only `useFavorites`). These are storage-backed local toggles so the
   tactile gestures VISIBLY respond today. When a real shelf service lands,
   swap the bodies here — the gesture layer (TactilePosterCard) stays put.
   ════════════════════════════════════════════════════════════════════ */

const WATCH_LATER_KEY = 'watch_later';
const HIDDEN_KEY = 'hidden_movies';

export function useWatchLater() {
  const [ids, setIds] = useState<string[]>(() => getItem(WATCH_LATER_KEY, []));

  const isWatchLater = useCallback((id: string) => ids.includes(id), [ids]);

  const addWatchLater = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      setItem(WATCH_LATER_KEY, next);
      return next;
    });
  }, []);

  const toggleWatchLater = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setItem(WATCH_LATER_KEY, next);
      return next;
    });
  }, []);

  return { watchLaterIds: ids, isWatchLater, addWatchLater, toggleWatchLater };
}

export function useHidden() {
  const [ids, setIds] = useState<string[]>(() => getItem(HIDDEN_KEY, []));

  const isHidden = useCallback((id: string) => ids.includes(id), [ids]);

  const hide = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      setItem(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const unhide = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      setItem(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  return { hiddenIds: ids, isHidden, hide, unhide };
}
