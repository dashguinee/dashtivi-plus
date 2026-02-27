#!/usr/bin/env node
/**
 * Sports Gold Miner - Fetch sports-specific M3U sources and extract working streams
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'User-Agent': 'Tivi+/1.0' }, timeout: 15000 }, (res) => {
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
    const nameMatch = line.match(/,(.+)$/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    const logoMatch = line.match(/tvg-logo="([^"]+)"/);
    const groupMatch = line.match(/group-title="([^"]+)"/);
    const idMatch = line.match(/tvg-id="([^"]+)"/);
    // Next non-comment line is the URL
    let url = '';
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next || next.startsWith('#')) continue;
      url = next;
      break;
    }
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      channels.push({
        id: idMatch?.[1] || `sport_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
        name,
        url,
        logo: logoMatch?.[1] || null,
        group: groupMatch?.[1] || 'Sports',
        category: 'sports',
      });
    }
  }
  return channels;
}

const SPORTS_SOURCES = [
  { name: 'iptv-org-sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { name: 'free-tv-sports', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_sports.m3u8' },
];

async function main() {
  const allSports = [];
  const seen = new Set();
  
  for (const src of SPORTS_SOURCES) {
    try {
      console.log(`Fetching ${src.name}...`);
      const text = await fetch(src.url);
      const channels = parseM3U(text);
      console.log(`  Found ${channels.length} channels`);
      
      for (const ch of channels) {
        if (seen.has(ch.url.split('?')[0])) continue;
        seen.add(ch.url.split('?')[0]);
        ch.source = src.name;
        allSports.push(ch);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  // Categorize what we found
  const bein = allSports.filter(c => c.name.toLowerCase().includes('bein'));
  const canal = allSports.filter(c => c.name.toLowerCase().includes('canal'));
  const supersport = allSports.filter(c => c.name.toLowerCase().includes('supersport'));
  const football = allSports.filter(c => c.name.toLowerCase().match(/football|soccer|fifa/));
  
  console.log(`\n=== SPORTS GOLD ===`);
  console.log(`Total unique sports: ${allSports.length}`);
  console.log(`BeIN: ${bein.length} | Canal: ${canal.length} | SuperSport: ${supersport.length} | Football: ${football.length}`);
  
  if (bein.length) {
    console.log(`\nBeIN channels:`);
    bein.forEach(c => console.log(`  ${c.name}: ${c.url}`));
  }
  if (canal.length) {
    console.log(`\nCanal channels:`);
    canal.forEach(c => console.log(`  ${c.name}: ${c.url}`));
  }
  if (supersport.length) {
    console.log(`\nSuperSport channels:`);
    supersport.forEach(c => console.log(`  ${c.name}: ${c.url}`));
  }
  
  // Save all sports
  const outPath = path.join(__dirname, '..', 'src', 'data', 'sports_channels.json');
  fs.writeFileSync(outPath, JSON.stringify(allSports, null, 2));
  console.log(`\nSaved ${allSports.length} sports channels to ${outPath}`);
}

main().catch(console.error);
