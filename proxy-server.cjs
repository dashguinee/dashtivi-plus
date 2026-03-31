/**
 * DashTivi+ Live Stream Proxy
 *
 * Persistent Node.js proxy that:
 * 1. Receives stream request from browser
 * 2. Fetches from Starshare (residential IP = not blocked)
 * 3. Pipes continuous data back with CORS headers
 *
 * Run: node proxy-server.cjs
 * Expose via: cloudflared tunnel --url http://localhost:3456
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3456;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const streamUrl = parsed.query.url;

  if (parsed.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (!streamUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }

  let decoded = decodeURIComponent(streamUrl);

  // Convert Starshare URLs to the working format:
  // HTTPS → HTTP, remove /live/ prefix, remove .ts/.mp4 extension
  // This bypasses Cloudflare blocking
  if (decoded.includes('starshare.cx')) {
    decoded = decoded.replace('https://', 'http://');
    decoded = decoded.replace('/live/', '/');
    decoded = decoded.replace('/movie/', '/movie/');
    decoded = decoded.replace('/series/', '/series/');
    decoded = decoded.replace(/\.(ts|m3u8)$/, '');
    // Keep .mp4 for movies/series as they need the extension
  }

  console.log(`[${new Date().toISOString()}] Stream: ${decoded.substring(0, 80)}...`);

  // Determine content type
  let contentType = 'video/mp2t'; // Default for live TV
  if (decoded.includes('/movie/')) contentType = 'video/mp4';
  else if (decoded.includes('/series/')) contentType = 'video/mp4';
  else if (decoded.includes('.png')) contentType = 'image/png';
  else if (decoded.includes('.jpg')) contentType = 'image/jpeg';

  const getter = decoded.startsWith('https') ? https : http;

  const proxyReq = getter.get(decoded, {
    headers: {
      'User-Agent': 'Lavf/58.76.100',
      'Accept': '*/*',
      'Connection': 'keep-alive',
    },
  }, (proxyRes) => {
    // Follow redirects
    if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
      const location = proxyRes.headers.location;
      console.log(`  Redirect → ${location?.substring(0, 80)}`);
      const getter2 = location?.startsWith('https') ? https : http;
      getter2.get(location, {
        headers: { 'User-Agent': 'Lavf/58.76.100', 'Accept': '*/*' },
      }, (finalRes) => {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        });
        finalRes.pipe(res);
        finalRes.on('end', () => console.log('  Stream ended'));
        finalRes.on('error', (e) => console.log('  Stream error:', e.message));
      }).on('error', (e) => {
        res.writeHead(502);
        res.end(JSON.stringify({ error: e.message }));
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    proxyRes.pipe(res);
    proxyRes.on('end', () => console.log('  Stream ended'));
  });

  proxyReq.on('error', (e) => {
    console.log('  Proxy error:', e.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(JSON.stringify({ error: e.message }));
    }
  });

  req.on('close', () => {
    proxyReq.destroy();
    console.log('  Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`DashTivi+ Stream Proxy running on :${PORT}`);
  console.log(`Test: http://localhost:${PORT}/health`);
  console.log(`Stream: http://localhost:${PORT}/?url=https://starshare.cx/live/Test032026/032026Test/192.ts`);
  console.log('');
  console.log('Expose via: cloudflared tunnel --url http://localhost:' + PORT);
});
