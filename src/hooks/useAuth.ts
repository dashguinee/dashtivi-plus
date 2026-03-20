import { useState, useCallback, useEffect, useRef } from 'react';
import { getItem, setItem, removeItem } from '@/lib/storage';
import type { XtreamCredentials } from '@/lib/xtream';

interface AuthState {
  isAuthenticated: boolean;
  credentials: XtreamCredentials | null;
  tier: string;
  code: string;
  customerName: string;
  isLoading: boolean;
}

const AUTH_KEY = 'tivi_auth';

// Supabase REST API — keys from env vars (set in Vercel + .env.local)
const SB_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim()}/rest/v1`;
const SB_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Stored auth no longer contains credentials — only the code, tier, expiry, name
interface StoredAuth {
  code: string;
  tier: string;
  expires: string;
  customerName: string;
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
    const res = await fetch(
      `${SB_URL}/tivi_access_codes?code=eq.${encodeURIComponent(code)}&select=code,user_xtream,pass_xtream,tier,expires_at,max_streams,customer_name`,
      {
        headers: {
          'apikey': SB_ANON,
          'Authorization': `Bearer ${SB_ANON}`,
        },
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
  customerName: '',
  isLoading: false,
};

export function useAuth() {
  // Start in loading state if there's a stored code to re-validate
  const initialLoading = loadStoredCode() !== null;
  const [state, setState] = useState<AuthState>({ ...UNAUTHENTICATED, isLoading: initialLoading });
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // #26 — On app load, re-fetch credentials from Supabase if a stored code exists.
  // Credentials (user/pass) are never kept in localStorage — only the code.
  useEffect(() => {
    const stored = loadStoredCode();
    if (!stored) {
      setState({ ...UNAUTHENTICATED, isLoading: false });
      return;
    }

    lookupCode(stored.code).then((result) => {
      if (result.ok) {
        setState({
          isAuthenticated: true,
          credentials: { username: result.row.user_xtream, password: result.row.pass_xtream },
          tier: result.row.tier,
          code: stored.code,
          customerName: result.row.customer_name || '',
          isLoading: false,
        });
        // Refresh stored expiry in case it changed server-side
        setItem(AUTH_KEY, {
          code: stored.code,
          tier: result.row.tier,
          expires: result.row.expires_at,
          customerName: result.row.customer_name || '',
        } satisfies StoredAuth);
      } else {
        // Code expired or unreachable — clear session
        removeItem(AUTH_KEY);
        setState({ ...UNAUTHENTICATED, isLoading: false });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic auth check — verify code hasn't expired mid-session (every 30 min)
  useEffect(() => {
    if (!state.isAuthenticated) return;
    checkIntervalRef.current = setInterval(() => {
      const stored = getItem<StoredAuth | null>(AUTH_KEY, null);
      if (!stored || new Date(stored.expires) < new Date()) {
        setState({ ...UNAUTHENTICATED, isLoading: false });
        removeItem(AUTH_KEY);
      }
    }, 30 * 60 * 1000);
    return () => { if (checkIntervalRef.current) clearInterval(checkIntervalRef.current); };
  }, [state.isAuthenticated]);

  const login = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
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
      code: upper,
      tier: result.row.tier,
      expires: result.row.expires_at,
      customerName: result.row.customer_name || '',
    };
    setItem(AUTH_KEY, stored);

    setState({
      isAuthenticated: true,
      credentials: { username: result.row.user_xtream, password: result.row.pass_xtream },
      tier: result.row.tier,
      code: upper,
      customerName: result.row.customer_name || '',
      isLoading: false,
    });

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    removeItem(AUTH_KEY);
    clearFails();
    // Clear all caches on logout
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('xtream_') || key.startsWith('tivi_')) {
        localStorage.removeItem(key);
      }
    }
    setState({ ...UNAUTHENTICATED, isLoading: false });
  }, []);

  return {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    credentials: state.credentials,
    tier: state.tier,
    code: state.code,
    customerName: state.customerName,
    login,
    logout,
  };
}
