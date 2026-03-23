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

// Home rotation — shuffle through these on the homepage
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
const VOLUME = 0.7;

/** Check if user has ambient enabled (ON by default, reset on new version) */
export function isAmbientEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    // If never set or set to anything other than explicit 'off', enable
    return val !== 'off';
  } catch {
    return true;
  }
}

/** Initialize ambient audio (call once, on user gesture) */
export function initAmbient(): void {
  if (audio) return;
  console.log('[ambient] init — URL:', AUDIO_URL);
  audio = new Audio();
  audio.src = AUDIO_URL;
  audio.loop = false; // Don't loop — rotate to next track
  audio.volume = VOLUME;

  // When track ends, crossfade to next in rotation
  audio.addEventListener('ended', () => {
    if (!audio || !isEnabled) return;
    rotationIndex = (rotationIndex + 1) % HOME_ROTATION.length;
    audio.src = HOME_ROTATION[rotationIndex];
    audio.volume = 0;
    audio.play().catch(() => {});
    // Fade in next track
    let step = 0;
    const steps = 20;
    const interval = setInterval(() => {
      step++;
      if (audio) audio.volume = VOLUME * (step / steps);
      if (step >= steps) { clearInterval(interval); if (audio) audio.volume = VOLUME; }
    }, 100);
  });
  audio.addEventListener('error', (e) => {
    console.error('[ambient] error:', audio?.error?.code, audio?.error?.message);
  });
  audio.addEventListener('playing', () => {
    console.log('[ambient] PLAYING — vol:', audio?.volume, 'rate:', audio?.playbackRate);
  });
  isEnabled = true;
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
}

/** Start playing (must be called from user gesture for autoplay policy) */
export function startAmbient(): void {
  console.log('[ambient] startAmbient');
  if (!audio) initAmbient();
  if (!audio) return;
  // Start silent, fade in over 3 seconds
  audio.volume = 0;
  audio.play().then(() => {
    console.log('[ambient] play OK — fading in');
    if (audio) {
      audio.playbackRate = currentSpeed;
      try { audio.preservesPitch = false; } catch {}
      // Smooth fade in: 0 → VOLUME over 3 seconds
      let step = 0;
      const steps = 30;
      const interval = setInterval(() => {
        step++;
        if (audio) audio.volume = VOLUME * (step / steps);
        if (step >= steps) {
          clearInterval(interval);
          if (audio) audio.volume = VOLUME;
        }
      }, 100);
    }
  }).catch((err) => {
    console.error('[ambient] play FAIL:', err.message);
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
    localStorage.setItem(STORAGE_KEY, 'off');
  } catch {}
}

/** Toggle ambient on/off */
export function toggleAmbient(): boolean {
  if (isEnabled && audio && !audio.paused) {
    stopAmbient();
    return false;
  } else {
    startAmbient();
    // If play failed, retry immediately (covers edge case where first attempt is rejected)
    if (audio && audio.paused) {
      audio.play().catch(() => {});
    }
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

/** Fade out ambient over 2s (e.g., when video starts playing) */
export function muteAmbient(): void {
  if (!audio) return;
  let step = 0;
  const steps = 20;
  const startVol = audio.volume;
  const fadeInterval = setInterval(() => {
    step++;
    if (audio) audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(fadeInterval);
      if (audio) audio.volume = 0;
    }
  }, 100); // 20 steps × 100ms = 2 seconds
}

/** Fade ambient back in over 2s */
export function unmuteAmbient(): void {
  if (!audio) return;
  let step = 0;
  const steps = 20;
  const interval = setInterval(() => {
    step++;
    if (audio) audio.volume = VOLUME * (step / steps);
    if (step >= steps) {
      clearInterval(interval);
      if (audio) audio.volume = VOLUME;
    }
  }, 100);
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
