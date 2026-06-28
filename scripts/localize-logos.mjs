#!/usr/bin/env node
/**
 * localize-logos.mjs — make EVERY channel logo OURS.
 *
 * Downloads every external channel-logo URL referenced by the catalog data and
 * stores it inside the app (public/logos/), then rewrites the catalog so each
 * channel points at a same-origin "/logos/<id>.<ext>" path. Result: logos are
 * served from our own CDN (Vercel static + the SW durable logo cache), never
 * from flaky third-party hosts. Dead URLs are logged and left empty so the
 * channel falls back cleanly to ChannelIcon's painted lettered tile.
 *
 * Re-runnable & idempotent:
 *   · True originals are backed up ONCE to scripts/logo-backups/ (never overwritten).
 *   · Only http(s) URLs are processed; already-local "/logos/..." values are skipped.
 *   · Files already on disk are not re-downloaded.
 *
 * Sources rewritten:
 *   · public/tivi-curated.json          channels[].icon
 *   · public/free-channels-curated.json [].logo
 *   · public/streamore-locked.json      channels[].logo
 *   · public/streamore-gems.json        gems[].logo
 *   · public/logo-map.json              { "<stream_id>": "<url>" }
 *   · src/components/ui/ChannelIcon.tsx  TV_LOGO_BASE  → "/logos/tv" (mirrored dir)
 *
 * NO commit / NO deploy / NO version bump — that's ZION's job after verify.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUB = join(ROOT, 'public');
const LOGOS = join(PUB, 'logos');
const LOGOS_TV = join(LOGOS, 'tv');
const BACKUPS = join(__dirname, 'logo-backups');
const CHANNEL_ICON = join(ROOT, 'src', 'components', 'ui', 'ChannelIcon.tsx');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const TV_GH = 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries';
const CONCURRENCY = 24;
const TIMEOUT_MS = 12000;
const RETRIES = 2;

mkdirSync(LOGOS, { recursive: true });
mkdirSync(LOGOS_TV, { recursive: true });
mkdirSync(BACKUPS, { recursive: true });

const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);

// ── Image sniffing — never save a non-image (HTML error page, etc.) ──────────
function sniffExt(buf, contentType, url) {
  const b = buf;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
      b.slice(8, 12).toString('ascii').match(/avif|avis/i)) return 'avif';
  if (b.length >= 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return 'ico';
  // SVG / XML text
  const head = b.slice(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  if ((contentType || '').includes('svg')) return 'svg';
  return null; // not a recognized image
}

// Map an original URL to its local public path + on-disk file path.
function localFor(url, ext) {
  if (url.startsWith(TV_GH + '/')) {
    const rest = url.slice(TV_GH.length + 1).split('?')[0]; // <country>/<file>.png
    return { web: `/logos/tv/${rest}`, file: join(LOGOS_TV, rest) };
  }
  const id = sha(url);
  return { web: `/logos/${id}.${ext}`, file: join(LOGOS, `${id}.${ext}`) };
}

// For tv-gh URLs the ext is fixed by the path; for hashed ones it's content-derived.
function tvExt(url) {
  const m = url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i);
  return m ? m[1].toLowerCase() : 'png';
}

async function fetchBuf(url) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!r.ok) {
        if (r.status >= 400 && r.status < 500) return { dead: true, reason: `HTTP ${r.status}` };
        continue; // 5xx — retry
      }
      const ct = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 64) return { dead: true, reason: 'too-small' };
      const ext = sniffExt(buf, ct, url);
      if (!ext) return { dead: true, reason: `not-an-image (${ct || 'no-ct'})` };
      return { buf, ext };
    } catch (e) {
      if (attempt === RETRIES) return { dead: true, reason: e.name === 'TimeoutError' ? 'timeout' : (e.message || 'fetch-error') };
    }
  }
  return { dead: true, reason: 'exhausted' };
}

// ── 1. COLLECT every unique external logo URL from the data files ─────────────
const DATA = {
  'tivi-curated.json': null,
  'free-channels-curated.json': null,
  'streamore-locked.json': null,
  'streamore-gems.json': null,
  'logo-map.json': null,
};
for (const f of Object.keys(DATA)) {
  try { DATA[f] = JSON.parse(readFileSync(join(PUB, f), 'utf8')); }
  catch (e) { console.warn('  ! skip', f, e.message); }
  // one-time immutable backup of originals
  const bk = join(BACKUPS, f);
  if (!existsSync(bk) && DATA[f] != null) writeFileSync(bk, readFileSync(join(PUB, f)));
}

const urls = new Set();
const pushUrl = (u) => { if (isHttp(u)) urls.add(u.trim()); };

(DATA['tivi-curated.json']?.channels || []).forEach((c) => pushUrl(c.icon));
(Array.isArray(DATA['free-channels-curated.json']) ? DATA['free-channels-curated.json'] : []).forEach((c) => pushUrl(c.logo));
(DATA['streamore-locked.json']?.channels || []).forEach((c) => pushUrl(c.logo));
(DATA['streamore-gems.json']?.gems || []).forEach((c) => pushUrl(c.logo));
if (DATA['logo-map.json']) Object.values(DATA['logo-map.json']).forEach(pushUrl);

// ChannelIcon tv-logo paths → full github URLs (deterministic, independent of current const)
let iconSrc = readFileSync(CHANNEL_ICON, 'utf8');
const tvPaths = new Set();
for (const m of iconSrc.matchAll(/\$\{TV_LOGO_BASE\}\/([^`]+?\.png)/g)) tvPaths.add(m[1]);
for (const p of tvPaths) urls.add(`${TV_GH}/${p}`);

const list = [...urls];
console.log(`\nUnique external logo URLs to localize: ${list.length}`);
console.log(`  (data files + ${tvPaths.size} tv-logo paths from ChannelIcon)\n`);

// ── 2. DOWNLOAD (dedup by destination file; skip ones already on disk) ────────
const urlToWeb = new Map(); // original url -> "/logos/..." (only successful)
const dead = [];            // { url, reason }
let downloaded = 0, skipped = 0;

async function handle(url) {
  const isTv = url.startsWith(TV_GH + '/');
  // Pre-compute destination for tv (ext known); for hashed we learn ext after fetch.
  if (isTv) {
    const { web, file } = localFor(url, tvExt(url));
    if (existsSync(file) && statSync(file).size > 0) { urlToWeb.set(url, web); skipped++; return; }
    const res = await fetchBuf(url);
    if (res.dead) { dead.push({ url, reason: res.reason }); return; }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, res.buf);
    urlToWeb.set(url, web);
    downloaded++;
    return;
  }
  // hashed: try existing file with any known ext first
  const id = sha(url);
  for (const ext of ['png', 'jpg', 'webp', 'gif', 'svg', 'avif', 'ico']) {
    const f = join(LOGOS, `${id}.${ext}`);
    if (existsSync(f) && statSync(f).size > 0) { urlToWeb.set(url, `/logos/${id}.${ext}`); skipped++; return; }
  }
  const res = await fetchBuf(url);
  if (res.dead) { dead.push({ url, reason: res.reason }); return; }
  const { web, file } = localFor(url, res.ext);
  writeFileSync(file, res.buf);
  urlToWeb.set(url, web);
  downloaded++;
}

let idx = 0;
async function worker() {
  while (idx < list.length) {
    const my = idx++;
    await handle(list[my]);
    if (my % 100 === 0) process.stdout.write(`  ${my}/${list.length}  (ok:${downloaded} cached:${skipped} dead:${dead.length})\r`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`\n\nDownloaded: ${downloaded}   Already-on-disk: ${skipped}   Dead: ${dead.length}\n`);

// ── 3. REWRITE the data files: external URL -> local /logos path (or "" if dead) ──
const rw = (u) => (isHttp(u) ? (urlToWeb.get(u.trim()) || '') : u); // dead/unknown http -> "" (letter tile)
const counts = {};
function bump(f, n = 1) { counts[f] = (counts[f] || 0) + n; }

if (DATA['tivi-curated.json']) {
  for (const c of DATA['tivi-curated.json'].channels || []) {
    if (isHttp(c.icon)) { const v = rw(c.icon); if (v !== c.icon) { c.icon = v; bump('tivi-curated.json'); } }
  }
}
if (Array.isArray(DATA['free-channels-curated.json'])) {
  for (const c of DATA['free-channels-curated.json']) {
    if (isHttp(c.logo)) { const v = rw(c.logo); if (v !== c.logo) { c.logo = v; bump('free-channels-curated.json'); } }
  }
}
if (DATA['streamore-locked.json']) {
  for (const c of DATA['streamore-locked.json'].channels || []) {
    if (isHttp(c.logo)) { const v = rw(c.logo); if (v !== c.logo) { c.logo = v; bump('streamore-locked.json'); } }
  }
}
if (DATA['streamore-gems.json']) {
  for (const c of DATA['streamore-gems.json'].gems || []) {
    if (isHttp(c.logo)) { const v = rw(c.logo); if (v !== c.logo) { c.logo = v; bump('streamore-gems.json'); } }
  }
}
if (DATA['logo-map.json']) {
  for (const k of Object.keys(DATA['logo-map.json'])) {
    const u = DATA['logo-map.json'][k];
    if (isHttp(u)) { const v = rw(u); if (v !== u) { DATA['logo-map.json'][k] = v; bump('logo-map.json'); } }
  }
}
for (const f of Object.keys(DATA)) {
  if (DATA[f] != null) writeFileSync(join(PUB, f), JSON.stringify(DATA[f]));
}

// ── 4. REWRITE ChannelIcon TV_LOGO_BASE → local mirror (template paths unchanged) ──
let iconChanged = false;
iconSrc = iconSrc.replace(
  /const TV_LOGO_BASE = ['"]https:\/\/raw\.githubusercontent\.com\/tv-logo\/tv-logos\/main\/countries['"];/,
  () => { iconChanged = true; return "const TV_LOGO_BASE = '/logos/tv';"; }
);
if (iconChanged) writeFileSync(CHANNEL_ICON, iconSrc);

// ── REPORT ───────────────────────────────────────────────────────────────────
function dirSize(d) {
  let total = 0;
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    const s = statSync(p);
    total += s.isDirectory() ? dirSize(p) : s.size;
  }
  return total;
}
const sizeBytes = dirSize(LOGOS);
const mb = (sizeBytes / 1048576).toFixed(1);

console.log('Rewritten per file:', JSON.stringify(counts, null, 2));
console.log(`ChannelIcon TV_LOGO_BASE localized: ${iconChanged ? 'yes (/logos/tv)' : 'already local / skipped'}`);
console.log(`\npublic/logos total size: ${mb} MB  (${sizeBytes} bytes)`);
console.log(`Local logos now ours: ${urlToWeb.size} unique`);
console.log(`Dead URLs (→ lettered tile): ${dead.length}`);
if (dead.length) {
  console.log('\n── DEAD URLS ──');
  for (const d of dead) console.log(`  [${d.reason}]  ${d.url}`);
}
console.log('\nDone. NO commit / NO deploy / NO version bump.');
