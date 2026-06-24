import { useEffect, useRef } from 'react';

/**
 * useBackGuard — makes any modal / overlay respect the system back gesture
 * (browser Back button, Android system back, iOS swipe-from-edge).
 * Ported from voyo-music for the DaHub /hub page.
 */
export function useBackGuard(open: boolean, onClose: () => void, name: string): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;

    const marker = { voyoModal: name, ts: Date.now() };
    window.history.pushState(marker, '');

    let closingFromPop = false;
    const onPop = () => {
      closingFromPop = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      if (!closingFromPop) {
        const top = window.history.state as { voyoModal?: string } | null;
        if (top?.voyoModal === name) {
          window.history.back();
        }
      }
    };
  }, [open, name]);
}
