import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { getCatalogSync, buildCatalogUrl, type CatalogChannel } from '@/lib/catalog';
import { buildLiveUrl } from '@/lib/xtream';
import type { XtreamCredentials } from '@/lib/xtream';
import type { Channel } from '@/types';
import { setPlaylist } from '@/lib/playlist';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { tap } from '@/lib/haptics';
import { useSearchDocked, setSearchDocked } from '@/lib/searchDock';

function toChannel(ch: CatalogChannel, creds: XtreamCredentials): Channel {
  const url = ch.plays === 'direct' ? buildCatalogUrl(ch, creds) : buildLiveUrl(creds, ch.stream_id);
  return { id: `live-${ch.stream_id}`, name: ch.name.replace(/\s+/g, ' ').trim(), url, logo: ch.icon, category: 'live' };
}

/**
 * SearchWidget — the MASTER SEARCH. A lit glass pebble that lives at thumb-height
 * (biased up), can be DRAGGED anywhere (haptic on pickup), is small at rest and
 * grows when grabbed, fades in two stages but never fully leaves, and swipes off an
 * edge to dismiss like a real phone bubble. It's excluded from pull-to-refresh
 * (data-no-ptr). Opening RISES an ambient modal (neon beam, gold caret + shimmer).
 * The nav search-pill opens the same modal via window.openTiviSearch.
 */
interface Props {
  credentials: XtreamCredentials;
  onPlay: (ch: Channel) => void;
}

const SIZE = 54;  // hit area (tap target) — +7%, comfortable but not bulky
const DISC = 43;  // visual disc — +7%, lit, deliberate

export const SearchWidget: React.FC<Props> = ({ credentials, onPlay }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dim, setDim] = useState(false); // false = awake (1.0) · true = rested (~0.55)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const docked = useSearchDocked();
  const inputRef = useRef<HTMLInputElement>(null);
  // grab offset (offX/offY) keeps the pebble under the finger — no teleport on pickup.
  const start = useRef<{ px: number; py: number; offX: number; offY: number; moved: boolean } | null>(null);
  const dimT = useRef<ReturnType<typeof setTimeout>>();
  const active = dragging || pressing;

  const results = useMemo(() => {
    const cat = getCatalogSync();
    const needle = q.trim().toLowerCase();
    if (!needle || !cat) return [] as CatalogChannel[];
    return cat.channels.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 12);
  }, [q]);

  // Default rest position: thumb-height (biased up ~28%), floated off the right edge.
  useEffect(() => {
    if (pos) return;
    const x = window.innerWidth - SIZE - 14;
    const y = Math.round(window.innerHeight * 0.28);
    setPos({ x, y });
  }, [pos]);

  // Single-stage rest fade — any interaction wakes it back to full, then after
  // ~4s of stillness it eases to the transparent rest opacity.
  const wake = useCallback(() => {
    setDim(false);
    clearTimeout(dimT.current);
    dimT.current = setTimeout(() => setDim(true), 4000);
  }, []);

  useEffect(() => {
    if (open) { clearTimeout(dimT.current); const t = setTimeout(() => inputRef.current?.focus(), 110); return () => clearTimeout(t); }
    setQ(''); wake();
    return () => { clearTimeout(dimT.current); };
  }, [open, wake]);

  // Any page scroll wakes the pebble (it's part of "any interaction").
  useEffect(() => {
    if (docked || hidden) return;
    const onScroll = () => wake();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [docked, hidden, wake]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Global opener — the header search-icon (when docked) and any caller open the
  // same modal. Does NOT un-dock: the pebble only returns on refresh.
  useEffect(() => {
    (window as any).openTiviSearch = () => { setHidden(false); setOpen(true); };
    return () => { (window as any).openTiviSearch = undefined; };
  }, []);

  // ── Hardened drag ──────────────────────────────────────────────
  // pointer capture + a tap-vs-drag threshold (>6px = drag). Grab offset is
  // preserved so the disc never teleports under the finger; the final position
  // is clamped fully inside the viewport.
  const TAP_SLOP = 6;
  const clampX = (x: number) => Math.max(6, Math.min(window.innerWidth - SIZE - 6, x));
  const clampY = (y: number) => Math.max(70, Math.min(window.innerHeight - SIZE - 88, y));

  const onDown = (e: React.PointerEvent) => {
    if (!pos) return;
    wake();
    setPressing(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // offX/offY = where inside the hit-area the finger landed, in element space.
    start.current = { px: e.clientX, py: e.clientY, offX: e.clientX - pos.x, offY: e.clientY - pos.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dx = e.clientX - s.px, dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) > TAP_SLOP) { s.moved = true; setDragging(true); }
    if (s.moved) {
      // Anchor the same grab point under the finger → no jump on pickup.
      setPos({ x: clampX(e.clientX - s.offX), y: clampY(e.clientY - s.offY) });
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setDragging(false); setPressing(false);
    if (!s) return;
    if (!s.moved) { tap(); setOpen(true); return; }
    // Dragged: stays where dropped, already clamped fully on-screen.
    wake();
  };

  // Close → dock into the header (session-only; refresh brings the pebble back).
  const onClose = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    tap();
    setSearchDocked(true);
  };

  return createPortal(
    <>
      <style>{`
        @keyframes sw-halo{0%,100%{opacity:0.4;transform:scale(0.96)}50%{opacity:0.8;transform:scale(1.04)}}
        @keyframes sw-fade{from{opacity:0}to{opacity:1}}
        @keyframes sw-cheer{0%{opacity:0;transform:translateY(26px) scale(0.94)}60%{opacity:1;transform:translateY(-6px) scale(1.015)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes sw-beam{0%,100%{opacity:0.55;transform:scaleY(1)}50%{opacity:0.9;transform:scaleY(1.06)}}
        @keyframes sw-shimmer{from{background-position:200% 0}to{background-position:-40% 0}}
        .sw-shimmer-text{background:linear-gradient(100deg,#E8B53A 0%,#FFF6CE 26%,#FFD700 50%,#FFF6CE 74%,#E8B53A 100%);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:sw-shimmer 2.6s linear infinite}
      `}</style>

      {/* Lit, draggable pebble — large hit area, smaller visual disc at rest.
          When docked, no pebble renders (the header carries the search icon). */}
      {pos && !hidden && !docked && (
        <button
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="Search channels"
          data-no-ptr
          className="fixed z-[9996] flex items-center justify-center"
          style={{
            left: pos.x, top: pos.y, width: SIZE, height: SIZE, padding: 0,
            background: 'transparent', border: 'none',
            opacity: open ? 0 : (dim && !active) ? 0.55 : 1,
            transition: dragging ? 'none' : 'opacity 1.1s ease, left .5s cubic-bezier(0.34,1.56,0.64,1), top .5s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: open ? 'none' : 'auto',
            touchAction: 'none', cursor: 'grab', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* cheap breathing halo — opacity+transform only (GPU-composited), no box-shadow repaint */}
          <span
            aria-hidden
            style={{
              position: 'absolute', width: DISC + 18, height: DISC + 18, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(157,78,221,0.6), rgba(157,78,221,0) 70%)',
              animation: active ? 'none' : 'sw-halo 4.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: DISC, height: DISC, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 38% 32%, rgba(206,140,255,0.95), rgba(124,58,200,0.92) 68%)',
              border: '1px solid rgba(220,170,255,0.65)',
              boxShadow: active
                ? '0 16px 42px rgba(157,78,221,0.6), 0 0 0 5px rgba(199,125,255,0.26), 0 0 34px rgba(157,78,221,0.66)'
                : '0 8px 22px rgba(157,78,221,0.45), 0 0 16px rgba(157,78,221,0.38), inset 0 1px 1px rgba(255,255,255,0.28)',
              transform: `scale(${active ? 1.04 : 0.96})`,
              transition: 'transform .3s cubic-bezier(0.34,1.56,0.64,1), box-shadow .3s',
            }}
          >
            <Search className="w-[18px] h-[18px] text-white" style={{ filter: 'drop-shadow(0 0 6px rgba(199,125,255,0.85))' }} />
          </div>
          {/* Close → dock. A tiny circle at the top-right, revealed on wake (not dim).
              Its own pointer handlers stop the drag/tap logic from firing. */}
          <span
            role="button"
            aria-label="Dock search to header"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={onClose}
            style={{
              position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,8,16,0.82)', border: '1px solid rgba(220,170,255,0.5)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              opacity: active || !dim ? 1 : 0,
              transform: `scale(${active || !dim ? 1 : 0.6})`,
              transition: 'opacity .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1)',
              pointerEvents: active || !dim ? 'auto' : 'none',
              touchAction: 'none',
            }}
          >
            <X className="w-[11px] h-[11px] text-white/85" />
          </span>
        </button>
      )}

      {/* Ambient master search — rises in-page over a blurred world */}
      {open && (
        <div
          className="fixed inset-0 z-[10050] flex flex-col items-center"
          style={{ background: 'rgba(6,6,12,0.62)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', animation: 'sw-fade 0.3s ease' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: '6vh', width: 'min(520px, 96vw)', height: '44vh', left: '50%', transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(157,78,221,0.55), rgba(157,78,221,0.12) 45%, transparent 70%)',
              filter: 'blur(26px)', animation: 'sw-beam 3.4s ease-in-out infinite', transformOrigin: '50% 30%',
            }}
          />
          <div
            className="relative w-[84vw] max-w-[360px] mt-[16vh] rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(20,18,30,0.74)', border: '1px solid rgba(199,125,255,0.22)',
              backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.6), 0 0 60px rgba(157,78,221,0.25)',
              animation: 'sw-cheer 0.46s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'rgba(255,215,0,0.55)' }} />
              <div className="relative flex-1 min-w-0">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search all of DASH…"
                  className="w-full bg-transparent text-[16px] outline-none placeholder-white/35"
                  style={{ color: 'transparent', caretColor: '#FFD700' }}
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                />
                {q && (
                  <span
                    className="sw-shimmer-text absolute left-0 top-0 text-[16px] pointer-events-none whitespace-pre"
                    style={{ fontWeight: 500, letterSpacing: '0.01em' }}
                  >
                    {q}
                  </span>
                )}
              </div>
              <button onClick={() => { tap(); setOpen(false); }} aria-label="Close search" className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
            {results.length > 0 && (
              <div className="max-h-[50vh] overflow-y-auto scrollbar-hide border-t border-white/[0.06]">
                {results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { tap(); if (results.length > 1) setPlaylist(results.map((r) => toChannel(r, credentials))); onPlay(toChannel(c, credentials)); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-white/[0.06] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <ChannelIcon src={c.icon} name={c.name} size="sm" className="!w-9 !h-9" />
                    </div>
                    <span className="text-[14px] text-white/90 truncate flex-1">{c.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/30 flex-shrink-0">{c.experience}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
