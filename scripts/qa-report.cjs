#!/usr/bin/env node
/* qa-report.cjs — merge icon-report.json + playback-results.jsonl into a
 * per-collection pass/fail summary + overall FIX list. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'outputs/channel-qa');

const icon = JSON.parse(fs.readFileSync(path.join(OUT, 'icon-report.json'), 'utf8'));
const rawLines = fs.readFileSync(path.join(OUT, 'playback-results.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
// dedupe by key, keep-last (latest write wins)
const byKey = {};
for (const r of rawLines) byKey[r.key] = r;
const pbLines = Object.values(byKey);

// catalog totals for coverage
const tivi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public/tivi-curated.json'), 'utf8'));
const totalByExp = {};
for (const c of tivi.channels) totalByExp[c.experience] = (totalByExp[c.experience] || 0) + 1;

// group playback by exp
const pbByExp = {};
for (const r of pbLines) (pbByExp[r.exp] = pbByExp[r.exp] || []).push(r);

console.log('================= PLAYBACK QA — per collection =================\n');
const deadList = [];
for (const [exp, arr] of Object.entries(pbByExp)) {
  const t = { MOVING: 0, STATIC: 0, BLACK: 0, DEAD: 0, NO_URL: 0 };
  for (const r of arr) t[r.status] = (t[r.status] || 0) + 1;
  const bad = arr.filter(r => r.status === 'DEAD' || r.status === 'BLACK' || r.status === 'NO_URL');
  const stat = arr.filter(r => r.status === 'STATIC');
  const clean = bad.length === 0;
  const tot = totalByExp[exp] != null ? `/${totalByExp[exp]}` : '';
  console.log(`## ${exp}: ${arr.length}${tot} tested — ${clean ? 'CLEAN (all deliver video)' : 'NEEDS-FIX'}`);
  console.log(`   moving=${t.MOVING||0} static/off-air=${t.STATIC||0} black=${t.BLACK||0} dead=${t.DEAD||0} no_url=${t.NO_URL||0}`);
  if (bad.length) console.log('   DEAD/BLACK: ' + bad.map(r => `${r.name}[${r.status}${r.err?':'+r.err.slice(0,40):''}]`).join(' | '));
  if (stat.length) console.log('   STATIC(card/off-air): ' + stat.map(r => r.name).join(' | '));
  console.log('');
  for (const r of bad) deadList.push({ exp, name: r.name, id: r.id, status: r.status, err: r.err });
}

console.log('================= ICON QA — per collection =================\n');
const iconFix = icon.fixList;
for (const [exp, col] of Object.entries(icon.collections)) {
  const clean = (col.letter.length === 0 && col.broken.length === 0);
  console.log(`## ${exp}: ${col.total} — ${clean ? 'CLEAN' : 'NEEDS-FIX'} (letter-tile=${col.letter.length} broken=${col.broken.length})`);
}

console.log('\n================= OVERALL FIX LIST =================\n');
console.log(`### DEAD / BLACK PLAYBACK (${deadList.length}) — must fix or pull:`);
for (const d of deadList) console.log(`  - [${d.exp}] ${d.name} (${d.status}${d.err ? ': ' + d.err.slice(0, 50) : ''})`);
console.log(`\n### LETTER-TILE / BROKEN ICONS (${iconFix.length}):`);
const byE = {};
for (const f of iconFix) (byE[f.exp] = byE[f.exp] || []).push(f.name);
for (const [e, names] of Object.entries(byE)) console.log(`  [${e}] ${names.join(' | ')}`);

fs.writeFileSync(path.join(OUT, 'FIX-LIST.json'), JSON.stringify({ deadPlayback: deadList, iconIssues: iconFix }, null, 2));
console.log('\nwrote outputs/channel-qa/FIX-LIST.json');
