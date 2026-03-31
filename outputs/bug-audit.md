# DashTivi+ Bug Audit Report

**Date**: 2026-03-28
**Auditor**: ZION SYNAPSE
**Scope**: Full codebase — build, types, CSS, i18n, data, components, accessibility, performance

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 6 |
| MEDIUM | 9 |
| LOW | 7 |

**Overall**: The app builds and all 7 production routes return HTTP 200. Code splitting with React.lazy is in place. Error boundaries exist. Probe data is fresh (20h old). The two critical issues are TypeScript compilation errors that could mask real bugs and silently swallowed errors in data loading.

---

## CRITICAL

### 1. TypeScript Compilation Errors (3 errors, build may still succeed via Vite but types are broken)

**File**: `src/pages/LiveTVPage.tsx` lines 11 and 27
**Issue**: Duplicate identifier `setAmbientExperience` — imported twice from `@/lib/ambient-audio`:
```
Line 11: import { setAmbientExperience } from '@/lib/ambient-audio';
Line 27: import { setAmbientSpeed, setAmbientExperience } from '@/lib/ambient-audio';
```
**Impact**: TypeScript error TS2300. Vite/esbuild still compiles it, but this masks any future type issues in the file.
**Fix**: Remove line 11 entirely. Line 27 already imports both `setAmbientSpeed` and `setAmbientExperience`.

**File**: `src/pages/HomePage.tsx` line 1280
**Issue**: `SmartCollection` cast to `Collection` fails TS2352 — `SmartCollection` lacks `categoryIds` and `limit` properties.
```typescript
subtitle={'description' in collection ? (collection as Collection).description : undefined}
```
This pattern appears on 4 lines (1245, 1280, 1311, 1338).
**Impact**: Type-unsafe cast. If `SmartCollection` ever adds a `description` field with a different type, this silently breaks.
**Fix**: Either add `description?: string` to `SmartCollection` interface, or use `(collection as unknown as Collection).description`, or (best) use a type guard: `'description' in collection ? (collection as { description: string }).description : undefined`.

### 2. Silent Error Swallowing in Critical Data Paths

**Files**: Multiple locations across `HomePage.tsx`, `LiveTVPage.tsx`, `xtream.ts`, `ambient-audio.ts`
**Issue**: At least 15 `catch {}` / `catch { /* silent */ }` blocks that discard errors without any logging or fallback.
Key offenders:
- `HomePage.tsx:640` — `catch {}` (completely empty) during platform data load
- `xtream.ts` — 4 empty catch blocks in core data fetching
- `ambient-audio.ts` — 3 empty catch blocks
**Impact**: When the Xtream API has issues, streams fail to load with zero diagnostics. Users see blank sections with no error state, and debugging is impossible.
**Fix**: Add at minimum `catch (e) { console.warn('[context]', e); }` to all catch blocks, and show user-facing error states where appropriate.

---

## HIGH

### 3. 22 Duplicate CSS Class Definitions in globals.css

**File**: `src/styles/globals.css` (1188 lines)
**Issue**: 22 CSS classes are defined more than once:
```
.feed-card-hover, .btn-sweep, .card-glow, .card-og, .card-shine,
.cosmic-bg-rotate, .feed-scroll-container, .hex-anim-breathe,
.hex-anim-flicker, .hex-anim-pulse, .hex-anim-shimmer, .img-reveal,
.img-settle, .login-particle, .reveal, .scroll-smooth-x, .scrollbar-hide,
.section-glow, .spring-press, .spring-soft, .stagger-card, .scroll-focus-card
```
Notable: `.scroll-focus-card` has 4 definitions.
**Impact**: Later definitions silently override earlier ones. If properties differ between duplicates, behavior is unpredictable. Hard to maintain.
**Fix**: Deduplicate — consolidate each class into a single definition with all needed properties.

### 4. 48 Potential Missing React `key` Props in `.map()` Calls

**Files**: Across all page components
**Top offenders**:
- `FrenchPage.tsx` — 6 instances
- `HomePage.tsx` — 12 instances
- `LiveTVPage.tsx` — multiple instances
**Impact**: React re-renders entire lists instead of diffing, causing performance degradation on scroll-heavy pages. Can also cause state bugs in interactive lists.
**Fix**: Audit each `.map()` call and ensure unique `key` props. Some may be false positives (key set on a wrapper 4+ lines down), but each should be verified.

### 5. 8 Images Missing `alt` Attributes

**Files**: `SeriesPage.tsx`, `ChannelIcon.tsx`, `ContentDetailModal.tsx`, `FeedCarousel.tsx`, `PosterCard.tsx` (2), `TrailerModal.tsx`, `VeeWidget.tsx`
**Impact**: Accessibility violation (WCAG 2.1 Level A). Screen readers cannot describe these images. Also affects SEO.
**Fix**: Add descriptive `alt` text. For decorative images, use `alt=""` explicitly.

### 6. 6 Images Missing `onError` Handlers

**Files**: `HomePage.tsx` (2 imgs), `PlatformsPage.tsx` (2 imgs), `SeriesPage.tsx` (1 img), `FeedSection.tsx` (1 img)
**Impact**: When image URLs are broken (common with IPTV stream icons), the browser shows a broken image icon instead of a graceful fallback.
**Fix**: Add `onError` handlers with fallback logic (like the existing pattern in `PosterCard.tsx` and `ChannelIcon.tsx`).

### 7. 69 Category IDs Referenced in Collections But Not Verified by Probe

**File**: `src/lib/collections.ts` references 128 unique category IDs
**Data**: 59 confirmed alive, 0 confirmed dead, 69 not in the probe set at all
**Impact**: Collections referencing unprobed categories may show empty rows with no content, degrading the user experience.
**Fix**: Expand the probe script to cover all category IDs referenced in collections, or add runtime fallback when a collection loads zero items.

### 8. 815 TMDB Entries Missing Poster Images

**Data**: `public/tmdb-data.json` has 44,105 entries; 815 (1.8%) lack poster data
**Impact**: Movie/series cards for these entries show a blank/broken poster, creating visual inconsistency in carousels.
**Fix**: Add placeholder poster generation for entries without `p` field, or filter them from display.

---

## MEDIUM

### 9. Credentials Passed in URL Query Parameters

**File**: `src/lib/preloader.ts` line 57, `src/lib/xtream.ts` lines 156, 376, 385, 394
**Issue**: Xtream API credentials (`username` and `password`) are passed as URL query parameters:
```
${proxyUrl}/api?u=${username}&p=${password}
```
**Impact**: Credentials visible in browser history, network logs, server access logs, and any CDN/proxy between client and server.
**Mitigation**: This is inherent to the Xtream API protocol, but the proxy layer (`stream.zionsynapse.online`) should strip credentials from logs.

### 10. Hardcoded Colors Outside Design Token System

**Files**: 20+ instances across pages and components
**Examples**:
- `LiveTVPage.tsx:661` — `bg-[#1a1a2e]`
- `PlatformsPage.tsx:260,267` — `bg-[#141414]`
- `SeriesPage.tsx:607,619` — `bg-[#141414]`
- `WelcomePage.tsx:65` — `bg-[#050508]`
- `AccessCodeLogin.tsx:44` — `bg-[#060609]`
- `ContentDetailModal.tsx:138,173` — `bg-[#0a0a0f]`
- `FeedSection.tsx:46-57` — 8 hardcoded color values
- `HexCard.tsx:21,29` — sports/team colors
**Impact**: No single source of truth for colors. Theme changes require hunting across files.
**Fix**: Define Tailwind custom colors or CSS variables for the dark surface palette (#050508, #060609, #0a0a0f, #141414, #1a1a2e).

### 11. FrenchPage Has High Hardcoded String Count

**File**: `src/pages/FrenchPage.tsx`
**Issue**: 9 calls to `t(lang,...)` but ~26 potentially hardcoded English strings
**Impact**: French users see English text on the WorldEX page.
**Fix**: Audit all user-visible strings in FrenchPage and add them to the i18n system.

### 12. PlatformsPage Has Zero i18n Coverage

**File**: `src/pages/PlatformsPage.tsx`
**Issue**: 0 translated strings, ~1 hardcoded string detected (likely more in JSX)
**Impact**: Entire page is untranslated — French users see English content.
**Fix**: Add translation keys for all user-visible strings in PlatformsPage.

### 13. 3 Unused UI Components Still in Codebase

**Files**:
- `src/components/ui/FeedCarousel.tsx` — not imported anywhere (FeedSection.tsx used instead)
- `src/components/ui/MoodCard.tsx` — not imported anywhere
- (Note: `VeeMoodOverlay.tsx` IS used — imported by `VeeWidget.tsx`)
**Impact**: Dead code increases bundle analysis confusion and maintenance burden.
**Fix**: Remove `FeedCarousel.tsx` and `MoodCard.tsx`, or mark them as future/experimental.

### 14. 2 Unused Library Modules

**Files**:
- `src/lib/logo-map.generated.ts` — only referenced in `preloader.ts` dynamic import but never actually used by rendering code
- `src/lib/tmdb-reviews.ts` — defines review fetching but no page imports it
**Impact**: `logo-map.generated.ts` is preloaded (~543KB chunk `logo-data-DTEWtwmj.js`!) but never consumed. That is 543KB of wasted bandwidth on every session.
**Fix**: Remove the preload of `logo-map.generated` from `preloader.ts` line 42 if it is truly unused. If it was meant to be used, wire it up.

### 15. 2 Large JS Chunks Exceeding 500KB

**Files in `dist/`**:
- `hls-BGvSEJpu.js` — 510KB (HLS.js library)
- `logo-data-DTEWtwmj.js` — 543KB (logo map, potentially unused)
**Impact**: Slow initial load on 3G connections (which is a key selling point for the SL market).
**Fix**: HLS.js is necessary but should be loaded only when a stream is played. The logo-data chunk appears unused (see #14) — remove the preload or the module entirely.

### 16. Empty Catch Block in HomePage Platform Load

**File**: `src/pages/HomePage.tsx` line 640
```typescript
} catch {}
```
**Impact**: If the entire platform showcase section fails to load, user gets no feedback and an empty section.
**Fix**: Add error state with retry UI.

### 17. `as any` Type Escape

**File**: `src/pages/HomePage.tsx` line 636
```typescript
} catch { return { platform: p, items: [] as any[], tmdbMap: TMDB }; }
```
**Impact**: Breaks type safety for the platform items array.
**Fix**: Replace with proper typed empty array: `items: [] as VodStream[]`.

---

## LOW

### 18. HomePage is 1,359 Lines

**File**: `src/pages/HomePage.tsx`
**Issue**: Largest component at 1,359 lines with 17 `useState` calls and only 4 memoization hooks.
**Impact**: Hard to maintain, test, and reason about. Re-renders on any state change affect the entire component tree.
**Fix**: Extract sections (HeroBlock, SportBreaker, PlatformShowcase, CollectionRow) into sub-components.

### 19. globals.css is 1,188 Lines

**File**: `src/styles/globals.css`
**Issue**: Monolithic CSS file with animations, utilities, component-specific styles all mixed.
**Impact**: Hard to find and modify specific styles. Duplicate definitions (see #3) are symptoms.
**Fix**: Consider splitting into `animations.css`, `utilities.css`, `components.css`.

### 20. No Accessibility ARIA Labels on Interactive Elements

**Files**: Multiple pages
**Issue**: Only 5 ARIA attributes found across all pages/components. Buttons in `HomePage.tsx`, `FrenchPage.tsx` lack `aria-label`.
**Impact**: Screen reader users cannot navigate the app effectively.
**Fix**: Add `aria-label` to icon-only buttons, `role` attributes to custom interactive elements.

### 21. Some `localStorage` Reads Lack Try-Catch

**Files**: `src/i18n.tsx` line 715, `src/pages/LiveTVPage.tsx` line 596
**Issue**: Direct `localStorage.getItem()` without try-catch. In private browsing or storage-full scenarios, this can throw.
**Impact**: App crash in edge cases (Safari private mode historically had localStorage quota of 0).
**Fix**: Wrap in try-catch or use the existing `getItem` helper from `@/lib/storage.ts` (which already handles this).

### 22. tmdb-data.json is 4.5MB (Uncompressed)

**File**: `public/tmdb-data.json` — 4,532,953 bytes
**Impact**: On first load with empty cache, this is a significant download. Gzip brings it to ~2MB but still large for 3G.
**Fix**: Consider splitting into category-specific chunks loaded on demand, or serve via CDN with aggressive caching headers.

### 23. Supabase URL Hardcoded as Fallback in 4 Places

**Files**: `useAuth.ts`, `tmdb-reviews.ts`, `FeedCarousel.tsx`, `FeedSection.tsx`
**Issue**: Each file independently declares `const SB_URL = ...` with the same fallback URL.
**Impact**: If the Supabase project ID ever changes, 4 files need updating.
**Fix**: Centralize Supabase config into a single `src/lib/supabase.ts` constants file.

### 24. No `loading="lazy"` on 6 of 18 Images

**Files**: Various components
**Issue**: 12 of 18 `<img>` tags have `loading="lazy"`, but 6 do not.
**Impact**: Above-the-fold images should NOT be lazy (correct), but below-fold images without lazy loading consume bandwidth unnecessarily.
**Fix**: Audit which images are below-fold and add `loading="lazy"`.

---

## Production Health Check

| Route | HTTP Status | Verdict |
|-------|-------------|---------|
| `/` | 200 | OK |
| `/live` | 200 | OK |
| `/movies` | 200 | OK |
| `/series` | 200 | OK |
| `/french` | 200 | OK |
| `/welcome` | 200 | OK |
| `/platforms` | 200 | OK |

**Probe data**: 20.0 hours old (FRESH)
**Alive streams**: 4,253
**TMDB coverage**: 44,105 entries (43,290 with posters, 30,900 with trailers)

---

## What's Working Well

- Code splitting with React.lazy on all 7 pages
- Error boundary wrapping the main content area
- AbortController/AbortSignal.timeout on most fetch calls
- Proper timer cleanup (setInterval/setTimeout) in useEffect returns
- Event listener cleanup in usePlayer hook
- .env properly gitignored
- Preloader strategy warms caches during splash screen
- Image fallback system in PosterCard and ChannelIcon components
- Comprehensive i18n with 350+ keys in both FR and EN (no missing keys used but not defined)
- Storage utility with proper error handling (`src/lib/storage.ts`)

---

## Priority Fix Order

1. **CRITICAL #1** — Fix duplicate import in LiveTVPage.tsx (5 min)
2. **CRITICAL #1** — Fix SmartCollection type cast in HomePage.tsx (10 min)
3. **HIGH #14** — Remove unused 543KB logo-data preload (5 min, saves bandwidth)
4. **CRITICAL #2** — Add error logging to empty catch blocks (30 min)
5. **HIGH #5/#6** — Add alt text and onError handlers to images (20 min)
6. **MEDIUM #12** — Add i18n to PlatformsPage (15 min)
7. **HIGH #3** — Deduplicate CSS classes (45 min)
8. **HIGH #4** — Audit React key props (30 min)
