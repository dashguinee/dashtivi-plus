/**
 * idle-navpaint-probe.mjs — with the page completely IDLE (no scroll), how much
 * does the bottom-nav band repaint? Isolates the Vee orb's perpetual box-shadow
 * breathe from any scroll-driven backdrop-blur. A/B: baseline vs V-breathe OFF.
 */
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';

async function idlePaints(client, page, navTop, ms){
  const events=[]; const onData=d=>{ if(d.value) events.push(...d.value); };
  client.on('Tracing.dataCollected', onData);
  await client.send('Tracing.start',{ categories:'devtools.timeline,disabled-by-default-devtools.timeline', transferMode:'ReportEvents' });
  await sleep(ms); // sit idle
  await new Promise(async(res)=>{ client.on('Tracing.tracingComplete',res); await client.send('Tracing.end'); });
  await sleep(150);
  client.off('Tracing.dataCollected', onData);
  let total=0, nav=0;
  for(const e of events){
    if(e.name!=='Paint') continue; total++;
    const c=e.args?.data?.clip; let top=null,bottom=null;
    if(Array.isArray(c)&&c.length>=6){const ys=[c[1],c[3],c[5],c[7]].filter(n=>typeof n==='number');top=Math.min(...ys);bottom=Math.max(...ys);}
    else if(c&&typeof c==='object'){top=c.y;bottom=c.y+(c.height||0);}
    if(top!=null && bottom>navTop) nav++;
  }
  return { total, nav };
}

async function run(){
  const {browser,page,context}=await launchContext();
  const client=await context.newCDPSession(page);
  await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(700); await loginIfNeeded(page); await waitForApp(page); await sleep(3000);
  await page.evaluate(()=>window.scrollTo(0,0)); await sleep(800);
  const navTop = await page.evaluate(()=>window.innerHeight-90);

  const A = await idlePaints(client,page,navTop,4000);
  console.log('A) IDLE baseline      — total Paints:', A.total, '| nav-band Paints:', A.nav, `(${(A.nav/4).toFixed(0)}/s)`);

  await page.evaluate(()=>{const st=document.createElement('style');st.id='vab';st.textContent='[aria-label^="Vee"] div{animation:none!important;}';document.head.appendChild(st);});
  await sleep(500);
  const B = await idlePaints(client,page,navTop,4000);
  console.log('B) IDLE V-breathe off — total Paints:', B.total, '| nav-band Paints:', B.nav, `(${(B.nav/4).toFixed(0)}/s)`);

  console.log(`\nIDLE nav-band paints/sec: baseline ${(A.nav/4).toFixed(0)} -> V-breathe off ${(B.nav/4).toFixed(0)}`);
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
