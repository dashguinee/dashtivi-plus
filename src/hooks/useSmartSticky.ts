import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Smart sticky — hides after sustained scroll, reappears on idle or scroll up.
 * Uses scroll position thresholds instead of getComputedStyle (avoids layout thrash).
 */
export function useSmartSticky() {
  const [stickyHidden, setStickyHidden] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastY = useRef(0);
  const downSince = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const ticking = useRef(false);
  const pendingHide = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        lastY.current = y;
        ticking.current = false;

        // Header hides around y=56 (3.5rem) — use scroll position, not getComputedStyle
        setHeaderVisible(y < 56);

        clearTimeout(idleTimer.current);

        if (delta > 3 && y > 200) {
          // Scrolling down — start counting
          if (!downSince.current) downSince.current = Date.now();
          if (Date.now() - downSince.current > 1800 && !pendingHide.current) {
            pendingHide.current = true;
            setStickyHidden(true);
          }
        } else if (delta < -3) {
          // Scrolling up — show immediately
          downSince.current = null;
          pendingHide.current = false;
          setStickyHidden(false);
        }

        // After 2s idle, peek back
        idleTimer.current = setTimeout(() => {
          downSince.current = null;
          pendingHide.current = false;
          setStickyHidden(false);
        }, 2000);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(idleTimer.current);
    };
  }, []);

  const reset = useCallback(() => {
    setStickyHidden(false);
    setHeaderVisible(true);
    downSince.current = null;
    pendingHide.current = false;
    lastY.current = 0;
  }, []);

  return {
    stickyHidden,
    headerVisible,
    reset,
    stickyClass: `sticky z-20 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/5 ${
      headerVisible ? 'top-14' : 'top-0'
    }`,
    stickyStyle: {
      transform: stickyHidden ? 'translateY(-100%)' : 'translateY(0)',
      opacity: stickyHidden ? 0 : 1,
      // Hide: slow drift up. Reappear: gentle fade back in
      transition: stickyHidden
        ? 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease-out, top 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
        : 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), top 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
      willChange: 'transform, opacity',
    } as React.CSSProperties,
  };
}
