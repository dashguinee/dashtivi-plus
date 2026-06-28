/**
 * verify-fix.mjs — paired Home-scroll measurement for the glitch fix.
 * Reports: scroll FPS (in-page rAF) + style-recalc count/time (CDP) on Home,
 * plus compositing-layer count. Target via GLITCH_URL. Tag via LABEL.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { appendFileSync } from 'node:fs';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const LABEL = process.env.LABEL || 'run';

async function metrics(client){const{metrics}=await client.send('Performance.getMetrics');const m={};metrics.forEach(x=>m[x.name]=x.value);return m;}

async function run(){
  const {browser,page,context}=await launchContext();
  const client=await context.newCDPSession(page); await client.send('Performance.enable'); await client.send('LayerTree.enable');
  await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(800); await loginIfNeeded(page); await waitForApp(page); await sleep(3000);
  await page.evaluate(()=>window.scrollTo(0,0)); await sleep(600);

  // layer count
  const layerCount = await new Promise((res)=>{const f=e=>{client.off('LayerTree.layerTreeDidChange',f);res((e.layers||[]).length);};client.on('LayerTree.layerTreeDidChange',f);page.evaluate(()=>window.scrollBy(0,1)).then(()=>page.evaluate(()=>window.scrollTo(0,0)));setTimeout(()=>res(-1),3000);});

  // paired FPS + recalc during one scripted scroll of the top zone
  const before = await metrics(client);
  const fps = await page.evaluate(async()=>{
    const slp=ms=>new Promise(r=>setTimeout(r,ms));
    window.scrollTo(0,0); await slp(300);
    let frames=0,last=performance.now(),samples=[],run=true;
    function loop(now){frames++;const dt=now-last;if(dt>=250){samples.push((frames*1000)/dt);frames=0;last=now;}if(run)requestAnimationFrame(loop);}
    requestAnimationFrame(loop);
    const top=Math.min(900,document.documentElement.scrollHeight);
    for(let p=0;p<3;p++){for(let y=0;y<=top;y+=18){window.scrollTo(0,y);await slp(16);}for(let y=top;y>=0;y-=18){window.scrollTo(0,y);await slp(16);}}
    run=false;await slp(50);window.scrollTo(0,0);
    const a=samples.filter(n=>n>0&&n<130);
    return {avg:Math.round(a.reduce((x,y)=>x+y,0)/(a.length||1)),min:Math.round(Math.min(...a))};
  });
  const after = await metrics(client);
  const recalcs = after.RecalcStyleCount-before.RecalcStyleCount;
  const recalcDur = +(after.RecalcStyleDuration-before.RecalcStyleDuration).toFixed(2);

  const line = `[${LABEL}] FPS avg=${fps.avg} min=${fps.min} | recalc=${recalcs} time=${recalcDur}s | layers=${layerCount} | url=${URL}`;
  console.log(line);
  appendFileSync(resolve(__dirname,'..','outputs','mobile','verify-fix.log'), line+'\n');
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
