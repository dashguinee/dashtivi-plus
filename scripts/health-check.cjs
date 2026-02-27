#!/usr/bin/env node
/**
 * TIVI+ Channel Health Checker
 * Tests every FREE channel URL for accessibility.
 * Parallel with 100 concurrent connections, 8s timeout.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CONCURRENCY = 100;
const TIMEOUT = 8000;
const OG_DATA = '/home/dash/zion-github/dash-webtv/data/';

// ============ EXTRACT FREE CONTENT ============
function loadFreeContent() {
  console.log('Loading OG data...');

  const live = require(OG_DATA + 'live.json');
  const movies = require(OG_DATA + 'movies.json');

  // Free live channels with URLs
  const freeLive = live.filter(c => {
    const cat = c.category_name || '';
    return cat.startsWith('FREE:') && c.url;
  });

  // Free movies
  const freeMovies = movies.filter(c => {
    const cat = c.category_name || '';
    return cat.startsWith('FREE:');
  });

  console.log(`Free live channels with URLs: ${freeLive.length}`);
  console.log(`Free movies: ${freeMovies.length}`);

  return { freeLive, freeMovies };
}

// ============ URL TESTER ============
function testUrl(url, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    try {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Range': 'bytes=0-1024'  // Only fetch first KB
        },
        rejectUnauthorized: false
      }, (res) => {
        const latency = Date.now() - startTime;
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          req.destroy();
          res.destroy();
          // Don't follow more than 1 redirect
          resolve({ alive: true, status: res.statusCode, latency, redirect: true });
          return;
        }

        const alive = res.statusCode >= 200 && res.statusCode < 400;
        // Read a tiny bit to confirm data flows
        let gotData = false;
        res.on('data', () => {
          gotData = true;
          res.destroy();
        });
        res.on('end', () => resolve({ alive: alive && gotData, status: res.statusCode, latency, gotData }));
        res.on('error', () => resolve({ alive: false, status: res.statusCode, latency }));

        // If no data after 3s, count as alive if status was good
        setTimeout(() => {
          res.destroy();
          resolve({ alive, status: res.statusCode, latency });
        }, 3000);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ alive: false, status: 0, latency: Date.now() - startTime, error: 'timeout' });
      });

      req.on('error', (err) => {
        resolve({ alive: false, status: 0, latency: Date.now() - startTime, error: err.code || err.message });
      });
    } catch (e) {
      resolve({ alive: false, status: 0, latency: 0, error: e.message });
    }
  });
}

// ============ PARALLEL RUNNER ============
async function checkBatch(items, getUrl, label) {
  const total = items.length;
  let checked = 0;
  let alive = 0;
  let dead = 0;
  const results = [];

  console.log(`\n=== Checking ${total} ${label} (${CONCURRENCY} concurrent, ${TIMEOUT}ms timeout) ===`);
  const startTime = Date.now();

  // Process in chunks
  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (item) => {
      const url = getUrl(item);
      if (!url) return { item, result: { alive: false, error: 'no_url' } };
      const result = await testUrl(url);
      return { item, result };
    });

    const chunkResults = await Promise.all(promises);

    for (const { item, result } of chunkResults) {
      checked++;
      if (result.alive) {
        alive++;
        results.push(item);
      } else {
        dead++;
      }
    }

    // Progress every 500
    if (checked % 500 < CONCURRENCY || i + CONCURRENCY >= total) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (checked / ((Date.now() - startTime) / 1000)).toFixed(0);
      const eta = (((total - checked) / rate)).toFixed(0);
      process.stdout.write(`\r  [${checked}/${total}] alive=${alive} dead=${dead} | ${rate}/s | ETA: ${eta}s  `);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Done in ${elapsed}s — ${alive} alive, ${dead} dead (${(alive/total*100).toFixed(1)}% survival)`);

  return results;
}

// ============ MAIN ============
async function main() {
  console.log('TIVI+ Health Checker');
  console.log('====================\n');

  const { freeLive, freeMovies } = loadFreeContent();

  // 1. Check live channels
  const aliveLive = await checkBatch(
    freeLive,
    (c) => c.url,
    'FREE live channels'
  );

  // Write live results immediately (so we have partial results if movies takes long)
  const liveOutput = aliveLive.map(c => ({
    id: `free_${c.stream_id || c.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
    name: c.name,
    url: c.url,
    logo: (c.stream_icon && c.stream_icon.startsWith('http') && !c.stream_icon.includes('tmdb')) ? c.stream_icon : undefined,
    country: extractCountry(c.category_name),
    category: extractCategory(c.category_name),
    group: c.category_name,
    quality: detectQuality(c.name),
    source: c.source || 'og-free',
    stream_type: c.stream_type || 'hls',
  }));

  const livePath = path.join(__dirname, '..', 'src', 'data', 'free_live.json');
  fs.writeFileSync(livePath, JSON.stringify(liveOutput, null, 2));
  console.log(`\nLive channels written: ${livePath} (${aliveLive.length} channels)`);

  // 2. Check a SAMPLE of movies (checking 28K would take too long)
  // Instead, check the host and a sample of 200
  console.log('\n=== Movie host check ===');
  const movieSample = freeMovies.filter(m => m.stream_id).slice(0, 200);

  // Movies use zplaypro.lat - check if the host works
  // Movie URLs are constructed: need to check the pattern
  // For now, check movies that have direct container_extension
  const movieUrlBase = 'https://zplaypro.lat';
  const hostCheck = await testUrl(movieUrlBase);
  console.log(`  zplaypro.lat reachable: ${hostCheck.alive} (status: ${hostCheck.status})`);

  // Movies are VOD - they use stream_id + container_extension
  // URL pattern: zplaypro.lat/movie/{user}/{pass}/{stream_id}.{ext}
  // Without credentials, we can't access these directly
  // BUT the FREE ones might have direct URLs too
  const moviesWithDirectUrl = freeMovies.filter(m => m.url && m.url.startsWith('http'));
  console.log(`  Free movies with direct URLs: ${moviesWithDirectUrl.length}`);

  if (moviesWithDirectUrl.length > 0) {
    const aliveMovies = await checkBatch(
      moviesWithDirectUrl.slice(0, 500), // Check first 500
      (m) => m.url,
      'FREE movies (sample 500)'
    );

    const movieOutput = aliveMovies.map(m => ({
      id: `movie_${m.stream_id || m.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      name: m.name,
      url: m.url,
      poster: m.stream_icon || undefined,
      year: m.year || undefined,
      rating: m.rating || undefined,
      category: m.category_name || 'Movies',
      extension: m.container_extension || 'mp4',
    }));

    const moviePath = path.join(__dirname, '..', 'src', 'data', 'free_movies.json');
    fs.writeFileSync(moviePath, JSON.stringify(movieOutput, null, 2));
    console.log(`\nMovies written: ${moviePath} (${aliveMovies.length} movies from sample)`);
  }

  // ============ SUMMARY ============
  console.log('\n========================================');
  console.log('HEALTH CHECK COMPLETE');
  console.log('========================================');
  console.log(`Live channels: ${aliveLive.length} alive of ${freeLive.length} checked`);
  console.log(`Output: src/data/free_live.json`);
  console.log('');
  console.log('Next: integrate free_live.json into channels.ts');
}

// ============ HELPERS ============
function extractCountry(categoryName) {
  if (!categoryName) return 'International';
  const c = categoryName.replace('FREE: ', '').replace('FREE:', '');

  const countryMap = {
    'France': 'France', 'UK': 'UK', 'USA': 'USA', 'US_LOCAL': 'USA',
    'Germany': 'Germany', 'Italy': 'Italy', 'Spain': 'Spain', 'Turkey': 'Turkey',
    'Russia': 'Russia', 'Canada': 'Canada', 'Australia': 'Australia',
    'Japan': 'Japan', 'Korea': 'South Korea', 'China': 'China', 'India': 'India',
    'Brazil': 'Brazil', 'Mexico': 'Mexico', 'Argentina': 'Argentina',
    'Netherlands': 'Netherlands', 'Belgium': 'Belgium', 'Portugal': 'Portugal',
    'Sweden': 'Sweden', 'Denmark': 'Denmark', 'Norway': 'Norway', 'Finland': 'Finland',
    'Greece': 'Greece', 'Poland': 'Poland', 'Czech Republic': 'Czech Republic',
    'Hungary': 'Hungary', 'Romania': 'Romania', 'Croatia': 'Croatia',
    'Ireland': 'Ireland', 'Switzerland': 'Switzerland', 'Austria': 'Austria',
    'Egypt': 'Egypt', 'Iraq': 'Iraq', 'Qatar': 'Qatar',
    'United Arab Emirates': 'UAE', 'Israel': 'Israel', 'Iran': 'Iran',
    'Ukraine': 'Ukraine', 'Azerbaijan': 'Azerbaijan', 'Georgia': 'Georgia',
    'Somalia': 'Somalia', 'Chad': 'Chad',
  };

  for (const [key, val] of Object.entries(countryMap)) {
    if (c.includes(key)) return val;
  }
  return 'International';
}

function extractCategory(categoryName) {
  if (!categoryName) return 'general';
  const c = categoryName.toLowerCase();
  if (c.includes('sport')) return 'sports';
  if (c.includes('news')) return 'news';
  if (c.includes('kid') || c.includes('animation')) return 'kids';
  if (c.includes('music')) return 'music';
  if (c.includes('movie') || c.includes('vod')) return 'movies';
  if (c.includes('documentary') || c.includes('education')) return 'documentary';
  if (c.includes('religious')) return 'religious';
  if (c.includes('entertainment') || c.includes('comedy')) return 'entertainment';
  if (c.includes('series')) return 'series';
  if (c.includes('travel') || c.includes('lifestyle')) return 'lifestyle';
  return 'general';
}

function detectQuality(name) {
  if (!name) return undefined;
  if (name.includes('4K') || name.includes('UHD')) return '4K';
  if (name.includes('FHD') || name.includes('1080')) return '1080p';
  if (name.includes('HD') || name.includes('720')) return '720p';
  if (name.includes('SD') || name.includes('480')) return '480p';
  return undefined;
}

main().catch(console.error);
