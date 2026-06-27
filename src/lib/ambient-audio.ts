/**
 * DASH Ambient Audio — Afro soul groove that breathes with the platform
 *
 * Speed shifts based on user depth:
 *   0.65x — Welcome/Login (dreamy reverb)
 *   0.80x — Home/Browse (warm groove)
 *   0.85x — Inside experience (exploring)
 *   1.00x — Content playing (full energy)
 *
 * Audio rotates through tracks. Speed transitions smoothly over 2 seconds.
 * User can toggle on/off. Preference persisted in localStorage.
 *
 * ── Session volume envelope ──────────────────────────────────────────────
 * The ambient is NOT a flat drone. It rides a session-long envelope:
 *   • ENTRY  (~0.32) — warm welcome on first start.
 *   • CRUISE (~0.20) — eases down after the first channel play / one cycle.
 *   • DUCK   (~0.00) — long eased fade under the player so it never leaks
 *                      sharply over the stream (smooth, not a hard cut).
 *   • COME-BACK — returning after being away resumes at HALF the target,
 *                 then eases back up gently.
 *   • RECYCLE — every ~2h the envelope resets to ENTRY then decays again,
 *               so a long session gently recedes + refreshes instead of
 *               droning forever.
 * All transitions are eased (ease-in-out) so there are no clicks/pops.
 */

let audio: HTMLAudioElement | null = null;
let currentSpeed = 0.8;
let targetSpeed = 0.8;
let transitionInterval: ReturnType<typeof setInterval> | null = null;
let isEnabled = false;
let isMutedForStream = false;

const VPS = 'https://stream.zionsynapse.online/ambient';

const EXPERIENCE_TRACKS: Record<string, string> = {
  'welcome':       `${VPS}/ritual-awakening.webm`,
  'home':          `${VPS}/deep-earth-current.webm`,
  'sports':        `${VPS}/tribal-heatline.webm`,
  'entertainment': `${VPS}/warm-drum-motion.webm`,
  'kids':          `${VPS}/organic-invocation.webm`,
  'movies247':     `${VPS}/midnight-polyrhythm.webm`,
  'music':         `${VPS}/body-in-rhythm.webm`,
  'news':          `${VPS}/shadowed-soil.webm`,
  'documentary':   `${VPS}/echoes-of-earth.webm`,
  'faith':         `${VPS}/ancestral-lift.webm`,
  'football':      `${VPS}/tribal-language-rising.webm`,
};

const HOME_ROTATION = [
  `${VPS}/deep-earth-current.webm`,
  `${VPS}/warm-drum-motion.webm`,
  `${VPS}/organic-invocation.webm`,
  `${VPS}/sacred-groove-expansion.webm`,
  `${VPS}/low-fire-drive.webm`,
  `${VPS}/ancestral-lift.webm`,
  `${VPS}/echoes-of-earth.webm`,
  `${VPS}/rooted-ceremony.webm`,
];
let rotationIndex = Math.floor(Math.random() * HOME_ROTATION.length);
const AUDIO_URL = HOME_ROTATION[rotationIndex];
const STORAGE_KEY = 'tivi_ambient_enabled';

// ── Session volume envelope levels (all tunable — owner dials the feel) ──
const ENTRY_VOLUME = 0.32;   // warm welcome on first start
const CRUISE_VOLUME = 0.20;  // settled level after the first play / one cycle
const STREAM_DUCK = 0.0;     // near-silence under the player (no leak)

// `targetVolume` is the LIVE envelope base. The swing breathes ±10% around it,
// and every fade resolves to it. Starts at ENTRY, eases to CRUISE, recycles.
let targetVolume = ENTRY_VOLUME;

// ── Envelope timing ─────────────────────────────────────────────────────
const ENTRY_FADE_MS = 2200;          // smooth fade-in on first start
const STREAM_FADE_MS = 2200;         // long eased duck / un-duck under player
const CRUISE_EASE_MS = 8000;         // gentle entry → cruise descent
const CRUISE_AFTER_MS = 30 * 1000;   // ease to cruise after ~one cruise cycle
const RECYCLE_MS = 2 * 60 * 60 * 1000; // 2h rolling envelope recycle
const RECYCLE_RISE_MS = 4000;        // rise back to entry on recycle
const AWAY_THRESHOLD_MS = 45 * 1000; // "been away a bit" before half-resume
const COMEBACK_DIP_MS = 600;         // eased dip to half on return
const COMEBACK_RESTORE_MS = 9000;    // slow ease back up after return

let sessionStartTs = 0;  // when the current envelope cycle started
let lastActiveTs = 0;    // last time the tab was active (for away-duration)
let wasHidden = false;   // only treat a focus/visible as a "come back" if truly hidden
let cruising = false;    // has the envelope settled to cruise this cycle
let cruiseTimer: ReturnType<typeof setTimeout> | null = null;

export function isAmbientEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

export function initAmbient(): void {
  if (audio) return;
  audio = new Audio();
  audio.src = AUDIO_URL;
  audio.loop = false;
  audio.volume = ENTRY_VOLUME;
  audio.crossOrigin = 'anonymous';
  startSwing();

  let fadeOutStarted = false;
  audio.addEventListener('timeupdate', () => {
    if (!audio || !isEnabled || isMutedForStream || fadeOutStarted) return;
    const remaining = audio.duration - audio.currentTime;
    if (remaining > 0 && remaining < 3 && audio.duration > 10) {
      fadeOutStarted = true;
      fadeVolume(audio.volume, 0, 3000);
    }
  });

  audio.addEventListener('ended', () => {
    if (!audio || !isEnabled || isMutedForStream) return;
    fadeOutStarted = false;
    // Small delay before rotating — prevents overlap with user interactions
    setTimeout(() => {
      if (!audio || !isEnabled || isMutedForStream) return;
      rotationIndex = (rotationIndex + 1) % HOME_ROTATION.length;
      audio.src = HOME_ROTATION[rotationIndex];
      audio.volume = 0;
      audio.play().catch(() => {});
      fadeVolume(0, targetVolume, 3000, undefined, true);
    }, 500);
  });

  audio.addEventListener('error', () => {});
  isEnabled = true;
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
}

export function startAmbient(): void {
  if (isMutedForStream) return;
  if (!audio) initAmbient();
  if (!audio) return;
  const now = Date.now();
  if (!sessionStartTs) sessionStartTs = now;
  lastActiveTs = now;
  // Open the envelope at ENTRY — a slightly warmer welcome.
  targetVolume = ENTRY_VOLUME;
  cruising = false;
  audio.volume = 0;
  audio.play().then(() => {
    if (!audio) return;
    audio.playbackRate = currentSpeed;
    try { audio.preservesPitch = false; } catch {}
    fadeVolume(0, ENTRY_VOLUME, ENTRY_FADE_MS, undefined, true);
  }).catch(() => {});
  isEnabled = true;
  // Settle ENTRY → CRUISE after roughly one cruise cycle (or sooner, when the
  // first channel plays — see muteAmbient → enterCruise()).
  if (cruiseTimer) clearTimeout(cruiseTimer);
  cruiseTimer = setTimeout(enterCruise, CRUISE_AFTER_MS);
}

export function stopAmbient(): void {
  if (audio) audio.pause();
  isEnabled = false;
  try { localStorage.setItem(STORAGE_KEY, 'off'); } catch {}
}

export function toggleAmbient(): boolean {
  if (isEnabled && audio && !audio.paused) {
    stopAmbient();
    return false;
  } else {
    startAmbient();
    if (audio && audio.paused) audio.play().catch(() => {});
    return true;
  }
}

export function setAmbientSpeed(speed: number): void {
  targetSpeed = Math.max(0.5, Math.min(1.2, speed));
  if (!audio || isMutedForStream) return;
  if (transitionInterval) clearInterval(transitionInterval);
  const steps = 40;
  const stepSize = (targetSpeed - currentSpeed) / steps;
  let step = 0;
  transitionInterval = setInterval(() => {
    step++;
    currentSpeed += stepSize;
    if (audio) audio.playbackRate = currentSpeed;
    if (step >= steps) {
      if (transitionInterval) clearInterval(transitionInterval);
      transitionInterval = null;
      currentSpeed = targetSpeed;
      if (audio) audio.playbackRate = targetSpeed;
    }
  }, 50);
}

// Player ENTER — duck the ambient DOWN smoothly over a long eased curve so it
// never leaks sharply over the stream. The source keeps playing (silently), so
// un-ducking on player exit is a clean fade back up. The swing bails while
// `isMutedForStream` is set, and the timeupdate/ended handlers bail too, so a
// silently-playing track can't bump the volume back up mid-stream.
export function muteAmbient(): void {
  if (!audio) return;
  isMutedForStream = true;
  // First channel play = the session has begun in earnest → settle to cruise.
  enterCruise();
  if (transitionInterval) { clearInterval(transitionInterval); transitionInterval = null; }
  // Long, eased fade to near-silence (fadeVolume clears any prior fade itself).
  fadeVolume(audio.volume, STREAM_DUCK, STREAM_FADE_MS, undefined, true);
}

// Player EXIT — fade the ambient back UP smoothly to the current envelope target.
export function unmuteAmbient(): void {
  if (!audio || !isEnabled) return;
  isMutedForStream = false;
  // If the track ran out while ducked, advance to the next one before resuming.
  if (audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - 0.05)) {
    rotationIndex = (rotationIndex + 1) % HOME_ROTATION.length;
    audio.src = HOME_ROTATION[rotationIndex];
    audio.volume = 0;
  }
  const resume = () => {
    if (!audio || isMutedForStream) return;
    audio.playbackRate = currentSpeed;
    fadeVolume(audio.volume, targetVolume, STREAM_FADE_MS, () => {
      if (typeof document === 'undefined' || !document.hidden) startSwing();
    }, true);
  };
  if (audio.paused) audio.play().then(resume).catch(() => {});
  else resume();
}

export function setAmbientExperience(experience: string): void {
  const trackUrl = EXPERIENCE_TRACKS[experience] || EXPERIENCE_TRACKS['home'];
  if (!audio || isMutedForStream) return;
  if (audio.src.includes(trackUrl.split('/').pop()!)) return;

  const originalVolume = audio.volume;
  fadeVolume(originalVolume, 0, 3000, () => {
    if (!audio || isMutedForStream) return;
    audio.src = trackUrl;
    audio.volume = 0;
    audio.play().catch(() => {});
    fadeVolume(0, targetVolume, 3000, undefined, true);
  });
}

export function getAmbientState(): { enabled: boolean; speed: number; playing: boolean } {
  return { enabled: isEnabled, speed: currentSpeed, playing: audio ? !audio.paused : false };
}

// ── Smooth volume fade utility ──────────────────────────────────────────
// Operates directly on audio.volume. `ease` applies an ease-in-out cubic so
// the curve is gentle at both ends (no clicks/pops). Linear by default.

let activeFadeInterval: ReturnType<typeof setInterval> | null = null;

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function fadeVolume(
  from: number,
  to: number,
  durationMs: number,
  onComplete?: () => void,
  ease = false
): void {
  if (!audio) return;
  // Kill any previous fade — prevents stacking
  if (activeFadeInterval) { clearInterval(activeFadeInterval); activeFadeInterval = null; }
  const steps = Math.max(10, Math.floor(durationMs / 60));
  const stepMs = durationMs / steps;
  let step = 0;
  activeFadeInterval = setInterval(() => {
    step++;
    const t = step / steps;
    const p = ease ? easeInOut(t) : t;
    if (audio) audio.volume = Math.max(0, Math.min(1, from + (to - from) * p));
    if (step >= steps) {
      if (activeFadeInterval) { clearInterval(activeFadeInterval); activeFadeInterval = null; }
      if (audio) audio.volume = Math.max(0, Math.min(1, to));
      if (onComplete) onComplete();
    }
  }, stepMs);
}

// ── Envelope-base fade ──────────────────────────────────────────────────
// Eases the `targetVolume` BASE (not audio.volume). The swing reads the live
// base each tick, so the ambient gently glides between envelope levels while
// still breathing. Runs on its own interval so it never fights fadeVolume.

let envelopeInterval: ReturnType<typeof setInterval> | null = null;

function fadeTargetVolume(to: number, durationMs: number, onComplete?: () => void): void {
  if (envelopeInterval) { clearInterval(envelopeInterval); envelopeInterval = null; }
  const from = targetVolume;
  if (durationMs <= 0) {
    targetVolume = to;
    if (onComplete) onComplete();
    return;
  }
  const steps = Math.max(10, Math.floor(durationMs / 80));
  const stepMs = durationMs / steps;
  let step = 0;
  envelopeInterval = setInterval(() => {
    step++;
    const p = easeInOut(step / steps);
    targetVolume = from + (to - from) * p;
    if (step >= steps) {
      if (envelopeInterval) { clearInterval(envelopeInterval); envelopeInterval = null; }
      targetVolume = to;
      if (onComplete) onComplete();
    }
  }, stepMs);
}

// ENTRY → CRUISE — once, gently. Triggered by the first channel play (muteAmbient)
// or a ~one-cycle timer, whichever comes first.
function enterCruise(): void {
  if (cruising) return;
  cruising = true;
  if (cruiseTimer) { clearTimeout(cruiseTimer); cruiseTimer = null; }
  fadeTargetVolume(CRUISE_VOLUME, CRUISE_EASE_MS);
}

// 2h RECYCLE — reset the envelope to ENTRY then let it decay to CRUISE again, so
// a long session gently recedes + refreshes every couple hours instead of droning.
function recycleEnvelope(): void {
  sessionStartTs = Date.now();
  cruising = false;
  fadeTargetVolume(ENTRY_VOLUME, RECYCLE_RISE_MS);
  if (cruiseTimer) clearTimeout(cruiseTimer);
  cruiseTimer = setTimeout(enterCruise, CRUISE_AFTER_MS);
}

// COME BACK — returning to the app after being away "a bit" resumes at HALF the
// current target (a soft re-entry), then eases back up gently. Fatigue reset.
function handleComeback(): void {
  if (!audio || !isEnabled || isMutedForStream || !wasHidden) return;
  wasHidden = false;
  const away = Date.now() - lastActiveTs;
  lastActiveTs = Date.now();
  if (!sessionStartTs || away < AWAY_THRESHOLD_MS) return;
  const restore = targetVolume;
  fadeTargetVolume(restore * 0.5, COMEBACK_DIP_MS, () => fadeTargetVolume(restore, COMEBACK_RESTORE_MS));
}

// ── Gentle volume swing — the ambient "cruises" in a mellow wave instead of
// sitting flat. Swings within a ~20% bracket BELOW the live envelope base
// (0.8–1.0 of targetVolume), ~28s per wave. Pauses during fades/mute so it
// never fights them. Also drives the 2h envelope recycle check (cheap).
//
// PERF: This is a 200ms timer that only does work while audio is actually
// playing. When the tab is hidden the audio element is throttled/paused by the
// browser anyway, so we tear the timer down entirely on `visibilitychange` and
// re-arm it when the tab returns — zero background timer churn when idle.
let swingPhase = Math.PI / 2; // start near the top of the wave
let swingInterval: ReturnType<typeof setInterval> | null = null;
let swingVisibilityBound = false;
function swingTick(): void {
  if (!audio || !isEnabled || isMutedForStream || audio.paused || activeFadeInterval) return;
  if (sessionStartTs && Date.now() - sessionStartTs >= RECYCLE_MS) recycleEnvelope();
  swingPhase += 0.045; // ~28s full wave — slow, mellow, cruising
  audio.volume = targetVolume * (0.9 + 0.1 * Math.sin(swingPhase));
}
function startSwing(): void {
  if (typeof document !== 'undefined' && document.hidden) return; // don't run offscreen
  if (swingInterval) return;
  swingInterval = setInterval(swingTick, 200);
}
function stopSwing(): void {
  if (swingInterval) { clearInterval(swingInterval); swingInterval = null; }
}
if (typeof document !== 'undefined' && !swingVisibilityBound) {
  swingVisibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasHidden = true;
      lastActiveTs = Date.now();
      stopSwing();
    } else {
      handleComeback();
      if (audio && isEnabled && !isMutedForStream) startSwing();
    }
  });
  // Window focus regained (without a tab visibility flip) — soft re-entry too.
  window.addEventListener('focus', handleComeback);
}

// ── Audio-reactive pulse — simple amplitude from audio element ───────────
// NO Web Audio API — avoids createMediaElementSource which hijacks audio output.
// Instead, use a simple volume-based pulse derived from the audio element state.

let smoothedAmplitude = 0;

export function getAmbientPulse(): number {
  if (!audio || audio.paused) return smoothedAmplitude * 0.95;

  // Simple pulse based on whether audio is playing + a time-based sine wave
  // This creates a gentle rhythmic pulse without needing frequency analysis
  const time = Date.now() / 1000;
  const basePulse = 0.3 + 0.2 * Math.sin(time * 1.2) + 0.1 * Math.sin(time * 2.7);

  smoothedAmplitude = smoothedAmplitude * 0.93 + basePulse * 0.07;
  return smoothedAmplitude;
}

export function initAudioReactive(): void {
  // No-op — pulse is now derived from time, not Web Audio
}
