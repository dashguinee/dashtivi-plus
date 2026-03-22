/**
 * DASH Cinema Sound — "Zzzzoum toundoum"
 * Pure Web Audio API synthesizer. No audio files needed.
 * Rising bass sweep → bass impact hit with sub-bass rumble.
 */
export function playDashCinemaSound(): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Master gain — keep it tasteful, not blasting
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.3, now);
    master.connect(ctx.destination);

    // === "Zzzzoum" — rising bass sweep (0 to 0.6s) ===
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(40, now);
    sweep.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    sweepGain.gain.setValueAtTime(0, now);
    sweepGain.gain.linearRampToValueAtTime(0.4, now + 0.15);
    sweepGain.gain.linearRampToValueAtTime(0.3, now + 0.4);
    sweepGain.gain.linearRampToValueAtTime(0, now + 0.6);
    sweep.connect(sweepGain);
    sweepGain.connect(master);
    sweep.start(now);
    sweep.stop(now + 0.7);

    // === "toundoum" — bass impact hit (0.5s to 1.0s) ===
    const impact = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impact.type = 'sine';
    impact.frequency.setValueAtTime(80, now + 0.5);
    impact.frequency.exponentialRampToValueAtTime(40, now + 0.9);
    impactGain.gain.setValueAtTime(0, now + 0.49);
    impactGain.gain.linearRampToValueAtTime(0.5, now + 0.52);
    impactGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    impact.connect(impactGain);
    impactGain.connect(master);
    impact.start(now + 0.5);
    impact.stop(now + 1.1);

    // === Sub-bass rumble underneath impact ===
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(35, now + 0.5);
    subGain.gain.setValueAtTime(0, now + 0.49);
    subGain.gain.linearRampToValueAtTime(0.2, now + 0.55);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    sub.connect(subGain);
    subGain.connect(master);
    sub.start(now + 0.5);
    sub.stop(now + 1.3);

    // Cleanup context after sound completes
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Web Audio not available — silent fallback
  }
}
