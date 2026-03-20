#!/usr/bin/env python3
"""
DashTivi+ VOD & Series Intelligence — Full Landscape Audit
Fetches ALL movie/VOD categories + series categories, analyzes content depth,
quality indicators, platform breakdown, duplicates, and freshness.

Output:
  - Structured report to stdout
  - Raw data to vod-series-intel-raw.json
  - Markdown report to VOD-SERIES-REPORT.md
"""

import json, sys, time, re, subprocess
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────────
API = "http://datahub11.com:80"
USER = "Test032026"
PASS = "032026Test"

RAW_OUT = "/home/dash/tivi-plus/scripts/vod-series-intel-raw.json"
REPORT_OUT = "/home/dash/tivi-plus/scripts/VOD-SERIES-REPORT.md"

MAX_WORKERS = 10
TIMEOUT = 10
MAX_ITEMS_RAW = 50  # first N items per category saved to raw JSON

# Platform detection keywords (lowercased)
PLATFORM_KEYWORDS = {
    "Netflix": ["netflix"],
    "HBO": ["hbo", "max originals"],
    "Disney+": ["disney+", "disney plus", "disney"],
    "Prime Video": ["prime video", "amazon", "prime"],
    "Apple TV+": ["apple tv", "apple tv+"],
    "Hulu": ["hulu"],
    "Peacock": ["peacock"],
    "Paramount+": ["paramount+", "paramount plus"],
    "Crunchyroll": ["crunchyroll"],
    "MUBI": ["mubi"],
}

# Quality keywords (case-insensitive match in movie/series names)
QUALITY_TAGS = ["4k", "uhd", "hdr", "1080p", "720p", "fhd", "cam", "hdcam", "hd-cam"]


# ── Helpers ─────────────────────────────────────────────────────────────

def log(msg):
    """Progress to stderr so stdout stays clean."""
    print(msg, file=sys.stderr, flush=True)


def fetch_json(url, timeout=TIMEOUT):
    """Fetch JSON via curl (same pattern as channel-intel.py)."""
    try:
        result = subprocess.run(
            ["curl", "-sL", "--max-time", str(timeout), url],
            capture_output=True, text=True, timeout=timeout + 5
        )
        if result.returncode != 0:
            return None
        text = result.stdout.strip()
        if not text:
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to salvage truncated array
            if text.startswith("["):
                last = text.rfind("}")
                if last > 0:
                    try:
                        return json.loads(text[:last + 1] + "]")
                    except Exception:
                        pass
            return None
    except Exception as e:
        log(f"  WARN: {url[:80]}... -> {e}")
        return None


def api_url(action, extra=""):
    return f"{API}/player_api.php?username={USER}&password={PASS}&action={action}{extra}"


def detect_platform(name):
    """Detect streaming platform from category/content name."""
    lower = name.lower()
    for platform, keywords in PLATFORM_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return platform
    return None


def detect_quality(name):
    """Extract quality tags from a name string."""
    lower = name.lower()
    found = []
    for q in QUALITY_TAGS:
        # Match as word boundary
        if re.search(r'\b' + re.escape(q) + r'\b', lower):
            found.append(q.upper())
    return found


def extract_year(movie):
    """Try to extract year from movie name or added timestamp."""
    name = movie.get("name", "")
    # Try parenthesized year: (2025)
    m = re.search(r'\((\d{4})\)', name)
    if m:
        y = int(m.group(1))
        if 1900 <= y <= 2030:
            return y
    # Try bare year at end: ... 2025
    m = re.search(r'\b(20[12]\d)\b', name)
    if m:
        y = int(m.group(1))
        if 1900 <= y <= 2030:
            return y
    # Fallback: added timestamp (epoch)
    added = movie.get("added")
    if added:
        try:
            ts = int(added)
            if ts > 1_000_000_000:
                return datetime.fromtimestamp(ts, tz=None).year
        except (ValueError, TypeError, OSError):
            pass
    return None


def year_bucket(year):
    if year is None:
        return "Unknown"
    if year >= 2026:
        return "2026"
    if year >= 2025:
        return "2025"
    if year >= 2024:
        return "2024"
    if year >= 2020:
        return "2020-2023"
    return "Pre-2020"


def fetch_category_streams(cat_id, action):
    """Fetch streams for a single category. Returns (cat_id, data_or_None)."""
    url = api_url(action, f"&category_id={cat_id}")
    data = fetch_json(url, timeout=TIMEOUT)
    return (cat_id, data)


# ── Main ────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()
    log("=" * 60)
    log("  DashTivi+ VOD & Series Intelligence Sweep")
    log("=" * 60)

    # ── Phase 1: Fetch categories ───────────────────────────────────────
    log("\n[1/6] Fetching VOD categories...")
    vod_cats = fetch_json(api_url("get_vod_categories"), timeout=15)
    if not vod_cats:
        log("FATAL: Cannot fetch VOD categories")
        sys.exit(1)
    log(f"  -> {len(vod_cats)} VOD categories")

    log("[2/6] Fetching Series categories...")
    series_cats = fetch_json(api_url("get_series_categories"), timeout=15)
    if not series_cats:
        log("FATAL: Cannot fetch Series categories")
        sys.exit(1)
    log(f"  -> {len(series_cats)} Series categories")

    # ── Phase 2: Fetch all VOD streams per category (parallel) ──────────
    log(f"\n[3/6] Fetching VOD streams for {len(vod_cats)} categories ({MAX_WORKERS} workers)...")
    vod_streams = {}  # cat_id -> list of streams
    failed_vod = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(fetch_category_streams, cat["category_id"], "get_vod_streams"): cat
            for cat in vod_cats
        }
        done_count = 0
        for future in as_completed(futures):
            done_count += 1
            cat = futures[future]
            cid, data = future.result()
            if data is not None:
                vod_streams[str(cid)] = data
            else:
                failed_vod.append(str(cid))
            if done_count % 20 == 0 or done_count == len(vod_cats):
                log(f"  VOD progress: {done_count}/{len(vod_cats)}")

    total_movies = sum(len(v) for v in vod_streams.values())
    log(f"  -> {total_movies} total movies across {len(vod_streams)} categories ({len(failed_vod)} failed)")

    # ── Phase 3: Fetch all series per category (parallel) ───────────────
    log(f"\n[4/6] Fetching Series for {len(series_cats)} categories ({MAX_WORKERS} workers)...")
    series_streams = {}  # cat_id -> list of series
    failed_series = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(fetch_category_streams, cat["category_id"], "get_series"): cat
            for cat in series_cats
        }
        done_count = 0
        for future in as_completed(futures):
            done_count += 1
            cat = futures[future]
            cid, data = future.result()
            if data is not None:
                series_streams[str(cid)] = data
            else:
                failed_series.append(str(cid))
            if done_count % 20 == 0 or done_count == len(series_cats):
                log(f"  Series progress: {done_count}/{len(series_cats)}")

    total_series = sum(len(v) for v in series_streams.values())
    log(f"  -> {total_series} total series across {len(series_streams)} categories ({len(failed_series)} failed)")

    # ── Phase 4: Analyze Movies ─────────────────────────────────────────
    log("\n[5/6] Analyzing movies...")

    # Build lookup: cat_id -> cat_name
    vod_cat_map = {str(c["category_id"]): c["category_name"] for c in vod_cats}
    series_cat_map = {str(c["category_id"]): c["category_name"] for c in series_cats}

    # -- VOD per-category analysis --
    vod_analysis = {}
    all_movie_names = defaultdict(list)  # normalized_name -> [(cat_id, original_name)]
    year_dist = defaultdict(int)
    quality_dist = defaultdict(int)
    format_dist = defaultdict(int)

    for cat in vod_cats:
        cid = str(cat["category_id"])
        cat_name = cat["category_name"]
        streams = vod_streams.get(cid, [])

        with_poster = sum(1 for s in streams if (s.get("stream_icon") or "").strip())
        https_poster = sum(1 for s in streams if (s.get("stream_icon") or "").startswith("https://"))
        with_rating = sum(1 for s in streams if s.get("rating") and str(s.get("rating", "0")).replace(".", "", 1).isdigit() and float(s.get("rating", "0")) > 0)

        # Quality in category name
        cat_quality = detect_quality(cat_name)
        # Platform in category name
        cat_platform = detect_platform(cat_name)

        # Per-stream analysis
        for s in streams:
            name = s.get("name", "").strip()
            # Normalize for duplicate detection
            norm = re.sub(r'\s+', ' ', name.lower().strip())
            norm = re.sub(r'\((\d{4})\)', '', norm).strip()
            all_movie_names[norm].append((cid, name))

            # Year extraction
            year = extract_year(s)
            year_dist[year_bucket(year)] += 1

            # Quality in stream name
            for q in detect_quality(name):
                quality_dist[q] += 1

            # Container format
            ext = s.get("container_extension", "mp4")
            format_dist[ext] += 1

        vod_analysis[cid] = {
            "id": cid,
            "name": cat_name,
            "total": len(streams),
            "with_poster": with_poster,
            "https_poster": https_poster,
            "with_rating": with_rating,
            "poster_pct": round(with_poster / len(streams) * 100, 1) if streams else 0,
            "platform": cat_platform,
            "quality_tags": cat_quality,
        }

    # Duplicate detection (same normalized name in 2+ categories)
    vod_duplicates = {}
    for norm, entries in all_movie_names.items():
        if len(entries) < 2:
            continue
        cats_involved = set(e[0] for e in entries)
        if len(cats_involved) >= 2:
            vod_duplicates[norm] = [
                {"category_id": e[0], "category_name": vod_cat_map.get(e[0], "?"), "original_name": e[1]}
                for e in entries
            ]

    # Platform categories
    vod_platform_cats = defaultdict(list)
    for cid, info in vod_analysis.items():
        if info["platform"]:
            vod_platform_cats[info["platform"]].append(info)

    # Top categories by volume
    vod_sorted_by_size = sorted(vod_analysis.values(), key=lambda x: x["total"], reverse=True)

    # Empty/near-empty categories
    vod_empty = [v for v in vod_analysis.values() if v["total"] < 5]

    # ── Phase 5: Analyze Series ─────────────────────────────────────────
    log("[5/6] Analyzing series...")

    series_analysis = {}
    series_rating_dist = defaultdict(int)
    series_platform_cats = defaultdict(list)

    for cat in series_cats:
        cid = str(cat["category_id"])
        cat_name = cat["category_name"]
        streams = series_streams.get(cid, [])

        with_cover = sum(1 for s in streams if (s.get("cover") or "").strip())
        https_cover = sum(1 for s in streams if (s.get("cover") or "").startswith("https://"))

        # Rating analysis
        ratings = []
        for s in streams:
            r = s.get("rating", None) or s.get("rating_5based", None)
            if r is not None:
                try:
                    rv = float(r)
                    if rv > 0:
                        ratings.append(rv)
                except (ValueError, TypeError):
                    pass

        with_rating = len(ratings)
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0

        # Rating buckets
        for rv in ratings:
            if rv >= 8:
                series_rating_dist["8-10 (Excellent)"] += 1
            elif rv >= 6:
                series_rating_dist["6-8 (Good)"] += 1
            elif rv >= 4:
                series_rating_dist["4-6 (Average)"] += 1
            else:
                series_rating_dist["0-4 (Poor)"] += 1

        cat_platform = detect_platform(cat_name)

        series_analysis[cid] = {
            "id": cid,
            "name": cat_name,
            "total": len(streams),
            "with_cover": with_cover,
            "https_cover": https_cover,
            "with_rating": with_rating,
            "avg_rating": avg_rating,
            "cover_pct": round(with_cover / len(streams) * 100, 1) if streams else 0,
            "platform": cat_platform,
        }
        if cat_platform:
            series_platform_cats[cat_platform].append(series_analysis[cid])

    series_sorted_by_size = sorted(series_analysis.values(), key=lambda x: x["total"], reverse=True)
    series_empty = [s for s in series_analysis.values() if s["total"] < 5]

    # ── Phase 6: Build Report ───────────────────────────────────────────
    log("\n[6/6] Building report...")

    elapsed = round(time.time() - start_time, 1)
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

    lines = []

    def out(text=""):
        lines.append(text)

    # ── Header ──
    out("# DashTivi+ VOD & Series Intelligence Report")
    out(f"*Generated: {timestamp} | Duration: {elapsed}s*")
    out()
    out("---")
    out()

    # ── Executive Summary ──
    out("## Executive Summary")
    out()
    out(f"| Metric | Movies (VOD) | Series |")
    out(f"|--------|-------------|--------|")
    out(f"| Categories | {len(vod_cats)} | {len(series_cats)} |")
    out(f"| Total Content | {total_movies:,} | {total_series:,} |")
    out(f"| Failed Fetches | {len(failed_vod)} | {len(failed_series)} |")

    # Poster/cover stats
    movies_with_poster = sum(v["with_poster"] for v in vod_analysis.values())
    movies_https = sum(v["https_poster"] for v in vod_analysis.values())
    series_with_cover = sum(v["with_cover"] for v in series_analysis.values())
    series_https = sum(v["https_cover"] for v in series_analysis.values())

    poster_pct = round(movies_with_poster / total_movies * 100, 1) if total_movies else 0
    cover_pct = round(series_with_cover / total_series * 100, 1) if total_series else 0

    out(f"| With Poster/Cover | {movies_with_poster:,} ({poster_pct}%) | {series_with_cover:,} ({cover_pct}%) |")
    out(f"| HTTPS Images | {movies_https:,} | {series_https:,} |")
    out(f"| Cross-Category Duplicates | {len(vod_duplicates):,} | — |")
    out(f"| Empty Categories (<5) | {len(vod_empty)} | {len(series_empty)} |")
    out()

    # ── MOVIES Section ──
    out("---")
    out()
    out("## MOVIES / VOD")
    out()

    # Top 20 categories
    out("### Top 20 Categories by Volume")
    out()
    out("| # | Category | Movies | Poster% | Platform |")
    out("|---|----------|--------|---------|----------|")
    for i, v in enumerate(vod_sorted_by_size[:20], 1):
        plat = v["platform"] or "—"
        out(f"| {i} | {v['name']} | {v['total']:,} | {v['poster_pct']}% | {plat} |")
    out()

    # Year distribution
    out("### Year Distribution")
    out()
    out("| Year Bucket | Movies | % |")
    out("|-------------|--------|---|")
    year_order = ["2026", "2025", "2024", "2020-2023", "Pre-2020", "Unknown"]
    for bucket in year_order:
        count = year_dist.get(bucket, 0)
        pct = round(count / total_movies * 100, 1) if total_movies else 0
        out(f"| {bucket} | {count:,} | {pct}% |")
    out()

    # Quality indicators
    out("### Quality Indicators (from movie names)")
    out()
    out("| Quality Tag | Count |")
    out("|-------------|-------|")
    for tag in sorted(quality_dist, key=quality_dist.get, reverse=True):
        out(f"| {tag} | {quality_dist[tag]:,} |")
    if not quality_dist:
        out("| (none detected) | — |")
    out()

    # Container formats
    out("### Container Formats")
    out()
    out("| Format | Count | % |")
    out("|--------|-------|---|")
    for fmt in sorted(format_dist, key=format_dist.get, reverse=True):
        count = format_dist[fmt]
        pct = round(count / total_movies * 100, 1) if total_movies else 0
        out(f"| .{fmt} | {count:,} | {pct}% |")
    out()

    # Platform breakdown
    out("### Platform Categories (Movies)")
    out()
    if vod_platform_cats:
        out("| Platform | Categories | Total Movies |")
        out("|----------|-----------|-------------|")
        for plat in sorted(vod_platform_cats, key=lambda p: sum(c["total"] for c in vod_platform_cats[p]), reverse=True):
            cats_list = vod_platform_cats[plat]
            total_plat = sum(c["total"] for c in cats_list)
            out(f"| {plat} | {len(cats_list)} | {total_plat:,} |")
        out()
        # Detail per platform
        for plat in sorted(vod_platform_cats, key=lambda p: sum(c["total"] for c in vod_platform_cats[p]), reverse=True):
            cats_list = sorted(vod_platform_cats[plat], key=lambda x: x["total"], reverse=True)
            out(f"**{plat}:**")
            for c in cats_list:
                out(f"  - {c['name']} — {c['total']} movies (poster: {c['poster_pct']}%)")
            out()
    else:
        out("No platform-specific categories detected.")
        out()

    # Duplicates
    out("### Cross-Category Duplicates")
    out()
    out(f"Total duplicate groups: **{len(vod_duplicates):,}** (same movie in 2+ categories)")
    out()
    if vod_duplicates:
        # Show top 20 examples
        sorted_dupes = sorted(vod_duplicates.items(), key=lambda x: len(x[1]), reverse=True)
        out("**Top 20 most-duplicated movies:**")
        out()
        out("| Movie (normalized) | Appearances | Categories |")
        out("|-------------------|-------------|------------|")
        for norm, entries in sorted_dupes[:20]:
            cat_names = ", ".join(set(e["category_name"] for e in entries))
            out(f"| {norm[:50]} | {len(entries)} | {cat_names[:60]} |")
        out()

    # Empty categories
    out("### Empty / Near-Empty Categories (< 5 movies)")
    out()
    if vod_empty:
        out("| Category | Movies |")
        out("|----------|--------|")
        for v in sorted(vod_empty, key=lambda x: x["total"]):
            out(f"| {v['name']} | {v['total']} |")
    else:
        out("None found.")
    out()

    # ── SERIES Section ──
    out("---")
    out()
    out("## SERIES")
    out()

    # Top 20 categories
    out("### Top 20 Categories by Volume")
    out()
    out("| # | Category | Series | Cover% | Avg Rating | Platform |")
    out("|---|----------|--------|--------|------------|----------|")
    for i, s in enumerate(series_sorted_by_size[:20], 1):
        plat = s["platform"] or "—"
        rating_str = f"{s['avg_rating']}" if s["avg_rating"] > 0 else "—"
        out(f"| {i} | {s['name']} | {s['total']:,} | {s['cover_pct']}% | {rating_str} | {plat} |")
    out()

    # Platform breakdown
    out("### Platform Categories (Series)")
    out()
    if series_platform_cats:
        out("| Platform | Categories | Total Series |")
        out("|----------|-----------|-------------|")
        for plat in sorted(series_platform_cats, key=lambda p: sum(c["total"] for c in series_platform_cats[p]), reverse=True):
            cats_list = series_platform_cats[plat]
            total_plat = sum(c["total"] for c in cats_list)
            out(f"| {plat} | {len(cats_list)} | {total_plat:,} |")
        out()
        for plat in sorted(series_platform_cats, key=lambda p: sum(c["total"] for c in series_platform_cats[p]), reverse=True):
            cats_list = sorted(series_platform_cats[plat], key=lambda x: x["total"], reverse=True)
            out(f"**{plat}:**")
            for c in cats_list:
                rating_str = f"avg {c['avg_rating']}" if c["avg_rating"] > 0 else "no ratings"
                out(f"  - {c['name']} — {c['total']} series (cover: {c['cover_pct']}%, {rating_str})")
            out()
    else:
        out("No platform-specific categories detected.")
        out()

    # Rating distribution
    out("### Rating Distribution (Series)")
    out()
    total_rated_series = sum(series_rating_dist.values())
    if total_rated_series:
        out(f"Total rated: **{total_rated_series:,}** out of {total_series:,}")
        out()
        out("| Rating Bucket | Count | % of Rated |")
        out("|--------------|-------|-----------|")
        for bucket in ["8-10 (Excellent)", "6-8 (Good)", "4-6 (Average)", "0-4 (Poor)"]:
            count = series_rating_dist.get(bucket, 0)
            pct = round(count / total_rated_series * 100, 1) if total_rated_series else 0
            out(f"| {bucket} | {count:,} | {pct}% |")
    else:
        out("No ratings data available in API response.")
    out()

    # Empty categories
    out("### Empty / Near-Empty Categories (< 5 series)")
    out()
    if series_empty:
        out("| Category | Series |")
        out("|----------|--------|")
        for s in sorted(series_empty, key=lambda x: x["total"]):
            out(f"| {s['name']} | {s['total']} |")
    else:
        out("None found.")
    out()

    # ── Full Category Listings ──
    out("---")
    out()
    out("## Full Category Listing — Movies")
    out()
    out("| Cat ID | Name | Movies | Poster% | Quality | Platform |")
    out("|--------|------|--------|---------|---------|----------|")
    for v in sorted(vod_analysis.values(), key=lambda x: x["name"]):
        qtags = ", ".join(v["quality_tags"]) if v["quality_tags"] else "—"
        plat = v["platform"] or "—"
        out(f"| {v['id']} | {v['name']} | {v['total']:,} | {v['poster_pct']}% | {qtags} | {plat} |")
    out()

    out("## Full Category Listing — Series")
    out()
    out("| Cat ID | Name | Series | Cover% | Avg Rating | Platform |")
    out("|--------|------|--------|--------|------------|----------|")
    for s in sorted(series_analysis.values(), key=lambda x: x["name"]):
        plat = s["platform"] or "—"
        rating_str = f"{s['avg_rating']}" if s["avg_rating"] > 0 else "—"
        out(f"| {s['id']} | {s['name']} | {s['total']:,} | {s['cover_pct']}% | {rating_str} | {plat} |")
    out()

    # ── Print report to stdout ──
    report_text = "\n".join(lines)
    print(report_text)

    # ── Save report ──
    with open(REPORT_OUT, "w", encoding="utf-8") as f:
        f.write(report_text)
    log(f"\nReport saved to {REPORT_OUT}")

    # ── Save raw JSON ──
    log("Saving raw data...")

    # Trim streams to MAX_ITEMS_RAW per category for the raw dump
    def trim_streams(streams_dict):
        trimmed = {}
        for cid, items in streams_dict.items():
            trimmed[cid] = items[:MAX_ITEMS_RAW]
        return trimmed

    raw_data = {
        "meta": {
            "timestamp": timestamp,
            "duration_seconds": elapsed,
            "api": API,
            "total_vod_categories": len(vod_cats),
            "total_series_categories": len(series_cats),
            "total_movies": total_movies,
            "total_series": total_series,
            "failed_vod_fetches": len(failed_vod),
            "failed_series_fetches": len(failed_series),
            "items_per_category_limit": MAX_ITEMS_RAW,
        },
        "vod_categories": vod_cats,
        "series_categories": series_cats,
        "vod_streams_sample": trim_streams(vod_streams),
        "series_sample": trim_streams(series_streams),
        "vod_analysis": vod_analysis,
        "series_analysis": series_analysis,
        "vod_duplicates_top50": dict(
            sorted(vod_duplicates.items(), key=lambda x: len(x[1]), reverse=True)[:50]
        ),
        "year_distribution": dict(year_dist),
        "quality_distribution": dict(quality_dist),
        "format_distribution": dict(format_dist),
        "series_rating_distribution": dict(series_rating_dist),
        "platform_breakdown": {
            "vod": {p: [c["id"] for c in cats] for p, cats in vod_platform_cats.items()},
            "series": {p: [c["id"] for c in cats] for p, cats in series_platform_cats.items()},
        },
    }

    with open(RAW_OUT, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=2, ensure_ascii=False)
    log(f"Raw data saved to {RAW_OUT}")

    # ── Final summary to stderr ──
    log(f"\n{'=' * 60}")
    log(f"  DONE in {elapsed}s")
    log(f"  Movies: {total_movies:,} across {len(vod_cats)} categories")
    log(f"  Series: {total_series:,} across {len(series_cats)} categories")
    log(f"  Duplicates: {len(vod_duplicates):,} cross-category groups")
    log(f"  Report: {REPORT_OUT}")
    log(f"  Raw: {RAW_OUT}")
    log(f"{'=' * 60}")


if __name__ == "__main__":
    main()
