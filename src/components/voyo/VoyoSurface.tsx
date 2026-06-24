/**
 * VoyoSurface — "emerge in VOYO" without ever leaving Tivi+.
 *
 * VOYO Music is a PWA. When Tivi+ links out to it, the browser tries to LEAVE
 * (that's the glitch the user saw in VOYO). Here we never leave: VOYO is
 * embedded as a borderless, chrome-free full-bleed iframe that RISES over the
 * Tivi+ world via the existing SurfaceStack (cubic-bezier(0.23,1,0.32,1) DNA
 * heartbeat). Close → it recedes back into the world. The world below never
 * unmounts, so coming back is instant and stateful.
 *
 * Lazy-mount: the iframe is only created while the surface is open. Receding
 * the surface unmounts the whole layer (SurfaceStack pops after the recede
 * transition), tearing the iframe down — no background VOYO tab burning data.
 *
 * Wiring: this file owns the surface CONTENT (`VoyoSurfaceContent`) and a
 * single tiny entry hook `useOpenVoyo(section?)`. Push happens through
 * SurfaceStack's self-contained `render()` mode, so the only thing the host
 * (App/HomePage/VEE) has to do is call the hook — nothing to wire in JSX.
 */

import { useEffect, useState } from 'react';
import { useSurfaces } from '@/components/system/SurfaceStack';
import { VoyoCloseX } from '@/components/ui/VoyoCloseX';

/** Stable surface id — one VOYO surface at a time (push is a no-op if present). */
export const VOYO_SURFACE_ID = 'voyo';

export type VoyoSection = 'oye' | 'stations';

/** Base VOYO PWA origin. Borderless = no Tivi chrome, VOYO renders its own. */
const VOYO_ORIGIN = 'https://voyomusic.com';

/** Build the VOYO embed URL.
 *
 *  HISTORY: we used to deep-link with `?embed=1&src=tiviplus&section=oye#oye`.
 *  VOYO is a PWA SPA — those `?section`/`#hash` params hit its client router and
 *  it landed on a blank/broken route (the iframe rose but VOYO never painted),
 *  so the surface looked like it "didn't open". voyomusic.com itself has NO
 *  X-Frame-Options / CSP frame-ancestors (confirmed via curl), so framing was
 *  never the block — the deep-link was. We now open VOYO's plain home, which
 *  reliably boots. `section` is accepted for call-site clarity but intentionally
 *  not appended to the URL (kept here so the hook signature stays stable). */
function voyoUrl(_section?: VoyoSection): string {
  return VOYO_ORIGIN;
}

interface VoyoSurfaceContentProps {
  section?: VoyoSection;
  onClose: () => void;
}

/**
 * The content that rises. Borderless: pure black bed + a single lazy iframe +
 * the plush close button. No header, no padding — VOYO fills the frame edge to
 * edge so it feels like you EMERGED into VOYO, not opened a modal.
 */
export function VoyoSurfaceContent({ section, onClose }: VoyoSurfaceContentProps) {
  // Lazy-mount gate: hold the iframe one frame so the rise animation starts on
  // an empty bed (cheap), then drop the heavy iframe in — keeps the rise smooth.
  const [mountFrame, setMountFrame] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setMountFrame(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // ESC closes — the surface should always be dismissible like any rise.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: '#08060d' }}
    >
      {/* Warm Oyé pre-roll wash while VOYO boots — green→gold, celebratory,
          fades out the instant the iframe paints. Keeps the rise from landing
          on a black void. On slow/3G the iframe can take 2-3s+, so the wash is
          richer (so it never reads as an empty void) AND gently breathes to say
          "something is happening" — quiet luxury, no loud spinner. Stops the
          instant VOYO paints. */}
      <div
        aria-hidden
        className="voyo-preroll absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 38%, rgba(0,119,73,0.32) 0%, rgba(255,182,18,0.18) 46%, transparent 78%)',
          opacity: loaded ? 0 : 1,
          transition: 'opacity 600ms cubic-bezier(0.23, 1, 0.32, 1)',
          animation: loaded ? 'none' : 'voyo-preroll-pulse 1.8s cubic-bezier(0.23, 1, 0.32, 1) infinite',
        }}
      />
      <style>{`
        @keyframes voyo-preroll-pulse {
          0%, 100% { opacity: 0.82; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .voyo-preroll { animation: none !important; }
        }
      `}</style>

      {mountFrame && (
        <iframe
          src={voyoUrl(section)}
          title="VOYO"
          className="absolute inset-0 w-full h-full"
          style={{
            border: 0,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen"
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Close — recedes the surface. Anchored to the SAFE-area edge (not the
          raw viewport) so it sits a predictable ~12px from real content on every
          device: notched iPhone, flat Android, foldable all land the same. */}
      <div
        className="absolute top-0 right-0 z-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 0.75rem)',
        }}
      >
        <VoyoCloseX onClose={onClose} size="md" ariaLabel="Close VOYO" />
      </div>
    </div>
  );
}

/**
 * useOpenVoyo — the single entry hook for wiring.
 *
 *   const openVoyo = useOpenVoyo();           // open VOYO home
 *   const openOye  = useOpenVoyo('oye');      // emerge straight into Oyé Africa
 *   const openSt   = useOpenVoyo('stations'); // emerge into Stations
 *
 *   <button onClick={openOye}>Oyé!</button>
 *
 * Returns a stable callback that pushes the VoyoSurface (self-contained render
 * mode) onto the SurfaceStack. The surface rises; its close button + ESC pop it
 * (recede). No-op if VOYO is already up. Must be called inside <SurfaceProvider>.
 */
export function useOpenVoyo(defaultSection?: VoyoSection) {
  const surfaces = useSurfaces();
  return (section: VoyoSection | undefined = defaultSection) => {
    surfaces.push({
      id: VOYO_SURFACE_ID,
      render: () => (
        <VoyoSurfaceContent
          section={section}
          onClose={() => surfaces.pop(VOYO_SURFACE_ID)}
        />
      ),
    });
  };
}

export default VoyoSurfaceContent;
