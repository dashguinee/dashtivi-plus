import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createHlsPlayer, type HlsInstance } from '@/lib/hls';
import { useSwipeSurf } from '@/hooks/useSwipeSurf';

/* ════════════════════════════════════════════════════════════════
   FREE-HLS SHOWCASE CARD — the "alive gift".

   A landscape card with a neon-green glow + a calm "FREE" tag that
   AUTO-PLAYS its live HLS stream ONLY when it is the focused/centered
   card. Non-focused = a calm poster on the green-glow card.

   Salvaged from the retired StreamMore visor: a singleton FocusRegistry
   + IntersectionObserver guarantee EXACTLY ONE live <video> across the
   whole home feed (the concurrency guarantee). hls instances tear down
   on blur and on unmount.

   GATING is the caller's job — these are only rendered for free/guest
   members; premium members never see them.
   ════════════════════════════════════════════════════════════════ */

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'; // DASH / Giraf signature
const GREEN = '#22C55E';
// Cinema / Hollywood free gems wear a 21st-century GOLD instead of the
// universal green — "Made in Hollywood" et al read as movie magic, not sports.
const GOLD = '#FFC927';

/** Derive a card's signature accent. Cinema/movie gems → gold; rest → green. */
function accentFor(ch: { name: string; district?: string }): string {
  if (/hollywood|movie|cinema|cinéma|film/i.test(ch.name)) return GOLD;
  if (ch.district && /movie|cinema|cinéma|film/i.test(ch.district)) return GOLD;
  return GREEN;
}

export interface FreeHlsChannel {
  id: string;
  name: string;
  url: string;
  logo: string;
  district: string;
  note?: string;
}

/* ─────────────────────────────────────────────────────────────
   Focus registry — guarantees exactly ONE focused <video> across
   the whole home. In-view (>=55%) cards "claim"; the one nearest
   viewport-center wins, the rest go calm. rAF-throttled.
   ───────────────────────────────────────────────────────────── */
type FocusSetter = (focused: boolean) => void;

class FocusRegistry {
  private members = new Map<HTMLElement, FocusSetter>();
  private current: HTMLElement | null = null;
  private priority = new Set<HTMLElement>(); // cards that hold the slot while on-screen
  private raf = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.schedule, { passive: true });
      window.addEventListener('resize', this.schedule, { passive: true });
    }
  }

  claim(el: HTMLElement, setter: FocusSetter, priority = false) {
    this.members.set(el, setter);
    if (priority) this.priority.add(el); else this.priority.delete(el);
    this.schedule();
  }

  release(el: HTMLElement) {
    if (this.members.has(el)) {
      this.members.get(el)?.(false);
      this.members.delete(el);
      this.priority.delete(el);
      if (this.current === el) this.current = null;
      this.schedule();
    }
  }

  private schedule = () => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.evaluate(); });
  };

  private evaluate() {
    if (this.members.size === 0) { this.current = null; return; }
    const centerY = window.innerHeight / 2;
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    this.members.forEach((_setter, el) => {
      // A priority card (the home hero) holds the live slot while it's on-screen;
      // other cards can only win once no priority card is in view. This stops the
      // hero from yielding/restarting as you scroll or toggle other videos.
      if (this.priority.size > 0 && !this.priority.has(el)) return;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const dist = Math.abs(mid - centerY);
      if (dist < bestDist) { bestDist = dist; best = el; }
    });
    if (best === this.current) return;
    if (this.current && this.members.has(this.current)) this.members.get(this.current)?.(false);
    this.current = best;
    if (best) this.members.get(best)?.(true);
  }
}

// Shared singleton — exported so OTHER live surfaces (e.g. the Movies
// exploration trailer cards) join the SAME registry. That keeps the
// "exactly ONE live surface at a time" guarantee spanning HLS cards AND
// auto-playing trailers across the whole home canvas (a playing trailer
// counts as THE one live surface, same as a live HLS card).
export const showcaseFocusRegistry = new FocusRegistry();
const registry = showcaseFocusRegistry;

/* ─────────────────────────────────────────────────────────────
   The card — landscape (16:9), neon-green glow.
   FOCUSED (nearest viewport-center & >=55% in view) → live HLS.
   Otherwise → calm logo poster on the green glow.
   ───────────────────────────────────────────────────────────── */
export function FreeHlsShowcaseCard({
  channel,
  onSurf,
  priority = false,
}: {
  channel: FreeHlsChannel;
  /** Optional new-era remote — swipe the visor to surf to the prev/next free
   *  channel in the pool. Absent → the card behaves exactly as before. */
  onSurf?: (dir: 1 | -1) => void;
  /** Home hero — holds the live slot while on-screen (won't yield to scroll). */
  priority?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);

  // Swipe-surf the visor. The video has onClick → fullscreen, but the hook
  // tracks horizontal drags and only fires past threshold, so a quick tap
  // still reaches fullscreen while a swipe surfs. data-no-surf is NOT set on
  // the video (we WANT the swipe there); short taps fall through to onClick.
  const surfHandlers = useSwipeSurf({
    enabled: !!onSurf,
    onPrev: onSurf ? () => onSurf(-1) : undefined,
    onNext: onSurf ? () => onSurf(1) : undefined,
  });

  const [focused, setFocused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // IntersectionObserver → claim/release into the singleton registry.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        const visible = e.isIntersecting && e.intersectionRatio >= 0.55;
        if (visible) registry.claim(el, setFocused, priority);
        else registry.release(el);
      },
      { threshold: [0, 0.55, 0.85, 1], rootMargin: '-6% 0px -6% 0px' }
    );
    io.observe(el);
    return () => { io.disconnect(); registry.release(el); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach / tear down HLS on focus change — only the focused card streams.
  useEffect(() => {
    let cancelled = false;
    if (focused && videoRef.current && !hlsRef.current) {
      setErrored(false);
      const v = videoRef.current;
      v.muted = true;
      createHlsPlayer(v, channel.url, undefined, () => { if (!cancelled) setErrored(true); })
        .then((inst) => {
          if (cancelled) { inst.destroy(); return; }
          hlsRef.current = inst;
          v.play().catch(() => { /* muted autoplay guard */ });
        })
        .catch(() => { if (!cancelled) setErrored(true); });
    }
    if (!focused && hlsRef.current) {
      try { videoRef.current?.pause(); } catch { /* noop */ }
      try { hlsRef.current.destroy(); } catch { /* noop */ }
      hlsRef.current = null;
      setPlaying(false);
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, channel.url]);

  // Hard teardown on unmount.
  useEffect(() => () => {
    try { hlsRef.current?.destroy(); } catch { /* noop */ }
    hlsRef.current = null;
  }, []);

  // Rotate-to-fullscreen on the focused card (tap the video).
  const goFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const anyV = v as any;
    if (v.requestFullscreen) v.requestFullscreen().catch(() => { anyV.webkitEnterFullscreen?.(); });
    else if (anyV.webkitEnterFullscreen) anyV.webkitEnterFullscreen();
    else if (anyV.webkitRequestFullscreen) anyV.webkitRequestFullscreen();
  }, []);

  const showLogo = !logoFailed && !!channel.logo;

  // Signature accent — gold for cinema gems, green otherwise. Drives the glow,
  // the wash, the seam, and (via CSS vars) the FREE pill + LIVE/warm dots.
  const accent = accentFor(channel);
  const accentRgb = ((hex: string) => {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return `${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)}`;
  })(accent);

  return (
    <div className="px-4">
      <div
        ref={cardRef}
        className="freehls-card relative w-full aspect-video rounded-2xl overflow-hidden"
        data-focused={focused ? 'true' : 'false'}
        onPointerDown={surfHandlers.onPointerDown}
        onPointerMove={surfHandlers.onPointerMove}
        onPointerUp={surfHandlers.onPointerUp}
        onPointerCancel={surfHandlers.onPointerCancel}
        style={{
          ['--freehls-accent' as string]: accent,
          ['--freehls-accent-rgb' as string]: accentRgb,
          boxShadow: focused
            ? `0 12px 44px ${accent}33, 0 0 0 1px ${accent}66`
            : `0 5px 22px ${accent}1f, 0 0 0 1px ${accent}2e`,
          transition: `transform 0.6s ${EASE}, box-shadow 0.6s ${EASE}, opacity 0.6s ${EASE}`,
          transform: focused ? 'scale(1)' : 'scale(0.975)',
          opacity: focused ? 1 : 0.9,
        }}
      >
        {/* accent wash (gold for cinema, green otherwise) */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(155deg, ${accent}2e 0%, ${accent}14 38%, rgba(6,12,8,0.97) 78%)` }} />
        {/* sweeping accent seam (only when on air) */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            padding: '1px',
            background: `linear-gradient(90deg, transparent 0%, ${accent}26 30%, ${accent}77 50%, ${accent}26 70%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: focused ? 'beam-sweep 4s ease-in-out infinite alternate' : 'none',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {focused && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: playing ? 1 : 0, transition: `opacity 0.7s ${EASE}` }}
            muted
            playsInline
            autoPlay
            onPlaying={() => setPlaying(true)}
            onClick={goFullscreen}
          />
        )}

        {/* Calm poster — logo on the green glow */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: focused && playing ? 0 : 1, transition: `opacity 0.7s ${EASE}`, pointerEvents: 'none' }}
        >
          {showLogo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="max-w-[52%] max-h-[40%] object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
              loading="lazy"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-white/85 text-[15px] font-bold tracking-tight px-6 text-center">{channel.name}</span>
          )}
        </div>

        {/* FREE tag — top-left, calm green pill */}
        <div className="absolute top-3 left-3">
          <span className="freehls-free-tag">
            <span className="freehls-free-dot" />
            FREE
          </span>
        </div>

        {/* warming / on-air / resting states — bottom-left */}
        {focused && !playing && !errored && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="freehls-warm-dot" />
            <span className="text-[10px] text-white/45 font-medium tracking-wide">warming up</span>
          </div>
        )}
        {focused && errored && (
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] text-white/35 font-medium">resting · scroll on</span>
          </div>
        )}
        {focused && playing && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <span className="freehls-live-dot" />
            <span className="text-[10px] font-bold tracking-widest text-white/90">LIVE</span>
          </div>
        )}

        {/* name strip — bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pt-8 pb-3 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(5,9,6,0.92) 0%, rgba(5,9,6,0.5) 55%, transparent 100%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white tracking-tight truncate">{channel.name}</span>
          </div>
          {channel.note && <p className="mt-0.5 text-[11px] text-white/50 leading-snug line-clamp-1">{channel.note}</p>}
        </div>
      </div>
    </div>
  );
}

export default FreeHlsShowcaseCard;
