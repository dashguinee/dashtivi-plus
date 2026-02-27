#!/usr/bin/env node
/**
 * TIVI+ Hard Stream Tester
 * Goes beyond HTTP health checks — actually parses HLS manifests
 * and downloads the first segment to verify real streaming.
 *
 * Usage:
 *   node scripts/stream-test.cjs              # Test 500 sample
 *   node scripts/stream-test.cjs --all        # Test all channels
 *   node scripts/stream-test.cjs --count 1000 # Test 1000 channels
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ============ CONFIG ============
const CONCURRENCY = 50;
const TIMEOUT = 12000;          // 12s total per channel
const SEGMENT_BYTES = 2048;     // Download first 2KB of segment
const DEFAULT_SAMPLE = 500;
const DATA_FILE = path.resolve(__dirname, '..', 'src', 'data', 'free_live.json');
const OUTPUT_FILE = path.resolve(__dirname, '..', 'src', 'data', 'verified_streams.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const VIDEO_CONTENT_TYPES = [
  'video/', 'application/octet-stream', 'application/vnd.apple.mpegurl',
  'application/x-mpegurl', 'audio/mpegurl', 'audio/x-mpegurl',
  'application/mpegurl', 'binary/octet-stream',
];

// ============ RESULT STATUSES ============
const STATUS = {
  STREAMING: 'STREAMING',       // Manifest parsed + segment data confirmed
  MANIFEST_ONLY: 'MANIFEST_ONLY', // Manifest parsed but no segment data
  DEAD: 'DEAD',                 // Anything else
};

// ============ CLI PARSING ============
function parseArgs() {
  const args = process.argv.slice(2);
  let count = DEFAULT_SAMPLE;
  let all = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { count, all };
}

// ============ HTTP FETCH (low-level) ============
function fetch(url, opts = {}) {
  return new Promise((_resolve, _reject) => {
    const timeout = opts.timeout || TIMEOUT;
    const maxBytes = opts.maxBytes || 0; // 0 = read all
    let settled = false;
    let hardTimer = null;

    function resolve(val) {
      if (settled) return;
      settled = true;
      if (hardTimer) clearTimeout(hardTimer);
      _resolve(val);
    }
    function reject(err) {
      if (settled) return;
      settled = true;
      if (hardTimer) clearTimeout(hardTimer);
      _reject(err);
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return reject(new Error(`Invalid URL: ${url}`));
    }

    const mod = parsedUrl.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout,
      headers: {
        'User-Agent': UA,
        ...(maxBytes > 0 ? { 'Range': `bytes=0-${maxBytes - 1}` } : {}),
        ...(opts.headers || {}),
      },
      rejectUnauthorized: false,
    };

    const req = mod.request(reqOpts, (res) => {
      // Follow up to 2 redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        req.destroy();
        res.destroy();
        const redirects = (opts._redirects || 0) + 1;
        if (redirects > 2) {
          return reject(new Error('Too many redirects'));
        }
        let loc = res.headers.location;
        // Handle relative redirects
        if (!loc.startsWith('http')) {
          loc = new URL(loc, url).href;
        }
        // Clear hard timer before delegating to recursive fetch
        if (hardTimer) { clearTimeout(hardTimer); hardTimer = null; }
        return fetch(loc, { ...opts, _redirects: redirects }).then(resolve, reject);
      }

      const contentType = (res.headers['content-type'] || '').toLowerCase();
      const chunks = [];
      let totalBytes = 0;

      res.on('data', (chunk) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        if (maxBytes > 0 && totalBytes >= maxBytes) {
          res.destroy();
        }
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });

      res.on('error', () => {
        // Might have been destroyed by maxBytes limiter — that's OK
        if (chunks.length > 0) {
          resolve({
            status: res.statusCode,
            contentType,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        } else {
          reject(new Error('Response error'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    // Send the request (http.request requires explicit .end())
    req.end();

    // Hard deadline — cleared by resolve/reject wrappers
    hardTimer = setTimeout(() => {
      req.destroy();
      reject(new Error('hard_timeout'));
    }, timeout);
  });
}

// ============ M3U8 PARSER ============

/**
 * Determine if body text is a master playlist or media playlist.
 * Returns { type: 'master'|'media', variants: [], segments: [] }
 */
function parseM3U8(text, baseUrl) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (!lines.some(l => l.startsWith('#EXTM3U'))) {
    return null; // Not a valid m3u8
  }

  const isMaster = lines.some(l => l.startsWith('#EXT-X-STREAM-INF'));

  if (isMaster) {
    // Master playlist — extract variant URLs
    const variants = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
        // Next non-comment line is the variant URL
        for (let j = i + 1; j < lines.length; j++) {
          if (!lines[j].startsWith('#')) {
            variants.push(resolveUrl(lines[j], baseUrl));
            break;
          }
        }
      }
    }
    return { type: 'master', variants, segments: [] };
  }

  // Media playlist — extract segment URLs
  const segments = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      // Next non-comment line is the segment URL
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j].startsWith('#')) {
          segments.push(resolveUrl(lines[j], baseUrl));
          break;
        }
      }
    }
  }

  // Some media playlists use #EXT-X-MAP for initialization segments
  if (segments.length === 0) {
    for (const line of lines) {
      if (line.startsWith('#EXT-X-MAP')) {
        const uriMatch = line.match(/URI="([^"]+)"/);
        if (uriMatch) {
          segments.push(resolveUrl(uriMatch[1], baseUrl));
        }
      }
    }
  }

  return { type: 'media', variants: [], segments };
}

/**
 * Resolve a possibly-relative URL against a base.
 */
function resolveUrl(target, base) {
  if (!target) return '';
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return target;
  }
  try {
    return new URL(target, base).href;
  } catch {
    // Fallback: join manually
    const baseParts = base.split('/');
    baseParts.pop(); // remove filename
    return baseParts.join('/') + '/' + target;
  }
}

/**
 * Extract hostname from a URL for stats.
 */
function getHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

// ============ STREAM TEST (per channel) ============

/**
 * Deep test a single channel URL.
 * Returns { status: STREAMING|MANIFEST_ONLY|DEAD, detail: string }
 */
async function testStream(url) {
  if (!url) return { status: STATUS.DEAD, detail: 'no_url' };

  const isM3U8 = url.includes('.m3u8') || url.includes('m3u8');
  const deadline = Date.now() + TIMEOUT;

  try {
    // Step 1: Fetch the URL
    const remainingMs = () => Math.max(deadline - Date.now(), 1000);
    const res = await fetch(url, { timeout: remainingMs() });

    if (res.status < 200 || res.status >= 400) {
      return { status: STATUS.DEAD, detail: `http_${res.status}` };
    }

    // Non-m3u8 URL — check if it returns video content
    if (!isM3U8 && !res.contentType.includes('mpegurl') && !res.contentType.includes('m3u8')) {
      const isVideo = VIDEO_CONTENT_TYPES.some(ct => res.contentType.includes(ct));
      if (isVideo && res.body.length > 100) {
        return { status: STATUS.STREAMING, detail: 'direct_video' };
      }
      // Check if body is actually m3u8 despite wrong content-type
      const bodyStr = res.body.toString('utf-8', 0, Math.min(res.body.length, 4096));
      if (bodyStr.includes('#EXTM3U')) {
        // Fall through to m3u8 parsing
      } else {
        // Not video, not m3u8
        if (res.body.length > 100) {
          return { status: STATUS.DEAD, detail: `not_video_ct:${res.contentType.slice(0, 40)}` };
        }
        return { status: STATUS.DEAD, detail: 'empty_response' };
      }
    }

    // Step 2: Parse as M3U8
    const bodyText = res.body.toString('utf-8');
    const parsed = parseM3U8(bodyText, url);

    if (!parsed) {
      // Body had #EXTM3U but nothing parseable? Or not m3u8 at all.
      if (res.body.length > 100) {
        return { status: STATUS.MANIFEST_ONLY, detail: 'unparseable_m3u8' };
      }
      return { status: STATUS.DEAD, detail: 'invalid_m3u8' };
    }

    // Step 3: If master playlist, fetch first variant
    let mediaSegments = parsed.segments;

    if (parsed.type === 'master' && parsed.variants.length > 0) {
      if (Date.now() >= deadline) {
        return { status: STATUS.MANIFEST_ONLY, detail: 'master_timeout' };
      }

      try {
        const variantRes = await fetch(parsed.variants[0], { timeout: remainingMs() });
        if (variantRes.status >= 200 && variantRes.status < 400) {
          const variantText = variantRes.body.toString('utf-8');
          const variantParsed = parseM3U8(variantText, parsed.variants[0]);
          if (variantParsed && variantParsed.segments.length > 0) {
            mediaSegments = variantParsed.segments;
          }
        }
      } catch {
        // Variant fetch failed — we have the master manifest at least
        return { status: STATUS.MANIFEST_ONLY, detail: 'variant_fetch_failed' };
      }
    }

    // Step 4: Download first segment
    if (mediaSegments.length === 0) {
      return { status: STATUS.MANIFEST_ONLY, detail: `${parsed.type}_no_segments` };
    }

    if (Date.now() >= deadline) {
      return { status: STATUS.MANIFEST_ONLY, detail: 'segment_timeout' };
    }

    try {
      const segRes = await fetch(mediaSegments[0], {
        timeout: remainingMs(),
        maxBytes: SEGMENT_BYTES,
      });

      if (segRes.status >= 200 && segRes.status < 400 && segRes.body.length > 0) {
        // Got actual segment data — this stream is LIVE
        return { status: STATUS.STREAMING, detail: `seg_${segRes.body.length}b` };
      }
      return { status: STATUS.MANIFEST_ONLY, detail: `seg_http_${segRes.status}` };
    } catch (segErr) {
      return { status: STATUS.MANIFEST_ONLY, detail: `seg_err:${segErr.message.slice(0, 30)}` };
    }

  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('timeout') || msg.includes('hard_timeout')) {
      return { status: STATUS.DEAD, detail: 'timeout' };
    }
    return { status: STATUS.DEAD, detail: msg.slice(0, 50) };
  }
}

// ============ PARALLEL RUNNER ============
async function runTests(channels, label) {
  const total = channels.length;
  let checked = 0;
  let streaming = 0;
  let manifestOnly = 0;
  let dead = 0;
  const results = []; // { channel, testResult }
  const hostStats = {}; // hostname -> { streaming, manifest, dead }

  console.log(`\n=== ${label}: ${total} channels (${CONCURRENCY} concurrent, ${TIMEOUT / 1000}s timeout) ===\n`);
  const startTime = Date.now();

  // Process in concurrent batches
  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = channels.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (ch) => {
      const result = await testStream(ch.url);
      return { channel: ch, testResult: result };
    });

    const chunkResults = await Promise.all(promises);

    for (const r of chunkResults) {
      checked++;
      const host = getHost(r.channel.url);
      if (!hostStats[host]) hostStats[host] = { streaming: 0, manifest: 0, dead: 0, total: 0 };
      hostStats[host].total++;

      switch (r.testResult.status) {
        case STATUS.STREAMING:
          streaming++;
          hostStats[host].streaming++;
          break;
        case STATUS.MANIFEST_ONLY:
          manifestOnly++;
          hostStats[host].manifest++;
          break;
        default:
          dead++;
          hostStats[host].dead++;
          break;
      }

      results.push(r);
    }

    // Progress bar
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = elapsed > 0 ? (checked / elapsed).toFixed(1) : '0';
    const eta = rate > 0 ? ((total - checked) / parseFloat(rate)).toFixed(0) : '?';
    process.stdout.write(
      `\r  [${checked}/${total}] streaming=${streaming} manifest=${manifestOnly} dead=${dead} | ${rate}/s | ETA: ${eta}s  `
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n  Completed in ${elapsed}s`);

  return { results, streaming, manifestOnly, dead, total, hostStats };
}

// ============ MAIN ============
async function main() {
  const { count, all } = parseArgs();

  console.log('======================================');
  console.log('  TIVI+ Hard Stream Tester');
  console.log('  Real HLS manifest + segment verify');
  console.log('======================================');

  // Load channels
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`\nERROR: Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }

  const allChannels = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`\nLoaded ${allChannels.length} channels from free_live.json`);

  // Select sample
  let testSet;
  if (all) {
    testSet = allChannels;
    console.log(`Mode: --all (testing all ${allChannels.length})`);
  } else {
    const n = Math.min(count, allChannels.length);
    // Shuffle for a representative sample
    const shuffled = [...allChannels].sort(() => Math.random() - 0.5);
    testSet = shuffled.slice(0, n);
    console.log(`Mode: sample (testing ${n} of ${allChannels.length})`);
  }

  // Run tests
  const { results, streaming, manifestOnly, dead, total, hostStats } = await runTests(testSet, 'Stream Test');

  // ============ RESULTS ============

  // Separate streaming channels (keep original format)
  const streamingChannels = results
    .filter(r => r.testResult.status === STATUS.STREAMING)
    .map(r => r.channel);

  // Write verified streams
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(streamingChannels, null, 2));
  console.log(`\nVerified streams written: ${OUTPUT_FILE}`);

  // ============ SUMMARY ============
  console.log('\n======================================');
  console.log('  RESULTS');
  console.log('======================================');
  console.log(`  Total tested:   ${total}`);
  console.log(`  STREAMING:      ${streaming}  (${(streaming / total * 100).toFixed(1)}%)`);
  console.log(`  MANIFEST_ONLY:  ${manifestOnly}  (${(manifestOnly / total * 100).toFixed(1)}%)`);
  console.log(`  DEAD:           ${dead}  (${(dead / total * 100).toFixed(1)}%)`);
  console.log('');

  // Host breakdown (top 10 by total channels)
  const sortedHosts = Object.entries(hostStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  if (sortedHosts.length > 0) {
    console.log('  Top 10 Hosts:');
    console.log('  ' + '-'.repeat(78));
    console.log('  ' + 'Host'.padEnd(40) + 'Total'.padStart(6) + 'Stream'.padStart(8) + 'Manif'.padStart(7) + 'Dead'.padStart(6) + '  Rate');
    console.log('  ' + '-'.repeat(78));
    for (const [host, s] of sortedHosts) {
      const rate = s.total > 0 ? ((s.streaming / s.total) * 100).toFixed(0) + '%' : '0%';
      const hostDisplay = host.length > 38 ? host.slice(0, 35) + '...' : host;
      console.log(
        '  ' +
        hostDisplay.padEnd(40) +
        String(s.total).padStart(6) +
        String(s.streaming).padStart(8) +
        String(s.manifest).padStart(7) +
        String(s.dead).padStart(6) +
        ('  ' + rate)
      );
    }
    console.log('  ' + '-'.repeat(78));
  }

  // Dead detail breakdown (top reasons)
  const deadReasons = {};
  for (const r of results) {
    if (r.testResult.status === STATUS.DEAD) {
      const reason = r.testResult.detail || 'unknown';
      deadReasons[reason] = (deadReasons[reason] || 0) + 1;
    }
  }

  const sortedReasons = Object.entries(deadReasons).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sortedReasons.length > 0) {
    console.log('\n  Dead Reasons (top 8):');
    for (const [reason, count] of sortedReasons) {
      console.log(`    ${reason.padEnd(40)} ${count}`);
    }
  }

  // Manifest-only breakdown
  const manifestReasons = {};
  for (const r of results) {
    if (r.testResult.status === STATUS.MANIFEST_ONLY) {
      const reason = r.testResult.detail || 'unknown';
      manifestReasons[reason] = (manifestReasons[reason] || 0) + 1;
    }
  }

  const sortedManifest = Object.entries(manifestReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sortedManifest.length > 0) {
    console.log('\n  Manifest-Only Reasons (top 5):');
    for (const [reason, count] of sortedManifest) {
      console.log(`    ${reason.padEnd(40)} ${count}`);
    }
  }

  console.log('\n======================================');
  console.log(`  Output: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log('======================================\n');
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
