#!/usr/bin/env node
/* qa-playback.cjs — per-channel PLAYBACK check via ffmpeg decoding the EXACT
 * stream the app plays (proxy /live for paid, direct url for free/direct).
 * Decodes H.264/AAC, grabs frames, classifies:
 *   MOVING  — consecutive frames differ  (real live moving video) ✅
 *   STATIC  — decodes, non-black, low motion (placeholder/off-air card) ⚠️
 *   BLACK   — decodes but all frames ~black                          ❌
 *   DEAD    — no frames / ffmpeg error / connection fail             ❌
 * Saves 3 PNG evidence frames for DEAD/BLACK/STATIC + sampled passes.
 *
 * Usage: node qa-playback.cjs <creds.json> <exp1,exp2,...|ALL> [freeSampleN]
 * max_streams=1 on the member -> proxy channels run SERIALLY.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'outputs/channel-qa');
const PROXY = 'https://stream.zionsynapse.online';

const CREDS = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const EXP_ARG = (process.argv[3] || 'ALL');
const FREE_N = parseInt(process.argv[4] || '0', 10);
const CONC = parseInt(process.env.QA_CONC || '4', 10);
const GAP = parseInt(process.env.QA_GAP || '0', 10); // ms pause after each item (serial throttle-avoidance)
const U = encodeURIComponent(CREDS.username), P = encodeURIComponent(CREDS.password);

const GW = 64, GH = 36, FS = GW * GH;
const SECS = 5;            // seconds of stream to read
const TIMEOUT = 28000;     // hard kill
const BLACK_MEAN = 6;      // below = black
const MOVING_DIFF = 3.0;   // maxConsecutiveDiff above = moving

const tivi = JSON.parse(fs.readFileSync(path.join(PUB, 'tivi-curated.json'), 'utf8'));

function buildPaidUrl(ch) {
  if (ch.plays === 'direct') return ch.url || null;
  return `${PROXY}/live?id=${ch.ext_id}&u=${U}&p=${P}&q=hd720`;
}

function sh(name) { return name.replace(/[^a-z0-9]+/gi, '_').slice(0, 48); }

// ---- gray-frame metric pass (rawvideo to stdout) ----
function grabGray(url) {
  return new Promise((resolve) => {
    const args = ['-nostdin', '-loglevel', 'error',
      '-analyzeduration', '4000000', '-probesize', '4000000',
      '-i', url, '-t', String(SECS),
      '-vf', `fps=1,scale=${GW}:${GH}`, '-an',
      '-f', 'rawvideo', '-pix_fmt', 'gray', '-'];
    const ff = spawn('ffmpeg', args);
    const chunks = []; let err = '';
    const to = setTimeout(() => { try { ff.kill('SIGKILL'); } catch {} }, TIMEOUT);
    ff.stdout.on('data', c => chunks.push(c));
    ff.stderr.on('data', c => { if (err.length < 2000) err += c.toString(); });
    ff.on('close', () => {
      clearTimeout(to);
      const buf = Buffer.concat(chunks);
      const n = Math.floor(buf.length / FS);
      if (n < 1) return resolve({ frames: 0, err: err.trim().split('\n').pop() || 'no-video' });
      const means = [];
      for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < FS; j++) s += buf[i * FS + j]; means.push(s / FS); }
      let maxd = 0;
      for (let i = 1; i < n; i++) { let s = 0; for (let j = 0; j < FS; j++) s += Math.abs(buf[i * FS + j] - buf[(i - 1) * FS + j]); const d = s / FS; if (d > maxd) maxd = d; }
      resolve({ frames: n, means, maxd, err: '' });
    });
    ff.on('error', () => { clearTimeout(to); resolve({ frames: 0, err: 'spawn-error' }); });
  });
}

// ---- PNG evidence pass (3 frames spaced ~2s) ----
function grabPng(url, dir) {
  return new Promise((resolve) => {
    fs.mkdirSync(dir, { recursive: true });
    const args = ['-nostdin', '-loglevel', 'error', '-y',
      '-analyzeduration', '4000000', '-probesize', '4000000',
      '-i', url, '-t', '8', '-vf', 'fps=1/2,scale=300:169', '-frames:v', '3',
      path.join(dir, 'f_%02d.png')];
    const ff = spawn('ffmpeg', args);
    const to = setTimeout(() => { try { ff.kill('SIGKILL'); } catch {} }, TIMEOUT + 4000);
    ff.on('close', () => { clearTimeout(to); resolve(); });
    ff.on('error', () => { clearTimeout(to); resolve(); });
  });
}

function classify(m) {
  if (m.frames < 1) return 'DEAD';
  const maxMean = Math.max(...m.means);
  if (maxMean < BLACK_MEAN) return 'BLACK';
  if (m.frames < 2) return 'STATIC'; // only one frame decoded, non-black
  return m.maxd > MOVING_DIFF ? 'MOVING' : 'STATIC';
}

const isRefused = (m) => /refused|Connection timed out|timed out|Server returned 5|HTTP error 5|503|429|Temporary failure/i.test(m.err || '');

async function processOne(item, log, retry) {
  let m = await grabGray(item.url);
  let status = classify(m);
  let mm = m;
  if ((status === 'DEAD' || status === 'BLACK') && retry) {
    // A "Connection refused"/timeout under max_streams=1 means the single
    // upstream slot is busy (often leaked by a prior SIGKILL'd stuck stream).
    // Wait for the slot to clear, then retry up to 3x with growing backoff.
    for (let attempt = 0; attempt < 3 && (status === 'DEAD' || status === 'BLACK'); attempt++) {
      const wait = isRefused(mm) ? 15000 + attempt * 10000 : 1500;
      await new Promise(r => setTimeout(r, wait));
      const mr = await grabGray(item.url);
      const sr = classify(mr);
      if (sr === 'MOVING' || sr === 'STATIC') { mm = mr; status = sr; break; }
      mm = mr.frames >= mm.frames ? mr : mm;
      status = classify(mm);
    }
  }
  const rec = { key: item.key, exp: item.exp, name: item.name, id: item.id, ext_id: item.ext_id, plays: item.plays, status, frames: mm.frames, maxd: mm.maxd ? +mm.maxd.toFixed(2) : 0, maxMean: mm.means ? +Math.max(...mm.means).toFixed(1) : 0, err: mm.err || '' };
  const wantPng = (status === 'DEAD' || status === 'BLACK') || item.sample;
  if (wantPng) await grabPng(item.url, path.join(OUT, sh(item.exp), sh(item.name)));
  log.write(JSON.stringify(rec) + '\n');
  console.log(`[${item.exp}] ${item.name}: ${status} (frames=${mm.frames} maxd=${rec.maxd} mean=${rec.maxMean})${mm.err ? ' err=' + mm.err.slice(0, 60) : ''}`);
  return rec;
}

async function pool(items, log) {
  let idx = 0, active = 0;
  return new Promise((resolve) => {
    function next() {
      if (idx >= items.length && active === 0) return resolve();
      while (active < CONC && idx < items.length) {
        const item = items[idx++]; active++;
        processOne(item, log, true).catch(() => {}).finally(() => {
          active--;
          if (GAP > 0) setTimeout(next, GAP); else next();
        });
      }
    }
    next();
  });
}

async function run() {
  const groups = {};
  for (const c of tivi.channels) (groups[c.experience] = groups[c.experience] || []).push(c);
  let exps = EXP_ARG === 'ALL' ? Object.keys(groups) : EXP_ARG.split(',').map(s => s.trim());

  const resultsPath = path.join(OUT, 'playback-results.jsonl');
  // Resume: only trust GOOD verdicts. DEAD/BLACK get re-tested (they are often
  // false-negatives from connection-leak cascades under max_streams=1).
  const done = new Set();
  if (fs.existsSync(resultsPath)) {
    for (const line of fs.readFileSync(resultsPath, 'utf8').trim().split('\n')) {
      if (!line) continue;
      try { const j = JSON.parse(line); if (j.status === 'MOVING' || j.status === 'STATIC' || j.status === 'NO_URL') done.add(j.key); } catch {}
    }
  }
  const log = fs.createWriteStream(resultsPath, { flags: 'a' });

  const work = [];
  for (const exp of exps) {
    const chans = groups[exp] || [];
    let nSample = 0;
    for (const ch of chans) {
      const key = `tivi:${ch.id}`;
      if (done.has(key)) continue;
      const url = buildPaidUrl(ch);
      if (!url) { log.write(JSON.stringify({ key, exp, name: ch.name, id: ch.id, status: 'NO_URL' }) + '\n'); continue; }
      work.push({ key, exp, name: ch.name, id: ch.id, ext_id: ch.ext_id, plays: ch.plays, url, sample: (nSample++ < 2) });
    }
  }

  if (FREE_N > 0) {
    const free = JSON.parse(fs.readFileSync(path.join(PUB, 'free-channels-curated.json'), 'utf8'));
    const byExp = {};
    for (const c of free) (byExp[c.experience || '?'] = byExp[c.experience || '?'] || []).push(c);
    const expKeys = Object.keys(byExp);
    const perExp = Math.max(1, Math.floor(FREE_N / expKeys.length));
    for (const e of expKeys) {
      const arr = byExp[e]; const step = Math.max(1, Math.floor(arr.length / perExp)); let cnt = 0;
      for (let i = 0; i < arr.length && cnt < perExp; i += step) {
        const ch = arr[i]; const key = `free:${ch.id}`;
        if (done.has(key)) continue;
        work.push({ key, exp: 'FREE:' + (ch.experience || '?'), name: ch.name, id: ch.id, ext_id: '', plays: 'direct', url: ch.url, sample: cnt < 1 });
        cnt++;
      }
    }
  }

  console.log(`Work items: ${work.length}, concurrency=${CONC}\n`);
  await pool(work, log);
  log.end();
  console.log('\nDONE. results -> outputs/channel-qa/playback-results.jsonl');
}
run();
