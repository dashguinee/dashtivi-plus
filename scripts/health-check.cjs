#!/usr/bin/env node
/**
 * TIVI+ Channel Health Checker v2
 * Tests every channel URL across ALL data sources.
 * Verifies HLS manifest loads + first segment reachable.
 *
 * Usage:
 *   node health-check.cjs              # Full check (manifest + segment)
 *   node health-check.cjs --fast       # Manifest-only (2x faster)
 *   node health-check.cjs --category sports  # Single category
 *   node health-check.cjs --source mega      # Single data source
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────
const CONCURRENCY = 80;
const TIMEOUT_MS = 10000;
const SEGMENT_TIMEOUT = 5000;
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const args = process.argv.slice(2);
const FAST_MODE = args.includes('--fast');
const CATEGORY_FILTER = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;
const SOURCE_FILTER = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;

// ─── Load all channels ───────────────────────────────────
function loadAllChannels() {
  const channels = [];
  const seen = new Set();

  function add(ch, source) {
    if (!ch.url || seen.has(ch.url)) return;
    seen.add(ch.url);
    channels.push({ ...ch, _source: source });
  }

  // 1. africa_channels.json (structured object)
  if (!SOURCE_FILTER || SOURCE_FILTER === 'africa') {
    try {
      const africa = require(path.join(DATA_DIR, 'africa_channels.json'));
      const arrays = [
        'verified_channels', 'guinea_channels', 'senegal_channels',
        'ivory_coast_channels', 'cameroon_channels', 'south_africa_free',
        'international_french', 'supersport', 'supersport_backup',
        'supersport_hls', 'bein_sports', 'dstv_movies',
      ];
      for (const key of arrays) {
        if (Array.isArray(africa[key])) {
          africa[key].forEach(ch => add(ch, `africa/${key}`));
        }
      }
      // MENA cached (skip needsProxy)
      if (Array.isArray(africa.mena_cached)) {
        africa.mena_cached
          .filter(ch => !ch.needsProxy)
          .forEach(ch => add(ch, 'africa/mena'));
      }
    } catch (e) { console.warn('  Skip africa_channels.json:', e.message); }
  }

  // 2-6. Flat JSON arrays
  const flatSources = [
    { file: 'iptv_channels.json', key: 'iptv' },
    { file: 'verified_streams.json', key: 'verified' },
    { file: 'new_sources.json', key: 'new' },
    { file: 'sports_channels.json', key: 'sports' },
    { file: 'mega_channels.json', key: 'mega' },
  ];

  for (const { file, key } of flatSources) {
    if (SOURCE_FILTER && SOURCE_FILTER !== key) continue;
    try {
      const data = require(path.join(DATA_DIR, file));
      if (Array.isArray(data)) {
        data.forEach(ch => add(ch, key));
      }
    } catch (e) { console.warn(`  Skip ${file}:`, e.message); }
  }

  return channels;
}

// ─── HTTP fetch helper ───────────────────────────────────
function fetchUrl(url, timeout = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 KHTML, like Gecko Chrome/120.0.0.0',
          'Accept': '*/*',
        },
        rejectUnauthorized: false,
      }, (res) => {
        const latency = Date.now() - start;

        // Follow one redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          req.destroy();
          res.destroy();
          resolve({ ok: true, status: res.statusCode, latency, body: '', redirect: res.headers.location });
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 400) {
          res.destroy();
          resolve({ ok: false, status: res.statusCode, latency, body: '' });
          return;
        }

        // Collect up to 8KB
        let body = '';
        let bytes = 0;
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
          bytes += chunk.length;
          if (bytes > 8192) res.destroy();
        });
        res.on('end', () => resolve({ ok: true, status: res.statusCode, latency, body }));
        res.on('error', () => resolve({ ok: true, status: res.statusCode, latency, body }));

        setTimeout(() => { res.destroy(); resolve({ ok: true, status: res.statusCode, latency, body }); }, 4000);
      });

      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, latency: Date.now() - start, body: '', error: 'timeout' }); });
      req.on('error', (err) => { resolve({ ok: false, status: 0, latency: Date.now() - start, body: '', error: err.code }); });
    } catch (e) {
      resolve({ ok: false, status: 0, latency: 0, body: '', error: e.message });
    }
  });
}

// ─── HLS manifest check ─────────────────────────────────
async function checkChannel(ch) {
  const url = ch.url;
  const result = { alive: false, latency: 0, hasManifest: false, hasSegment: false, error: null };

  // Step 1: Fetch manifest
  const res = await fetchUrl(url);
  result.latency = res.latency;

  if (!res.ok) {
    result.error = res.error || `status_${res.status}`;
    return result;
  }

  // If redirect, follow it once
  let body = res.body;
  if (res.redirect) {
    const r2 = await fetchUrl(res.redirect);
    result.latency += r2.latency;
    if (!r2.ok) { result.error = 'redirect_failed'; return result; }
    body = r2.body;
  }

  // Step 2: Validate HLS manifest
  const isM3U = body.includes('#EXTM3U') || body.includes('#EXT-X');
  const isMedia = res.status === 200 && body.length > 0;

  if (isM3U) {
    result.hasManifest = true;
    result.alive = true;

    // Step 3 (optional): Check first segment
    if (!FAST_MODE) {
      // Find first .ts or .aac segment URL
      const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length > 0) {
        let segUrl = lines[0].trim();
        // Resolve relative URLs
        if (!segUrl.startsWith('http')) {
          const base = url.substring(0, url.lastIndexOf('/') + 1);
          segUrl = base + segUrl;
        }
        const segRes = await fetchUrl(segUrl, SEGMENT_TIMEOUT);
        result.hasSegment = segRes.ok;
        if (!segRes.ok) {
          // Manifest loads but segment doesn't — still mark alive (manifest-verified)
          result.error = 'segment_fail';
        }
      }
    }
  } else if (isMedia) {
    // Not HLS but returns content (could be direct MP4, MPEG-DASH, etc.)
    result.alive = true;
    result.hasManifest = false;
  } else {
    result.error = 'not_hls';
  }

  return result;
}

// ─── Parallel runner with progress ───────────────────────
async function runChecks(channels) {
  const total = channels.length;
  let checked = 0, alive = 0, dead = 0, manifestOk = 0, segmentOk = 0;
  const results = [];
  const deadList = [];

  console.log(`\nChecking ${total} channels | ${CONCURRENCY} concurrent | ${FAST_MODE ? 'FAST (manifest only)' : 'FULL (manifest + segment)'}`);
  console.log('─'.repeat(70));

  const start = Date.now();

  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = channels.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (ch) => {
      const result = await checkChannel(ch);
      return { ch, result };
    });

    const chunkResults = await Promise.all(promises);

    for (const { ch, result } of chunkResults) {
      checked++;
      if (result.alive) {
        alive++;
        if (result.hasManifest) manifestOk++;
        if (result.hasSegment) segmentOk++;
        results.push({
          id: ch.id,
          name: ch.name,
          url: ch.url,
          logo: ch.logo || undefined,
          country: ch.country || 'International',
          category: ch.category || 'general',
          group: ch.group || undefined,
          quality: ch.quality || undefined,
          latency: result.latency,
          hasManifest: result.hasManifest,
          _source: ch._source,
        });
      } else {
        dead++;
        deadList.push({ id: ch.id, name: ch.name, url: ch.url, error: result.error, _source: ch._source });
      }
    }

    // Progress
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const rate = (checked / ((Date.now() - start) / 1000)).toFixed(0);
    const eta = checked > 0 ? ((total - checked) / (checked / ((Date.now() - start) / 1000))).toFixed(0) : '?';
    process.stdout.write(`\r  [${checked}/${total}] alive=${alive} dead=${dead} | ${rate}/s | ${elapsed}s elapsed | ETA ~${eta}s  `);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n\nDone in ${elapsed}s`);

  return { results, deadList, stats: { total, alive, dead, manifestOk, segmentOk, elapsed } };
}

// ─── Category breakdown ──────────────────────────────────
function printBreakdown(results) {
  const cats = {};
  const countries = {};

  for (const ch of results) {
    const cat = ch.category || 'general';
    cats[cat] = (cats[cat] || 0) + 1;
    const country = ch.country || 'International';
    countries[country] = (countries[country] || 0) + 1;
  }

  console.log('\n── Category Breakdown ──');
  const MIN_TARGET = 20;
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const bar = count >= MIN_TARGET ? '✓' : '⚠';
    console.log(`  ${bar} ${cat.padEnd(20)} ${String(count).padStart(5)} channels`);
  }

  console.log('\n── Top 15 Countries ──');
  const countrySorted = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [country, count] of countrySorted) {
    console.log(`    ${country.padEnd(20)} ${String(count).padStart(5)}`);
  }

  console.log('\n── Source Breakdown ──');
  const sources = {};
  for (const ch of results) {
    sources[ch._source] = (sources[ch._source] || 0) + 1;
  }
  for (const [src, count] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${src.padEnd(20)} ${String(count).padStart(5)}`);
  }
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   TIVI+ Channel Health Checker v2    ║');
  console.log('╚══════════════════════════════════════╝');

  // Load
  let channels = loadAllChannels();
  console.log(`\nLoaded ${channels.length} unique channels from all sources`);

  // Apply category filter
  if (CATEGORY_FILTER) {
    channels = channels.filter(ch => (ch.category || '').toLowerCase() === CATEGORY_FILTER.toLowerCase());
    console.log(`Filtered to ${channels.length} channels in category: ${CATEGORY_FILTER}`);
  }

  if (channels.length === 0) {
    console.log('No channels to check. Exiting.');
    return;
  }

  // Run
  const { results, deadList, stats } = await runChecks(channels);

  // Sort by latency (fastest first)
  results.sort((a, b) => a.latency - b.latency);

  // Print stats
  console.log('\n══════════════════════════════════════');
  console.log('          HEALTH CHECK RESULTS');
  console.log('══════════════════════════════════════');
  console.log(`  Total checked:    ${stats.total}`);
  console.log(`  Alive:            ${stats.alive} (${(stats.alive / stats.total * 100).toFixed(1)}%)`);
  console.log(`  Dead:             ${stats.dead}`);
  console.log(`  HLS manifest OK:  ${stats.manifestOk}`);
  if (!FAST_MODE) console.log(`  Segment OK:       ${stats.segmentOk}`);
  console.log(`  Time:             ${stats.elapsed}s`);

  printBreakdown(results);

  // Write output
  // Strip internal _source field for production output
  const cleanResults = results.map(({ _source, ...rest }) => rest);
  const outPath = path.join(DATA_DIR, 'health_verified.json');
  fs.writeFileSync(outPath, JSON.stringify(cleanResults, null, 2));
  console.log(`\n✓ Alive channels written to: ${outPath}`);

  const deadPath = path.join(__dirname, 'dead_channels.json');
  fs.writeFileSync(deadPath, JSON.stringify(deadList, null, 2));
  console.log(`✓ Dead channels written to:  ${deadPath}`);

  // Quick latency summary
  if (results.length > 0) {
    const lats = results.map(r => r.latency);
    const avg = (lats.reduce((a, b) => a + b, 0) / lats.length).toFixed(0);
    const p50 = lats[Math.floor(lats.length * 0.5)];
    const p95 = lats[Math.floor(lats.length * 0.95)];
    console.log(`\n── Latency ──`);
    console.log(`  Avg: ${avg}ms | P50: ${p50}ms | P95: ${p95}ms`);
    console.log(`  Fastest: ${lats[0]}ms (${results[0].name})`);
    console.log(`  Slowest: ${lats[lats.length - 1]}ms (${results[results.length - 1].name})`);
  }
}

main().catch(console.error);
