/**
 * pulse-ab-probe.mjs — prove the --pulse document-wide style thrash.
 * Measures Home scroll style-recalc time A) as-is  B) with --pulse consumers
 * neutralized (so rewriting --pulse on :root invalidates nothing).
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));

async function metrics(client){const{metrics}=await client.send('Performance.getMetrics');const m={};metrics.forEach(x=>m[x.name]=x.value);return m;}
async function scrollTop(page){await page.evaluate(async()=>{const slp=ms=>new Promise(r=>setTimeout(r,ms));const top=Math.min(900,document.documentElement.scrollHeight);for(let p=0;p<3;p++){for(let y=0;y<=top;y+=18){window.scrollTo(0,y);await slp(16);}for(let y=top;y>=0;y-=18){window.scrollTo(0,y);await slp(16);}}window.scrollTo(0,0);});}

async function measureRecalc(client, page, label){
  const b=await metrics(client); await scrollTop(page); const a=await metrics(client);
  const recalcs=a.RecalcStyleCount-b.RecalcStyleCount;
  const dur=+(a.RecalcStyleDuration-b.RecalcStyleDuration).toFixed(3);
  return {label, recalcs, dur, perRecalc:+(dur/(recalcs||1)*1000).toFixed(3)};
}

async function run(){
  const {browser,page,context}=await launchContext();
  const client=await context.newCDPSession(page); await client.send('Performance.enable');
  await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(600); await loginIfNeeded(page); await waitForApp(page); await sleep(2800);
  await page.evaluate(()=>window.scrollTo(0,0)); await sleep(500);

  const A=await measureRecalc(client,page,'A_baseline');
  console.log('A) baseline:', JSON.stringify(A));

  // Neutralize EVERY --pulse consumer with constant !important values, so the
  // rAF loop writing --pulse to :root no longer invalidates any computed style.
  await page.evaluate(()=>{
    const st=document.createElement('style'); st.id='freeze-pulse';
    st.textContent=`
      .goggle-lens{opacity:0.85!important;}
      [data-goggle-zone="lit"] .card-surface,[data-goggle-zone="lit"] .card-hero,[data-goggle-zone="lit"] .card-glass{
        box-shadow:0 2px 8px rgba(0,0,0,0.4),0 0 0 0.5px rgba(255,255,255,0.05),0 0 6px rgba(157,78,221,0.05)!important;}
    `;
    document.head.appendChild(st);
  });
  await sleep(600);
  const B=await measureRecalc(client,page,'B_pulse_consumers_frozen');
  console.log('B) --pulse consumers frozen:', JSON.stringify(B));

  // Also: stop the proximity IO opacity writes by removing goggle attrs? leave as-is.
  console.log('\nRESULT: recalc time', A.dur+'s ->', B.dur+'s', '| per-recalc', A.perRecalc+'ms ->', B.perRecalc+'ms');
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
