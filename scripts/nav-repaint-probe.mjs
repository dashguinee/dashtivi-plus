/**
 * nav-repaint-probe.mjs — does a HORIZONTAL carousel swipe repaint the bottom
 * nav + Vee orb? Traces Paint events and buckets those intersecting the bottom-
 * nav band. A/B: baseline vs nav-backdrop-blur OFF + vee-breathe (box-shadow) OFF.
 */
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';

async function swipeRails(page){
  // Find horizontal scroll rails + the hero deck, swipe them left/right a few times.
  await page.evaluate(async()=>{
    const slp=ms=>new Promise(r=>setTimeout(r,ms));
    const rails=[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return (s.overflowX==='auto'||s.overflowX==='scroll')&&el.scrollWidth>el.clientWidth+40;}).slice(0,3);
    for(let pass=0;pass<2;pass++){
      for(const el of rails){const w=el.scrollWidth;for(let x=0;x<=w;x+=el.clientWidth*0.8){el.scrollLeft=x;await slp(24);}for(let x=w;x>=0;x-=el.clientWidth*0.8){el.scrollLeft=x;await slp(24);}}
    }
  });
}

async function tracePaints(client, page, navTop){
  const events=[]; const onData=d=>{ if(d.value) events.push(...d.value); };
  client.on('Tracing.dataCollected', onData);
  await client.send('Tracing.start',{ categories:'devtools.timeline,disabled-by-default-devtools.timeline', transferMode:'ReportEvents' });
  await swipeRails(page);
  await new Promise(async(res)=>{ const done=()=>res(); client.on('Tracing.tracingComplete',done); await client.send('Tracing.end'); });
  await sleep(200);
  client.off('Tracing.dataCollected', onData);
  let totalPaint=0, navPaint=0;
  for(const e of events){
    if(e.name!=='Paint') continue; totalPaint++;
    const c=e.args?.data?.clip; // [x1,y1,x2,y1,x2,y2,x1,y2] or {x,y,width,height}
    let top=null,bottom=null;
    if(Array.isArray(c)&&c.length>=6){ const ys=[c[1],c[3],c[5],c[7]].filter(n=>typeof n==='number'); top=Math.min(...ys); bottom=Math.max(...ys); }
    else if(c&&typeof c==='object'){ top=c.y; bottom=c.y+(c.height||0); }
    if(top!=null && bottom>navTop) navPaint++;
  }
  return { totalPaint, navPaint };
}

async function run(){
  const {browser,page,context}=await launchContext();
  const client=await context.newCDPSession(page);
  await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(700); await loginIfNeeded(page); await waitForApp(page); await sleep(2800);
  await page.evaluate(()=>window.scrollTo(0,0)); await sleep(500);
  const navTop = await page.evaluate(()=>window.innerHeight-90); // bottom-nav band

  const A = await tracePaints(client,page,navTop);
  console.log('A) baseline          — total Paints:', A.totalPaint, '| nav-band Paints:', A.navPaint);

  // C) only nav backdrop-blur off
  await page.evaluate(()=>{const st=document.createElement('style');st.id='nav-ab';st.textContent='.backdrop-blur-lg{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}';document.head.appendChild(st);});
  await sleep(500);
  const C = await tracePaints(client,page,navTop);
  console.log('C) only nav-blur off  — total Paints:', C.totalPaint, '| nav-band Paints:', C.navPaint);

  // D) only V box-shadow breathe off (restore nav blur)
  await page.evaluate(()=>{document.getElementById('nav-ab').textContent='[aria-label^="Vee"] div{animation:none!important;}';});
  await sleep(500);
  const D = await tracePaints(client,page,navTop);
  console.log('D) only V-breathe off — total Paints:', D.totalPaint, '| nav-band Paints:', D.navPaint);

  console.log(`\nnav-band paints: baseline ${A.navPaint} | nav-blur off ${C.navPaint} | V-breathe off ${D.navPaint}`);

  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
