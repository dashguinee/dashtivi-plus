#!/usr/bin/env python3
"""
DashTivi+ Channel Health Cron — Runs on VPS hourly.

Two modes:
  --full     : Probe ALL channels (hourly, ~5 min)
  --recovery : Probe only DEAD channels to recover them (every 15 min, ~1 min)

Output: /var/www/html/probe-results.json (served by nginx)
The app fetches this JSON and hides dead channels client-side.
"""
import json, subprocess, sys, time, concurrent.futures, os, argparse

PROXY = "https://stream.zionsynapse.online"
RAW = os.path.expanduser("~/channel-intel-raw.json")
RESULTS = os.path.expanduser("~/channel-probe-results.json")  # Last full probe
OUTPUT = "/tmp/probe-results.json"  # Served by proxy
BATCH_SIZE = 20
MAX_WORKERS = 5
CURL_TIMEOUT = 8


def probe_batch(batch_ids):
    """Probe a batch of stream IDs via VPS proxy."""
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
            if f"{sid}_size" in data and status not in ("live", "dead", "weak"):
                status = "live"
            out[sid] = status
        return out
    except Exception:
        return {sid: "probe_failed" for sid in batch_ids}


def load_channel_index():
    """Build stream index from raw intel data."""
    d = json.load(open(RAW))
    seen = set()
    index = {}
    for cid, streams in d["category_streams"].items():
        for s in streams:
            sid = s["stream_id"]
            if sid not in seen:
                seen.add(sid)
                index[sid] = {
                    "stream_id": sid,
                    "name": s["name"],
                    "icon": s.get("icon", ""),
                    "category_id": cid,
                }
    return index, d["categories"]


def run_probe(stream_ids, label=""):
    """Probe a list of stream IDs and return results dict."""
    batches = [stream_ids[i:i+BATCH_SIZE] for i in range(0, len(stream_ids), BATCH_SIZE)]
    results = {}
    start = time.time()
    completed = 0

    print(f"[{label}] Probing {len(stream_ids)} channels in {len(batches)} batches...", flush=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(probe_batch, batch): batch for batch in batches}
        for future in concurrent.futures.as_completed(futures):
            batch_result = future.result()
            results.update(batch_result)
            completed += 1
            if completed % 25 == 0 or completed == len(batches):
                elapsed = time.time() - start
                alive = sum(1 for v in results.values() if v in ("live", "weak"))
                dead = sum(1 for v in results.values() if v == "dead")
                print(f"  [{completed}/{len(batches)}] Alive:{alive} Dead:{dead} ({elapsed:.0f}s)", flush=True)

    return results


def build_output(results, index, categories):
    """Build the JSON output the app consumes."""
    # Per-category summary (compact — app only needs alive/dead counts + alive IDs)
    cat_summary = {}
    for sid, status in results.items():
        info = index.get(sid, {})
        cid = info.get("category_id", "0")
        if cid not in cat_summary:
            cat_summary[cid] = {"alive": [], "dead_count": 0, "total": 0}
        cat_summary[cid]["total"] += 1
        if status in ("live", "weak"):
            cat_summary[cid]["alive"].append(sid)
        else:
            cat_summary[cid]["dead_count"] += 1

    total_alive = sum(1 for v in results.values() if v in ("live", "weak"))
    total_dead = sum(1 for v in results.values() if v == "dead")

    return {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(results),
        "alive": total_alive,
        "dead": total_dead,
        "alive_pct": round(total_alive * 100 / max(len(results), 1), 1),
        # Compact alive set — app checks: `if (probeData.alive_set.has(streamId))`
        "alive_set": sorted(sid for sid, status in results.items() if status in ("live", "weak")),
        # Per-category alive counts for quick UI filtering
        "categories": {
            cid: {
                "alive": len(info["alive"]),
                "dead": info["dead_count"],
                "total": info["total"],
            }
            for cid, info in cat_summary.items()
        },
    }


def full_probe():
    """Probe ALL channels."""
    index, categories = load_channel_index()
    all_ids = list(index.keys())
    results = run_probe(all_ids, "FULL")

    # Save detailed results for recovery mode
    with open(RESULTS, 'w') as f:
        json.dump({"results": {str(k): v for k, v in results.items()}, "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, f)

    # Save compact output for app
    output = build_output(results, index, categories)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(output, f, separators=(',', ':'))

    print(f"\nFull probe complete: {output['alive']}/{output['total']} alive ({output['alive_pct']}%)")
    print(f"Output: {OUTPUT} ({os.path.getsize(OUTPUT) / 1024:.0f} KB)")


def recovery_probe():
    """Probe only DEAD channels to recover them faster."""
    if not os.path.exists(RESULTS):
        print("No previous results found. Run --full first.")
        return

    prev = json.load(open(RESULTS))
    prev_results = prev.get("results", {})
    dead_ids = [int(sid) for sid, status in prev_results.items() if status in ("dead", "probe_failed", "unknown")]

    if not dead_ids:
        print("No dead channels to recover.")
        return

    print(f"Recovery probe: {len(dead_ids)} dead channels to re-check")
    recovery_results = run_probe(dead_ids, "RECOVERY")

    # Merge: recovered channels update the previous results
    recovered = 0
    for sid, status in recovery_results.items():
        if status in ("live", "weak") and prev_results.get(str(sid)) in ("dead", "probe_failed", "unknown"):
            prev_results[str(sid)] = status
            recovered += 1
        elif status == "dead":
            prev_results[str(sid)] = "dead"

    # Save updated results
    prev["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(RESULTS, 'w') as f:
        json.dump(prev, f)

    # Rebuild compact output
    index, categories = load_channel_index()
    int_results = {int(k): v for k, v in prev_results.items()}
    output = build_output(int_results, index, categories)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(output, f, separators=(',', ':'))

    print(f"\nRecovery complete: {recovered} channels came back alive")
    print(f"New totals: {output['alive']}/{output['total']} alive ({output['alive_pct']}%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DashTivi+ Channel Health Cron")
    parser.add_argument("--full", action="store_true", help="Full probe of all channels")
    parser.add_argument("--recovery", action="store_true", help="Re-probe dead channels only")
    args = parser.parse_args()

    if args.recovery:
        recovery_probe()
    else:
        full_probe()
