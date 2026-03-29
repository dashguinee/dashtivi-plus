import React, { useEffect, useRef } from 'react';

/**
 * CosmicBackground — Animated space-feel background layer.
 * Canvas-based star field + CSS animated gradient orbs.
 * Renders behind all content for that 2050 depth feel.
 */
export const CosmicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Skip star canvas on mobile — too subtle to notice, saves GPU
    if (window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let stars: { x: number; y: number; r: number; speed: number; opacity: number; pulse: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      // PERF FIX: cap star count at 120 — on large screens the old formula
      // could create 250+ stars, each drawn every frame. 120 is visually identical.
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
      if (document.hidden) { animId = requestAnimationFrame(draw); return; }
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

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Star field canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

      {/* Orbs removed — ambient blobs in App.tsx handle the glow now */}

      {/* Subtle aurora band */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />

      {/* Bottom ambient */}
      <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-accent/[0.02] via-transparent to-transparent" />
    </div>
  );
};
