/**
 * Supabase client for Tivi+ — points at the Command Center project
 * (mclbbkmpovnvcfmwsoqt). Only dash_notifications is currently read
 * via the SDK; access-code lookups in useAuth still hit the REST API
 * directly for bundle reasons.
 */

import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabase = createClient(url, anon);
