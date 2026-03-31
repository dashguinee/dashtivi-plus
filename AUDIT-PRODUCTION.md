# DashTivi+ Production-Grade Audit

**Date**: 2026-03-20
**Status**: READ-ONLY AUDIT — No changes made
**Goal**: Fully functional app that "just needs tweaking"

---

## Executive Summary

| Area | Readiness | Top Issue |
|------|-----------|-----------|
| **Security** | 50% | SSRF in VPS proxy, hardcoded credentials |
| **VPS Proxy** | 70% | No concurrency limit, no spawn error handling |
| **Supabase** | 40% | No migration files, no RLS, no indexes |
| **Frontend UX** | 85% | No network error states, no list virtualization |
| **Build/Deploy** | 95% | Env vars hardcoded instead of .env |
| **Caching** | 70% | No localStorage quota management |
| **State Mgmt** | 90% | Minor race conditions, cleanup edge cases |

**Total issues found: 48** (12 Critical/High, 18 Medium, 18 Low/Nice-to-have)

---

## PHASE 1: BLOCKERS (Fix before sharing with more users)

### 1. SSRF in VPS Proxy `?url=` Parameter
**Severity: CRITICAL | File: vps-proxy-fmp4.sh:381-479**

The `?url=` parameter accepts ANY URL and proxies it. An attacker can scan internal networks:
```
GET /?url=http://169.254.169.254/latest/meta-data/   ← AWS metadata
GET /?url=http://localhost:8080/admin                  ← internal services
```

**Fix**: Whitelist allowed hosts (only `datahub11.com` + Starshare IPs). Reject private IP ranges.

---

### 2. Hardcoded Test Credentials in Source Code
**Severity: CRITICAL | File: xtream.ts:510, vps-proxy-fmp4.sh:555**

`Test032026/032026Test` is visible in compiled JS bundle and Git history. Anyone can use these to probe channels.

**Fix**: Move to environment variable. Rotate credentials.

---

### 3. Hardcoded Supabase Anon Key
**Severity: CRITICAL | File: useAuth.ts:16-17**

JWT token hardcoded in source. While anon keys are meant to be public with RLS, there's no RLS configured.

**Fix**: Move to `import.meta.env.VITE_SUPABASE_ANON_KEY`. Set up proper RLS.

---

### 4. No Supabase Migration / RLS
**Severity: CRITICAL | No migration files exist**

`tivi_access_codes` table has no documented schema, no RLS policy, no indexes on `code` column. Anyone with the anon key can query all access codes.

**Fix**: Create migration with schema, RLS (only select active non-expired codes), index on `code`.

---

### 5. No Rate Limiting on Login
**Severity: HIGH | File: useAuth.ts:91-124**

Access codes can be brute-forced — no delay between attempts, no lockout.

**Fix**: Exponential backoff after 3 failures. Server-side rate limit via Supabase edge function or RLS.

---

### 6. VPS Proxy: No Concurrency Limit
**Severity: HIGH | File: vps-proxy-fmp4.sh**

No global cap on FFmpeg processes. 100 simultaneous users = 100 FFmpeg instances = OOM crash.

**Fix**: Add semaphore (max 50 concurrent streams). Return 503 when full.

---

### 7. Credentials in URL Query Params
**Severity: HIGH | File: xtream.ts:243,253,262**

`/live?u=username&p=password` — credentials visible in browser history, VPS logs, CDN logs, screenshots.

**Fix**: Move to POST body or Authorization header. Server stores credentials after initial auth.

---

### 8. Open Redirect via HTTP 302
**Severity: HIGH | File: vps-proxy-fmp4.sh:464-476**

VPS blindly follows redirects from upstream. Malicious redirect → VPS proxies attacker content under trusted domain.

**Fix**: Validate redirect targets match allowed hosts. Max 2 redirect depth.

---

### 9. Path Traversal in /probe Endpoint
**Severity: HIGH | File: vps-proxy-fmp4.sh:64-151**

`probeUser` and `probePass` are concatenated into URL with no sanitization. Special chars enable path traversal.

**Fix**: Validate alphanumeric only for username/password params. Validate stream IDs are numeric.

---

### 10. Wildcard CORS
**Severity: MEDIUM | File: vps-proxy-fmp4.sh:15**

`Access-Control-Allow-Origin: *` — any website can embed DashTivi+ streams.

**Fix**: Restrict to `tivi.dasuperhub.com` and `localhost:5180`.

---

### 11. No .env in .gitignore
**Severity: MEDIUM | File: .gitignore**

Only `.vercel` is gitignored. If `.env` is created, it could be committed.

**Fix**: Add `.env`, `.env.local`, `*.pem`, `credentials.json`.

---

### 12. Auth Code Expiry Not Checked Mid-Session
**Severity: MEDIUM-HIGH | File: useAuth.ts:101-103**

Expiry checked only at login. If code expires while watching, streams silently fail.

**Fix**: Periodic check (every 30 min) + graceful logout with message.

---

## PHASE 2: BROKEN FEATURES & UX GAPS

### 13. No Network Error States
**File: All pages (HomePage, LiveTVPage, MoviesPage, SeriesPage)**

When API calls fail, pages show empty content with no explanation. User thinks app is broken.

**Fix**: Add error states per section. "Unable to load — tap to retry" pattern.

---

### 14. No Fetch Timeout
**File: xtream.ts:104**

`fetch()` calls have no timeout. On slow networks, they hang indefinitely.

**Fix**: Add AbortController with 10s timeout on all fetch calls.

---

### 15. Player Error Messages Too Vague
**File: VideoPlayer.tsx:238-264, usePlayer.ts:78-101**

User sees "Retry 1/5" → "Stream interrupted" with no distinction between:
- Dead channel vs bad network vs server overload

**Fix**: Classify errors (network vs stream vs server). Show different messages per type.

---

### 16. Large Channel Lists Not Virtualized
**File: LiveTVPage.tsx:280, FrenchPage.tsx:131**

All channels rendered as DOM nodes at once. Categories with 2000+ channels will freeze mobile devices.

**Fix**: Windowed rendering (react-window or intersection observer lazy load).

---

### 17. Stale URLs in Watch History
**File: useWatchHistory.ts, HomePage.tsx:177**

"Continue Watching" stores full URLs. If stream ID changes, old URL fails silently.

**Fix**: Store only channel metadata (id, name, category). Rebuild URL fresh on play.

---

### 18. Series Episodes Modal Hangs on Bad Data
**File: SeriesPage.tsx:171-172**

If `seriesInfo.episodes` is missing, modal shows "Loading..." forever.

**Fix**: Add timeout (5s) → show "Episodes unavailable" on failure.

---

### 19. Quality Change Doesn't Apply to Current Stream
**File: PlayerControls.tsx:346**

"Applies on next channel" — user can't test eco mode without switching.

**Fix**: Add "Apply now" option that reconnects with new quality.

---

### 20. Search Results Unbounded
**File: MoviesPage.tsx:62-77**

Global search loads ALL featured categories into memory simultaneously. No pagination.

**Fix**: Limit to 50 results. Add "Load more" or paginate.

---

### 21. Download Button Exposes Raw Stream URLs
**File: MoviesPage.tsx:222, PlayerControls.tsx:247**

Download opens raw stream URL (not proxied), exposing Starshare endpoints in browser.

**Fix**: Route downloads through VPS proxy with proper headers.

---

### 22. Subtitles Fetch Fails Silently
**File: VideoPlayer.tsx:154-177**

Subtitle fetch error → `hasSubs=false` with no user feedback.

**Fix**: Show "Subtitles unavailable" toast instead of silently hiding CC button.

---

### 23. Two Health Systems Don't Sync
**File: LiveTVPage.tsx:82 vs useChannelHealth.ts**

VPS category-level health and client channel-level health are independent. Category "live" but all channels individually dead → empty grid, no message.

**Fix**: Sync systems. If >80% channels dead in category, mark category as degraded.

---

### 24. ErrorBoundary Too Broad
**File: ErrorBoundary.tsx:13-46**

Any component crash takes down the entire page. No "Go Home" button in fallback.

**Fix**: Granular error boundaries per section. Add navigation in fallback UI.

---

### 25. Login Error Messages Vague
**File: AccessCodeLogin.tsx:28-34**

All failures show "Invalid access code" — can't distinguish wrong code vs expired vs network error.

**Fix**: Show specific messages: "Code expired", "Invalid code", "Connection error — check internet".

---

### 26. Credentials Stored Unencrypted in localStorage
**File: useAuth.ts:105-113**

Xtream username/password in plaintext localStorage. XSS payload can steal them.

**Fix**: Store only access code. Re-fetch credentials from Supabase on app load.

---

## PHASE 3: INFRASTRUCTURE HARDENING

### 27. No Analytics or Error Tracking
**Impact: BLOCKER for scale**

Zero visibility into: user sessions, stream errors, page loads, FFmpeg failures.

**Fix**: Integrate Sentry (errors) + lightweight event tracking (stream start/stop/error).

---

### 28. No Session Timeout
**File: useAuth.ts**

User stays logged in forever until localStorage is cleared or code expires.

**Fix**: 30-day session timeout. Re-validate code on each app launch.

---

### 29. VPS FFmpeg Spawn Not Error-Handled
**File: vps-proxy-fmp4.sh:206**

If FFmpeg fails to spawn (OOM, disk full), response returns 200 with empty stream.

**Fix**: Wrap in try-catch. Return 503 on failure.

---

### 30. SSL Cert Renewal Not Documented
**File: vps-proxy-fmp4.sh:10-11**

Hardcoded Let's Encrypt paths. No evidence of certbot auto-renewal cron.

**Fix**: Verify `certbot renew` cron exists. Add monitoring for cert expiry.

---

### 31. No Content Security Policy
**File: index.html**

No CSP header → XSS payloads from data could execute.

**Fix**: Add meta CSP tag restricting scripts to 'self', connections to known domains.

---

### 32. VPS Health Endpoint Has No Rate Limit
**File: vps-proxy-fmp4.sh `/health`**

Unbounded requests to `/health` → DoS vector.

**Fix**: Rate limit to 10 req/min per IP.

---

### 33. localStorage Quota Not Managed
**File: Multiple caches across xtream.ts, useChannelHealth.ts, useWatchHistory.ts**

6+ caches with no global quota. Heavy browsing → QuotaExceededError → silent failures.

**Fix**: LRU cache with 5MB max. Clear all on logout.

---

### 34. PWA Offline Mode Incomplete
**File: sw.js**

Service worker skips streaming (correct) but doesn't cache API responses. App is blank offline.

**Fix**: Pre-cache homepage data, categories, and metadata on install. Show cached content when offline.

---

### 35. No CDN for Static Assets
**Impact: NICE-TO-HAVE**

JS/CSS bundles served directly from Vercel without long cache headers.

**Fix**: Set `Cache-Control: public, max-age=31536000` for hashed assets.

---

## PHASE 4: POLISH (Nice-to-have)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 36 | Rating shows 0 for "N/A" | PosterCard.tsx:116 | Validate rating format |
| 37 | No keyboard Home/End for VOD | VideoPlayer.tsx:66 | Map Home=start, End=end |
| 38 | Splash screen no max timeout | SplashScreen.tsx | Auto-dismiss after 10s |
| 39 | timeAgo() NaN on corrupt data | HomePage.tsx:35 | Validate timestamp |
| 40 | Subtitle URL construction fragile | VideoPlayer.tsx:152 | Use URL builder instead of string replace |
| 41 | Search history not persisted | All pages | Recent searches dropdown |
| 42 | Probe fires on every mount | LiveTVPage.tsx:240 | Memoize probe results |
| 43 | Mini player resets position | MiniPlayer.tsx | Persist playback state |
| 44 | No manual refresh button | All pages | Pull-to-refresh or refresh icon |
| 45 | SplashScreen setTimeout not cleaned | SplashScreen.tsx:17 | Cleanup in useEffect |
| 46 | Search debounce not cleaned on unmount | LiveTVPage.tsx:34 | Clear timer in cleanup |
| 47 | Race condition in probe dedup | xtream.ts:503-506 | Move Set.add before try |
| 48 | window.open missing noopener | Multiple files | Add 'noopener,noreferrer' |

---

## IMPLEMENTATION ORDER

```
WEEK 1 — Security (Items 1-11)
├── Day 1: SSRF whitelist + path traversal fix (VPS)
├── Day 2: Move credentials to env vars + CORS restriction
├── Day 3: Supabase migration + RLS + rate limiting
└── Day 4: Auth hardening (session timeout, mid-session check)

WEEK 2 — UX & Reliability (Items 13-26)
├── Day 1: Error states + fetch timeouts
├── Day 2: Player error classification + quality apply-now
├── Day 3: List virtualization + search pagination
└── Day 4: Watch history rebuild + episode modal fix

WEEK 3 — Infrastructure (Items 27-35)
├── Day 1: Sentry integration
├── Day 2: VPS concurrency limit + spawn error handling
├── Day 3: CSP + localStorage quota management
└── Day 4: PWA offline caching + SSL renewal verification

WEEK 4 — Polish (Items 36-48)
└── All remaining items, test, deploy
```

---

## WHAT'S WORKING WELL

- fMP4 live streaming pipeline — solid, proven architecture
- MKV auto-remux at VPS level — smart and transparent
- 3-layer health system (VPS + probe + client) — good defense in depth
- Eco mode — real bandwidth savings (9x reduction confirmed)
- DASH Cinema Loader — smart UX to hide buffer time
- Platform badges — professional Netflix/Prime/HBO branding
- Search across all pages — good UX
- Watch history with metadata — Continue Watching works well
- Chunk splitting in build — good performance
- TypeScript strict mode — catches bugs early

**The core product is solid. The gaps are primarily around security hardening, error resilience, and production observability.**
