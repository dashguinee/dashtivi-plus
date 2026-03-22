/**
 * DASH Ambient Audio — Afro soul groove that breathes with the platform
 *
 * Speed shifts based on user depth:
 *   0.65x — Welcome/Login (dreamy reverb, "entering the universe")
 *   0.80x — Home/Browse (warm groove, "I'm home")
 *   0.85x — Inside experience (exploring)
 *   1.00x — Content playing (full energy)
 *
 * Audio loops seamlessly. Speed transitions smoothly over 2 seconds.
 * User can toggle on/off. Preference persisted in localStorage.
 */

let audio: HTMLAudioElement | null = null;
let currentSpeed = 0.8;
let targetSpeed = 0.8;
let transitionInterval: ReturnType<typeof setInterval> | null = null;
let isEnabled = false;

const AUDIO_URL = '/dash-ambient-loop.mp3';
const STORAGE_KEY = 'tivi_ambient_enabled';
const VOLUME = 0.12; // Subtle — background, not foreground

/** Check if user has ambient enabled */
export function isAmbientEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Initialize ambient audio (call once, on user gesture) */
export function initAmbient(): void {
  if (audio) return;

  audio = new Audio(AUDIO_URL);
  audio.loop = true;
  audio.volume = VOLUME;
  audio.playbackRate = currentSpeed;
  isEnabled = true;

  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {}
}

/** Start playing (must be called from user gesture for autoplay policy) */
export function startAmbient(): void {
  if (!audio) initAmbient();
  if (!audio) return;

  audio.play().catch(() => {
    // Autoplay blocked — will start on next user interaction
  });
  isEnabled = true;
}

/** Stop ambient audio */
export function stopAmbient(): void {
  if (audio) {
    audio.pause();
  }
  isEnabled = false;
  try {
    localStorage.setItem(STORAGE_KEY, 'false');
  } catch {}
}

/** Toggle ambient on/off */
export function toggleAmbient(): boolean {
  if (isEnabled && audio && !audio.paused) {
    stopAmbient();
    return false;
  } else {
    startAmbient();
    return true;
  }
}

/** Smoothly transition to a new playback speed over ~2 seconds */
export function setAmbientSpeed(speed: number): void {
  targetSpeed = Math.max(0.5, Math.min(1.2, speed));

  if (!audio) return;

  // Clear any existing transition
  if (transitionInterval) clearInterval(transitionInterval);

  // Smooth transition: step every 50ms over 2 seconds = 40 steps
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

/** Mute ambient temporarily (e.g., when video is playing) */
export function muteAmbient(): void {
  if (audio) audio.volume = 0;
}

/** Restore ambient volume */
export function unmuteAmbient(): void {
  if (audio) audio.volume = VOLUME;
}

/** Get current state */
export function getAmbientState(): { enabled: boolean; speed: number; playing: boolean } {
  return {
    enabled: isEnabled,
    speed: currentSpeed,
    playing: audio ? !audio.paused : false,
  };
}
