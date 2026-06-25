import { useEffect, useRef, useState } from 'react';

/**
 * WorldCupBackdrop — a subtle, BIG, faded football clip behind the TOP of the
 * home (the hero deck + the World Cup / Sports lead). Ambient ENERGY behind the
 * glass, NOT a foreground playing video.
 *
 * Recipe (mirrors the Hub landing bg-video technique — muted/loop/playsInline/
 * object-cover, preload=metadata, pointer-events:none):
 *   - One <video>, sized BIG (110%) and centered so every edge falls off-screen
 *     (no visible borders), absolutely positioned BEHIND the content (z below
 *     the cards, above the page base bg).
 *   - Faded into the dark: low base opacity + a dark veil + a STRONG bottom fade
 *     into the page background so it dies out before you scroll past Sports.
 *   - A "VISOR" of clarity: a soft radial-gradient spotlight that drifts slowly,
 *     organically, across the footage (a moving window where the dark veil is
 *     LESS, so the clip shows through a touch more). GPU-cheap: animates a CSS
 *     custom-property-driven radial center on transform/background-position only.
 *   - prefers-reduced-motion: don't autoplay, freeze to a dim still, hide the
 *     moving visor.
 *
 * Scope: this layer is positioned absolutely inside a `relative` wrapper that
 * spans ONLY the top region of HomePage — it never bleeds into the rest of the
 * page or other routes.
 */
export function WorldCupBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // With reduced motion we keep a single dim still: pause after the first frame.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reducedMotion) {
      // Let one frame paint, then freeze.
      v.pause();
    } else {
      v.play().catch(() => { /* autoplay can be blocked — the still is fine */ });
    }
  }, [reducedMotion]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* BIG, off-screen-edged video — object-cover so it always fills, scaled
          to 112% and centered so its borders never show. */}
      <video
        ref={videoRef}
        src="/wc-bg.mp4"
        muted
        loop
        playsInline
        autoPlay={!reducedMotion}
        preload="metadata"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
        style={{
          transform: 'translate(-50%, -50%) scale(1.12)',
          opacity: 0.29,
          // Cool it into the page palette so the green pitch doesn't shout.
          filter: 'saturate(0.82) contrast(1.02) brightness(0.92)',
          willChange: 'transform',
        }}
      />

      {/* DARK VEIL — fades the clip into the dark everywhere, with a STRONG fade
          at the bottom edge into the page bg (so it's gone by the time you
          scroll past Sports) and a soft top fade under the status area. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,6,8,0.72) 0%, rgba(5,6,8,0.40) 24%, rgba(5,6,8,0.46) 58%, rgba(5,6,8,0.86) 84%, rgba(5,6,8,0.99) 100%)',
        }}
      />

      {/* The VISOR — a soft radial window of clarity that DARKENS LESS, drifting
          slowly + organically across the footage. We paint the inverse: a near-
          transparent hole inside an otherwise faint dark wash, then move the
          whole layer on a slow organic path (transform only → GPU cheap). When
          reduced-motion is on the visor is hidden (just the steady veil). */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 wc-visor"
          style={{
            background:
              'radial-gradient(36% 42% at 50% 46%, rgba(255,255,255,0.10) 0%, rgba(5,6,8,0) 42%, rgba(5,6,8,0.30) 100%)',
            mixBlendMode: 'soft-light',
          }}
        />
      )}

      <style>{`
        /* Organic drift — a slow, non-linear wander so the window of clarity
           never tracks a straight line. Transform-only (composited). */
        @keyframes wc-visor-drift {
          0%   { transform: translate3d(-14%, -8%, 0) scale(1.04); }
          22%  { transform: translate3d(10%, -12%, 0)  scale(1.10); }
          46%  { transform: translate3d(16%, 8%, 0)    scale(1.02); }
          68%  { transform: translate3d(-6%, 14%, 0)   scale(1.12); }
          88%  { transform: translate3d(-18%, 4%, 0)   scale(1.06); }
          100% { transform: translate3d(-14%, -8%, 0)  scale(1.04); }
        }
        .wc-visor {
          animation: wc-visor-drift 26s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-visor { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
