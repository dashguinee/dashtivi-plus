import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/i18n';
import { tap, click, confirm } from '@/lib/haptics';

/**
 * TriondaBall — a simple FIFA World Cup 2026 "TRIONDA" ball on the home.
 *
 *   - The home ball: the static `/trionda-ball.png` render in a circular frame,
 *     with a gentle slow spin + a soft ambient violet halo. Pure <img>, GPU-cheap.
 *     Tapping it opens a clean "Select your country" modal.
 *   - The modal (TriondaPopOverlay): a static hero ball + a title + the
 *     African-team flag grid (Guinea first). Tap a flag → saved to
 *     localStorage('tivi_wc_team') + a 'tivi-wc-team' CustomEvent so the
 *     WcFlagBeam updates. Tap ✕ or any empty space → close.
 *
 * No iframe, no sound, no confetti, no orbiting beam — premium but simple + fast.
 * prefers-reduced-motion: no spin / no ambient pulse.
 */

const WC_TEAM_KEY = 'tivi_wc_team';

// The static FIFA TRIONDA 2026 ball render.
const POSTER_SRC = '/trionda-ball.png';

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

// ── The inline static home ball ─────────────────────────────────────
// A circular frame showing the real ball render (`/trionda-ball.png`) with a
// slow, breathing violet ambient halo. Pure <img> — GPU-cheap. Tapping it opens
// the "Select your country" modal.
function StaticTriondaBall({ px }: { px: number }) {
  return (
    <span
      data-tri-ambient
      style={{
        position: 'relative',
        width: px,
        height: px,
        display: 'inline-block',
        borderRadius: '50%',
        overflow: 'hidden',
        lineHeight: 0,
        flexShrink: 0,
        background: 'radial-gradient(circle at 38% 30%, #1a1426, #0a0e14)',
        // The ambient light — a slow, breathing violet halo around the ball.
        animation: 'tri-ambient 3.8s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes tri-home-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { [data-tri-home-spin] { animation: none !important; } }
      `}</style>
      {/* The real ball render — a simple, slow spin (calm, not dizzy). */}
      <img
        data-tri-home-spin
        src={POSTER_SRC}
        alt="FIFA TRIONDA Ball World Cup 2026"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          userSelect: 'none',
          animation: 'tri-home-spin 8s linear infinite',
          willChange: 'transform',
        }}
      />
    </span>
  );
}

interface TriondaBallProps {
  /** "icon" = small inline home ball; "pop" = larger hero ball. */
  size?: 'icon' | 'pop';
  /** Pixel diameter override (defaults: icon 64, pop 268). */
  px?: number;
}

export function TriondaBall({ size = 'icon', px }: TriondaBallProps) {
  const { lang } = useLanguage();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const diameter = px ?? (size === 'pop' ? 268 : 64);

  const openPicker = useCallback(() => {
    click();
    setOpen(true);
  }, []);

  return (
    <>
      {/* Shared keyframes (home ambient halo + overlay fade-in). */}
      <style>{`
        @keyframes tri-overlay-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes tri-pop-in { 0% { opacity: 0; transform: scale(0.92); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes tri-ambient {
          0%,100% { box-shadow: 0 0 0 1px rgba(192,38,211,0.30), 0 0 13px rgba(192,38,211,0.28), 0 4px 14px rgba(0,0,0,0.45); }
          50%     { box-shadow: 0 0 0 1px rgba(216,120,255,0.45), 0 0 26px rgba(192,38,211,0.55), 0 4px 16px rgba(0,0,0,0.50); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-tri-ambient] { animation: none !important; }
        }
      `}</style>

      {/* The static, ambient-lit ball — tap it to open the country picker. */}
      <button
        type="button"
        onPointerDown={() => tap()}
        onClick={openPicker}
        aria-label={lang === 'fr' ? 'Ouvrir le ballon' : 'Open the ball'}
        style={{
          display: 'inline-flex',
          padding: 0,
          // Give the inline home ball room to breathe — space above, to the
          // right, and below so it isn't cramped against neighbouring content.
          margin: size === 'icon' ? '10px 14px 12px 0' : 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          lineHeight: 0,
          borderRadius: '50%',
        }}
      >
        <StaticTriondaBall px={diameter} />
      </button>

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

// ── The self-contained "Select your country" overlay (portal to body) ──
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
      {/* Explicit exit — top-right. (Tapping any empty space also closes.) */}
      <button
        type="button"
        onClick={onClose}
        aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
        style={{
          position: 'absolute',
          top: 'max(14px, env(safe-area-inset-top))',
          right: 14,
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          fontSize: 18,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 2,
        }}
      >
        ✕
      </button>

      {/* A simple static hero ball — circular, soft shadow. No iframe / spin. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 168,
          height: 168,
          borderRadius: '50%',
          overflow: 'hidden',
          marginBottom: 24,
          boxShadow: '0 0 0 1px rgba(192,38,211,0.30), 0 18px 44px rgba(0,0,0,0.55)',
          animation: reduced ? 'none' : 'tri-pop-in 0.32s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <img
          src={POSTER_SRC}
          alt="FIFA TRIONDA Ball World Cup 2026"
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </div>

      {/* The title + flag grid — Guinea first. */}
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
            margin: '0 0 18px',
            lineHeight: 1.2,
          }}
        >
          {lang === 'fr' ? 'Choisis ton pays' : 'Select your country'}
        </h2>

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
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 14px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontSize: 12,
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
                <span style={{ fontSize: 26, lineHeight: 1 }}>{tm.flag}</span>
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
