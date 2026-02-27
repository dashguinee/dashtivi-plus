#!/usr/bin/env node
/**
 * IPTV Source Fetcher & Merger
 *
 * Fetches channels from top open-source M3U playlists,
 * parses, deduplicates against existing data, health-checks,
 * and outputs new_sources.json.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ── Configuration ──────────────────────────────────────────────

const SOURCES = [
  {
    name: 'freetv',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
  },
  {
    name: 'pluto',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/plutotv_us.m3u',
  },
  {
    name: 'samsung',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/samsungtvplus_us.m3u',
  },
  {
    name: 'plex',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/plex_us.m3u',
  },
  {
    name: 'tubi',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u',
  },
  {
    name: 'roku',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/roku_all.m3u',
  },
  {
    name: 'stirr',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/stirr_us.m3u',
  },
];

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'new_sources.json');

const EXISTING_FILES = [
  path.join(DATA_DIR, 'verified_streams.json'),
  path.join(DATA_DIR, 'iptv_channels.json'),
  path.join(DATA_DIR, 'africa_channels.json'),
];

const KNOWN_GOOD_DOMAINS = [
  'pluto.tv', 'plutotv', 'tubi.io', 'tubi.tv', 'tubitv',
  'samsung', 'samsungtvplus', 'plex', 'roku', 'xumo', 'amagi',
  'amagiott', 'distro.tv', 'stirr', 'sling',
];

const FETCH_TIMEOUT = 15000;
const HEALTH_TIMEOUT = 5000;
const MAX_CONCURRENT_HEALTH = 30;

// ── Helpers ────────────────────────────────────────────────────

function fetchUrl(url, timeout = FETCH_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout, headers: { 'User-Agent': 'IPTV-Fetcher/1.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return fetchUrl(redirectUrl, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
    req.on('error', reject);
  });
}

function headCheck(url, timeout = HEALTH_TIMEOUT) {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.request(url, {
      method: 'HEAD',
      timeout,
      headers: { 'User-Agent': 'IPTV-HealthCheck/1.0' },
    }, (res) => {
      res.resume();
      // Follow one redirect for health check
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return headCheck(redirectUrl, timeout).then(resolve);
      }
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function stripQueryParams(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url.split('?')[0];
  }
}

function isKnownGoodDomain(url) {
  const lower = url.toLowerCase();
  return KNOWN_GOOD_DOMAINS.some((d) => lower.includes(d));
}

// ── M3U Parser ─────────────────────────────────────────────────

function parseM3U(text, sourceName) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const channels = [];
  let i = 0;

  while (i < lines.length) {
    if (!lines[i].startsWith('#EXTINF')) {
      i++;
      continue;
    }

    const infoLine = lines[i];
    // Find next non-comment line = URL
    let streamUrl = '';
    let j = i + 1;
    while (j < lines.length) {
      if (!lines[j].startsWith('#')) {
        streamUrl = lines[j];
        break;
      }
      j++;
    }

    if (!streamUrl || (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://'))) {
      i = j + 1;
      continue;
    }

    // Parse EXTINF line
    const tvgId = extractAttr(infoLine, 'tvg-id');
    const tvgName = extractAttr(infoLine, 'tvg-name');
    const tvgLogo = extractAttr(infoLine, 'tvg-logo');
    const groupTitle = extractAttr(infoLine, 'group-title');

    // Name = text after the last comma in EXTINF line
    const commaIdx = infoLine.lastIndexOf(',');
    const name = commaIdx >= 0 ? infoLine.substring(commaIdx + 1).trim() : tvgName || 'Unknown';

    // Quality extraction
    const qualityMatch = name.match(/\b(2160p|1080p|720p|576p|480p|360p|240p|4K|HD|SD|FHD|UHD)\b/i);
    const quality = qualityMatch ? qualityMatch[1] : undefined;

    // Category mapping
    const category = mapCategory(groupTitle);

    // ID generation
    const id = `${sourceName}_${tvgId || channels.length}`;

    channels.push({
      id,
      name: name || tvgName || 'Unknown',
      url: streamUrl,
      logo: tvgLogo || undefined,
      country: mapCountry(groupTitle, sourceName),
      category,
      quality,
      group: groupTitle || undefined,
      source: sourceName,
    });

    i = j + 1;
  }

  return channels;
}

function extractAttr(line, attr) {
  // Match tvg-id="value" or tvg-id='value'
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = line.match(regex);
  if (match) return match[1];
  const regex2 = new RegExp(`${attr}='([^']*)'`, 'i');
  const match2 = line.match(regex2);
  return match2 ? match2[1] : '';
}

function mapCategory(group) {
  if (!group) return 'general';
  const g = group.toLowerCase();
  if (g.includes('news')) return 'news';
  if (g.includes('sport')) return 'sports';
  if (g.includes('kid') || g.includes('cartoon') || g.includes('animation')) return 'kids';
  if (g.includes('music')) return 'music';
  if (g.includes('movie') || g.includes('cinema') || g.includes('film')) return 'movies';
  if (g.includes('documentary') || g.includes('science') || g.includes('nature')) return 'documentary';
  if (g.includes('religious') || g.includes('faith')) return 'religious';
  if (g.includes('entertainment') || g.includes('comedy') || g.includes('drama')) return 'entertainment';
  if (g.includes('lifestyle') || g.includes('food') || g.includes('travel') || g.includes('home')) return 'lifestyle';
  return 'general';
}

function mapCountry(group, source) {
  if (!group) return 'US';
  const g = group.toLowerCase();
  // Try to extract country-like info from group
  if (g.includes('france') || g.includes('french')) return 'France';
  if (g.includes('uk') || g.includes('united kingdom') || g.includes('british')) return 'UK';
  if (g.includes('canada')) return 'Canada';
  if (g.includes('india')) return 'India';
  if (g.includes('spain') || g.includes('spanish')) return 'Spain';
  if (g.includes('germany') || g.includes('german')) return 'Germany';
  if (g.includes('africa')) return 'Africa';
  if (g.includes('arab')) return 'Arab';
  if (g.includes('latin')) return 'Latin America';
  // US-centric sources default to US
  if (['pluto', 'samsung', 'plex', 'tubi', 'roku', 'stirr'].includes(source)) return 'US';
  return 'International';
}

// ── Deduplication ──────────────────────────────────────────────

function loadExistingUrls() {
  const urls = new Set();
  const names = new Set();

  for (const filePath of EXISTING_FILES) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      let data = JSON.parse(raw);

      // africa_channels has a wrapper
      if (data.verified_channels) data = data.verified_channels;
      if (!Array.isArray(data)) continue;

      for (const ch of data) {
        if (ch.url) urls.add(stripQueryParams(ch.url));
        if (ch.name) names.add(ch.name.toLowerCase().trim());
      }
    } catch (err) {
      console.warn(`  Warning: Could not load ${path.basename(filePath)}: ${err.message}`);
    }
  }

  return { urls, names };
}

// ── Concurrent health check ────────────────────────────────────

async function healthCheckBatch(channels, concurrency = MAX_CONCURRENT_HEALTH) {
  const alive = [];
  let checked = 0;
  const total = channels.length;
  let idx = 0;

  async function worker() {
    while (idx < channels.length) {
      const i = idx++;
      const ch = channels[i];

      // Skip health check for known-good domains
      if (isKnownGoodDomain(ch.url)) {
        alive.push(ch);
        checked++;
        continue;
      }

      const ok = await headCheck(ch.url);
      checked++;
      if (ok) alive.push(ch);

      if (checked % 100 === 0) {
        process.stdout.write(`  Health check: ${checked}/${total} (${alive.length} alive)\r`);
      }
    }
  }

  const workers = [];
  for (let w = 0; w < concurrency; w++) workers.push(worker());
  await Promise.all(workers);
  console.log(`  Health check: ${checked}/${total} (${alive.length} alive)   `);

  return alive;
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('==============================================');
  console.log('  IPTV Source Fetcher & Merger');
  console.log('  Sources: 7 | Existing: 3 files');
  console.log('==============================================');
  console.log('');

  // Step 1: Load existing URLs for dedup
  console.log('[1/4] Loading existing channel data...');
  const { urls: existingUrls, names: existingNames } = loadExistingUrls();
  console.log(`  Existing URLs: ${existingUrls.size} | Existing names: ${existingNames.size}`);
  console.log('');

  // Step 2: Fetch & parse all sources
  console.log('[2/4] Fetching M3U sources...');
  const allNew = [];
  const stats = {};

  for (const source of SOURCES) {
    process.stdout.write(`  Fetching ${source.name}...`);
    try {
      const m3u = await fetchUrl(source.url);
      const parsed = parseM3U(m3u, source.name);
      stats[source.name] = { fetched: parsed.length, deduped: 0, alive: 0, added: 0 };
      console.log(` ${parsed.length} channels`);

      // Deduplicate against existing + already-seen new
      const newNamesSeen = new Set();
      let deduped = 0;
      for (const ch of parsed) {
        const strippedUrl = stripQueryParams(ch.url);
        const nameLower = ch.name.toLowerCase().trim();

        if (existingUrls.has(strippedUrl)) { deduped++; continue; }
        if (existingNames.has(nameLower)) { deduped++; continue; }
        if (newNamesSeen.has(nameLower)) { deduped++; continue; }

        // Also check against channels already added from other sources
        const alreadyAdded = allNew.some((c) => stripQueryParams(c.url) === strippedUrl || c.name.toLowerCase().trim() === nameLower);
        if (alreadyAdded) { deduped++; continue; }

        newNamesSeen.add(nameLower);
        existingNames.add(nameLower); // prevent cross-source dupes
        existingUrls.add(strippedUrl);
        allNew.push(ch);
      }

      stats[source.name].deduped = deduped;
      stats[source.name].afterDedup = stats[source.name].fetched - deduped;
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      stats[source.name] = { fetched: 0, deduped: 0, alive: 0, added: 0, error: err.message };
    }
  }
  console.log(`  Total new (after dedup): ${allNew.length}`);
  console.log('');

  // Step 3: Health check new channels
  console.log('[3/4] Health checking new channels...');
  const alive = await healthCheckBatch(allNew);
  console.log('');

  // Update stats
  for (const ch of alive) {
    if (stats[ch.source]) stats[ch.source].alive++;
    if (stats[ch.source]) stats[ch.source].added++;
  }

  // Step 4: Write output
  console.log('[4/4] Writing results...');
  // Clean undefined fields
  const cleaned = alive.map((ch) => {
    const obj = { ...ch };
    Object.keys(obj).forEach((k) => { if (obj[k] === undefined) delete obj[k]; });
    return obj;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
  console.log(`  Written: ${OUTPUT_FILE}`);
  console.log(`  New channels: ${cleaned.length}`);
  console.log('');

  // ── Report ─────────────────────────────────────────────────
  console.log('==============================================');
  console.log('  SOURCE BREAKDOWN');
  console.log('==============================================');
  console.log('');
  console.log(
    'Source'.padEnd(12) +
    'Fetched'.padStart(10) +
    'Dupes'.padStart(10) +
    'New'.padStart(10) +
    'Alive'.padStart(10)
  );
  console.log('-'.repeat(52));

  let totalFetched = 0, totalDeduped = 0, totalAlive = 0;
  for (const [name, s] of Object.entries(stats)) {
    const afterDedup = s.afterDedup || (s.fetched - s.deduped);
    console.log(
      name.padEnd(12) +
      String(s.fetched).padStart(10) +
      String(s.deduped).padStart(10) +
      String(afterDedup).padStart(10) +
      String(s.alive).padStart(10)
    );
    totalFetched += s.fetched;
    totalDeduped += s.deduped;
    totalAlive += s.alive;
  }
  console.log('-'.repeat(52));
  console.log(
    'TOTAL'.padEnd(12) +
    String(totalFetched).padStart(10) +
    String(totalDeduped).padStart(10) +
    String(totalFetched - totalDeduped).padStart(10) +
    String(totalAlive).padStart(10)
  );
  console.log('');
  console.log(`NEW CHANNELS ADDED: ${cleaned.length}`);
  console.log('==============================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
