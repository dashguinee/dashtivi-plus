/**
 * Supabase client for Tivi+ — points at the Command Center project
 * (mclbbkmpovnvcfmwsoqt). Only dash_notifications is currently read
 * via the SDK; access-code lookups in useAuth still hit the REST API
 * directly for bundle reasons.
 *
 * PERF: the @supabase/supabase-js library (~35KB gzip: realtime +
 * postgrest + gotrue + storage) is NOT needed at first paint — it only
 * powers the notification island + push opt-in, both effect/tap driven.
 * So we DEFER it behind a dynamic import: `getSupabase()` loads the lib
 * on demand and caches the client. This keeps the whole SDK out of the
 * eager index chunk, shrinking the critical JS that weak networks must
 * fetch + parse before the app is interactive.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _loading: Promise<SupabaseClient> | null = null;

/**
 * Lazily load @supabase/supabase-js and return a cached client.
 * Safe to call repeatedly — the import + createClient run at most once.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (_client) return Promise.resolve(_client);
  if (_loading) return _loading;
  _loading = import('@supabase/supabase-js').then(({ createClient }) => {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    _client = createClient(url, anon);
    return _client;
  });
  return _loading;
}
