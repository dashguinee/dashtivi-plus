import { useEffect, useRef, useState } from 'react';
import { tap, confirm as hapticConfirm } from '@/lib/haptics';

const THRESHOLD = 80;   // px of pull before triggering
const MAX_PULL = 120;   // max visual distance

export function usePullToRefresh(options?: { enabled?: boolean }) {
  // Gate PTR OFF while the full-screen player is open: in the player a downward
  // swipe is the vertical category-surf gesture, which otherwise satisfies PTR and
  // hard-reloads the page mid-stream. Caller passes enabled={!showFullPlayer}.
  const enabled = options?.enabled ?? true;
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const active = useRef(false);
  // Mirror pullY/refreshing into refs so the touch handlers read the latest value
  // WITHOUT the listeners being torn down + re-added on every touchmove frame
  // (the old [pullY] dep churned add/removeEventListener — jank on low-end Android).
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);

  function applyPullY(y: number) {
    pullYRef.current = y;
    setPullY(y);
  }

  useEffect(() => {
    if (!enabled) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 5) return;
      // The floating search pebble (and anything marked data-no-ptr) must NOT
      // count toward the pull — dragging it is its own gesture, not a refresh.
      if ((e.target as HTMLElement)?.closest?.('[data-no-ptr]')) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      active.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      // Horizontal-dominant gesture → skip (channel row scrolling)
      if (Math.abs(dy) < dx * 0.5) return;
      if (dy < 0) { active.current = false; setPulling(false); applyPullY(0); return; }
      if (dy > 10) {
        const newY = Math.min(dy * 0.5, MAX_PULL);
        // Tick when crossing the threshold
        if (newY >= THRESHOLD * 0.5 && pullYRef.current < THRESHOLD * 0.5) tap();
        setPulling(true);
        applyPullY(newY);
      }
    }

    function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      if (pullYRef.current >= THRESHOLD * 0.5) {
        hapticConfirm();
        refreshingRef.current = true;
        setRefreshing(true);
        applyPullY(THRESHOLD * 0.4);
        // Reload the page
        setTimeout(() => window.location.reload(), 300);
      } else {
        setPulling(false);
        applyPullY(0);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled]);

  return { pulling, pullY, refreshing };
}
