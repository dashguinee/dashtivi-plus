/**
 * _harness-lib.mjs — shared foundation for the Tivi+ measurement harnesses.
 * ------------------------------------------------------------------------
 * Factored out of scripts/glitch-detect.mjs so check-experience.mjs and
 * check-performance.mjs share ONE driver: the same headless chromium-1194
 * launch, the same guest login (DASH ID + PIN, wait past the splash gate),
 * the same surface-drive helpers (scrollPage / scrollCarousels / nav), and
 * the same pre-load instrumentation (layout-shift + longtask + LCP + INP
 * event-timing + rAF FPS sampler + unhandled-rejection capture).
 *
 * Both scorecard scripts import from here; tune nothing here — the thresholds
 * live as named CONSTANTS at the top of each scorecard script.
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

// ───────────────────────────── target + creds ───────────────────────────────
export const URL = process.env.GLITCH_URL || 'https://tivi.dasuperhub.com';
export const DASH_ID = process.env.GLITCH_ID || '001AAD';
export const PIN = process.env.GLITCH_PIN || '123456';
export const HEADLESS = process.env.GLITCH_HEAD ? false : true;

// Pinned local chromium (same binary glitch-detect uses).
export const CHROME = '/home/dash/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

// Mobile-first context — the real audience is on phones.
export const VIEWPORT = { width: 412, height: 915 };
export const UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Requests that hit the CATALOG/DATA layer (static JSON catalogs + Supabase
// REST). Used by the "reload-free navigation" check: a revisit to an already
// loaded route must trigger ZERO of these.
export const DATA_ENDPOINT =
  /(curator|tivi-curated|free-channels-curated|streamore|tmdb-data|logo-map|probe-results|verified\.json|channels\.json|vee\.json|\/rest\/v1\/)/i;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────── instrumentation (runs in page, pre-load) ─────────────
// Injected via addInitScript BEFORE any app code → observers are live from the
// first paint, so they catch boot-time flicker/jank.
export function instrument() {
  const H = { shifts: [], longtasks: [], fps: [], rejections: [], events: [], lcp: 0 };
  window.__h = H;

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

  // 1. LAYOUT-SHIFT — the objective flicker signal (ignore user-driven shifts).
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        const sources = (e.sources || []).map((s) => sel(s.node));
        H.shifts.push({
          value: e.value, time: Math.round(e.startTime), route: location.pathname,
          sources: sources.length ? sources : ['(no source node)'],
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* unsupported */ }

  // 2. LONGTASK — main-thread jank (>50ms).
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        H.longtasks.push({ duration: Math.round(e.duration), time: Math.round(e.startTime), route: location.pathname });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* unsupported */ }

  // 3. LCP — largest-contentful-paint (keep the latest reported value).
  try {
    new PerformanceObserver((list) => {
      const es = list.getEntries();
      const last = es[es.length - 1];
      if (last) H.lcp = Math.round(last.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* unsupported */ }

  // 4. EVENT TIMING — INP proxy. Real interactions get an interactionId; we
  //    keep their durations and read the worst as INP.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.interactionId) H.events.push({ dur: Math.round(e.duration), name: e.name, route: location.pathname });
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch { /* unsupported */ }

  // 5. FPS sampler — every ~1s window's fps (per route).
  let last = performance.now(), frames = 0;
  function loop(now) {
    frames++;
    const dt = now - last;
    if (dt >= 1000) {
      const fps = Math.round((frames * 1000) / dt);
      H.fps.push({ fps, time: Math.round(now), route: location.pathname });
      frames = 0; last = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 6. Unhandled promise rejections.
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev && ev.reason;
    H.rejections.push({ reason: String((r && (r.message || r)) || 'unknown'), route: location.pathname });
  });

  // Per-step controls. __hReset clears the per-step buffers (observers stay
  // live; LCP is global so it is NOT reset). __hDump reads a snapshot.
  window.__hReset = () => { H.shifts = []; H.longtasks = []; H.fps = []; H.rejections = []; H.events = []; };
  window.__hDump = () => ({
    shifts: H.shifts.slice(), longtasks: H.longtasks.slice(), fps: H.fps.slice(),
    rejections: H.rejections.slice(), events: H.events.slice(), lcp: H.lcp,
  });
}

// ───────────────────────────── launch + capture ─────────────────────────────
export async function launchContext({ reducedMotion = false } = {}) {
  const launchOpts = { headless: HEADLESS };
  if (existsSync(CHROME)) launchOpts.executablePath = CHROME;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: VIEWPORT, userAgent: UA, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  await context.addInitScript(instrument);
  const page = await context.newPage();
  return { browser, context, page };
}

export function newBucket(label) {
  return {
    label, shifts: [], longtasks: [], fps: [], rejections: [], events: [], lcp: 0,
    consoleErrors: [], consoleWarnings: [], pageErrors: [], failedRequests: [],
  };
}

// Wire console / pageerror / network capture. Returns shared state:
//   state.cur     → the active bucket (set by makeStep)
//   requests      → every response/failure {url,type,status,why,ts}
//   seenConsole   → run-wide de-duped console error/warning counts
export function makeCapture(page) {
  const state = { cur: null };
  const requests = [];
  const seenConsole = new Map();

  page.on('console', (msg) => {
    const t = msg.type();
    if (t !== 'error' && t !== 'warning') return;
    const text = msg.text();
    seenConsole.set(text, (seenConsole.get(text) || 0) + 1);
    if (!state.cur) return;
    const arr = t === 'error' ? state.cur.consoleErrors : state.cur.consoleWarnings;
    if (!arr.includes(text)) arr.push(text);
  });
  page.on('pageerror', (err) => {
    const text = `${err.name}: ${err.message}`;
    if (state.cur && !state.cur.pageErrors.includes(text)) state.cur.pageErrors.push(text);
  });
  page.on('requestfailed', (req) => {
    const f = req.failure();
    const rec = { url: req.url(), type: req.resourceType(), status: 'failed', why: (f && f.errorText) || 'failed', ts: Date.now() };
    requests.push(rec);
    if (state.cur) state.cur.failedRequests.push(rec);
  });
  page.on('response', (res) => {
    const s = res.status();
    const req = res.request();
    const rec = { url: res.url(), type: req.resourceType(), status: s, why: res.statusText() || '', ts: Date.now() };
    requests.push(rec);
    if (s >= 400 && state.cur) state.cur.failedRequests.push(rec);
  });

  return { state, requests, seenConsole };
}

// step(label, fn): reset observers, run fn, pull the browser-side buffers into
// a fresh bucket, push to `report`. Returns the bucket.
export function makeStep(page, capture, report) {
  return async function step(label, fn) {
    const bucket = newBucket(label);
    capture.state.cur = bucket;
    try { await page.evaluate(() => window.__hReset && window.__hReset()); } catch { /**/ }
    try { await fn(bucket); }
    catch (e) { bucket.pageErrors.push(`HARNESS-STEP-ERROR: ${e.message}`); }
    await sleep(400); // let trailing shifts/tasks land
    try {
      const d = await page.evaluate(() => (window.__hDump ? window.__hDump() : null));
      if (d) { bucket.shifts = d.shifts; bucket.longtasks = d.longtasks; bucket.fps = d.fps;
               bucket.rejections = d.rejections; bucket.events = d.events; bucket.lcp = d.lcp; }
    } catch { /**/ }
    report.push(bucket);
    capture.state.cur = null;
    return bucket;
  };
}

// ───────────────────────────── drive helpers ────────────────────────────────
export async function scrollPage(page) {
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

export async function scrollCarousels(page) {
  await page.evaluate(async () => {
    const slp = (ms) => new Promise((r) => setTimeout(r, ms));
    const els = [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 40;
    }).slice(0, 14);
    for (const el of els) {
      const w = el.scrollWidth;
      for (let x = 0; x <= w; x += el.clientWidth * 0.8) { el.scrollLeft = x; await slp(45); }
      for (let x = w; x >= 0; x -= el.clientWidth) { el.scrollLeft = x; await slp(35); }
      el.scrollLeft = 0;
    }
  });
  await sleep(300);
}

// Wait until the app shell is past the splash + auth gate AND has content.
export async function waitForApp(page, timeout = 14000) {
  try {
    await page.waitForFunction(() => {
      const pin = document.querySelector('input[placeholder="PIN"]');
      const imgs = document.querySelectorAll('img').length;
      const navBtns = document.querySelectorAll('nav button, [class*="navbar"] button').length;
      return !pin && (imgs > 8 || navBtns >= 3);
    }, { timeout });
  } catch { /* capture whatever state we are in */ }
  await sleep(600);
}

// Perform the DASH ID + PIN guest login if the gate is showing.
export async function loginIfNeeded(page) {
  try {
    await page.waitForSelector('input[placeholder="PIN"]', { timeout: 12000 });
  } catch { return; }
  const idIn = page.locator('input[placeholder*="DASH ID"], input[placeholder*="DASH"]').first();
  const pinIn = page.locator('input[placeholder="PIN"]').first();
  if (await idIn.count()) {
    await idIn.fill(DASH_ID);
    await pinIn.fill(PIN);
    await pinIn.press('Enter');
  }
}

// Click a nav tab by accessible label, fallback to a hard goto.
export async function nav(page, label, fallbackPath) {
  const btn = page.locator(`button:has-text("${label}"), a:has-text("${label}")`).first();
  try {
    if (await btn.count()) { await btn.click({ timeout: 4000 }); await sleep(1200); return true; }
  } catch { /* fall through */ }
  await page.goto(URL + fallbackPath, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(1500);
  return false;
}

// Tap the Vee cycling navigator (client-side route change, NO reload).
// Returns true if a Vee control was found + tapped.
export async function tapVee(page) {
  const vee = page.locator('[aria-label*="Vee"], button:has-text("Vee")').first();
  try {
    if (await vee.count()) { await vee.click({ timeout: 3000 }); return true; }
  } catch { /* not tappable */ }
  return false;
}

// Count DOM content (cards/rows) vs skeletons on the current surface.
export async function countContent(page) {
  return await page.evaluate(() => {
    const cards = document.querySelectorAll(
      'img[src]:not([src=""]), [class*="card"], [class*="Card"], [class*="poster"], [class*="Poster"], article, [role="listitem"], [role="button"]'
    ).length;
    const rows = document.querySelectorAll('section, [class*="row"], [class*="rail"], [class*="carousel"], [class*="Row"]').length;
    const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"], .animate-pulse').length;
    const errBoundary = /Transmission lost|signal dropped/i.test(document.body.innerText || '');
    return { cards, rows, skeletons, errBoundary };
  });
}

// Per-surface CLS = cumulative shift value in that bucket.
export const bucketCLS = (b) => b.shifts.reduce((a, s) => a + s.value, 0);
// Worst single shifting element selector in a bucket (for fail messages).
export function worstShiftSource(b) {
  let worst = null, max = 0;
  for (const s of b.shifts) if (s.value > max) { max = s.value; worst = (s.sources && s.sources[0]) || null; }
  return worst;
}
