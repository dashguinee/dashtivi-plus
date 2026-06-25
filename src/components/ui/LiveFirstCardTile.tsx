import React, { useEffect, useRef, useState } from 'react';
import { createHlsPlayer, type HlsInstance } from '@/lib/hls';

/* ════════════════════════════════════════════════════════════════
   LIVE FIRST-CARD TILE — the home "breathing" beat.

   The FIRST card (index 0) of an in-view ExperienceRow becomes a small
   LIVE mini-player: a muted, playsInline, object-cover <video> streaming
   that channel. The channel's LOGO is the POSTER until the stream paints
   (no blank/flash). It looks like the SAME card — same size, rounding,
   accent — just alive.

   PERFORMANCE GUARANTEES (critical):
   - An IntersectionObserver gates each tile: it only tries to go live when
     its row is >= ~40% in view; it tears down + pauses when it scrolls out.
   - A module-level concurrency cap (MAX_LIVE_TILES = 3) limits how many of
     these mini-players stream at once. If the cap is reached, an in-view
     tile WAITS (shows its logo poster) until a slot frees, then claims it.
     The home hero (FreeHlsShowcaseCard, priority) is a SEPARATE surface and
     is not counted here — so total simultaneous live <video>s on a phone
     stay sane (<= 3 mini-tiles + the 1 hero/trailer surface).
   - prefers-reduced-motion OR navigator.connection.saveData → never autoplay;
     the static logo tile renders instead.
   - hls.js is dynamically imported (only when a tile actually goes live) and
     torn down cleanly on blur / scroll-out / unmount (no leaked instances,
     all muted — no audio).
   ════════════════════════════════════════════════════════════════ */

// Hard cap: at most THIS many first-card mini-players stream simultaneously.
export const MAX_LIVE_TILES = 3;

/* ─────────────────────────────────────────────────────────────
   Live-slot registry — a tiny module-level counter + a waiter queue.
   In-view tiles request a slot; if under the cap they get it instantly,
   otherwise they wait FIFO until another tile releases. This is what keeps
   global concurrency at MAX_LIVE_TILES no matter how many rows are in view.
   ───────────────────────────────────────────────────────────── */
class LiveSlotRegistry {
  private active = new Set<symbol>();
  private waiters: { token: symbol; grant: () => void }[] = [];

  /** Try to take a slot now. Returns true if granted; otherwise queues `grant`. */
  request(token: symbol, grant: () => void): boolean {
    if (this.active.has(token)) return true;
    if (this.active.size < MAX_LIVE_TILES) {
      this.active.add(token);
      return true;
    }
    // No slot free — queue (dedupe) and wait for a release.
    if (!this.waiters.some((w) => w.token === token)) {
      this.waiters.push({ token, grant });
    }
    return false;
  }

  /** Release a slot (on blur / scroll-out / unmount); promotes the next waiter. */
  release(token: symbol): void {
    let changed = this.active.delete(token);
    // Drop it from the waiter queue too (it may have been waiting, not active).
    const before = this.waiters.length;
    this.waiters = this.waiters.filter((w) => w.token !== token);
    changed = changed || before !== this.waiters.length;
    if (changed) {
      while (this.active.size < MAX_LIVE_TILES && this.waiters.length > 0) {
        const next = this.waiters.shift()!;
        this.active.add(next.token);
        next.grant();
      }
    }
  }
}

const liveSlots = new LiveSlotRegistry();

/** True when we must NOT autoplay video (data-saver or reduced-motion). */
function liveTilesDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    const conn = (navigator as any).connection;
    if (conn?.saveData) return true;
  } catch { /* noop */ }
  return false;
}

/** Is this a real HLS (.m3u8) url? Direct/free gems are HLS; proxy /live is not. */
function isHlsUrl(url: string): boolean {
  return url.endsWith('.m3u8') || url.includes('.m3u8?');
}

export interface LiveFirstCardTileProps {
  /** Playback url, built EXACTLY like the row's play handler (proxy or direct). */
  url: string;
  /** Channel logo — shown as the poster until the stream paints. */
  logo?: string;
  /** Channel name (alt text / fallback). */
  name: string;
  /** Card geometry — must match the row's static card exactly. */
  width: number;
  height: number;
}

/**
 * The live mini-tile body. Rendered INSIDE the row's card frame, so it inherits
 * the card's exact size/rounding/accent. It overlays a <video> on top of the
 * logo poster; the poster fades only once the stream is actually painting.
 */
export const LiveFirstCardTile: React.FC<LiveFirstCardTileProps> = ({
  url,
  logo,
  name,
  width,
  height,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const tokenRef = useRef<symbol>(Symbol('live-tile'));

  // inView: the row is sufficiently visible. hasSlot: granted by the cap.
  const [inView, setInView] = useState(false);
  const [hasSlot, setHasSlot] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const disabled = liveTilesDisabled();
  // Only go live when allowed, the row is in view, AND the cap granted a slot.
  const live = !disabled && inView && hasSlot;

  // ── IntersectionObserver → in-view gate (>= 40% visible). ──
  useEffect(() => {
    if (disabled) return; // static tile only — never observe / never play.
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setInView(e.isIntersecting && e.intersectionRatio >= 0.4);
      },
      { threshold: [0, 0.4, 0.75, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [disabled]);

  // ── Concurrency cap → request / release a live slot as in-view changes. ──
  useEffect(() => {
    if (disabled) return;
    const token = tokenRef.current;
    if (inView) {
      // Try to claim now; if at the cap, get granted later when a slot frees.
      const granted = liveSlots.request(token, () => setHasSlot(true));
      setHasSlot(granted);
    } else {
      liveSlots.release(token);
      setHasSlot(false);
    }
    return () => {
      // On unmount, always free the slot (covers row remount / nav away).
      liveSlots.release(token);
    };
  }, [inView, disabled]);

  // ── Attach / tear down the stream on `live` change. ──
  useEffect(() => {
    let cancelled = false;
    const v = videoRef.current;

    if (live && v && !hlsRef.current) {
      v.muted = true;
      if (isHlsUrl(url)) {
        // Direct/free HLS gem — use the shared hls.js attach pattern.
        createHlsPlayer(v, url, undefined, () => { /* silent — tile stays poster */ })
          .then((inst) => {
            if (cancelled) { inst.destroy(); return; }
            hlsRef.current = inst;
            v.play().catch(() => { /* muted autoplay guard */ });
          })
          .catch(() => { /* silent — poster remains */ });
      } else {
        // Proxy /live stream — the <video> plays it natively (same as usePlayer).
        try {
          v.src = url;
          v.play().catch(() => { /* muted autoplay guard */ });
          hlsRef.current = {
            hls: null,
            destroy: () => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* noop */ } },
          };
        } catch { /* silent — poster remains */ }
      }
    }

    if (!live && hlsRef.current) {
      try { videoRef.current?.pause(); } catch { /* noop */ }
      try { hlsRef.current.destroy(); } catch { /* noop */ }
      hlsRef.current = null;
      setPlaying(false);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, url]);

  // ── Hard teardown on unmount (no leaked HLS instances). ──
  useEffect(() => () => {
    try { hlsRef.current?.destroy(); } catch { /* noop */ }
    hlsRef.current = null;
  }, []);

  const showLogo = !logoFailed && !!logo;

  return (
    <div ref={wrapRef} className="absolute inset-0" style={{ width, height }}>
      {/* The live <video> — only mounted while live; muted, object-cover. */}
      {live && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: playing ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.23,1,0.32,1)' }}
          muted
          playsInline
          autoPlay
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
          onPlaying={() => setPlaying(true)}
        />
      )}

      {/* POSTER — the channel logo, shown until the stream paints (no flash). */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: live && playing ? 0 : 1, transition: 'opacity 0.6s cubic-bezier(0.23,1,0.32,1)' }}
      >
        {showLogo ? (
          <img
            src={logo}
            alt={name}
            className="max-w-[64%] max-h-[58%] object-contain drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]"
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-white/80 text-[12px] font-bold tracking-tight px-3 text-center line-clamp-2">{name}</span>
        )}
      </div>
    </div>
  );
};

export default LiveFirstCardTile;
