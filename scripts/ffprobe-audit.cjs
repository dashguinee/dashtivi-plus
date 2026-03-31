#!/usr/bin/env node
/**
 * DashTivi+ FFprobe Audio+Video Audit
 *
 * Runs ffprobe on every alive channel via VPS stream URL.
 * Detects: no audio, no video, corrupt streams, codec info.
 * Outputs: channels to hide (no audio), channels to flag (issues).
 *
 * Decentralized: runs locally, streams via VPS proxy (one at a time, no overload).
 * Uses the alive_set from probe-results.json to only test known-alive channels.
 *
 * Usage: node ffprobe-audit.cjs [--batch N] [--offset N]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VPS = 'https://stream.zionsynapse.online';
const USER = 'Test032026';
const PASS = '032026Test';
const BATCH_PAUSE = 500; // ms between probes — gentle on VPS
const FFPROBE_TIMEOUT = 8; // seconds
const RESULTS_FILE = path.join(__dirname, 'ffprobe-audit-results.json');
const PROGRESS_FILE = RESULTS_FILE + '.progress';

// Load alive channels from latest probe
const probeFile = path.join(__dirname, 'probe-results.json');
let aliveIds = [];
try {
  const probe = JSON.parse(fs.readFileSync(probeFile, 'utf8'));
  aliveIds = probe.alive_set || [];
  console.log(`[AUDIT] Loaded ${aliveIds.length} alive channels from probe`);
} catch (e) {
  // Try progress file
  const progFile = probeFile + '.progress';
  try {
    const probe = JSON.parse(fs.readFileSync(progFile, 'utf8'));
    aliveIds = probe.alive_set || [];
    console.log(`[AUDIT] Loaded ${aliveIds.length} alive channels from progress file`);
  } catch {
    console.error('[AUDIT] No probe-results.json found. Run deep-probe.cjs first.');
    process.exit(1);
  }
}

// Parse args
const args = process.argv.slice(2);
const batchSize = parseInt(args.find((a, i) => args[i - 1] === '--batch') || '0') || aliveIds.length;
const offset = parseInt(args.find((a, i) => args[i - 1] === '--offset') || '0') || 0;

const toTest = aliveIds.slice(offset, offset + batchSize);
console.log(`[AUDIT] Testing ${toTest.length} channels (offset=${offset}, total alive=${aliveIds.length})`);

// Results
const results = {
  ts: new Date().toISOString(),
  tested: 0,
  healthy: 0,       // video + audio
  no_audio: [],     // video only, no audio track
  no_video: [],     // audio only or nothing
  corrupt: [],      // ffprobe fails entirely
  codec_map: {},    // {stream_id: {video: "h264", audio: "aac", resolution: "1920x1080"}}
};

function ffprobeChannel(streamId) {
  // Build the raw stream URL (not through FFmpeg transcoding, just the source)
  const url = `http://datahub11.com:80/${USER}/${PASS}/${streamId}`;

  try {
    const cmd = `ssh vps 'timeout ${FFPROBE_TIMEOUT} ffprobe -v quiet -print_format json -show_streams -analyzeduration 3000000 -probesize 500000 "${url}" 2>/dev/null'`;
    const output = execSync(cmd, { timeout: (FFPROBE_TIMEOUT + 5) * 1000, encoding: 'utf8' });
    const data = JSON.parse(output);
    const streams = data.streams || [];

    const hasVideo = streams.some(s => s.codec_type === 'video');
    const hasAudio = streams.some(s => s.codec_type === 'audio');
    const videoStream = streams.find(s => s.codec_type === 'video');
    const audioStream = streams.find(s => s.codec_type === 'audio');

    const info = {
      video: videoStream ? videoStream.codec_name : null,
      audio: audioStream ? audioStream.codec_name : null,
      resolution: videoStream ? `${videoStream.width || '?'}x${videoStream.height || '?'}` : null,
    };

    results.codec_map[streamId] = info;

    if (hasVideo && hasAudio) {
      results.healthy++;
      return 'healthy';
    } else if (hasVideo && !hasAudio) {
      results.no_audio.push(streamId);
      return 'no_audio';
    } else {
      results.no_video.push(streamId);
      return 'no_video';
    }
  } catch (e) {
    results.corrupt.push(streamId);
    return 'corrupt';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const start = Date.now();

  for (let i = 0; i < toTest.length; i++) {
    const id = toTest[i];
    const status = ffprobeChannel(id);
    results.tested++;

    if ((i + 1) % 10 === 0 || status !== 'healthy') {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const rate = (results.tested / ((Date.now() - start) / 1000)).toFixed(1);
      const eta = (((toTest.length - i - 1) / rate) / 60).toFixed(0);
      console.log(`[${results.tested}/${toTest.length}] ${id}: ${status} | ${results.healthy} healthy, ${results.no_audio.length} no-audio, ${results.corrupt.length} corrupt | ${rate}/s, ETA ${eta}min`);
    }

    // Save progress every 50
    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2));
    }

    await sleep(BATCH_PAUSE);
  }

  // Final save
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  console.log('\n=== FFPROBE AUDIT COMPLETE ===');
  console.log(`Tested: ${results.tested}`);
  console.log(`Healthy (video+audio): ${results.healthy}`);
  console.log(`No audio: ${results.no_audio.length} — ${results.no_audio.join(', ')}`);
  console.log(`No video: ${results.no_video.length}`);
  console.log(`Corrupt/timeout: ${results.corrupt.length}`);
  console.log(`Saved to: ${RESULTS_FILE}`);
}

run().catch(e => {
  console.error('[AUDIT] Fatal:', e.message);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
});
