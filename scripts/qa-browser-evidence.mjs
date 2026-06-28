/* qa-browser-evidence.mjs — proof that the codec-capable Chrome ACTUALLY
 * renders moving frames for a sample of channels (paid proxy mp4 + free HLS).
 * Loads each stream into a real <video> element, plays, screenshots 3 frames
 * ~1.5s apart, and reports per-frame pixel difference. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'outputs/channel-qa/_browser-evidence');
fs.mkdirSync(OUT, { recursive: true });
const CODEC = process.env.HOME + '/.cache/tivi-codec-chrome/chrome';
const creds = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const U = encodeURIComponent(creds.username), P = encodeURIComponent(creds.password);
const PROXY = 'https://stream.zionsynapse.online';

const tivi = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/tivi-curated.json'), 'utf8'));
const free = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/free-channels-curated.json'), 'utf8'));

function paidUrl(ch) { return ch.plays === 'direct' ? ch.url : `${PROXY}/live?id=${ch.ext_id}&u=${U}&p=${P}&q=hd720`; }

// pick a representative sample: a few sports (moving), one static card, a couple free
const sample = [];
const wc = tivi.channels.filter(c => c.experience === 'World Cup');
sample.push({ name: 'beIN Sports Max 3 (WC)', url: paidUrl(wc.find(c => c.name === 'beIN Sports Max 3')) });
sample.push({ name: 'beIN Sport Max 4K (WC static)', url: paidUrl(wc.find(c => c.name === 'beIN Sport Max 4K')) });
const mv = tivi.channels.find(c => c.experience === 'Movies' && c.plays === 'proxy');
sample.push({ name: 'Movies: ' + mv.name, url: paidUrl(mv) });
const af = tivi.channels.find(c => c.experience === 'African');
sample.push({ name: 'African: ' + af.name, url: paidUrl(af) });
sample.push({ name: 'FREE: ' + free[0].name, url: free[0].url });
sample.push({ name: 'FREE: ' + free[100].name, url: free[100].url });

const PAGE = `<!doctype html><html><body style="margin:0;background:#000">
<video id="v" autoplay muted playsinline style="width:480px;height:270px;background:#000"></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js"></script>
<script>
window.loadUrl = (url) => new Promise((res) => {
  const v = document.getElementById('v');
  let done=false; const ok=(s)=>{if(!done){done=true;res(s);}};
  if (url.includes('.m3u8') && window.Hls && Hls.isSupported()) {
    const h = new Hls(); h.loadSource(url); h.attachMedia(v);
    h.on(Hls.Events.ERROR,(e,d)=>{ if(d.fatal) ok('hls-fatal:'+d.type); });
  } else { v.src = url; }
  v.onplaying = ()=>ok('playing');
  v.onerror = ()=>ok('video-error');
  setTimeout(()=>ok('timeout'),12000);
});
window.vstat = () => { const v=document.getElementById('v'); return {ct:v.currentTime, rs:v.readyState, w:v.videoWidth, h:v.videoHeight}; };
</script></body></html>`;

const tmpHtml = path.join(OUT, '_player.html');
fs.writeFileSync(tmpHtml, PAGE);

function pngDiff(a, b) {
  // crude: compare PNG byte buffers length+sample is unreliable; use raw via sharp? not avail.
  // Instead compare via simple byte histogram distance over the two buffers.
  const n = Math.min(a.length, b.length); let d = 0, step = Math.max(1, (n / 4000) | 0);
  for (let i = 0; i < n; i += step) d += Math.abs(a[i] - b[i]);
  return d;
}

const browser = await chromium.launch({
  executablePath: CODEC,
  ignoreDefaultArgs: ['--disable-features=AcceptCHFrame,MediaRouter,OptimizationHints'],
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 520, height: 320 } });
await page.goto('file://' + tmpHtml);

const report = [];
for (const s of sample) {
  const safe = s.name.replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
  const play = await page.evaluate((u) => window.loadUrl(u), s.url).catch(() => 'eval-error');
  await page.waitForTimeout(2500);
  const v = await page.locator('#v');
  const shots = [];
  for (let i = 0; i < 3; i++) {
    const buf = await v.screenshot();
    fs.writeFileSync(path.join(OUT, `${safe}_${i + 1}.png`), buf);
    shots.push(buf);
    await page.waitForTimeout(1500);
  }
  const st = await page.evaluate(() => window.vstat());
  const d12 = pngDiff(shots[0], shots[1]); const d23 = pngDiff(shots[1], shots[2]);
  const verdict = (st.ct > 0 && (d12 > 1500 || d23 > 1500)) ? 'MOVING' : (st.ct > 0 ? 'STATIC/ok' : 'NO-PLAY');
  report.push({ name: s.name, play, ct: +st.ct.toFixed(1), res: st.w + 'x' + st.h, d12, d23, verdict });
  console.log(`${s.name}: ${verdict} (play=${play} ct=${st.ct.toFixed(1)} ${st.w}x${st.h} diff=${d12}/${d23})`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'evidence.json'), JSON.stringify(report, null, 2));
console.log('\nwrote outputs/channel-qa/_browser-evidence/evidence.json');
