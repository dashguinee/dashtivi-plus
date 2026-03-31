# DASH Email Pipeline - Complete Deep Map

> Generated: 2026-03-27 | Every file read, every table queried, every endpoint tested.

---

## 1. THE FULL FLOW

```
                         GMAIL (dashguinee@gmail.com)
                               |
          ┌────────────────────┼────────────────────┐
          |                    |                     |
  dashgn007@gmail.com  dashgn0010@gmail.com  dashgn0027@outlook.com
  dashgn008@gmail.com  dashgn0032@outlook.com ...16 service accounts
          |                    |                     |
          └────────┬───────────┴─────────┬───────────┘
                   |                     |
          Gmail Filters auto-label:      Gmail NEWSLETTER label:
          - Netflix codes → Label_8527   Label_8128894833896792046
          - Prime codes  → Label_8922
          - Spotify codes → Label_3944
          - Travel codes → Label_8766
                   |                     |
          ┌────────┴────────┐   ┌────────┴──────────────────────────────┐
          | WORKER 1        |   | WORKERS 2-5 (Feed Curators)          |
          | email-fetcher   |   | feed-curator (all)                   |
          | /code endpoint  |   | feed-curator-netflix                 |
          | ON-DEMAND       |   | feed-curator-spotify                 |
          | No DB storage   |   | feed-curator-prime                   |
          └────────┬────────┘   | CRON: 07:00, 14:00, 20:00 UTC       |
                   |            | Gmail → Gemini 2.0 Flash → Supabase  |
                   |            └────────┬─────────────────────────────┘
                   |                     |
          ┌────────┴────────┐   ┌────────┴────────┐
          | AccessPage.tsx  |   | feed_items (38)  |
          | useCodeFetch    |   | Supabase table   |
          | DIRECT TO USER  |   └────────┬────────┘
          | No DB involved  |            |
          └─────────────────┘   ┌────────┴──────────────────────────┐
                                |                                    |
                       ┌────────┴────────┐              ┌───────────┴───────────┐
                       | SocialFeed.tsx   |              | useFeedItems.ts       |
                       | (dasuperhub.com) |              | (SDK for any app)     |
                       | Infinite scroll  |              | get_unified_feed RPC  |
                       | Comments, Oyes   |              | Fallback: direct query|
                       └─────────────────┘              └───────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  | PARALLEL PATH: zion-email-center.cjs (IMAP → Supabase)          |
  | Location: /home/dash/zion-interface/zion-email-center.cjs        |
  | Polls Gmail IMAP every 15s → classifies → routes → delivers     |
  | Writes to: email_messages (838) → email_deliveries (1543)       |
  | NOT RUNNING CONTINUOUSLY — manual start required                 |
  └───────────────────────────────────────────────────────────────────┘
```

---

## 2. WHAT'S WORKING (Verified 2026-03-27)

### Workers — ALL 5 RESPONDING 200

| Worker | URL | Status | Cron | Purpose |
|--------|-----|--------|------|---------|
| `dash-email-fetcher` | `https://dash-email-fetcher.dash-webtv.workers.dev` | **LIVE 200** | None (on-demand) | Sign-in code retrieval from Gmail |
| `dash-feed-curator` | `https://dash-feed-curator.dash-webtv.workers.dev` | **LIVE 200** | `0 7,14,20 * * *` | All-service newsletter curation |
| `feed-curator-netflix` | `https://feed-curator-netflix.dash-webtv.workers.dev` | **LIVE 200** | `0 7,14,20 * * *` | Netflix-only newsletter curation |
| `feed-curator-spotify` | `https://feed-curator-spotify.dash-webtv.workers.dev` | **LIVE 200** | `5 7,14,20 * * *` | Spotify-only curation |
| `feed-curator-prime` | `https://feed-curator-prime.dash-webtv.workers.dev` | **LIVE 200** | `10 7,14,20 * * *` | Prime-only curation |

### Endpoints That Work

- `GET /code?service=netflix&account=dashgn0010@gmail.com` — Returns latest code + recent codes + travel verification link
- `GET /curate` — Manual curation trigger (all curators)
- `GET /debug?hours=168` — Shows emails in newsletter label
- `GET /fresh` — Clears old items, re-curates from 7-day lookback
- `GET /health` — Health check for all curators

### UI Components Working

- **AccessPage** (`src/components/AccessPage.tsx`): User clicks "Get Code" → calls Worker → shows 4/6-digit code with shimmer animation + copy button + countdown timer + travel verification link
- **SocialFeed** (`src/components/social/SocialFeed.tsx`): Instagram-style feed with infinite scroll, pull-to-refresh, oye/comment/share, filter tabs (All/Drops/Posts/Trending)
- **EmailAdmin** (`src/cockpit/hub/EmailAdmin.tsx`): Cockpit panel with Overview/Codes/Messages tabs, auto-refresh every 30s
- **EmailCenter** (`src/cockpit/social/EmailCenter.tsx`): Full-screen email center with notifications intelligence, per-service stats, code countdown timers, launch notification form, device tracking

---

## 3. WHAT'S BROKEN / NOT RUNNING

### Critical: The Two Disconnected Paths

The system has **two code delivery paths that do NOT connect**:

1. **Worker Path (AccessPage)**: `User clicks → Cloudflare Worker → Gmail API → Extract code → Show to user`. **No database involved.** Codes are temporary, fetched fresh.

2. **DB Path (DynamicBanner/ServiceAccessPage/EmailAlerts)**: Reads from `email_deliveries` table via Supabase Realtime. Expects an INSERT into `email_deliveries` to trigger the banner.

**WHO WRITES TO `email_deliveries`?** Currently: only `zion-email-center.cjs` when running, or manual SQL inserts. The Cloudflare Worker does NOT write to the DB.

**The bridge does not exist.** The ideal flow would be: Worker fetches code → writes to email_deliveries → Realtime fires → DynamicBanner shows instantly. This is documented in EMAIL_SYSTEM_MAP.md as "The Missing Link."

### Not Running

| Component | Status | Why |
|-----------|--------|-----|
| `zion-email-center.cjs` | **NOT RUNNING** | Must be manually started with `node zion-email-center.cjs run`. No cron, no systemd service, no PM2. File exists at `/home/dash/zion-interface/zion-email-center.cjs` (34KB). |
| `localhost:3001/api/email/process` | **DEAD** | Only works in local dev. Referenced in EmailAdminPage but never deployed. |
| `localhost:3001/api/email/reclassify` | **DEAD** | Same — localhost only. |
| WebSocket codes | **DISABLED** | `VITE_WS_URL` not set in production. Using Supabase Realtime instead. |
| Auto-ingestion pipeline | **MISSING** | No automated Gmail → email_messages → email_deliveries flow running 24/7. |

### Feed Curation Issues

- **All 38 feed_items are Netflix-only** — zero Spotify, zero Prime content in the database
- **All items are from March 8, 2026** — nothing newer, suggesting cron may not be firing or emails dried up
- **Category column has "netflix" not "DROP"/"NEWS"/"PROMO"** — the older batch was curated without LLM (fallback), so category = service_type instead of proper feed category
- **No Gemini API key verification** — if `GEMINI_API_KEY` secret is wrong/expired, curation falls back to basic subject-as-title mode
- **action_label is null** for all items — the fallback curation doesn't set it
- **trailer_url is null** for all items — trailer enrichment requires LLM to work
- **media_urls is null** for all items — carousel images not being extracted or stored

---

## 4. DATA STATE (Live Counts as of 2026-03-27)

| Table | Row Count | Latest Timestamp | Notes |
|-------|-----------|-------------------|-------|
| `email_messages` | **838** | 2026-03-08 | Emails from zion-email-center.cjs runs. Latest batch = March 8. |
| `email_deliveries` | **1,543** | 2026-01-23 | Mostly test data from Jan 22-23. 5 visible: 1 banner, 1 feed_item, 3 login_requests. All status=pending. |
| `feed_items` | **38** | 2026-03-08 | All Netflix email_newsletter source. All is_active=true. All expire ~April 7. |
| `email_patterns` | **29** | 2026-01-22 | 20 active patterns. Netflix (7), Spotify (2), Prime (1), Claude (2), Skool (2), Canva, GameSeal, Google, Airtable, Supabase, generic (4). |
| `service_accounts` | **16** | 2026-03-26 | 10 Netflix accounts, 1 Prime, 3 IPTV, 1 Claude, 1 IPTV-SL. |
| `user_services` | **50** | — | Maps users to service accounts. Includes profile_number, profile_name, valid_until. |
| `subscribers` | **662** | — | Full customer list with CRM fields: segment, recovery_probability, monthly_payments, total_paid_gnf, etc. |

### Sample Data Snapshots

**email_messages (latest)**:
- `Animal Kingdom Saison 2 est disponible` — netflix, newsletter, 2026-03-08
- `La protection par code PIN du profil Aissatou a ete activee` — netflix, signin_code, code: 3843, 2026-03-07
- Most emails are Netflix PIN activation notices and newsletters

**email_deliveries (latest)**:
- `Netflix Update: Evenement diffuse en direct. Star Search` — banner, core_id: DASH, 2026-01-22
- `Netflix Sign-in Code: 0654` — login_request, core_id: 0010V, 2026-01-23
- `Mariame Djoulde, Smallville Saison 4` — feed_item, core_id: 0010V, 2026-01-23
- All status = pending (never actioned — nobody using the push path)

**feed_items (latest)**:
- All 38 items are Netflix newsletters from March 8 batch
- Titles: "Animal Kingdom Saison 2", "The Mentalist Season 2", "Banlieusards 3", "The Night Agent Season 3", etc.
- All have Netflix CDN image URLs (dnm.nflximg.net)
- All have Netflix title action URLs
- Priority all = 5 (default — LLM didn't set custom priorities)

---

## 5. NETFLIX ACCESS SYSTEM — How Customers Get Credentials

### The Flow

```
Customer opens dasuperhub.com
  → Logs in (citizen auth via localStorage)
  → Clicks Netflix product tile
  → AccessPage.tsx loads
  → getUserService(coreId) queries user_services table
  → Finds account_id (e.g., "netflix-0032")
  → Looks up service_accounts for email (e.g., "dashgn0032@outlook.com")
  → Shows: profile name, profile number, account email
  → User clicks "Get My Code"
  → useCodeFetch calls: GET /code?service=netflix&account=dashgn0032@outlook.com
  → Cloudflare Worker refreshes OAuth token
  → Worker queries Gmail API with Label_8527 (Netflix sign-in codes)
  → Worker filters by To: header matching account email
  → Worker extracts 4-digit code from email body
  → Returns: { latest: { code: "5551", ageMinutes: 2 }, recent: [...], travel: {...} }
  → AccessPage renders code boxes with shimmer animation
  → Copy button, countdown timer (15min expiry), history sidebar
  → For Netflix Travel: shows verification link + profile name
```

### Key Tables

- `user_services`: Maps `core_id` (customer) → `account_id` (service account) + `profile_number` + `profile_name`
- `service_accounts`: Maps `account_id` → `email` (Gmail/Outlook) + `service_type` + `password` (some have it stored)
- `subscribers`: Full CRM data — `name`, `phone`, `status`, `segment`, `core_id`, `netflix_email`

### Device Modes

AccessPage supports two modes:
- **Mobile**: Opens Netflix app for login
- **TV**: Directs to `netflix.com/tv8` for TV code entry

### Travel Verification

Netflix travel codes are special — they're not numeric codes but verification LINKS. The worker has a dedicated `fetchTravelCode()` function that:
1. Queries the travel label (`Label_8766790796521488005`)
2. Extracts profile name from "Bonjour [Name]," pattern
3. Extracts `netflix.com/account/travel/verify?...` URL
4. Returns as `TravelCode` with profile name + verify URL

### What's NOT Customer-Facing

- There is NO standalone customer portal at a separate URL
- Everything is inside dasuperhub.com behind citizen auth
- Customers access services through the product tiles in the main app
- No email notifications are sent TO customers — codes are pull-based

---

## 6. FEED PIPELINE — How Emails Become Feed Items

### The Curation Chain

```
Gmail newsletters (labeled NEWSLETTER)
  → Cloudflare Worker cron (3x daily: 07:00, 14:00, 20:00 UTC)
  → fetchBalancedNewsletters() — 10 Netflix, 5 Spotify, 5 Prime per run
  → For each email:
      1. isEmailProcessed(emailId) — check feed_items.source_id for dedup
      2. getEmailDetail() — fetch full MIME content
      3. extractContent() — parse HTML for:
         - Images (Netflix CDN, Spotify artist art, Amazon content)
         - Content cards (image+title+description as structured units)
         - Video links (Netflix, YouTube, Spotify, Prime URLs)
         - Service detection from sender domain
      4. classifyEmailValue() — pre-filter before LLM:
         - Netflix: EVERYTHING passes (even win-back emails have posters)
         - Spotify: EVERYTHING passes (artist images, playlists, concerts)
         - Prime: Skip account/security updates only
      5. curateWithClaude() — actually calls Gemini 2.0 Flash:
         - Bilingual output: Frenglish (80% French / 20% English) + English
         - Category: DROP / NEWS / PROMO / ALERT
         - Priority: 1-10
         - LLM selects best content cards by index
         - Trailer search URL generated
      6. hasSimilarTitle() — keyword overlap dedup (7-day window)
      7. hasDuplicateImage() — same hero image = same content
      8. saveFeedItem() — INSERT into feed_items
  → After all emails:
      - deactivateExpiredItems() — PATCH is_active=false where expires_at < now
      - refreshHotScores() — calls RPC function (if exists)
```

### Service-Specific Workers

The architecture splits processing into **4 workers** to avoid Cloudflare's subrequest limits (~50 per invocation):

| Worker | Focus | Emails/Run | Lookback | Cron Offset |
|--------|-------|-----------|----------|-------------|
| `dash-feed-curator` | All services (balanced) | 60 (50% NF, 30% Prime, 20% Spotify) | 8h | :00 |
| `feed-curator-netflix` | Netflix only | 30 | 8h | :00 |
| `feed-curator-spotify` | Spotify only | 20 | 8h | :05 |
| `feed-curator-prime` | Prime only | 20 | 8h | :10 |

**Problem**: The main curator AND the service-specific curators run on the same schedule. They'll duplicate work unless `isEmailProcessed()` dedup catches it. The 5-10 minute offsets help but it's still redundant.

### Content Extraction Quality

The extraction engine is sophisticated:
- **Netflix**: Parses `dnm.nflximg.net` CDN images, extracts `/title/XXXXX` Netflix IDs, reads alt text and adjacent `<td>` text for titles, handles table-based email layouts
- **Spotify**: Filters to `i.scdn.co/image/ab67` (real content), skips `message-editor.scdn.co` (marketing logos)
- **Prime**: Accepts `images-amazon.com` and `m.media-amazon.com`, extracts ASINs from `/dp/` URLs
- **Generic**: Falls back to linked images with size filtering

### What's Missing in Curation

- **No English columns in DB yet** — code has fallback retry without `title_en`/`body_preview_en` if columns don't exist. SQL migration `DUAL_LANGUAGE_MIGRATION.sql` mentioned but not confirmed run.
- **Trailer URLs are YouTube SEARCH URLs** — not actual trailer links. Format: `https://www.youtube.com/results?search_query=...`
- **No hot score RPC function** — `refresh_hot_scores` call silently fails ("function may not exist yet")
- **No social engagement fields populated** — `reaction_count`, `comment_count`, `share_count` all zero in DB

---

## 7. MISSING PIECES

### A. Feed on dasuperhub.com (SocialFeed)

**Current State**: Works but stale. SocialFeed.tsx renders from feed_items table.

**Issues**:
1. **Only 38 items, all from March 8** — cron may not be generating new content. Check if Gemini API key is valid and Gmail label still has new emails.
2. **All Netflix, zero other services** — Spotify and Prime curators may not have secrets configured, or no newsletters are arriving for those services.
3. **No engagement data** — oye_count, comment_count, share_count all zero. The `get_unified_feed` RPC may not exist, forcing fallback to direct table query.
4. **No posts table data** — SocialFeed tries to fetch from `posts` table for user-generated content. Unknown if this table exists.
5. **Malay language filter active** — items with Malay words get filtered out. May accidentally filter real content.

**To Fix**:
- Trigger `/fresh` on one curator to verify end-to-end pipeline works
- Verify Gemini API key in Cloudflare secrets
- Run the dual-language migration SQL
- Check if newsletter label still gets emails (Gmail filters may have changed)
- Add the `refresh_hot_scores` Supabase RPC function

### B. Email Admin on dasuperhub.com (EmailAdminPage / EmailAdmin)

**Current State**: Two admin surfaces exist:

1. **EmailAdminPage** (`src/pages/EmailAdminPage.tsx`): Full admin page with 4 tabs — Emails, Patterns, Deliveries, Stats. References `localhost:3001` for process/reclassify endpoints (dead in production).

2. **EmailAdmin** (`src/cockpit/hub/EmailAdmin.tsx`): Cockpit panel with 3 tabs — Overview, Codes, Messages. Uses `useEmailData()` which queries all 3 tables every 30s.

3. **EmailCenter** (`src/cockpit/social/EmailCenter.tsx`): Full-screen notification center with per-service intelligence, computed alerts (duplicate codes, new device logins), code countdown timers, and a "Launch Notification" form for manual code delivery.

**Issues**:
1. **email_messages table data is stale** (latest = March 8) — zion-email-center.cjs is not running
2. **email_deliveries are ancient** (latest = Jan 23) — no new deliveries being created
3. **localhost:3001 endpoints dead** — process and reclassify buttons do nothing in production
4. **No automated ingestion** — the IMAP poller (`zion-email-center.cjs`) needs to be daemonized (PM2, systemd, or similar)

**To Fix**:
- Set up `zion-email-center.cjs` as a persistent process (PM2: `pm2 start zion-email-center.cjs --name email-center`)
- OR: Convert IMAP polling to a Cloudflare Worker with cron (like the feed curators)
- Remove/replace localhost:3001 references with Worker API calls

### C. Feed on tivi.dasuperhub.com (NEW)

**Does Not Exist Yet.** This would be a new surface consuming the same `feed_items` data.

**What's Needed**:
1. **API/Data**: Already exists — `feed_items` table in Supabase, `useFeedItems.ts` hook, `get_unified_feed` RPC
2. **UI**: Need a new component, likely a simplified version of SocialFeed.tsx focused on IPTV/streaming content
3. **Content**: Need to expand feed curation beyond Netflix — add IPTV channel highlights, DashTivi+ content, maybe VOD recommendations
4. **Filtering**: Should filter by relevant service types for IPTV users (not all Netflix newsletters relevant)
5. **SDK Option**: `AnnouncementFeed.tsx` exists as a drop-in widget for any DASH app — could be adapted

**Fastest Path**:
- Use existing `useFeedItems.ts` hook or `useServiceFeed('iptv')` variant
- Build a lightweight feed page in the tivi-plus codebase
- Connect to same Supabase instance
- Add IPTV-specific feed items (either manually or by adding IPTV newsletter sources to the curation pipeline)

---

## 8. API ENDPOINTS AND WORKER URLs

### LIVE Endpoints

| Endpoint | Method | URL | Response |
|----------|--------|-----|----------|
| Email Fetcher Root | GET | `https://dash-email-fetcher.dash-webtv.workers.dev/` | 200, info text |
| Get Sign-in Code | GET | `https://dash-email-fetcher.dash-webtv.workers.dev/code?service=netflix&account=EMAIL` | `{ success, latest, recent, travel }` |
| Feed Curator Health | GET | `https://dash-feed-curator.dash-webtv.workers.dev/health` | `{ status: 'ok' }` |
| Manual Curate | GET | `https://dash-feed-curator.dash-webtv.workers.dev/curate?hours=24` | `{ success, processed, curated, skipped, items }` |
| Debug Emails | GET | `https://dash-feed-curator.dash-webtv.workers.dev/debug?hours=168&service=netflix` | `{ total_emails, emails[] }` |
| Fresh Curate | GET | `https://dash-feed-curator.dash-webtv.workers.dev/fresh` | Clears + re-curates all |
| Netflix Curator | GET | `https://feed-curator-netflix.dash-webtv.workers.dev/curate` | Netflix-only curation |
| Spotify Curator | GET | `https://feed-curator-spotify.dash-webtv.workers.dev/curate` | Spotify-only curation |
| Prime Curator | GET | `https://feed-curator-prime.dash-webtv.workers.dev/curate` | Prime-only curation |

### DEAD Endpoints

| Endpoint | Why Dead |
|----------|----------|
| `http://localhost:3001/api/email/process` | Local dev only, no production deployment |
| `http://localhost:3001/api/email/reclassify` | Local dev only |
| `ws://` WebSocket codes | `VITE_WS_URL` not configured |
| `POST /webhook` on feed-curator | Stubbed, not implemented |

### Supabase API (all via REST)

| Table | Live Queries | Auto-Refresh |
|-------|-------------|--------------|
| `email_messages` | useEmailData (30s) | Yes |
| `email_deliveries` | useEmailAlerts (5s), useEmailData (30s) | Yes + Realtime |
| `email_patterns` | useEmailData (30s) | Yes |
| `feed_items` | useFeedItems (on mount), SocialFeed (on scroll) | Manual refresh |
| `service_accounts` | getUserService (on AccessPage load) | No |
| `user_services` | getUserService (on AccessPage load) | No |

---

## 9. FILE REFERENCE

### Architecture Docs
- `/home/dash/Hub/docs/EMAIL_CENTER.md` — Original Email Center design doc
- `/home/dash/Hub/docs/EMAIL_SYSTEM_MAP.md` — Complete system map with all hooks/components/flows
- `/home/dash/Hub/docs/EMAIL_ANALYSIS.md` — Inbox analysis (44 emails, pattern gaps)
- `/home/dash/Hub/workers/email-fetcher/FEED_VISION.md` — Feed system vision (LLM curation concept)
- `/home/dash/Hub/workers/email-fetcher/SYSTEM.md` — Email code fetcher production docs

### Workers
- `/home/dash/Hub/workers/email-fetcher/src/index.ts` — Cloudflare Worker: Gmail → code extraction (273 lines)
- `/home/dash/Hub/workers/email-fetcher/wrangler.toml` — No cron, on-demand only
- `/home/dash/Hub/workers/feed-curator/src/index.ts` — Main feed curator (312 lines)
- `/home/dash/Hub/workers/feed-curator/src/types.ts` — Type definitions (204 lines)
- `/home/dash/Hub/workers/feed-curator/src/gmail.ts` — Gmail API integration (238 lines)
- `/home/dash/Hub/workers/feed-curator/src/extraction.ts` — Content extraction: images, videos, content cards (800 lines)
- `/home/dash/Hub/workers/feed-curator/src/curation.ts` — Gemini LLM curation + trailer enrichment (541 lines)
- `/home/dash/Hub/workers/feed-curator/src/database.ts` — Supabase CRUD + dedup + hot scores (353 lines)
- `/home/dash/Hub/workers/feed-curator-netflix/` — Netflix-only curator (same structure)
- `/home/dash/Hub/workers/feed-curator-spotify/` — Spotify-only curator
- `/home/dash/Hub/workers/feed-curator-prime/` — Prime-only curator
- `/home/dash/Hub/workers/setup-secrets.sh` — Script to set all worker secrets

### Backend
- `/home/dash/zion-interface/zion-email-center.cjs` — IMAP polling engine (34KB, NOT running)

### Hooks (Data Layer)
- `/home/dash/Hub/src/hooks/useCodeFetch.ts` — Worker API code fetch (152 lines)
- `/home/dash/Hub/src/hooks/useEmailAlerts.ts` — Supabase Realtime alerts (100+ lines)
- `/home/dash/Hub/src/hooks/useFeedItems.ts` — Feed items with balanced interleave (265 lines)
- `/home/dash/Hub/src/cockpit/useEmailData.ts` — Cockpit email data aggregator (192 lines)
- `/home/dash/Hub/src/cockpit/social/useEmailCenter.ts` — Notification intelligence hook

### UI Components
- `/home/dash/Hub/src/components/AccessPage.tsx` — User sign-in code page
- `/home/dash/Hub/src/components/social/SocialFeed.tsx` — Main social feed (882 lines)
- `/home/dash/Hub/src/components/social/CommentSection.tsx` — Comment thread component
- `/home/dash/Hub/src/components/social/OyeButton.tsx` — Reaction button
- `/home/dash/Hub/src/components/social/CreatePost.tsx` — User post creation
- `/home/dash/Hub/src/components/social/ShareSheet.tsx` — Share modal
- `/home/dash/Hub/src/cockpit/hub/EmailAdmin.tsx` — Cockpit email panel (690 lines)
- `/home/dash/Hub/src/cockpit/social/EmailCenter.tsx` — Full-screen email center
- `/home/dash/Hub/src/pages/EmailAdminPage.tsx` — Admin email page (4 tabs)
- `/home/dash/Hub/src/sdk/AnnouncementFeed.tsx` — Drop-in feed widget for any DASH app

### OAuth / Credentials
- `/home/dash/Hub/workers/email-fetcher/oauth-credentials.json` — Google OAuth client ID/secret
- `/home/dash/Hub/workers/email-fetcher/token.json` — Refresh token (updated 2026-02-19)
- `/home/dash/Hub/workers/email-fetcher/get-token.cjs` — Token refresh script
- `/home/dash/Hub/workers/email-fetcher/authorize.html` — OAuth authorization page
- Cloudflare Secrets: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

---

## 10. SUMMARY: STATE OF THE MACHINE

### What Works End-to-End
1. **Sign-in codes**: User clicks button → Worker → Gmail → code displayed. Reliable, sub-2s latency, zero cost.
2. **Feed display**: SocialFeed reads feed_items, renders cards with images, engagement buttons. Works but data is stale.
3. **Admin visibility**: EmailAdmin shows email_messages + deliveries + patterns with 30s auto-refresh.
4. **Worker infrastructure**: All 5 workers deployed, healthy, and responding.

### What's Half-Working
1. **Feed curation**: Workers are deployed and have cron triggers, but output stopped March 8. Either Gemini key expired, Gmail label empty, or secrets misconfigured.
2. **Email classification**: 29 patterns exist in DB but zion-email-center.cjs needs to be running to use them.
3. **Realtime code delivery**: Supabase channel subscriptions are configured in the hooks, but nobody writes to email_deliveries in production.

### What's Completely Missing
1. **Automated email ingestion** — zion-email-center.cjs needs to be daemonized or replaced with a Worker
2. **Worker → DB bridge** — email-fetcher should write codes to email_deliveries for push notifications
3. **Tivi feed surface** — no tivi.dasuperhub.com feed exists yet
4. **Spotify/Prime feed content** — zero items in DB for these services
5. **Hot scores / trending algorithm** — RPC function doesn't exist
6. **Dual language support** — DB migration may not be applied yet
