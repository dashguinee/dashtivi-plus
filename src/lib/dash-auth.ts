/**
 * DASH Hub Auto-Auth (SSO) for Tivi+
 * ----------------------------------
 * Ported from VOYO's working mechanism (voyo-music/src/lib/dash-auth.tsx).
 * DO NOT invent a new scheme — this mirrors VOYO exactly so a member already
 * signed into the DASH Hub (dasuperhub.com) lands in Tivi+ without re-entering
 * a PIN.
 *
 * THE RAIL (confirmed against the Hub repo):
 *   1. Tivi+ sends the user to the Hub with a returnUrl:
 *        https://hub.dasuperhub.com?returnUrl=<thisHref>&app=TV
 *   2. The Hub, if ALREADY authenticated, immediately bounces back to
 *        <returnUrl>?dashAuth=<base64(citizen JSON)>
 *      (Hub App.tsx ~6707 "Already authenticated, redirecting back").
 *      If not yet authed, it shows its own sign-in then bounces the same way.
 *      A token rail also exists: ?sso_token=<token> → exchange_sso_token RPC.
 *   3. Tivi+ consumes the callback param on landing (handleHubCallback below),
 *      persists the citizen under the SHARED localStorage key
 *      'dash_citizen_storage' (same key VOYO + the Hub SDK use), and is now
 *      "logged in" by identity.
 *
 * Cross-domain note: localStorage is per-origin, so the Hub session is NOT
 * directly readable from Tivi+'s origin. The handoff is the URL param the Hub
 * appends on redirect-back — exactly VOYO's model. Works inside an installed
 * PWA because the redirect returns to an in-scope URL.
 *
 * Tivi+ already runs on the SAME Supabase project as the Hub Command Center
 * (mclbbkmpovnvcfmwsoqt), so exchange_sso_token works with Tivi+'s own anon key.
 */

const STORAGE_KEY = 'dash_citizen_storage';
const HUB_URL = 'https://hub.dasuperhub.com';

const SB_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim()}/rest/v1`;
const SB_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export interface DashCitizen {
  coreId: string;
  fullName: string;
  phone?: string;
  countryCode?: string;
  role?: string;
}

/**
 * Read the current DASH Hub session from the shared localStorage key.
 * Handles both the nested shape { state: { citizen, isAuthenticated } } that the
 * Hub / VOYO write, and a flat { coreId, ... } fallback.
 */
export function getDashSession(): DashCitizen | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    const citizen = data.state?.citizen || data;
    const isAuthenticated = data.state?.isAuthenticated ?? Boolean(citizen.coreId);

    if (!citizen.coreId || !isAuthenticated) return null;

    return {
      coreId: String(citizen.coreId).toUpperCase(),
      fullName: citizen.fullName || '',
      phone: citizen.phone || '',
      countryCode: citizen.countryCode || 'GN',
      role: citizen.role || 'user',
    };
  } catch {
    return null;
  }
}

/** Persist a citizen under the shared key in the exact shape the Hub/VOYO use. */
function writeDashSession(c: DashCitizen): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          citizen: {
            coreId: c.coreId,
            fullName: c.fullName,
            phone: c.phone || '',
            countryCode: c.countryCode || 'GN',
            isActivated: true,
            role: c.role || 'user',
          },
          isAuthenticated: true,
        },
        version: 0,
      })
    );
  } catch {
    /* quota / disabled storage — auto-auth simply won't persist */
  }
}

/** Clear the shared Hub session (called on Tivi+ sign-out). */
export function signOutDashSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True if the current URL carries a Hub callback param we should consume. */
export function hasHubCallbackParam(): boolean {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.has('dashAuth') || p.has('sso_token');
  } catch {
    return false;
  }
}

/**
 * Exchange a single-use sso_token for citizen identity via the Command Center
 * RPC. Tivi+ shares the Command Center Supabase project, so its own anon key
 * authorizes the call.
 */
async function exchangeSSOToken(token: string): Promise<DashCitizen | null> {
  try {
    const res = await fetch(`${SB_URL}/rpc/exchange_sso_token`, {
      method: 'POST',
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${SB_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: token }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const data = Array.isArray(body) ? body[0] : body;
    if (!data?.success || !data.user?.core_id) return null;
    return {
      coreId: String(data.user.core_id).toUpperCase(),
      fullName: data.user.full_name || '',
      phone: data.user.phone || '',
      countryCode: data.user.country_code || 'GN',
      role: data.user.role || 'user',
    };
  } catch {
    return null;
  }
}

/**
 * On boot, consume any Hub callback param in the URL and persist the session.
 * Returns the captured citizen (or null). Cleans the param from the URL so a
 * refresh / share doesn't replay it.
 *
 * Flow 1 (primary, no DB call): ?dashAuth=<base64 citizen JSON>
 * Flow 2 (token):               ?sso_token=<token> → exchange_sso_token RPC
 */
export async function handleHubCallback(): Promise<DashCitizen | null> {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return null;
  }

  // Flow 1 — dashAuth base64 (what the Hub appends on redirect-back).
  const dashAuth = params.get('dashAuth');
  if (dashAuth) {
    try {
      const decoded = JSON.parse(atob(dashAuth));
      if (decoded.coreId) {
        const citizen: DashCitizen = {
          coreId: String(decoded.coreId).toUpperCase(),
          fullName: decoded.fullName || '',
          phone: decoded.phone || '',
          countryCode: decoded.countryCode || 'GN',
          role: decoded.role || 'user',
        };
        writeDashSession(citizen);
        cleanCallbackParams();
        return citizen;
      }
    } catch {
      /* malformed — fall through */
    }
  }

  // Flow 2 — sso_token (single-use, server-validated).
  const ssoToken = params.get('sso_token');
  if (ssoToken) {
    const citizen = await exchangeSSOToken(ssoToken);
    if (citizen) {
      writeDashSession(citizen);
      cleanCallbackParams();
      return citizen;
    }
  }

  return null;
}

/** Strip auth params from the address bar without a reload. */
function cleanCallbackParams(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('dashAuth');
    url.searchParams.delete('sso_token');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
}

/**
 * Send the user to the DASH Hub to authenticate, then bounce back here with the
 * citizen payload. If they're already signed into the Hub this is effectively
 * one tap (the Hub auto-redirects back). Full-page navigation so it works in an
 * installed PWA.
 */
export function redirectToHub(): void {
  try {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${HUB_URL}?returnUrl=${returnUrl}&app=TV`;
  } catch {
    /* ignore */
  }
}
