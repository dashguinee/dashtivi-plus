import { useSyncExternalStore } from 'react';
import { getItem, setItem, removeItem } from '@/lib/storage';
import type { XtreamCredentials } from '@/lib/xtream';
import {
  getDashSession,
  handleHubCallback,
  hasHubCallbackParam,
  signOutDashSession,
  redirectToHub,
  type DashCitizen,
} from '@/lib/dash-auth';

interface AuthState {
  isAuthenticated: boolean;
  credentials: XtreamCredentials | null;
  tier: string;
  code: string;
  coreId: string;
  customerName: string;
  expires: string;
  isLoading: boolean;
}

const AUTH_KEY = 'tivi_auth';

// Supabase REST API — keys from env vars (set in Vercel + .env.local)
const SB_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim()}/rest/v1`;
const SB_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Stored auth no longer contains xtream credentials — only the identifiers
// needed to re-validate on reload.
//  - method 'code' : legacy DASH-XXXX access code (lookup_access_code)
//  - method 'pin'  : DASH ID + PIN (login_with_pin); persists the PIN so the
//                    secret xtream creds can be re-fetched (never stored).
//  - method 'hub'  : auto-authed from an existing DASH Hub session (SSO). No
//                    PIN is held — identity comes from the shared
//                    'dash_citizen_storage'. Re-derived on every reload; if the
//                    Hub session is gone, this session is dropped.
interface StoredAuth {
  method?: 'code' | 'pin' | 'hub';
  code: string;          // the access code (legacy) OR the DASH ID for pin method
  pin?: string;          // pin method only — secret, re-validated on reload
  coreId?: string;
  tier: string;
  expires: string;
  customerName: string;
  guest?: boolean;       // pin method: valid id+pin but no active entitlement
}

interface SupabaseCodeRow {
  code: string;
  user_xtream: string;
  pass_xtream: string;
  tier: string;
  expires_at: string;
  max_streams: number;
  customer_name: string | null;
}

// Sentinel error type so callers can distinguish network vs logical failures
type LookupResult =
  | { ok: true; row: SupabaseCodeRow }
  | { ok: false; reason: 'not_found' | 'expired' | 'network' };

function loadStoredCode(): StoredAuth | null {
  const stored = getItem<StoredAuth | null>(AUTH_KEY, null);
  if (!stored) return null;

  // #28 — Check expiry on app launch; clear if expired
  if (new Date(stored.expires) < new Date()) {
    removeItem(AUTH_KEY);
    return null;
  }

  return stored;
}

async function lookupCode(code: string): Promise<LookupResult> {
  try {
    // Use secure RPC function — never exposes table directly
    const res = await fetch(
      `${SB_URL}/rpc/lookup_access_code`,
      {
        method: 'POST',
        headers: {
          'apikey': SB_ANON,
          'Authorization': `Bearer ${SB_ANON}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_code: code.trim().toUpperCase() }),
      }
    );
    if (!res.ok) return { ok: false, reason: 'network' };
    const rows = await res.json() as SupabaseCodeRow[];
    if (rows.length === 0) return { ok: false, reason: 'not_found' };
    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };
    return { ok: true, row };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

// ── login_with_pin RPC (DASH ID + PIN) ─────────────────────────────
// Verified contract (jsonb):
//   invalid id/pin  → { ok:false, reason:'invalid' }
//   valid, no sub   → { ok:true, guest:true, core_id, name }
//   active member   → { ok:true, guest:false, core_id, name, tier,
//                       expires_at, username, password, max_streams }
interface PinRpcResponse {
  ok: boolean;
  reason?: string;
  guest?: boolean;
  core_id?: string;
  name?: string;
  tier?: string;
  expires_at?: string;
  username?: string;
  password?: string;
  max_streams?: number;
}

type PinResult =
  | { ok: true; data: PinRpcResponse }
  | { ok: false; reason: 'invalid' | 'network' };

async function lookupPin(id: string, pin: string): Promise<PinResult> {
  try {
    const res = await fetch(
      `${SB_URL}/rpc/login_with_pin`,
      {
        method: 'POST',
        headers: {
          'apikey': SB_ANON,
          'Authorization': `Bearer ${SB_ANON}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_id: id.trim().toUpperCase(), p_pin: pin.trim() }),
      }
    );
    if (!res.ok) return { ok: false, reason: 'network' };
    // RPC returns a single jsonb object (PostgREST may wrap scalar in array)
    const body = await res.json();
    const data = (Array.isArray(body) ? body[0] : body) as PinRpcResponse | null;
    if (!data || data.ok !== true) return { ok: false, reason: 'invalid' };
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

// ── resolveMemberByCoreId — entitlement from a trusted Hub session ───
// The SSO rail (dashAuth / sso_token) carries IDENTITY only (core_id + name);
// it does NOT carry Tivi+ streaming entitlement. To upgrade a Hub-authed member
// from free/guest to their real paid tier WITHOUT a PIN, the server must resolve
// entitlement by core_id. This calls an OPTIONAL RPC `tivi_resolve_member`.
//
// Until that RPC is deployed it 404s and we silently stay guest — the member is
// still logged in (no PIN), just on the free tier. When the RPC ships, full
// streaming auto-login lights up with ZERO client change. The RPC SHOULD be
// SECURITY DEFINER and ideally gated (it returns secret xtream creds), see
// supabase/migrations/tivi_resolve_member.sql.
async function resolveMemberByCoreId(coreId: string): Promise<PinRpcResponse | null> {
  try {
    const res = await fetch(`${SB_URL}/rpc/tivi_resolve_member`, {
      method: 'POST',
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${SB_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_core_id: coreId.trim().toUpperCase() }),
    });
    if (!res.ok) return null; // not deployed / not found → stay guest
    const body = await res.json();
    const data = (Array.isArray(body) ? body[0] : body) as PinRpcResponse | null;
    if (!data || data.ok !== true) return null;
    return data;
  } catch {
    return null;
  }
}

// True if there's anything to auto-auth from the Hub: a live shared session, or
// a fresh callback param in the URL the Hub just bounced us back with.
function hasHubEntry(): boolean {
  try {
    return getDashSession() !== null || hasHubCallbackParam();
  } catch {
    return false;
  }
}

// Rate limit: track failed attempts
const FAIL_KEY = 'tivi_login_fails';

function getFailCount(): { count: number; lastFail: number } {
  try {
    return JSON.parse(localStorage.getItem(FAIL_KEY) || '{"count":0,"lastFail":0}');
  } catch { return { count: 0, lastFail: 0 }; }
}

function recordFail() {
  const f = getFailCount();
  localStorage.setItem(FAIL_KEY, JSON.stringify({ count: f.count + 1, lastFail: Date.now() }));
}

function clearFails() {
  localStorage.removeItem(FAIL_KEY);
}

function getLoginDelay(): number {
  const f = getFailCount();
  if (f.count < 3) return 0;
  // Exponential backoff: 2s, 4s, 8s, 16s max
  const delay = Math.min(16000, Math.pow(2, f.count - 2) * 1000);
  const elapsed = Date.now() - f.lastFail;
  return Math.max(0, delay - elapsed);
}

const UNAUTHENTICATED: AuthState = {
  isAuthenticated: false,
  credentials: null,
  tier: '',
  code: '',
  coreId: '',
  customerName: '',
  expires: '',
  isLoading: false,
};

// ── Module-level singleton store ─────────────────────────────────────
// Previously useAuth() was instantiated independently by 5+ components, each
// running its own re-validation RPC on load AND its own 30-min interval. Those
// copies could DIVERGE: a transient network error in one copy resolves it to
// UNAUTHENTICATED (credentials=null) while another stays authenticated → either
// a blank app (`!credentials` gate) or proxy URLs built with empty u=&p= → 401s.
// We hoist auth to a single module-level store: ONE validation, ONE interval,
// all consumers read the same snapshot via useSyncExternalStore.

let authState: AuthState = {
  ...UNAUTHENTICATED,
  // Start in loading state if there's a stored session to re-validate, OR a DASH
  // Hub session / SSO callback to consume — so the login screen never flashes
  // before auto-auth resolves (first-load gate).
  isLoading: loadStoredCode() !== null || hasHubEntry(),
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setAuthState(next: AuthState) {
  authState = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): AuthState {
  return authState;
}

// ── DASH Hub auto-auth (SSO) ─────────────────────────────────────────
// Apply an identity captured from the Hub session. `ent` is the optional paid
// entitlement (from resolveMemberByCoreId); when absent the member lands as a
// free/guest member (no xtream creds) — still fully logged in, no PIN.
function applyHubSession(session: DashCitizen, ent: PinRpcResponse | null): void {
  const isGuest = !ent || ent.guest === true;
  const coreId = ent?.core_id || session.coreId;
  const name = ent?.name || session.fullName || '';
  setAuthState({
    isAuthenticated: true,
    credentials: isGuest ? null : { username: ent?.username || '', password: ent?.password || '' },
    tier: isGuest ? 'guest' : (ent?.tier || ''),
    code: coreId,
    coreId,
    customerName: name,
    expires: isGuest ? '' : (ent?.expires_at || ''),
    isLoading: false,
  });
  setItem(AUTH_KEY, {
    method: 'hub',
    code: coreId,
    coreId,
    tier: isGuest ? 'guest' : (ent?.tier || ''),
    expires: isGuest ? '' : (ent?.expires_at || ''),
    customerName: name,
    guest: isGuest,
  } satisfies StoredAuth);
}

// Consume any Hub callback param, then auto-authenticate from the shared Hub
// session. Lands the member immediately (identity), then upgrades to paid tier
// if the entitlement RPC is available. Falls back to UNAUTHENTICATED (→ login
// screen with the ID+PIN gate) when there's no Hub session.
async function bootstrapFromHub(): Promise<void> {
  try {
    await handleHubCallback();
  } catch {
    /* ignore — fall through to whatever's in localStorage */
  }

  const session = getDashSession();
  if (!session) {
    removeItem(AUTH_KEY); // drop any stale method:'hub' record
    setAuthState({ ...UNAUTHENTICATED, isLoading: false });
    return;
  }

  // Identity in hand (no PIN) — open the app now as a free/guest member…
  applyHubSession(session, null);
  // …then try to upgrade to their real paid entitlement (silent until the RPC
  // ships; see resolveMemberByCoreId).
  const entitlement = await resolveMemberByCoreId(session.coreId);
  if (entitlement) applyHubSession(session, entitlement);
}

// One-time bootstrap: re-validate the stored session ONCE and install the single
// app-lifetime expiry interval. Guarded so repeated useAuth() mounts can't re-run it.
let bootstrapped = false;
function ensureBootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  const stored = loadStoredCode();
  if (!stored) {
    // No local session — try DASH Hub auto-auth before showing the login gate.
    void bootstrapFromHub();
  } else if (stored.method === 'hub') {
    // Reload of a Hub-authed session — re-derive from the shared Hub session
    // (and re-attempt the entitlement upgrade).
    void bootstrapFromHub();
  } else if (stored.method === 'pin' && stored.pin) {
    // PIN method — re-validate DASH ID + PIN via login_with_pin so the secret
    // xtream creds (never persisted) come back fresh. Guests have no creds but a
    // valid id+pin → restore guest-authenticated state.
    const pinTimeout = new Promise<PinResult>((resolve) =>
      setTimeout(() => resolve({ ok: false, reason: 'network' }), 6000)
    );
    Promise.race([lookupPin(stored.code, stored.pin), pinTimeout]).then((result) => {
      if (result.ok) {
        const d = result.data;
        const isGuest = d.guest === true;
        setAuthState({
          isAuthenticated: true,
          credentials: isGuest ? null : { username: d.username || '', password: d.password || '' },
          tier: isGuest ? 'guest' : (d.tier || ''),
          code: stored.code,
          coreId: d.core_id || stored.coreId || stored.code,
          customerName: d.name || '',
          expires: isGuest ? '' : (d.expires_at || ''),
          isLoading: false,
        });
        setItem(AUTH_KEY, {
          method: 'pin',
          code: stored.code,
          pin: stored.pin,
          coreId: d.core_id || stored.code,
          tier: isGuest ? 'guest' : (d.tier || ''),
          expires: isGuest ? '' : (d.expires_at || ''),
          customerName: d.name || '',
          guest: isGuest,
        } satisfies StoredAuth);
      } else {
        removeItem(AUTH_KEY);
        setAuthState({ ...UNAUTHENTICATED, isLoading: false });
      }
    }).catch(() => {
      removeItem(AUTH_KEY);
      setAuthState({ ...UNAUTHENTICATED, isLoading: false });
    });
  } else {
    // Legacy access-code method (DASH-XXXX).
    // Race lookup against a 6s timeout — never hang on loading screen.
    const timeout = new Promise<LookupResult>((resolve) =>
      setTimeout(() => resolve({ ok: false, reason: 'network' }), 6000)
    );
    Promise.race([lookupCode(stored.code), timeout]).then((result) => {
      if (result.ok) {
        setAuthState({
          isAuthenticated: true,
          credentials: { username: result.row.user_xtream, password: result.row.pass_xtream },
          tier: result.row.tier,
          code: stored.code,
          coreId: stored.coreId || stored.code,
          customerName: result.row.customer_name || '',
          expires: result.row.expires_at,
          isLoading: false,
        });
        // Refresh stored expiry in case it changed server-side
        setItem(AUTH_KEY, {
          method: 'code',
          code: stored.code,
          coreId: stored.coreId || stored.code,
          tier: result.row.tier,
          expires: result.row.expires_at,
          customerName: result.row.customer_name || '',
        } satisfies StoredAuth);
      } else {
        // Code expired or unreachable — clear session
        removeItem(AUTH_KEY);
        setAuthState({ ...UNAUTHENTICATED, isLoading: false });
      }
    }).catch(() => {
      // Safety net — never hang on loading screen
      removeItem(AUTH_KEY);
      setAuthState({ ...UNAUTHENTICATED, isLoading: false });
    });
  }

  // ONE periodic check for the whole app — verify the code hasn't expired mid-session.
  setInterval(() => {
    if (!authState.isAuthenticated) return;
    const s = getItem<StoredAuth | null>(AUTH_KEY, null);
    if (!s || new Date(s.expires) < new Date()) {
      setAuthState({ ...UNAUTHENTICATED, isLoading: false });
      removeItem(AUTH_KEY);
    }
  }, 30 * 60 * 1000);
}

async function login(code: string): Promise<{ success: boolean; error?: string }> {
  // Rate limiting — block rapid brute force
  const delay = getLoginDelay();
  if (delay > 0) {
    return { success: false, error: `Too many attempts. Wait ${Math.ceil(delay / 1000)}s` };
  }

  const upper = code.trim().toUpperCase();

  // #25 — lookupCode now returns a typed result distinguishing not_found / expired / network
  const result = await lookupCode(upper);

  if (!result.ok) {
    recordFail();
    if (result.reason === 'expired') {
      return { success: false, error: 'Access code expired — contact support' };
    }
    if (result.reason === 'network') {
      return { success: false, error: 'Connection error — check your internet' };
    }
    return { success: false, error: 'Invalid access code' };
  }

  clearFails();

  // #26 — Store only non-sensitive fields; credentials stay in memory only
  const stored: StoredAuth = {
    method: 'code',
    code: upper,
    coreId: upper,
    tier: result.row.tier,
    expires: result.row.expires_at,
    customerName: result.row.customer_name || '',
  };
  setItem(AUTH_KEY, stored);

  setAuthState({
    isAuthenticated: true,
    credentials: { username: result.row.user_xtream, password: result.row.pass_xtream },
    tier: result.row.tier,
    code: upper,
    coreId: upper,
    customerName: result.row.customer_name || '',
    expires: result.row.expires_at,
    isLoading: false,
  });

  return { success: true };
}

// ── loginWithPin — DASH ID + PIN (primary gate) ──────────────────
async function loginWithPin(
  id: string,
  pin: string
): Promise<{ success: boolean; guest?: boolean; error?: string }> {
  // Reuse the same brute-force backoff as the legacy path.
  const delay = getLoginDelay();
  if (delay > 0) {
    return { success: false, error: `Too many attempts. Wait ${Math.ceil(delay / 1000)}s` };
  }

  const upperId = id.trim().toUpperCase();
  const cleanPin = pin.trim();
  if (!upperId || !cleanPin) {
    return { success: false, error: 'Enter your DASH ID and PIN' };
  }

  const result = await lookupPin(upperId, cleanPin);

  if (!result.ok) {
    if (result.reason === 'network') {
      return { success: false, error: 'Connection error — check your internet' };
    }
    recordFail();
    return { success: false, error: 'Invalid DASH ID or PIN' };
  }

  clearFails();
  const d = result.data;
  const isGuest = d.guest === true;
  const coreId = d.core_id || upperId;

  const stored: StoredAuth = {
    method: 'pin',
    code: upperId,
    pin: cleanPin,
    coreId,
    tier: isGuest ? 'guest' : (d.tier || ''),
    expires: isGuest ? '' : (d.expires_at || ''),
    customerName: d.name || '',
    guest: isGuest,
  };
  setItem(AUTH_KEY, stored);

  setAuthState({
    isAuthenticated: true,
    credentials: isGuest ? null : { username: d.username || '', password: d.password || '' },
    tier: isGuest ? 'guest' : (d.tier || ''),
    code: upperId,
    coreId,
    customerName: d.name || '',
    expires: isGuest ? '' : (d.expires_at || ''),
    isLoading: false,
  });

  return { success: true, guest: isGuest };
}

// Send the user to the DASH Hub to sign in, then bounce back here auto-authed.
// One tap if they're already signed into the Hub.
function signInWithHub() {
  redirectToHub();
}

function logout() {
  removeItem(AUTH_KEY);
  // Also clear the shared DASH Hub session so a Hub-authed member who signs out
  // here isn't immediately auto-re-logged-in on the next boot.
  signOutDashSession();
  clearFails();
  // Clear ONLY transient xtream_* API caches + the auth/credential keys above.
  // PRESERVE user data with no DB mirror (tivi_likes / tivi_downloads /
  // tivi_watch_history) — wiping those on sign-out permanently destroyed the
  // member's Library + Keep Watching.
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('xtream_')) {
      localStorage.removeItem(key);
    }
  }
  setAuthState({ ...UNAUTHENTICATED, isLoading: false });
}

export function useAuth() {
  // Kick off the single bootstrap (idempotent) the first time any component
  // reads auth, then subscribe all consumers to the one shared snapshot.
  ensureBootstrap();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    credentials: state.credentials,
    tier: state.tier,
    code: state.code,
    coreId: state.coreId,
    customerName: state.customerName,
    expires: state.expires,
    login,
    loginWithPin,
    signInWithHub,
    logout,
  };
}
