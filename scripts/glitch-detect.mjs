#!/usr/bin/env node
/**
 * glitch-detect.mjs — SYSTEMATIC GLITCH-DETECTION HARNESS for Tivi+
 * ------------------------------------------------------------------
 * Stop guessing at glitches — MEASURE them. A flicker is a measurable event:
 * an unexpected layout-shift, a wasteful re-render, or a dropped frame.
 *
 * This harness drives the LIVE site headless, instruments the page BEFORE load
 * (PerformanceObserver for layout-shift + longtask, plus an rAF FPS sampler),
 * captures every console error/warning, page error, unhandled rejection and
 * failed/4xx-5xx request, walks every surface, and writes a severity-ranked
 * report to outputs/glitch-report.md.
 *
 * RE-RUN:   npm run glitch          (from /home/dash/tivi-plus)
 *      or:  node scripts/glitch-detect.mjs
 *
 * ENV overrides:
 *   GLITCH_URL   target origin            (default https://tivi.dasuperhub.com)
 *   GLITCH_ID    DASH ID                  (default 001AAD)
 *   GLITCH_PIN   PIN                      (default 123456)
 *   GLITCH_HEAD  set =1 to run headed
 *
 * Playwright is resolved from /home/dash/node_modules (Node walks up the tree).
 * Chrome binary: pinned to the local ms-playwright chromium-1194 if present.
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'outputs');
const OUT_FILE = resolve(OUT_DIR, 'glitch-report.md');

const URL = process.env.GLITCH_URL || 'https://tivi.dasuperhub.com';
const DASH_ID = process.env.GLITCH_ID || '001AAD';
const PIN = process.env.GLITCH_PIN || '123456';
const HEADLESS = process.env.GLITCH_HEAD ? false : true;

const CHROME = '/home/dash/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

// ───────────────────────── instrumentation (runs in page, pre-load) ─────────
// Everything here is injected via addInitScript BEFORE any app code, so the
// observers are live from the very first paint — they catch boot-time flicker.
function instrument() {
  const G = {
    shifts: [],      // { value, time, route, sources: [selector] }
    longtasks: [],   // { duration, time, route, attribution }
    fpsDips: [],     // { fps, time, route }
    rejections: [],  // { reason, time, route }
  };
  window.__glitch = G;

  // Build a short, stable-ish selector for a shifting node.
  function sel(node) {
    if (!node || node.nodeType !== 1) return '(non-element)';
    let el = node, parts = [];
    for (let i = 0; i < 3 && el && el.nodeType === 1; i++) {
      let s = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(s + '#' + el.id); break; }
      if (typeof el.className === 'string' && el.className.trim()) {
        const c = el.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (c) s += '.' + c;
      }
      parts.unshift(s);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }

  // 1. LAYOUT-SHIFT — the objective flicker/jump signal. Ignore hadRecentInput
  //    (those are user-driven and expected).
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        const sources = (e.sources || []).map((s) => sel(s.node));
        G.shifts.push({
          value: e.value,
          time: Math.round(e.startTime),
          route: location.pathname,
          sources: sources.length ? sources : ['(no source node)'],
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* unsupported */ }

  // 2. LONGTASK — main-thread jank (>50ms) with attribution.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const attr = (e.attribution || [])
          .map((a) => `${a.name || 'script'}:${a.containerName || a.containerType || ''}`)
          .join(', ');
        G.longtasks.push({
          duration: Math.round(e.duration),
          time: Math.round(e.startTime),
          route: location.pathname,
          attribution: attr || '(unattributed)',
        });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* unsupported */ }

  // 3. FPS sampler — flag any 1s window that drops below 50fps (dropped frames).
  let last = performance.now(), frames = 0;
  function loop(now) {
    frames++;
    const dt = now - last;
    if (dt >= 1000) {
      const fps = Math.round((frames * 1000) / dt);
      if (fps < 50) G.fpsDips.push({ fps, time: Math.round(now), route: location.pathname });
      frames = 0; last = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 4. Unhandled promise rejections (surfaced per-step).
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev && ev.reason;
    G.rejections.push({
      reason: String((reason && (reason.message || reason)) || 'unknown'),
      time: Math.round(performance.now()),
      route: location.pathname,
    });
  });

  // Per-step controls — reset() clears buffers (observers stay live), dump() reads.
  window.__glitchReset = () => { G.shifts = []; G.longtasks = []; G.fpsDips = []; G.rejections = []; };
  window.__glitchDump = () => ({
    shifts: G.shifts.slice(), longtasks: G.longtasks.slice(),
    fpsDips: G.fpsDips.slice(), rejections: G.rejections.slice(),
  });
}

// ───────────────────────────── Node-side driver ─────────────────────────────
const report = [];   // one bucket per surface/step
let cur = null;      // current bucket (console/network handlers push here)
const seenConsole = new Map(); // global de-dupe count across run

function newBucket(label) {
  return { label, shifts: [], longtasks: [], fpsDips: [], rejections: [],
           consoleErrors: [], consoleWarnings: [], pageErrors: [], failedRequests: [] };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const launchOpts = { headless: HEADLESS };
  if (existsSync(CHROME)) launchOpts.executablePath = CHROME;

  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },               // mobile-first (the real audience)
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
               '(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  await context.addInitScript(instrument);

  const page = await context.newPage();

  // ── console / page-error / network capture (tagged to the active bucket) ──
  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const text = msg.text();
    seenConsole.set(text, (seenConsole.get(text) || 0) + 1);
    if (!cur) return;
    const arr = type === 'error' ? cur.consoleErrors : cur.consoleWarnings;
    if (!arr.includes(text)) arr.push(text);
  });
  page.on('pageerror', (err) => {
    const text = `${err.name}: ${err.message}`;
    if (cur && !cur.pageErrors.includes(text)) cur.pageErrors.push(text);
  });
  page.on('requestfailed', (req) => {
    if (!cur) return;
    const f = req.failure();
    cur.failedRequests.push({ status: 'failed', url: req.url(), why: (f && f.errorText) || 'failed' });
  });
  page.on('response', (res) => {
    const s = res.status();
    if (s < 400 || !cur) return;
    cur.failedRequests.push({ status: s, url: res.url(), why: res.statusText() || '' });
  });

  // step(label, fn): reset observers, run, pull browser-side buffers into bucket.
  async function step(label, fn) {
    const bucket = newBucket(label);
    cur = bucket;
    try { await page.evaluate(() => window.__glitchReset && window.__glitchReset()); } catch { /**/ }
    try { await fn(); }
    catch (e) { bucket.pageErrors.push(`HARNESS-STEP-ERROR: ${e.message}`); }
    await sleep(400); // let trailing shifts/tasks land
    try {
      const dump = await page.evaluate(() => window.__glitchDump ? window.__glitchDump() : null);
      if (dump) { bucket.shifts = dump.shifts; bucket.longtasks = dump.longtasks;
                  bucket.fpsDips = dump.fpsDips; bucket.rejections = dump.rejections; }
    } catch { /**/ }
    report.push(bucket);
    cur = null;
    console.log(`  ✓ ${label}  (shifts:${bucket.shifts.length} longtask:${bucket.longtasks.length} ` +
                `err:${bucket.consoleErrors.length} warn:${bucket.consoleWarnings.length} ` +
                `fpsDip:${bucket.fpsDips.length} 4xx5xx:${bucket.failedRequests.length})`);
  }

  // helper: fast vertical scroll down then back up
  async function scrollPage() {
    await page.evaluate(async () => {
      const h = document.scrollingElement || document.documentElement;
      const max = h.scrollHeight;
      for (let y = 0; y <= max; y += Math.max(300, window.innerHeight * 0.9)) {
        window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80));
      }
      for (let y = max; y >= 0; y -= Math.max(400, window.innerHeight)) {
        window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await sleep(300);
  }

  // helper: scroll every horizontal carousel both directions
  async function scrollCarousels() {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const els = [...document.querySelectorAll('*')].filter((el) => {
        const s = getComputedStyle(el);
        return (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 40;
      }).slice(0, 14);
      for (const el of els) {
        const w = el.scrollWidth;
        for (let x = 0; x <= w; x += el.clientWidth * 0.8) { el.scrollLeft = x; await sleep(45); }
        for (let x = w; x >= 0; x -= el.clientWidth) { el.scrollLeft = x; await sleep(35); }
        el.scrollLeft = 0;
      }
    });
    await sleep(300);
  }

  // helper: wait for the app shell to be past splash + login gate, with content.
  // The SplashScreen runs ~3-6s and the auth gate appears after it, so a naive
  // fixed sleep races the boot. Wait until the PIN gate is gone AND content is up.
  async function waitForApp(timeout = 14000) {
    try {
      await page.waitForFunction(() => {
        const pin = document.querySelector('input[placeholder="PIN"]');
        const imgs = document.querySelectorAll('img').length;
        const navBtns = document.querySelectorAll('nav button, [class*="navbar"] button').length;
        return !pin && (imgs > 8 || navBtns >= 3);
      }, { timeout });
    } catch { /* fall through — capture whatever state we're in */ }
    await sleep(600);
  }

  // helper: perform the DASH ID + PIN login if the gate is showing
  async function loginIfNeeded() {
    try {
      await page.waitForSelector('input[placeholder="PIN"]', { timeout: 12000 });
    } catch { return; } // already authed (gate not shown) or stuck
    const idIn = page.locator('input[placeholder*="DASH ID"], input[placeholder*="DASH"]').first();
    const pinIn = page.locator('input[placeholder="PIN"]').first();
    if (await idIn.count()) {
      await idIn.fill(DASH_ID);
      await pinIn.fill(PIN);
      await pinIn.press('Enter');
    }
  }

  // helper: click a nav tab by accessible label, fallback to URL goto
  async function nav(label, fallbackPath) {
    const btn = page.locator(`button:has-text("${label}"), a:has-text("${label}")`).first();
    try {
      if (await btn.count()) { await btn.click({ timeout: 4000 }); await sleep(1200); return true; }
    } catch { /* fall through */ }
    await page.goto(URL + fallbackPath, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(1500);
    return false;
  }

  console.log(`\n🎯 GLITCH HARNESS → ${URL}  (id ${DASH_ID})\n`);

  // ── STEP: boot + login (cold load → splash → auth gate → first content) ───
  await step('boot+login (cold load + auth)', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await loginIfNeeded();
    await waitForApp();        // measures splash-exit + auth + first catalog paint
    await sleep(1500);
  });

  // ── STEP: Home — first paint settled, then scroll + carousels ─────────────
  await step('Home — scroll + carousels', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await sleep(1500);
    await scrollPage();
    await scrollCarousels();
  });

  // ── STEP: World Cup block (top hero zone of Home) ─────────────────────────
  await step('Home — World Cup block', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(400);
    // settle the WC hero / backdrop, then nudge the hero deck horizontally
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const deck = [...document.querySelectorAll('*')].find((el) => {
        const s = getComputedStyle(el);
        return (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 40;
      });
      if (deck) { for (let i = 0; i < 4; i++) { deck.scrollLeft += deck.clientWidth; await sleep(120); } deck.scrollLeft = 0; }
    });
    await sleep(1500); // watch the WC backdrop loop for shift/jank
  });

  // ── STEP: Movies (route load) + scroll ────────────────────────────────────
  await step('Movies — route load + scroll', async () => {
    await page.goto(URL + '/movies', { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await sleep(1200);
    await scrollPage();
    await scrollCarousels();
  });

  // ── STEP: open a movie + scrub seek bar ───────────────────────────────────
  await step('Movies — open title + scrub seek', async () => {
    const card = page.locator('img, [role="button"], button').filter({ hasText: '' });
    try {
      // click first visible poster-ish element in the grid
      const poster = page.locator('main img, [class*="poster"], [class*="card"] img').first();
      if (await poster.count()) { await poster.click({ timeout: 4000 }); await sleep(4000); }
      // scrub: drag any range/scrubber, else simulate keyboard seek
      const range = page.locator('input[type="range"]').first();
      if (await range.count()) {
        const box = await range.boundingBox();
        if (box) {
          for (const f of [0.2, 0.6, 0.4, 0.8]) {
            await page.mouse.click(box.x + box.width * f, box.y + box.height / 2);
            await sleep(500);
          }
        }
      } else {
        // VOD double-tap seek fallback: tap right edge a few times
        const vp = page.viewportSize();
        for (let i = 0; i < 3; i++) { await page.mouse.dblclick(vp.width * 0.85, vp.height * 0.5); await sleep(700); }
      }
    } catch { /* title may not open as VOD — captured as step error */ }
    // close the player surface (back gesture / Esc)
    await page.keyboard.press('Escape').catch(() => {});
    await page.goBack().catch(() => {});
    await sleep(1200);
  });

  // ── STEP: Series (route load) + scroll ────────────────────────────────────
  await step('Series — route load + scroll', async () => {
    await page.goto(URL + '/series', { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await sleep(1200);
    await scrollPage();
    await scrollCarousels();
  });

  // ── STEP: Live + open player on a free channel (~5s buffering watch) ──────
  await step('Live — open free channel (~5s)', async () => {
    await page.goto(URL + '/live', { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await sleep(1200);
    try {
      const ch = page.locator('main img, [class*="card"], [role="button"]').first();
      if (await ch.count()) { await ch.click({ timeout: 4000 }); await sleep(5500); } // watch buffering/error
    } catch { /* no playable card */ }
    await page.keyboard.press('Escape').catch(() => {});
    await page.goBack().catch(() => {});
    await sleep(1200);
  });

  // ── STEP: Vee tab cycle (Movies → Series → Live → Home, in-app) ───────────
  await step('Vee — cycle tabs', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await sleep(1000);
    const vee = page.locator('button:has-text("Vee"), [aria-label*="Vee"]').first();
    for (let i = 0; i < 5; i++) {
      try {
        if (await vee.count()) { await vee.click({ timeout: 3000 }); }
        else { break; }
      } catch { /* keep cycling */ }
      await sleep(1300); // observe the hero swap transition for flicker
    }
  });

  // ── STEP: Library (route load) + scroll ───────────────────────────────────
  await step('Library — route load + scroll', async () => {
    await nav('Biblio', '/library');
    await waitForApp();
    await sleep(1400);
    await scrollPage();
    await scrollCarousels();
  });

  // ── STEP: DaHub (route load) + scroll ─────────────────────────────────────
  await step('DaHub — route load + scroll', async () => {
    await nav('Dahub', '/hub');
    await waitForApp();
    await sleep(1400);
    await scrollPage();
    await scrollCarousels();
  });

  // ── STEP: search open + close ─────────────────────────────────────────────
  await step('Search — open + type + close', async () => {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await sleep(1000);
    try {
      const trigger = page.locator('[aria-label="Search channels"], [aria-label*="Search"]').first();
      if (await trigger.count()) {
        await trigger.click({ timeout: 4000 }); await sleep(800);
        const input = page.locator('input[placeholder*="Search"]').first();
        if (await input.count()) { await input.fill('foot'); await sleep(1200); }
        const close = page.locator('[aria-label="Close search"]').first();
        if (await close.count()) await close.click({ timeout: 3000 });
        else await page.keyboard.press('Escape');
        await sleep(800);
      }
    } catch { /* search not reachable */ }
  });

  await browser.close();
  writeReport();
}

// ───────────────────────────── report writer ────────────────────────────────
function rankSev(b) {
  // worst-of severity for a bucket → for ordering the summary
  let s = 0;
  if (b.pageErrors.length) s = Math.max(s, 5);
  for (const sh of b.shifts) { if (sh.value >= 0.1) s = Math.max(s, 4); else if (sh.value >= 0.05) s = Math.max(s, 3); else if (sh.value >= 0.01) s = Math.max(s, 2); }
  if (b.consoleErrors.length || b.rejections.length) s = Math.max(s, 4);
  for (const lt of b.longtasks) { if (lt.duration >= 200) s = Math.max(s, 4); else if (lt.duration >= 100) s = Math.max(s, 3); else s = Math.max(s, 2); }
  for (const fd of b.fpsDips) { if (fd.fps < 30) s = Math.max(s, 3); else s = Math.max(s, 2); }
  for (const fr of b.failedRequests) { if (typeof fr.status === 'number' && fr.status >= 500) s = Math.max(s, 4); else s = Math.max(s, 2); }
  if (b.consoleWarnings.length) s = Math.max(s, 2);
  return s;
}
const SEV = ['NONE', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function bucketCLS(b) { return b.shifts.reduce((a, s) => a + s.value, 0); }

// ── STATIC layer: run the react-hooks ESLint pass and summarise the violations.
// rules-of-hooks (errors) = the conditional-hook / #310 crash class.
// exhaustive-deps (warnings) = stale-closure deps → effects on wrong value / flicker.
function runLint() {
  let out;
  try {
    out = execSync('npx eslint "src/**/*.{ts,tsx}" --format json', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { out = e.stdout || ''; } // eslint exits non-zero when it finds problems
  let files = [];
  try { files = JSON.parse(out); } catch { return `\n## Static layer — ESLint react-hooks\n\n_Lint run failed; run \`npm run lint\` manually._\n`; }
  const rulesOfHooks = [], exhaustiveDeps = [];
  for (const f of files) {
    const rel = f.filePath.replace(ROOT + '/', '');
    for (const m of f.messages || []) {
      if (m.ruleId === 'react-hooks/rules-of-hooks') rulesOfHooks.push(`${rel}:${m.line} — ${m.message.split('.')[0]}.`);
      else if (m.ruleId === 'react-hooks/exhaustive-deps') exhaustiveDeps.push(`${rel}:${m.line} — ${m.message.slice(0, 150)}`);
    }
  }
  let md = `\n## Static layer — ESLint react-hooks (\`npm run lint\`)\n\n`;
  md += `**${rulesOfHooks.length} \`rules-of-hooks\` errors** (conditional/early-return hooks — the #310 crash class) · `;
  md += `**${exhaustiveDeps.length} \`exhaustive-deps\` warnings** (stale-closure deps → flicker).\n\n`;
  md += `### rules-of-hooks — CRITICAL (fix first)\n\n`;
  md += rulesOfHooks.length ? rulesOfHooks.map((x) => `- 🛑 \`${x}\``).join('\n') + '\n' : `_None._\n`;
  md += `\n### exhaustive-deps — stale-dep warnings\n\n`;
  md += exhaustiveDeps.length ? exhaustiveDeps.map((x) => `- ⚠️ \`${x}\``).join('\n') + '\n' : `_None._\n`;
  return md;
}

function writeReport() {
  const ts = new Date().toISOString();
  let md = `# Tivi+ Glitch Report\n\n`;
  md += `> Generated: ${ts}\n> Target: ${URL}\n> Harness: \`scripts/glitch-detect.mjs\` · re-run \`npm run glitch\`\n\n`;
  md += `A flicker = a measured event. Signals: **layout-shift** (visual jump),`;
  md += ` **longtask** (>50ms main-thread jank), **FPS dip** (<50fps), **console error/warning**,`;
  md += ` **page error**, **unhandled rejection**, **4xx/5xx request**.\n\n`;

  // ── aggregate: worst shifting elements across the whole run ──
  const elAgg = new Map(); // selector -> { total, count, max }
  for (const b of report) for (const s of b.shifts) for (const sel of s.sources) {
    const cur = elAgg.get(sel) || { total: 0, count: 0, max: 0 };
    cur.total += s.value; cur.count++; cur.max = Math.max(cur.max, s.value);
    elAgg.set(sel, cur);
  }
  const topEls = [...elAgg.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 12);

  // ── ranked surfaces ──
  const ranked = report.map((b) => ({ b, sev: rankSev(b), cls: bucketCLS(b) }))
                       .sort((a, b) => b.sev - a.sev || b.cls - a.cls);

  md += `## Severity-ranked surfaces\n\n`;
  md += `| Surface | Severity | CLS | shifts | longtask(max) | fps dips | errors | warns | 4xx/5xx |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;
  for (const { b, sev, cls } of ranked) {
    const maxLt = b.longtasks.reduce((m, t) => Math.max(m, t.duration), 0);
    md += `| ${b.label} | **${SEV[sev]}** | ${cls.toFixed(3)} | ${b.shifts.length} | ${maxLt}ms | ${b.fpsDips.length} | ${b.consoleErrors.length} | ${b.consoleWarnings.length} | ${b.failedRequests.length} |\n`;
  }

  md += `\n## Top shifting elements (the flicker suspects)\n\n`;
  if (topEls.length === 0) md += `_No layout-shifts captured (ignoring hadRecentInput)._\n`;
  else {
    md += `| Element (selector) | total CLS | max single | occurrences |\n|---|---|---|---|\n`;
    for (const [sel, v] of topEls) md += `| \`${sel}\` | ${v.total.toFixed(4)} | ${v.max.toFixed(4)} | ${v.count} |\n`;
  }

  // ── per-surface detail ──
  md += `\n## Per-surface detail\n`;
  for (const { b, sev, cls } of ranked) {
    md += `\n### ${b.label} — ${SEV[sev]} (CLS ${cls.toFixed(3)})\n\n`;

    const shifts = [...b.shifts].sort((a, c) => c.value - a.value).slice(0, 8);
    if (shifts.length) {
      md += `**Layout-shifts (ranked):**\n\n`;
      for (const s of shifts) md += `- \`${s.value.toFixed(4)}\` @${s.time}ms → ${s.sources.map((x) => '`' + x + '`').join(', ')}\n`;
    }
    const lts = [...b.longtasks].sort((a, c) => c.duration - a.duration).slice(0, 6);
    if (lts.length) {
      md += `\n**Long-tasks:**\n\n`;
      for (const t of lts) md += `- \`${t.duration}ms\` @${t.time}ms — ${t.attribution}\n`;
    }
    if (b.fpsDips.length) {
      md += `\n**FPS dips (<50):** ${b.fpsDips.map((f) => f.fps).sort((a, c) => a - c).slice(0, 8).join(', ')} fps\n`;
    }
    if (b.pageErrors.length) { md += `\n**Page errors:**\n\n`; for (const e of b.pageErrors) md += `- 🛑 ${e}\n`; }
    if (b.rejections.length) { md += `\n**Unhandled rejections:**\n\n`; for (const r of b.rejections) md += `- ${r.reason}\n`; }
    if (b.consoleErrors.length) { md += `\n**Console errors:**\n\n`; for (const e of b.consoleErrors.slice(0, 12)) md += `- ${e.replace(/\n/g, ' ').slice(0, 240)}\n`; }
    if (b.consoleWarnings.length) { md += `\n**Console warnings:**\n\n`; for (const w of b.consoleWarnings.slice(0, 12)) md += `- ${w.replace(/\n/g, ' ').slice(0, 240)}\n`; }
    if (b.failedRequests.length) {
      md += `\n**Failed / 4xx-5xx requests:**\n\n`;
      for (const f of b.failedRequests.slice(0, 12)) md += `- [${f.status}] ${f.url.slice(0, 120)} ${f.why}\n`;
    }
    if (!shifts.length && !lts.length && !b.fpsDips.length && !b.pageErrors.length &&
        !b.consoleErrors.length && !b.consoleWarnings.length && !b.failedRequests.length && !b.rejections.length) {
      md += `_Clean — no measured glitches._\n`;
    }
  }

  // ── React-specific console scan across run ──
  const reactPatterns = [
    /unique "key"/i, /Rendered fewer hooks/i, /Rendered more hooks/i, /change in the order of Hooks/i,
    /Cannot update a component .* while rendering/i, /not wrapped in act/i, /Maximum update depth/i,
    /Each child in a list/i, /validateDOMNesting/i,
  ];
  const reactHits = [];
  for (const [text, count] of seenConsole) {
    if (reactPatterns.some((re) => re.test(text))) reactHits.push(`(${count}×) ${text.replace(/\n/g, ' ').slice(0, 220)}`);
  }
  md += `\n## React red-flag console scan (whole run)\n\n`;
  md += reactHits.length ? reactHits.map((h) => `- 🚩 ${h}`).join('\n') + '\n'
                         : `_None of the React hook-order / duplicate-key / act() / re-render patterns fired at runtime. ` +
                           `(The static layer below catches the conditional-hook class the runtime path didn't trigger.)_\n`;

  // ── static ESLint layer appended to the same report ──
  console.log('  · running ESLint react-hooks static pass…');
  md += runLint();

  writeFileSync(OUT_FILE, md);
  console.log(`\n📄 Report written → ${OUT_FILE}\n`);
}

main().catch((e) => { console.error('HARNESS FATAL:', e); process.exit(1); });
