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

const VPS = 'https://stream.zionsynapse.online/ambient';

// Track mapping — each experience gets its own sonic vibe
const EXPERIENCE_TRACKS: Record<string, string> = {
  'welcome':       `${VPS}/ritual-awakening.mp3`,
  'home':          `${VPS}/deep-earth-current.mp3`,
  'sports':        `${VPS}/tribal-heatline.mp3`,
  'entertainment': `${VPS}/warm-drum-motion.mp3`,
  'kids':          `${VPS}/organic-invocation.mp3`,
  'movies247':     `${VPS}/midnight-polyrhythm.mp3`,
  'music':         `${VPS}/body-in-rhythm.mp3`,
  'news':          `${VPS}/shadowed-soil.mp3`,
  'documentary':   `${VPS}/echoes-of-earth.mp3`,
  'faith':         `${VPS}/ancestral-lift.mp3`,
  'football':      `${VPS}/tribal-language-rising.mp3`,
};

const AUDIO_URL = EXPERIENCE_TRACKS['home']; // Default
const STORAGE_KEY = 'tivi_ambient_enabled';
const VOLUME = 0.12; // Subtle — background, not foreground

/** Check if user has ambient enabled (ON by default) */
export function isAmbientEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'; // ON unless explicitly disabled
  } catch {
    return true;
  }
}

/** Initialize ambient audio (call once, on user gesture) */
export function initAmbient(): void {
  if (audio) return;

  audio = new Audio(AUDIO_URL);
  audio.crossOrigin = 'anonymous';
  audio.loop = true;
  audio.volume = VOLUME;
  audio.preservesPitch = false; // Natural pitch shift at different speeds
  // Set playback rate after audio loads (some browsers ignore it before)
  audio.addEventListener('canplaythrough', () => {
    if (audio) audio.playbackRate = currentSpeed;
  }, { once: true });
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

/** Switch to a different experience track (crossfade) */
export function setAmbientExperience(experience: string): void {
  const trackUrl = EXPERIENCE_TRACKS[experience] || EXPERIENCE_TRACKS['home'];
  if (!audio) return;

  // Only switch if it's a different track
  if (audio.src.includes(trackUrl.split('/').pop()!)) return;

  // Fade out current, switch, fade in
  const originalVolume = audio.volume;
  const fadeSteps = 20;
  let step = 0;

  const fadeOut = setInterval(() => {
    step++;
    if (audio) audio.volume = originalVolume * (1 - step / fadeSteps);
    if (step >= fadeSteps) {
      clearInterval(fadeOut);
      if (audio) {
        audio.src = trackUrl;
        audio.volume = 0;
        audio.play().catch(() => {});
        // Fade in
        let inStep = 0;
        const fadeIn = setInterval(() => {
          inStep++;
          if (audio) audio.volume = VOLUME * (inStep / fadeSteps);
          if (inStep >= fadeSteps) clearInterval(fadeIn);
        }, 50);
      }
    }
  }, 50);
}

/** Get current state */
export function getAmbientState(): { enabled: boolean; speed: number; playing: boolean } {
  return {
    enabled: isEnabled,
    speed: currentSpeed,
    playing: audio ? !audio.paused : false,
  };
}
