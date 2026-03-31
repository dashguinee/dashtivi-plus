# DashTivi+ Performance Audit

**Date**: 2026-03-28
**Build tool**: Vite 6.4.1
**Build time**: 4.44s (1530 modules)

---

## 1. Bundle Analysis

### Total Bundle: 14MB uncompressed, ~470KB gzipped (critical path)

| Chunk | Raw | Gzipped | Notes |
|-------|-----|---------|-------|
| **logo-data** | 556.55 KB | 85.43 KB | LARGEST — 9,364 channel logo URLs |
| **hls.js** | 522.86 KB | 161.71 KB | HLS streaming engine (unavoidable) |
| **mpegts.js** | 273.81 KB | 63.77 KB | MPEG-TS parser (unavoidable) |
| **router** | 161.76 KB | 52.97 KB | react-router-dom |
| **index (core)** | 125.41 KB | 37.25 KB | React + app shell |
| **HomePage** | 70.06 KB | 20.41 KB | Biggest page chunk |
| **CSS** | 87.53 KB | 14.52 KB | 1,188 lines, 36 keyframe animations |
| MoviesPage | 22.12 KB | 7.38 KB | |
| SeriesPage | 18.97 KB | 6.44 KB | |
| LiveTVPage | 17.67 KB | 5.61 KB | |

**Critical path** (what loads before first paint):
- index.js (37KB gz) + CSS (14KB gz) + router (53KB gz) = **~104KB gzipped**
- All page chunks are lazy-loaded (good)
- hls.js, mpegts.js, logo-data are split into separate chunks (good)

### Verdict: Bundle structure is WELL OPTIMIZED
The manual chunks in vite.config.ts correctly isolate heavy dependencies. The main concern is **logo-data at 556KB raw / 85KB gzipped** which is loaded during splash screen via preloader.

---

## 2. API Call Audit

### HomePage — ~30-37 API calls on mount

**Phase 1 (immediate):** 22 calls
- `fetchVpsHealth()` — 1 call
- `fetchServerProbeData()` — 1 call
- 7 collections load in parallel:
  - Live Sports: `getLiveStreams` x5 categories (85, 353, 578, 234, 492)
  - Fresh Movies: `getVodStreams` x2 (749, 597)
  - Kids: `getLiveStreams` x2 (410, 32)
  - News: `getLiveStreams` x3 (82, 417, 165)
  - 4K Movies: `getVodStreams` x2 (122, 34)
  - Binge-Worthy: `getSeries` x2 (267, 99)
  - World Cinema: `getLiveStreams` x4 (11, 15, 86, 247)

**Phase 2 (after main load):** 5 calls
- `getTmdbMap()` — 1 fetch (/tmdb-data.json)
- `getVodStreams` x4 (749, 597, 525, 122) — recommendation pool

**Phase 3 (hex sections):** ~10 calls (some cached)
- `getSeries(106)` — Netflix hex
- `getVodStreams(240, 34)` — DASH Originals
- `getLiveStreams(234, 85, 492)` — Fixtures (largely cached from Phase 1)
- `getLiveStreams(234)` — Football discovery (cached)
- `getSeries` x4 — Platform showcase previews

**Mitigations already in place:**
- `categoryCache` ref prevents duplicate fetches for cat 234 (football)
- `cachedFetch()` with 1-hour localStorage TTL
- Collections limited to `slice(0, 4)` categories for live
- Phase 2/3 only run after Phase 1 completes (waterfall, not parallel — intentional to not overwhelm)

### LiveTVPage — ~18 API calls on mount
- `fetchVpsHealth()` + `fetchServerProbeData()` — 2 calls
- `getFreeChannels()` — 1 call
- Theme streams: `getLiveStreams` across 8 themes x ~3 categories each (~24 calls, many deduplicated by cachedFetch)

### MoviesPage — 1-5 API calls on mount
- `getTmdbMap()` — 1 call
- `getVodStreams(catId)` — 1-3 calls per subtab

**Verdict**: API call count is HIGH for HomePage (~30) but mitigated by:
1. localStorage caching (1hr TTL)
2. Shared category cache (prevents duplicates)
3. Preloader warms cache during splash screen
4. Phase 2/3 are lazy (don't block first paint)

---

## 3. Caching Strategy

### localStorage-based (`xtream.ts`)
- **TTL**: 1 hour per entry
- **Max entry size**: 200KB (larger responses skip cache)
- **Eviction**: LRU — deletes oldest 50% when QuotaExceeded
- **Key pattern**: `xtream_{action}_{catId}`

### Service Worker (`sw.js`, cache v7)
- **Static assets** (JS/CSS in /assets/): cache-first (content-hashed filenames)
- **JSON data files**: network-first with cache fallback
- **HTML navigation**: network-first with /index.html fallback
- **Images/logos**: cache-first
- **Fonts**: cache-first
- **Streaming URLs**: explicitly excluded (no SW involvement)

### Preloader (`preloader.ts`)
- Phase 1 (200ms): VPS health + probe data
- Phase 2 (1s): TMDB data + logo map import
- Phase 3 (1.5s): HomePage + LiveTVPage chunks + free channels
- Post-auth: API category lists + hot category data

**Verdict**: Caching is SOLID. The 3-tier approach (preloader + localStorage + SW) means second visits are near-instant.

---

## 4. CSS Performance

| Metric | Count | Severity |
|--------|-------|----------|
| Total lines | 1,188 | OK |
| Gzipped size | 14.52 KB | OK |
| `@keyframes` animations | 36 | MODERATE concern |
| `will-change` declarations | 3 | OK |
| `backdrop-filter` uses | ~15 | HIGH on mobile |
| `transition` properties | 21 | OK |
| `transform` uses | 84 | OK (mostly hover states) |

### Always-on animations (GPU cost):
- `cosmic-rotate` — 20s infinite (CosmicBackground canvas)
- `splash-breathe` — 2s infinite (login screen only)
- `float` — 6-8s infinite (login particles only)
- `live-ring` — 2s infinite (live badges)
- `blade-pass` / `blade-pass-reverse` — 7-10s infinite (ambient blobs)
- `logo-pulse` / `title-shimmer` — 3s infinite (login screen only)
- `orbit-1/2/3` — 20-30s infinite (login screen only)

Most always-on animations are **login screen only** and unmount after auth. The main app has `blade-pass` (ambient blobs) and `live-ring` (live badges) running continuously.

### `backdrop-filter` (expensive on mobile):
- Sticky headers on LiveTVPage, MoviesPage — `backdrop-blur-lg`
- ContentDetailModal, TrailerModal, VeeMoodOverlay — full-screen blurs
- FeedSection overlay — `blur(12px)`
- Glass components in globals.css — `blur(20-40px)`

**Verdict**: CSS is mostly fine. The `backdrop-filter` usage on sticky headers is the main mobile performance concern — these cause compositing on every scroll frame.

---

## 5. React Performance

### Component Memoization

| Component | `React.memo` | Renders frequently? | Status |
|-----------|:---:|:---:|--------|
| PosterCard | YES | YES (grid items) | GOOD |
| ChannelIcon | YES | YES (channel lists) | GOOD |
| HexCard | YES | YES (hex rows) | GOOD |
| FeedSection | YES (FIXED) | Moderate | FIXED |
| FeedCarousel | YES (FIXED) | Moderate | FIXED |

### `useMemo` / `useCallback` Usage

| Page | Count | Assessment |
|------|-------|------------|
| HomePage | 4 | LOW — 18 inline `onClick` handlers cause re-render propagation |
| LiveTVPage | 4 | OK — most handlers are memoized via useCallback |
| MoviesPage | 9 | GOOD — extensive memoization |
| SeriesPage | 11 | EXCELLENT |

### Key Issue: HomePage inline handlers
The HomePage has **18 inline `onClick={() =>` handlers** that create new function references every render. With ~30+ state variables and multiple `useEffect` hooks triggering re-renders, this means child components (even memoized ones like PosterCard) may re-render unnecessarily.

---

## 6. Image Loading

### Lazy Loading: GOOD
- PosterCard: 2x `loading="lazy"` + `decoding="async"` on poster images
- ChannelIcon: `loading="lazy"` + `decoding="async"`
- Platform logos: `loading="lazy"`
- FeedCard images: `loading="lazy"`

### Layout Shift (CLS): LOW RISK
- PosterCard uses `aspect-[2/3]` container — fixed aspect ratio prevents shift
- ChannelIcon uses fixed size classes (`w-10 h-10`, `w-14 h-14`, `w-20 h-20`)
- Continue Watching uses `aspect-video` — stable

### Image Fallback Chain: ROBUST
1. Xtream API icon -> `safeImageUrl()` sanitization
2. TMDB poster fallback (`/t/p/w342`)
3. tv-logo CDN fallback (ChannelIcon only)
4. Letter avatar / gradient placeholder

---

## 7. Fixes Implemented

### Fix 1: Preconnect for image.tmdb.org
**File**: `index.html`
Added `<link rel="preconnect" href="https://image.tmdb.org" crossorigin />` — was only `dns-prefetch` before. This saves ~100-200ms on first TMDB poster load by establishing the TCP+TLS connection early.

### Fix 2: Preconnect for Supabase
**File**: `index.html`
Added `<link rel="preconnect" href="https://mclbbkmpovnvcfmwsoqt.supabase.co" crossorigin />` — FeedSection fetches from Supabase REST API on mount.

### Fix 3: Removed unused imports
**Files**: `HomePage.tsx`, `LiveTVPage.tsx`, `PlatformsPage.tsx`
Removed: `Tv`, `Film`, `MonitorPlay`, `Sparkles`, `HexRow`, `CLUB_COLORS`, `getFreeChannelsByExperience`, `dailyShuffle`, `Search`, `ChevronRight`, `getVodStreams`, `buildVodUrl`.
Impact: Reduces tree-shaking work and eliminates dead Lucide icon imports (each icon is ~0.3-0.7KB).

### Fix 4: Memoized FeedSection and FeedCarousel
**Files**: `FeedSection.tsx`, `FeedCarousel.tsx`
Wrapped both with `React.memo()` — these components manage their own data fetching and don't depend on parent props, but were re-rendering on every HomePage state change.

### Fix 5: Optimized useScrollFocus from perpetual rAF to event-driven
**File**: `src/hooks/useScrollFocus.ts`
**Before**: Perpetual `requestAnimationFrame` loop running ~60fps even when nothing is scrolling.
**After**: Event-driven — only recalculates on `scroll` (capture phase) and `resize` events, plus one initial pass.
**Impact**: Eliminates ~60 unnecessary DOM queries per second when user is not scrolling. Significant battery/CPU savings on mobile.

---

## 8. Recommended Future Optimizations

### HIGH PRIORITY

1. **Convert logo-map to JSON fetch** (like TMDB data)
   - Current: 556KB JS chunk loaded via `import()` — must be parsed as JavaScript
   - Proposed: Move to `/logo-map.json`, fetch via `fetch()`, SW caches it
   - Impact: ~30% faster parse time (JSON.parse vs JS eval), better SW caching
   - Effort: ~1 hour

2. **Reduce HomePage API calls with batched loading**
   - Current: 22+ parallel API calls on mount
   - Proposed: Load above-the-fold collections first (sports + movies), defer below-fold
   - Use IntersectionObserver to lazy-load collection rows as they scroll into view
   - Impact: Halve initial network pressure, faster first meaningful paint
   - Effort: ~3 hours

3. **Replace `backdrop-filter` on sticky headers with solid backgrounds**
   - Current: `bg-[#0A0A0A]/90 backdrop-blur-lg` on LiveTVPage, MoviesPage headers
   - Proposed: `bg-[#0A0A0A]` (fully opaque, no blur needed)
   - Impact: Eliminates expensive compositing layer on every scroll frame (mobile)
   - Effort: ~15 minutes

### MEDIUM PRIORITY

4. **Memoize HomePage inline handlers**
   - Wrap the 18 inline `onClick={() =>` handlers in `useCallback`
   - Especially: `playHistoryItem`, `playLive`, navigation handlers
   - Impact: Prevents unnecessary PosterCard/ChannelIcon re-renders
   - Effort: ~1 hour

5. **Implement virtual scrolling for large grids**
   - MoviesPage/SeriesPage render 50+ PosterCards in grid
   - Use `react-window` or simple IntersectionObserver-based virtualization
   - Impact: DOM node count drops from ~200 to ~30 visible
   - Effort: ~2 hours

6. **Split CosmicBackground canvas animation**
   - Currently renders on every frame via rAF in `CosmicBackground.tsx`
   - Could use OffscreenCanvas in a Web Worker (supported in Chrome/Edge)
   - Or reduce frame rate to 30fps for the cosmic effect
   - Effort: ~2 hours

7. **App.tsx ambient blob rAF loop**
   - Runs continuously for pulse animation
   - Could be driven by CSS animation instead of JS rAF
   - Or throttle to 30fps with frame skip logic
   - Effort: ~30 minutes

### LOW PRIORITY

8. **Reduce CSS keyframes count** (36 animations)
   - Many are login-screen-only — already unmounted after auth
   - Could combine similar animations (e.g., `float` variants)
   - Effort: ~1 hour

9. **Add `fetchpriority="high"` to hero images**
   - Browser hint for above-the-fold images
   - Effort: ~5 minutes

10. **Consider `content-visibility: auto`** for off-screen sections
    - CSS containment for collection rows below the fold
    - Skips layout/paint for off-screen content
    - Effort: ~30 minutes

---

## Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Bundle splitting | 9/10 | Excellent manual chunks, all pages lazy |
| Caching | 9/10 | 3-tier (preloader + localStorage + SW) |
| API efficiency | 6/10 | Too many calls on HomePage mount |
| CSS performance | 7/10 | backdrop-filter on mobile is the main concern |
| React optimization | 7/10 | Good memoization, but HomePage needs more |
| Image handling | 9/10 | Lazy loading + fallback chain + dimensions |
| Preloading | 9/10 | Phased preloader during splash screen |
| **Overall** | **8/10** | Production-ready, mobile optimizations needed |

---

*Generated by ZION performance audit, 2026-03-28*
