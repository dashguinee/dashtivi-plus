#!/usr/bin/env python3
"""Movie/VOD Landscape — Category structure, naming patterns, freshness detection."""
import json, subprocess
from collections import defaultdict

API = "https://datahub11.com"
USER = "Test032026"
PASS = "032026Test"

def fetch_json(url, timeout=30):
    try:
        result = subprocess.run(["curl", "-sL", "--max-time", str(timeout), url],
                                capture_output=True, text=True, timeout=timeout+5)
        return json.loads(result.stdout) if result.returncode == 0 else None
    except:
        return None

print("# Movie/VOD Landscape Intelligence")
print()

# Fetch VOD categories
url = f"{API}/player_api.php?username={USER}&password={PASS}&action=get_vod_categories"
vod_cats = fetch_json(url)
if not vod_cats:
    print("ERROR: Cannot fetch VOD categories")
    exit(1)

print(f"## VOD Categories ({len(vod_cats)} total)")
print()

# Fetch counts for top categories
print("| Cat ID | Name | Streams |")
print("|---|---|---|")
for cat in sorted(vod_cats, key=lambda x: x["category_name"]):
    print(f"| {cat['category_id']} | {cat['category_name']} | — |")

# Fetch a sample of VOD streams to detect patterns
print()
print("## Sample Category Analysis")
print()

key_cats = [
    ("749", "New 2026"),
    ("597", "2025 Hits"),
    ("240", "Award Winners"),
    ("169", "Netflix"),
    ("122", "4K"),
    ("88", "Arabic"),
    ("772", "Turkish"),
    ("168", "Bollywood"),
]

total_vods = 0
for cat_id, label in key_cats:
    url = f"{API}/player_api.php?username={USER}&password={PASS}&action=get_vod_streams&category_id={cat_id}"
    streams = fetch_json(url)
    if not streams:
        print(f"### {label} (cat {cat_id}): FETCH FAILED")
        continue

    total_vods += len(streams)

    # Analyze icons
    https_icons = sum(1 for s in streams if s.get("stream_icon", "").startswith("https://"))
    http_icons = sum(1 for s in streams if s.get("stream_icon", "").startswith("http://") and not s.get("stream_icon", "").startswith("https://"))
    no_icons = len(streams) - https_icons - http_icons

    # Analyze container formats
    formats = defaultdict(int)
    for s in streams:
        ext = s.get("container_extension", "mp4")
        formats[ext] += 1

    # Analyze ratings
    rated = sum(1 for s in streams if s.get("rating") and float(s.get("rating", "0") or "0") > 0)

    print(f"### {label} (cat {cat_id}): {len(streams)} movies")
    print(f"  Icons: {https_icons} HTTPS, {http_icons} HTTP, {no_icons} none")
    print(f"  Formats: {dict(formats)}")
    print(f"  Rated: {rated}/{len(streams)}")

    # Show top 5 by name
    print(f"  Sample:")
    for s in streams[:5]:
        rating = s.get("rating", "—")
        ext = s.get("container_extension", "mp4")
        icon = "🖼" if s.get("stream_icon") else "⚫"
        print(f"    {icon} {s['name']} ({ext}, rating:{rating})")
    print()

# Series categories
print("## Series Categories")
print()
url = f"{API}/player_api.php?username={USER}&password={PASS}&action=get_series_categories"
series_cats = fetch_json(url)
if series_cats:
    print(f"Total series categories: {len(series_cats)}")
    print()
    # Key series categories
    key_series = [("106", "Netflix"), ("188", "HBO"), ("654", "Disney+"), ("108", "Prime Video"), ("114", "Apple TV+")]
    for cat_id, label in key_series:
        url = f"{API}/player_api.php?username={USER}&password={PASS}&action=get_series&category_id={cat_id}"
        series = fetch_json(url)
        if series:
            with_cover = sum(1 for s in series if s.get("cover"))
            print(f"  {label} (cat {cat_id}): {len(series)} series, {with_cover} with cover art")

print()
print(f"## Summary")
print(f"- VOD categories: {len(vod_cats)}")
print(f"- Key categories sampled: {len(key_cats)}, total VODs in sample: {total_vods}")
if series_cats:
    print(f"- Series categories: {len(series_cats)}")
