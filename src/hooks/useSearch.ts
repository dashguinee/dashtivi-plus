import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { searchChannels } from '@/data/channels';
import { searchCollections } from '@/data/collections';
import type { Channel, Collection } from '@/types';

interface SearchResults {
  channels: Channel[];
  collections: Collection[];
  total: number;
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(q);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const results: SearchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return { channels: [], collections: [], total: 0 };
    }
    const channels = searchChannels(debouncedQuery);
    const collections = searchCollections(debouncedQuery);
    return {
      channels,
      collections,
      total: channels.length + collections.length,
    };
  }, [debouncedQuery]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    results,
    clearSearch,
    isSearching: query.trim().length > 0,
  };
}
