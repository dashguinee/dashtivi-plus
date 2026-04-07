/**
 * DASH Cinema Sound — "Zzzzoum toundoum"
 * Pure Web Audio API synthesizer. No audio files needed.
 * Slow, cinematic rising bass sweep → deep bass impact hit with sub-bass rumble.
 * Total duration: ~2.5 seconds
 *
 * IMPORTANT: Must be called from a user gesture (click handler) for AudioContext to work.
 */

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];

export function playDashCinemaSound(): void {
  try {
    // Stop any still-playing oscillators from a previous rapid invocation
    for (const osc of activeOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    activeOscillators = [];

    // Reuse or create AudioContext
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Master gain — cinematic, not blasting
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.35, now);
    master.connect(ctx.destination);

    // === "Zzzzoum" — slow rising bass sweep (0 to 1.2s) ===
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(30, now);                        // Start very low
    sweep.frequency.exponentialRampToValueAtTime(90, now + 1.0);    // Slow rise
    sweep.frequency.exponentialRampToValueAtTime(110, now + 1.2);   // Final push
    sweepGain.gain.setValueAtTime(0, now);
    sweepGain.gain.linearRampToValueAtTime(0.3, now + 0.3);        // Slow fade in
    sweepGain.gain.linearRampToValueAtTime(0.35, now + 0.8);       // Sustain
    sweepGain.gain.linearRampToValueAtTime(0, now + 1.3);          // Fade out
    sweep.connect(sweepGain);
    sweepGain.connect(master);
    sweep.start(now);
    sweep.stop(now + 1.4);
    activeOscillators.push(sweep);
    sweep.onended = () => { activeOscillators = activeOscillators.filter(o => o !== sweep); };

    // === "toun" — first bass hit (1.1s) ===
    const hit1 = ctx.createOscillator();
    const hit1Gain = ctx.createGain();
    hit1.type = 'sine';
    hit1.frequency.setValueAtTime(70, now + 1.1);
    hit1.frequency.exponentialRampToValueAtTime(45, now + 1.5);     // Drop
    hit1Gain.gain.setValueAtTime(0, now + 1.09);
    hit1Gain.gain.linearRampToValueAtTime(0.5, now + 1.13);        // Sharp attack
    hit1Gain.gain.exponentialRampToValueAtTime(0.15, now + 1.5);   // Sustain
    hit1Gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);   // Decay
    hit1.connect(hit1Gain);
    hit1Gain.connect(master);
    hit1.start(now + 1.1);
    hit1.stop(now + 1.9);
    activeOscillators.push(hit1);
    hit1.onended = () => { activeOscillators = activeOscillators.filter(o => o !== hit1); };

    // === "doum" — second deeper bass hit (1.6s) ===
    const hit2 = ctx.createOscillator();
    const hit2Gain = ctx.createGain();
    hit2.type = 'sine';
    hit2.frequency.setValueAtTime(55, now + 1.6);
    hit2.frequency.exponentialRampToValueAtTime(30, now + 2.2);     // Deep drop
    hit2Gain.gain.setValueAtTime(0, now + 1.59);
    hit2Gain.gain.linearRampToValueAtTime(0.55, now + 1.63);       // Sharp attack
    hit2Gain.gain.exponentialRampToValueAtTime(0.1, now + 2.1);    // Long sustain
    hit2Gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);   // Slow decay
    hit2.connect(hit2Gain);
    hit2Gain.connect(master);
    hit2.start(now + 1.6);
    hit2.stop(now + 2.6);
    activeOscillators.push(hit2);
    hit2.onended = () => { activeOscillators = activeOscillators.filter(o => o !== hit2); };

    // === Sub-bass rumble underneath both hits ===
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(28, now + 1.1);
    subGain.gain.setValueAtTime(0, now + 1.09);
    subGain.gain.linearRampToValueAtTime(0.2, now + 1.2);
    subGain.gain.linearRampToValueAtTime(0.15, now + 2.0);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
    sub.connect(subGain);
    subGain.connect(master);
    sub.start(now + 1.1);
    sub.stop(now + 2.6);
    activeOscillators.push(sub);
    sub.onended = () => {
      activeOscillators = activeOscillators.filter(o => o !== sub);
      // When all oscillators done, disconnect master from speakers
      if (activeOscillators.length === 0) {
        try { master.disconnect(); } catch {}
      }
    };
  } catch {
    // Web Audio not available — silent fallback
  }
}
