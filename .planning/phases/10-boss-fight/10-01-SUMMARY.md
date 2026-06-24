# 10-01 SUMMARY — SurfaceStack foundation (no-page-break living place)

Status: **DONE & LIVE.** Build green, prod 200, verified by eye (local + live prod).

## What was built

The `SurfaceStack` primitive: state-driven layered surfaces that **rise** over a
persistent shell and **recede** on pop, with the DNA ease
`cubic-bezier(0.23,1,0.32,1)`. Surfaces are kept **mounted while stacked** (the
layer's DOM node persists; only the phase class changes — never an unmount), so
the world underneath never blinks and scroll/state are preserved. Proven by
routing the existing full-screen player through it (the player now rises as a
surface; close recedes to the exact prior scroll, page underneath does NOT
remount).

This is additive — React-Router routes are untouched. SurfaceStack sits ABOVE
the routed shell. Only the player flow was converted (the low-risk proof).

## Files changed

- **NEW** `src/components/system/SurfaceStack.tsx` — `SurfaceProvider` + context,
  `useSurfaces()` (`push`/`pop`/`replace`/`has`/`ids`), `useSurfacePortalTarget(id)`,
  and the layer renderer. Two content modes:
  - **self-contained** (`render()`) for future static-prop surfaces;
  - **portal host** (`portal: true`) — the surface owns only an animated,
    kept-mounted mount node; the caller portals its LIVE content in. The player
    uses this.
- `src/styles/globals.css` — surface-stack CSS (`.surface-stack-root`,
  `.surface-layer`, `.surface-rising/open/receding`, `.surface-portal-mount`,
  reduced-motion fallback). ~50 lines appended after the streamore block.
- `src/App.tsx` —
  - wrapped the app in `<SurfaceProvider>` (inside BrowserRouter);
  - `showFullPlayer` is now **derived** from `surfaces.has('player')` (all
    existing video / background / mini-player logic kept working unchanged);
  - `handlePlayChannel` → `surfaces.push({ id:'player', portal:true })`;
  - `handleClosePlayer` / `handleStopPlayer` → `surfaces.pop('player')`;
  - the `VideoPlayer` controls are rendered in AppContent (so `player.state`
    stays live — no stale closure) but **`createPortal`'d** into the player
    surface's mount node, which owns the rise/recede + keep-alive;
  - scroll capture/restore: `worldScrollRef` captures `window.scrollY` at rise,
    `restoreWorldScroll()` re-applies it across frames + short timers at recede.

## How rise / recede + scroll-preservation work

- **Rise**: push adds the layer in `rising` (translateY 7% + opacity 0); a
  double-rAF promotes it to `open` (translateY 0 + opacity 1) → the CSS
  transition fires the rise on the 0.23 heartbeat. The persistent `<video>`
  (z-50 in the shell) fills the screen behind; surface layers sit at z-55+ so
  the controls ride above the stream, with the world below.
- **Recede**: pop sets the layer to `receding` (back to translateY 7% + opacity
  0); after the 420ms transition the layer unmounts. Captured mid-flight in
  verification: `phase:receding, transform:translateY(10.6px), opacity:0.83`.
- **No remount**: the routed page in `<main>` never unmounts when the player
  opens (opening is pure state, no route change). Proven: a DOM node tagged in
  `<main>` before open still has its attribute and is still in the live DOM
  after open+close (`probeStillInDom:true`).
- **Scroll preserved**: the page never unmounted, so the scroll position is
  intrinsically retained; `restoreWorldScroll()` is a belt-and-braces guard
  against the `<video>` nudging document scroll when it fills/leaves the screen.

## Verification (by eye, not just "build green")

Playwright, mobile 412×900, login `001AA` / `123456`, on **local preview AND
live prod tivi.dasuperhub.com**. Identical result both:

```
scrollBefore: 480
scrollUnderPlayer: 480      ← world did not jump when player rose
surfaceInfo: { up:true, phase:'open', zIndex:'55', hasVideoPlayerChild:true,
               homeStillMounted:true }
RECEDE_MID: { phase:'receding', transform:translateY(~10px), opacity:~0.83 }
closed: true, surfaceGone: true
afterClose: { scrollY:480, probeStillInDom:true }   ← exact scroll + no remount
scrollPreserved: true
console errors: none (the 403s are sandbox IPTV network, unrelated)
```

Screenshots (scratchpad): `03-player-risen.png` (player risen over the world,
full controls), `03b-receding.png` (player sinking, home rows revealed beneath +
MiniPlayer pill), `04-after-close.png` (home restored at exact scroll 480, no
white flash).

Route smoke (additive proof): `/movies /series /hub /streamore /` all render
`<main>` with zero page errors — navigation untouched.

## Build + prod status

- `npm run build` — GREEN (tsc strict + vite, 1602 modules).
- Deployed `npx vercel deploy --prod --yes` — READY/production.
- `tivi.dasuperhub.com` → 200. Live JS+CSS bundles confirmed to contain the new
  code (`surface-layer`, `surface-portal-mount`, `surface-stack-root`,
  `surface-receding`).

## Deviations / decisions

- **Portal vs inline (the architectural fork the plan flagged).** Resolved to a
  hybrid: SurfaceStack supports BOTH a self-contained `render()` mode and a
  portal-host mode. The player uses the portal-host mode because `player.state`
  changes on every playback event — a closure captured at push time (render
  mode) would go stale, since SurfaceStackRenderer is not a descendant of
  AppContent's tree. Portaling keeps VideoPlayer in AppContent (live props) while
  SurfaceStack owns the rise/recede + keep-alive lifecycle. This is a
  well-understood resolution, not a guess; reporting it per the guardrail.
- **z-index**: surface layers start at z-55 (above the routed `<main>` and the
  persistent full-player `<video>` at z-50), so the controls ride above the
  stream. The `<video>` itself stays in the shell (never moved → HLS/audio
  context untouched).
- **Scroll capture/restore** added as a guard. In viewport-realistic usage the
  scroll never actually jumped (the earlier "reset to 0" in testing was an
  artifact of the test calling `scrollIntoView` before opening, not an app bug),
  but the guard makes the deliverable robust against late `<video>` scroll
  nudges.
- Did NOT touch other routes/flows. Other surfaces (Stream+/VOYO, Phases 14/17)
  can now reuse `useSurfaces().push(...)`.

## Honest caveats

- Verified the rise/recede animation, no-remount, and scroll-preservation by
  automated eye on real renders (local + prod). Could NOT verify actual video
  playback (sandbox has no IPTV network → "Reconnecting"/403s), but that's
  orthogonal to the surface seam — the player UI mounted/animated correctly.
- The deploy bundled pre-existing uncommitted working-tree changes (HomePage,
  DaHubPage, etc. — not part of this task). Nothing was committed; the tree
  still holds those WIP changes alongside the SurfaceStack work.
- Only the player flow is converted. In-app route moves (Home↔Movies↔Series…)
  are still React-Router swaps — intentionally out of scope for this safe,
  incremental phase.
