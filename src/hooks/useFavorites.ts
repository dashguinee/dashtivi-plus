import { useState, useCallback } from 'react';
import { getItem, setItem } from '@/lib/storage';
import type { FavoriteEntry } from '@/types';

const KEY = 'favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>(() => getItem(KEY, []));

  const toggleFavorite = useCallback((channelId: string) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.channelId === channelId);
      const next = exists
        ? prev.filter((f) => f.channelId !== channelId)
        : [...prev, { channelId, addedAt: Date.now() }];
      setItem(KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (channelId: string) => {
      return favorites.some((f) => f.channelId === channelId);
    },
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite };
}
