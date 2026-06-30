#!/usr/bin/env node
/**
 * DEEP CHANNEL CHECK — tests REALITY, not config.
 * For every curated channel, ffprobe the real proxy stream and read 40 packets
 * (confirms video+audio data actually FLOWS, not just that the link answers).
 * Classifies: healthy | no_audio | weak (slow/buffering) | dead.
 * Sequential (probe line = max 1 stream), resumable, polite pacing.
 *
 * Usage: node deep-channel-check.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROXY = 'https://stream.zionsynapse.online';
const U = 'Julz0535';
const P = encodeURIComponent('$J0535'); // DASH probe creds (off-hours maintenance)
const Q = 'hd720';
const HEALTHY_MS = 7000;     // connect+40 packets under 7s = healthy; slower = weak/buffering
const PACKETS = 40;
const WALL_TIMEOUT_MS = 18000;

const curated = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/tivi-curated.json'), 'utf8'));
const channels = curated.channels || [];
const OUT = path.join(__dirname, 'deep-channel-check.json');

let results = {};
if (fs.existsSync(OUT)) { try { results = JSON.parse(fs.readFileSync(OUT, 'utf8')).results || {}; } catch {} }

function probe(ch) {
  const url = `${PROXY}/live?id=${ch.ext_id}&u=${U}&p=${P}&q=${Q}`;
  const t0 = Date.now();
  try {
    const out = execSync(
      `ffprobe -v error -timeout 12000000 -show_entries stream=codec_type,codec_name,width,height -of json -read_intervals "%+#${PACKETS}" ${JSON.stringify(url)}`,
      { timeout: WALL_TIMEOUT_MS, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const ms = Date.now() - t0;
    const streams = (JSON.parse(out).streams) || [];
    const v = streams.find((s) => s.codec_type === 'video');
    const a = streams.find((s) => s.codec_type === 'audio');
    if (!v) return { status: 'dead', reason: 'no video stream', ms };
    const res = `${v.width}x${v.height}`;
    if (!a) return { status: 'no_audio', reason: 'video only, no audio', ms, res, vcodec: v.codec_name };
    if (ms > HEALTHY_MS) return { status: 'weak', reason: `slow / buffering (${ms}ms)`, ms, res, vcodec: v.codec_name, acodec: a.codec_name };
    return { status: 'healthy', reason: 'ok', ms, res, vcodec: v.codec_name, acodec: a.codec_name };
  } catch (e) {
    const ms = Date.now() - t0;
    return { status: 'dead', reason: e.killed ? 'timeout / buffering / no data' : 'ffprobe error', ms };
  }
}

function summary() {
  const c = Object.values(results);
  return {
    healthy: c.filter((x) => x.status === 'healthy').length,
    no_audio: c.filter((x) => x.status === 'no_audio').length,
    weak: c.filter((x) => x.status === 'weak').length,
    dead: c.filter((x) => x.status === 'dead').length,
  };
}

let i = 0;
for (const ch of channels) {
  i++;
  if (results[ch.id] && results[ch.id].status) continue; // resume: skip done
  const r = probe(ch);
  results[ch.id] = { name: ch.name, collection: ch.collection, tier: ch.tier, ext_id: ch.ext_id, ...r };
  if (i % 5 === 0 || i === channels.length) {
    fs.writeFileSync(OUT, JSON.stringify({ ts: new Date().toISOString(), total: channels.length, done: i, summary: summary(), results }, null, 1));
    const s = summary();
    console.log(`[${i}/${channels.length}] ✓${s.healthy} ◐${s.no_audio} ⚠${s.weak} ✗${s.dead} | ${ch.name} → ${r.status}${r.res ? ' ' + r.res : ''} (${r.ms}ms)`);
  }
}
fs.writeFileSync(OUT, JSON.stringify({ ts: new Date().toISOString(), total: channels.length, done: i, summary: summary(), results }, null, 1));
console.log('DONE', JSON.stringify(summary()));
