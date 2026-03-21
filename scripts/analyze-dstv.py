#!/usr/bin/env python3
"""DSTV Deep Analysis — Map all DSTV categories, find alive/dead, SD↔FHD fallbacks."""
import json

RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
d = json.load(open(RAW))

print("# DSTV Deep Analysis")
print()

# All DSTV categories
dstv = d["dstv_deep"]
print(f"## DSTV Categories ({len(dstv)})")
print()
print("| ID | Name | Streams | VPS Status | VPS Live/Total | HTTPS Icons |")
print("|---|---|---|---|---|---|")
for cid, info in sorted(dstv.items(), key=lambda x: x[1]["name"]):
    print(f"| {cid} | {info['name']} | {info['total_streams']} | **{info['vps_status'].upper()}** | {info['vps_live']}/{info['vps_total']} | {info['icon_https']}/{info['total_streams']} |")

# SD ↔ FHD pairing
print()
print("## SD ↔ FHD Tier Mapping")
print()

# Group by base name (DSTV|ENTERTAINMENT vs DSTV|ENTERTAINMENT (FHD))
pairs = {}
for cid, info in dstv.items():
    name = info["name"]
    base = name.replace(" (FHD)", "").replace(" (SD)", "").strip()
    tier = "FHD" if "(FHD)" in name else "SD"
    if base not in pairs:
        pairs[base] = {}
    pairs[base][tier] = {"id": cid, **info}

for base, tiers in sorted(pairs.items()):
    print(f"### {base}")
    for tier, info in tiers.items():
        status = info["vps_status"].upper()
        print(f"  - {tier} (cat {info['id']}): {info['total_streams']} streams, status={status}, live={info['vps_live']}/{info['vps_total']}")

    # Check for channel-level duplicates between tiers
    if "SD" in tiers and "FHD" in tiers:
        sd_names = {s["name"].lower().replace("sd", "").replace("fhd", "").strip(): s for s in tiers["SD"]["streams"]}
        fhd_names = {s["name"].lower().replace("sd", "").replace("fhd", "").strip(): s for s in tiers["FHD"]["streams"]}
        overlap = set(sd_names.keys()) & set(fhd_names.keys())
        if overlap:
            print(f"  → **{len(overlap)} channels have SD↔FHD pairs** (potential fallbacks)")
            for name in list(overlap)[:5]:
                sd = sd_names[name]
                fhd = fhd_names[name]
                print(f"    - '{sd['name']}' (id:{sd['stream_id']}) ↔ '{fhd['name']}' (id:{fhd['stream_id']})")
    print()

# Individual channel analysis for dead DSTV categories
print("## Dead DSTV Channels — Fallback Candidates")
print()
dead_dstv = {cid: info for cid, info in dstv.items() if info["vps_status"] == "dead"}
live_dstv = {cid: info for cid, info in dstv.items() if info["vps_status"] == "live"}

if dead_dstv:
    for cid, info in dead_dstv.items():
        print(f"### {info['name']} (cat {cid}) — DEAD")
        # Check if channels exist in other live categories
        dead_streams = info["streams"]
        fallbacks = []
        for s in dead_streams[:20]:  # Check first 20
            norm = s["name"].lower().replace("sd", "").replace("fhd", "").replace("uhd", "").replace("hd", "").strip()
            # Search all categories for matches
            for dup_norm, dup_entries in d["duplicates"].items():
                if norm in dup_norm or dup_norm in norm:
                    alive_entries = [e for e in dup_entries if d["categories"].get(e["category_id"], {}).get("vps_status") == "live"]
                    if alive_entries:
                        fallbacks.append({"dead": s["name"], "alive": alive_entries})
                        break
        if fallbacks:
            print(f"  Found {len(fallbacks)} channels with live fallbacks:")
            for fb in fallbacks[:10]:
                alive = fb["alive"][0]
                alive_cat = d["categories"].get(alive["category_id"], {}).get("name", "?")
                print(f"    - '{fb['dead']}' → '{alive['name']}' in {alive_cat} (cat {alive['category_id']})")
        else:
            print(f"  No fallbacks found in live categories")
        print()
else:
    print("No dead DSTV categories found.")

# Summary
print("## Summary")
print()
total = sum(info["total_streams"] for info in dstv.values())
alive_total = sum(info["total_streams"] for info in dstv.values() if info["vps_status"] == "live")
dead_total = sum(info["total_streams"] for info in dstv.values() if info["vps_status"] == "dead")
print(f"- Total DSTV channels: {total}")
print(f"- In live categories: {alive_total} ({alive_total*100//max(total,1)}%)")
print(f"- In dead categories: {dead_total} ({dead_total*100//max(total,1)}%)")
print(f"- SD↔FHD pairs found: {len(pairs)}")
