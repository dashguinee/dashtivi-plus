import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
 * SearchWidget — the MASTER SEARCH. A little Apple-glass trigger pill (small,
 * floaty, dims after a few idle seconds) that opens a floaty AMBIENT modal which
 * RISES in the same page: the page stays visible-but-blurred behind (continuity,
 * no page break), the field auto-focuses, results stream live from the catalog.
 * Tap a result → it plays. "Find gems" without leaving the flow.
 */
interface Props {
  credentials: XtreamCredentials;
  onPlay: (ch: Channel) => void;
}

export const SearchWidget: React.FC<Props> = ({ credentials, onPlay }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dim, setDim] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dimTimer = useRef<ReturnType<typeof setTimeout>>();

  const results = useMemo(() => {
    const cat = getCatalogSync();
    const needle = q.trim().toLowerCase();
    if (!needle || !cat) return [] as CatalogChannel[];
    return cat.channels.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 12);
  }, [q]);

  // Ambient dim — fade the trigger after a few idle seconds; any touch wakes it.
  const wake = useCallback(() => {
    setDim(false);
    clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => setDim(true), 3500);
  }, []);

  useEffect(() => {
    if (open) { clearTimeout(dimTimer.current); const t = setTimeout(() => inputRef.current?.focus(), 90); return () => clearTimeout(t); }
    setQ(''); wake();
    return () => clearTimeout(dimTimer.current);
  }, [open, wake]);

  // Back-gesture / Esc closes the master search (continuity: pops the layer).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Trigger — small ambient glass pill that dims when idle */}
      <button
        onPointerDown={wake}
        onClick={() => { tap(); setOpen(true); }}
        aria-label="Search channels"
        className="fixed bottom-24 right-3 z-[55] w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
        style={{
          background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          opacity: open ? 0 : (dim ? 0.32 : 1),
          transition: 'opacity 0.9s ease, transform 0.2s ease',
          pointerEvents: open ? 'none' : 'auto',
        }}
      >
        <Search className="w-4 h-4 text-white/85" />
      </button>

      {/* Master search — rises over the page; page stays visible-but-blurred (continuity) */}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center"
          style={{ background: 'rgba(6,6,12,0.42)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', animation: 'sw-fade 0.3s ease' }}
          onClick={() => setOpen(false)}
        >
          <style>{`@keyframes sw-fade{from{opacity:0}to{opacity:1}}@keyframes sw-rise{from{opacity:0;transform:translateY(18px) scale(0.975)}to{opacity:1;transform:none}}`}</style>
          <div
            className="w-[88vw] max-w-[440px] mt-[17vh] rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(20,18,30,0.72)', border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
              animation: 'sw-rise 0.36s cubic-bezier(0.23,1,0.32,1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Search className="w-5 h-5 text-white/50 flex-shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search all of DASH…"
                className="flex-1 min-w-0 bg-transparent text-[16px] text-white placeholder-white/35 outline-none"
              />
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
    </>
  );
};
