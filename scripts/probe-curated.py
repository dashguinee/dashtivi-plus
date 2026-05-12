#!/usr/bin/env python3
"""Probe — test ONLY the 4922 curated channels. Fast, targeted."""
import json, urllib.request, time, threading

HOST = "http://buxjam.com:8080"
ACCOUNTS = [("DASH-TEST3","BAADN72HN"),("DASH-TEST5","BDUW8U2WB"),("DASH-TEST6","JAHDUN829")]
OUTPUT = "/tmp/probe-results.json"

with open("/tmp/curator.json") as f:
    curated = json.load(f)

# Get all channel IDs from curator
ids = set()
for chs in curated["experiences"].values():
    for c in chs:
        ids.add(c["id"])
all_ids = list(ids)
print(f"[PROBE] Testing {len(all_ids)} curated channels", flush=True)

def test(sid, user, passwd):
    try:
        req = urllib.request.Request(f"{HOST}/live/{user}/{passwd}/{sid}.ts", headers={"User-Agent":"Lavf/58.76.100"})
        with urllib.request.urlopen(req, timeout=3) as r:
            d = r.read(65536)
            return len(d) >= 188 and d[0] == 0x47
    except: return False

alive = set()
lock = threading.Lock()
done = [0]
total = len(all_ids)
start = time.time()

def worker(user, passwd, sid):
    if test(sid, user, passwd): 
        with lock: alive.add(sid)
    with lock:
        done[0] += 1
        if done[0] % 500 == 0:
            print(f"  {done[0]}/{total} ({100*done[0]/total:.0f}%) al:{len(alive)}", flush=True)

threads = []
for ai, (u, p) in enumerate(ACCOUNTS):
    batch = all_ids[ai::len(ACCOUNTS)]
    for sid in batch:
        t = threading.Thread(target=worker, args=(u, p, sid))
        threads.append(t); t.start()
        if len(threads) >= len(ACCOUNTS): threads.pop(0).join()
for t in threads: t.join()

output = {"ts":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"total":total,"alive":len(alive),"dead":total-len(alive),"alive_pct":round(100*len(alive)/max(1,total),1),"alive_set":list(alive),"elapsed_sec":round(time.time()-start,1)}
with open(OUTPUT,"w") as f: json.dump(output, f)
print(f"[DONE] {len(alive)}/{total} alive ({output['alive_pct']}%)", flush=True)
