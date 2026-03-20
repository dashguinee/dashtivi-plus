/**
 * Channel playlist store — enables channel navigation in the player.
 * Module-level reactive store used by VideoPlayer (carousel, arrows, keyboard).
 */
import { useState, useEffect } from 'react';
import type { Channel } from '@/types';

let _playlist: Channel[] = [];
let _currentId: string | null = null;
const _listeners = new Set<() => void>();

export function setPlaylist(channels: Channel[]) {
  _playlist = channels;
  notify();
}

export function setCurrentChannel(id: string) {
  _currentId = id;
  notify();
}

function notify() {
  _listeners.forEach((fn) => fn());
}

function computeAdjacent(): { prev: Channel | null; next: Channel | null } {
  if (_playlist.length <= 1 || !_currentId) return { prev: null, next: null };
  const idx = _playlist.findIndex((c) => c.id === _currentId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? _playlist[idx - 1] : _playlist[_playlist.length - 1],
    next: idx < _playlist.length - 1 ? _playlist[idx + 1] : _playlist[0],
  };
}

/** React hook — subscribes to playlist changes, returns prev/next channels */
export function useAdjacentChannels() {
  const [adj, setAdj] = useState(computeAdjacent);
  useEffect(() => {
    const fn = () => setAdj(computeAdjacent());
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return adj;
}

/** React hook — full playlist + current ID for the channel carousel */
export function usePlaylistState() {
  const [state, setState] = useState({ channels: _playlist, currentId: _currentId });
  useEffect(() => {
    const fn = () => setState({ channels: [..._playlist], currentId: _currentId });
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return state;
}
