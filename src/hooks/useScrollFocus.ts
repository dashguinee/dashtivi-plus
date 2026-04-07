import { useEffect, useRef } from 'react';

/**
 * useScrollFocus — makes cards in horizontal scroll rows respond to their position.
 * Center card brightens with a purple contour. Edge cards dim.
 *
 * v2: Uses IntersectionObserver per scroll container instead of getBoundingClientRect
 * on every scroll frame. Zero layout reads, async, browser-optimized.
 */
export function useScrollFocus() {
  const observersRef = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const setup = () => {
      // Cleanup previous observers
      observersRef.current.forEach(o => o.disconnect());
      observersRef.current = [];

      const containers = document.querySelectorAll<HTMLElement>('[data-focus-lens].scroll-smooth-x');

      containers.forEach(container => {
        // Create observer rooted in the scroll container
        // Center 40% = "center", middle zone = "near", outer = "far"
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const el = entry.target as HTMLElement;
              if (!el.classList.contains('scroll-focus-card')) {
                el.classList.add('scroll-focus-card');
              }
              if (entry.intersectionRatio > 0.8) {
                el.setAttribute('data-focus', 'center');
              } else if (entry.intersectionRatio > 0.3) {
                el.setAttribute('data-focus', 'near');
              } else {
                el.setAttribute('data-focus', 'far');
              }
            }
          },
          {
            root: container,
            threshold: [0, 0.3, 0.8],
          }
        );

        // Observe all children
        for (let i = 0; i < container.children.length; i++) {
          observer.observe(container.children[i]);
        }

        observersRef.current.push(observer);
      });
    };

    // Initial setup after DOM settles
    const timer = setTimeout(setup, 300);

    // Re-setup when new containers appear (lazy content loading)
    const mutation = new MutationObserver(() => {
      const current = document.querySelectorAll('[data-focus-lens].scroll-smooth-x').length;
      if (current !== observersRef.current.length) {
        setup();
      }
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observersRef.current.forEach(o => o.disconnect());
      mutation.disconnect();
    };
  }, []);
}
