/**
 * DashTivi+ Audio Presence — always-on broadcast EQ.
 *
 * 5-band EQ chain: source → subBass → bass → warmth → presence → air → limiter → speakers
 *
 * CRITICAL: MediaElementAudioSourceNode can only be created ONCE per video element.
 * Once connected, the chain stays wired permanently — it follows the video through
 * src changes, pauses, and channel switches automatically.
 *
 * connectBoost(video) is idempotent — call it as many times as you want.
 * disconnectBoost() is now a no-op — the chain is permanent by design.
 */

let ctx: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let connectedVideo: HTMLVideoElement | null = null;
let chainWired = false;

// Resume AudioContext when tab regains focus (iOS/Android suspend it)
if (typeof document !== 'undefined') {
  const resumeCtx = () => {
    if (ctx && (ctx.state === 'suspended' || (ctx as any).state === 'interrupted')) {
      ctx.resume().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeCtx(); });
  window.addEventListener('focus', resumeCtx);
}

export function connectBoost(video: HTMLVideoElement): boolean {
  // Already wired to this element — just ensure context is running
  if (connectedVideo === video && chainWired) {
    if (ctx && (ctx.state === 'suspended' || (ctx as any).state === 'interrupted')) {
      ctx.resume().catch(() => {});
    }
    return true;
  }

  try {
    // Fresh context if closed or missing
    if (ctx && ctx.state === 'closed') {
      ctx = null; sourceNode = null; chainWired = false;
    }
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended' || (ctx as any).state === 'interrupted') {
      ctx.resume().catch(() => {});
    }

    // Different video element — rare (only if DOM element itself changes)
    if (connectedVideo && connectedVideo !== video) {
      if (sourceNode) try { sourceNode.disconnect(); } catch {}
      sourceNode = null;
      chainWired = false;
    }

    // Create source node ONCE per video element — this is permanent
    if (!sourceNode) {
      sourceNode = ctx.createMediaElementSource(video);
    }

    // Build the EQ chain
    const subBass = ctx.createBiquadFilter();
    subBass.type = 'lowshelf'; subBass.frequency.value = 60; subBass.gain.value = 2.5;

    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf'; bass.frequency.value = 150; bass.gain.value = 1.5;

    const warmth = ctx.createBiquadFilter();
    warmth.type = 'peaking'; warmth.frequency.value = 280; warmth.Q.value = 0.7; warmth.gain.value = 1.5;

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking'; presence.frequency.value = 3200; presence.Q.value = 0.9; presence.gain.value = 2;

    const air = ctx.createBiquadFilter();
    air.type = 'highshelf'; air.frequency.value = 12000; air.gain.value = 1.5;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 10;
    limiter.ratio.value = 2; limiter.attack.value = 0.003; limiter.release.value = 0.25;

    // Wire: source → EQ → limiter → speakers
    sourceNode.connect(subBass);
    subBass.connect(bass);
    bass.connect(warmth);
    warmth.connect(presence);
    presence.connect(air);
    air.connect(limiter);
    limiter.connect(ctx.destination);

    connectedVideo = video;
    chainWired = true;
    return true;
  } catch (e) {
    console.warn('[AUDIO] EQ failed:', e);
    // Last resort: bypass EQ, send audio straight to speakers
    if (sourceNode && ctx) {
      try { sourceNode.connect(ctx.destination); } catch {}
    }
    connectedVideo = video;
    chainWired = false;
    return false;
  }
}

// No-op — chain is permanent by design. The sourceNode follows the video
// through src changes automatically. Disconnecting would kill audio.
export function disconnectBoost() {
  // Resume context if suspended (e.g., after tab switch on iOS)
  if (ctx && (ctx.state === 'suspended' || (ctx as any).state === 'interrupted')) {
    ctx.resume().catch(() => {});
  }
}

export function setBoostLevel() {}
export function getBoostLevel(): number { return 1; }
export function getChannelBoost(): number { return 1; }
export function isBoostConnected(): boolean { return chainWired; }
