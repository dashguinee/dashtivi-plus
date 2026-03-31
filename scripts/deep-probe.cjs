#!/usr/bin/env node
/**
 * DashTivi+ Deep Channel Probe (runs locally, probes via VPS)
 *
 * Uses the VPS /probe?ids= endpoint which handles auth server-side.
 * Reads channel IDs from the last probe results or fetches fresh list.
 *
 * Schedule (via cron):
 *   Daily 4 AM UTC   — Full probe: node deep-probe.cjs
 *   Every 72h         — Dead recheck: node deep-probe.cjs --recheck-dead
 *
 * The probe does double redundancy: dead channels get re-probed before final verdict.
 * Results saved as probe-results.json — copy to VPS or use --upload.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const VPS = 'https://stream.zionsynapse.online';
const BATCH_SIZE = 15;
const BATCH_DELAY = 300;
const MAX_RETRIES = 2;
const RESULTS_FILE = path.join(__dirname, 'probe-results.json');
const HISTORY_FILE = path.join(__dirname, 'probe-history.json');
const OLD_PROBE_FILE = path.join(__dirname, 'channel-probe-results.json');

function fetchJson(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); }
  catch { return { dead: {}, lastFullProbe: null, lastDeadRecheck: null }; }
}

function saveHistory(h) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(h, null, 2));
}

function getAllChannelIds() {
  // Source 1: existing probe results
  if (fs.existsSync(OLD_PROBE_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(OLD_PROBE_FILE, 'utf8'));
      if (d.streams) return Object.keys(d.streams).map(Number);
    } catch {}
  }
  // Source 2: previous run's results
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      if (d.all_ids) return d.all_ids;
    } catch {}
  }
  console.error('No channel ID source found. Run a manual probe first.');
  process.exit(1);
}

async function probeBatch(ids, attempt = 0) {
  try {
    const url = `${VPS}/probe?ids=${ids.join(',')}`;
    return await fetchJson(url);
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(1000 * (attempt + 1));
      return probeBatch(ids, attempt + 1);
    }
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const recheckOnly = args.includes('--recheck-dead');
  const upload = args.includes('--upload');

  console.log(`\n🔍 DashTivi+ Deep Probe — ${new Date().toISOString()}`);
  console.log(`   Mode: ${recheckOnly ? 'RECHECK DEAD' : 'FULL PROBE'}\n`);

  const history = loadHistory();
  let toProbe;

  if (recheckOnly) {
    const deadIds = Object.keys(history.dead).map(Number);
    toProbe = deadIds;
    console.log(`   Rechecking ${toProbe.length} previously dead channels`);
  } else {
    toProbe = getAllChannelIds();
    console.log(`   Probing ${toProbe.length} channels`);
  }

  // Batch and probe
  const results = {};
  const batches = [];
  for (let i = 0; i < toProbe.length; i += BATCH_SIZE) {
    batches.push(toProbe.slice(i, i + BATCH_SIZE));
  }

  console.log(`   ${batches.length} batches of ${BATCH_SIZE}\n`);
  const start = Date.now();
  let done = 0;
  let failedBatches = 0;

  for (const batch of batches) {
    const data = await probeBatch(batch);
    if (data) {
      for (const id of batch) {
        results[id] = data[String(id)] || 'unknown';
      }
    } else {
      for (const id of batch) results[id] = 'unknown';
      failedBatches++;
    }

    done++;
    if (done % 25 === 0 || done === batches.length) {
      const pct = ((done / batches.length) * 100).toFixed(1);
      const secs = ((Date.now() - start) / 1000).toFixed(0);
      process.stdout.write(`\r   ${pct}% — ${done}/${batches.length} batches (${secs}s)`);
    }
    // Incremental save every 100 batches (~5 min) — crash-safe
    if (done % 100 === 0) {
      const partialAlive = Object.entries(results).filter(([, s]) => s === 'live' || s === 'weak').map(([id]) => Number(id));
      const partial = { ts: new Date().toISOString(), total: toProbe.length, probed: done * BATCH_SIZE, alive: partialAlive.length, alive_set: partialAlive, partial: true };
      fs.writeFileSync(RESULTS_FILE + '.progress', JSON.stringify(partial));
    }
    await sleep(BATCH_DELAY);
  }

  console.log('\n');

  // Tally
  const counts = { live: 0, dead: 0, offline: 0, weak: 0, unknown: 0 };
  for (const s of Object.values(results)) counts[s] = (counts[s] || 0) + 1;

  console.log('📊 First pass:');
  console.log(`   ✅ Live:    ${counts.live}`);
  console.log(`   ❌ Dead:    ${counts.dead}`);
  console.log(`   ⚠️  Offline: ${counts.offline}`);
  console.log(`   🔸 Weak:    ${counts.weak}`);
  console.log(`   ❓ Unknown: ${counts.unknown}`);
  console.log(`   🔴 Failed:  ${failedBatches} batches`);

  // Double redundancy — recheck dead
  const deadIds = Object.entries(results).filter(([, s]) => s === 'dead').map(([id]) => Number(id));

  const skipRecheck = args.includes('--no-recheck');
  if (deadIds.length > 0 && !recheckOnly && !skipRecheck) {
    console.log(`\n🔄 Double-checking ${deadIds.length} dead channels...`);
    await sleep(2000); // let VPS breathe

    let revived = 0;
    const recheckBatches = [];
    for (let i = 0; i < deadIds.length; i += BATCH_SIZE) {
      recheckBatches.push(deadIds.slice(i, i + BATCH_SIZE));
    }

    for (const batch of recheckBatches) {
      const data = await probeBatch(batch);
      if (data) {
        for (const id of batch) {
          const s = data[String(id)];
          if (s === 'live' || s === 'weak') { results[id] = s; revived++; }
        }
      }
      await sleep(500);
    }
    console.log(`   Revived: ${revived} | Confirmed dead: ${deadIds.length - revived}`);
  }

  // Update history
  const finalDead = Object.entries(results).filter(([, s]) => s === 'dead').map(([id]) => Number(id));
  for (const id of finalDead) history.dead[id] = { ts: new Date().toISOString() };
  for (const id of Object.keys(history.dead)) {
    if (results[Number(id)] === 'live' || results[Number(id)] === 'weak') delete history.dead[id];
  }
  if (!recheckOnly) history.lastFullProbe = new Date().toISOString();
  else history.lastDeadRecheck = new Date().toISOString();
  saveHistory(history);

  // Generate output
  const aliveSet = Object.entries(results)
    .filter(([, s]) => s === 'live' || s === 'weak')
    .map(([id]) => Number(id));

  const output = {
    ts: new Date().toISOString(),
    total: toProbe.length,
    alive: aliveSet.length,
    dead: finalDead.length,
    offline: counts.offline,
    alive_pct: parseFloat(((aliveSet.length / toProbe.length) * 100).toFixed(1)),
    alive_set: aliveSet,
    all_ids: recheckOnly ? getAllChannelIds() : toProbe,
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(output));

  const totalSecs = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n💾 Saved: ${RESULTS_FILE}`);
  console.log(`   ✅ ${aliveSet.length} alive | ❌ ${finalDead.length} dead | ⏱  ${totalSecs}s`);

  // Upload to VPS
  if (upload) {
    console.log('\n📤 Uploading to VPS...');
    const postData = JSON.stringify(output);
    try {
      await new Promise((resolve, reject) => {
        const req = https.request(`${VPS}/upload-probe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { console.log(`   ${d}`); resolve(); }); });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    } catch (e) {
      console.log(`   Failed: ${e.message} — manually scp the file to VPS`);
    }
  }

  console.log('\n✅ Done.\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
