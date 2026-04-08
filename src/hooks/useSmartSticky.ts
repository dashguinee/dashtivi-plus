import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Smart sticky — confident, decisive search bar behavior.
 *
 * SCROLL DOWN past 120px → hides after 600ms sustained (not hesitant)
 * SCROLL UP any amount    → snaps back immediately
 * IDLE 2.5s               → slides back in
 * TOP of page             → always visible
 *
 * Transitions:
 *   Hide: 0.35s slide up — quick, deliberate
 *   Show: 0.4s slide down — slightly slower, graceful landing
 */
export function useSmartSticky() {
  const [stickyHidden, setStickyHidden] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastY = useRef(0);
  const downStart = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const rafId = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        lastY.current = y;

        setHeaderVisible(y < 56);
        clearTimeout(idleTimer.current);

        if (y < 120) {
          // Near top — always show
          downStart.current = null;
          setStickyHidden(false);
          return;
        }

        if (delta > 5) {
          // Scrolling down — hide after 600ms sustained
          if (!downStart.current) downStart.current = Date.now();
          if (Date.now() - downStart.current > 600) {
            setStickyHidden(true);
          }
        } else if (delta < -8) {
          // Scrolling up decisively — snap back
          downStart.current = null;
          setStickyHidden(false);
        }

        // Idle 2.5s → slide back in
        idleTimer.current = setTimeout(() => {
          downStart.current = null;
          setStickyHidden(false);
        }, 2500);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId.current);
      clearTimeout(idleTimer.current);
    };
  }, []);

  const reset = useCallback(() => {
    setStickyHidden(false);
    setHeaderVisible(true);
    downStart.current = null;
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
      transition: stickyHidden
        ? 'transform 0.35s cubic-bezier(0.4, 0, 1, 1), opacity 0.25s ease-out, top 0.35s cubic-bezier(0.4, 0, 1, 1)'
        : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      willChange: 'transform, opacity',
    } as React.CSSProperties,
  };
}
