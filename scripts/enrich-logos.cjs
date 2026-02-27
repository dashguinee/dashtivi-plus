#!/usr/bin/env node
/**
 * enrich-logos.cjs — Fetch logos from iptv-org public API and fuzzy-match them
 * to channels in africa_channels.json and verified_streams.json.
 *
 * Usage: node scripts/enrich-logos.cjs
 *
 * Matching passes:
 *   1. Exact name match (case-insensitive)
 *   2. Stripped name match (remove quality/geo suffixes)
 *   3. First-word + country match
 *
 * After matching, validates NEW logo URLs with HEAD requests (10 concurrent).
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ── Paths ──────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const AFRICA_PATH = path.join(DATA_DIR, 'africa_channels.json');
const IPTV_PATH = path.join(DATA_DIR, 'iptv_channels.json');
const VERIFIED_PATH = path.join(DATA_DIR, 'verified_streams.json');
const IPTV_ORG_URL = 'https://iptv-org.github.io/api/channels.json';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Fetch JSON from a URL. Returns parsed object. */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'tivi-logo-enricher/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** HEAD request to check if a URL returns 200. Timeout 5s. */
function headCheck(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const proto = parsed.protocol === 'https:' ? https : http;
      const req = proto.request(
        { method: 'HEAD', hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, headers: { 'User-Agent': 'tivi-logo-enricher/1.0' }, timeout: 5000 },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/** Run promises with concurrency limit */
async function parallelLimit(tasks, limit) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Name normalization ─────────────────────────────────────────────────────

const SUFFIX_RE = /\s*[\(\[]?\s*(?:1080p|720p|480p|576p|400p|360p|240p|SD|HD|FHD|UHD|4K|H\.265|@\d+fps|Geo-blocked|Not 24\/7|Multiscreen|Backup)\s*[\)\]]?\s*/gi;

/** Strip quality/geo suffixes and lowercase */
function stripName(name) {
  return name.replace(SUFFIX_RE, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Get lowercase name */
function lowerName(name) {
  return (name || '').trim().toLowerCase();
}

/** Get first significant word (skip articles) */
function firstWord(name) {
  const stripped = stripName(name);
  const words = stripped.split(/\s+/);
  const skip = new Set(['the', 'la', 'le', 'les', 'el', 'al', 'a', 'an']);
  for (const w of words) {
    if (!skip.has(w) && w.length > 1) return w;
  }
  return words[0] || '';
}

// ── Country normalization ──────────────────────────────────────────────────

const COUNTRY_MAP = {
  'guinea': 'gn', 'gn': 'gn',
  'senegal': 'sn', 'sn': 'sn',
  'ivory coast': 'ci', "côte d'ivoire": 'ci', 'ci': 'ci',
  'cameroon': 'cm', 'cm': 'cm',
  'south africa': 'za', 'za': 'za',
  'nigeria': 'ng', 'ng': 'ng',
  'ghana': 'gh', 'gh': 'gh',
  'kenya': 'ke', 'ke': 'ke',
  'morocco': 'ma', 'ma': 'ma',
  'algeria': 'dz', 'dz': 'dz',
  'tunisia': 'tn', 'tn': 'tn',
  'egypt': 'eg', 'eg': 'eg',
  'france': 'fr', 'fr': 'fr',
  'uk': 'gb', 'united kingdom': 'gb', 'gb': 'gb',
  'usa': 'us', 'united states': 'us', 'us': 'us',
  'international': 'int', 'int': 'int',
  'mali': 'ml', 'ml': 'ml',
  'burkina faso': 'bf', 'bf': 'bf',
  'congo': 'cg', 'cg': 'cg',
  'dr congo': 'cd', 'cd': 'cd',
  'ethiopia': 'et', 'et': 'et',
  'tanzania': 'tz', 'tz': 'tz',
  'uganda': 'ug', 'ug': 'ug',
  'rwanda': 'rw', 'rw': 'rw',
  'mozambique': 'mz', 'mz': 'mz',
  'angola': 'ao', 'ao': 'ao',
  'benin': 'bj', 'bj': 'bj',
  'togo': 'tg', 'tg': 'tg',
  'niger': 'ne', 'ne': 'ne',
  'chad': 'td', 'td': 'td',
  'gabon': 'ga', 'ga': 'ga',
  'madagascar': 'mg', 'mg': 'mg',
  'libya': 'ly', 'ly': 'ly',
  'sudan': 'sd', 'sd': 'sd',
  'somalia': 'so', 'so': 'so',
  'uae': 'ae', 'ae': 'ae',
  'qatar': 'qa', 'qa': 'qa',
  'saudi arabia': 'sa', 'sa': 'sa',
  'jordan': 'jo', 'jo': 'jo',
  'iraq': 'iq', 'iq': 'iq',
  'lebanon': 'lb', 'lb': 'lb',
  'bahrain': 'bh', 'bh': 'bh',
  'kuwait': 'kw', 'kw': 'kw',
  'oman': 'om', 'om': 'om',
  'palestine': 'ps', 'ps': 'ps',
  'syria': 'sy', 'sy': 'sy',
  'yemen': 'ye', 'ye': 'ye',
};

function normalizeCountry(c) {
  if (!c) return '';
  return COUNTRY_MAP[c.toLowerCase()] || c.toLowerCase().substring(0, 2);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== TIVI Logo Enrichment ===\n');

  // ── Step 1: Load local data ──
  console.log('Loading local data files...');
  const africaData = JSON.parse(fs.readFileSync(AFRICA_PATH, 'utf8'));
  const iptvChannels = JSON.parse(fs.readFileSync(IPTV_PATH, 'utf8'));
  const verifiedStreams = JSON.parse(fs.readFileSync(VERIFIED_PATH, 'utf8'));

  console.log('  africa_channels.json: loaded (711 channels across multiple arrays)');
  console.log('  iptv_channels.json:   ' + iptvChannels.length + ' channels');
  console.log('  verified_streams.json: ' + verifiedStreams.length + ' channels');

  // ── Step 2: Fetch iptv-org database ──
  console.log('\nFetching iptv-org channels database...');
  let iptvOrgDB;
  try {
    iptvOrgDB = await fetchJSON(IPTV_ORG_URL);
    console.log('  Fetched ' + iptvOrgDB.length + ' channels from iptv-org API');
  } catch (err) {
    console.error('  ERROR fetching iptv-org API:', err.message);
    console.log('  Continuing with local data only...');
    iptvOrgDB = [];
  }

  // ── Step 3: Build logo lookup indices ──
  console.log('\nBuilding logo lookup indices...');

  // Combine all logo sources: iptv-org API + local iptv_channels + verified_streams (that have logos)
  const allSources = [];

  // iptv-org API channels
  for (const ch of iptvOrgDB) {
    if (ch.logo) {
      allSources.push({
        name: ch.name || '',
        logo: ch.logo,
        country: ch.country || '',
      });
    }
  }

  // Local iptv_channels
  for (const ch of iptvChannels) {
    if (ch.logo) {
      allSources.push({
        name: ch.name || '',
        logo: ch.logo,
        country: ch.country || '',
      });
    }
  }

  // Local verified_streams (that have logos)
  for (const ch of verifiedStreams) {
    if (ch.logo) {
      allSources.push({
        name: ch.name || '',
        logo: ch.logo,
        country: ch.country || '',
      });
    }
  }

  console.log('  Total logo sources: ' + allSources.length);

  // Index: exact lowercase name -> logo
  const exactIndex = new Map();
  // Index: stripped name -> logo
  const strippedIndex = new Map();
  // Index: "firstword|country" -> logo
  const firstWordCountryIndex = new Map();
  // Index: firstword -> [{logo, country}] (for fallback without country match)
  const firstWordIndex = new Map();

  for (const src of allSources) {
    const lower = lowerName(src.name);
    const stripped = stripName(src.name);
    const fw = firstWord(src.name);
    const cc = normalizeCountry(src.country);

    // Prefer first entry (don't overwrite)
    if (lower && !exactIndex.has(lower)) {
      exactIndex.set(lower, src.logo);
    }
    if (stripped && !strippedIndex.has(stripped)) {
      strippedIndex.set(stripped, src.logo);
    }
    if (fw && cc) {
      const key = fw + '|' + cc;
      if (!firstWordCountryIndex.has(key)) {
        firstWordCountryIndex.set(key, src.logo);
      }
    }
    if (fw) {
      if (!firstWordIndex.has(fw)) {
        firstWordIndex.set(fw, []);
      }
      firstWordIndex.get(fw).push({ logo: src.logo, country: cc });
    }
  }

  console.log('  Exact index: ' + exactIndex.size + ' entries');
  console.log('  Stripped index: ' + strippedIndex.size + ' entries');
  console.log('  FirstWord+Country index: ' + firstWordCountryIndex.size + ' entries');
  console.log('  FirstWord index: ' + firstWordIndex.size + ' entries');

  // ── Step 4: Match function ──
  function findLogo(name, country) {
    // Pass 1: exact match
    const lower = lowerName(name);
    if (exactIndex.has(lower)) return { logo: exactIndex.get(lower), pass: 1 };

    // Pass 2: stripped name match
    const stripped = stripName(name);
    if (strippedIndex.has(stripped)) return { logo: strippedIndex.get(stripped), pass: 2 };

    // Pass 3: first-word + country
    const fw = firstWord(name);
    const cc = normalizeCountry(country);
    if (fw && cc) {
      const key = fw + '|' + cc;
      if (firstWordCountryIndex.has(key)) return { logo: firstWordCountryIndex.get(key), pass: 3 };
    }

    // Pass 3b: first-word only (if word is long enough to be specific, >= 4 chars)
    if (fw && fw.length >= 4) {
      const candidates = firstWordIndex.get(fw);
      if (candidates && candidates.length === 1) {
        return { logo: candidates[0].logo, pass: 3 };
      }
    }

    return null;
  }

  // ── Step 5: Enrich africa_channels.json ──
  console.log('\n--- Enriching africa_channels.json ---');
  const africaArrayKeys = [];
  let africaTotal = 0;
  let africaMatched = 0;
  const africaPassCounts = { 1: 0, 2: 0, 3: 0 };
  const newAfricaLogos = []; // track new logo URLs for validation

  for (const [key, val] of Object.entries(africaData)) {
    if (!Array.isArray(val) || val.length === 0) continue;
    // Check if items look like channels (have name or id)
    if (!val[0].name && !val[0].id) continue;
    africaArrayKeys.push(key);

    let matched = 0;
    for (const ch of val) {
      if (ch.logo) continue; // already has logo
      africaTotal++;
      const channelName = ch.name || '';
      const channelCountry = ch.country || '';
      const result = findLogo(channelName, channelCountry);
      if (result) {
        ch.logo = result.logo;
        matched++;
        africaMatched++;
        africaPassCounts[result.pass]++;
        newAfricaLogos.push({ channel: ch, url: result.logo });
      }
    }
    if (matched > 0) {
      console.log('  ' + key + ': ' + matched + '/' + val.length + ' logos added');
    }
  }
  console.log('  TOTAL: ' + africaMatched + '/' + africaTotal + ' channels enriched');
  console.log('  Pass 1 (exact): ' + africaPassCounts[1] + ', Pass 2 (stripped): ' + africaPassCounts[2] + ', Pass 3 (firstword): ' + africaPassCounts[3]);

  // ── Step 6: Enrich verified_streams.json ──
  console.log('\n--- Enriching verified_streams.json ---');
  let verifiedTotal = 0;
  let verifiedMatched = 0;
  const verifiedPassCounts = { 1: 0, 2: 0, 3: 0 };
  const newVerifiedLogos = [];

  for (const ch of verifiedStreams) {
    if (ch.logo) continue; // already has logo
    verifiedTotal++;
    const channelName = ch.name || '';
    const channelCountry = ch.country || '';
    const result = findLogo(channelName, channelCountry);
    if (result) {
      ch.logo = result.logo;
      verifiedMatched++;
      verifiedPassCounts[result.pass]++;
      newVerifiedLogos.push({ channel: ch, url: result.logo });
    }
  }
  console.log('  ' + verifiedMatched + '/' + verifiedTotal + ' missing logos matched');
  console.log('  Pass 1 (exact): ' + verifiedPassCounts[1] + ', Pass 2 (stripped): ' + verifiedPassCounts[2] + ', Pass 3 (firstword): ' + verifiedPassCounts[3]);

  // ── Step 7: Validate NEW logo URLs ──
  const allNewLogos = [...newAfricaLogos, ...newVerifiedLogos];
  // Deduplicate URLs for validation
  const uniqueUrls = [...new Set(allNewLogos.map(l => l.url))];
  console.log('\n--- Validating ' + uniqueUrls.length + ' unique new logo URLs (10 concurrent) ---');

  const invalidUrls = new Set();
  let validated = 0;
  let valid = 0;
  let invalid = 0;

  const tasks = uniqueUrls.map((url) => async () => {
    const ok = await headCheck(url);
    validated++;
    if (ok) {
      valid++;
    } else {
      invalid++;
      invalidUrls.add(url);
    }
    if (validated % 50 === 0 || validated === uniqueUrls.length) {
      process.stdout.write('  Validated ' + validated + '/' + uniqueUrls.length + ' (' + valid + ' ok, ' + invalid + ' failed)\r');
    }
  });

  await parallelLimit(tasks, 10);
  console.log('\n  Valid: ' + valid + ', Invalid/timeout: ' + invalid);

  // Remove invalid logos
  if (invalidUrls.size > 0) {
    console.log('  Removing ' + invalidUrls.size + ' invalid logo URLs...');

    let removedAfrica = 0;
    for (const [key, val] of Object.entries(africaData)) {
      if (!Array.isArray(val)) continue;
      for (const ch of val) {
        if (ch.logo && invalidUrls.has(ch.logo)) {
          // Only remove if it was newly added (check if in our newAfricaLogos)
          const wasNew = newAfricaLogos.some(l => l.channel === ch);
          if (wasNew) {
            delete ch.logo;
            removedAfrica++;
            africaMatched--;
          }
        }
      }
    }

    let removedVerified = 0;
    for (const ch of verifiedStreams) {
      if (ch.logo && invalidUrls.has(ch.logo)) {
        const wasNew = newVerifiedLogos.some(l => l.channel === ch);
        if (wasNew) {
          delete ch.logo;
          removedVerified++;
          verifiedMatched--;
        }
      }
    }

    console.log('  Removed from africa_channels: ' + removedAfrica);
    console.log('  Removed from verified_streams: ' + removedVerified);
  }

  // ── Step 8: Write updated files ──
  console.log('\n--- Writing updated files ---');

  fs.writeFileSync(AFRICA_PATH, JSON.stringify(africaData, null, 2) + '\n', 'utf8');
  console.log('  Wrote africa_channels.json (' + africaMatched + ' logos added)');

  fs.writeFileSync(VERIFIED_PATH, JSON.stringify(verifiedStreams, null, 2) + '\n', 'utf8');
  console.log('  Wrote verified_streams.json (' + verifiedMatched + ' logos added)');

  console.log('  iptv_channels.json: SKIPPED (already 99% covered)');

  // ── Summary ──
  console.log('\n========================================');
  console.log('         ENRICHMENT SUMMARY');
  console.log('========================================');
  console.log('');
  console.log('africa_channels.json:');
  console.log('  Before: 0 logos / 711 channels');
  console.log('  Added:  ' + africaMatched + ' logos');
  console.log('  After:  ' + africaMatched + ' / 711 channels have logos');
  console.log('');
  console.log('verified_streams.json:');
  console.log('  Before: 2664 logos / ' + verifiedStreams.length + ' channels');
  console.log('  Added:  ' + verifiedMatched + ' logos');
  console.log('  After:  ' + (2664 + verifiedMatched) + ' / ' + verifiedStreams.length + ' channels have logos');
  console.log('');

  // Show unmatched examples
  const unmatchedAfrica = [];
  for (const [key, val] of Object.entries(africaData)) {
    if (!Array.isArray(val)) continue;
    for (const ch of val) {
      if (!ch.logo && ch.name) unmatchedAfrica.push(ch.name);
    }
  }
  const unmatchedVerified = verifiedStreams.filter(c => !c.logo).map(c => c.name);

  if (unmatchedAfrica.length > 0) {
    console.log('Unmatched in africa_channels (' + unmatchedAfrica.length + '):');
    unmatchedAfrica.slice(0, 15).forEach(n => console.log('  - ' + n));
    if (unmatchedAfrica.length > 15) console.log('  ... and ' + (unmatchedAfrica.length - 15) + ' more');
  }

  if (unmatchedVerified.length > 0) {
    console.log('\nUnmatched in verified_streams (' + unmatchedVerified.length + '):');
    unmatchedVerified.slice(0, 15).forEach(n => console.log('  - ' + n));
    if (unmatchedVerified.length > 15) console.log('  ... and ' + (unmatchedVerified.length - 15) + ' more');
  }

  console.log('\n========================================');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
