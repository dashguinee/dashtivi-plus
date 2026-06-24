import { useAuth } from '@/hooks/useAuth';

/**
 * useShowcaseTier — ONE source of truth for the free-vs-premium showcase split.
 *
 * The "village" is shown at two intensities (Aziz, 2026-06-24):
 *   · FREE / guest  → the LOUD showcase: Stream+ tab + page, the neon free-HLS
 *                     grid on home, the full Oyé / Stations / VOYO cross-sell.
 *                     This is the hook that welcomes a member in.
 *   · PREMIUM       → CALM. No free-channel neon grid (they have the real
 *                     premium channels), no Stream+ tab. But the village is NOT
 *                     hidden — the Oyé / Stations / VOYO music cross-sell is
 *                     embedded *subtly* (premium = restraint), so they can still
 *                     reach the verse, just quietly.
 *
 * Premium = authenticated with a real entitlement (has xtream creds AND a tier
 * that is neither empty nor 'guest'). Everyone else — browse-as-guest, or a
 * valid id+pin with no active sub — is free. This mirrors HomePage's original
 * isPremium/isFree logic exactly, kept here so the nav tab, the home grid, and
 * the Stream+ page can never disagree.
 */
export function useShowcaseTier() {
  const { credentials, tier } = useAuth();
  const isPremium = !!credentials && tier !== '' && tier !== 'guest';
  return { isPremium, isFree: !isPremium };
}

export default useShowcaseTier;
