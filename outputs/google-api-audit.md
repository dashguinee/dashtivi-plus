# DASH Google API Dependency Audit
**Date**: 2026-03-27 | **Audited by**: ZION SYNAPSE | **Scope**: Full ecosystem

---

## 1. COMPLETE API INVENTORY

### A. Gemini Generative Language API (AI Studio)
**API Endpoint**: `generativelanguage.googleapis.com`
**What it does**: Text generation, content curation, translation, AI chat, image generation

| Project | File(s) | Env Var / Key | Model Used |
|---------|---------|---------------|------------|
| **Hub Cockpit (ZION Brain L2)** | `src/cockpit/cockpitConfig.ts` | Hardcoded: `AIzaSyBABDp5oxmy7FKG5ptgfiBqkOpXg0cQOr0` | `gemini-2.5-flash` |
| **Hub Cockpit (Gemini Live L1)** | `src/cockpit/useGeminiLive.ts` | Same key via cockpitConfig | `gemini-2.5-flash-native-audio-latest` |
| **Hub Cockpit (useZionBrain)** | `src/cockpit/useZionBrain.ts` | Same key via cockpitConfig | `gemini-2.5-flash` |
| **Hub AI Shop Editor** | `src/services/gemini.ts` | Hardcoded: `AIzaSyD7hTzvYN9D2QDG8oGufkkMq_U5VAGj7ko` | `gemini-2.0-flash-exp` |
| **Hub Feed Curator (main)** | `workers/feed-curator/src/curation.ts` | CF Secret: `GEMINI_API_KEY` | `gemini-2.0-flash` |
| **Hub Feed Curator Netflix** | `workers/feed-curator-netflix/src/curation.ts` | CF Secret: `GEMINI_API_KEY` | `gemini-2.0-flash` |
| **Hub Feed Curator Prime** | `workers/feed-curator-prime/src/curation.ts` | CF Secret: `GEMINI_API_KEY` | `gemini-2.0-flash` |
| **Hub Feed Curator Spotify** | `workers/feed-curator-spotify/src/curation.ts` | CF Secret: `GEMINI_API_KEY` | `gemini-2.0-flash` |
| **Hub AmbiLive** | `workers/ambilive/src/index.ts` | CF Secret: `GEMINI_API_KEY` | `gemini-2.0-flash` (translation fallback) |
| **Wwowsite (Woo AI)** | `wwowsite/src/services/woo.ts` | Hardcoded: `AIzaSyD7hTzvYN9D2QDG8oGufkkMq_U5VAGj7ko` | `gemini-2.0-flash-exp` |
| **DaClub App** | `daclub-app-gemini/.env.local` | `VITE_GEMINI_API_KEY=AIzaSyAZvM9erouQMYMAUl6At83391uuQMj8Ckk` | `gemini-2.5-flash` + native-audio-dialog |
| **Guinius** | `guinius/.env` | `VITE_GEMINI_KEY=AIzaSyBIAvf24UzjffSs_dlhFhPn4byBpgTQWAY` | `gemini-2.5-flash` |
| **Guinius (Vizuo Proxy)** | `guinius/supabase/functions/vizuo-proxy/index.ts` | Supabase Edge Function env | **Imagen 3.0** (`imagen-3.0-generate-002`) |
| **Guinius (Giro Proxy)** | `guinius/supabase/functions/giro-proxy/index.ts` | Supabase Edge Function env | `gemini-2.5-flash` / `gemini-2.0-pro` |
| **Guinius Training** | `guinius/training/*.cjs` | From env | `gemini-2.0-flash`, `gemini-1.5-flash-latest`, `gemini-2.5-flash` |
| **DASH Edu** | `dash-edu/.env` | `VITE_GEMINI_API_KEY=AIzaSyCDf3S5ByzFNDQMZsGHxXrEkovlTRLY4eQ` | `gemini-2.0-flash`, `gemini-1.5-flash` |
| **Aftermath App** | `aftermath-app/.env` | `VITE_GEMINI_API_KEY=AIzaSyCGk0f9mTEbsLPtdroSY166DexMqo2NPkA` | Gemini (unspecified) |
| **VOYO Music** | `voyo-music/.env` | `VITE_GEMINI_API_KEY=AIzaSyD7x2ITG1TiyVkKBag7ETb0Vd-zNG7RRoE` | `gemini-2.0-flash` |
| **VOYO Fork** | `voyo-fork/src/services/*.ts` | From env | `gemini-2.0-flash` |
| **DashFashion** | `DashFashion/src/App.tsx` | Hardcoded: `AIzaSyCwiS0cu23sVwxj2kVOU72zFkdXfpDQdes` | `gemini-2.0-flash-preview-image-generation`, `gemini-2.5-flash-preview-image-generation`, `gemini-1.5-flash` |
| **GraspIt** | `graspit/backend/.env` | `GEMINI_API_KEY=AIzaSyAZffegve-8w0WQo2AXDotvQrVbdmo0pEM` | `gemini-2.5-flash` |
| **Meetel Flow** | `meetel-flow/.env` | `MEETEL_GEMINI_KEY=AIzaSyAk92E3e45qwqgIRpQS5rBTo6t5hI5zPV4` | `gemini-2.0-flash` |
| **Meetel Edu** | `meetel-edu/` | From env | `gemini-2.5-flash` |
| **Soussou Engine** | `zion-github/soussou-engine/.env` | `GEMINI_API_KEY=AIzaSyCV-1WfnuFLmxw5ib_fuVcO2KLGjUXLpuk` | (conversation) |
| **Soussou App** | `zion-github/soussou-app/.env` | Same key as engine | (conversation) |
| **Loomaison Scavenger** | `loomaison-scavenger/*.cjs` | Pool from `gemini-keys.json` | `gemini-2.0-flash` |
| **ZION Voice Bridge** | `zion-interface/zion-voice-bridge.js` | Hardcoded: `AIzaSyBlQtC75xy3mtvFh1jlD2V9hCL3ZWgdAL0` | `gemini-2.0-flash-exp` |
| **ZION Mobile PWA (CAGI)** | `zion-mobile-pwa/src/services/cagi-engine.js` | From env | `gemini-2.0-flash-exp` |
| **Renaissance (archived)** | `~/.zion/archive/renaissance/*.js` | Pool from `gemini-keys.json` | `gemini-2.0-flash` |
| **CAGI Orchestrator (archived)** | `~/.zion/archive/cagi/orchestrator.js` | From gemini-config.json | `gemini-3-pro-preview` |

### B. Gmail API (OAuth)
**API Endpoint**: `gmail.googleapis.com`
**What it does**: Reads emails (Netflix/Spotify/Prime codes, newsletters for feed curation)

| Project | File(s) | Credentials |
|---------|---------|-------------|
| **Hub Feed Curator (main)** | `workers/feed-curator/src/gmail.ts` | CF Secrets: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| **Hub Feed Curator Netflix** | `workers/feed-curator-netflix/src/gmail.ts` | CF Secrets: Same set |
| **Hub Feed Curator Prime** | `workers/feed-curator-prime/src/gmail.ts` | CF Secrets: Same set |
| **Hub Feed Curator Spotify** | `workers/feed-curator-spotify/src/gmail.ts` | CF Secrets: Same set |
| **Hub Email Fetcher** | `workers/email-fetcher/src/index.ts` | CF Secrets: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |

### C. Gmail IMAP/SMTP (App Password - NOT API)
**What it does**: Direct email access via IMAP for local email center scripts

| Project | File(s) | Credentials |
|---------|---------|-------------|
| **ZION Email Center** | `zion-interface/zion-email-center.cjs` | `GMAIL_USER=dashguinee@gmail.com`, `GMAIL_APP_PASSWORD=hgpr***` |
| **Netflix Code Checker** | `zion-interface/check-netflix-codes.cjs` | Same credentials |
| **Gmail Label Audit** | `zion-interface/audit-labels.cjs` | Same credentials |
| **Label Router** | `zion-interface/handlers/label-router.cjs` | Same credentials |

### D. YouTube Data API v3
**API Endpoint**: `www.googleapis.com/youtube/v3`
**What it does**: Fetches channel stats, latest videos, playlist items for Content Panopticon

| Project | File(s) | Env Var / Key |
|---------|---------|---------------|
| **Hub Content Patrol Worker** | `workers/content-patrol/src/youtube.ts` | CF Secret: `YOUTUBE_API_KEY` |
| **Hub Seed Content Sources** | `scripts/seed-content-sources.cjs` | Hardcoded fallback: `AIzaSyAbBoov0KZtT01WDYwmehU1FiQMuF6bKFI` |
| **Hub YouTube Suggestions** | `scripts/youtube-suggestions.cjs` | `YOUTUBE_API_KEY` env var |

### E. YouTube InnerTube API (Public/Undocumented)
**What it does**: Fetches video transcripts for AmbiLive subtitle translation

| Project | File(s) | Key |
|---------|---------|-----|
| **Hub AmbiLive** | `workers/ambilive/src/index.ts` | Public key: `AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8` (not a Dash key, this is YouTube's public InnerTube key) |

### F. Google Places / Maps API
**API Endpoint**: `maps.googleapis.com`
**What it does**: Distance matrix, place autocomplete, place details

| Project | File(s) | Env Var / Key |
|---------|---------|---------------|
| **Wwowsite** | `wwowsite/.env` | `VITE_GOOGLE_API_KEY=AIzaSyD1uGk-Rnl1Jdp6b_k8BT98M5p7USnZEzA` + 5 more rotation keys |
| **WEEGO (business plan)** | `WEEGO_BUSINESS_PLAN/weego-tempo/.env` | `VITE_GOOGLE_MAPS_KEY=your-google-maps-api-key` (placeholder, not active) |

### G. Imagen 3 (via Gemini API)
**What it does**: AI image generation for Vizuo Studio

| Project | File(s) | Key |
|---------|---------|-----|
| **Guinius Vizuo Proxy** | `guinius/supabase/functions/vizuo-proxy/index.ts` | Rotated via Supabase `guinius_get_api_key` RPC, fallback: `GEMINI_API_KEY` env |
| **DashFashion** | `DashFashion/src/App.tsx` | `gemini-2.0-flash-preview-image-generation`, `gemini-2.5-flash-preview-image-generation` |

### H. IndexNow (NOT a Google API)
**Note**: IndexNow pings Bing/Yandex. Google does NOT support IndexNow.

| Project | File(s) | Notes |
|---------|---------|-------|
| **Wwowsite SEO** | `wwowsite/scripts/indexnow-ping.cjs` | Auto-generated key, hits `api.indexnow.org` |

---

## 2. ACCOUNT MAPPING

### Unique API Keys Discovered (de-duplicated)

| Key (last 8 chars) | Used In | Likely Account |
|---------------------|---------|----------------|
| `cQOr0` | Hub cockpitConfig, gemini-keys.json pool | **dashguinee@gmail.com** (primary) |
| `VAGj7ko` | Hub gemini.ts, wwowsite woo.ts, voyo-music, gemini-keys.json | **dashguinee@gmail.com** |
| `pgTQWAY` | Guinius | **dashguinee@gmail.com** |
| `Qj8Ckk` | DaClub | **dashguinee@gmail.com** |
| `Mo2NPkA` | Aftermath, wwowsite GOOGLE_API_KEY_2 | **dashguinee@gmail.com** |
| `QMj8Ckk` | DaClub | **dashguinee@gmail.com** |
| `GjUXLpuk` | Soussou Engine/App | **dashguinee@gmail.com** |
| `Iu8k` | DashFashion | **dashguinee@gmail.com** |
| `LY4eQ` | DASH Edu, gemini-keys.json | **dashguinee@gmail.com** |
| `i1w` | wwowsite key 3 | **dashguinee@gmail.com** |
| `5nds` | wwowsite key 5, gemini-keys.json | **dashguinee@gmail.com** |
| `x5-DQ` | wwowsite PAID key, gemini-keys.json | **dashguinee@gmail.com** (PAID PROJECT) |
| `fiBqkOpXg0cQOr0` | Meetel flow | **dashguinee@gmail.com** |
| `hI5zPV4` | Meetel flow | **dashguinee@gmail.com** |
| `QMj8Ckk` | DaClub | **dashguinee@gmail.com** |
| `6bKFI` | Hub seed-content-sources (YouTube) | **dashguinee@gmail.com** |
| `pDQdes` | DashFashion hardcoded | **dashguinee@gmail.com** |
| `mo0pEM` | GraspIt | **dashguinee@gmail.com** |
| `ZWgdAL0` | ZION Voice Bridge hardcoded | **dashguinee@gmail.com** |
| `Vx5-DQ` | wwowsite PAID, gemini-keys.json | **PAID billing project** |

**Total unique keys**: ~22 distinct API keys in the gemini-keys.json pool + several standalone keys
**All keys**: Tied to **dashguinee@gmail.com** Google account (one Google Cloud project, possibly with multiple API keys)

### Gmail OAuth Credentials
- **GMAIL_CLIENT_ID** + **GMAIL_CLIENT_SECRET** + **GMAIL_REFRESH_TOKEN**: Stored as Cloudflare Worker secrets for 5 workers
- **GMAIL_APP_PASSWORD**: `hgprmesyezxiooie` for `dashguinee@gmail.com` (IMAP access, stored in `zion-interface/.env`)

---

## 3. BILLING IMPACT ANALYSIS

### FREE TIER APIs (No billing required)

| API | Free Tier Limits | DASH Usage |
|-----|-----------------|------------|
| **Gemini API (AI Studio)** | 15 RPM / 1M TPM for Flash, 2 RPM for Pro | Moderate - most projects use Flash |
| **Gmail API (OAuth)** | 1B quota units/day (effectively unlimited for reads) | Light - ~100 emails/day max |
| **YouTube Data API v3** | 10,000 units/day | Light - ~200-500 units/day (channel+video reads) |
| **YouTube InnerTube** | No official limits (public endpoint) | Light - AmbiLive transcript fetches |
| **Gmail IMAP (App Password)** | No API quota (direct IMAP) | Light |

### PAID APIs (Cost money beyond free tier)

| API | What Costs | Estimated Usage | Monthly Cost |
|-----|-----------|----------------|--------------|
| **Google Places API** | $17/1000 requests (Place Details), $2.83/1000 (Autocomplete) | Wwowsite had 6 API keys suggesting rotation to avoid limits | **$0-5/month** if actively used |
| **Imagen 3** | Input tokens free, but image generation is **paid only** via Gemini API | Vizuo proxy generates images on demand | **$0.04/image** (could add up) |
| **Gemini 2.0 Pro / 2.5 Pro** | Higher rate limits need billing, Pro model has paid tier | Guinius Giro uses 2.0-pro as escalation | **~$0** if under free RPM |
| **Image Generation models** | `gemini-*-preview-image-generation` | DashFashion uses these | **Paid per image** |

### WHAT WAS LIKELY CAUSING BILLING

1. **Google Places API** (wwowsite) - 6 rotating keys suggests heavy usage or rate limit hitting
2. **Imagen 3** (Vizuo proxy) - Image generation is not free tier
3. **Image generation preview models** (DashFashion) - `gemini-2.0-flash-preview-image-generation` requires billing
4. **Possible YouTube API quota overages** if content-patrol worker ran frequently

---

## 4. MODEL INVENTORY

| Model | Where Used | Purpose |
|-------|-----------|---------|
| `gemini-2.5-flash` | Hub Brain L2, Graspit, Meetel Edu, Guinius Giro, Guinius Training | Main workhorse text generation |
| `gemini-2.5-flash-native-audio-latest` | Hub useGeminiLive.ts | Real-time voice conversations |
| `gemini-2.5-flash-preview-native-audio-dialog` | DaClub useGeminiLive.ts | Voice conversations |
| `gemini-2.5-flash-preview-image-generation` | DashFashion | AI image generation |
| `gemini-2.0-flash` | Feed curators, AmbiLive, Loomaison, VOYO, multiple training scripts | Curation, translation, discovery |
| `gemini-2.0-flash-exp` | Hub AI Shop Editor, Wwowsite Woo, ZION Voice Bridge, ZION Mobile CAGI | Chat/NLU features |
| `gemini-2.0-flash-preview-image-generation` | DashFashion | AI image generation |
| `gemini-2.0-pro` | Guinius Giro (escalation path) | Complex queries |
| `gemini-1.5-flash` | DASH Edu, DashFashion analysis, Guinius training | Legacy, still in some codebases |
| `gemini-1.5-flash-latest` | Guinius training (dictionary enrichment) | Training pipeline |
| `gemini-pro` | Config references in dash-edu, daclub, ZION Mobile | Config labels (resolved to flash at runtime) |
| `gemini-3-pro-preview` | CAGI orchestrator (archived) | Archived, not active |
| `imagen-3.0-generate-002` | Guinius Vizuo Proxy | Image generation |

---

## 5. FREE TIER PLAN

### Can Run 100% Free

| Service | How | Limits to Watch |
|---------|-----|-----------------|
| **Gemini Flash (text)** | AI Studio free tier | 15 RPM, 1M TPM, 1500 RPD |
| **Gmail API (OAuth)** | Free with Google Cloud project | Essentially unlimited for reads |
| **Gmail IMAP** | App Password, no API needed | No limits |
| **YouTube Data API v3** | 10,000 units/day free | Enough for 100-200 channel checks/day |
| **YouTube InnerTube** | Public endpoint, no billing | No official limits |
| **IndexNow** | Free protocol | Not Google |

### Needs Free Tier Discipline

| Service | Free Limit | Risk |
|---------|-----------|------|
| **Gemini Flash** | 15 RPM across ALL keys in same project | If all 22 keys are in the same project, they share the 15 RPM limit |
| **Gemini Native Audio** | 10 RPM free tier | Voice sessions could hit this |
| **YouTube Data API** | 10,000 units/day | Content patrol worker scanning 101 channels uses ~1,500 units per scan |

### CANNOT Run Free (Requires Billing)

| Service | Why | Cost |
|---------|-----|------|
| **Imagen 3** | Image generation has no free tier for production | $0.04/image |
| **Image generation preview models** | `*-preview-image-generation` requires billing enabled | $0.04/image |
| **Google Places API** | $200/month free credit, then paid | Could be $0 if under credit |
| **Gemini Pro models** | Free tier exists but very low RPM (2 RPM) | Paid if usage exceeds |

---

## 6. KEY ROTATION / ACCOUNT SPLIT PLAN

### Current Problem
All ~22+ API keys appear to be from the **same Google Cloud project** under **dashguinee@gmail.com**. If billing is suspended on that project, ALL keys die simultaneously.

### Recommended Split (2 Accounts)

#### Account 1: dashguinee@gmail.com (KEEP - Personal + Core)
- **Gemini Flash** for Hub cockpit (ZION Brain L2, Gemini Live)
- **Gmail API** (all feed curators + email fetcher - must stay on dashguinee since that's the mailbox)
- **Gmail IMAP** (same reason)
- **YouTube Data API** (content patrol, seed scripts)

#### Account 2: NEW account (e.g., dash.dev.apis@gmail.com)
- **Gemini Flash** for all standalone projects (GraspIt, Meetel, DaClub, Guinius, VOYO, Loomaison)
- **Gemini Native Audio** for DaClub voice
- **Google Places API** (wwowsite) - move here to isolate billing risk
- **Imagen 3** (Vizuo proxy) - move here, enable billing ONLY on this account
- **Image generation models** (DashFashion)

### Migration Steps
1. Create new Google Cloud project on Account 2
2. Enable: Generative Language API, Places API
3. Generate 5-10 new API keys
4. Update env files and Cloudflare Worker secrets
5. Update `gemini-keys.json` pool to use Account 2 keys for non-Gmail projects
6. Enable billing on Account 2 ONLY for Imagen/Places if needed
7. Keep Account 1 on free tier only

---

## 7. WHAT'S BROKEN NOW

If dashguinee@gmail.com's Google Cloud billing is suspended:

### DEFINITELY BROKEN (API keys invalid)

| Service | Impact | Severity |
|---------|--------|----------|
| **Hub ZION Brain L2 (Gemini Flash)** | Cockpit text queries fail silently or error | HIGH |
| **Hub Gemini Live (Voice)** | WebSocket connection refused, no voice | HIGH |
| **All 4 Feed Curators** | Cron workers fail - no new feed items curated | MEDIUM |
| **Email Fetcher Worker** | Can't fetch Netflix/Prime/Spotify codes | HIGH (customer impact) |
| **Content Patrol Worker** | YouTube channel monitoring stops | LOW |
| **Wwowsite Woo AI** | Shop assistant broken | MEDIUM |
| **Hub AI Shop Editor** | NLU parsing fails, falls back to keyword matching | LOW |
| **GraspIt backend** | Quiz generation, paraphrasing, teaching all fail | MEDIUM |
| **DaClub chat + voice** | Gemini chat dead, voice dead | MEDIUM |
| **Guinius Giro proxy** | AI responses fail | MEDIUM |
| **Vizuo image generation** | Imagen 3 fails completely | MEDIUM |
| **DashFashion** | Image generation + analysis fail | LOW |
| **Loomaison Scavenger** | All discovery agents fail | LOW (not actively running) |
| **DASH Edu** | AI tutoring broken | MEDIUM |
| **Meetel Flow/Edu** | STT + tutoring broken | MEDIUM |
| **VOYO Music/Fork** | AI curation broken | LOW |
| **Soussou Engine/App** | Conversation enhancement broken | LOW |
| **ZION Voice Bridge** | Gemini faculty routing dead | MEDIUM |
| **ZION Mobile CAGI** | Gemini agents non-functional | LOW |

### STILL WORKING (Not Google-dependent)

| Service | Why |
|---------|-----|
| **Gmail IMAP (zion-interface)** | Uses App Password, not API key |
| **Hub cockpit UI** | Static React app, doesn't need Google |
| **Supabase backend** | Independent of Google |
| **WhatsApp integration** | Uses WA Web, not Google |
| **Hub Deep dispatch (Claude)** | Uses Claude, not Google |
| **AmbiLive transcripts** | InnerTube uses YouTube's own public key |
| **AmbiLive translation (Groq primary)** | Groq is primary, Gemini is only fallback |

### PARTIALLY DEGRADED

| Service | What Works | What Doesn't |
|---------|-----------|--------------|
| **Hub ZION Brain** | L0 (patterns), L3 (Claude Deep) work | L1 (Gemini Live) and L2 (Flash) fail |
| **AmbiLive** | Groq translation works, transcript fetch works | Gemini fallback translation fails |
| **Feed Curators** | Gmail read might work if OAuth token still valid (cached) | Gemini curation step fails |

---

## APPENDIX: All Unique API Keys Found

**WARNING**: These are exposed in source code / env files. Consider rotating after billing is resolved.

```
AIzaSyBABDp5oxmy7FKG5ptgfiBqkOpXg0cQOr0  (Hub cockpit, gemini-keys pool)
AIzaSyD7hTzvYN9D2QDG8oGufkkMq_U5VAGj7ko  (Hub gemini.ts, wwowsite woo, gemini-keys pool)
AIzaSyD7x2ITG1TiyVkKBag7ETb0Vd-zNG7RRoE  (VOYO Music, gemini-keys pool)
AIzaSyBIAvf24UzjffSs_dlhFhPn4byBpgTQWAY  (Guinius)
AIzaSyAZvM9erouQMYMAUl6At83391uuQMj8Ckk  (DaClub)
AIzaSyCGk0f9mTEbsLPtdroSY166DexMqo2NPkA  (Aftermath, wwowsite key 2)
AIzaSyCV-1WfnuFLmxw5ib_fuVcO2KLGjUXLpuk  (Soussou Engine/App)
AIzaSyCDf3S5ByzFNDQMZsGHxXrEkovlTRLY4eQ  (DASH Edu, gemini-keys pool)
AIzaSyDkQzsPZbR_YvSTtEYpbd2e3wGnCzT8i1w  (wwowsite key 3)
AIzaSyCnXZsOjVk1o-uZXZbteStjMP_s8fGBTrs  (wwowsite key 4)
AIzaSyBl6iHcs9n3XDucqs0XboOtZLC5i2L5nds  (wwowsite key 5, gemini-keys pool)
AIzaSyBkyee4KjHCfmm5ddCCaVN6vAFerVx5-DQ  (wwowsite PAID, gemini-keys pool)
AIzaSyD1uGk-Rnl1Jdp6b_k8BT98M5p7USnZEzA  (wwowsite primary/Places)
AIzaSyAk92E3e45qwqgIRpQS5rBTo6t5hI5zPV4  (Meetel Flow)
AIzaSyAZffegve-8w0WQo2AXDotvQrVbdmo0pEM  (GraspIt)
AIzaSyBlQtC75xy3mtvFh1jlD2V9hCL3ZWgdAL0  (ZION Voice Bridge)
AIzaSyCwiS0cu23sVwxj2kVOU72zFkdXfpDQdes  (DashFashion)
AIzaSyAbBoov0KZtT01WDYwmehU1FiQMuF6bKFI  (Hub YouTube seed script)
AIzaSyDPluaPScKm87pDAGcSFTH_uoVfSvVCAek  (gemini-keys pool)
AIzaSyAJOp2z-p6xhjL5-1NYrB__8SmTxvHOvMM  (gemini-keys pool)
AIzaSyAtpEmWLF6KndHgd0AqsYLCdUyBKbELriQ  (gemini-keys pool)
AIzaSyCBDxojTAK6B61QC9u77elahrEPetUq6DE  (gemini-keys pool, appears 3x)
AIzaSyATTeIvh8JDPfhtaY581gdoUtVwtdbWQ9w  (gemini-keys pool)
AIzaSyCuxEVZf-0P6zbCigzG0CDbq8U8uL5Iu8k  (gemini-keys pool)
AIzaSyAglKWQtdvnt-y2FoMZ2yEhoxQV14as4uE  (gemini-keys pool)
AIzaSyD82Ep1-_C4sAr8eG_bS9Mb66vuk1836dU  (gemini-keys pool)
AIzaSyDnIYv2Ia1P-UXkK-qjLKw8d6s1n7Ue4uc  (gemini-keys pool)
AIzaSyDcRe9ksp1Sz1RVX43ct3QvN3rQnmvfces  (gemini-keys pool)
AIzaSyDw5drHFEj86nn1x3bdsDFh1Po-Ew9F9SA  (gemini-keys pool)
AIzaSyDv99GCR66gf_LfSUbQsJ48rMGLbzmdkng  (gemini-keys pool)
AIzaSyCwz1CJfelZAMx1EeV-jZJA_CUbFTw1st0  (gemini-keys pool)
AIzaSyDT1gvA13Bl_COnC0JpGEGY2iqNCwEgBi0  (gemini-keys pool)
```

**Total**: 32 unique API keys (some duplicated across projects)

---

## SUMMARY

**Google Services Used**: 7 distinct APIs
1. Gemini Generative Language API (text + audio + image gen) -- 28+ integration points
2. Gmail API (OAuth) -- 5 Cloudflare Workers
3. Gmail IMAP (App Password) -- 5 local scripts
4. YouTube Data API v3 -- 3 integration points
5. YouTube InnerTube (public) -- 1 worker
6. Google Places/Maps API -- 1 project (wwowsite)
7. Imagen 3 (via Gemini SDK) -- 1 Supabase Edge Function

**Account**: Everything on `dashguinee@gmail.com`
**Billing Risk**: Places API + Imagen 3 + Image Generation models are the only things that genuinely need billing
**Immediate Fix**: All text Gemini APIs can run on free tier if RPM limits are respected
