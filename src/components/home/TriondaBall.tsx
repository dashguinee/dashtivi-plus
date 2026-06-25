import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/i18n';
import { tap, click, confirm } from '@/lib/haptics';

/**
 * TriondaBall — a hand-built, crafted SVG of the FIFA World Cup 2026 "TRIONDA"
 * ball. LIGHT approach: pure SVG + CSS-3D, NO Three.js, NO external model.
 *
 * The ball is a white sphere with the signature RED, BLUE, GREEN (+ subtle GOLD)
 * ribboned/curved panels meeting at points, soft radial shading and a glossy
 * highlight for a 3D feel. It spins (rotateY) + gently bounces (translateY).
 *
 * Two sizes via one `size` prop:
 *   - "icon"  → small inline icon (sits in the World Cup pill / beside a title)
 *   - "pop"   → big centered hero ("the pop")
 *
 * Tapping the icon opens a SELF-CONTAINED pop overlay (createPortal → body,
 * z~9998 — does NOT import VeeCanvas): page blurs+dims, ball pops to center,
 * and an African-team flag picker appears. Pick → confetti burst, saved to
 * localStorage('tivi_wc_team'). Tap empty space → dissolve back to the icon.
 *
 * prefers-reduced-motion: no spin / no bounce / no confetti motion — static.
 */

const WC_TEAM_KEY = 'tivi_wc_team';

// Guinea FIRST — then the rest of the African contenders.
const AFRICAN_TEAMS: { code: string; flag: string; fr: string; en: string }[] = [
  { code: 'GN', flag: '🇬🇳', fr: 'Guinée',        en: 'Guinea' },
  { code: 'SN', flag: '🇸🇳', fr: 'Sénégal',       en: 'Senegal' },
  { code: 'CI', flag: '🇨🇮', fr: "Côte d'Ivoire", en: 'Ivory Coast' },
  { code: 'EG', flag: '🇪🇬', fr: 'Égypte',        en: 'Egypt' },
  { code: 'MA', flag: '🇲🇦', fr: 'Maroc',         en: 'Morocco' },
  { code: 'CM', flag: '🇨🇲', fr: 'Cameroun',      en: 'Cameroon' },
  { code: 'GH', flag: '🇬🇭', fr: 'Ghana',         en: 'Ghana' },
  { code: 'NG', flag: '🇳🇬', fr: 'Nigéria',       en: 'Nigeria' },
  { code: 'DZ', flag: '🇩🇿', fr: 'Algérie',       en: 'Algeria' },
  { code: 'TN', flag: '🇹🇳', fr: 'Tunisie',       en: 'Tunisia' },
];

export function getWcTeam(): string | null {
  try { return localStorage.getItem(WC_TEAM_KEY); } catch { return null; }
}

export function getWcFlag(): string | null {
  const code = getWcTeam();
  if (!code) return null;
  return AFRICAN_TEAMS.find((t) => t.code === code)?.flag ?? null;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

// ── The crafted SVG sphere ─────────────────────────────────────────
// White sphere with three signature ribboned panels (red/blue/green) curving in
// and meeting near the poles, a subtle gold seam, soft shading + a gloss
// highlight. Drawn in a 0..100 viewBox; scales crisply at any size.
function TriondaSphere({ px }: { px: number }) {
  // Stable per-render gradient ids so multiple balls on the page never collide.
  const id = useRef(`tri-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        {/* Sphere base — soft white with a lit top-left and a shaded bottom. */}
        <radialGradient id={`${id}-sphere`} cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f3f5f8" />
          <stop offset="82%" stopColor="#d6dbe2" />
          <stop offset="100%" stopColor="#aab2bd" />
        </radialGradient>
        {/* Glossy highlight blob — the "wet" 3D pop. */}
        <radialGradient id={`${id}-gloss`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Signature ribbon gradients — each panel a curved colored ribbon. */}
        <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5a52" />
          <stop offset="100%" stopColor="#d4192a" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3aa0ff" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`${id}-green`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3ddc84" />
          <stop offset="100%" stopColor="#0f9d58" />
        </linearGradient>
        {/* Clip everything to the sphere so ribbons curve off its edge. */}
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>

      {/* Base sphere */}
      <circle cx="50" cy="50" r="48" fill={`url(#${id}-sphere)`} />

      {/* Ribboned panels — three curved sweeps that meet near the top & bottom
          poles (the TRIONDA "tri" wave), each a colored ribbon with a subtle
          gold seam alongside. Clipped to the sphere. */}
      <g clipPath={`url(#${id}-clip)`}>
        {/* RED ribbon — sweeps top-pole → lower-left */}
        <path
          d="M50 4 C 30 24, 18 42, 8 70 C 20 78, 30 80, 40 78 C 44 56, 50 30, 56 14 Z"
          fill={`url(#${id}-red)`}
          opacity="0.96"
        />
        {/* BLUE ribbon — sweeps top-pole → lower-right */}
        <path
          d="M52 6 C 70 22, 82 40, 92 66 C 80 76, 70 80, 60 78 C 56 54, 52 28, 48 12 Z"
          fill={`url(#${id}-blue)`}
          opacity="0.96"
        />
        {/* GREEN ribbon — the bottom band joining both poles */}
        <path
          d="M10 72 C 26 90, 50 96, 90 70 C 86 84, 66 98, 44 96 C 28 94, 16 86, 8 76 Z"
          fill={`url(#${id}-green)`}
          opacity="0.96"
        />
        {/* Subtle GOLD seams running along the panel meeting-lines */}
        <path
          d="M50 6 C 44 32, 42 56, 40 78"
          stroke="#f5c451"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M50 8 C 53 32, 56 56, 60 78"
          stroke="#f5c451"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M12 73 C 34 89, 60 90, 88 70"
          stroke="#f5c451"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Shading veil — darkens lower-right for roundness over the panels */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#shade-overlay)"
          style={{ mixBlendMode: 'multiply' }}
        />
      </g>

      {/* Shading overlay gradient (outside clip so it reads as form light) */}
      <radialGradient id="shade-overlay" cx="38%" cy="32%" r="80%">
        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
        <stop offset="70%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(10,16,28,0.42)" />
      </radialGradient>

      {/* Rim + gloss highlight on top for the premium 3D feel */}
      <circle cx="50" cy="50" r="47.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      <ellipse cx="37" cy="30" rx="18" ry="12" fill={`url(#${id}-gloss)`} transform="rotate(-22 37 30)" />
    </svg>
  );
}

// ── Lightweight inline confetti — pure CSS, GPU-cheap (transform/opacity) ───
// A burst of N pieces that fall+drift+fade once, then unmount. No deps.
function ConfettiBurst({ run, reduced }: { run: number; reduced: boolean }) {
  if (reduced || run === 0) return null;
  const COLORS = ['#ff5a52', '#3aa0ff', '#3ddc84', '#f5c451', '#ffffff', '#C026D3'];
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.12;
    const dur = 0.9 + Math.random() * 0.7;
    const size = 6 + Math.random() * 6;
    const drift = (Math.random() - 0.5) * 120;
    const rot = Math.random() * 720 - 360;
    const color = COLORS[i % COLORS.length];
    return (
      <span
        key={`${run}-${i}`}
        style={{
          position: 'absolute',
          top: '34%',
          left: `${left}%`,
          width: size,
          height: size * 0.6,
          background: color,
          borderRadius: 2,
          opacity: 0,
          // each piece carries its own drift/rotate via CSS vars
          ['--drift' as string]: `${drift}px`,
          ['--rot' as string]: `${rot}deg`,
          animation: `tri-confetti ${dur}s cubic-bezier(0.2,0.6,0.4,1) ${delay}s forwards`,
          willChange: 'transform, opacity',
        }}
      />
    );
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces}
    </div>
  );
}

interface TriondaBallProps {
  /** "icon" = small inline; "pop" = big centered hero. */
  size?: 'icon' | 'pop';
  /** Pixel diameter override (defaults: icon 22, pop 168). */
  px?: number;
  /** When true (icon only), tapping opens the pop overlay. Default true for icon. */
  interactive?: boolean;
}

export function TriondaBall({ size = 'icon', px, interactive }: TriondaBallProps) {
  const { lang } = useLanguage();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const diameter = px ?? (size === 'pop' ? 168 : 22);
  const canInteract = interactive ?? size === 'icon';

  const onTap = useCallback(() => {
    if (!canInteract) return;
    click();
    setOpen(true);
  }, [canInteract]);

  // The animated wrapper — spin (rotateY) + gentle bounce (translateY). Both
  // transform-only → composited. Frozen under reduced-motion.
  const ball = (
    <div
      style={{
        width: diameter,
        height: diameter,
        perspective: diameter * 4,
        display: 'inline-block',
        lineHeight: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          animation: reduced
            ? 'none'
            : `tri-spin ${size === 'pop' ? 5.5 : 7}s linear infinite, tri-bounce ${size === 'pop' ? 2.2 : 2.8}s ease-in-out infinite`,
          willChange: 'transform',
          filter: size === 'pop'
            ? 'drop-shadow(0 18px 28px rgba(0,0,0,0.55))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
        }}
      >
        <TriondaSphere px={diameter} />
      </div>
    </div>
  );

  return (
    <>
      {/* Shared keyframes — registered once is fine (identical defs dedupe). */}
      <style>{`
        @keyframes tri-spin   { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        @keyframes tri-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12%); } }
        @keyframes tri-confetti {
          0%   { opacity: 1; transform: translate(0,0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--drift), 230px) rotate(var(--rot)); }
        }
        @keyframes tri-pop-in { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes tri-overlay-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .tri-anim { animation: none !important; }
        }
      `}</style>

      {canInteract ? (
        <button
          type="button"
          onPointerDown={() => tap()}
          onClick={onTap}
          aria-label={lang === 'fr' ? 'Ballon TRIONDA — choisir une équipe' : 'TRIONDA ball — pick a team'}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, display: 'inline-flex' }}
        >
          {ball}
        </button>
      ) : (
        ball
      )}

      {open && (
        <TriondaPopOverlay
          lang={lang}
          reduced={reduced}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── The self-contained pop overlay (portal to body, z~9998) ─────────
function TriondaPopOverlay({
  lang,
  reduced,
  onClose,
}: {
  lang: 'fr' | 'en';
  reduced: boolean;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(() => getWcTeam());
  const [confettiRun, setConfettiRun] = useState(0);

  // Esc closes too (desktop nicety).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pick = useCallback((code: string) => {
    confirm();
    try { localStorage.setItem(WC_TEAM_KEY, code); } catch { /* private mode — fine */ }
    setPicked(code);
    setConfettiRun((r) => r + 1);
    // Let other surfaces (the section flag beam) react to the new pick.
    try { window.dispatchEvent(new CustomEvent('tivi-wc-team', { detail: code })); } catch { /* noop */ }
  }, []);

  const overlay = (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // The page blurs + dims behind the overlay.
        background: 'rgba(5,6,10,0.62)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        animation: reduced ? 'none' : 'tri-overlay-in 0.28s ease-out both',
        padding: '24px',
      }}
    >
      <ConfettiBurst run={confettiRun} reduced={reduced} />

      {/* The ball pops to center, bigger + spinning. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: reduced ? 'none' : 'tri-pop-in 0.42s cubic-bezier(0.16,1,0.3,1) both',
          marginBottom: 28,
        }}
      >
        <TriondaBall size="pop" interactive={false} />
      </div>

      {/* The question + flag chips — Guinea first. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}
      >
        <h2
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: '-0.01em',
            margin: '0 0 4px',
            lineHeight: 1.2,
          }}
        >
          {lang === 'fr' ? 'Quelle équipe africaine soutiens-tu ?' : 'Which African team do you support?'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 18px' }}>
          {lang === 'fr' ? 'Touchez un drapeau' : 'Tap a flag'}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
          }}
        >
          {AFRICAN_TEAMS.map((tm) => {
            const active = picked === tm.code;
            return (
              <button
                key={tm.code}
                type="button"
                onPointerDown={() => tap()}
                onClick={() => pick(tm.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? '#fff' : 'rgba(255,255,255,0.82)',
                  background: active
                    ? 'linear-gradient(180deg, rgba(192,38,211,0.42), rgba(157,78,221,0.28))'
                    : 'rgba(255,255,255,0.06)',
                  border: active
                    ? '1px solid rgba(192,38,211,0.7)'
                    : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: active ? '0 0 18px rgba(192,38,211,0.4)' : 'none',
                  transition: 'transform 0.15s ease, background 0.2s ease',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: 17, lineHeight: 1 }}>{tm.flag}</span>
                {lang === 'fr' ? tm.fr : tm.en}
              </button>
            );
          })}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 22 }}>
          {lang === 'fr' ? 'Touchez ailleurs pour fermer' : 'Tap anywhere to close'}
        </p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

// ── Phase 3 — the picked flag on the section, with an orbiting purple beam ──
// Shows the saved flag inside a round chip with a CSS-animated conic beam
// traveling around its border. Subtle, premium, continuous. Reduced-motion =
// static (no beam rotation).
export function WcFlagBeam({ size = 34 }: { size?: number }) {
  const reduced = usePrefersReducedMotion();
  const [flag, setFlag] = useState<string | null>(() => getWcFlag());

  // Live-update if the user picks a team while this is mounted.
  useEffect(() => {
    const onPick = () => setFlag(getWcFlag());
    window.addEventListener('tivi-wc-team', onPick as EventListener);
    return () => window.removeEventListener('tivi-wc-team', onPick as EventListener);
  }, []);

  if (!flag) return null;

  const id = 'wc-beam';
  return (
    <span
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <style>{`
        @keyframes ${id}-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .${id}-ring { animation: none !important; }
        }
      `}</style>
      {/* The orbiting beam — a conic gradient ring rotating behind the flag. */}
      <span
        className={`${id}-ring`}
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, transparent 0deg, transparent 230deg, rgba(192,38,211,0.0) 250deg, rgba(192,38,211,0.9) 320deg, rgba(216,120,255,1) 350deg, transparent 360deg)',
          animation: reduced ? 'none' : `${id}-spin 2.6s linear infinite`,
          filter: 'blur(0.5px)',
          willChange: 'transform',
        }}
      />
      {/* Mask center so only the rim reads as a traveling beam. */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: '#0a0e14',
          boxShadow: 'inset 0 0 0 1px rgba(192,38,211,0.25)',
        }}
      />
      {/* The flag itself, on top. */}
      <span style={{ position: 'relative', fontSize: size * 0.5, lineHeight: 1 }}>{flag}</span>
    </span>
  );
}
