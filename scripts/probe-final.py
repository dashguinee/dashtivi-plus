#!/usr/bin/env python3
"""Probe — HTTP byte-test all channels via buxjam directly. Outputs probe-results.json"""
import json, urllib.request, time, threading

ACCOUNTS = [("DASH-TEST3","BAADN72HN"),("DASH-TEST5","BDUW8U2WB"),("DASH-TEST6","JAHDUN829")]
HOST = "http://buxjam.com:8080"
OUTPUT = "/tmp/probe-results.json"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent":"Lavf/58.76.100"})
    with urllib.request.urlopen(req, timeout=20) as r: return json.loads(r.read())

def test(sid, user, passwd):
    try:
        req = urllib.request.Request(f"{HOST}/live/{user}/{passwd}/{sid}.ts", headers={"User-Agent":"Lavf/58.76.100"})
        with urllib.request.urlopen(req, timeout=3) as r:
            d = r.read(65536)
            return len(d) >= 188 and d[0] == 0x47
    except: return False

print("[PROBE] Starting...", flush=True)
all_s = fetch(f"{HOST}/player_api.php?username={ACCOUNTS[0][0]}&password={ACCOUNTS[0][1]}&action=get_live_streams")
print(f"[API] {len(all_s)} channels", flush=True)

alive = set()
lock = threading.Lock()
done = [0]
total = len(all_s)
start = time.time()

def worker(user, passwd, sid):
    if test(sid, user, passwd):
        with lock: alive.add(sid)
    with lock:
        done[0] += 1
        if done[0] % 2000 == 0:
            print(f"  {done[0]}/{total} ({100*done[0]/total:.0f}%) al:{len(alive)}", flush=True)

threads = []
for ai, (u, p) in enumerate(ACCOUNTS):
    for sid in [s["stream_id"] for s in all_s[ai::len(ACCOUNTS)]]:
        t = threading.Thread(target=worker, args=(u, p, sid))
        threads.append(t); t.start()
        if len(threads) >= len(ACCOUNTS): threads.pop(0).join()
for t in threads: t.join()

output = {"ts":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"total":total,"alive":len(alive),"dead":total-len(alive),"alive_pct":round(100*len(alive)/max(1,total),1),"alive_set":list(alive),"elapsed_sec":round(time.time()-start,1)}
with open(OUTPUT,"w") as f: json.dump(output, f)
print(f"[DONE] {len(alive)}/{total} alive ({output['alive_pct']}%)", flush=True)
