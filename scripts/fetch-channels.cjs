#!/usr/bin/env node
/**
 * TIVI+ Channel Fetcher
 * Parses iptv-org M3U playlists and extracts quality channels
 * for integration into Tivi+ data layer.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Sources to fetch
const SOURCES = [
  {
    name: 'iptv-org-guinea',
    url: 'https://iptv-org.github.io/iptv/countries/gn.m3u',
    priority: 1,
  },
  {
    name: 'iptv-org-senegal',
    url: 'https://iptv-org.github.io/iptv/countries/sn.m3u',
    priority: 1,
  },
  {
    name: 'iptv-org-ivory-coast',
    url: 'https://iptv-org.github.io/iptv/countries/ci.m3u',
    priority: 1,
  },
  {
    name: 'iptv-org-french',
    url: 'https://iptv-org.github.io/iptv/languages/fra.m3u',
    priority: 2,
  },
  {
    name: 'free-tv-france',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_france.m3u8',
    priority: 2,
  },
  {
    name: 'iptv-org-sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    priority: 3,
  },
  {
    name: 'iptv-org-kids',
    url: 'https://iptv-org.github.io/iptv/categories/kids.m3u',
    priority: 3,
  },
  {
    name: 'iptv-org-news',
    url: 'https://iptv-org.github.io/iptv/categories/news.m3u',
    priority: 3,
  },
  {
    name: 'iptv-org-entertainment',
    url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
    priority: 3,
  },
  {
    name: 'iptv-org-music',
    url: 'https://iptv-org.github.io/iptv/categories/music.m3u',
    priority: 3,
  },
  {
    name: 'iptv-org-documentary',
    url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
    priority: 3,
  },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Tivi+/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseM3U(text) {
  const channels = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF:')) continue;

    // Extract metadata
    const nameMatch = line.match(/,(.+)$/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    const logoMatch = line.match(/tvg-logo="([^"]+)"/);
    const logo = logoMatch ? logoMatch[1] : null;
    const groupMatch = line.match(/group-title="([^"]+)"/);
    const group = groupMatch ? groupMatch[1] : 'General';
    const idMatch = line.match(/tvg-id="([^"]+)"/);
    const tvgId = idMatch ? idMatch[1] : null;

    // Quality from name
    let quality = null;
    if (name.includes('1080p') || name.includes('FHD')) quality = '1080p';
    else if (name.includes('720p') || name.includes('HD')) quality = '720p';
    else if (name.includes('480p') || name.includes('SD')) quality = '480p';
    else if (name.includes('360p')) quality = '360p';

    // Find URL (next non-comment, non-empty line)
    let url = null;
    for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
      const nextLine = lines[j].trim();
      if (nextLine && !nextLine.startsWith('#')) {
        url = nextLine;
        break;
      }
    }

    if (!url) continue;

    // Skip non-HLS streams for browser compatibility
    const isHLS = url.endsWith('.m3u8') || url.includes('.m3u8');
    const isYouTube = url.includes('youtube.com');
    const isDailymotion = url.includes('dailymotion.com');
    const isDASH = url.endsWith('.mpd');

    // Geo-blocked detection
    const isGeoBlocked = name.includes('[Geo-Blocked]') || name.includes('[Geo-blocked]');
    const isNot247 = name.includes('[Not 24/7]');

    // Clean name (remove quality tags and status markers)
    const cleanName = name
      .replace(/\s*\(?\d+p\)?\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .replace(/\s*Ⓓ\s*/g, ' ')
      .replace(/\s*Ⓨ\s*/g, ' ')
      .replace(/\s*Ⓖ\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Country detection from tvg-id
    let country = 'International';
    if (tvgId) {
      const cc = tvgId.split('.').pop()?.split('@')[0];
      const countryMap = {
        gn: 'Guinea', sn: 'Senegal', ci: 'Ivory Coast', cm: 'Cameroon',
        fr: 'France', ml: 'Mali', bf: 'Burkina Faso', cd: 'DR Congo',
        bj: 'Benin', tg: 'Togo', ne: 'Niger', ga: 'Gabon',
        be: 'Belgium', ch: 'Switzerland', ca: 'Canada', ht: 'Haiti',
        dz: 'Algeria', ma: 'Morocco', tn: 'Tunisia', za: 'South Africa',
        ng: 'Nigeria', ke: 'Kenya', cg: 'Congo', us: 'USA',
        uk: 'UK', cn: 'China', lu: 'Luxembourg', tr: 'Turkey',
        it: 'Italy',
      };
      if (cc && countryMap[cc]) country = countryMap[cc];
    }

    // Category mapping
    const categories = group.split(';').map(g => g.trim().toLowerCase());
    let category = 'general';
    if (categories.some(c => c.includes('sport'))) category = 'sports';
    else if (categories.some(c => c.includes('news'))) category = 'news';
    else if (categories.some(c => c.includes('kid') || c.includes('animation'))) category = 'kids';
    else if (categories.some(c => c.includes('music'))) category = 'music';
    else if (categories.some(c => c.includes('entertainment') || c.includes('comedy'))) category = 'entertainment';
    else if (categories.some(c => c.includes('education') || c.includes('documentary'))) category = 'documentary';
    else if (categories.some(c => c.includes('religious'))) category = 'religious';
    else if (categories.some(c => c.includes('business'))) category = 'news';
    else if (categories.some(c => c.includes('culture'))) category = 'entertainment';

    channels.push({
      id: `iptv_${tvgId || cleanName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
      name: cleanName,
      url,
      logo: logo || undefined,
      country,
      category,
      quality: quality || undefined,
      group,
      isHLS,
      isYouTube,
      isDailymotion,
      isDASH,
      isGeoBlocked,
      isNot247,
    });
  }

  return channels;
}

async function main() {
  console.log('TIVI+ Channel Fetcher');
  console.log('====================\n');

  const allChannels = [];
  const seen = new Set();

  for (const source of SOURCES) {
    try {
      console.log(`Fetching: ${source.name}...`);
      const text = await fetch(source.url);
      const channels = parseM3U(text);

      let added = 0;
      for (const ch of channels) {
        // Deduplicate by URL
        if (seen.has(ch.url)) continue;
        seen.add(ch.url);

        // Only keep HLS streams (browser-compatible)
        if (!ch.isHLS) continue;

        // Skip geo-blocked
        if (ch.isGeoBlocked) continue;

        ch._source = source.name;
        ch._priority = source.priority;
        allChannels.push(ch);
        added++;
      }

      console.log(`  -> ${channels.length} parsed, ${added} new HLS channels added`);
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}`);
    }
  }

  // Sort by priority, then name
  allChannels.sort((a, b) => (a._priority - b._priority) || a.name.localeCompare(b.name));

  // Stats
  const stats = {
    total: allChannels.length,
    byCountry: {},
    byCategory: {},
    withLogo: allChannels.filter(c => c.logo).length,
    hd: allChannels.filter(c => c.quality === '1080p' || c.quality === '720p').length,
  };

  for (const ch of allChannels) {
    stats.byCountry[ch.country] = (stats.byCountry[ch.country] || 0) + 1;
    stats.byCategory[ch.category] = (stats.byCategory[ch.category] || 0) + 1;
  }

  console.log('\n=== RESULTS ===');
  console.log(`Total channels: ${stats.total}`);
  console.log(`HD/FHD: ${stats.hd}`);
  console.log(`With logo: ${stats.withLogo}`);
  console.log('\nBy Country:');
  Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log('\nBy Category:');
  Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });

  // Write output
  const output = allChannels.map(ch => ({
    id: ch.id,
    name: ch.name,
    url: ch.url,
    logo: ch.logo,
    country: ch.country,
    category: ch.category,
    quality: ch.quality,
    group: ch.group,
  }));

  const outputPath = path.join(__dirname, '..', 'public', 'iptv_channels.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten to: ${outputPath}`);

  // Also write a compact version for the app data layer
  const compactPath = path.join(__dirname, '..', 'src', 'data', 'iptv_channels.json');
  fs.writeFileSync(compactPath, JSON.stringify(output));
  console.log(`Compact version: ${compactPath}`);
}

main().catch(console.error);
