/**
 * DynamicIsland — iPhone-style notification pill, hoisted out of App.tsx.
 *
 * Sources notifications from three places, merged into one stream:
 *   1. Legacy `window.pushNotification(notif)` — any code can imperatively
 *      surface a notification. Kept for backwards compat with voyo's
 *      internal taste-graph / OYO triggers.
 *   2. Demo timers (track drop, friend activity, achievement) — fire on
 *      mount so the UI has something to show before backend events land.
 *   3. `useDashNotifications({ appCode, dashId })` — realtime Supabase
 *      stream from the cross-app `dash_notifications` table. Admin
 *      pushes from Hub, friend-message notifications, and any other
 *      ecosystem event lands here automatically.
 *
 * VISUAL LAW (founder-locked, 2026-06-25):
 *   - The resting pill is BLACK glass. It is 15% smaller than the old shape.
 *   - DASH purple (iridescent) appears ONLY while the pill is touched/pressed.
 *     There is NO automatic purple "wave flash" on arrival.
 *   - Appear = balloon inflation: bloom from nothing (scale 0 → overshoot →
 *     settle) with opacity in. Not a slide.
 *   - Retract = balloon deflation: a quick puff bigger, then collapse to
 *     nothing. Snappy and playful.
 *   - It is a moment, a cloud: appear → hold the beat → auto-deflate.
 *   - Tap → EXPAND IN PLACE (grows to reveal detail right there). No redirect,
 *     no notifications page. Swipe ←/→ navigate, swipe ↑ dismiss.
 *   - All motion is transform/opacity only, and is no-op'd under
 *     prefers-reduced-motion.
 *
 * The component is self-contained and reusable across voyo and Hub —
 * pass the appCode and dashId and it does the rest.
 */

import { useState, useEffect, useRef } from 'react';
import { useDashNotifications, type DashNotification } from '@/hooks/useDashNotifications';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

// Dynamic Island - iPhone-style notification pill
interface Notification {
  id: string;
  type: 'music' | 'message' | 'system' | 'admin';
  title: string;
  subtitle: string;
  read?: boolean;
  color?: string; // Custom color for friends
  url?: string;   // Optional deep link from dash_notifications
}

interface DynamicIslandProps {
  /** App code that this mount represents. Filters dash_notifications to
   * rows with app in ('all', appCode). Default: 'tivi'. */
  appCode?: 'voyo' | 'hub' | 'giraf' | 'tivi' | string;
  /** Current user's dash_id — enables target_user filtering. Optional. */
  dashId?: string | null;
  /** Guest mode — shows subscribe messaging instead of reply */
  guestMode?: boolean;
}

function typeForApp(app: string): Notification['type'] {
  if (app === 'hub' || app === 'all') return 'admin';
  return 'system';
}

function mapDashNotification(row: DashNotification): Notification {
  return {
    id: row.id,
    type: typeForApp(row.app),
    title: row.title,
    subtitle: row.body || '',
    url: row.url ?? undefined,
    read: row.read,
  };
}

const dotColor = (n?: Notification): string =>
  n?.color ? n.color :
  n?.type === 'music' ? '#a855f7' :
  n?.type === 'message' ? '#8b5cf6' :
  '#ef4444';

// Hold-the-beat before the cloud auto-deflates (ms). Preserves the prior
// "dark phase" dwell so the moment reads the same length as before.
const HOLD_MS = 3200;
// Deflation duration — must match the CSS keyframe below.
const DEFLATE_MS = 320;

export const DynamicIsland = ({ appCode = 'tivi', dashId: dashIdProp = null, guestMode = false }: DynamicIslandProps = {}) => {
  // Tivi+'s useAuth exposes access code + tier, not a dash_id — caller
  // should pass dashId explicitly when we wire identity later. Null =
  // broadcast-only view (correct default for the current access-code
  // tenancy model).
  const dashId = dashIdProp ?? null;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  // Balloon lifecycle: 'in' plays the inflation keyframe, 'shown' is the
  // settled hold, 'out' plays the deflation keyframe before unmount.
  const [lifecycle, setLifecycle] = useState<'in' | 'shown' | 'out'>('in');
  // pressed = the pill is being touched right now → purple skin.
  const [pressed, setPressed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showTapFeedback, setShowTapFeedback] = useState(false); // Tap-to-resurface dot
  // Collapsed swipe drag offset (px) for live finger-follow.
  const [drag, setDrag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const currentNotification = notifications[currentIndex];
  const unreadCount = notifications.filter(n => !n.read).length;

  const clearTimers = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (outTimerRef.current) clearTimeout(outTimerRef.current);
    holdTimerRef.current = null;
    outTimerRef.current = null;
  };

  // ── Realtime merge: pull dash_notifications from the Command Center
  // Supabase into the same in-memory notification list as the legacy
  // demo/pushNotification flow. Dedups by id so initial fetch + realtime
  // stream don't double-insert. ─────────────────────────────────────────
  const { notifications: dashRows, markRead: markDashRead } = useDashNotifications({
    appCode,
    dashId,
  });
  const seenRowIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (dashRows.length === 0) return;
    const fresh = dashRows.filter(r => !seenRowIdsRef.current.has(r.id));
    if (fresh.length === 0) return;
    fresh.forEach(r => seenRowIdsRef.current.add(r.id));
    // Newest-first in dashRows; append in reverse so the very newest ends
    // up at the end of our local list (matching pushNotification order
    // and auto-navigating `setCurrentIndex(newList.length - 1)`).
    const mapped = [...fresh].reverse().map(mapDashNotification);
    setNotifications(prev => {
      const filtered = mapped.filter(m => !prev.some(p => p.id === m.id));
      if (filtered.length === 0) return prev;
      const next = [...prev, ...filtered];
      setCurrentIndex(next.length - 1);
      return next;
    });
    surfaceNotification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashRows]);

  // When the user dismisses / marks a notification read locally, and it
  // originated from the realtime stream, also mark it read in the hook
  // so future re-renders keep that state.
  const handleMarkRead = (id: string) => {
    markDashRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  // Keep lint happy — referenced below via window? No, just for callers.
  void handleMarkRead;

  // Expose function to add notifications globally
  useEffect(() => {
    (window as any).pushNotification = (notif: Notification) => {
      setNotifications(prev => {
        const newList = [...prev, notif];
        // Navigate to the new notification (use callback to avoid stale closure)
        setCurrentIndex(newList.length - 1);
        return newList;
      });
      surfaceNotification();
    };

    // Demo: Tivi+ notifications
    const demo1 = setTimeout(() => {
      (window as any).pushNotification({
        id: '1',
        type: 'music',
        title: 'Tivi+',
        subtitle: 'Hand-picked. The World Cup is live.'
      });
    }, 2000);

    const demo2 = setTimeout(() => {
      (window as any).pushNotification({
        id: '2',
        type: 'message',
        title: 'Live Now',
        subtitle: 'Champions League on beIN Sports'
      });
    }, 10000);

    const demo3 = setTimeout(() => {
      (window as any).pushNotification({
        id: '3',
        type: 'system',
        title: 'DashTivi+',
        subtitle: 'StreamFlow optimized for your network'
      });
    }, 20000);

    return () => {
      clearTimeout(demo1);
      clearTimeout(demo2);
      clearTimeout(demo3);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guest mode notifications
  useEffect(() => {
    if (!guestMode) return;
    const t1 = setTimeout(() => {
      (window as any).pushNotification({
        id: 'guest-1', type: 'system', title: 'Guest Mode',
        subtitle: 'You are browsing as a guest'
      });
    }, 3000);
    const t2 = setTimeout(() => {
      (window as any).pushNotification({
        id: 'guest-2', type: 'message', title: 'Subscribe',
        subtitle: 'Unlock premium content'
      });
    }, 15000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [guestMode]);

  // ── Cloud lifecycle ────────────────────────────────────────────────────
  // surfaceNotification: bloom in (balloon), hold the beat, then auto-deflate.
  // No purple wave — the pill rises from the dark, BLACK, and stays black.
  const surfaceNotification = () => {
    clearTimers();
    setIsReplying(false);
    setIsExpanded(false);
    setDrag({ x: 0, y: 0 });
    setLifecycle('in');
    setIsVisible(true);

    // Let the inflation keyframe play, then settle, then hold, then deflate.
    holdTimerRef.current = setTimeout(() => {
      setLifecycle('shown');
      holdTimerRef.current = setTimeout(() => {
        retract();
      }, HOLD_MS);
    }, 360); // inflation keyframe length
  };

  // retract: balloon deflation, then unmount.
  const retract = () => {
    clearTimers();
    setLifecycle('out');
    outTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsExpanded(false);
      setIsReplying(false);
      setPressed(false);
      setLifecycle('in');
      setDrag({ x: 0, y: 0 });
    }, DEFLATE_MS);
  };

  // While expanded, the cloud holds open — no auto-deflate until the user acts.
  useEffect(() => {
    if (isExpanded) clearTimers();
  }, [isExpanded]);

  // Remove current notification from the queue (after a deflate).
  const dropCurrentAndAdvance = () => {
    setNotifications(prev => {
      const remaining = prev.filter((_, i) => i !== currentIndex);
      setCurrentIndex(ci => Math.min(ci, Math.max(0, remaining.length - 1)));
      // If queue still has items, resurface the next one after the deflate.
      if (remaining.length > 0) {
        setTimeout(() => surfaceNotification(), DEFLATE_MS + 60);
      }
      return remaining;
    });
  };

  // Dismiss current notification → deflate, then drop it.
  const dismissCurrent = () => {
    retract();
    setTimeout(() => dropCurrentAndAdvance(), DEFLATE_MS);
  };

  // ── Collapsed swipe — touch + pointer (touch for iOS reliability) ────────
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeActive = useRef(false);
  // Track drag delta via ref so onEnd always reads the latest value without
  // relying on stale closure state (critical on iOS where events batch differently).
  const dragRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const SWIPE = 24; // px — reduced so a 22px pill is actually swipeable

  const startGesture = (cx: number, cy: number) => {
    swipeStart.current = { x: cx, y: cy };
    swipeActive.current = true;
    setPressed(true);
    clearTimers();
  };

  const moveGesture = (cx: number, cy: number) => {
    if (!swipeActive.current || !swipeStart.current) return;
    const dx = cx - swipeStart.current.x;
    const dy = cy - swipeStart.current.y;
    dragRef.current = { x: dx, y: dy };
    setDrag({ x: dx, y: dy });
  };

  const endGesture = () => {
    setPressed(false);
    swipeActive.current = false;
    swipeStart.current = null;
    const { x, y } = dragRef.current;
    dragRef.current = { x: 0, y: 0 };

    if (y < -SWIPE && Math.abs(y) > Math.abs(x)) {
      setDrag({ x: 0, y: 0 });
      dismissCurrent();
      return;
    }
    if (Math.abs(x) > SWIPE && Math.abs(x) > Math.abs(y)) {
      if (x > 0 && currentIndex > 0) setCurrentIndex(currentIndex - 1);
      else if (x < 0 && currentIndex < notifications.length - 1) setCurrentIndex(currentIndex + 1);
      setDrag({ x: 0, y: 0 });
      restartHold();
      return;
    }
    setDrag({ x: 0, y: 0 });
    if (Math.abs(x) < 8 && Math.abs(y) < 8) handleTap();
    else restartHold();
  };

  const cancelGesture = () => {
    setPressed(false);
    swipeActive.current = false;
    swipeStart.current = null;
    dragRef.current = { x: 0, y: 0 };
    setDrag({ x: 0, y: 0 });
    restartHold();
  };

  // Touch handlers (iOS-reliable)
  const onCollapsedTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startGesture(t.clientX, t.clientY);
  };
  const onCollapsedTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    moveGesture(t.clientX, t.clientY);
  };
  const onCollapsedTouchEnd = () => endGesture();

  // Pointer handlers (desktop fallback)
  const onCollapsedPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // handled by touch events
    startGesture(e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onCollapsedPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    moveGesture(e.clientX, e.clientY);
  };
  const onCollapsedPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    endGesture();
  };
  const onCollapsedPointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    cancelGesture();
  };

  // Re-arm the auto-deflate hold (used after a swipe that didn't dismiss).
  const restartHold = () => {
    if (isExpanded) return;
    clearTimers();
    setLifecycle('shown');
    holdTimerRef.current = setTimeout(() => retract(), HOLD_MS);
  };

  // ── Tap → expand IN PLACE (self-contained, no navigation) ───────────────
  const handleTap = () => {
    clearTimers();
    if (!isExpanded) {
      setIsExpanded(true); // grows to reveal detail right here
    } else {
      setIsExpanded(false);
      restartHold();
    }
  };

  // Manual resurface - tap header dot when notifications exist but not visible
  const handleResurface = () => {
    if (notifications.length > 0 && !isVisible) {
      surfaceNotification();
    }
  };

  const handleAction = (action: string) => {
    devLog(`Action: ${action} for ${currentNotification?.title}`);
    dismissCurrent();
  };

  const handleReplyMode = () => {
    setIsReplying(true);
    clearTimers();
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 200);
  };

  const [isSending, setIsSending] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([0.3, 0.3, 0.3, 0.3, 0.3]);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio context for waveform
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;

      // Animate waveform
      const updateWaveform = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const levels = Array.from(data.slice(0, 5)).map(v => Math.max(0.2, v / 255));
          setWaveformLevels(levels);
        }
        animationRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      // Setup speech recognition for transcript
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();

      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
      setIsVoiceMode(false);
      setCountdown(null);
    }
  };

  const stopRecording = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setWaveformLevels([0.3, 0.3, 0.3, 0.3, 0.3]);
  };

  // Cleanup recording resources on unmount (prevents memory leak)
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // Ignore errors during cleanup
        }
      }
      try {
        if (recognitionRef.current) recognitionRef.current.stop();
      } catch {
        // Recognition may already be stopped
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
        } catch {
          // MediaRecorder may already be stopped
        }
      }
    };
  }, []);

  const handleVoiceTap = () => {
    // Tap on wavy box triggers voice mode
    if (!isVoiceMode && !isRecording && countdown === null) {
      setIsVoiceMode(true);
      setTranscript('');
      setCountdown(3);
      setTimeout(() => setCountdown(2), 1000);
      setTimeout(() => setCountdown(1), 2000);
      setTimeout(() => {
        setCountdown(null);
        startRecording();
      }, 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplyText(e.target.value);
    // Typing cancels voice mode
    if (isVoiceMode || isRecording || countdown !== null) {
      stopRecording();
      setIsVoiceMode(false);
      setIsRecording(false);
      setCountdown(null);
    }
  };

  const handleSendReply = () => {
    if (replyText.trim() || isRecording) {
      const replyData = {
        type: isRecording ? 'voice' : 'text',
        content: replyText || '[voice note]',
        transcript: isRecording ? transcript : null, // Include transcript for voice
      };
      devLog(`Reply to ${currentNotification?.title}:`, replyData);

      stopRecording();
      setIsSending(true);

      setTimeout(() => {
        setReplyText('');
        setTranscript('');
        setIsReplying(false);
        setIsSending(false);
        setIsVoiceMode(false);
        setIsRecording(false);
        setCountdown(null);
        dismissCurrent();
      }, 500);
    }
  };

  // When not visible but has notifications:
  // Tap banner → dot appears pulsing → click dot to open → no click = fades
  const fadeTimerForDot = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBannerTap = () => {
    if (!showTapFeedback) {
      setShowTapFeedback(true);
      if (fadeTimerForDot.current) clearTimeout(fadeTimerForDot.current);
      fadeTimerForDot.current = setTimeout(() => {
        setShowTapFeedback(false);
      }, 3000);
    }
  };

  const handleDotClick = () => {
    if (fadeTimerForDot.current) clearTimeout(fadeTimerForDot.current);
    setShowTapFeedback(false);
    handleResurface();
  };

  if (!isVisible && notifications.length > 0) {
    // Two states: no dot visible (tap to show), dot visible (tap dot to open)
    if (!showTapFeedback) {
      // Empty banner - tap anywhere to show dot
      return (
        <div
          className="cursor-pointer flex-1 h-8 flex items-center justify-center"
          onClick={handleBannerTap}
          style={{ minWidth: 120 }}
        />
      );
    }
    // Dot visible - tap dot to open notification
    return (
      <div
        className="cursor-pointer flex-1 h-8 flex items-center justify-center"
        style={{ minWidth: 120 }}
        onClick={handleDotClick}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: dotColor(notifications[0]) }}
        />
      </div>
    );
  }

  if (!isVisible || notifications.length === 0) return null;

  // Collapsed pill geometry — 15% smaller than the old dark shape
  // (old dark: w165 h26 pad14 → new: w140 h22 pad12).
  const COLLAPSED_W = 140;
  const COLLAPSED_H = 22;

  // Animation class for the balloon lifecycle (transform/opacity only).
  const lifecycleClass =
    lifecycle === 'in' ? 'di-inflate' :
    lifecycle === 'out' ? 'di-deflate' : '';

  // Live drag transform on the collapsed pill (finger-follow).
  const dragTransform =
    drag.x !== 0 || drag.y !== 0
      ? `translate(${drag.x * 0.4}px, ${Math.min(0, drag.y) * 0.4}px)`
      : undefined;

  return (
    <div className="z-20">
      <style>{`
        @keyframes di-inflate {
          0%   { transform: scale(0.2); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          80%  { transform: scale(0.98); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes di-deflate {
          0%   { transform: scale(1); opacity: 1; }
          35%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(0.1); opacity: 0; }
        }
        .di-inflate { animation: di-inflate 360ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .di-deflate { animation: di-deflate 320ms cubic-bezier(0.5,0,0.75,0) both; }
        .di-root { transform-origin: top center; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) {
          .di-inflate, .di-deflate { animation: none !important; }
          .di-inflate { opacity: 1; }
          .di-deflate { opacity: 0; }
          .di-pill, .di-pressed { transition: none !important; }
        }
      `}</style>

      <div className={`di-root ${lifecycleClass}`}>
        {!isExpanded ? (
          // ── COLLAPSED — black glass at rest, purple ONLY while pressed ──
          <div
            key="collapsed"
            className="cursor-pointer select-none touch-none"
            style={{ transform: dragTransform, transition: dragTransform ? 'none' : 'transform 220ms cubic-bezier(0.34,1.56,0.64,1)' }}
            onTouchStart={onCollapsedTouchStart}
            onTouchMove={onCollapsedTouchMove}
            onTouchEnd={onCollapsedTouchEnd}
            onPointerDown={onCollapsedPointerDown}
            onPointerMove={onCollapsedPointerMove}
            onPointerUp={onCollapsedPointerUp}
            onPointerCancel={onCollapsedPointerCancel}
          >
            <div
              className="di-pill relative flex items-center gap-2 backdrop-blur-md border rounded-full overflow-hidden"
              style={{
                width: COLLAPSED_W,
                height: COLLAPSED_H,
                paddingLeft: 12,
                paddingRight: 12,
                transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                background: pressed
                  ? 'linear-gradient(110deg, #5b21b6 0%, #7c3aed 35%, #a78bfa 55%, #7c3aed 75%, #5b21b6 100%)'
                  : 'rgba(0,0,0,0.55)',
                borderColor: pressed ? 'rgba(216,180,254,0.55)' : 'rgba(255,255,255,0.10)',
                boxShadow: pressed ? '0 0 18px rgba(139,92,246,0.45)' : 'none',
              }}
            >
              {/* Type dot — turns white over the purple pressed skin */}
              <span
                className="relative z-10 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: pressed ? '#fff' : dotColor(currentNotification) }}
              />

              {/* Preview text */}
              <span
                className={`relative z-10 text-[10px] truncate lowercase ${
                  pressed ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                {currentNotification?.subtitle}
              </span>

              {/* Unread indicator */}
              {unreadCount > 1 && (
                <span
                  className={`relative z-10 text-[9px] flex-shrink-0 ${
                    pressed ? 'text-white/90' : 'text-white/30'
                  }`}
                >
                  +{unreadCount - 1}
                </span>
              )}
            </div>
          </div>
        ) : (
          // ── EXPANDED IN PLACE — grows to reveal detail, self-contained ──
          <div key="expanded" className="cursor-default">
            <div
              className="di-pressed relative backdrop-blur-md rounded-2xl shadow-xl border overflow-hidden"
              style={{
                width: isSending ? 200 : (isReplying ? 300 : 264),
                opacity: isSending ? 0 : 1,
                transition: 'width 260ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease',
                backgroundColor: isReplying ? 'rgba(20,8,40,0.9)' : 'rgba(255,255,255,0.96)',
                borderColor: isReplying ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.2)',
              }}
            >
              {/* Iridescent purple bed under reply mode (touch = purple) */}
              {isReplying && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, #4c1d95 0%, #7c3aed 35%, #8b5cf6 55%, #a78bfa 75%, #4c1d95 100%)',
                    opacity: 0.85,
                  }}
                />
              )}

              {/* Navigation dots */}
              {notifications.length > 1 && !isReplying && (
                <div className="flex justify-center gap-1 pt-2">
                  {notifications.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${i === currentIndex ? 'bg-black/60' : 'bg-black/20'}`}
                    />
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 p-3">
                {!isReplying ? (
                  // Normal expanded view — tap header to collapse
                  <div className="flex items-center gap-3">
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={(e) => { e.stopPropagation(); handleTap(); }}
                    >
                      <p className="text-xs font-semibold text-black truncate">
                        {currentNotification?.title}
                      </p>
                      <p className="text-[10px] text-black/60 truncate">
                        {currentNotification?.subtitle}
                      </p>
                    </button>

                    {currentNotification?.type === 'music' ? (
                      <div className="flex gap-1.5">
                        <button
                          className="px-2.5 py-1 rounded-full bg-black/10 text-[10px] font-medium text-black/70"
                          onClick={(e) => { e.stopPropagation(); handleAction('queue'); }}
                        >
                          +Bucket
                        </button>
                        <button
                          className="px-2 py-1 rounded-full bg-black/10 text-[10px] font-medium text-black/70"
                          onClick={(e) => { e.stopPropagation(); handleAction('like'); }}
                        >
                          ♡
                        </button>
                      </div>
                    ) : currentNotification?.type === 'message' ? (
                      <button
                        className="px-2.5 py-1 rounded-full bg-green-500/20 text-[10px] font-medium text-green-600"
                        onClick={(e) => { e.stopPropagation(); guestMode ? window.open('https://wa.me/224611361300?text=Hi%20DASH%2C%20I%20want%20a%20Tivi%2B%20code', '_blank') : handleReplyMode(); }}
                      >
                        {guestMode ? 'Go' : 'Reply'}
                      </button>
                    ) : (
                      <button
                        className="px-2.5 py-1 rounded-full bg-black/10 text-[10px] font-medium text-black/70"
                        onClick={(e) => { e.stopPropagation(); handleAction('view'); }}
                      >
                        View
                      </button>
                    )}
                  </div>
                ) : (
                  // Reply mode - Type or Tap to Speak
                  <div
                    className="space-y-2"
                    style={{ opacity: isSending ? 0 : 1 }}
                    onClick={handleVoiceTap}
                  >
                    <p className="text-[10px] text-white/80 font-medium">→ {currentNotification?.title}</p>

                    {/* Countdown */}
                    {countdown !== null ? (
                      <div className="flex items-center justify-center py-2" key={countdown}>
                        <span className="text-2xl font-bold text-white">{countdown}</span>
                      </div>
                    ) : isRecording ? (
                      /* Recording with waveform */
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 py-2">
                          {waveformLevels.map((_, i) => (
                            <div key={i} className="w-1 bg-purple-400 rounded-full" style={{ height: 6 + waveformLevels[i] * 18 }} />
                          ))}
                        </div>
                        {transcript && (
                          <p className="text-[10px] text-white/50 text-center truncate px-2">{transcript}</p>
                        )}
                        <button
                          className="w-full py-2 rounded-full bg-purple-500 flex items-center justify-center gap-2"
                          onClick={handleSendReply}
                        >
                          <span className="text-white text-xs">Send</span>
                          <span className="text-white text-sm">↑</span>
                        </button>
                      </div>
                    ) : (
                      /* Type or Tap to Speak */
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={replyInputRef}
                            type="text"
                            value={replyText}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                            placeholder="Type..."
                            className="flex-1 px-4 py-2 rounded-full bg-white/10 border-0 text-white text-[12px] placeholder:text-white/40 focus:outline-none"
                            style={{ caretColor: '#f0abfc' }}
                          />
                          {replyText.trim() && (
                            <button
                              className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center"
                              onClick={handleSendReply}
                            >
                              <span className="text-white text-sm">↑</span>
                            </button>
                          )}
                        </div>
                        {!replyText.trim() && (
                          <p className="text-[10px] text-white/40 text-center">Tap to Speak</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Collapse handle — tap to shrink back to the pill */}
              {!isReplying && (
                <button
                  className="w-full pb-2 flex justify-center"
                  onClick={(e) => { e.stopPropagation(); handleTap(); }}
                  aria-label="Collapse"
                >
                  <div className="w-8 h-0.5 bg-black/20 rounded-full" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
