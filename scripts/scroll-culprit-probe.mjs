/**
 * scroll-culprit-probe.mjs — isolate the per-scroll-frame repaint cost on Home.
 * A/B toggles each full-screen scroll-reactive layer and re-measures scroll FPS.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'outputs', 'mobile');

async function measure(page) {
  return await page.evaluate(async () => {
    const slp = (ms) => new Promise((r) => setTimeout(r, ms));
    window.scrollTo(0, 0); await slp(350);
    let frames = 0, last = performance.now(), samples = [], running = true;
    function loop(now) { frames++; const dt = now - last; if (dt >= 250) { samples.push((frames*1000)/dt); frames=0; last=now; } if (running) requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
    const top = Math.min(900, document.documentElement.scrollHeight);
    for (let p = 0; p < 3; p++) { for (let y=0;y<=top;y+=18){window.scrollTo(0,y);await slp(16);} for (let y=top;y>=0;y-=18){window.scrollTo(0,y);await slp(16);} }
    running = false; await slp(50);
    const arr = samples.filter(n=>n>0&&n<130);
    return { avg: Math.round(arr.reduce((a,b)=>a+b,0)/(arr.length||1)), min: Math.round(Math.min(...arr)) };
  });
}

const exps = [
  ['A_baseline', () => {}],
  ['B_scroll-ambient OFF', () => { const e=document.getElementById('scroll-ambient'); if(e) e.style.display='none'; }],
  ['C_goggle+brand+blobs OFF', () => { ['.goggle-lens','.brand-atmosphere','.ambient-blobs'].forEach(s=>document.querySelectorAll(s).forEach(e=>e.style.display='none')); }],
  ['D_CosmicBg OFF', () => { document.querySelectorAll('.fixed.inset-0.z-0').forEach(e=>e.style.display='none'); }],
  ['E_all-backdrop-filter OFF', () => { const st=document.createElement('style'); st.id='kill-bf'; st.textContent='*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}'; document.head.appendChild(st); }],
  ['F_kill willChange', () => { const st=document.createElement('style'); st.id='kill-wc'; st.textContent='*{will-change:auto!important;}'; document.head.appendChild(st); }],
];

async function run() {
  const { browser, page } = await launchContext();
  const log = []; const P = (s)=>{console.log(s);log.push(s);};
  await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
  await sleep(600); await loginIfNeeded(page); await waitForApp(page); await sleep(2500);

  P('=== CUMULATIVE scroll-FPS culprit isolation (each step ADDS a disable) ===');
  for (const [label, fn] of exps) {
    await page.evaluate(fn);
    await sleep(700);
    const m = await measure(page);
    P(`${label}  ->  avg ${m.avg} / min ${m.min}`);
  }

  // Reset, then do SINGLE-FACTOR (only one disabled at a time vs baseline)
  P('\n=== SINGLE-FACTOR (reload between each) ===');
  const single = exps.slice(1);
  for (const [label, fn] of single) {
    await page.goto(URL + '/', { waitUntil: 'domcontentloaded' });
    await sleep(500); await loginIfNeeded(page); await waitForApp(page); await sleep(2200);
    const base = await measure(page);
    await page.evaluate(fn); await sleep(700);
    const m = await measure(page);
    P(`${label}: base ${base.avg} -> ${m.avg}  (Δ ${m.avg - base.avg})`);
  }

  writeFileSync(resolve(OUT, 'scroll-culprit.txt'), log.join('\n'));
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
