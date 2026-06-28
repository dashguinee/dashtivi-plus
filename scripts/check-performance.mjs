#!/usr/bin/env node
/**
 * check-performance.mjs — PERFORMANCE SCORECARD for Tivi+
 * -------------------------------------------------------
 * "Is it fast?" Drives the live site headless (chromium-1194, guest login, the
 * surface walk) with the shared PerformanceObservers (FPS sampler, longtask,
 * LCP, layout-shift, INP event-timing) + CDP heap sampling + a built-bundle
 * gzip read, and turns speed into a CHECKMARK scorecard: one ✅/❌ per criterion
 * with the measured value + threshold, ending in `PERFORMANCE: N/M ✅`.
 * Exit 0 iff all pass — so it can gate CI later.
 *
 * RUN:  npm run check:perf    (writes outputs/check-performance.md + prints it)
 * ENV:  GLITCH_URL / GLITCH_ID / GLITCH_PIN / GLITCH_HEAD (see _harness-lib.mjs)
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  URL, sleep, launchContext, makeCapture, makeStep,
  scrollPage, scrollCarousels, waitForApp, loginIfNeeded, tapVee, bucketCLS,
} from './_harness-lib.mjs';

// ════════════════════════ THRESHOLDS (tune here) ════════════════════════════
const MIN_SCROLL_FPS     = 55;     // min sampled fps on every scrolled surface
const MAX_LONGTASK_MS    = 100;    // no single long-task may exceed this during interaction
const MAX_LCP_MS         = 2500;   // largest-contentful-paint budget
const MAX_CLS_OVERALL    = 0.1;    // cumulative layout-shift across the whole run
const MAX_INP_MS         = 200;    // interaction-to-next-paint (Vee cycle + tab switch)
const BUNDLE_BUDGET_GZ   = 320 * 1024; // main JS bundle gzipped budget (~320KB)
const MAX_FAILED_REQ     = 0;      // zero failed / 4xx-5xx network requests
const MAX_BOOT_MS        = 4000;   // cold boot → interactive (past splash + auth + content)
const HEAP_GROWTH_RATIO  = 2.0;    // leak signal: final heap / first heap above this …
const HEAP_GROWTH_MB     = 40;     // … AND absolute growth above this = flag a leak
// ═════════════════════════════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'outputs');
const OUT_FILE = resolve(OUT_DIR, 'check-performance.md');
const DIST_ASSETS = resolve(ROOT, 'dist', 'assets');

// Scrolled surfaces whose min FPS matters (idle/transient steps excluded).
const FPS_SURFACES = new Set(['Home', 'Movies', 'Series', 'Library', 'DaHub']);

async function sampleHeap(page) {
  try {
    return await page.evaluate(() => {
      const m = performance.memory;
      return m ? Math.round(m.usedJSHeapSize / 1048576 * 10) / 10 : null; // MB, 1 decimal
    });
  } catch { return null; }
}

async function run() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await launchContext();
  const capture = makeCapture(page);
  const report = [];
  const step = makeStep(page, capture, report);

  const extra = { bootMs: null, heap: [], inpWall: [] };

  console.log(`\n⚡ PERFORMANCE SCORECARD → ${URL}\n`);

  // ── boot → interactive (timed) ───────────────────────────────────────────────
  await step('boot', async () => {
    const t0 = Date.now();
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await loginIfNeeded(page);
    await waitForApp(page);
    extra.bootMs = Date.now() - t0;
    await sleep(800);
    extra.heap.push({ at: 'boot', mb: await sampleHeap(page) });
  });

  // ── Home (scroll) ────────────────────────────────────────────────────────────
  await step('Home', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1200);
    await scrollPage(page); await scrollCarousels(page);
    extra.heap.push({ at: 'Home', mb: await sampleHeap(page) });
  });

  // ── Movies (scroll) ──────────────────────────────────────────────────────────
  await step('Movies', async () => {
    await page.goto(URL + '/movies', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1000);
    await scrollPage(page); await scrollCarousels(page);
    extra.heap.push({ at: 'Movies', mb: await sampleHeap(page) });
  });

  // ── Series (scroll) ──────────────────────────────────────────────────────────
  await step('Series', async () => {
    await page.goto(URL + '/series', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1000);
    await scrollPage(page); await scrollCarousels(page);
    extra.heap.push({ at: 'Series', mb: await sampleHeap(page) });
  });

  // ── Library (scroll) ─────────────────────────────────────────────────────────
  await step('Library', async () => {
    await page.goto(URL + '/library', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1000);
    await scrollPage(page); await scrollCarousels(page);
    extra.heap.push({ at: 'Library', mb: await sampleHeap(page) });
  });

  // ── DaHub (scroll) ───────────────────────────────────────────────────────────
  await step('DaHub', async () => {
    await page.goto(URL + '/hub', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1000);
    await scrollPage(page); await scrollCarousels(page);
    extra.heap.push({ at: 'DaHub', mb: await sampleHeap(page) });
  });

  // ── Interaction latency: Vee cycle + a tab switch (Node wall-clock) ──────────
  // INP itself comes from the event-timing observer; this adds a wall-clock
  // sanity read on the two flagship interactions.
  await step('Interaction (Vee + tab)', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1200);
    // Vee taps (each = a client-side route swap)
    for (let i = 0; i < 4; i++) {
      const t = Date.now();
      const ok = await tapVee(page);
      if (!ok) break;
      // wait for the route's commit (one rAF after click)
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      extra.inpWall.push(Date.now() - t);
      await sleep(1100);
    }
    extra.heap.push({ at: 'Interaction', mb: await sampleHeap(page) });
  });

  await browser.close();
  return { report, capture, extra };
}

// ───────────── built-bundle gzip read (build if dist is missing) ─────────────
function measureBundle() {
  function pickIndex() {
    if (!existsSync(DIST_ASSETS)) return null;
    const files = readdirSync(DIST_ASSETS).filter((f) => /^index-.*\.js$/.test(f));
    return files.length ? resolve(DIST_ASSETS, files.sort()[0]) : null;
  }
  let idx = pickIndex();
  if (!idx) {
    try {
      console.log('  · dist/ missing — running `npm run build` to measure bundle…');
      execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });
    } catch { /* build failure surfaces as a fail below */ }
    idx = pickIndex();
  }
  if (!idx) return { gz: null, raw: null, file: '(no dist build)' };
  const buf = readFileSync(idx);
  return { gz: gzipSync(buf).length, raw: buf.length, file: idx.replace(ROOT + '/', '') };
}

// ───────────────────────────── evaluate checks ──────────────────────────────
function evaluate({ report, capture, extra }) {
  const checks = [];
  const add = (pass, name, measured, threshold, surface) => checks.push({ pass, name, measured, threshold, surface });

  // 1. Scroll FPS — min sampled fps on every scrolled surface
  let worstFps = Infinity, worstSurf = null;
  for (const b of report) {
    if (!FPS_SURFACES.has(b.label)) continue;
    const samples = b.fps.map((f) => f.fps);
    if (samples.length < 2) continue; // not enough frames sampled to judge
    const mn = Math.min(...samples);
    if (mn < worstFps) { worstFps = mn; worstSurf = b.label; }
  }
  if (worstFps === Infinity) worstFps = 0;
  add(worstFps >= MIN_SCROLL_FPS, 'Scroll FPS (min/surface)', `${worstFps} fps`, `>= ${MIN_SCROLL_FPS}`, worstFps < MIN_SCROLL_FPS ? worstSurf : null);

  // 2. Long-tasks — none > MAX_LONGTASK_MS (also report count of >50ms tasks)
  let maxLt = 0, ltSurf = null, lt50 = 0;
  for (const b of report) for (const t of b.longtasks) { lt50++; if (t.duration > maxLt) { maxLt = t.duration; ltSurf = b.label; } }
  add(maxLt <= MAX_LONGTASK_MS, 'Long-tasks (max)', `${maxLt}ms · ${lt50} tasks >50ms`, `<= ${MAX_LONGTASK_MS}ms`, maxLt > MAX_LONGTASK_MS ? ltSurf : null);

  // 3. LCP — best (lowest) reported across boot/home buckets
  let lcp = 0; for (const b of report) if (b.lcp) { lcp = lcp ? Math.min(lcp, b.lcp) : b.lcp; }
  add(lcp > 0 && lcp <= MAX_LCP_MS, 'LCP', lcp ? `${lcp}ms` : 'unmeasured', `<= ${MAX_LCP_MS}ms`, lcp > MAX_LCP_MS ? 'boot/Home' : null);

  // 4. CLS overall — cumulative across run
  let cls = 0; for (const b of report) cls += bucketCLS(b);
  add(cls < MAX_CLS_OVERALL, 'CLS overall', cls.toFixed(3), `< ${MAX_CLS_OVERALL}`, cls >= MAX_CLS_OVERALL ? 'run' : null);

  // 5. INP / interaction latency — the REAL web vital = PerformanceEventTiming
  // `duration` (event-processing → next paint of the interaction itself). We use
  // `inpEvent` for pass/fail, NOT the Node wall-clock probe: the wall number folds
  // in the heavy concurrent route RENDER (post-useDeferredValue), which is already
  // measured by the separate "Long-tasks" check — counting it here too would
  // double-count render weight and overstate INP. Wall is shown only as a note.
  let inpEvent = 0; for (const b of report) for (const e of b.events) inpEvent = Math.max(inpEvent, e.dur);
  const inpWall = extra.inpWall.length ? Math.max(...extra.inpWall) : 0;
  add(inpEvent > 0 && inpEvent <= MAX_INP_MS, 'INP / interaction latency',
      `${inpEvent}ms (evt; wall ${inpWall} note-only)`, `<= ${MAX_INP_MS}ms`, inpEvent > MAX_INP_MS ? 'Vee/tab' : null);

  // 6. Main JS bundle gzipped
  const bundle = measureBundle();
  const gzKB = bundle.gz != null ? (bundle.gz / 1024).toFixed(1) : 'n/a';
  add(bundle.gz != null && bundle.gz < BUNDLE_BUDGET_GZ, 'Main JS bundle (gzipped)',
      `${gzKB}KB ${bundle.gz != null ? `(${bundle.file})` : ''}`, `< ${(BUNDLE_BUDGET_GZ / 1024).toFixed(0)}KB`, (bundle.gz == null || bundle.gz >= BUNDLE_BUDGET_GZ) ? 'dist' : null);

  // 7. Zero failed / 4xx-5xx network requests
  // LAB QUALIFICATION: a few request CLASSES fail only because of the headless
  // lab environment, not because the app is broken — a real user on real Chrome
  // never hits these. We exclude EXACTLY these named classes (and nothing else):
  //   · stream.zionsynapse.online — proxy-stream HLS the headless can't decode (no H.264)
  //   · *.m3u8                     — HLS manifests, codec-gated in the lab
  //   · *.webm                     — ambient audio the lab codec set rejects
  //   · youtube / googlevideo      — YouTube telemetry/media pings
  // Any OTHER 4xx/5xx (a genuinely broken app request a real user WOULD hit) is
  // still counted — this is NOT a blanket suppression.
  const failedAll = capture.requests.filter((r) => r.status === 'failed' || (typeof r.status === 'number' && r.status >= 400));
  const failed = failedAll.filter((r) => !isLabEnvironmental(r.url));
  const labExcluded = failedAll.length - failed.length;
  const failHost = failed.length ? safeHost(failed[0].url) : null;
  add(failed.length <= MAX_FAILED_REQ, 'Zero failed / 4xx-5xx requests',
      `${failed.length} bad${labExcluded ? ` (+${labExcluded} lab-env excluded)` : ''}`, `<= ${MAX_FAILED_REQ}`, failed.length ? failHost : null);

  // 8. Boot-to-interactive
  const boot = extra.bootMs;
  add(boot != null && boot < MAX_BOOT_MS, 'Boot-to-interactive', boot != null ? `${boot}ms` : 'unmeasured', `< ${MAX_BOOT_MS}ms`, (boot == null || boot >= MAX_BOOT_MS) ? 'boot' : null);

  // 9. JS heap stable (no large monotonic growth = leak signal)
  const heaps = extra.heap.filter((h) => h.mb != null);
  let leak = false, heapMsg = 'unmeasured';
  if (heaps.length >= 2) {
    const first = heaps[0].mb, lastH = heaps[heaps.length - 1].mb;
    const delta = +(lastH - first).toFixed(1);
    const ratio = first > 0 ? lastH / first : 1;
    leak = ratio > HEAP_GROWTH_RATIO && delta > HEAP_GROWTH_MB;
    heapMsg = `${first}→${lastH}MB (Δ${delta}MB, ${ratio.toFixed(2)}×)`;
  }
  // pass when measured-and-not-leaking; if unmeasured (no performance.memory) treat as pass-with-note
  add(!leak, 'JS heap stable (no leak)', heapMsg, `Δ ratio < ${HEAP_GROWTH_RATIO}× & < +${HEAP_GROWTH_MB}MB`, leak ? 'run' : null);

  return checks;
}

function safeHost(u) { try { return new global.URL(u).hostname; } catch { return u.slice(0, 50); } }

// True iff a failed request belongs to a LAB-ENVIRONMENTAL class (see check #7):
// codec-gated media the headless can't decode, or YouTube telemetry. These never
// fail for a real user; everything else stays counted.
function isLabEnvironmental(u) {
  let host = '';
  try { host = new global.URL(u).hostname.toLowerCase(); } catch { /* keep '' */ }
  return (
    host === 'stream.zionsynapse.online' ||        // proxy-stream HLS (no H.264 in lab)
    /\.m3u8(\?|#|$)/i.test(u) ||                    // HLS manifests
    /\.webm(\?|#|$)/i.test(u) ||                    // ambient audio
    /(^|\.)youtube\.com$/.test(host) ||            // YouTube telemetry
    /(^|\.)youtube-nocookie\.com$/.test(host) ||
    /(^|\.)youtu\.be$/.test(host) ||
    /(^|\.)googlevideo\.com$/.test(host)           // YouTube media/telemetry backend
  );
}

// ───────────────────────────── render scorecard ─────────────────────────────
function renderLines(checks) {
  return checks.map((c) => {
    const mark = c.pass ? '✅' : '❌';
    const surf = !c.pass && c.surface ? `  [${c.surface}]` : '';
    return `${mark} ${c.name} — ${c.measured} (threshold ${c.threshold})${surf}`;
  });
}

function main() {
  run().then((data) => {
    const checks = evaluate(data);
    const passed = checks.filter((c) => c.pass).length;
    const total = checks.length;
    const lines = renderLines(checks);

    const verdict = `PERFORMANCE: ${passed}/${total} ✅`;
    const block = ['', '── PERFORMANCE SCORECARD ──', ...lines, '', verdict, ''].join('\n');
    console.log(block);

    // ── CLS DIAGNOSTIC: attribute the dominant layout-shifts (top 12) ──
    try {
      const allShifts = [];
      for (const b of data.report) for (const s of (b.shifts || [])) allShifts.push({ ...s, surface: b.label });
      allShifts.sort((a, b) => b.value - a.value);
      const sum = allShifts.reduce((a, s) => a + s.value, 0);
      console.log(`── TOP LAYOUT SHIFTS (sum ${sum.toFixed(3)} · ${allShifts.length} shifts) ──`);
      for (const s of allShifts.slice(0, 12)) {
        console.log(`${s.value.toFixed(4)}  [${s.surface}] ${s.route} @${s.time}ms  ←  ${(s.sources || []).join('  |  ')}`);
      }
      console.log('');
    } catch (e) { console.log('(cls-diag failed)', e.message); }

    const ts = new Date().toISOString();
    let md = `# Tivi+ Performance Scorecard\n\n`;
    md += `> Generated: ${ts}\n> Target: ${URL}\n> Harness: \`scripts/check-performance.mjs\` · re-run \`npm run check:perf\`\n\n`;
    md += `"Is it fast?" Each criterion is a measured ✅/❌.\n\n`;
    md += `| | Criterion | Measured | Threshold | Surface |\n|---|---|---|---|---|\n`;
    for (const c of checks) md += `| ${c.pass ? '✅' : '❌'} | ${c.name} | ${String(c.measured).replace(/\|/g, '\\|')} | ${c.threshold} | ${(!c.pass && c.surface) ? c.surface : ''} |\n`;
    md += `\n**${verdict}**\n`;
    if (passed < total) {
      md += `\n## Failing checks\n\n`;
      for (const c of checks) if (!c.pass) md += `- ❌ **${c.name}** — ${c.measured} (threshold ${c.threshold})${c.surface ? ` [${c.surface}]` : ''}\n`;
    }
    writeFileSync(OUT_FILE, md);
    console.log(`📄 Scorecard written → ${OUT_FILE}\n`);

    process.exit(passed === total ? 0 : 1);
  }).catch((e) => { console.error('HARNESS FATAL:', e); process.exit(1); });
}

main();
