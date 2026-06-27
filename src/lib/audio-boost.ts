/**
 * DashTivi+ Audio — PASSTHROUGH (native, perfectly-synced).
 *
 * The previous version ran every stream's audio through a Web Audio EQ chain
 * (createMediaElementSource → 5-band EQ → compressor → destination). The problem:
 * the instant you route a <video>'s audio through Web Audio, the browser stops
 * managing A/V sync for it — the audio plays on the AudioContext output clock while
 * the picture renders on the media clock, so the audio drifts BEHIND the video
 * (the "audio is delayed" lip-sync issue, on every channel).
 *
 * For a live-TV app, sync beats EQ warmth. We now leave the video element's NATIVE
 * audio path completely untouched → audio is locked to the picture. The EQ can come
 * back later server-side (in the transcode), where it can't desync playback.
 *
 * Same exports as before (no-ops) so callers don't change.
 */

export function connectBoost(_video: HTMLVideoElement): boolean {
  // Intentionally a no-op — keep the native (synced) audio path.
  return false;
}

export function disconnectBoost(): void {}
export function setBoostLevel(): void {}
export function getBoostLevel(): number { return 1; }
export function getChannelBoost(): number { return 1; }
export function isBoostConnected(): boolean { return false; }
