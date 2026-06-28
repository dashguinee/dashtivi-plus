/**
 * trace-recalc-probe.mjs — capture a DevTools timeline trace during a Home
 * scroll and surface WHAT triggers the expensive style recalcs + biggest layers.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'outputs', 'mobile');

async function run(){
  const {browser,page,context}=await launchContext();
  const client=await context.newCDPSession(page);
  await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(600); await loginIfNeeded(page); await waitForApp(page); await sleep(2800);
  await page.evaluate(()=>window.scrollTo(0,0)); await sleep(500);

  const events=[];
  client.on('Tracing.dataCollected', (d)=>{ if(d.value) events.push(...d.value); });
  await client.send('Tracing.start',{ categories:'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking', transferMode:'ReportEvents' });

  await page.evaluate(async()=>{const slp=ms=>new Promise(r=>setTimeout(r,ms));const top=Math.min(900,document.documentElement.scrollHeight);for(let p=0;p<3;p++){for(let y=0;y<=top;y+=18){window.scrollTo(0,y);await slp(16);}for(let y=top;y>=0;y-=18){window.scrollTo(0,y);await slp(16);}}});

  await new Promise(async(res)=>{ client.on('Tracing.tracingComplete',res); await client.send('Tracing.end'); });
  await sleep(300);

  // Aggregate UpdateLayoutTree (style recalc) durations + invalidation reasons.
  let recalcCount=0, recalcDur=0, recalcMax=0, elemCounts=0;
  const reasons={};
  const invalidatedSelectors={};
  for(const e of events){
    if(e.name==='UpdateLayoutTree'){ recalcCount++; const d=e.dur||0; recalcDur+=d; if(d>recalcMax)recalcMax=d; const n=e.args?.beginData?.elementCount||e.args?.elementCount; if(n)elemCounts+=n; }
    if(e.name==='ScheduleStyleInvalidationTracking'||e.name==='StyleInvalidatorInvalidationTracking'||e.name==='StyleRecalcInvalidationTracking'){
      const data=e.args?.data||{}; const r=data.reason||'?'; reasons[r]=(reasons[r]||0)+1;
      const inv=(data.invalidationList||[]).map(x=>x.selectorPart||x.id||x.classes||'').filter(Boolean);
      (data.selectorPart?[data.selectorPart]:inv).forEach(s=>{ if(s) invalidatedSelectors[s]=(invalidatedSelectors[s]||0)+1; });
      if(data.nodeName){ const k='node:'+data.nodeName; invalidatedSelectors[k]=(invalidatedSelectors[k]||0)+1; }
    }
  }
  const log=[];
  const P=s=>{console.log(s);log.push(s);};
  P('=== TRACE: Home scroll (3 passes) ===');
  P(`UpdateLayoutTree(style recalc): count=${recalcCount}  totalDur=${(recalcDur/1000).toFixed(1)}ms  max=${(recalcMax/1000).toFixed(2)}ms  elementsTouched=${elemCounts}`);
  P(`avg elements per recalc: ${(elemCounts/(recalcCount||1)).toFixed(0)}`);
  P('\nInvalidation REASONS (count):');
  Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([k,v])=>P(`  ${v}  ${k}`));
  P('\nTop invalidated selector-parts / nodes (count):');
  Object.entries(invalidatedSelectors).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>P(`  ${v}  ${k}`));

  writeFileSync(resolve(OUT,'trace-recalc.txt'),log.join('\n'));
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
