import { useEffect, useRef, useState } from 'react';
import { tick, confirm as hapticConfirm } from '@/lib/haptics';

const THRESHOLD = 80;   // px of pull before triggering
const MAX_PULL = 120;   // max visual distance

export function usePullToRefresh() {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Only trigger when scrolled to top
      if (window.scrollY > 5) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) { active.current = false; setPulling(false); setPullY(0); return; }
      if (dy > 10) {
        const newY = Math.min(dy * 0.5, MAX_PULL);
        // Tick when crossing the threshold
        if (newY >= THRESHOLD * 0.5 && pullY < THRESHOLD * 0.5) tick();
        setPulling(true);
        setPullY(newY);
      }
    }

    function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      if (pullY >= THRESHOLD * 0.5) {
        hapticConfirm();
        setRefreshing(true);
        setPullY(THRESHOLD * 0.4);
        // Reload the page
        setTimeout(() => window.location.reload(), 300);
      } else {
        setPulling(false);
        setPullY(0);
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
  }, [pullY, refreshing]);

  return { pulling, pullY, refreshing };
}
