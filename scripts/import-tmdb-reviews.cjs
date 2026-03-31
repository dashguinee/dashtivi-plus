#!/usr/bin/env node
/**
 * TMDB Review Importer for DASH Platform
 *
 * Fetches reviews from TMDB API for movies/series in our tmdb-data.json catalog,
 * and stores them in Supabase `comments` table with a special system author.
 *
 * Architecture:
 *   tmdb-data.json → TMDB Reviews API → filter/transform → Supabase comments table
 *
 * The comments table has a polymorphic target system (target_type + target_id).
 * Since TMDB reviews reference content that lives in DashTivi+ (not in feed_items
 * or posts), we use a new target_type: 'tivi_content' with target_id being a
 * deterministic UUID derived from the stream key (e.g., "m:12345").
 *
 * This allows querying reviews by content_ref on the TiVi+ side, and optionally
 * linking to feed_items if we create feed entries for movies later.
 *
 * Prerequisites:
 *   - TMDB_API_KEY environment variable
 *   - SUPABASE_SERVICE_KEY in /home/dash/zion-interface/.env
 *   - A system user in the `users` table for imported reviews (created automatically)
 *
 * Usage:
 *   TMDB_API_KEY=your_key node import-tmdb-reviews.cjs
 *   TMDB_API_KEY=your_key node import-tmdb-reviews.cjs --limit 100
 *   TMDB_API_KEY=your_key node import-tmdb-reviews.cjs --dry-run
 *   TMDB_API_KEY=your_key node import-tmdb-reviews.cjs --min-rating 6.0
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════

const CONFIG = {
  // TMDB API
  tmdbApiKey: process.env.TMDB_API_KEY,
  tmdbBaseUrl: 'https://api.themoviedb.org/3',

  // Supabase
  supabaseUrl: 'https://mclbbkmpovnvcfmwsoqt.supabase.co',
  supabaseServiceKey: null, // loaded from .env

  // Data paths
  tmdbDataPath: path.join(__dirname, '..', 'public', 'tmdb-data.json'),
  progressPath: path.join(__dirname, 'tmdb-reviews-progress.json'),
  statsPath: path.join(__dirname, 'tmdb-reviews-stats.json'),

  // Import settings
  maxReviewsPerContent: 5,       // Max reviews to import per movie/series
  maxReviewLength: 500,          // Truncate reviews longer than this
  minReviewLength: 30,           // Skip very short reviews
  rateLimit: 10,                 // Requests per second (TMDB allows 40, be conservative)
  rateLimitWindow: 1000,         // Rate limit window in ms
  progressSaveInterval: 500,     // Save progress every N items processed
  logInterval: 100,              // Log progress every N items
  minTmdbRating: 5.0,           // Only fetch reviews for movies rated >= this

  // System author for imported reviews
  systemAuthorId: 'TMDB_IMPORT', // Special author_id for imported content
  systemAuthorName: 'TMDB Community',

  // Allowed review languages
  allowedLanguages: ['en', 'fr'],
};

// ═══════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════

const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  limit: null,
  offset: 0,
  minRating: CONFIG.minTmdbRating,
  moviesOnly: args.includes('--movies-only'),
  seriesOnly: args.includes('--series-only'),
  resume: !args.includes('--no-resume'),
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) flags.limit = parseInt(args[i + 1]);
  if (args[i] === '--offset' && args[i + 1]) flags.offset = parseInt(args[i + 1]);
  if (args[i] === '--min-rating' && args[i + 1]) flags.minRating = parseFloat(args[i + 1]);
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════

/**
 * Generate a deterministic UUID v5 from a content key like "m:12345".
 * This ensures the same content always maps to the same UUID target_id.
 */
function contentKeyToUuid(contentKey) {
  // Use a fixed namespace UUID for DashTivi content
  const namespace = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  // SHA-1 hash of namespace + content key
  const hash = crypto.createHash('sha1')
    .update(namespace + contentKey)
    .digest('hex');
  // Format as UUID v5
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16), // version 5
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20), // variant
    hash.slice(20, 32),
  ].join('-');
}

/**
 * Generate a deterministic UUID for a specific TMDB review.
 * Prevents duplicate imports even if the script is run multiple times.
 */
function reviewToUuid(tmdbReviewId) {
  const hash = crypto.createHash('sha1')
    .update('tmdb-review:' + tmdbReviewId)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
}

/**
 * HTTPS GET with promise wrapper.
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

/**
 * HTTPS POST/PATCH with promise wrapper (for Supabase).
 */
function httpRequest(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Rate limiter — ensures we don't exceed N requests per second.
 */
class RateLimiter {
  constructor(maxPerSecond) {
    this.interval = 1000 / maxPerSecond;
    this.lastRequest = 0;
  }

  async wait() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.interval) {
      await new Promise(r => setTimeout(r, this.interval - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

/**
 * Truncate text to maxLength, breaking at word boundary.
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

/**
 * Clean review content — strip excessive formatting, normalize whitespace.
 */
function cleanReviewContent(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')              // Strip HTML tags
    .replace(/\*\*|__/g, '')              // Strip markdown bold
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to text
    .replace(/\n{3,}/g, '\n\n')           // Max 2 newlines
    .replace(/\s{2,}/g, ' ')             // Normalize spaces
    .trim();
}

// ═══════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════

class SupabaseClient {
  constructor(url, serviceKey) {
    this.url = url;
    this.serviceKey = serviceKey;
    this.headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  async ensureSystemUser() {
    // Check if system user exists
    const checkUrl = `${this.url}/rest/v1/users?core_id=eq.${CONFIG.systemAuthorId}&select=core_id`;
    const check = await httpRequest('GET', checkUrl, null, this.headers);

    if (check.data && check.data.length > 0) {
      console.log(`  System user "${CONFIG.systemAuthorId}" already exists.`);
      return true;
    }

    // Create system user for TMDB imports
    const createUrl = `${this.url}/rest/v1/users`;
    const result = await httpRequest('POST', createUrl, {
      core_id: CONFIG.systemAuthorId,
      full_name: CONFIG.systemAuthorName,
    }, this.headers);

    if (result.status >= 200 && result.status < 300) {
      console.log(`  Created system user "${CONFIG.systemAuthorId}".`);
      return true;
    } else {
      console.error(`  Failed to create system user:`, result.data);
      return false;
    }
  }

  async getExistingReviewIds() {
    // Fetch all comment IDs where the author is our system user
    // This allows us to skip already-imported reviews
    const url = `${this.url}/rest/v1/comments?author_id=eq.${CONFIG.systemAuthorId}&select=id&limit=50000`;
    const result = await httpRequest('GET', url, null, this.headers);
    if (result.data && Array.isArray(result.data)) {
      return new Set(result.data.map(r => r.id));
    }
    return new Set();
  }

  async getExistingTargetIds() {
    // Get all unique target_ids that already have TMDB reviews
    // This lets us skip content that's already been imported
    const url = `${this.url}/rest/v1/comments?author_id=eq.${CONFIG.systemAuthorId}&select=target_id&limit=50000`;
    const result = await httpRequest('GET', url, null, this.headers);
    if (result.data && Array.isArray(result.data)) {
      return new Set(result.data.map(r => r.target_id));
    }
    return new Set();
  }

  async insertComments(comments) {
    if (comments.length === 0) return { inserted: 0, errors: [] };

    // Use upsert with the deterministic UUID to prevent duplicates
    const url = `${this.url}/rest/v1/comments`;
    const upsertHeaders = {
      ...this.headers,
      'Prefer': 'return=representation,resolution=merge-duplicates',
    };

    const result = await httpRequest('POST', url, comments, upsertHeaders);

    if (result.status >= 200 && result.status < 300) {
      const inserted = Array.isArray(result.data) ? result.data.length : 0;
      return { inserted, errors: [] };
    } else {
      return { inserted: 0, errors: [result.data] };
    }
  }
}

// ═══════════════════════════════════════════════════
// TMDB API CLIENT
// ═══════════════════════════════════════════════════

class TmdbClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = CONFIG.tmdbBaseUrl;
    this.rateLimiter = new RateLimiter(CONFIG.rateLimit);
  }

  async getReviews(tmdbId, mediaType = 'movie') {
    await this.rateLimiter.wait();

    const type = mediaType === 'series' ? 'tv' : 'movie';
    const url = `${this.baseUrl}/${type}/${tmdbId}/reviews?api_key=${this.apiKey}&language=en-US&page=1`;

    try {
      const response = await httpGet(url);
      if (response.status === 200 && response.data.results) {
        return response.data.results;
      }
      if (response.status === 429) {
        // Rate limited — wait and retry once
        console.warn(`  Rate limited on TMDB ID ${tmdbId}, waiting 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        return this.getReviews(tmdbId, mediaType);
      }
      return [];
    } catch (err) {
      if (err.message !== 'Request timeout') {
        console.warn(`  TMDB fetch error for ${type}/${tmdbId}: ${err.message}`);
      }
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════
// PROGRESS TRACKER
// ═══════════════════════════════════════════════════

class ProgressTracker {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { processedKeys: [], lastKey: null, stats: {} };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        console.log(`  Resumed progress: ${this.data.processedKeys.length} items already processed.`);
      }
    } catch {
      this.data = { processedKeys: [], lastKey: null, stats: {} };
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  isProcessed(key) {
    return this.data.processedKeys.includes(key);
  }

  markProcessed(key) {
    if (!this.data.processedKeys.includes(key)) {
      this.data.processedKeys.push(key);
    }
    this.data.lastKey = key;
  }

  updateStats(stats) {
    this.data.stats = { ...this.data.stats, ...stats };
  }

  getProcessedCount() {
    return this.data.processedKeys.length;
  }
}

// ═══════════════════════════════════════════════════
// REVIEW TRANSFORMER
// ═══════════════════════════════════════════════════

/**
 * Transform a TMDB review into a Supabase comment row.
 */
function transformReview(review, contentKey, contentName) {
  const cleaned = cleanReviewContent(review.content);
  if (cleaned.length < CONFIG.minReviewLength) return null;

  // Check language
  const lang = (review.iso_639_1 || 'en').toLowerCase();
  if (!CONFIG.allowedLanguages.includes(lang)) return null;

  const targetId = contentKeyToUuid(contentKey);
  const commentId = reviewToUuid(review.id);

  // Extract rating from author_details if available
  // TMDB reviews have author_details.rating (1-10 scale)
  const tmdbRating = review.author_details?.rating;

  // Build the content with optional rating prefix
  let content = truncateText(cleaned, CONFIG.maxReviewLength);
  if (tmdbRating && tmdbRating > 0) {
    const stars = Math.round(tmdbRating / 2); // Convert 1-10 to 1-5 stars
    const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    content = `${starStr} ${content}`;
  }

  return {
    id: commentId,
    author_id: CONFIG.systemAuthorId,
    target_type: 'tivi_content',
    target_id: targetId,
    content: content,
    parent_id: null,
    reaction_count: 0,
    is_active: true,
    created_at: review.created_at || review.updated_at || new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════
// CONTENT REF MAPPING
// ═══════════════════════════════════════════════════

/**
 * Build a lookup file that maps content keys to their deterministic UUIDs.
 * This is used by both surfaces (Hub feed + TiVi+ detail modal) to query reviews.
 */
function buildContentRefMap(entries) {
  const map = {};
  for (const [key, entry] of entries) {
    map[key] = {
      uuid: contentKeyToUuid(key),
      tmdb_id: entry.i,
      type: key.startsWith('m:') ? 'movie' : 'series',
    };
  }
  return map;
}

// ═══════════════════════════════════════════════════
// MAIN IMPORT PIPELINE
// ═══════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     TMDB Review Importer for DASH Platform   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // ── Validate prerequisites ──────────────────────
  if (!CONFIG.tmdbApiKey) {
    console.error('ERROR: TMDB_API_KEY environment variable is required.');
    console.error('  Get one at: https://www.themoviedb.org/settings/api');
    console.error('  Usage: TMDB_API_KEY=your_key node import-tmdb-reviews.cjs');
    process.exit(1);
  }

  // Load Supabase service key from zion-interface .env
  const envPath = '/home/dash/zion-interface/.env';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SUPABASE_SERVICE_KEY=(.+)/);
    if (match) {
      CONFIG.supabaseServiceKey = match[1].trim();
    }
  }

  if (!CONFIG.supabaseServiceKey) {
    console.error('ERROR: Could not load SUPABASE_SERVICE_KEY from /home/dash/zion-interface/.env');
    process.exit(1);
  }

  // ── Load TMDB data ────────────────────────────────
  console.log('[1/6] Loading TMDB data catalog...');
  const tmdbData = JSON.parse(fs.readFileSync(CONFIG.tmdbDataPath, 'utf8'));
  const allEntries = Object.entries(tmdbData);
  console.log(`  Catalog: ${allEntries.length} entries (${allEntries.filter(([k]) => k.startsWith('m:')).length} movies, ${allEntries.filter(([k]) => k.startsWith('s:')).length} series)`);

  // ── Filter entries ────────────────────────────────
  console.log('[2/6] Filtering entries...');
  let entries = allEntries.filter(([key, entry]) => {
    if (!entry || typeof entry !== 'object' || !entry.i) return false;
    if (flags.moviesOnly && !key.startsWith('m:')) return false;
    if (flags.seriesOnly && !key.startsWith('s:')) return false;
    if (entry.r && entry.r < flags.minRating) return false;
    return true;
  });

  // Sort by TMDB rating descending — import best content first
  entries.sort((a, b) => (b[1].r || 0) - (a[1].r || 0));

  // Apply offset and limit
  if (flags.offset > 0) entries = entries.slice(flags.offset);
  if (flags.limit) entries = entries.slice(0, flags.limit);

  console.log(`  After filtering (min rating ${flags.minRating}): ${entries.length} entries to process`);

  // ── Initialize clients ────────────────────────────
  console.log('[3/6] Initializing connections...');
  const tmdbClient = new TmdbClient(CONFIG.tmdbApiKey);
  const supabase = new SupabaseClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

  if (!flags.dryRun) {
    // Ensure system user exists in users table
    const userOk = await supabase.ensureSystemUser();
    if (!userOk) {
      console.error('ERROR: Could not create/verify system user. Check users table schema.');
      process.exit(1);
    }
  }

  // ── Load progress for incremental import ────────
  const progress = new ProgressTracker(CONFIG.progressPath);
  let existingTargetIds = new Set();

  if (flags.resume && !flags.dryRun) {
    console.log('  Loading existing imports for deduplication...');
    existingTargetIds = await supabase.getExistingTargetIds();
    console.log(`  ${existingTargetIds.size} content items already have reviews in DB.`);
  }

  // ── Process entries ───────────────────────────────
  console.log('[4/6] Fetching reviews from TMDB...');
  console.log(`  Mode: ${flags.dryRun ? 'DRY RUN (no writes)' : 'LIVE IMPORT'}`);
  console.log('');

  const stats = {
    processed: 0,
    skippedAlreadyImported: 0,
    skippedNoReviews: 0,
    skippedProgress: 0,
    reviewsFetched: 0,
    reviewsFiltered: 0,
    reviewsImported: 0,
    errors: 0,
    startTime: Date.now(),
  };

  // Buffer for batch inserts
  let commentBuffer = [];
  const BATCH_SIZE = 50;

  async function flushBuffer() {
    if (commentBuffer.length === 0 || flags.dryRun) return;

    const result = await supabase.insertComments(commentBuffer);
    stats.reviewsImported += result.inserted;
    if (result.errors.length > 0) {
      stats.errors += result.errors.length;
      console.warn(`  Insert errors:`, JSON.stringify(result.errors[0]).slice(0, 200));
    }
    commentBuffer = [];
  }

  for (let i = 0; i < entries.length; i++) {
    const [key, entry] = entries[i];
    stats.processed++;

    // Skip if already in progress file
    if (flags.resume && progress.isProcessed(key)) {
      stats.skippedProgress++;
      continue;
    }

    // Skip if this content already has reviews in DB
    const targetUuid = contentKeyToUuid(key);
    if (existingTargetIds.has(targetUuid)) {
      stats.skippedAlreadyImported++;
      progress.markProcessed(key);
      continue;
    }

    // Fetch reviews from TMDB
    const mediaType = key.startsWith('m:') ? 'movie' : 'series';
    const reviews = await tmdbClient.getReviews(entry.i, mediaType);

    if (!reviews || reviews.length === 0) {
      stats.skippedNoReviews++;
      progress.markProcessed(key);
      continue;
    }

    stats.reviewsFetched += reviews.length;

    // Transform and filter reviews
    const transformed = reviews
      .slice(0, CONFIG.maxReviewsPerContent)
      .map(review => transformReview(review, key))
      .filter(Boolean);

    stats.reviewsFiltered += (reviews.length - transformed.length);

    // Add to buffer
    commentBuffer.push(...transformed);

    // Flush buffer if full
    if (commentBuffer.length >= BATCH_SIZE) {
      await flushBuffer();
    }

    // Mark processed
    progress.markProcessed(key);

    // Save progress periodically
    if (stats.processed % CONFIG.progressSaveInterval === 0) {
      progress.updateStats(stats);
      progress.save();
    }

    // Log progress
    if (stats.processed % CONFIG.logInterval === 0) {
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
      const rate = (stats.processed / (elapsed || 1)).toFixed(1);
      console.log(
        `  [${stats.processed}/${entries.length}] ` +
        `${stats.reviewsFetched} reviews fetched, ` +
        `${flags.dryRun ? commentBuffer.length + ' buffered' : stats.reviewsImported + ' imported'}, ` +
        `${stats.skippedNoReviews} no-reviews, ` +
        `${rate} items/s, ${elapsed}s elapsed`
      );
    }
  }

  // Flush remaining buffer
  await flushBuffer();

  // Final progress save
  progress.updateStats(stats);
  progress.save();

  // ── Build content ref map ─────────────────────────
  console.log('');
  console.log('[5/6] Building content reference map...');
  const refMap = buildContentRefMap(entries.filter(([key]) => {
    return progress.isProcessed(key);
  }));

  const refMapPath = path.join(__dirname, '..', 'src', 'lib', 'tmdb-review-refs.json');
  fs.writeFileSync(refMapPath, JSON.stringify(refMap, null, 2));
  console.log(`  Wrote ${Object.keys(refMap).length} content refs to ${refMapPath}`);

  // ── Summary ───────────────────────────────────────
  const totalElapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log('');
  console.log('[6/6] Import complete!');
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║                 IMPORT SUMMARY                ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Processed:           ${String(stats.processed).padStart(8)} entries     ║`);
  console.log(`║  Already imported:    ${String(stats.skippedAlreadyImported).padStart(8)} (skipped)   ║`);
  console.log(`║  Skipped (progress):  ${String(stats.skippedProgress).padStart(8)} (resumed)   ║`);
  console.log(`║  No reviews on TMDB:  ${String(stats.skippedNoReviews).padStart(8)} (skipped)   ║`);
  console.log(`║  Reviews fetched:     ${String(stats.reviewsFetched).padStart(8)} total       ║`);
  console.log(`║  Reviews filtered:    ${String(stats.reviewsFiltered).padStart(8)} (too short) ║`);
  console.log(`║  Reviews imported:    ${String(stats.reviewsImported).padStart(8)} to Supabase ║`);
  console.log(`║  Errors:              ${String(stats.errors).padStart(8)}             ║`);
  console.log(`║  Duration:            ${String(totalElapsed + 's').padStart(8)}             ║`);
  console.log('╚══════════════════════════════════════════════╝');

  // Save final stats
  fs.writeFileSync(CONFIG.statsPath, JSON.stringify({
    ...stats,
    totalElapsed,
    completedAt: new Date().toISOString(),
  }, null, 2));

  console.log('');

  if (flags.dryRun) {
    console.log('DRY RUN complete. No data was written to Supabase.');
    console.log('Run without --dry-run to import.');
  }
}

// ═══════════════════════════════════════════════════
// ENTRYPOINT
// ═══════════════════════════════════════════════════

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
