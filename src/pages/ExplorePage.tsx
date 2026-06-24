import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalog, getCatalogSync, EXPERIENCE_TO_CURATOR_ID, type Catalog } from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { ChevronLeft, X } from 'lucide-react';
import { tap } from '@/lib/haptics';

/**
 * ExplorePage — the 4-direction "village districts" explorer (from the tivi-plane concept).
 * Each experience is a district. Swipe/arrow ← → to travel worlds (wraps). Tap to enter.
 * Additive: a standalone /explore route — touches nothing existing.
 */
const GRAD: Record<string, [string, string]> = {
  'World Cup': ['#0b3d2e', '#16a34a'], 'Sports': ['#0c1a2b', '#0ea5e9'], 'Movies': ['#2a0b45', '#a855f7'],
  'Entertainment': ['#1a0b35', '#9333ea'], 'France': ['#14163a', '#6366f1'], 'African': ['#3a1c05', '#f59e0b'],
  'Arabic': ['#052e2b', '#14b8a6'], 'Kids': ['#3d0633', '#ec4899'], 'News': ['#161b28', '#64748b'],
  'Documentary': ['#0c2a1a', '#22c55e'], '4K Showcase': ['#2e2305', '#eab308'],
};
const TAG: Record<string, string> = {
  'World Cup': "Every match, live — what DStv & Canal+ don't carry.",
  'Sports': 'beIN, Sky, SuperSport — top of the table, uninterrupted.',
  'Movies': 'Sky Cinema, HBO & 60,000 titles on demand.',
  'France': 'Canal+, Ciné+ — French cinema, curated.',
  'African': 'RTS, TFM, CRTV — home, in your language.',
  'Arabic': "MBC, Rotana — the region's headline, live.",
  'Kids': 'Cartoon Network, Nick, Disney — for the little ones.',
};

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState<Catalog | null>(() => getCatalogSync());
  useEffect(() => { if (!cat) getCatalog().then(setCat).catch(() => {}); }, [cat]);
  const [x, setX] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const exps = cat?.experienceOrder || [];
  const N = exps.length;
  const go = useCallback((d: number) => { if (!N) return; tap(); setX(p => (p + d + N) % N); }, [N]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [go, navigate]);

  if (!cat || !N) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40">Loading the village…</div>;

  const exp = exps[x];
  const channels = cat.byExperience[exp] || [];
  const [a, b] = GRAD[exp] || ['#14132a', '#9D4EDD'];
  const prev = exps[(x - 1 + N) % N], next = exps[(x + 1) % N];
  const enter = () => { tap(); navigate(`/live/${EXPERIENCE_TO_CURATOR_ID[exp] || 'sports'}`); };

  return (
    <div className="fixed inset-0 overflow-hidden select-none z-[60]"
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <style>{`@keyframes ex-drift{from{transform:translate3d(-3%,-2%,0) scale(1.06)}to{transform:translate3d(5%,3%,0) scale(1.12)}}
        @keyframes ex-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
      <div key={exp} className="absolute inset-0" style={{ background: `linear-gradient(155deg, ${a}, ${b})`, animation: 'ex-drift 14s ease-in-out infinite alternate' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 28%, transparent 38%, rgba(0,0,0,0.6) 100%)' }} />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 z-20">
        {/* Visible back arrow — no ESC-only trap. Returns to home. */}
        <button
          onClick={() => navigate('/')}
          aria-label="Back to home"
          className="flex items-center gap-1 pl-1.5 pr-3 py-2 rounded-full active:scale-95 transition-transform"
          style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
          <span className="text-[12px] font-semibold text-white/85">Home</span>
        </button>
        <span className="text-lg font-bold uppercase text-white" style={{ fontFamily: "'Clash Display','Space Grotesk',sans-serif", letterSpacing: '-0.03em' }}>DASH<span className="font-light text-white/55 normal-case">tivi</span><span className="ml-0.5" style={{ background: 'linear-gradient(135deg,#C77DFF,#22C55E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>+</span></span>
        <button
          onClick={() => navigate('/')}
          aria-label="Close village"
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}
        >
          <X className="w-5 h-5 text-white/90" />
        </button>
      </div>

      <button onClick={() => go(-1)} aria-label={`Previous: ${prev}`} className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10 text-white/65" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold">‹ {prev}</span>
      </button>
      <button onClick={() => go(1)} aria-label={`Next: ${next}`} className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center z-10 text-white/65" style={{ writingMode: 'vertical-rl' }}>
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold">{next} ›</span>
      </button>

      <div key={exp + '-c'} className="absolute inset-0 flex flex-col justify-end px-7 pb-24 z-[5]" style={{ animation: 'ex-in 0.42s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-semibold mb-2">District {x + 1} / {N} · {channels.length} channels</div>
        <h1 className="text-[40px] leading-[0.95] font-black tracking-tight">{exp}</h1>
        <p className="text-[14px] text-white/75 mt-3 max-w-[280px]">{TAG[exp] || `${channels.length} hand-picked channels.`}</p>
        <div className="flex gap-2 mt-5">
          {channels.slice(0, 6).map(c => (
            <div key={c.id} className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }}>
              <ChannelIcon src={c.icon} name={c.name} size="sm" className="!w-11 !h-11" />
            </div>
          ))}
          {channels.length > 6 && <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[11px] font-bold text-white/70" style={{ background: 'rgba(255,255,255,0.10)' }}>+{channels.length - 6}</div>}
        </div>
        <button onClick={enter} className="mt-6 self-start px-7 py-3 rounded-full font-bold text-[15px] active:scale-95 transition-transform" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(8px)' }}>
          Enter {exp} →
        </button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {exps.map((_, i) => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i === x ? 18 : 6, height: 6, background: i === x ? '#fff' : 'rgba(255,255,255,0.35)' }} />)}
      </div>
    </div>
  );
};

export default ExplorePage;
