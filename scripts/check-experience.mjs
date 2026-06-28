#!/usr/bin/env node
/**
 * check-experience.mjs — EXPERIENCE SCORECARD for Tivi+
 * -----------------------------------------------------
 * "Does it look + feel right — no flash, no break?" Drives the live site
 * headless (chromium-1194, guest login, the 11-surface walk) and turns the
 * felt experience into a CHECKMARK scorecard: one ✅/❌ per criterion with the
 * measured value + threshold, ending in `EXPERIENCE: N/M ✅`. Exit 0 iff all
 * pass — so it can gate CI later.
 *
 * RUN:  npm run check:exp     (writes outputs/check-experience.md + prints it)
 * ENV:  GLITCH_URL / GLITCH_ID / GLITCH_PIN / GLITCH_HEAD (see _harness-lib.mjs)
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  URL, DATA_ENDPOINT, sleep, launchContext, makeCapture, makeStep,
  scrollPage, scrollCarousels, waitForApp, loginIfNeeded, nav, tapVee,
  countContent, bucketCLS, worstShiftSource,
} from './_harness-lib.mjs';

// ════════════════════════ THRESHOLDS (tune here) ════════════════════════════
const MAX_CLS_PER_SURFACE   = 0.02;  // flicker-free: worst per-surface CLS must be under this
const MAX_CONSOLE_ERRORS    = 0;     // zero runtime console errors
const MAX_REACT_WARNINGS    = 0;     // zero dup-key / hook-order / act() warnings
const MAX_PAGE_CRASHES      = 0;     // zero pageerrors + unhandledrejections + ErrorBoundary trips
const MAX_IMAGE_4XX5XX      = 0;     // every logo/poster image must load
const MIN_CONTENT_PER_SURF  = 4;     // each content surface must render >= this many cards/rows
const MAX_PLAYER_TTFF_MS    = 8000;  // player must paint a frame (readyState>=2) within this
const MAX_REVISIT_DATA_REQ  = 0;     // reload-free: 0 catalog/data fetches on an already-visited route
const MAX_REDUCED_MOTION_ANIMS = 2;  // with prefers-reduced-motion, running key animations must be ~off
// ═════════════════════════════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'outputs');
const OUT_FILE = resolve(OUT_DIR, 'check-experience.md');

// React red-flag console patterns (duplicate-key / hook-order / act()).
const REACT_PATTERNS = [
  /unique "key"/i, /Each child in a list/i, /Rendered fewer hooks/i, /Rendered more hooks/i,
  /change in the order of Hooks/i, /Cannot update a component .* while rendering/i,
  /not wrapped in act/i, /Maximum update depth/i, /validateDOMNesting/i,
];

// Content surfaces that must render real cards/rows (not boot/transient steps).
const CONTENT_SURFACES = new Set(['Home', 'Movies', 'Series', 'Live', 'Library', 'DaHub']);

async function run() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await launchContext();
  const capture = makeCapture(page);
  const report = [];
  const step = makeStep(page, capture, report);

  const extra = {
    playerTTFF: null,        // ms to video readyState>=2 (null = never)
    avcSupported: null,      // can THIS browser even decode H.264/AAC? (null=unprobed)
    revisitDataReq: null,    // # data-endpoint fetches on a revisit
    revisitRoute: '',
    reducedMotionAnims: null,
    contentPerSurface: {},   // surface -> {cards, skeletons, errBoundary}
  };

  console.log(`\n🎬 EXPERIENCE SCORECARD → ${URL}\n`);

  // ── boot + login ───────────────────────────────────────────────────────────
  await step('boot+login', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await loginIfNeeded(page);
    await waitForApp(page);
    await sleep(1500);
  });

  // ── Home ────────────────────────────────────────────────────────────────────
  await step('Home', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1500);
    extra.contentPerSurface.Home = await countContent(page);
    await scrollPage(page); await scrollCarousels(page);
  });

  // ── World Cup block ──────────────────────────────────────────────────────────
  await step('World Cup block', async () => {
    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(400);
    await page.evaluate(async () => {
      const slp = (ms) => new Promise((r) => setTimeout(r, ms));
      const deck = [...document.querySelectorAll('*')].find((el) => {
        const s = getComputedStyle(el);
        return (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 40;
      });
      if (deck) { for (let i = 0; i < 4; i++) { deck.scrollLeft += deck.clientWidth; await slp(120); } deck.scrollLeft = 0; }
    });
    await sleep(1500);
  });

  // ── Movies + scroll ──────────────────────────────────────────────────────────
  await step('Movies', async () => {
    await page.goto(URL + '/movies', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1200);
    extra.contentPerSurface.Movies = await countContent(page);
    await scrollPage(page); await scrollCarousels(page);
  });

  // ── Movies — open title + scrub ──────────────────────────────────────────────
  await step('Movies open+scrub', async () => {
    try {
      const poster = page.locator('main img, [class*="poster"], [class*="card"] img').first();
      if (await poster.count()) { await poster.click({ timeout: 4000 }); await sleep(4000); }
      const range = page.locator('input[type="range"]').first();
      if (await range.count()) {
        const box = await range.boundingBox();
        if (box) for (const f of [0.2, 0.6, 0.4, 0.8]) { await page.mouse.click(box.x + box.width * f, box.y + box.height / 2); await sleep(500); }
      }
    } catch { /* may not open as VOD */ }
    await page.keyboard.press('Escape').catch(() => {});
    await page.goBack().catch(() => {});
    await sleep(1200);
  });

  // ── Series + scroll ──────────────────────────────────────────────────────────
  await step('Series', async () => {
    await page.goto(URL + '/series', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1200);
    extra.contentPerSurface.Series = await countContent(page);
    await scrollPage(page); await scrollCarousels(page);
  });

  // ── Live — open a free channel, measure time-to-first-frame ──────────────────
  await step('Live', async () => {
    await page.goto(URL + '/live', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1200);
    extra.contentPerSurface.Live = await countContent(page);
    // Probe codec support: IPTV is H.264/AAC in MP4/HLS. Headless chromium-1194
    // ships WITHOUT the proprietary H.264/AAC decoders, so MediaSource can never
    // paint an IPTV frame here even though real Chrome/Android/Safari do. We use
    // this to qualify the TTFF check as N/A (lab limit) vs ❌ (real bug) below.
    extra.avcSupported = await page.evaluate(() => {
      try {
        return !!(window.MediaSource &&
          MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'));
      } catch { return null; }
    });
    try {
      const ch = page.locator('main img, [class*="card"], [role="button"]').first();
      if (await ch.count()) {
        await ch.click({ timeout: 4000 });
        const t0 = Date.now();
        // poll for a real painted frame (HAVE_CURRENT_DATA = readyState>=2)
        const ttff = await page.waitForFunction(() => {
          const v = document.querySelector('video');
          return v && v.readyState >= 2 ? Math.round(performance.now()) : false;
        }, { timeout: MAX_PLAYER_TTFF_MS + 1000 }).then(() => Date.now() - t0).catch(() => null);
        extra.playerTTFF = ttff;
        await sleep(2500);
      }
    } catch { /* no playable card */ }
    await page.keyboard.press('Escape').catch(() => {});
    await page.goBack().catch(() => {});
    await sleep(1200);
  });

  // ── Vee — cycle the hero navigator ───────────────────────────────────────────
  await step('Vee cycle', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1000);
    for (let i = 0; i < 5; i++) { if (!(await tapVee(page))) break; await sleep(1300); }
  });

  // ── Reload-free navigation: revisit an already-visited route via CLIENT nav ──
  // Vee cycles Movies→Series→Live→Home client-side (no reload). We tap to Movies
  // (1st visit, fetches allowed), cycle a full loop back to Movies, and count the
  // catalog/data fetches during that 2nd Movies visit — must be ZERO.
  await step('Reload-free revisit', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page); await sleep(1200);
    // 1st visit: advance Vee once → Movies (let its data load)
    await tapVee(page); await sleep(2500);
    const firstRoute = await page.evaluate(() => location.pathname);
    extra.revisitRoute = firstRoute;
    // cycle a full loop: Series → Live → Home → back to Movies
    for (let i = 0; i < 4; i++) { await tapVee(page); await sleep(1500); }
    // we are now revisiting `firstRoute` — snapshot, settle, count data reqs
    const startIdx = capture.requests.length;
    await sleep(2500);
    const fresh = capture.requests.slice(startIdx).filter((r) => DATA_ENDPOINT.test(r.url));
    extra.revisitDataReq = fresh.length;
  });

  await browser.close();

  // ── Reduced-motion honored: fresh context with prefers-reduced-motion=reduce.
  // Count RUNNING CSS/Web animations on Home — should be ~0 if motion is honored.
  try {
    const rm = await launchContext({ reducedMotion: true });
    await rm.page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await loginIfNeeded(rm.page);
    await waitForApp(rm.page); await sleep(2500);
    extra.reducedMotionAnims = await rm.page.evaluate(() => {
      try {
        return (document.getAnimations() || []).filter((a) => a.playState === 'running').length;
      } catch { return -1; }
    });
    await rm.browser.close();
  } catch { extra.reducedMotionAnims = -1; }

  return { report, capture, extra };
}

// ───────────────────────────── evaluate checks ──────────────────────────────
function evaluate({ report, capture, extra }) {
  const checks = [];
  // na=true → criterion is Not Applicable in THIS environment (lab physically
  // can't test it); it is excluded from the n/N denominator, not counted as a fail.
  const add = (pass, name, measured, threshold, surface, na = false) => checks.push({ pass, name, measured, threshold, surface, na });

  // 1. Flicker-free — worst per-surface CLS
  let worstSurf = null, worstCLS = 0, worstEl = null;
  for (const b of report) { const c = bucketCLS(b); if (c > worstCLS) { worstCLS = c; worstSurf = b.label; worstEl = worstShiftSource(b); } }
  add(worstCLS < MAX_CLS_PER_SURFACE, 'Flicker-free (max CLS/surface)',
      `${worstCLS.toFixed(3)}${worstEl ? ` @ ${worstEl}` : ''}`, `< ${MAX_CLS_PER_SURFACE}`, worstCLS >= MAX_CLS_PER_SURFACE ? worstSurf : null);

  // 2. Zero console errors
  let totalErrors = 0; for (const b of report) totalErrors += b.consoleErrors.length;
  const uniqErrors = new Set(); for (const b of report) for (const e of b.consoleErrors) uniqErrors.add(e);
  add(totalErrors <= MAX_CONSOLE_ERRORS, 'Zero console errors', `${uniqErrors.size} unique`, `<= ${MAX_CONSOLE_ERRORS}`,
      totalErrors > MAX_CONSOLE_ERRORS ? [...uniqErrors][0]?.slice(0, 60) : null);

  // 3. Zero React warnings
  let reactWarns = 0; const reactHits = [];
  for (const [text, count] of capture.seenConsole) if (REACT_PATTERNS.some((re) => re.test(text))) { reactWarns += count; reactHits.push(text.slice(0, 50)); }
  add(reactWarns <= MAX_REACT_WARNINGS, 'Zero React warnings (key/hook/act)', `${reactWarns}`, `<= ${MAX_REACT_WARNINGS}`,
      reactWarns > MAX_REACT_WARNINGS ? reactHits[0] : null);

  // 4. Zero page crashes / ErrorBoundary trips
  let crashes = 0, crashSurf = null;
  for (const b of report) {
    const n = b.pageErrors.length + b.rejections.length;
    if (n) { crashes += n; if (!crashSurf) crashSurf = b.label; }
  }
  for (const [s, c] of Object.entries(extra.contentPerSurface)) if (c.errBoundary) { crashes++; if (!crashSurf) crashSurf = s; }
  add(crashes <= MAX_PAGE_CRASHES, 'Zero crashes / ErrorBoundary / rejections', `${crashes}`, `<= ${MAX_PAGE_CRASHES}`, crashes > MAX_PAGE_CRASHES ? crashSurf : null);

  // 5. All images load (zero 4xx/5xx image requests)
  const badImgs = capture.requests.filter((r) => typeof r.status === 'number' && r.status >= 400 &&
    (r.type === 'image' || /\.(png|jpe?g|webp|svg|gif|avif)(\?|$)/i.test(r.url)));
  add(badImgs.length <= MAX_IMAGE_4XX5XX, 'All images load (no 4xx/5xx)', `${badImgs.length} failed`, `<= ${MAX_IMAGE_4XX5XX}`,
      badImgs.length ? new global.URL(badImgs[0].url).hostname : null);

  // 6. Every surface renders real content
  let emptySurf = null, minCards = Infinity;
  for (const [s, c] of Object.entries(extra.contentPerSurface)) {
    if (!CONTENT_SURFACES.has(s)) continue;
    const real = c.cards - 0; // cards count (skeletons excluded by class)
    if (real < minCards) { minCards = real; if (real < MIN_CONTENT_PER_SURF) emptySurf = s; }
  }
  if (minCards === Infinity) minCards = 0;
  add(minCards >= MIN_CONTENT_PER_SURF, 'Every surface renders content', `min ${minCards} cards`, `>= ${MIN_CONTENT_PER_SURF}`, emptySurf);

  // 7. Player paints a frame within TTFF budget.
  // LAB QUALIFICATION: headless chromium-1194 has no H.264/AAC decoder, so a real
  // IPTV stream can NEVER reach readyState>=2 here regardless of app health. When
  // the codec is genuinely absent we mark this N/A (excluded from the denominator,
  // verify on a real device) — but ONLY then: if avc1 IS supported and TTFF still
  // fails, that's a real bug and we keep it ❌.
  const ttff = extra.playerTTFF;
  if (extra.avcSupported === false) {
    add(true, 'Player paints a frame (TTFF)',
        'N/A — lab chromium has no H.264/AAC codec (avc1 unsupported); verify on a real device',
        `< ${MAX_PLAYER_TTFF_MS}ms`, null, true);
  } else {
    add(ttff != null && ttff < MAX_PLAYER_TTFF_MS, 'Player paints a frame (TTFF)',
        ttff == null ? 'no frame / infinite spinner' : `${ttff}ms`, `< ${MAX_PLAYER_TTFF_MS}ms`, ttff == null || ttff >= MAX_PLAYER_TTFF_MS ? 'Live' : null);
  }

  // 8. Reload-free navigation
  const rv = extra.revisitDataReq;
  add(rv != null && rv <= MAX_REVISIT_DATA_REQ, 'Navigation reload-free (revisit)',
      rv == null ? 'not measured' : `${rv} data fetches`, `<= ${MAX_REVISIT_DATA_REQ}`, rv > MAX_REVISIT_DATA_REQ ? extra.revisitRoute : null);

  // 9. Reduced-motion honored
  const rma = extra.reducedMotionAnims;
  add(rma >= 0 && rma <= MAX_REDUCED_MOTION_ANIMS, 'Reduced-motion honored',
      rma < 0 ? 'unmeasured' : `${rma} running anims`, `<= ${MAX_REDUCED_MOTION_ANIMS}`, rma > MAX_REDUCED_MOTION_ANIMS ? 'Home' : null);

  return checks;
}

// ───────────────────────────── render scorecard ─────────────────────────────
function renderLines(checks) {
  return checks.map((c) => {
    const mark = c.na ? '⚪' : (c.pass ? '✅' : '❌');
    const surf = !c.na && !c.pass && c.surface ? `  [${c.surface}]` : '';
    return `${mark} ${c.name} — ${c.measured} (threshold ${c.threshold})${surf}`;
  });
}

function main() {
  run().then((data) => {
    const checks = evaluate(data);
    // N/A checks (lab physically can't test) are excluded from the denominator.
    const applicable = checks.filter((c) => !c.na);
    const naCount = checks.length - applicable.length;
    const passed = applicable.filter((c) => c.pass).length;
    const total = applicable.length;
    const lines = renderLines(checks);

    const verdict = `EXPERIENCE: ${passed}/${total} ✅${naCount ? ` (+${naCount} N/A — lab limit)` : ''}`;
    const block = ['', '── EXPERIENCE SCORECARD ──', ...lines, '', verdict, ''].join('\n');
    console.log(block);

    // markdown
    const ts = new Date().toISOString();
    let md = `# Tivi+ Experience Scorecard\n\n`;
    md += `> Generated: ${ts}\n> Target: ${URL}\n> Harness: \`scripts/check-experience.mjs\` · re-run \`npm run check:exp\`\n\n`;
    md += `"Does it look + feel right — no flash, no break?" Each criterion is a measured ✅/❌.\n\n`;
    md += `| | Criterion | Measured | Threshold | Surface |\n|---|---|---|---|---|\n`;
    for (const c of checks) md += `| ${c.na ? '⚪' : (c.pass ? '✅' : '❌')} | ${c.name} | ${String(c.measured).replace(/\|/g, '\\|')} | ${c.threshold} | ${(!c.na && !c.pass && c.surface) ? c.surface : ''} |\n`;
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
