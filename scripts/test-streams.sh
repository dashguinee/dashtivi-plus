#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DashTivi+ Stream Test Suite — Operation Smooth River
# Tests ALL stream paths programmatically. No human needed.
# Usage: bash scripts/test-streams.sh [--full]
# ═══════════════════════════════════════════════════════════════

PROXY="https://stream.zionsynapse.online"
API="$PROXY/api"
USER="Test032026"
PASS="032026Test"
PASS_TOTAL=0
FAIL_TOTAL=0
WARN_TOTAL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS_TOTAL=$((PASS_TOTAL+1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL_TOTAL=$((FAIL_TOTAL+1)); }
warn() { echo -e "  ${YELLOW}!${NC} $1"; WARN_TOTAL=$((WARN_TOTAL+1)); }
header() { echo -e "\n${CYAN}═══ $1 ═══${NC}"; }

# ─── 1. Infrastructure Health ────────────────────────────────
header "INFRASTRUCTURE"

# Site
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://tivi.dasuperhub.com")
[ "$status" = "200" ] && pass "Site: $status" || fail "Site: $status"

# VPS Health
health=$(curl -s --max-time 5 "$PROXY/health" 2>/dev/null)
if echo "$health" | grep -q '"ok"'; then
    concurrent=$(echo "$health" | grep -oP '"concurrent":\d+' | cut -d: -f2)
    pass "VPS Health: OK (${concurrent} active streams)"
else
    fail "VPS Health: DOWN"
fi

# API Proxy
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API?action=get_live_categories&u=$USER&p=$PASS")
[ "$status" = "200" ] && pass "API Proxy: $status" || fail "API Proxy: $status"

# API Cache
cache=$(curl -s -D - -o /dev/null --max-time 10 "$API?action=get_live_categories&u=$USER&p=$PASS" 2>&1 | grep -i "x-cache" | tr -d '\r')
echo "$cache" | grep -qi "HIT" && pass "API Cache: HIT" || warn "API Cache: MISS (cold)"

# Probe data
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$PROXY/probe-results.json")
[ "$status" = "200" ] && pass "Probe Results: $status" || warn "Probe Results: $status"

# Channels health
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$PROXY/channels.json")
[ "$status" = "200" ] && pass "Channels Health: $status" || warn "Channels Health: $status"

# ─── 2. Live Stream Tests ────────────────────────────────────
header "LIVE STREAMS"

# Get a real live channel
LIVE_ID=$(curl -s "$API?action=get_live_streams&u=$USER&p=$PASS&category_id=5" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['stream_id'] if d else '')" 2>/dev/null)

if [ -n "$LIVE_ID" ]; then
    pass "Live channel found: ID=$LIVE_ID"

    # Test HD mode
    result=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}|%{content_type}" --max-time 8 "$PROXY/live?id=$LIVE_ID&u=$USER&p=$PASS")
    code=$(echo $result | cut -d'|' -f1)
    size=$(echo $result | cut -d'|' -f2)
    type=$(echo $result | cut -d'|' -f3)
    if [ "$code" = "200" ] && [ "$size" -gt 10000 ] 2>/dev/null; then
        pass "Live HD: $code ${size} bytes ($type)"
    else
        fail "Live HD: code=$code size=$size type=$type"
    fi

    # Test ECO mode
    result=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}" --max-time 8 "$PROXY/live?id=$LIVE_ID&u=$USER&p=$PASS&q=eco")
    code=$(echo $result | cut -d'|' -f1)
    size=$(echo $result | cut -d'|' -f2)
    if [ "$code" = "200" ] && [ "$size" -gt 5000 ] 2>/dev/null; then
        pass "Live ECO: $code ${size} bytes"
    else
        fail "Live ECO: code=$code size=$size"
    fi

    # FFprobe test — actually verify video/audio codecs
    ffprobe_out=$(timeout 10 ffprobe -v error -show_entries stream=codec_name,codec_type -of csv=p=0 "$PROXY/live?id=$LIVE_ID&u=$USER&p=$PASS" 2>&1 | head -3)
    if echo "$ffprobe_out" | grep -q "video"; then
        pass "Live FFprobe: video stream confirmed"
    else
        warn "Live FFprobe: $ffprobe_out"
    fi
else
    fail "No live channels found"
fi

# ─── 3. VOD Stream Tests (MP4) ───────────────────────────────
header "VOD STREAMS (MP4)"

# Get a real movie
VOD_DATA=$(curl -s "$API?action=get_vod_streams&u=$USER&p=$PASS&category_id=597" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for m in d[:10]:
    ext = m.get('container_extension','mp4')
    if ext == 'mp4':
        print(f\"{m['stream_id']}|{m['name'][:40]}|{ext}\")
        break
" 2>/dev/null)

VOD_ID=$(echo $VOD_DATA | cut -d'|' -f1)
VOD_NAME=$(echo $VOD_DATA | cut -d'|' -f2)
VOD_EXT=$(echo $VOD_DATA | cut -d'|' -f3)

if [ -n "$VOD_ID" ]; then
    pass "VOD found: $VOD_NAME (ID=$VOD_ID, ext=$VOD_EXT)"

    # Test proxy passthrough (mp4)
    VOD_URL="$PROXY/?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://datahub11.com:80/movie/$USER/$PASS/$VOD_ID.mp4'))")"
    result=$(curl -s -r 0-50000 -o /dev/null -w "%{http_code}|%{size_download}|%{content_type}" --max-time 10 "$VOD_URL")
    code=$(echo $result | cut -d'|' -f1)
    size=$(echo $result | cut -d'|' -f2)
    type=$(echo $result | cut -d'|' -f3)
    if [ "$code" = "200" ] || [ "$code" = "206" ]; then
        pass "VOD MP4 Proxy: $code ${size} bytes ($type)"
    else
        fail "VOD MP4 Proxy: code=$code size=$size"
    fi

    # Test Range header (seeking)
    result=$(curl -s -r 1000000-1001000 -o /dev/null -w "%{http_code}|%{size_download}" --max-time 10 "$VOD_URL")
    code=$(echo $result | cut -d'|' -f1)
    size=$(echo $result | cut -d'|' -f2)
    if [ "$code" = "206" ]; then
        pass "VOD Seek (Range): $code ${size} bytes"
    elif [ "$code" = "200" ]; then
        warn "VOD Seek: 200 (no partial content support)"
    else
        fail "VOD Seek: code=$code"
    fi

    # FFprobe — verify it's real video
    ffprobe_out=$(timeout 10 ffprobe -v error -show_entries stream=codec_name,codec_type,duration -of csv=p=0 "$VOD_URL" 2>&1 | head -3)
    if echo "$ffprobe_out" | grep -q "video"; then
        pass "VOD FFprobe: video confirmed"
    else
        warn "VOD FFprobe: $ffprobe_out"
    fi
else
    fail "No MP4 movies found"
fi

# ─── 4. VOD Stream Tests (MKV remux) ─────────────────────────
header "VOD STREAMS (MKV REMUX)"

MKV_DATA=$(curl -s "$API?action=get_vod_streams&u=$USER&p=$PASS&category_id=597" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for m in d[:50]:
    ext = m.get('container_extension','mp4')
    if ext == 'mkv':
        print(f\"{m['stream_id']}|{m['name'][:40]}|{ext}\")
        break
" 2>/dev/null)

MKV_ID=$(echo $MKV_DATA | cut -d'|' -f1)
MKV_NAME=$(echo $MKV_DATA | cut -d'|' -f2)

if [ -n "$MKV_ID" ]; then
    pass "MKV found: $MKV_NAME (ID=$MKV_ID)"

    # Test /vod remux route
    result=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}|%{content_type}" --max-time 15 "$PROXY/vod?id=$MKV_ID&u=$USER&p=$PASS&ext=mkv&type=movie")
    code=$(echo $result | cut -d'|' -f1)
    size=$(echo $result | cut -d'|' -f2)
    type=$(echo $result | cut -d'|' -f3)
    if [ "$code" = "200" ] && [ "$size" -gt 10000 ] 2>/dev/null; then
        pass "MKV Remux: $code ${size} bytes ($type)"
    else
        fail "MKV Remux: code=$code size=$size type=$type"
    fi
else
    warn "No MKV movies in first 50 results (skipped)"
fi

# ─── 5. Series Stream Test ────────────────────────────────────
header "SERIES STREAMS"

SERIES_ID=$(curl -s "$API?action=get_series&u=$USER&p=$PASS&category_id=106" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['series_id'] if d else '')" 2>/dev/null)

if [ -n "$SERIES_ID" ]; then
    pass "Series found: ID=$SERIES_ID"

    # Get first episode
    EP_DATA=$(curl -s "$API?action=get_series_info&u=$USER&p=$PASS&series_id=$SERIES_ID" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
eps = d.get('episodes',{})
for season in sorted(eps.keys()):
    for ep in eps[season]:
        print(f\"{ep['id']}|{ep.get('container_extension','mp4')}\")
        break
    break
" 2>/dev/null)

    EP_ID=$(echo $EP_DATA | cut -d'|' -f1)
    EP_EXT=$(echo $EP_DATA | cut -d'|' -f2)

    if [ -n "$EP_ID" ]; then
        pass "Episode found: ID=$EP_ID (ext=$EP_EXT)"

        if [ "$EP_EXT" = "mp4" ]; then
            EP_URL="$PROXY/?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://datahub11.com:80/series/$USER/$PASS/$EP_ID.mp4'))")"
        else
            EP_URL="$PROXY/vod?id=$EP_ID&u=$USER&p=$PASS&ext=$EP_EXT&type=series"
        fi

        result=$(curl -s -r 0-50000 -o /dev/null -w "%{http_code}|%{size_download}" --max-time 10 "$EP_URL")
        code=$(echo $result | cut -d'|' -f1)
        size=$(echo $result | cut -d'|' -f2)
        if [ "$code" = "200" ] || [ "$code" = "206" ]; then
            pass "Series Play: $code ${size} bytes"
        else
            fail "Series Play: code=$code size=$size"
        fi
    else
        warn "No episodes found for series $SERIES_ID"
    fi
else
    fail "No series found"
fi

# ─── 6. CORS Test ─────────────────────────────────────────────
header "CORS"

cors=$(curl -s -H "Origin: https://tivi.dasuperhub.com" -D - -o /dev/null --max-time 5 "$PROXY/health" 2>&1 | grep -i "access-control-allow-origin" | tr -d '\r')
if echo "$cors" | grep -q "tivi.dasuperhub.com"; then
    pass "CORS: tivi.dasuperhub.com allowed"
else
    fail "CORS: $cors"
fi

# Blocked origin
cors2=$(curl -s -H "Origin: https://evil.com" -D - -o /dev/null --max-time 5 "$PROXY/health" 2>&1 | grep -i "access-control-allow-origin" | tr -d '\r')
if echo "$cors2" | grep -q "evil.com"; then
    fail "CORS: evil.com NOT blocked!"
else
    pass "CORS: evil.com blocked"
fi

# ─── 7. TMDB Data Health ──────────────────────────────────────
header "TMDB DATA"

python3 -c "
with open('src/lib/tmdb-map.generated.ts') as f:
    c = f.read()
movies = c.count('\"m:')
series = c.count('\"s:')
trailers = c.count('y:\"')
import os
size = os.path.getsize('src/lib/tmdb-map.generated.ts')
print(f'ENTRIES:{movies}|{series}|{trailers}|{size}')
" 2>/dev/null | while IFS='|' read -r movies series trailers size; do
    movies=${movies#ENTRIES:}
    echo -e "  ${GREEN}✓${NC} Movies: $movies | Series: $series | Trailers: $trailers | Size: $((size/1024))KB"
done

# ─── 8. Image Proxy ───────────────────────────────────────────
header "IMAGE PROXY"

# Test datahub image (rewritten from starshare)
result=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}" --max-time 5 "$PROXY/?url=http%3A%2F%2Fdatahub11.com%3A8080%2Fimages%2F2fee2422e7dbae588c9b00b66da68eef.jpg")
code=$(echo $result | cut -d'|' -f1)
size=$(echo $result | cut -d'|' -f2)
[ "$code" = "200" ] && [ "$size" -gt 1000 ] 2>/dev/null && pass "Image Proxy: $code ${size} bytes" || fail "Image Proxy: code=$code size=$size"

# ─── 9. Security ──────────────────────────────────────────────
header "SECURITY"

# SSRF protection
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$PROXY/?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data")
[ "$status" = "403" ] || [ "$status" = "400" ] && pass "SSRF blocked: $status" || fail "SSRF NOT blocked: $status"

# Bad ext blocked
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$PROXY/vod?id=1&u=$USER&p=$PASS&ext=exe&type=movie")
[ "$status" = "400" ] && pass "Bad ext blocked: $status" || fail "Bad ext NOT blocked: $status"

# Invalid action blocked
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API?action=get_user_info&u=$USER&p=$PASS")
[ "$status" = "403" ] && pass "Blocked action: $status" || fail "Action NOT blocked: $status"

# ═══════════════════════════════════════════════════════════════
header "RESULTS"
echo -e "  ${GREEN}PASS: $PASS_TOTAL${NC}  ${RED}FAIL: $FAIL_TOTAL${NC}  ${YELLOW}WARN: $WARN_TOTAL${NC}"
echo ""

if [ $FAIL_TOTAL -eq 0 ]; then
    echo -e "  ${GREEN}★ ALL SYSTEMS OPERATIONAL — LAUNCH READY ★${NC}"
else
    echo -e "  ${RED}✗ $FAIL_TOTAL FAILURES — FIX BEFORE LAUNCH${NC}"
fi
echo ""
