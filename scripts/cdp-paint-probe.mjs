/**
 * cdp-paint-probe.mjs — device-independent structural evidence for the Home
 * hero zone: compositing-layer count + breakdown of where a scroll spends time
 * (style recalc / layout / paint / raster), via the Chrome DevTools Protocol.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'outputs', 'mobile');

async function metrics(client) {
  const { metrics } = await client.send('Performance.getMetrics');
  const m = {}; metrics.forEach((x) => (m[x.name] = x.value));
  return m;
}
const pick = (m) => ({
  RecalcStyleCount: m.RecalcStyleCount, RecalcStyleDuration: +(m.RecalcStyleDuration||0).toFixed(3),
  LayoutCount: m.LayoutCount, LayoutDuration: +(m.LayoutDuration||0).toFixed(3),
  ScriptDuration: +(m.ScriptDuration||0).toFixed(3),
  TaskDuration: +(m.TaskDuration||0).toFixed(3),
  LayoutObjects: m.LayoutObjects, Nodes: m.Nodes,
});

async function scrollTop(page) {
  await page.evaluate(async () => {
    const slp = (ms) => new Promise((r) => setTimeout(r, ms));
    const top = Math.min(900, document.documentElement.scrollHeight);
    for (let p = 0; p < 3; p++) { for (let y=0;y<=top;y+=18){window.scrollTo(0,y);await slp(16);} for (let y=top;y>=0;y-=18){window.scrollTo(0,y);await slp(16);} }
    window.scrollTo(0,0);
  });
}

async function run() {
  const { browser, page, context } = await launchContext();
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('LayerTree.enable');

  const log = []; const P = (s)=>{console.log(s);log.push(s);};
  await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
  await sleep(600); await loginIfNeeded(page); await waitForApp(page); await sleep(2800);
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(500);

  // ── Compositing layers (idle, hero zone visible) ──
  const layers = await new Promise((res) => {
    const onLayers = (e) => { client.off('LayerTree.layerTreeDidChange', onLayers); res(e.layers || []); };
    client.on('LayerTree.layerTreeDidChange', onLayers);
    // trigger an emit
    page.evaluate(() => window.scrollBy(0, 1)).then(() => page.evaluate(() => window.scrollTo(0,0)));
    setTimeout(() => res([]), 3000);
  });
  let totalArea = 0, bigLayers = [];
  for (const l of layers) {
    const area = (l.width||0) * (l.height||0);
    totalArea += area;
    if (area > 100000) bigLayers.push({ w: l.width, h: l.height, paint: l.paintCount, mem: Math.round(area*4/1024) });
  }
  P(`=== COMPOSITING LAYERS on Home hero (idle) ===`);
  P(`total layers: ${layers.length} | large (>100k px): ${bigLayers.length}`);
  bigLayers.sort((a,b)=>b.w*b.h - a.w*a.h).slice(0,14).forEach((l)=>P('  '+JSON.stringify(l)));

  // ── Where a Home scroll spends time ──
  const before = pick(await metrics(client));
  await scrollTop(page);
  const after = pick(await metrics(client));
  P(`\n=== HOME scroll cost (3 passes, top zone) ===`);
  P(`StyleRecalcs: ${after.RecalcStyleCount - before.RecalcStyleCount}  (+${(after.RecalcStyleDuration - before.RecalcStyleDuration).toFixed(3)}s)`);
  P(`Layouts:      ${after.LayoutCount - before.LayoutCount}  (+${(after.LayoutDuration - before.LayoutDuration).toFixed(3)}s)`);
  P(`Script:       +${(after.ScriptDuration - before.ScriptDuration).toFixed(3)}s`);
  P(`Task(total):  +${(after.TaskDuration - before.TaskDuration).toFixed(3)}s`);
  P(`LayoutObjects: ${after.LayoutObjects} | DOM Nodes: ${after.Nodes}`);

  // ── Same scroll on Movies (the passing surface) for contrast ──
  await page.goto(URL + '/movies', { waitUntil: 'domcontentloaded' });
  await waitForApp(page); await sleep(1800); await page.evaluate(()=>window.scrollTo(0,0)); await sleep(400);
  const mb = pick(await metrics(client));
  await scrollTop(page);
  const ma = pick(await metrics(client));
  P(`\n=== MOVIES scroll cost (contrast — passing surface) ===`);
  P(`StyleRecalcs: ${ma.RecalcStyleCount - mb.RecalcStyleCount}  (+${(ma.RecalcStyleDuration - mb.RecalcStyleDuration).toFixed(3)}s)`);
  P(`Layouts:      ${ma.LayoutCount - mb.LayoutCount}  (+${(ma.LayoutDuration - mb.LayoutDuration).toFixed(3)}s)`);
  P(`Script:       +${(ma.ScriptDuration - mb.ScriptDuration).toFixed(3)}s`);
  P(`LayoutObjects: ${ma.LayoutObjects} | DOM Nodes: ${ma.Nodes}`);

  writeFileSync(resolve(OUT, 'cdp-paint.txt'), log.join('\n'));
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
