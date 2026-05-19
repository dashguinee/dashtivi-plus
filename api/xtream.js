/**
 * /api/xtream — CORS proxy for Xtream API calls
 * Browser can't call buxjam.com directly (no CORS headers).
 * This edge function proxies player_api.php and adds CORS.
 *
 * Usage: /api/xtream?action=get_live_streams&u=USER&p=PASS
 */

export const config = { runtime: 'edge' };

const XTREAM_HOST = 'https://fastshare1.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'get_live_categories';
  const u = searchParams.get('u') || '';
  const p = searchParams.get('p') || '';

  // Forward any extra params (category_id, vod_id, etc.)
  const extra = [];
  for (const [k, v] of searchParams.entries()) {
    if (!['action', 'u', 'p'].includes(k)) extra.push(`${k}=${encodeURIComponent(v)}`);
  }

  const upstream = `${XTREAM_HOST}/player_api.php?username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&action=${encodeURIComponent(action)}${extra.length ? '&' + extra.join('&') : ''}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000),
    });

    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
