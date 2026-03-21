#!/usr/bin/env python3
"""Sports Intelligence — Full landscape of sports channels by type, provider, quality."""
import json
from collections import defaultdict

RAW = "/home/dash/tivi-plus/scripts/channel-intel-raw.json"
d = json.load(open(RAW))

print("# Sports Channel Intelligence")
print()

sports = d["sports_deep"]
cats = d["categories"]

# Group by category
by_cat = defaultdict(list)
for s in sports:
    by_cat[s["category_id"]].append(s)

print(f"## Sports Categories ({len(by_cat)} categories, {len(sports)} channels)")
print()
print("| Cat ID | Category Name | Channels | VPS Status | HTTPS Icons |")
print("|---|---|---|---|---|")
for cid, streams in sorted(by_cat.items(), key=lambda x: len(x[1]), reverse=True):
    cat = cats.get(cid, {})
    status = cat.get("vps_status", "unknown").upper()
    https_count = sum(1 for s in streams if s.get("icon", "").startswith("https://"))
    print(f"| {cid} | {cat.get('name', '?')} | {len(streams)} | {status} | {https_count}/{len(streams)} |")

# Group by sport TYPE (keyword detection)
sport_types = {
    "Football/Soccer": ["football", "soccer", "premier league", "champions league", "la liga", "serie a", "bundesliga", "ligue 1", "epl", "ucl"],
    "Cricket": ["cricket", "ipl", "t20", "test match"],
    "Rugby": ["rugby"],
    "F1/Racing": ["f1", "formula", "racing", "motorsport", "motogp", "nascar"],
    "Tennis": ["tennis", "wimbledon", "atp", "wta"],
    "Boxing/MMA": ["boxing", "ufc", "mma", "wrestling", "wwe", "ppv", "fight"],
    "Basketball": ["nba", "basketball"],
    "American Football": ["nfl"],
    "Golf": ["golf", "pga"],
    "General Sports": ["sport", "espn", "sky sport", "bein sport", "supersport", "dstv sport"],
}

print()
print("## Sports by Type")
print()

type_channels = defaultdict(list)
for s in sports:
    name_lower = s["name"].lower()
    matched = False
    for stype, keywords in sport_types.items():
        if any(kw in name_lower for kw in keywords):
            type_channels[stype].append(s)
            matched = True
            break
    if not matched:
        type_channels["Other"].append(s)

for stype, channels in sorted(type_channels.items(), key=lambda x: len(x[1]), reverse=True):
    live_cats = sum(1 for c in channels if cats.get(c["category_id"], {}).get("vps_status") == "live")
    print(f"### {stype}: {len(channels)} channels ({live_cats} in live categories)")
    # Show sample channels
    samples = channels[:8]
    for s in samples:
        cat = cats.get(s["category_id"], {})
        icon = "🖼" if s.get("icon") else "⚫"
        status = "✅" if cat.get("vps_status") == "live" else "❌"
        print(f"  {status} {icon} {s['name']} (cat:{s['category_id']} {cat.get('name', '?')})")
    if len(channels) > 8:
        print(f"  ... and {len(channels)-8} more")
    print()

# Provider analysis for sports
print("## Sports by Provider")
print()
providers = defaultdict(list)
for s in sports:
    name = s["name"]
    name_lower = name.lower()
    if "bein" in name_lower:
        providers["beIN Sports"].append(s)
    elif "sky sport" in name_lower:
        providers["Sky Sports"].append(s)
    elif "supersport" in name_lower or "dstv" in name_lower:
        providers["DSTV/SuperSport"].append(s)
    elif "espn" in name_lower:
        providers["ESPN"].append(s)
    elif "fox sport" in name_lower:
        providers["Fox Sports"].append(s)
    elif "star sport" in name_lower:
        providers["Star Sports"].append(s)
    elif "sony" in name_lower:
        providers["Sony Sports"].append(s)
    elif "tnt sport" in name_lower or "bt sport" in name_lower:
        providers["TNT/BT Sports"].append(s)
    elif "canal+" in name_lower or "c+" in name_lower:
        providers["Canal+"].append(s)
    else:
        providers["Other"].append(s)

for provider, channels in sorted(providers.items(), key=lambda x: len(x[1]), reverse=True):
    alive = sum(1 for c in channels if cats.get(c["category_id"], {}).get("vps_status") == "live")
    with_icon = sum(1 for c in channels if c.get("icon"))
    print(f"- **{provider}**: {len(channels)} channels ({alive} alive, {with_icon} with icons)")

# Duplicate sports channels (same channel in multiple categories)
print()
print("## Sports Channel Redundancy (Fallback Map)")
print()

# Normalize sports channel names
sports_norm = defaultdict(list)
for s in sports:
    norm = s["name"].lower()
    for strip in [" hd", " fhd", " uhd", " 4k", " sd", " (hd)", " (fhd)", " (4k)"]:
        if norm.endswith(strip):
            norm = norm[:-len(strip)]
    norm = norm.strip()
    sports_norm[norm].append(s)

redundant = {k: v for k, v in sports_norm.items() if len(v) >= 2}
print(f"Found **{len(redundant)}** sports channels with duplicates across categories:")
print()
for norm, entries in sorted(redundant.items(), key=lambda x: len(x[1]), reverse=True)[:25]:
    cats_involved = set()
    details = []
    for e in entries:
        cat = cats.get(e["category_id"], {})
        cat_name = cat.get("name", "?")
        status = "✅" if cat.get("vps_status") == "live" else "❌"
        details.append(f"{status} {e['name']} (cat:{e['category_id']} {cat_name})")
        cats_involved.add(e["category_id"])
    print(f"**{norm}** — {len(entries)} copies in {len(cats_involved)} categories:")
    for detail in details:
        print(f"  {detail}")
    print()

# Current theme mapping accuracy
print("## Current Theme Mapping vs Reality")
print()
current_sports_cats = ['234', '85', '345', '427', '353', '578', '6', '342']
print("Current LIVETV_THEMES sports categoryIds:", current_sports_cats)
print()
for cid in current_sports_cats:
    cat = cats.get(cid, {})
    status = cat.get("vps_status", "unknown")
    streams_in_cat = d["category_streams"].get(cid, [])
    print(f"  Cat {cid} ({cat.get('name', '?')}): {len(streams_in_cat)} streams, status={status}")

# Find sports categories NOT in the current mapping
print()
print("### Sports categories NOT in current theme (potential additions):")
sports_cat_ids = set(s["category_id"] for s in sports)
missing = sports_cat_ids - set(current_sports_cats)
for cid in sorted(missing, key=lambda x: len(by_cat.get(x, [])), reverse=True)[:15]:
    cat = cats.get(cid, {})
    if cat.get("vps_status") == "live":
        print(f"  ✅ Cat {cid} ({cat.get('name', '?')}): {len(by_cat[cid])} sports channels — LIVE, consider adding")
