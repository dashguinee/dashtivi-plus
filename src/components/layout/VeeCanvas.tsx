import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Tv, Film, MonitorPlay, Sparkles, Search } from 'lucide-react';
import { tap } from '@/lib/haptics';

/**
 * VeeCanvas — "Vee's canvas," the founder's hold experience.
 *
 * Why this exists: the old VeeWheel rendered INSIDE the Navbar's stacking
 * context, so its z-index was capped and other layers painted over it — the
 * founder never actually saw it. This component renders the ENTIRE overlay via
 * createPortal(document.body) so it escapes every parent stacking context and
 * sits at the absolute front (z 10000, above the search pebble 9996 and the
 * island 9997).
 *
 * What it is:
 *   - Ambient backdrop that BLURS + dims the whole app (violet veil), fades in.
 *   - Premium glass PILLS float in (Live / Movies / Series / Ask Vee / Search).
 *   - A calm "canvas" centre where Vee greets and will hold messages/links.
 *   - A textured chat-bubble pill at the bottom (Vee's iridescent identity).
 *   - HOLD the bubble → SPEAK (waveform + live transcript, lifted from the
 *     DynamicIsland speech logic). Typing is also allowed.
 *   - Backdrop comes ALIVE (glow pulses/flows) while listening or typing.
 *   - Touch the backdrop → dissolves closed.
 */

export type VeeAction = 'live' | 'movies' | 'series' | 'ask' | 'search';

const PILLS: { key: VeeAction; icon: React.FC<any>; label: string }[] = [
  { key: 'live', icon: Tv, label: 'Live' },
  { key: 'movies', icon: Film, label: 'Movies' },
  { key: 'series', icon: MonitorPlay, label: 'Series' },
  { key: 'ask', icon: Sparkles, label: 'Ask Vee' },
  { key: 'search', icon: Search, label: 'Search' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const VeeCanvas: React.FC<{
  active: boolean;
  onSelect: (a: VeeAction) => void;
  onClose: () => void;
}> = ({ active, onSelect, onClose }) => {
  const navigate = useNavigate();
  const reduced = useRef(prefersReducedMotion());
  const [mounted, setMounted] = useState(false);

  // ── Speak / type state (adapted from DynamicIsland) ─────────────────────
  const [composing, setComposing] = useState(false); // text input shown
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [waveformLevels, setWaveformLevels] = useState<number[]>([0.3, 0.3, 0.3, 0.3, 0.3]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "alive" = backdrop pulses harder while the founder is speaking or typing.
  const alive = isRecording || composing || text.trim().length > 0;

  // Mount/animate-in cycle — rAF so the fade/scale transition has a frame to run.
  useEffect(() => {
    if (active) {
      const r = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(r);
    }
    setMounted(false);
  }, [active]);

  // ── Speech logic lifted/adapted from DynamicIsland.tsx ──────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;

      const updateWaveform = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const levels = Array.from(data.slice(0, 5)).map((v) => Math.max(0.2, v / 255));
          setWaveformLevels(levels);
        }
        animationRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.onresult = (event: any) => {
          const result = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join('');
          setTranscript(result);
        };
        recognitionRef.current.start();
      }

      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();

      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
      setIsRecording(false);
      // Fall back to typing so the founder can still talk to Vee.
      setComposing(true);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch { /* already closed */ }
    }
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      } catch { /* already stopped */ }
    }
    setWaveformLevels([0.3, 0.3, 0.3, 0.3, 0.3]);
    setIsRecording(false);
  }, []);

  // Cleanup on unmount / when the canvas closes.
  useEffect(() => {
    if (!active) {
      stopRecording();
      setComposing(false);
      setText('');
      setTranscript('');
    }
  }, [active, stopRecording]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  if (!active) return null;

  // ── Action dispatch ─────────────────────────────────────────────────────
  const dispatch = (a: VeeAction) => {
    tap();
    if (a === 'live') navigate('/');
    else if (a === 'movies') navigate('/movies');
    else if (a === 'series') navigate('/series');
    else if (a === 'search') (window as any).openTiviSearch?.();
    else if (a === 'ask') {
      // Ask Vee → drop straight into the compose/speak surface.
      setComposing(true);
      setTimeout(() => inputRef.current?.focus(), 80);
      onSelect(a);
      return;
    }
    onSelect(a);
  };

  const trans = (delay = 0) =>
    reduced.current
      ? 'opacity 0.18s linear'
      : `opacity 0.42s cubic-bezier(0.23,1,0.32,1) ${delay}s, transform 0.5s cubic-bezier(0.34,1.4,0.64,1) ${delay}s`;

  // ── Chat-bubble hold → speak ────────────────────────────────────────────
  const bubbleHoldTimer = useRef<ReturnType<typeof setTimeout>>();
  const bubbleHeld = useRef(false);

  const onBubbleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    bubbleHeld.current = false;
    tap();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    bubbleHoldTimer.current = setTimeout(() => {
      bubbleHeld.current = true;
      startRecording();
    }, 340);
  };
  const onBubbleUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    clearTimeout(bubbleHoldTimer.current);
    // Quick tap (no hold) → open the text composer.
    if (!bubbleHeld.current && !isRecording) {
      setComposing((c) => !c);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const overlay = (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        // The veil: blur + dim the whole app behind Vee's space.
        background:
          'radial-gradient(120% 90% at 50% 18%, rgba(168,85,247,0.20), rgba(10,8,20,0.78) 60%, rgba(6,4,12,0.92))',
        backdropFilter: reduced.current ? 'blur(8px)' : `blur(${alive ? 26 : 20}px) saturate(1.15)`,
        WebkitBackdropFilter: reduced.current ? 'blur(8px)' : `blur(${alive ? 26 : 20}px) saturate(1.15)`,
        opacity: mounted ? 1 : 0,
        transition: reduced.current
          ? 'opacity 0.18s linear'
          : 'opacity 0.4s ease, backdrop-filter 0.6s ease, -webkit-backdrop-filter 0.6s ease',
        paddingTop: 'max(env(safe-area-inset-top), 18px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 22px)',
        touchAction: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes vee-aura-drift {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: 0.55; }
          50%     { transform: translate3d(0,-2%,0) scale(1.08); opacity: 0.85; }
        }
        @keyframes vee-aura-alive {
          0%,100% { transform: translate3d(0,0,0) scale(1.02); opacity: 0.8; }
          50%     { transform: translate3d(0,-3%,0) scale(1.16); opacity: 1; }
        }
        @keyframes vee-core-breathe {
          0%,100% { transform: scale(1); box-shadow: 0 8px 40px rgba(168,85,247,0.45), 0 0 60px rgba(255,107,157,0.22); }
          50%     { transform: scale(1.05); box-shadow: 0 12px 60px rgba(59,130,246,0.42), 0 0 80px rgba(168,85,247,0.42); }
        }
        @keyframes vee-bar {
          0%,100% { transform: scaleY(0.35); }
          50%     { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vee-anim { animation: none !important; }
        }
      `}</style>

      {/* Living aura — the glow that pulses/flows harder while speaking/typing. */}
      <div
        aria-hidden
        className="vee-anim"
        style={{
          position: 'absolute',
          top: '-12%',
          left: '50%',
          width: '140vw',
          height: '70vh',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(circle at 50% 40%, rgba(255,138,208,0.30), rgba(168,85,247,0.22) 40%, rgba(59,130,246,0.14) 65%, transparent 78%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          animation: reduced.current
            ? 'none'
            : `${alive ? 'vee-aura-alive' : 'vee-aura-drift'} ${alive ? '3.2s' : '7s'} ease-in-out infinite`,
        }}
      />

      {/* ── Option pills float in (top) ───────────────────────────────── */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
          maxWidth: 360,
          padding: '4px 18px 0',
        }}
      >
        {PILLS.map((p, i) => {
          const Icon = p.icon;
          const hero = p.key === 'ask';
          return (
            <button
              key={p.key}
              onClick={(e) => { e.stopPropagation(); dispatch(p.key); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 38,
                padding: '0 16px',
                borderRadius: 999,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.96)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.01em',
                fontFamily: "'Outfit','Inter',system-ui,sans-serif",
                border: hero
                  ? '1px solid rgba(255,138,208,0.5)'
                  : '1px solid rgba(255,255,255,0.16)',
                background: hero
                  ? 'linear-gradient(120deg, rgba(255,138,208,0.9), rgba(168,85,247,0.85) 52%, rgba(59,130,246,0.85))'
                  : 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: hero
                  ? '0 8px 26px rgba(168,85,247,0.5), inset 0 1px 1px rgba(255,255,255,0.4)'
                  : '0 6px 18px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.16)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(0.92)',
                transition: trans(0.06 + i * 0.05),
              }}
            >
              <Icon size={15} color="rgba(255,255,255,0.96)" strokeWidth={1.9} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Vee's canvas (centre) ─────────────────────────────────────── */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '0 24px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.96)',
          transition: trans(0.14),
        }}
      >
        {/* Vee presence — soft iridescent core */}
        <div
          className="vee-anim"
          aria-hidden
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 36% 30%, #FF8AD0, #A855F7 52%, #3B82F6)',
            animation: reduced.current ? 'none' : 'vee-core-breathe 4.2s ease-in-out infinite',
          }}
        />

        {!isRecording ? (
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                color: 'rgba(255,255,255,0.96)',
                fontSize: 19,
                fontWeight: 600,
                lineHeight: 1.3,
                fontFamily: "'Outfit','Inter',system-ui,sans-serif",
                margin: 0,
              }}
            >
              Hey, I&apos;m Vee.
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13.5,
                lineHeight: 1.5,
                margin: '8px 0 0',
                maxWidth: 280,
              }}
            >
              This is our space. Hold the bubble below to talk, or tap to type —
              I&apos;ll share picks, links and replies here.
            </p>

            {/* Message-canvas container — ready, intentionally empty (no fake data). */}
            <div
              style={{
                marginTop: 20,
                minHeight: 56,
                borderRadius: 18,
                border: '1px dashed rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 18px',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.34)', fontSize: 12, letterSpacing: '0.02em' }}>
                Vee&apos;s messages will appear here
              </span>
            </div>
          </div>
        ) : (
          // Listening state — waveform + live transcript (DynamicIsland recipe).
          <div style={{ textAlign: 'center', width: '100%' }} onPointerDown={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 44 }}>
              {waveformLevels.map((level, i) => (
                <div
                  key={i}
                  className="vee-anim"
                  style={{
                    width: 5,
                    height: 44,
                    borderRadius: 999,
                    transformOrigin: 'center',
                    transform: `scaleY(${Math.max(0.18, level)})`,
                    background:
                      'linear-gradient(180deg, #FF8AD0, #A855F7 55%, #3B82F6)',
                    transition: 'transform 0.08s linear',
                    animation: reduced.current ? 'none' : `vee-bar 1.1s ease-in-out ${i * 0.09}s infinite`,
                  }}
                />
              ))}
            </div>
            <p
              style={{
                marginTop: 14,
                color: 'rgba(255,255,255,0.9)',
                fontSize: 14,
                minHeight: 20,
                lineHeight: 1.4,
                padding: '0 12px',
              }}
            >
              {transcript || 'Listening…'}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom: text composer + textured chat-bubble pill ─────────── */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '0 22px',
        }}
      >
        {(composing && !isRecording) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              opacity: mounted ? 1 : 0,
              transition: trans(0),
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && text.trim()) {
                  setText('');
                  setComposing(false);
                }
              }}
              placeholder="Tell Vee what you're after…"
              style={{
                flex: 1,
                height: 44,
                padding: '0 18px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                caretColor: '#FF8AD0',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
            />
          </div>
        )}

        {/* Textured chat-bubble pill — soft 3D, Vee gradient. Hold to speak. */}
        <button
          onPointerDown={onBubbleDown}
          onPointerUp={onBubbleUp}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Vee — tap to type, hold to speak"
          className="vee-anim"
          style={{
            width: 88,
            height: 46,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            touchAction: 'none',
            background: isRecording
              ? 'radial-gradient(circle at 50% 30%, #FF8AD0, #A855F7 50%, #3B82F6)'
              : 'radial-gradient(circle at 35% 28%, #FF8AD0, #A855F7 52%, #3B82F6)',
            // Physical-button texture: inner highlight + outer drop shadow,
            // matching the V pebble's `vee-breathe` treatment.
            boxShadow: isRecording
              ? '0 10px 30px rgba(168,85,247,0.65), 0 0 40px rgba(255,107,157,0.4), inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.3)'
              : '0 8px 22px rgba(168,85,247,0.5), 0 0 22px rgba(255,107,157,0.25), inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.3)',
            animation: reduced.current ? 'none' : 'vee-core-breathe 3.4s ease-in-out infinite',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: trans(0.2),
          }}
        />
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
