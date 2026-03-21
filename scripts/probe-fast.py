#!/usr/bin/env python3
"""
Fast parallel channel probe — uses concurrent requests with strict timeouts.
Probes all 11,255 channels in ~3-5 minutes using parallel batches.
"""
import json, subprocess, sys, time, concurrent.futures

PROXY = "https://stream.zionsynapse.online"
RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
OUT = "/home/dash/tivi-plus/scripts/channel-probe-results.json"
BATCH_SIZE = 20
MAX_WORKERS = 5  # 5 parallel probe requests
CURL_TIMEOUT = 8

def probe_batch(batch_ids):
    """Probe a batch of stream IDs. Returns {stream_id: status}."""
    ids_str = ','.join(str(x) for x in batch_ids)
    url = f"{PROXY}/probe?ids={ids_str}"
    try:
        result = subprocess.run(
            ["curl", "-sL", "--max-time", str(CURL_TIMEOUT), url],
            capture_output=True, text=True, timeout=CURL_TIMEOUT + 3
        )
        if result.returncode != 0 or not result.stdout.strip():
            return {sid: "probe_failed" for sid in batch_ids}
        data = json.loads(result.stdout)
        out = {}
        for sid in batch_ids:
            status = data.get(str(sid), "unknown")
            # Normalize: anything with _size suffix means it got data
            if f"{sid}_size" in data and status not in ("live", "dead", "weak"):
                status = "live"
            out[sid] = status
        return out
    except Exception:
        return {sid: "probe_failed" for sid in batch_ids}

def main():
    print("=== DashTivi+ Fast Channel Probe ===", flush=True)

    d = json.load(open(RAW))

    # Collect unique stream IDs
    seen = set()
    streams_index = {}  # sid → stream info
    for cid, streams in d["category_streams"].items():
        for s in streams:
            sid = s["stream_id"]
            if sid not in seen:
                seen.add(sid)
                streams_index[sid] = {
                    "stream_id": sid,
                    "name": s["name"],
                    "icon": s.get("icon", ""),
                    "category_id": cid,
                }

    all_ids = list(streams_index.keys())
    total = len(all_ids)
    batches = [all_ids[i:i+BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]

    print(f"Streams: {total} | Batches: {len(batches)} | Workers: {MAX_WORKERS}", flush=True)
    print()

    results = {}
    start = time.time()
    completed = 0
    failed = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(probe_batch, batch): batch for batch in batches}
        for future in concurrent.futures.as_completed(futures):
            batch_result = future.result()
            results.update(batch_result)
            completed += 1

            batch_failed = sum(1 for v in batch_result.values() if v == "probe_failed")
            failed += batch_failed

            if completed % 25 == 0 or completed == len(batches):
                elapsed = time.time() - start
                alive = sum(1 for v in results.values() if v in ("live", "weak"))
                dead = sum(1 for v in results.values() if v == "dead")
                rate = completed / max(elapsed, 1)
                eta = (len(batches) - completed) / max(rate, 0.01)
                print(f"  [{completed}/{len(batches)}] Alive:{alive} Dead:{dead} Failed:{failed} ETA:{eta:.0f}s", flush=True)

    elapsed = time.time() - start

    # Build detailed report
    stream_report = {}
    for sid, info in streams_index.items():
        cat = d["categories"].get(info["category_id"], {})
        stream_report[str(sid)] = {
            "stream_id": sid,
            "name": info["name"],
            "icon": info["icon"],
            "category_id": info["category_id"],
            "category_name": cat.get("name", "unknown"),
            "category_vps_status": cat.get("vps_status", "unknown"),
            "probe_status": results.get(sid, "unknown"),
            "has_https_icon": info["icon"].startswith("https://") if info["icon"] else False,
            "has_icon": bool(info["icon"]),
        }

    # Per-category breakdown
    cat_breakdown = {}
    for sid_str, info in stream_report.items():
        cid = info["category_id"]
        if cid not in cat_breakdown:
            cat_breakdown[cid] = {
                "name": info["category_name"],
                "vps_status": info["category_vps_status"],
                "total": 0, "alive": 0, "dead": 0, "weak": 0, "unknown": 0, "probe_failed": 0,
                "with_icon": 0, "with_https_icon": 0,
                "alive_channels": [], "dead_channels": [],
            }
        cb = cat_breakdown[cid]
        cb["total"] += 1
        status = info["probe_status"]
        if status == "live":
            cb["alive"] += 1
            cb["alive_channels"].append({"id": info["stream_id"], "name": info["name"], "icon": info["icon"]})
        elif status == "dead":
            cb["dead"] += 1
            cb["dead_channels"].append({"id": info["stream_id"], "name": info["name"]})
        elif status == "weak":
            cb["weak"] += 1
            cb["alive_channels"].append({"id": info["stream_id"], "name": info["name"], "icon": info["icon"]})
        elif status == "probe_failed":
            cb["probe_failed"] += 1
        else:
            cb["unknown"] += 1
        if info["has_icon"]:
            cb["with_icon"] += 1
        if info["has_https_icon"]:
            cb["with_https_icon"] += 1

    # Trim channel lists for manageable JSON size (keep first 50 per category)
    for cid in cat_breakdown:
        cat_breakdown[cid]["alive_channels"] = cat_breakdown[cid]["alive_channels"][:50]
        cat_breakdown[cid]["dead_channels"] = cat_breakdown[cid]["dead_channels"][:50]

    total_alive = sum(1 for v in results.values() if v in ("live", "weak"))
    total_dead = sum(1 for v in results.values() if v == "dead")
    total_unknown = sum(1 for v in results.values() if v in ("unknown", "probe_failed"))

    output = {
        "meta": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "total_probed": len(results),
            "total_alive": total_alive,
            "total_dead": total_dead,
            "total_unknown": total_unknown,
            "alive_pct": round(total_alive * 100 / max(len(results), 1), 1),
            "probe_duration_s": round(elapsed, 1),
            "failed_batches": failed,
        },
        "streams": stream_report,
        "categories": cat_breakdown,
    }

    with open(OUT, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n=== RESULTS ({elapsed:.1f}s) ===", flush=True)
    print(f"Total probed: {len(results)}")
    print(f"Alive: {total_alive} ({total_alive*100//max(len(results),1)}%)")
    print(f"Dead: {total_dead} ({total_dead*100//max(len(results),1)}%)")
    print(f"Unknown/Failed: {total_unknown}")

    print(f"\n--- Categories with hidden alive channels (VPS=dead but channels live) ---")
    for cid, info in sorted(cat_breakdown.items(), key=lambda x: x[1]["alive"], reverse=True):
        if info["vps_status"] == "dead" and info["alive"] > 0:
            pct = info["alive"] * 100 // max(info["total"], 1)
            print(f"  Cat {cid:>5} | {info['name']:<35} | {info['alive']:>4}/{info['total']:>4} alive ({pct}%) — VPS WRONGLY MARKED DEAD")

    print(f"\n--- Best alive categories ---")
    for cid, info in sorted(cat_breakdown.items(), key=lambda x: x[1]["alive"], reverse=True)[:25]:
        pct = info["alive"] * 100 // max(info["total"], 1)
        print(f"  Cat {cid:>5} | {info['name']:<35} | {info['alive']:>4}/{info['total']:>4} alive ({pct}%)")

    print(f"\n--- DSTV channel-level status ---")
    dstv_ids = ['343', '428', '347', '430', '344', '429', '346', '431', '345', '427']
    for cid in dstv_ids:
        info = cat_breakdown.get(cid, {})
        if info:
            pct = info["alive"] * 100 // max(info["total"], 1)
            print(f"  Cat {cid:>5} | {info['name']:<35} | {info['alive']:>4}/{info['total']:>4} alive ({pct}%) | {info['dead']} dead")

if __name__ == "__main__":
    main()
