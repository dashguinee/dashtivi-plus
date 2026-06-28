/**
 * hero-zone-probe.mjs — FOCUSED diagnosis of the HERO-VIDEO zone on Home.
 * Captures mobile screenshots of the hero zone (idle/scroll/interaction) and
 * runs an A/B FPS experiment isolating the video + blend/overlay layers.
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'outputs', 'mobile');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// rAF FPS sampler injected per-experiment; scrolls the window a fixed pattern
// and returns the average + min fps measured during the scroll.
async function measureScrollFps(page, label) {
  return await page.evaluate(async (label) => {
    const slp = (ms) => new Promise((r) => setTimeout(r, ms));
    // settle
    window.scrollTo(0, 0);
    await slp(400);
    let frames = 0, last = performance.now(), start = last, samples = [];
    let running = true;
    function loop(now) {
      frames++;
      const dt = now - last;
      if (dt >= 250) { samples.push((frames * 1000) / dt); frames = 0; last = now; }
      if (running) requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    // Scroll the TOP zone slowly back and forth (where the hero videos live).
    const top = Math.min(900, document.documentElement.scrollHeight);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y <= top; y += 18) { window.scrollTo(0, y); await slp(16); }
      for (let y = top; y >= 0; y -= 18) { window.scrollTo(0, y); await slp(16); }
    }
    running = false;
    await slp(60);
    const arr = samples.filter((n) => n > 0 && n < 130);
    const avg = arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const min = Math.min(...arr);
    return { label, avg: Math.round(avg), min: Math.round(min), n: arr.length };
  }, label);
}

// Inspect the hero zone: list the playing <video>s + the layers that blend/blur.
async function inspectZone(page) {
  return await page.evaluate(() => {
    const out = { videos: [], blendEls: [], blurEls: [], willChange: [] };
    document.querySelectorAll('video').forEach((v) => {
      const r = v.getBoundingClientRect();
      out.videos.push({
        src: (v.currentSrc || v.src || '').split('/').pop() || '(blob/hls)',
        playing: !v.paused && !v.ended && v.readyState > 2,
        rate: v.playbackRate,
        top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        cls: v.className.slice(0, 40),
      });
    });
    document.querySelectorAll('*').forEach((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const onScreen = r.top < window.innerHeight && r.bottom > 0;
      if (!onScreen) return;
      const tag = el.tagName.toLowerCase();
      const id = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).slice(0, 2).join('.');
      const desc = `${tag}${id ? '.' + id : ''}${el.id ? '#' + el.id : ''}`.slice(0, 50);
      if (s.mixBlendMode && s.mixBlendMode !== 'normal')
        out.blendEls.push({ desc, mode: s.mixBlendMode, top: Math.round(r.top), h: Math.round(r.height) });
      if (s.backdropFilter && s.backdropFilter !== 'none')
        out.blurEls.push({ desc, filter: s.backdropFilter, top: Math.round(r.top) });
      if (s.willChange && s.willChange !== 'auto')
        out.willChange.push({ desc, willChange: s.willChange, top: Math.round(r.top) });
    });
    return out;
  });
}

async function run() {
  const { browser, page } = await launchContext();
  const log = [];
  const P = (s) => { console.log(s); log.push(s); };

  await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
  // capture splash if present
  await sleep(700);
  await page.screenshot({ path: resolve(OUT, '01-splash.png') }).catch(() => {});
  await loginIfNeeded(page);
  await waitForApp(page);
  await sleep(2500); // let hero video(s) start

  // ── Screenshots ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
  await page.screenshot({ path: resolve(OUT, '02-home-hero-idle.png') }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 260));
  await sleep(700);
  await page.screenshot({ path: resolve(OUT, '03-hero-scroll-260.png') }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 520));
  await sleep(700);
  await page.screenshot({ path: resolve(OUT, '04-hero-scroll-520.png') }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  // mid-interaction: swipe the hero deck
  const box = await page.evaluate(() => {
    const el = document.querySelector('[class*="freehls"], section');
    if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 };
  });
  if (box) {
    await page.mouse.move(box.x + 120, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x - 120, box.y, { steps: 8 });
    await page.screenshot({ path: resolve(OUT, '05-hero-mid-swipe.png') }).catch(() => {});
    await page.mouse.up();
  }
  await sleep(400);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(500);
  await page.screenshot({ path: resolve(OUT, '06-nav-bottom.png') }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);

  // ── Zone inventory ──
  const zone = await inspectZone(page);
  P('\n=== HERO-ZONE INVENTORY (on-screen, top) ===');
  P('VIDEOS:'); zone.videos.forEach((v) => P('  ' + JSON.stringify(v)));
  P('mix-blend-mode layers:'); zone.blendEls.forEach((b) => P('  ' + JSON.stringify(b)));
  P('backdrop-filter layers:'); zone.blurEls.forEach((b) => P('  ' + JSON.stringify(b)));
  P('will-change layers:'); zone.willChange.forEach((b) => P('  ' + JSON.stringify(b)));

  // ── A/B FPS EXPERIMENT ──
  P('\n=== A/B SCROLL-FPS EXPERIMENT (top zone) ===');
  const a = await measureScrollFps(page, 'A_baseline');
  P('A) BASELINE (as-is): ' + JSON.stringify(a));

  // B) pause every video + kill the soft-light visor (the blend over WC video)
  await page.evaluate(() => {
    window.__paused = [];
    document.querySelectorAll('video').forEach((v) => { try { v.pause(); window.__paused.push(v); } catch {} });
    document.querySelectorAll('.wc-visor').forEach((e) => { e.style.display = 'none'; });
  });
  await sleep(500);
  const b = await measureScrollFps(page, 'B_videos_paused+visor_off');
  P('B) videos PAUSED + soft-light visor OFF: ' + JSON.stringify(b));

  // C) restore videos, only kill the soft-light visor (isolate the blend cost)
  await page.evaluate(() => {
    (window.__paused || []).forEach((v) => { try { v.play().catch(()=>{}); } catch {} });
    // visor stays off
  });
  await sleep(1200);
  const c = await measureScrollFps(page, 'C_videos_on+visor_off');
  P('C) videos PLAYING, only soft-light visor OFF: ' + JSON.stringify(c));

  // D) restore visor too (back to baseline) to confirm regression returns
  await page.evaluate(() => { document.querySelectorAll('.wc-visor').forEach((e) => { e.style.display = ''; }); });
  await sleep(800);
  const d = await measureScrollFps(page, 'D_restored_baseline');
  P('D) RESTORED baseline: ' + JSON.stringify(d));

  P('\nINTERPRETATION:');
  P(`  baseline=${a.avg} | videos+visor off=${b.avg} | only visor off=${c.avg} | restored=${d.avg}`);

  writeFileSync(resolve(OUT, 'hero-zone-probe.txt'), log.join('\n'));
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
