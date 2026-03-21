#!/usr/bin/env python3
"""Duplicate & Fallback Analysis — Map cross-category duplicates for redundancy and recovery."""
import json
from collections import defaultdict

RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
d = json.load(open(RAW))

print("# Duplicate & Fallback Intelligence")
print()

dups = d["duplicates"]
cats = d["categories"]

# Classify duplicates
cross_status_dups = []  # Same channel in both live and dead categories
all_live_dups = []       # Same channel in multiple live categories
all_dead_dups = []       # Same channel only in dead categories

for norm, entries in dups.items():
    statuses = set()
    for e in entries:
        cat = cats.get(e["category_id"], {})
        statuses.add(cat.get("vps_status", "unknown"))

    if "live" in statuses and "dead" in statuses:
        cross_status_dups.append((norm, entries))
    elif statuses == {"live"}:
        all_live_dups.append((norm, entries))
    elif "dead" in statuses and "live" not in statuses:
        all_dead_dups.append((norm, entries))

print(f"## Duplicate Summary")
print(f"- Total duplicate groups: **{len(dups)}**")
print(f"- Cross-status (live+dead): **{len(cross_status_dups)}** ← THESE ARE FALLBACK OPPORTUNITIES")
print(f"- All in live categories: **{len(all_live_dups)}** ← redundancy, can pick best quality")
print(f"- All in dead categories: **{len(all_dead_dups)}** ← no fallback available")
print()

# CRITICAL: Cross-status duplicates = fallback map
print("## Fallback Map — Channels Available in Both Live and Dead Categories")
print()
print("These channels exist in dead categories BUT have a live copy elsewhere.")
print("We can use the live copy as a fallback when the dead category's channel fails.")
print()

fallback_map = []
for norm, entries in sorted(cross_status_dups, key=lambda x: len(x[1]), reverse=True):
    live_copies = []
    dead_copies = []
    for e in entries:
        cat = cats.get(e["category_id"], {})
        entry_info = {**e, "cat_name": cat.get("name", "?"), "status": cat.get("vps_status", "unknown")}
        if cat.get("vps_status") == "live":
            live_copies.append(entry_info)
        else:
            dead_copies.append(entry_info)

    fallback_map.append({
        "name": norm,
        "live": live_copies,
        "dead": dead_copies,
    })

for fb in fallback_map[:30]:
    print(f"### `{fb['name']}`")
    print(f"  DEAD copies ({len(fb['dead'])}):")
    for c in fb["dead"]:
        print(f"    ❌ id:{c['stream_id']} in {c['cat_name']} (cat:{c['category_id']})")
    print(f"  LIVE copies ({len(fb['live'])}):")
    for c in fb["live"]:
        icon = "🖼" if c.get("icon") else "⚫"
        print(f"    ✅ {icon} id:{c['stream_id']} in {c['cat_name']} (cat:{c['category_id']})")
    print()

# Dead category recovery analysis
print("## Dead Category Recovery Potential")
print()
print("For each dead category, how many channels have fallbacks in live categories?")
print()

dead_cats = {cid: info for cid, info in cats.items() if info["vps_status"] == "dead"}
for cid in sorted(dead_cats.keys(), key=lambda x: dead_cats[x]["total_streams"], reverse=True)[:20]:
    info = dead_cats[cid]
    streams = d["category_streams"].get(cid, [])

    # Check each stream for cross-category duplicates
    recoverable = 0
    for s in streams:
        norm = s["name"].lower()
        for strip in [" hd", " fhd", " uhd", " 4k", " sd"]:
            if norm.endswith(strip):
                norm = norm[:-len(strip)]
        norm = norm.strip()
        # Check if this normalized name exists in any live category
        for dup_norm, dup_entries in dups.items():
            if norm == dup_norm or (len(norm) > 10 and norm in dup_norm):
                has_live = any(cats.get(e["category_id"], {}).get("vps_status") == "live" for e in dup_entries)
                if has_live:
                    recoverable += 1
                    break

    pct = recoverable * 100 // max(len(streams), 1)
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(f"  Cat {cid:>5} | {info['name']:<40} | {info['total_streams']:>4} streams | {recoverable:>4} recoverable ({pct}%) |{bar}|")

# Live-only duplicates — quality optimization opportunities
print()
print("## Quality Optimization — Same Channel, Multiple Live Categories")
print()
print("Channels that exist in multiple live categories. Pick the best quality/icon.")
print()

for norm, entries in sorted(all_live_dups, key=lambda x: len(x[1]), reverse=True)[:20]:
    print(f"**{norm}** ({len(entries)} copies):")
    for e in entries:
        cat = cats.get(e["category_id"], {})
        icon = "🖼" if e.get("icon") else "⚫"
        https = "HTTPS" if e.get("icon", "").startswith("https://") else ("HTTP" if e.get("icon", "").startswith("http://") else "none")
        print(f"  {icon} id:{e['stream_id']} | {e['name']} | {cat.get('name', '?')} | icon:{https}")
    print()
