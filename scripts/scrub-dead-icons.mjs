#!/usr/bin/env node
/**
 * scrub-dead-icons.mjs — data fix for guest catalogs.
 * Verifies EVERY image URL and nulls the ones that reliably 4xx/5xx/fail so the
 * app never fires a broken-image request. A nulled icon ("") makes ChannelIcon
 * render its painted-initials placeholder and experience heroes skip the <img>.
 * Conservative: real browser UA + retry-once before declaring an URL dead.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(__dirname, '..', 'public');
const FILES = ['tivi-curated.json', 'free-channels-curated.json', 'streamore-gems.json', 'streamore-locked.json', 'logo-map.json'];
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Always-dead hosts (don't even probe — known blocked / gone)
const DEAD_HOST = (u) => /^https?:\/\/(i\.)?ibb\.co\//i.test(u) || /^https?:\/\/upload\.wikimedia\.org\//i.test(u);
const isImg = (u) => /^https?:\/\//i.test(u) && /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(u);

const parsed = {};
const imgUrls = new Set();
function walkCollect(node) {
  if (typeof node === 'string') { if (isImg(node) && !DEAD_HOST(node)) imgUrls.add(node); return; }
  if (Array.isArray(node)) { node.forEach(walkCollect); return; }
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) walkCollect(node[k]); }
}
for (const f of FILES) {
  try { parsed[f] = JSON.parse(readFileSync(resolve(PUB, f), 'utf8')); walkCollect(parsed[f]); }
  catch (e) { console.warn('skip', f, e.message); }
}

const dead = new Set();
async function probe(u) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctl = AbortSignal.timeout(9000);
      const r = await fetch(u, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, signal: ctl });
      try { await r.body?.cancel?.(); } catch { /* ignore */ }
      if (r.ok) return;                 // alive
      if (r.status >= 400 && r.status < 600) { dead.add(u); return; } // definitive 4xx/5xx
    } catch { /* network error — retry once, then give up */ }
  }
  dead.add(u); // failed twice (DNS/conn/timeout)
}
const list = [...imgUrls];
console.log(`probing ${list.length} image URLs (+ host-dead nulled unconditionally)...`);
for (let i = 0; i < list.length; i += 32) { await Promise.all(list.slice(i, i + 32).map(probe)); if (i % 320 === 0) process.stdout.write(`  ${i}/${list.length}\r`); }
console.log(`\ndead image URLs: ${dead.size}`);

let counts = {};
const isDeadUrl = (v) => typeof v === 'string' && isImg(v) && (DEAD_HOST(v) || dead.has(v));
function walkScrub(node, file) {
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) { if (isDeadUrl(node[i])) { node[i] = ''; counts[file] = (counts[file] || 0) + 1; } else walkScrub(node[i], file); } return; }
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) { if (isDeadUrl(node[k])) { node[k] = ''; counts[file] = (counts[file] || 0) + 1; } else walkScrub(node[k], file); } }
}
for (const f of FILES) { if (!parsed[f]) continue; walkScrub(parsed[f], f); writeFileSync(resolve(PUB, f), JSON.stringify(parsed[f])); }
console.log('scrubbed per file:', JSON.stringify(counts, null, 2));
