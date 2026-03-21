#!/usr/bin/env python3
"""
DashTivi+ DEEP Channel Probe — Tests EVERY stream individually.
Uses VPS /probe endpoint to batch-test channels (20 at a time).
Produces per-stream alive/dead/weak status for ALL 11,255 channels.

Output: channel-probe-results.json
Runtime: ~10-15 min (11255 channels / 20 per batch / ~1s per batch)
"""
import json, subprocess, sys, time

PROXY = "https://stream.zionsynapse.online"
RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
OUT = "/home/dash/tivi-plus/scripts/channel-probe-results.json"
BATCH_SIZE = 20

def fetch_json(url, timeout=15):
    try:
        result = subprocess.run(["curl", "-sL", "--max-time", str(timeout), url],
                                capture_output=True, text=True, timeout=timeout+5)
        if result.returncode != 0:
            return None
        return json.loads(result.stdout) if result.stdout.strip() else None
    except:
        return None

def main():
    print("=== DashTivi+ Deep Channel Probe ===")
    print(f"Testing every stream via VPS probe endpoint")
    print()

    # Load raw intel
    d = json.load(open(RAW))
    all_streams = []
    for cid, streams in d["category_streams"].items():
        for s in streams:
            all_streams.append({
                "stream_id": s["stream_id"],
                "name": s["name"],
                "icon": s.get("icon", ""),
                "category_id": cid,
            })

    # Deduplicate by stream_id (same stream can appear in analysis)
    seen = set()
    unique_streams = []
    for s in all_streams:
        if s["stream_id"] not in seen:
            seen.add(s["stream_id"])
            unique_streams.append(s)

    total = len(unique_streams)
    print(f"Total unique streams to probe: {total}")
    print(f"Batches needed: {(total + BATCH_SIZE - 1) // BATCH_SIZE}")
    print()

    # Collect all stream IDs
    all_ids = [s["stream_id"] for s in unique_streams]

    # Batch probe
    results = {}  # stream_id → status
    batches = [all_ids[i:i+BATCH_SIZE] for i in range(0, len(all_ids), BATCH_SIZE)]
    start = time.time()
    failed_batches = 0

    for i, batch in enumerate(batches):
        if (i + 1) % 50 == 0 or i == 0:
            elapsed = time.time() - start
            rate = (i + 1) / max(elapsed, 1)
            eta = (len(batches) - i - 1) / max(rate, 0.01)
            done = sum(1 for _ in results)
            alive = sum(1 for v in results.values() if v in ("live", "weak"))
            dead = sum(1 for v in results.values() if v == "dead")
            print(f"  Batch {i+1}/{len(batches)} | Probed: {done} | Alive: {alive} | Dead: {dead} | ETA: {eta:.0f}s", flush=True)

        url = f"{PROXY}/probe?ids={','.join(str(x) for x in batch)}"
        data = fetch_json(url, timeout=12)
        if data:
            for sid in batch:
                status = data.get(str(sid), "unknown")
                results[sid] = status
        else:
            failed_batches += 1
            for sid in batch:
                results[sid] = "probe_failed"

    elapsed = time.time() - start
    print()
    print(f"Probe complete in {elapsed:.1f}s ({failed_batches} failed batches)")

    # Build per-stream report
    stream_report = {}
    for s in unique_streams:
        sid = s["stream_id"]
        cat = d["categories"].get(s["category_id"], {})
        stream_report[str(sid)] = {
            "stream_id": sid,
            "name": s["name"],
            "icon": s["icon"],
            "category_id": s["category_id"],
            "category_name": cat.get("name", "unknown"),
            "category_vps_status": cat.get("vps_status", "unknown"),
            "probe_status": results.get(sid, "unknown"),
            "has_https_icon": s["icon"].startswith("https://") if s["icon"] else False,
            "has_icon": bool(s["icon"]),
        }

    # Per-category breakdown
    cat_breakdown = {}
    for sid, info in stream_report.items():
        cid = info["category_id"]
        if cid not in cat_breakdown:
            cat_breakdown[cid] = {
                "name": info["category_name"],
                "vps_status": info["category_vps_status"],
                "total": 0, "alive": 0, "dead": 0, "weak": 0, "unknown": 0, "probe_failed": 0,
                "with_icon": 0, "with_https_icon": 0,
            }
        cat_breakdown[cid]["total"] += 1
        status = info["probe_status"]
        if status in ("live",):
            cat_breakdown[cid]["alive"] += 1
        elif status == "dead":
            cat_breakdown[cid]["dead"] += 1
        elif status == "weak":
            cat_breakdown[cid]["weak"] += 1
        elif status == "probe_failed":
            cat_breakdown[cid]["probe_failed"] += 1
        else:
            cat_breakdown[cid]["unknown"] += 1
        if info["has_icon"]:
            cat_breakdown[cid]["with_icon"] += 1
        if info["has_https_icon"]:
            cat_breakdown[cid]["with_https_icon"] += 1

    # Summary stats
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
            "failed_batches": failed_batches,
        },
        "streams": stream_report,
        "categories": cat_breakdown,
    }

    with open(OUT, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n=== RESULTS ===")
    print(f"Output: {OUT}")
    print(f"Total probed: {len(results)}")
    print(f"Alive: {total_alive} ({total_alive*100//max(len(results),1)}%)")
    print(f"Dead: {total_dead} ({total_dead*100//max(len(results),1)}%)")
    print(f"Unknown/Failed: {total_unknown}")

    # Top 20 categories by alive percentage
    print(f"\n--- Best Categories (by alive %) ---")
    for cid, info in sorted(cat_breakdown.items(),
                            key=lambda x: x[1]["alive"] / max(x[1]["total"], 1),
                            reverse=True)[:20]:
        pct = info["alive"] * 100 // max(info["total"], 1)
        print(f"  Cat {cid:>5} | {info['name']:<35} | {info['alive']:>4}/{info['total']:>4} alive ({pct}%)")

    # Worst 20
    print(f"\n--- Worst Categories (most dead) ---")
    for cid, info in sorted(cat_breakdown.items(),
                            key=lambda x: x[1]["dead"],
                            reverse=True)[:20]:
        pct = info["dead"] * 100 // max(info["total"], 1)
        print(f"  Cat {cid:>5} | {info['name']:<35} | {info['dead']:>4}/{info['total']:>4} dead ({pct}%)")

    # Categories where VPS says dead but channels are actually alive
    print(f"\n--- VPS says DEAD but channels alive (hidden gems) ---")
    for cid, info in sorted(cat_breakdown.items(), key=lambda x: x[1]["alive"], reverse=True):
        if info["vps_status"] == "dead" and info["alive"] > 0:
            print(f"  Cat {cid:>5} | {info['name']:<35} | {info['alive']:>4} alive out of {info['total']} (VPS marked dead!)")

if __name__ == "__main__":
    main()
