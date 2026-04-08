import { useCallback } from 'react';
import { useScrollChoreography } from './useScrollChoreography';

/**
 * Smart sticky — delegates to useScrollChoreography (singleton scroll listener).
 * Same API for MoviesPage, SeriesPage, LiveTVPage — no page changes needed.
 */
export function useSmartSticky() {
  const chrome = useScrollChoreography();

  const stickyHidden = false; // tabs always visible
  const headerVisible = chrome.headerVisible;

  const reset = useCallback(() => {}, []);

  return {
    stickyHidden,
    headerVisible,
    reset,
    stickyClass: `sticky z-20 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/5 ${
      headerVisible ? 'top-14' : 'top-0'
    }`,
    stickyStyle: {
      transition: 'top 0.3s ease-out',
    } as React.CSSProperties,
  };
}
