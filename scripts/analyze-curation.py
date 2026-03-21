#!/usr/bin/env python3
"""Curation Intelligence — Optimal theme mapping, WorldEX accuracy, dead category impact."""
import json
from collections import defaultdict

RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
d = json.load(open(RAW))

cats = d["categories"]
cat_streams = d["category_streams"]

print("# Curation Intelligence Report")
print()

# Current theme mappings vs reality
print("## Current LIVETV_THEMES Accuracy")
print()

themes = {
    "Sports": ['234', '85', '345', '427', '353', '578', '6', '342'],
    "News": ['82', '417', '346', '431'],
    "Entertainment": ['3', '343', '428', '2'],
    "Kids": ['32', '347', '430', '410'],
    "Movies 24/7": ['275', '57', '280'],
}

for name, cat_ids in themes.items():
    print(f"### {name}")
    total = 0
    alive = 0
    dead_ids = []
    for cid in cat_ids:
        cat = cats.get(cid, {})
        streams = cat_streams.get(cid, [])
        status = cat.get("vps_status", "unknown")
        total += len(streams)
        if status == "live":
            alive += len(streams)
        else:
            dead_ids.append(cid)
        print(f"  Cat {cid:>5} ({cat.get('name', '?'):<35}): {len(streams):>4} streams — {status.upper()}")

    pct = alive * 100 // max(total, 1)
    print(f"  **Total: {total} streams, {alive} alive ({pct}%), {len(dead_ids)} dead categories: {dead_ids}**")
    print()

# WorldEX region accuracy
print("## WorldEX Region Accuracy")
print()

worldex = {
    "Africa": {"main": ['336', '345'], "genres": {
        "Sports": ['345', '427'], "Entertainment": ['343', '428'],
        "News": ['346', '431'], "Movies": ['344', '429'], "Kids": ['347', '430'],
    }},
    "France": {"main": ['11'], "genres": {}},
    "UK": {"main": ['414'], "genres": {
        "Sports": ['483'], "Entertainment": ['3'], "News": ['417'],
        "Movies": ['413'], "Kids": ['410'], "Docs": ['415'], "Music": ['416'],
    }},
    "USA": {"main": ['2'], "genres": {}},
    "Arabic": {"main": ['12'], "genres": {}},
    "India": {"main": ['6'], "genres": {}},
}

for region, config in worldex.items():
    print(f"### {region}")
    # Main categories
    main_total = 0
    main_alive = 0
    for cid in config["main"]:
        cat = cats.get(cid, {})
        streams = cat_streams.get(cid, [])
        status = cat.get("vps_status", "unknown")
        main_total += len(streams)
        if status == "live":
            main_alive += len(streams)
        emoji = "✅" if status == "live" else "❌" if status == "dead" else "⚠️"
        print(f"  {emoji} Main cat {cid} ({cat.get('name', '?')}): {len(streams)} streams — {status.upper()}")

    # Genre sub-categories
    if config["genres"]:
        print(f"  Genre sub-categories:")
        for genre, genre_cats in config["genres"].items():
            genre_total = 0
            genre_status = "live"
            for cid in genre_cats:
                cat = cats.get(cid, {})
                genre_total += len(cat_streams.get(cid, []))
                if cat.get("vps_status") != "live":
                    genre_status = cat.get("vps_status", "unknown")
            emoji = "✅" if genre_status == "live" else "❌" if genre_status == "dead" else "⚠️"
            print(f"    {emoji} {genre}: {genre_total} channels ({','.join(genre_cats)}) — {genre_status.upper()}")

    print(f"  **Total: {main_total} main channels, {main_alive} alive**")
    print()

# CRITICAL: France is DEAD — find alternatives
print("## CRITICAL: France (cat 11) is DEAD — Finding Alternatives")
print()
france_streams = cat_streams.get("11", [])
print(f"France has {len(france_streams)} channels, category is DEAD.")
print()

# Look for French channels in other live categories
french_keywords = ["france", "tf1", "m6", "canal+", "arte", "rmc", "bfm", "c8", "tmc", "w9", "nrj", "france 2", "france 3", "france 5"]
french_elsewhere = []
for cid, streams in cat_streams.items():
    if cid == "11":
        continue
    cat = cats.get(cid, {})
    if cat.get("vps_status") != "live":
        continue
    for s in streams:
        name_lower = s["name"].lower()
        if any(kw in name_lower for kw in french_keywords):
            french_elsewhere.append({**s, "category_id": cid, "cat_name": cat.get("name", "?")})

print(f"Found {len(french_elsewhere)} French channels in OTHER live categories:")
for s in french_elsewhere[:30]:
    icon = "🖼" if s.get("icon") else "⚫"
    print(f"  {icon} {s['name']} — in {s['cat_name']} (cat:{s['category_id']})")

# Find Canal+ Africa overlap (African channels that are French-language)
print()
print("## Canal+ Africa as French Content Alternative")
africa_streams = cat_streams.get("336", [])
canal_in_africa = [s for s in africa_streams if any(kw in s["name"].lower() for kw in ["canal", "c+", "france", "tf1", "rmc", "bfm"])]
print(f"Canal+/French channels in Africa (cat 336): {len(canal_in_africa)}")
for s in canal_in_africa[:15]:
    print(f"  {s['name']}")

# Full category landscape — top 40 by stream count
print()
print("## Full Category Landscape (Top 40 by size)")
print()
print("| Rank | Cat ID | Name | Streams | Status | HTTPS Icons | Usage |")
print("|---|---|---|---|---|---|---|")

sorted_cats = sorted(cats.values(), key=lambda x: x["total_streams"], reverse=True)
for i, cat in enumerate(sorted_cats[:40], 1):
    # Determine if used in any theme or WorldEX
    cid = cat["id"]
    used_in = []
    for tname, tids in themes.items():
        if cid in tids:
            used_in.append(f"Theme:{tname}")
    for rname, rconfig in worldex.items():
        if cid in rconfig["main"]:
            used_in.append(f"WorldEX:{rname}")
        for gname, gids in rconfig.get("genres", {}).items():
            if cid in gids:
                used_in.append(f"WX:{rname}/{gname}")

    usage = ", ".join(used_in) if used_in else "—"
    status = cat["vps_status"].upper()
    print(f"| {i} | {cid} | {cat['name'][:35]} | {cat['total_streams']} | {status} | {cat['icon_https']}/{cat['total_streams']} | {usage} |")

# Recommendations
print()
print("## Recommendations")
print()

# Find live categories with lots of channels not used anywhere
unused_live = []
all_used_ids = set()
for tids in themes.values():
    all_used_ids.update(tids)
for rconfig in worldex.values():
    all_used_ids.update(rconfig["main"])
    for gids in rconfig.get("genres", {}).values():
        all_used_ids.update(gids)

for cat in sorted_cats:
    if cat["id"] not in all_used_ids and cat["vps_status"] == "live" and cat["total_streams"] > 20:
        unused_live.append(cat)

print(f"### Live categories with 20+ channels NOT used in any theme ({len(unused_live)}):")
for cat in unused_live[:20]:
    print(f"  Cat {cat['id']:>5} | {cat['name']:<40} | {cat['total_streams']:>4} streams | {cat['icon_https']} HTTPS icons")
