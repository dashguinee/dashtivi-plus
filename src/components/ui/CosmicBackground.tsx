import React, { useEffect, useRef } from 'react';

/**
 * CosmicBackground — Animated space-feel background layer.
 * Canvas-based star field + CSS animated gradient orbs.
 * Renders behind all content for that 2050 depth feel.
 *
 * PERF: Pauses drawing when page is scrolled past the visible area
 * or when document is hidden. Uses IntersectionObserver to detect.
 */
// Time-of-day ambient palette — the backdrop breathes with the day (dark UI kept).
function timeTheme() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) // morning — pearl dawn, warm + luminous
    return { glow: 'radial-gradient(ellipse 60% 55% at 50% 28%, rgba(255,184,138,0.15), rgba(255,214,150,0.06) 46%, transparent 73%)' };
  if (h >= 11 && h < 17) // day — clear sky
    return { glow: 'radial-gradient(ellipse 60% 55% at 50% 30%, rgba(120,176,255,0.13), rgba(157,78,221,0.05) 46%, transparent 72%)' };
  if (h >= 17 && h < 21) // evening — sunset orange fading to purple
    return { glow: 'radial-gradient(ellipse 60% 55% at 50% 30%, rgba(255,122,70,0.15), rgba(157,78,221,0.09) 48%, transparent 74%)' };
  // night — violet/blue (current)
  return { glow: 'radial-gradient(ellipse 60% 55% at 50% 30%, rgba(157,78,221,0.16), rgba(59,130,246,0.06) 45%, transparent 72%)' };
}

export const CosmicBackground: React.FC = () => {
  const theme = timeTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Mobile-safe ambient response: the backdrop drifts with scroll (parallax depth),
  // intensifies while moving, and settles when you pause. The place responds to you.
  useEffect(() => {
    let raf = 0, target = 0, boost = 0, idle: ReturnType<typeof setTimeout>;
    const tick = () => {
      boost += (target - boost) * 0.07;
      const y = window.scrollY || 0;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(0, ${-(y * 0.06) - boost * 14}px, 0)`;
        glowRef.current.style.opacity = String(0.6 + boost * 0.4);
      }
      raf = requestAnimationFrame(tick);
    };
    const onScroll = () => { target = 1; clearTimeout(idle); idle = setTimeout(() => { target = 0; }, 550); };
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); clearTimeout(idle); };
  }, []);

  useEffect(() => {
    // Skip star canvas on mobile — too subtle to notice, saves GPU
    if (window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let visible = true;
    let stars: { x: number; y: number; r: number; speed: number; opacity: number; pulse: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      const raw = Math.floor((canvas.width * canvas.height) / 8000);
      const count = Math.min(raw, 120);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.15 + 0.02,
        opacity: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      if (document.hidden || !visible) { animId = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of stars) {
        star.y -= star.speed;
        star.pulse += 0.008;
        if (star.y < -2) {
          star.y = canvas.height + 2;
          star.x = Math.random() * canvas.width;
        }

        const flicker = star.opacity * (0.7 + 0.3 * Math.sin(star.pulse + time * 0.001));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 180, 255, ${flicker})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    // Pause canvas when scrolled past (not visible)
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Star field canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

      {/* Scroll-reactive ambient glow — drifts + breathes with motion (mobile-safe) */}
      <div
        ref={glowRef}
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none will-change-transform"
        style={{
          top: '-12%', width: '140%', height: '70%', opacity: 0.45,
          background: theme.glow,
          transition: 'background 2s ease',
        }}
      />

      {/* Subtle aurora band */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />

      {/* Bottom ambient */}
      <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-accent/[0.02] via-transparent to-transparent" />
    </div>
  );
};
