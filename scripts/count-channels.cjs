const a = require('../src/data/africa_channels.json');
const i = require('../src/data/iptv_channels.json');
const v = require('../src/data/verified_streams.json');
const n = require('../src/data/new_sources.json');
const s = new Set();
let c = 0;
a.verified_channels.forEach(x => { if (!s.has(x.id)) { s.add(x.id); c++; } });
['guinea_channels','senegal_channels','ivory_coast_channels','south_africa_free'].forEach(k =>
  (a[k] || []).forEach(x => { if (!s.has(x.id)) { s.add(x.id); c++; } })
);
(a.mena_cached || []).forEach(x => { if (!x.needsProxy && !s.has(x.id)) { s.add(x.id); c++; } });
i.forEach(x => { if (s.has(x.id)) return; const u = x.url.split('?')[0]; if (s.has(u)) return; s.add(x.id); s.add(u); c++; });
v.forEach(x => { if (s.has(x.id)) return; const u = x.url.split('?')[0]; if (s.has(u)) return; s.add(x.id); s.add(u); c++; });
let na = 0;
n.forEach(x => { if (s.has(x.id)) return; const u = x.url.split('?')[0]; if (s.has(u)) return; s.add(x.id); s.add(u); c++; na++; });
console.log('Total deduped channels:', c);
console.log('New sources added (after dedup):', na);
