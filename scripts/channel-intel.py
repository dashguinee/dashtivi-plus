#!/usr/bin/env python3
"""
DashTivi+ Channel Intelligence — Full Landscape Audit
Fetches ALL live categories, ALL streams, VPS health, and writes comprehensive JSON.
Run once → agents analyze the output.
"""
import json, sys, time, subprocess

API = "https://datahub11.com"
USER = "Test032026"
PASS = "032026Test"
PROXY = "https://stream.zionsynapse.online"
OUT = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"

def fetch_json(url, timeout=30):
    """Fetch JSON via curl (handles redirects reliably)."""
    try:
        result = subprocess.run(
            ["curl", "-sL", "--max-time", str(timeout), url],
            capture_output=True, text=True, timeout=timeout + 5
        )
        if result.returncode != 0:
            print(f"  WARN: curl failed for {url[:80]}...", file=sys.stderr)
            return None
        text = result.stdout.strip()
        if not text:
            return None
        # Handle truncated JSON
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to salvage truncated array
            if text.startswith('['):
                last = text.rfind('}')
                if last > 0:
                    try:
                        return json.loads(text[:last+1] + ']')
                    except:
                        pass
            return None
    except Exception as e:
        print(f"  WARN: {url[:80]}... → {e}", file=sys.stderr)
        return None

def api_url(action, extra=""):
    return f"{API}/player_api.php?username={USER}&password={PASS}&action={action}{extra}"

def main():
    print("=== DashTivi+ Channel Intelligence Sweep ===")
    print()

    # 1. Fetch ALL live categories
    print("[1/5] Fetching live categories...")
    cats = fetch_json(api_url("get_live_categories"))
    if not cats:
        print("FATAL: Cannot fetch categories", file=sys.stderr)
        sys.exit(1)
    print(f"  → {len(cats)} categories found")

    # 2. Fetch ALL live streams (single call, no category filter)
    print("[2/5] Fetching ALL live streams (single bulk call)...")
    all_streams = fetch_json(api_url("get_live_streams"))
    if not all_streams:
        print("FATAL: Cannot fetch streams", file=sys.stderr)
        sys.exit(1)
    print(f"  → {len(all_streams)} total streams")

    # 3. Fetch VPS health data
    print("[3/5] Fetching VPS health data...")
    health = fetch_json(f"{PROXY}/channels.json", timeout=10)
    if not health:
        health = {"categories": {}, "liveCategories": [], "deadCategories": [], "offlineCategories": []}
        print("  → VPS health unavailable, proceeding without")
    else:
        live_cats = health.get("liveCategories", [])
        dead_cats = health.get("deadCategories", [])
        offline_cats = health.get("offlineCategories", [])
        print(f"  → Live: {len(live_cats)}, Dead: {len(dead_cats)}, Offline: {len(offline_cats)}")

    # 4. Build category → streams mapping
    print("[4/5] Building category index...")
    cat_map = {}  # category_id → list of streams
    for s in all_streams:
        cid = str(s.get("category_id", ""))
        if cid not in cat_map:
            cat_map[cid] = []
        cat_map[cid].append(s)

    # Build category info
    cat_index = {}
    for c in cats:
        cid = c["category_id"]
        streams = cat_map.get(cid, [])

        # Icon analysis
        https_icons = sum(1 for s in streams if s.get("stream_icon", "").startswith("https://"))
        http_icons = sum(1 for s in streams if s.get("stream_icon", "").startswith("http://") and not s.get("stream_icon", "").startswith("https://"))
        no_icons = len(streams) - https_icons - http_icons

        # Health status from VPS
        vps_status = "unknown"
        if cid in health.get("deadCategories", []):
            vps_status = "dead"
        elif cid in health.get("offlineCategories", []):
            vps_status = "offline"
        elif cid in health.get("liveCategories", []):
            vps_status = "live"

        cat_info = health.get("categories", {}).get(cid, {})

        cat_index[cid] = {
            "id": cid,
            "name": c["category_name"],
            "total_streams": len(streams),
            "vps_status": vps_status,
            "vps_live": cat_info.get("live", 0),
            "vps_total": cat_info.get("total", 0),
            "icon_https": https_icons,
            "icon_http": http_icons,
            "icon_none": no_icons,
        }

    # 5. Duplicate detection — find streams that appear in multiple categories
    print("[5/5] Detecting duplicates and patterns...")

    # Group by normalized name for duplicate detection
    name_map = {}  # normalized_name → list of {stream_id, name, category_id, icon}
    for s in all_streams:
        # Normalize: lowercase, strip quality suffixes, strip prefixes
        name = s.get("name", "").strip()
        norm = name.lower()
        # Strip common prefixes
        for prefix in ["uk || ", "uk : ", "uhd ▎", "|af| ", "|uk| ", "|us| ", "|fr| ", "|in| ", "fr (c+af) "]:
            if norm.startswith(prefix):
                norm = norm[len(prefix):]
        # Strip quality suffixes
        for suffix in [" hd", " fhd", " uhd", " 4k", " sd", " (hd)", " (fhd)", " (4k)", " (sd)"]:
            if norm.endswith(suffix):
                norm = norm[:-len(suffix)]
        norm = norm.strip()

        if norm not in name_map:
            name_map[norm] = []
        name_map[norm].append({
            "stream_id": s["stream_id"],
            "name": name,
            "category_id": str(s.get("category_id", "")),
            "icon": s.get("stream_icon", ""),
        })

    # Find actual duplicates (same normalized name, different categories)
    duplicates = {}
    for norm, entries in name_map.items():
        if len(entries) < 2:
            continue
        cats_involved = set(e["category_id"] for e in entries)
        if len(cats_involved) >= 2:  # Cross-category duplicate
            duplicates[norm] = entries

    # Provider pattern detection
    provider_patterns = {}
    for s in all_streams:
        name = s.get("name", "")
        # Detect provider from name patterns
        provider = "unknown"
        name_lower = name.lower()
        if "dstv" in name_lower or name.startswith("|AF|"):
            provider = "DSTV"
        elif "bein" in name_lower:
            provider = "beIN"
        elif "sky" in name_lower:
            provider = "Sky"
        elif "canal" in name_lower or "c+" in name_lower:
            provider = "Canal+"
        elif "bbc" in name_lower:
            provider = "BBC"
        elif "cnn" in name_lower:
            provider = "CNN"
        elif "espn" in name_lower:
            provider = "ESPN"
        elif "fox" in name_lower:
            provider = "Fox"
        elif "star" in name_lower and ("india" in name_lower or s.get("category_id") in ["6", "342"]):
            provider = "Star India"
        elif "zee" in name_lower:
            provider = "Zee"
        elif "sony" in name_lower:
            provider = "Sony"
        elif "supersport" in name_lower:
            provider = "SuperSport"
        elif "mbc" in name_lower:
            provider = "MBC"

        if provider not in provider_patterns:
            provider_patterns[provider] = {"count": 0, "categories": set(), "alive": 0, "dead": 0}
        provider_patterns[provider]["count"] += 1
        provider_patterns[provider]["categories"].add(str(s.get("category_id", "")))

    # Convert sets to lists for JSON
    for p in provider_patterns:
        provider_patterns[p]["categories"] = list(provider_patterns[p]["categories"])

    # DSTV deep analysis — find all DSTV-related categories
    dstv_cats = {}
    for cid, info in cat_index.items():
        name = info["name"].lower()
        if "dstv" in name or "dstv" in name:
            dstv_cats[cid] = {
                **info,
                "streams": [{
                    "stream_id": s["stream_id"],
                    "name": s["name"],
                    "icon": s.get("stream_icon", ""),
                } for s in cat_map.get(cid, [])]
            }

    # Sports deep analysis
    sports_keywords = ["sport", "football", "soccer", "cricket", "rugby", "f1", "tennis",
                       "boxing", "ufc", "mma", "nba", "nfl", "golf", "racing", "motorsport",
                       "wrestling", "wwe", "premier league", "champions league", "la liga",
                       "serie a", "bundesliga", "ligue 1"]
    sports_channels = []
    for s in all_streams:
        name_lower = s.get("name", "").lower()
        if any(kw in name_lower for kw in sports_keywords):
            sports_channels.append({
                "stream_id": s["stream_id"],
                "name": s["name"],
                "category_id": str(s.get("category_id", "")),
                "category_name": cat_index.get(str(s.get("category_id", "")), {}).get("name", "unknown"),
                "icon": s.get("stream_icon", ""),
            })

    # Compile output
    output = {
        "meta": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "total_categories": len(cats),
            "total_streams": len(all_streams),
            "total_duplicates": len(duplicates),
            "total_sports_channels": len(sports_channels),
        },
        "categories": cat_index,
        "category_streams": {cid: [{
            "stream_id": s["stream_id"],
            "name": s["name"],
            "icon": s.get("stream_icon", ""),
        } for s in streams] for cid, streams in cat_map.items()},
        "duplicates": duplicates,
        "provider_patterns": provider_patterns,
        "dstv_deep": dstv_cats,
        "sports_deep": sports_channels,
        "vps_health": {
            "live": health.get("liveCategories", []),
            "dead": health.get("deadCategories", []),
            "offline": health.get("offlineCategories", []),
        },
    }

    # Write output
    with open(OUT, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n=== DONE ===")
    print(f"Output: {OUT}")
    print(f"Categories: {len(cats)}")
    print(f"Streams: {len(all_streams)}")
    print(f"Cross-category duplicates: {len(duplicates)} channel groups")
    print(f"DSTV categories: {len(dstv_cats)}")
    print(f"Sports channels (keyword match): {len(sports_channels)}")
    print(f"Providers detected: {len(provider_patterns)}")

    # Quick summary
    print(f"\n--- Category Health ---")
    live_count = sum(1 for c in cat_index.values() if c["vps_status"] == "live")
    dead_count = sum(1 for c in cat_index.values() if c["vps_status"] == "dead")
    offline_count = sum(1 for c in cat_index.values() if c["vps_status"] == "offline")
    unknown_count = sum(1 for c in cat_index.values() if c["vps_status"] == "unknown")
    print(f"  Live: {live_count}, Dead: {dead_count}, Offline: {offline_count}, Unknown: {unknown_count}")

    print(f"\n--- Top Providers ---")
    sorted_providers = sorted(provider_patterns.items(), key=lambda x: x[1]["count"], reverse=True)[:15]
    for name, info in sorted_providers:
        print(f"  {name}: {info['count']} channels across {len(info['categories'])} categories")

if __name__ == "__main__":
    main()
