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
const VOLUME = 0.4;

export function isAmbientEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

export function initAmbient(): void {
  if (audio) return;
  audio = new Audio();
  audio.src = AUDIO_URL;
  audio.loop = false;
  audio.volume = VOLUME;
  audio.crossOrigin = 'anonymous';

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
      fadeVolume(0, VOLUME, 3000);
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
  audio.volume = 0;
  audio.play().then(() => {
    if (!audio) return;
    audio.playbackRate = currentSpeed;
    try { audio.preservesPitch = false; } catch {}
    fadeVolume(0, VOLUME, 3000);
  }).catch(() => {});
  isEnabled = true;
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

export function muteAmbient(): void {
  if (!audio) return;
  isMutedForStream = true;
  // Kill ALL active intervals — prevents any fade/transition from bumping volume back up
  if (activeFadeInterval) { clearInterval(activeFadeInterval); activeFadeInterval = null; }
  if (transitionInterval) { clearInterval(transitionInterval); transitionInterval = null; }
  // Force immediate silence — no fade, no delay
  audio.volume = 0;
  audio.pause();
  // Reset source to kill any pending play() promises or ended callbacks
  audio.removeAttribute('src');
  audio.load();
}

export function unmuteAmbient(): void {
  if (!audio || !isEnabled) return;
  isMutedForStream = false;
  // Reload track since muteAmbient clears the source
  audio.src = HOME_ROTATION[rotationIndex];
  audio.volume = 0;
  audio.play().then(() => {
    if (audio && !isMutedForStream) fadeVolume(0, VOLUME, 2000);
  }).catch(() => {});
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
    fadeVolume(0, VOLUME, 3000);
  });
}

export function getAmbientState(): { enabled: boolean; speed: number; playing: boolean } {
  return { enabled: isEnabled, speed: currentSpeed, playing: audio ? !audio.paused : false };
}

// ── Smooth volume fade utility ──────────────────────────────────────────

let activeFadeInterval: ReturnType<typeof setInterval> | null = null;

function fadeVolume(from: number, to: number, durationMs: number, onComplete?: () => void): void {
  if (!audio) return;
  // Kill any previous fade — prevents stacking
  if (activeFadeInterval) { clearInterval(activeFadeInterval); activeFadeInterval = null; }
  const steps = Math.max(10, Math.floor(durationMs / 75));
  const stepMs = durationMs / steps;
  let step = 0;
  activeFadeInterval = setInterval(() => {
    step++;
    if (audio) audio.volume = Math.max(0, Math.min(1, from + (to - from) * (step / steps)));
    if (step >= steps) {
      if (activeFadeInterval) { clearInterval(activeFadeInterval); activeFadeInterval = null; }
      if (audio) audio.volume = Math.max(0, Math.min(1, to));
      if (onComplete) onComplete();
    }
  }, stepMs);
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
