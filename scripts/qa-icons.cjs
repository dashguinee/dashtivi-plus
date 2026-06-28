#!/usr/bin/env node
/* qa-icons.cjs — faithful per-channel ICON check.
 * Replicates ChannelIcon.tsx resolution: channel.icon -> safeImageUrl ->
 * findLogoUrl(name) via LOGO_MAP -> letter-tile fallback (= FAIL).
 * Then verifies the resolved local /logos path actually exists on disk
 * (remote https/data: are treated as present; http:// proxied = present).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');

// ---- extract LOGO_MAP + TV_LOGO_BASE from ChannelIcon.tsx ----
const tsx = fs.readFileSync(path.join(ROOT, 'src/components/ui/ChannelIcon.tsx'), 'utf8');
const TV_LOGO_BASE = '/logos/tv';
const mapStart = tsx.indexOf('const LOGO_MAP');
const braceStart = tsx.indexOf('{', mapStart);
// find matching close brace
let depth = 0, i = braceStart, end = -1;
for (; i < tsx.length; i++) {
  if (tsx[i] === '{') depth++;
  else if (tsx[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
let mapBody = tsx.slice(braceStart, end + 1);
const LOGO_MAP = eval('(' + mapBody.replace(/\$\{TV_LOGO_BASE\}/g, TV_LOGO_BASE) + ')');

const PROXY = 'https://stream.zionsynapse.online';

function safeImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('/')) return url;
  let u = url.replace(/^ttps:/, 'https:').replace(/"$/, '');
  u = u.replace('buxjam.com:8080', 'fastshare1.com:8080').replace('starshare.live:8080', 'fastshare1.com:8080').replace('datahub11.com:8080', 'fastshare1.com:8080').replace('datahub11.com:80', 'fastshare1.com:8080');
  if (['webhop.live','imdb.com','wikia.nocookie.net','paste.pics','tensports.com.pk','stariptv.fun','starapk1.com','stackpathcdn.com','QuranTVSA','upload.wikimedia.org','ibb.co'].some(x => u.includes(x))) return null;
  if (u.startsWith('https://')) return u;
  if (u.startsWith('http://')) return `${PROXY}/?url=${encodeURIComponent(u)}`;
  return null;
}

function findLogoUrl(channelName) {
  const norm = channelName
    .replace(/^(UK\s*[\|:]+\s*|UHD\s*▎\s*|\|[A-Z]+\|\s*|FR\s*\([^)]*\)\s*)/i, '')
    .replace(/\s*[\[(][^\])]*[\])]\s*$/g, '')
    .replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  if (LOGO_MAP[norm]) return LOGO_MAP[norm];
  for (const [key, url] of Object.entries(LOGO_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return url;
  }
  return null;
}

// resolve like ChannelIcon: src first, then name fallback
function resolveIcon(ch) {
  let safe = safeImageUrl(ch.icon);
  let via = 'icon';
  if (!safe) { safe = findLogoUrl(ch.name); via = 'name-map'; }
  return { src: safe, via };
}

function localExists(p) {
  // p like /logos/tv/...  -> public/logos/...
  const rel = p.replace(/^\//, '');
  return fs.existsSync(path.join(PUB, rel));
}

function checkChannel(ch) {
  const { src, via } = resolveIcon(ch);
  if (!src) return { status: 'LETTER_TILE', src: null, via: 'none' };
  if (src.startsWith('data:')) return { status: 'OK', src: 'data-uri', via };
  if (src.startsWith('/')) {
    return { status: localExists(src) ? 'OK' : 'BROKEN_LOCAL', src, via };
  }
  // remote http(s)/proxy — flagged for optional network check
  return { status: 'REMOTE', src, via };
}

// ---- load both catalogs ----
function loadCatalog(file) {
  return JSON.parse(fs.readFileSync(path.join(PUB, file), 'utf8'));
}

const out = { collections: {}, fixList: [] };
const tivi = loadCatalog('tivi-curated.json');

// group tivi channels by experience
const groups = {};
for (const c of tivi.channels) {
  const e = c.experience || '?';
  (groups[e] = groups[e] || []).push(c);
}

for (const [exp, chans] of Object.entries(groups)) {
  const col = { total: chans.length, ok: 0, letter: [], broken: [], remote: [] };
  for (const c of chans) {
    const r = checkChannel(c);
    if (r.status === 'OK') col.ok++;
    else if (r.status === 'LETTER_TILE') { col.letter.push(c.name); out.fixList.push({ exp, name: c.name, id: c.id, ext_id: c.ext_id, issue: 'letter-tile (no logo)' }); }
    else if (r.status === 'BROKEN_LOCAL') { col.broken.push(`${c.name} -> ${r.src}`); out.fixList.push({ exp, name: c.name, id: c.id, ext_id: c.ext_id, issue: 'broken local logo: ' + r.src }); }
    else if (r.status === 'REMOTE') { col.remote.push(`${c.name} -> ${r.src}`); }
  }
  out.collections[exp] = col;
}

// print report
console.log('=== ICON QA (tivi-curated.json) ===\n');
let gTotal = 0, gOk = 0, gLetter = 0, gBroken = 0, gRemote = 0;
for (const [exp, col] of Object.entries(out.collections)) {
  gTotal += col.total; gOk += col.ok; gLetter += col.letter.length; gBroken += col.broken.length; gRemote += col.remote.length;
  const clean = (col.letter.length === 0 && col.broken.length === 0);
  console.log(`## ${exp}: ${col.total} channels — ${clean ? 'CLEAN' : 'NEEDS-FIX'}`);
  console.log(`   ok=${col.ok} letter-tile=${col.letter.length} broken-local=${col.broken.length} remote=${col.remote.length}`);
  if (col.letter.length) console.log('   LETTER-TILE: ' + col.letter.join(' | '));
  if (col.broken.length) console.log('   BROKEN: ' + col.broken.join(' | '));
  if (col.remote.length) console.log('   REMOTE(needs net check): ' + col.remote.join(' | '));
  console.log('');
}
console.log(`TOTALS: ${gTotal} channels | ok=${gOk} letter-tile=${gLetter} broken-local=${gBroken} remote=${gRemote}`);
fs.writeFileSync(path.join(ROOT, 'outputs/channel-qa/icon-report.json'), JSON.stringify(out, null, 2));
console.log('\nwrote outputs/channel-qa/icon-report.json');
