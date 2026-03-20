#!/usr/bin/env python3
"""
DashTivi+ Channel Health Cron — Runs on VPS hourly.

Two modes:
  --full     : Probe ALL channels (hourly, ~5 min)
  --recovery : Probe only DEAD channels to recover them (every 15 min, ~1 min)

Output: /tmp/probe-results.json (served by proxy)
The app fetches this JSON and hides dead channels client-side.
"""
import json, subprocess, sys, time, concurrent.futures, os, argparse, fcntl, tempfile

PROXY = "https://stream.zionsynapse.online"
RAW = os.path.expanduser("~/channel-intel-raw.json")
RESULTS = os.path.expanduser("~/channel-probe-results.json")  # Last full probe
OUTPUT = "/tmp/probe-results.json"  # Served by proxy
LOCKFILE = "/tmp/cron-probe.lock"
BATCH_SIZE = 20
MAX_WORKERS = 5
CURL_TIMEOUT = 8
STALE_THRESHOLD = 3 * 3600  # 3 hours — warn if full probe is older


def acquire_lock():
    """Acquire exclusive lock to prevent overlapping runs."""
    lock_fd = open(LOCKFILE, "w")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return lock_fd
    except IOError:
        print("Another probe is running. Exiting.")
        sys.exit(0)


def atomic_write_json(path, data, compact=False):
    """Write JSON atomically via temp file + rename."""
    dirname = os.path.dirname(path) or "."
    os.makedirs(dirname, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=dirname, suffix=".tmp")
    try:
        with os.fdopen(fd, 'w') as f:
            if compact:
                json.dump(data, f, separators=(',', ':'))
            else:
                json.dump(data, f)
        os.rename(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


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
    except json.JSONDecodeError as e:
        print(f"  JSON parse error for batch {batch_ids[0]}..{batch_ids[-1]}: {e}", flush=True)
        return {sid: "probe_failed" for sid in batch_ids}
    except subprocess.TimeoutExpired:
        return {sid: "probe_failed" for sid in batch_ids}
    except Exception as e:
        print(f"  Probe error for batch {batch_ids[0]}..{batch_ids[-1]}: {type(e).__name__}: {e}", flush=True)
        return {sid: "probe_failed" for sid in batch_ids}


def load_channel_index():
    """Build stream index from raw intel data."""
    try:
        with open(RAW) as f:
            d = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"FATAL: Cannot load {RAW}: {e}")
        sys.exit(1)
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
        "alive_set": sorted(sid for sid, status in results.items() if status in ("live", "weak")),
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

    # Save detailed results for recovery mode (atomic)
    atomic_write_json(RESULTS, {
        "results": {str(k): v for k, v in results.items()},
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })

    # Save compact output for app (atomic)
    output = build_output(results, index, categories)
    atomic_write_json(OUTPUT, output, compact=True)

    print(f"\nFull probe complete: {output['alive']}/{output['total']} alive ({output['alive_pct']}%)")
    print(f"Output: {OUTPUT} ({os.path.getsize(OUTPUT) / 1024:.0f} KB)")


def recovery_probe():
    """Probe only DEAD channels to recover them faster."""
    if not os.path.exists(RESULTS):
        print("No previous results found. Run --full first.")
        return

    try:
        with open(RESULTS) as f:
            prev = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"ERROR: Cannot read {RESULTS}: {e}")
        return

    # Check staleness
    prev_ts = prev.get("ts", "")
    if prev_ts:
        try:
            prev_time = time.mktime(time.strptime(prev_ts, "%Y-%m-%dT%H:%M:%SZ")) - time.timezone
            age = time.time() - prev_time
            if age > STALE_THRESHOLD:
                print(f"WARNING: Full probe is {age/3600:.1f}h old (threshold: {STALE_THRESHOLD/3600:.0f}h). Consider running --full.")
        except ValueError:
            pass

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

    # Save updated results (atomic)
    prev["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    atomic_write_json(RESULTS, prev)

    # Rebuild compact output (atomic)
    index, categories = load_channel_index()
    int_results = {int(k): v for k, v in prev_results.items()}
    output = build_output(int_results, index, categories)
    atomic_write_json(OUTPUT, output, compact=True)

    print(f"\nRecovery complete: {recovered} channels came back alive")
    print(f"New totals: {output['alive']}/{output['total']} alive ({output['alive_pct']}%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DashTivi+ Channel Health Cron")
    parser.add_argument("--full", action="store_true", help="Full probe of all channels")
    parser.add_argument("--recovery", action="store_true", help="Re-probe dead channels only")
    args = parser.parse_args()

    # Exclusive lock — prevents overlapping runs
    lock = acquire_lock()

    if args.recovery:
        recovery_probe()
    else:
        full_probe()
