/**
 * TMDB Reviews Client — Query imported TMDB reviews from Supabase
 *
 * Used by ContentDetailModal to show community reviews for movies/series.
 *
 * Architecture:
 *   Content key (e.g., "m:12345") → deterministic UUID → Supabase REST query
 *
 * The same UUID derivation runs both server-side (import script) and client-side
 * (this module), ensuring consistent lookups without a mapping table.
 *
 * TiVi+ does NOT use the Supabase JS SDK — it uses raw REST via fetch.
 * This module follows that same pattern.
 */

import { useState, useEffect } from 'react';

// ── Config ────────────────────────────────────────────────────────────────

const SB_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co'
).trim();

const SB_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
).trim();

// ── UUID derivation (must match import-tmdb-reviews.cjs exactly) ──────────

const NAMESPACE = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

/**
 * SHA-1 hash using SubtleCrypto (browser-native, no dependencies).
 */
async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a deterministic UUID from a content key like "m:12345" or "s:678".
 * Must produce the same UUID as the Node.js import script.
 */
export async function contentKeyToUuid(contentKey: string): Promise<string> {
  const hash = await sha1Hex(NAMESPACE + contentKey);
  const variant = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, '0');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    variant + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
}

// ── Review types ──────────────────────────────────────────────────────────

export interface TiviReview {
  id: string;
  authorName: string;
  content: string;
  reactionCount: number;
  createdAt: string;
}

// ── Supabase REST query (no SDK needed) ───────────────────────────────────

/**
 * Fetch TMDB reviews for a TiVi+ content item via Supabase REST API.
 *
 * @param contentKey - Stream key like "m:12345" or "s:678"
 * @param limit - Max reviews to return (default 5)
 */
export async function fetchTiviReviews(
  contentKey: string,
  limit: number = 5,
): Promise<TiviReview[]> {
  if (!SB_ANON_KEY) {
    console.warn('[TiviReviews] No Supabase anon key configured.');
    return [];
  }

  try {
    const targetId = await contentKeyToUuid(contentKey);

    // Direct REST query to comments table
    // Filters: target_type=tivi_content, target_id=uuid, is_active=true
    // Order: reaction_count desc, then created_at desc
    const params = new URLSearchParams({
      target_type: 'eq.tivi_content',
      target_id: `eq.${targetId}`,
      is_active: 'eq.true',
      select: 'id,content,reaction_count,created_at',
      order: 'reaction_count.desc,created_at.desc',
      limit: String(limit),
    });

    const url = `${SB_URL}/rest/v1/comments?${params}`;
    const response = await fetch(url, {
      headers: {
        'apikey': SB_ANON_KEY,
        'Authorization': `Bearer ${SB_ANON_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[TiviReviews] HTTP ${response.status} fetching reviews for ${contentKey}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((row: any) => ({
      id: row.id,
      authorName: 'TMDB Community',
      content: row.content,
      reactionCount: row.reaction_count || 0,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('[TiviReviews] Error fetching reviews:', err);
    return [];
  }
}

// ── React Hook ────────────────────────────────────────────────────────────

/**
 * React hook to load TMDB reviews for a content item.
 *
 * Usage in ContentDetailModal:
 * ```tsx
 * const { reviews, loading } = useTiviReviews(`m:${streamId}`);
 * ```
 */
export function useTiviReviews(contentKey: string | null) {
  const [reviews, setReviews] = useState<TiviReview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contentKey) {
      setReviews([]);
      return;
    }

    let mounted = true;
    setLoading(true);

    fetchTiviReviews(contentKey).then(result => {
      if (mounted) {
        setReviews(result);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [contentKey]);

  return { reviews, loading };
}
