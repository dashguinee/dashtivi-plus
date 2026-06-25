import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Tv, Film, MonitorPlay, Sparkles, Search } from 'lucide-react';
import { tap } from '@/lib/haptics';

/**
 * VeeCanvas — the founder's FINAL hold experience.
 *
 * THE MODEL (founder, verbatim intent):
 *   Hold the V → the whole bottom NAV BAR contracts ~15% INTO the chat/voice
 *   pill, staying in the SAME bottom position (it doesn't fly to center — the
 *   bar *becomes* Vee). The rest of the page BLURS + DIMS behind it, like a
 *   window opening over a paused frame. Tap the blurred gap (anywhere outside)
 *   → the bar morphs back / un-pauses. A pause, a moment.
 *
 * Built on VOYO's OYO pattern (replicated, not imported — different repo):
 *   - The orb IS Vee (breathing AI presence), wearing DASH/Vee's
 *     pink→violet→blue skin instead of OYO's bronze.
 *   - The conversation is the canvas — turns float ABOVE the orb, older turns
 *     fade up into the dream (MAX_VISIBLE = 5).
 *   - The invocation is the hold; the textured chat-bubble pill anchors the
 *     bottom — HOLD it → speak, and the backdrop comes ALIVE (pulses).
 *
 * Plumbing kept from the prior overlay:
 *   - createPortal(document.body) so it escapes the Navbar stacking context
 *     (z 10000, above the search pebble 9996 / island 9997).
 *   - Speech engine (getUserMedia + webkitSpeechRecognition + waveform).
 *   - Option pills, touch-to-close, pointer-capture hold + tap-to-type.
 */

export type VeeAction = 'live' | 'movies' | 'series' | 'ask' | 'search';

const PILLS: { key: VeeAction; icon: React.FC<any>; label: string }[] = [
  { key: 'live', icon: Tv, label: 'Live' },
  { key: 'movies', icon: Film, label: 'Movies' },
  { key: 'series', icon: MonitorPlay, label: 'Series' },
  { key: 'ask', icon: Sparkles, label: 'Ask Vee' },
  { key: 'search', icon: Search, label: 'Search' },
];

type Turn = { id: string; role: 'vee' | 'user'; text: string };
const MAX_VISIBLE = 5;
const makeId = () => `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

  // ── Conversation (OYO-style turn stream) ────────────────────────────────
  const [turns, setTurns] = useState<Turn[]>([]);

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

  // Mount/animate-in cycle — rAF so the morph/fade has a frame to run.
  useEffect(() => {
    if (active) {
      // Seed the conversation with Vee's greeting (only once per invocation).
      setTurns([{ id: makeId(), role: 'vee', text: "Hey, I'm Vee. What are we watching?" }]);
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

  // When recording ends with a transcript, fold it into the conversation.
  const commitTranscript = useCallback(() => {
    const said = transcript.trim();
    stopRecording();
    if (said) {
      setTurns((prev) => [
        ...prev,
        { id: makeId(), role: 'user', text: said },
        { id: makeId(), role: 'vee', text: "Got it — let me pull that up." },
      ]);
    }
    setTranscript('');
  }, [transcript, stopRecording]);

  const commitText = useCallback(() => {
    const said = text.trim();
    if (!said) return;
    setTurns((prev) => [
      ...prev,
      { id: makeId(), role: 'user', text: said },
      { id: makeId(), role: 'vee', text: "On it — give me a sec." },
    ]);
    setText('');
    setComposing(false);
  }, [text]);

  // Cleanup on unmount / when the canvas closes.
  useEffect(() => {
    if (!active) {
      stopRecording();
      setComposing(false);
      setText('');
      setTranscript('');
      setTurns([]);
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
      : `opacity 0.42s cubic-bezier(0.23,1,0.32,1) ${delay}s, transform 0.52s cubic-bezier(0.34,1.4,0.64,1) ${delay}s`;

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
    if (isRecording) {
      // Was speaking → release ends the utterance and folds it into the chat.
      commitTranscript();
      return;
    }
    // Quick tap (no hold) → open the text composer.
    if (!bubbleHeld.current) {
      setComposing((c) => !c);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  // Only the last MAX_VISIBLE turns render — keeps the DOM light (OYO rule).
  const visibleTurns = turns.slice(-MAX_VISIBLE);

  const overlay = (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        // BOTTOM-ANCHORED: everything stacks toward the nav-bar position. The
        // experience grows UP out of the bar, it never centers.
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        // The veil: blur + dim the whole app behind Vee's space ("paused frame").
        background:
          'radial-gradient(130% 80% at 50% 100%, rgba(168,85,247,0.22), rgba(10,8,20,0.74) 55%, rgba(6,4,12,0.90))',
        backdropFilter: reduced.current ? 'blur(8px)' : `blur(${alive ? 26 : 20}px) saturate(1.15)`,
        WebkitBackdropFilter: reduced.current ? 'blur(8px)' : `blur(${alive ? 26 : 20}px) saturate(1.15)`,
        opacity: mounted ? 1 : 0,
        transition: reduced.current
          ? 'opacity 0.18s linear'
          : 'opacity 0.4s ease, backdrop-filter 0.6s ease, -webkit-backdrop-filter 0.6s ease',
        paddingBottom: 'max(env(safe-area-inset-bottom), 18px)',
        touchAction: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes vee-aura-rise {
          0%,100% { transform: translate(-50%,0) scale(1); opacity: 0.5; }
          50%     { transform: translate(-50%,-3%) scale(1.06); opacity: 0.72; }
        }
        @keyframes vee-aura-alive {
          0%,100% { transform: translate(-50%,0) scale(1.04); opacity: 0.8; }
          50%     { transform: translate(-50%,-5%) scale(1.18); opacity: 1; }
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

      {/* Living aura — anchored at the BOTTOM (rises from the bar), pulses
          harder while speaking/typing. */}
      <div
        aria-hidden
        className="vee-anim"
        style={{
          position: 'absolute',
          bottom: '-6%',
          left: '50%',
          width: '150vw',
          height: '62vh',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(circle at 50% 75%, rgba(255,138,208,0.30), rgba(168,85,247,0.22) 40%, rgba(59,130,246,0.14) 65%, transparent 78%)',
          filter: 'blur(44px)',
          pointerEvents: 'none',
          animation: reduced.current
            ? 'none'
            : `${alive ? 'vee-aura-alive' : 'vee-aura-rise'} ${alive ? '3.2s' : '7s'} ease-in-out infinite`,
        }}
      />

      {/* ── Vee's canvas: conversation stream floating ABOVE the bar (OYO) ── */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          gap: 8,
          padding: '0 22px 10px',
          maxHeight: '52vh',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {isRecording ? (
          // Listening state — waveform + live transcript (DynamicIsland recipe).
          <div style={{ textAlign: 'center', width: '100%', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40 }}>
              {waveformLevels.map((level, i) => (
                <div
                  key={i}
                  className="vee-anim"
                  style={{
                    width: 5,
                    height: 40,
                    borderRadius: 999,
                    transformOrigin: 'center',
                    transform: `scaleY(${Math.max(0.18, level)})`,
                    background: 'linear-gradient(180deg, #FF8AD0, #A855F7 55%, #3B82F6)',
                    transition: 'transform 0.08s linear',
                    animation: reduced.current ? 'none' : `vee-bar 1.1s ease-in-out ${i * 0.09}s infinite`,
                  }}
                />
              ))}
            </div>
            <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.9)', fontSize: 14, minHeight: 20, lineHeight: 1.4 }}>
              {transcript || 'Listening…'}
            </p>
          </div>
        ) : (
          // OYO turn stream: Vee centered iridescent text, user right-aligned.
          // Older turns fade up into the dream.
          visibleTurns.map((t, idx) => {
            const fromTop = visibleTurns.length - 1 - idx;
            const opacity = Math.max(0.3, 1 - fromTop * 0.22);
            if (t.role === 'vee') {
              return (
                <div
                  key={t.id}
                  style={{
                    alignSelf: 'center',
                    textAlign: 'center',
                    maxWidth: '90%',
                    fontFamily: "'Outfit','Inter',system-ui,sans-serif",
                    fontSize: 17,
                    fontWeight: 500,
                    lineHeight: 1.35,
                    color: '#fdeaf7',
                    textShadow:
                      '0 0 22px rgba(168,85,247,0.5), 0 0 8px rgba(255,138,208,0.4), 0 1px 2px rgba(0,0,0,0.6)',
                    opacity,
                    transition: 'opacity 480ms ease-out',
                    pointerEvents: 'auto',
                  }}
                >
                  {t.text}
                </div>
              );
            }
            return (
              <div
                key={t.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '80%',
                  textAlign: 'right',
                  fontFamily: "'Outfit','Inter',system-ui,sans-serif",
                  fontSize: 14.5,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.84)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  opacity,
                  transition: 'opacity 480ms ease-out',
                  pointerEvents: 'auto',
                }}
              >
                {t.text}
              </div>
            );
          })
        )}
      </div>

      {/* ── Option pills float UP from the bottom bar ───────────────────── */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 9,
          justifyContent: 'center',
          maxWidth: 380,
          padding: '0 18px 12px',
        }}
      >
        {PILLS.map((p, i) => {
          const Icon = p.icon;
          const hero = p.key === 'ask';
          // Stagger rises bottom-up: last pill leads (closest to the bar).
          const rank = PILLS.length - 1 - i;
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
                transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)',
                transition: trans(0.06 + rank * 0.05),
              }}
            >
              <Icon size={15} color="rgba(255,255,255,0.96)" strokeWidth={1.9} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── The morphed nav-bar: contracts INTO the Vee pill (same position) ─
          The bottom bar of the page is where the experience lives. It's the
          orb (Vee, breathing) + an OYO-style input row. The whole thing reads
          as the nav-bar having collapsed ~15% into the chat/voice surface. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 3,
          width: '100%',
          maxWidth: 'calc(28rem - 0px)', // ~max-w-md, matches the real nav bar
          margin: '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          // Glass bar — same language as Navbar's pill, contracted.
          background:
            'linear-gradient(135deg, rgba(157,78,221,0.10) 0%, rgba(10,8,18,0.66) 50%, rgba(157,78,221,0.08) 100%)',
          border: '1px solid rgba(168,85,247,0.30)',
          borderRadius: 22,
          backdropFilter: 'blur(18px) saturate(150%)',
          WebkitBackdropFilter: 'blur(18px) saturate(150%)',
          boxShadow: alive
            ? '0 10px 40px rgba(168,85,247,0.35), 0 0 50px rgba(255,107,157,0.18), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 8px 30px rgba(0,0,0,0.5), 0 0 24px rgba(157,78,221,0.10), inset 0 1px 0 rgba(255,255,255,0.06)',
          padding: composing && !isRecording ? '8px 8px 8px 14px' : '10px 12px',
          transition: reduced.current
            ? 'opacity 0.18s linear'
            : 'box-shadow 0.5s ease, padding 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.34,1.4,0.64,1), opacity 0.42s ease',
          // The morph: the bar lifts in from the nav position (15% contract feel
          // = it starts slightly larger/lower and settles).
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(22px) scale(1.05)',
        }}
      >
        {/* The ORB — Vee herself, breathing. Hold to speak (invocation). */}
        <button
          onPointerDown={onBubbleDown}
          onPointerUp={onBubbleUp}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Vee — tap to type, hold to speak"
          className="vee-anim"
          style={{
            flexShrink: 0,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'none',
            background: 'radial-gradient(circle at 35% 28%, #FF8AD0, #A855F7 52%, #3B82F6)',
            // Physical-button texture: inner highlight + outer drop shadow.
            boxShadow: isRecording
              ? '0 10px 30px rgba(168,85,247,0.65), 0 0 40px rgba(255,107,157,0.4), inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.3)'
              : '0 8px 22px rgba(168,85,247,0.5), 0 0 22px rgba(255,107,157,0.25), inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.3)',
            animation: reduced.current ? 'none' : 'vee-core-breathe 3.4s ease-in-out infinite',
            transition: 'box-shadow 0.3s ease',
          }}
        />

        {/* Composer / prompt — the OYO input row, anchored in the bar. */}
        {composing && !isRecording ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitText(); }}
            placeholder="Tell Vee what you're after…"
            style={{
              flex: 1,
              height: 40,
              minWidth: 0,
              padding: '0 16px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: 14,
              fontFamily: "'Outfit','Inter',system-ui,sans-serif",
              outline: 'none',
              caretColor: '#FF8AD0',
            }}
          />
        ) : (
          <span
            onPointerDown={(e) => {
              e.stopPropagation();
              setComposing(true);
              setTimeout(() => inputRef.current?.focus(), 60);
            }}
            style={{
              flex: 1,
              color: isRecording ? 'rgba(255,138,208,0.95)' : 'rgba(255,255,255,0.5)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Outfit','Inter',system-ui,sans-serif",
              cursor: 'text',
              transition: 'color 0.3s ease',
            }}
          >
            {isRecording ? 'Listening…' : 'Hold the orb to talk · tap to type'}
          </span>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
