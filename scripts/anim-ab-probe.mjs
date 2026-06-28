/**
 * anim-ab-probe.mjs — confirm the perpetual micro-animations are the recalc cost.
 * Measures Home scroll style-recalc time A) as-is  B) with the named always-on
 * animations frozen (ping dots, metal shimmer, beam-sweep, blob-morph, wc-visor).
 */
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';

async function metrics(client){const{metrics}=await client.send('Performance.getMetrics');const m={};metrics.forEach(x=>m[x.name]=x.value);return m;}
async function scrollTop(page){await page.evaluate(async()=>{const slp=ms=>new Promise(r=>setTimeout(r,ms));const top=Math.min(900,document.documentElement.scrollHeight);for(let p=0;p<3;p++){for(let y=0;y<=top;y+=18){window.scrollTo(0,y);await slp(16);}for(let y=top;y>=0;y-=18){window.scrollTo(0,y);await slp(16);}}window.scrollTo(0,0);});}
async function measure(client,page){const b=await metrics(client);await scrollTop(page);const a=await metrics(client);return{recalcs:a.RecalcStyleCount-b.RecalcStyleCount,dur:+(a.RecalcStyleDuration-b.RecalcStyleDuration).toFixed(2)};}

async function run(){
  const {browser,page,context}=await launchContext();
  const client=await context.newCDPSession(page); await client.send('Performance.enable');
  await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(600); await loginIfNeeded(page); await waitForApp(page); await sleep(2800);
  await page.evaluate(()=>window.scrollTo(0,0)); await sleep(500);

  const A=await measure(client,page);
  console.log('A) baseline:', JSON.stringify(A));

  // Freeze the named perpetual animations (keeps geometry, stops the per-frame ticking).
  await page.evaluate(()=>{
    const st=document.createElement('style'); st.id='freeze-anim';
    st.textContent=`
      .animate-ping{animation:none!important;}
      .animate-pulse{animation:none!important;}
      .tivi-count-metal{animation:none!important;background-position:0 0!important;}
      .ambient-blob{animation:none!important;}
      .wc-visor{animation:none!important;}
      [class*="freehls"] *{animation:none!important;}
    `;
    document.head.appendChild(st);
  });
  await sleep(700);
  const B=await measure(client,page);
  console.log('B) micro-anims frozen:', JSON.stringify(B));

  // C) freeze ONLY the ping dots (the single biggest offender) — isolate it.
  await page.evaluate(()=>{document.getElementById('freeze-anim').textContent='.animate-ping{animation:none!important;}';});
  await sleep(600);
  const C=await measure(client,page);
  console.log('C) only animate-ping frozen:', JSON.stringify(C));

  console.log(`\nRESULT recalc-time: baseline ${A.dur}s | all-micro-anims frozen ${B.dur}s | only-ping frozen ${C.dur}s`);
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
