/**
 * VOYO bridge for Tivi+ — "emerge in VOYO" without leaving the app.
 *
 * Wiring is trivial:
 *   import { OyeAfricaCard, StationsCard, useOpenVoyo } from '@/components/voyo';
 *
 *   // drop the cross-sell teasers anywhere on HomePage:
 *   <OyeAfricaCard />
 *   <StationsCard />
 *
 *   // or trigger the rise from VEE / any handler:
 *   const openVoyo = useOpenVoyo();        // VOYO home
 *   openVoyo('oye');                       // straight into Oyé Africa
 *   openVoyo('stations');                  // straight into Stations
 *
 * All of the above must live inside <SurfaceProvider> (already mounted in App.tsx).
 */

export { OyeAfricaCard } from './OyeAfricaCard';
export { StationsCard } from './StationsCard';
export { AfricaSpark } from './AfricaSpark';
export {
  useOpenVoyo,
  VoyoSurfaceContent,
  VOYO_SURFACE_ID,
} from './VoyoSurface';
export type { VoyoSection } from './VoyoSurface';
