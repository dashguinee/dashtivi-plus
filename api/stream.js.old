/**
 * DASH WebTV - Stream Proxy (Optimized)
 * Fast passthrough with minimal overhead
 */

export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,  // Don't parse body - stream it
  },
  runtime: 'edge',  // Use Edge Runtime for lower latency
}

export default async function handler(req) {
  const url = new URL(req.url)
  const streamUrl = url.searchParams.get('url')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
      }
    })
  }

  if (!streamUrl) {
    return new Response(JSON.stringify({ error: 'Missing URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Passthrough fetch - stream directly
    const response = await fetch(decodeURIComponent(streamUrl), {
      headers: {
        'User-Agent': 'DASH-WebTV/1.0',
        ...(req.headers.get('range') ? { 'Range': req.headers.get('range') } : {})
      }
    })

    // Create response with CORS headers
    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range')

    // Stream body directly - no buffering
    return new Response(response.body, {
      status: response.status,
      headers
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Stream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
