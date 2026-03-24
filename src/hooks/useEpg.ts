import { useState, useEffect, useRef } from 'react';
import { getShortEpg } from '@/lib/xtream';
import type { EpgListing, XtreamCredentials } from '@/lib/xtream';
import { useAuth } from './useAuth';

interface EpgState {
  now: EpgListing | null;
  next: EpgListing[];
  loading: boolean;
}

/** Fetches EPG data for a live stream — returns now playing + upcoming */
export function useEpg(streamId: number | null): EpgState {
  const { credentials } = useAuth();
  const [state, setState] = useState<EpgState>({ now: null, next: [], loading: false });
  const lastId = useRef<number | null>(null);

  useEffect(() => {
    if (!streamId || !credentials || streamId === lastId.current) return;
    lastId.current = streamId;
    let mounted = true;

    setState(s => ({ ...s, loading: true }));

    getShortEpg(credentials, streamId, 4).then(listings => {
      if (!mounted) return;
      if (listings.length === 0) {
        setState({ now: null, next: [], loading: false });
        return;
      }

      const nowTs = Date.now() / 1000;
      const nowPlaying = listings.find(l => l.startTimestamp <= nowTs && l.stopTimestamp > nowTs) || null;
      const upcoming = listings
        .filter(l => l !== nowPlaying && l.title)
        .slice(0, 2);

      setState({ now: nowPlaying, next: upcoming, loading: false });
    });

    return () => { mounted = false; };
  }, [streamId, credentials]);

  return state;
}
