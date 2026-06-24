import React, { useState, useEffect } from 'react';
import { Tv, Film, MonitorPlay, Sparkles, Search } from 'lucide-react';
import { tap } from '@/lib/haptics';

/**
 * VeeWheel — Vee's floating quick-actions. Arc of orbs flying out from the pebble
 * (Giraf OrbitalWheel pattern), recolored dark + Vee neon. Opens on HOLD.
 */
export type VeeAction = 'live' | 'movies' | 'series' | 'ask' | 'search';

const ITEMS: { key: VeeAction; icon: React.FC<any>; label: string; angle: number; hero?: boolean }[] = [
  { key: 'search', icon: Search,      label: 'Search', angle: -158 },
  { key: 'series', icon: MonitorPlay, label: 'Series', angle: -124 },
  { key: 'ask',    icon: Sparkles,    label: 'Ask Vee', angle: -90, hero: true },
  { key: 'movies', icon: Film,        label: 'Movies', angle: -56 },
  { key: 'live',   icon: Tv,          label: 'Live',   angle: -22 },
];
const R = 104;

export const VeeWheel: React.FC<{
  active: boolean; centerX: number; centerY: number;
  onSelect: (a: VeeAction) => void; onClose: () => void;
}> = ({ active, centerX, centerY, onSelect, onClose }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (active) { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }
    setMounted(false);
  }, [active]);
  if (!active) return null;

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,14,0.60)', backdropFilter: 'blur(11px)', WebkitBackdropFilter: 'blur(11px)', zIndex: 200, opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 210, pointerEvents: 'none' }}>
        {ITEMS.map((it, i) => {
          const rad = (it.angle * Math.PI) / 180;
          const x = centerX + Math.cos(rad) * R;
          const y = centerY + Math.sin(rad) * R;
          const Icon = it.icon;
          return (
            <React.Fragment key={it.key}>
              <button
                onClick={(e) => { e.stopPropagation(); tap(); onSelect(it.key); }}
                style={{
                  position: 'fixed',
                  left: mounted ? x - 27 : centerX - 27,
                  top: mounted ? y - 27 : centerY - 27,
                  width: 54, height: 54, borderRadius: '50%',
                  background: it.hero ? 'radial-gradient(circle at 35% 30%, #FF8AD0, #A855F7 52%, #3B82F6)' : 'rgba(22,22,32,0.85)',
                  border: it.hero ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.13)',
                  backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'auto', cursor: 'pointer',
                  boxShadow: it.hero ? '0 6px 24px rgba(168,85,247,0.55)' : '0 6px 18px rgba(0,0,0,0.55)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'scale(1)' : 'scale(0)',
                  transition: `left 0.42s cubic-bezier(0.23,1,0.32,1) ${i * 0.04}s, top 0.42s cubic-bezier(0.23,1,0.32,1) ${i * 0.04}s, opacity 0.3s ease ${i * 0.04}s, transform 0.42s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s`,
                }}
              >
                <Icon size={it.hero ? 22 : 19} color="rgba(255,255,255,0.95)" strokeWidth={1.8} />
              </button>
              <div style={{
                position: 'fixed', left: x - 45, top: y + 30, width: 90, textAlign: 'center',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.72)',
                zIndex: 211, pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease 0.18s',
              }}>{it.label}</div>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
