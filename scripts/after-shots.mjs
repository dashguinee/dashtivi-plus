import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { URL, sleep, launchContext, loginIfNeeded, waitForApp } from './_harness-lib.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'outputs', 'mobile');
const {browser,page}=await launchContext();
await page.goto(URL+'/',{waitUntil:'domcontentloaded'}); await sleep(700); await loginIfNeeded(page); await waitForApp(page); await sleep(2800);
await page.evaluate(()=>window.scrollTo(0,0)); await sleep(800);
await page.screenshot({path:resolve(OUT,'after-02-home-hero-idle.png')});
await page.evaluate(()=>window.scrollTo(0,260)); await sleep(700);
await page.screenshot({path:resolve(OUT,'after-03-hero-scroll-260.png')});
await page.evaluate(()=>window.scrollTo(0,0)); await sleep(500);
const box=await page.evaluate(()=>{const el=document.querySelector('[class*="freehls"], section');if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
if(box){await page.mouse.move(box.x+120,box.y);await page.mouse.down();await page.mouse.move(box.x-120,box.y,{steps:8});await page.screenshot({path:resolve(OUT,'after-05-hero-mid-swipe.png')});await page.mouse.up();}
console.log('after shots saved');
await browser.close();
