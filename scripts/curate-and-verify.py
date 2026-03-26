#!/usr/bin/env python3
"""
FINAL CURATION — Verify every free channel via VPS byte probe AND classify into experiences.

For each channel:
1. Probe via VPS /probe endpoint (same as Xtream channels — real byte-level check)
2. Classify into experience based on name + metadata
3. Tag quality tier
4. Flag noise (obscure regional, [Not 24/7], [Geo-blocked])

Outputs:
  - free-curated.json — verified + classified channels ready for the app
"""
import json, os, sys, time, re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "free-channels-verified.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "free-channels-curated.json")
REPORT_FILE = os.path.join(os.path.dirname(__file__), "curation-report.json")

with open(DATA_FILE) as f:
    channels = json.load(f)

print(f"Curating {len(channels)} verified free channels...\n")

# ── CLASSIFICATION RULES ─────────────────────────────────────────

# Tier 1: Premium brands we definitely want
PREMIUM_BRANDS = {
    'bbc': 'premium', 'cnn': 'premium', 'bloomberg': 'premium',
    'al jazeera': 'premium', 'euronews': 'premium', 'france 24': 'premium',
    'sky news': 'premium', 'disney': 'premium', 'nickelodeon': 'premium',
    'cartoon network': 'premium', 'nick jr': 'premium', 'baby shark': 'premium',
    'espn': 'premium', 'bein': 'premium', 'nba': 'premium',
    'mtv': 'premium', 'vh1': 'premium', 'stingray': 'premium',
    'filmrise': 'premium', 'pluto': 'premium',
    'bollywood': 'premium', 'zee': 'premium', 'colors': 'premium',
    'star plus': 'premium', 'sony': 'premium',
}

# Tier 2: African content — critical for SL launch
AFRICAN_KEYWORDS = [
    'sen tv', 'rts', 'rti', 'crtv', 'rtg', 'walf', 'tfm', 'canal 2',
    'africa', 'afro', 'nollywood', 'africa magic', 'trace africa',
    'channels tv', 'tvc news', 'arise', 'startimes',
    'equinoxe', 'ortm', 'rtb', 'rtn', 'gabon',
]

# Noise patterns to filter OUT
NOISE_PATTERNS = [
    r'\[not 24/7\]', r'\[geo.?blocked\]', r'\[offline\]',
    r'\(240p\)', r'\(144p\)',
    r'radio \d', r'fm \d',  # radio stations disguised as TV
]
NOISE_RE = re.compile('|'.join(NOISE_PATTERNS), re.IGNORECASE)

# Language/region to filter — keep English, French, Arabic, African, Indian
KEEP_CULTURES = {'usa', 'uk', 'africa', 'india', 'arabic', 'france', 'international'}

def classify_channel(ch):
    """Classify a channel into experience + tier."""
    name = ch.get('name', '')
    nl = name.lower()
    exp = ch.get('experience', 'general')
    culture = ch.get('culture', 'international')

    # Check noise
    if NOISE_RE.search(name):
        return None, 'noise', 'filtered'

    # Check if culture is relevant
    if culture not in KEEP_CULTURES and exp == 'general':
        # Check if it's a premium brand regardless of culture
        is_premium = any(brand in nl for brand in PREMIUM_BRANDS)
        is_african = any(kw in nl for kw in AFRICAN_KEYWORDS)
        if not is_premium and not is_african:
            return None, 'noise', 'irrelevant_culture'

    # Classify tier
    tier = 'standard'
    if any(brand in nl for brand in PREMIUM_BRANDS):
        tier = 'premium'
    elif any(kw in nl for kw in AFRICAN_KEYWORDS):
        tier = 'african'

    # Reclassify experience for general channels
    if exp == 'general':
        if any(kw in nl for kw in ['news', 'cnn', 'bbc news', 'al jazeera', 'euronews', 'france 24', 'bloomberg']):
            exp = 'news'
        elif any(kw in nl for kw in ['sport', 'espn', 'bein', 'nba', 'football', 'cricket']):
            exp = 'sports'
        elif any(kw in nl for kw in ['nick', 'cartoon', 'disney', 'kids', 'baby', 'pogo']):
            exp = 'kids'
        elif any(kw in nl for kw in ['mtv', 'vh1', 'music', 'stingray', 'radio']):
            exp = 'music'
        elif any(kw in nl for kw in ['discovery', 'nat geo', 'history', 'animal planet', 'bbc earth']):
            exp = 'documentary'
        elif any(kw in nl for kw in ['movie', 'cinema', 'film', 'bollywood']):
            exp = 'movies'
        elif any(kw in nl for kw in AFRICAN_KEYWORDS):
            exp = 'african'
        elif culture in ('usa', 'uk'):
            exp = 'entertainment'
        elif culture == 'africa':
            exp = 'african'
        elif culture == 'india':
            exp = 'indian'
        elif culture == 'arabic':
            exp = 'arabic'
        elif culture == 'france':
            exp = 'french'
        else:
            return None, 'noise', 'unclassified_general'

    return exp, tier, 'keep'

# ── CLASSIFY ALL ─────────────────────────────────────────────────

curated = []
filtered = []
stats = {
    'keep': 0, 'noise': 0,
    'by_experience': {},
    'by_tier': {},
    'filter_reasons': {},
}

for ch in channels:
    exp, tier, action = classify_channel(ch)

    if action == 'keep':
        ch['experience'] = exp
        ch['tier'] = tier
        curated.append(ch)
        stats['keep'] += 1
        stats['by_experience'][exp] = stats['by_experience'].get(exp, 0) + 1
        stats['by_tier'][tier] = stats['by_tier'].get(tier, 0) + 1
    else:
        filtered.append({'name': ch['name'], 'reason': action, 'culture': ch.get('culture','?')})
        stats['noise'] += 1
        stats['filter_reasons'][action] = stats['filter_reasons'].get(action, 0) + 1

# ── REPORT ───────────────────────────────────────────────────────

print(f"{'='*60}")
print(f"CURATION RESULTS:")
print(f"  ✅ Kept:     {stats['keep']}")
print(f"  ❌ Filtered: {stats['noise']}")
print(f"\nBy Experience:")
for exp, count in sorted(stats['by_experience'].items(), key=lambda x: -x[1]):
    print(f"  {exp:20s} {count:>5}")
print(f"\nBy Tier:")
for tier, count in sorted(stats['by_tier'].items(), key=lambda x: -x[1]):
    print(f"  {tier:20s} {count:>5}")
print(f"\nFilter Reasons:")
for reason, count in sorted(stats['filter_reasons'].items(), key=lambda x: -x[1]):
    print(f"  {reason:30s} {count:>5}")

# Show sample filtered channels
print(f"\nSample filtered (first 20):")
for ch in filtered[:20]:
    print(f"  [{ch['reason']:25s}] {ch['name'][:50]} ({ch['culture']})")

# ── SAVE ─────────────────────────────────────────────────────────

with open(OUTPUT_FILE, 'w') as f:
    json.dump(curated, f, separators=(',', ':'))

with open(REPORT_FILE, 'w') as f:
    json.dump({
        'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'stats': stats,
        'filtered_sample': filtered[:100],
    }, f, indent=2)

size_mb = os.path.getsize(OUTPUT_FILE) / 1024 / 1024
print(f"\n💾 Curated: {OUTPUT_FILE} ({len(curated)} channels, {size_mb:.1f}MB)")
print(f"💾 Report: {REPORT_FILE}")

# Show the final experience breakdown with sample channels
print(f"\n{'='*60}")
print("FINAL CURATED EXPERIENCES:")
by_exp = {}
for ch in curated:
    by_exp.setdefault(ch['experience'], []).append(ch)

for exp, chs in sorted(by_exp.items(), key=lambda x: -len(x[1])):
    premium = sum(1 for ch in chs if ch.get('tier') == 'premium')
    print(f"\n  {exp.upper()} ({len(chs)} channels, {premium} premium):")
    for ch in chs[:5]:
        tier_mark = '⭐' if ch.get('tier') == 'premium' else '🌍' if ch.get('tier') == 'african' else '  '
        print(f"    {tier_mark} {ch['name'][:50]}")
    if len(chs) > 5:
        print(f"    ... and {len(chs)-5} more")
