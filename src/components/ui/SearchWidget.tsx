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

const SIZE = 64;  // hit area (tap target) — bigger so it's easy to find + grab
const DISC = 56;  // visual disc — large enough to read as a deliberate lit button

export const SearchWidget: React.FC<Props> = ({ credentials, onPlay }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [fade, setFade] = useState(0); // 0 awake · 1 dim (4s) · 2 deep (45s)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const start = useRef<{ px: number; py: number; x0: number; y0: number; moved: boolean } | null>(null);
  const dimT = useRef<ReturnType<typeof setTimeout>>();
  const deepT = useRef<ReturnType<typeof setTimeout>>();
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

  // Two-stage idle fade — any touch wakes it back to full.
  const wake = useCallback(() => {
    setFade(0);
    clearTimeout(dimT.current); clearTimeout(deepT.current);
    dimT.current = setTimeout(() => setFade(1), 4000);
    deepT.current = setTimeout(() => setFade(2), 45000);
  }, []);

  useEffect(() => {
    if (open) { clearTimeout(dimT.current); clearTimeout(deepT.current); const t = setTimeout(() => inputRef.current?.focus(), 110); return () => clearTimeout(t); }
    setQ(''); wake();
    return () => { clearTimeout(dimT.current); clearTimeout(deepT.current); };
  }, [open, wake]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Global opener — the nav search-pill opens the same modal, and re-summons the
  // pebble if it was swiped away.
  useEffect(() => {
    (window as any).openTiviSearch = () => { setHidden(false); setOpen(true); };
    return () => { (window as any).openTiviSearch = undefined; };
  }, []);

  // Drag to reposition (haptic on pickup); a still press is a tap → open; swipe to
  // an edge → dismiss.
  const onDown = (e: React.PointerEvent) => {
    if (!pos) return;
    wake(); tap();
    setPressing(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x0: pos.x, y0: pos.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dx = e.clientX - s.px, dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) > 5) { s.moved = true; setDragging(true); }
    if (s.moved) {
      setPos({
        x: Math.max(6, Math.min(window.innerWidth - SIZE - 6, s.x0 + dx)),
        y: Math.max(70, Math.min(window.innerHeight - SIZE - 88, s.y0 + dy)),
      });
    }
  };
  const onUp = () => {
    const s = start.current; start.current = null;
    setDragging(false); setPressing(false);
    if (!s) return;
    if (!s.moved) { setOpen(true); return; }
    // Stays exactly where you drop it — always fully on-screen (onMove clamps to the
    // viewport), so it can never dock off-screen or get lost again.
    wake();
  };

  return createPortal(
    <>
      <style>{`
        @keyframes sw-glow{0%,100%{box-shadow:0 10px 28px rgba(157,78,221,0.5),0 0 0 3px rgba(199,125,255,0.22),0 0 20px rgba(157,78,221,0.45),inset 0 1px 1px rgba(255,255,255,0.28)}50%{box-shadow:0 12px 36px rgba(157,78,221,0.65),0 0 0 5px rgba(199,125,255,0.30),0 0 34px rgba(157,78,221,0.72),inset 0 1px 1px rgba(255,255,255,0.36)}}
        @keyframes sw-fade{from{opacity:0}to{opacity:1}}
        @keyframes sw-cheer{0%{opacity:0;transform:translateY(26px) scale(0.94)}60%{opacity:1;transform:translateY(-6px) scale(1.015)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes sw-beam{0%,100%{opacity:0.55;transform:scaleY(1)}50%{opacity:0.9;transform:scaleY(1.06)}}
        @keyframes sw-shimmer{from{background-position:200% 0}to{background-position:-40% 0}}
        .sw-shimmer-text{background:linear-gradient(100deg,#E8B53A 0%,#FFF6CE 26%,#FFD700 50%,#FFF6CE 74%,#E8B53A 100%);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:sw-shimmer 2.6s linear infinite}
      `}</style>

      {/* Lit, draggable pebble — large hit area, smaller visual disc at rest */}
      {pos && !hidden && (
        <button
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          aria-label="Search channels"
          data-no-ptr
          className="fixed z-[9996] flex items-center justify-center"
          style={{
            left: pos.x, top: pos.y, width: SIZE, height: SIZE, padding: 0,
            background: 'transparent', border: 'none',
            opacity: open ? 0 : fade === 2 ? 0.9 : fade === 1 ? 0.96 : 1,
            transition: dragging ? 'none' : 'opacity 1s ease, left .5s cubic-bezier(0.34,1.56,0.64,1), top .5s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: open ? 'none' : 'auto',
            touchAction: 'none', cursor: 'grab', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div
            style={{
              width: DISC, height: DISC, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 38% 32%, rgba(206,140,255,0.95), rgba(124,58,200,0.92) 68%)',
              border: '1px solid rgba(220,170,255,0.65)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              boxShadow: active ? '0 18px 48px rgba(157,78,221,0.65), 0 0 0 6px rgba(199,125,255,0.28), 0 0 40px rgba(157,78,221,0.72)' : undefined,
              transform: `scale(${active ? 1.04 : 0.96})`,
              transition: 'transform .3s cubic-bezier(0.34,1.56,0.64,1), box-shadow .3s',
              animation: active ? 'none' : 'sw-glow 4.5s ease-in-out infinite',
            }}
          >
            <Search className="w-[24px] h-[24px] text-white" style={{ filter: 'drop-shadow(0 0 7px rgba(199,125,255,0.9))' }} />
          </div>
        </button>
      )}

      {/* Ambient master search — rises in-page over a blurred world */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center"
          style={{ background: 'rgba(6,6,12,0.42)', backdropFilter: 'blur(11px)', WebkitBackdropFilter: 'blur(11px)', animation: 'sw-fade 0.3s ease' }}
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
            className="relative w-[88vw] max-w-[440px] mt-[15vh] rounded-3xl overflow-hidden"
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
