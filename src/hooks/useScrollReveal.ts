import { useEffect, useRef } from 'react';

/**
 * Lightweight scroll-reveal via IntersectionObserver.
 * Elements with `.reveal` or `.stagger-card` get `.visible` when they enter viewport.
 * Observes once — no re-triggering on scroll back up (content stays visible).
 *
 * V2 SOUL RESTORE: Assigns cascading `data-reveal-delay` to .reveal elements
 * in the initial viewport batch (first ~5 sections) for a guided "app coming
 * to life" cascade. Elements already scrolled past get instant reveal.
 */
export function useScrollReveal(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.reveal, .stagger-card').forEach(el => {
        el.classList.add('visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 200px 0px', // Trigger 200px BEFORE entering viewport — content is ready when user arrives
        threshold: 0.01,
      }
    );

    // Immediate: reveal anything already in viewport, observe the rest
    const timer = setTimeout(() => {
      const reveals = container.querySelectorAll('.reveal, .stagger-card');
      let delayIndex = 0;

      reveals.forEach(el => {
        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight;

        if (inViewport) {
          // Already visible — cascade with tiny delays
          if (delayIndex < 5 && el.classList.contains('reveal')) {
            el.setAttribute('data-reveal-delay', String(delayIndex + 1));
            delayIndex++;
          }
          // Reveal immediately (with cascade delay if set)
          el.classList.add('visible');
        } else {
          // Below fold — observe for scroll
          observer.observe(el);
        }
      });
    }, 30);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, deps);

  return containerRef;
}
