import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Smart sticky — hides after sustained scroll, reappears on idle or scroll up.
 * Debounced to prevent oscillation near thresholds.
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

        // Header visibility detection
        const header = document.querySelector('header');
        if (header) {
          const t = getComputedStyle(header).transform;
          setHeaderVisible(t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)');
        }

        clearTimeout(idleTimer.current);

        if (delta > 5 && y > 300) {
          // Scrolling down
          if (!downSince.current) downSince.current = Date.now();
          if (Date.now() - downSince.current > 2500 && !pendingHide.current) {
            pendingHide.current = true;
            setStickyHidden(true);
          }
        } else if (delta < -5) {
          // Scrolling up — show immediately
          downSince.current = null;
          pendingHide.current = false;
          setStickyHidden(false);
        }

        // After 2.5s idle, peek back (only if hidden)
        idleTimer.current = setTimeout(() => {
          downSince.current = null;
          pendingHide.current = false;
          setStickyHidden(false);
        }, 2500);
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
      transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), top 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      willChange: 'transform, opacity',
    } as React.CSSProperties,
  };
}
