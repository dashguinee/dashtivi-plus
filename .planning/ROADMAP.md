# ROADMAP — DASH Living Place (Gira/Heema DNA → Tivi+)
_Milestone: **living-place v1**. Brief = the canonical DNA spec: `@/home/dash/op4/state/dash-experience-dna.md` (read first). Working app: `/home/dash/tivi-plus` (React+TS+Vite, prod tivi.dasuperhub.com). Principle: spine-first, each phase shippable + verified-by-eye, signal-not-noise. North-star demo: **"Vee, this match" → it plays.**_
_(Supersedes the old Sports-Arena roadmap.)_

## Already shipped (this session — the foundation under this milestone)
- ✅ ID+PIN universal identity (`login_with_pin` RPC live; 001AA/123456 works)
- ✅ DaHub (Voyo hub ported, real My Pass + pricing)
- ✅ Stream+ visor v1 (built; **reshapes in Phase 14** to the unit)
- ✅ 96 free channels locked (trims to 50 in Phase 14)

## Phases (spine-first; do in order; each ends shippable)

### Phase 10 — THE BOSS FIGHT: the no-page-break living place ⭐ (highest leverage)
The architecture that turns Tivi+ from an app into a place. Everything else stands on it.
- **10-01** Persistent shell that never unmounts (CosmicBackground, Header, Navbar, VEE pebble live above the swap). Convert in-app navigation from route-swaps to a **surface stack** (state-driven layers) that RISE over the world.
- **10-02** Scroll + state preservation: leaving a surface preserves scroll + component state; return restores exactly (keep-alive). No white flash, no reset, no teleport.
- **10-03** The player RISES over the world (a surface, not a route): open = rises, close = recedes to exact prior position; world keeps living underneath.
- **Verify:** Home → Stream+ → collection → player → back with scroll preserved at each level; nothing unmounts (proof + by-eye 412px); prod 200.

### Phase 11 — VEE presence shell (body permanent, brain pluggable)
- **11-01** Pebble → real **VEE orb**: port HeemaOrb (5 layers, 2 tilted orbital planes, glass sphere) recolored violet/seal; 4 states `idle/thinking/speaking/listening`.
- **11-02** Thumb-summoned **wheel** (OrbitalWheel): hold → blooms from thumb; actions (Ask VEE · Search · Stream+ · Surprise · My Pass). Fix hold-vs-tap.
- **11-03** **`VeeBrain` provider abstraction** (intent→action) with orb states wired; mock now, **Gemini Live (cockpit) or free voice+chat pluggable** later. No lock-in.
- **Verify:** orb breathes + cycles 4 states by eye; wheel blooms on hold; mock brain drives states; build green; prod 200.

### Phase 12 — The living breathing world
- **12-01** Ambient that LIVES (CosmicBackground drifts/breathes/glows; ParticleField in DASH palette). Never static.
- **12-02** **pov 3-D cards** (`perspective:1200px`); **dissolve-beams** (top/bottom edge fades) on scroll surfaces; **0.23 heartbeat** ease unified everywhere.
- **Verify:** by-eye world alive, cards have depth, no hard edges, one ease; mobile perf ok; prod 200.

### Phase 13 — Warm-luxury skin
- **13-01** Pearl-warm canvas + time-of-day theming (morning pearl → evening warm → night).
- **13-02** Seal/violet **quiet-luxury** palette + gold — explicitly NOT neon-AI-teal.
- **Verify:** by-eye premium + warm, not neon-tech; consistent; prod 200.

### Phase 14 — Stream+ as surfaces (the gift, the unit)
- **14-01** Reshape to the unit: **1 visor (10 curated: docs/HLS/recap-iframe) + 50 free in 8 collections (~6 each)**, **visor → collections → player** grammar, rising surfaces. Trim 96→50.
- **14-02** Green **"free" pills** woven into TV+ categories — gift everywhere, no infra stretch.
- **Verify:** Stream+ = the unit; free pills in categories; visor→collection→player as rising surfaces; prod 200.

### Phase 15 — VEE voice-to-content loop (NORTH STAR ⭐)
- **15-01** Plug a real brain (Gemini Live cockpit-pattern / free) into `VeeBrain`; intent → resolve from catalog → content **rises + plays**.
- **15-02** *"Vee, this match"* → live football rises + plays · *"Vee, a cool movie"* → mood pick / 3-card visor · *"Vee, some Afrobeats"* → VOYO rises (Phase 17).
- **Verify:** intents → correct content rises + plays; north-star demo works; prod 200.

### Phase 16 — One grammar across districts
- **16-01** Apply visor → collections → player to TV+/Movies/Series so every district speaks one language.
- **Verify:** each district follows the grammar (rising surfaces); prod 200.

### Phase 17 — THE BORDERLESS VERSE: DASH apps rise in-app 🌌 (Aziz insight 2026-06-24)
DASH apps are PWAs → they can open **within** DASH, borderless. The ecosystem-level "country not buildings": other DASH apps rise as surfaces in the same verse — you never leave.
- **17-01** **Embedded-PWA surface**: VOYO (voyomusic.com, PWA) rises as a borderless full-bleed surface inside DASH (iframe/webview, no chrome) via the Phase-10 surface stack. Close = recedes to where you were. State/audio handoff considered.
- **17-02** **Detect-app + "Open in app"**: detect available DASH apps (VOYO now; future Movies+/Music+); show **"Open in app"** (rises borderless in-verse) vs install. A registry of DASH-verse apps.
- **17-03** Wire VEE: *"Vee, some Afrobeats"* → VOYO surface rises borderless, already playing.
- **Verify:** "Open in app" → VOYO rises borderless inside DASH (by-eye, real device for PWA), close returns to exact spot; the verse feels like one place; prod 200.

## Milestone done when
"Vee, this match → it plays" works on prod; one living place (no page breaks, alive, warm-luxury, VEE present); Stream+ = the unit; VOYO rises borderless in-verse; all phases verified by eye + prod 200.

## Tracking
- [ ] 10 Boss Fight ⭐ · [ ] 11 VEE presence · [ ] 12 Living world · [ ] 13 Skin · [ ] 14 Stream+ unit · [ ] 15 Voice loop ⭐ · [ ] 16 Grammar · [ ] 17 Borderless verse 🌌
_Execute each phase fresh via `/run-plan .planning/phases/<phase>/<plan>` (fresh context = no quality degradation). Plan each phase's atomic 2-3 task PLAN.md just-in-time before executing._
