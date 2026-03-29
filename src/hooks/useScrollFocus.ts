import { useEffect, useRef, useCallback } from 'react';

/**
 * useScrollFocus — makes cards in horizontal scroll rows respond to their position.
 * Center card brightens with a purple contour. Edge cards dim.
 * Applied to all containers with `data-focus-lens` + `.scroll-smooth-x`.
 *
 * PERF: Event-driven — only recalculates on scroll/resize events + one initial pass.
 * Previous version ran a perpetual rAF loop (~60fps) even when idle.
 */
export function useScrollFocus() {
  const rafId = useRef(0);

  const update = useCallback(() => {
    const containers = document.querySelectorAll<HTMLElement>('[data-focus-lens].scroll-smooth-x');

    containers.forEach(container => {
      const rect = container.getBoundingClientRect();
      // Skip containers not in viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const containerCenter = rect.left + rect.width / 2;
      const children = container.children;

      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        if (!child.classList.contains('scroll-focus-card')) {
          child.classList.add('scroll-focus-card');
        }

        const childRect = child.getBoundingClientRect();
        const childCenter = childRect.left + childRect.width / 2;
        const dist = Math.abs(childCenter - containerCenter);
        const containerHalf = rect.width / 2;

        if (dist < 60) {
          child.setAttribute('data-focus', 'center');
        } else if (dist < containerHalf * 0.5) {
          child.setAttribute('data-focus', 'near');
        } else {
          child.setAttribute('data-focus', 'far');
        }
      }
    });
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(update);
    };

    // Initial pass after DOM settles
    const timer = setTimeout(scheduleUpdate, 200);

    // Listen for scroll on all focus-lens containers (capture phase for horizontal scroll)
    const onScroll = () => scheduleUpdate();
    // Use capture to catch scroll events on child elements
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId.current);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [update]);
}
