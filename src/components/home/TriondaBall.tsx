import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/i18n';
import { tap, click, confirm } from '@/lib/haptics';

/**
 * TriondaBall — the REAL, INTERACTIVE FIFA World Cup 2026 "TRIONDA" ball.
 *
 *   - "icon"  → small inline INTERACTIVE Sketchfab 3D embed (~64px, circular).
 *               Drag to rotate / auto-spins. Performance-first:
 *                 • Exactly ONE iframe, ever.
 *                 • LAZY — the iframe mounts only when scrolled into view
 *                   (IntersectionObserver), and unmounts when far off-screen.
 *                 • An INSTANT poster (`/trionda-ball.png`) shows underneath
 *                   until the iframe reports loaded — never a blank / old SVG.
 *               The inline ball captures pointer events (so you can spin it);
 *               the flag-picker therefore lives on a separate small affordance.
 *   - "pop"   → big centered STATIC hero ball inside the flag-picker overlay,
 *               with an orbiting conic beam + a slow spin/breath + a GOAL cheer
 *               on pick. No iframe (Sketchfab is network-blocked → "content
 *               is blocked"), so the 3D embed was removed entirely.
 *
 * Flag-picker flow (PRESERVED): a tiny pill / the WcFlagBeam opens a
 * SELF-CONTAINED pop overlay (createPortal → body, z~9998): page blurs+dims,
 * the ball pops to center, African-team flag picker appears. Pick → confetti
 * burst, saved to localStorage('tivi_wc_team'). Tap empty space → close.
 *
 * prefers-reduced-motion: no auto-spin / no confetti motion — still draggable.
 */

const WC_TEAM_KEY = 'tivi_wc_team';

// The static FIFA TRIONDA 2026 ball render. The Sketchfab interactive embed was
// removed: it's blocked on the target network ("content is blocked"). The pop
// now goes fully static + CSS-animated (spin + orbiting beam + cheer).
const POSTER_SRC = '/trionda-ball.png';

// Goal-celebration crowd ROAR — fired when a team is picked. Lazily created and
// reused across picks; play() runs inside the pick tap (a user gesture) so the
// browser autoplay policy allows it.
//   Source: "Arrowhead Stadium crowd noise" by Kj1595 (Wikimedia Commons),
//   trimmed to 2.6s. CC BY-SA 4.0 — see CREDITS.md (attribution required).
let cheerAudio: HTMLAudioElement | null = null;
function playCheer() {
  try {
    if (!cheerAudio) cheerAudio = new Audio('/cheer.mp3');
    cheerAudio.currentTime = 0;
    cheerAudio.volume = 0.5;
    void cheerAudio.play();
  } catch { /* a cheer is a bonus — never block the pick */ }
}

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
// slow, breathing violet ambient halo. Pure <img> — zero iframe, GPU-cheap.
// Tapping it opens the full pop (the animated hero ball + team picker).
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
      {/* The real ball render, circular — static. Tapping opens the full
          interactive ball (the pop), where it spins + you can grab it. */}
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
    </span>
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
  /** "icon" = small inline INTERACTIVE embed; "pop" = big centered hero embed. */
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
      {/* Shared keyframes (confetti + overlay) — identical defs dedupe. */}
      <style>{`
        @keyframes tri-confetti {
          0%   { opacity: 1; transform: translate(0,0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--drift), 230px) rotate(var(--rot)); }
        }
        @keyframes tri-pop-in { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes tri-overlay-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes tri-ambient {
          0%,100% { box-shadow: 0 0 0 1px rgba(192,38,211,0.30), 0 0 13px rgba(192,38,211,0.28), 0 4px 14px rgba(0,0,0,0.45); }
          50%     { box-shadow: 0 0 0 1px rgba(216,120,255,0.45), 0 0 26px rgba(192,38,211,0.55), 0 4px 16px rgba(0,0,0,0.50); }
        }
        /* The pop ball: a slow, premium spin + a gentle breathing scale. */
        @keyframes tri-ball-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes tri-ball-breath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        /* The orbiting beam ring (same technique as WcFlagBeam). */
        @keyframes tri-beam-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        /* GOAL celebration — a joyful bounce + glow pulse on the picked ball. */
        @keyframes tri-ball-cheer {
          0%   { transform: scale(1) translateY(0); }
          18%  { transform: scale(1.18) translateY(-14px); }
          40%  { transform: scale(0.94) translateY(0); }
          60%  { transform: scale(1.08) translateY(-6px); }
          80%  { transform: scale(0.98) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes tri-chip-cheer {
          0%,100% { transform: scale(1.05); }
          25%     { transform: scale(1.22) translateY(-3px); }
          55%     { transform: scale(0.98); }
          75%     { transform: scale(1.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-tri-ambient] { animation: none !important; }
          [data-tri-spin], [data-tri-beam], [data-tri-cheer], [data-tri-chip] { animation: none !important; }
        }
      `}</style>

      {/* The static, ambient-lit ball — tap it to open the FULL interactive
          ball (it spins + you can grab it) and the team picker. */}
      <button
        type="button"
        onPointerDown={() => tap()}
        onClick={openPicker}
        aria-label={lang === 'fr' ? 'Ouvrir le ballon' : 'Open the ball'}
        style={{
          display: 'inline-flex',
          padding: 0,
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
  // A monotonic counter — bumping it re-triggers the GOAL cheer animation
  // (changing the React key restarts the CSS keyframe from 0).
  const [cheer, setCheer] = useState(0);

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
    setCheer((c) => c + 1);
    playCheer();
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

      {/* The ball pops to center — STATIC render (no iframe → never "blocked").
          A rotating conic beam orbits it, the ball gently spins + breathes, and
          on a pick it does a joyful GOAL bounce. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 300,
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          animation: reduced ? 'none' : 'tri-pop-in 0.42s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* The orbiting beam — same conic-gradient ring technique as WcFlagBeam,
            scaled up to circle the hero ball. Sits BEHIND the ball. */}
        <span
          data-tri-beam
          aria-hidden
          style={{
            position: 'absolute',
            width: 296,
            height: 296,
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 230deg, rgba(192,38,211,0.0) 250deg, rgba(192,38,211,0.9) 320deg, rgba(216,120,255,1) 350deg, transparent 360deg)',
            animation: reduced ? 'none' : 'tri-beam-spin 3.4s linear infinite',
            filter: 'blur(1px)',
            willChange: 'transform',
          }}
        />
        {/* Mask the beam's center so only its rim reads as a traveling beam. */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            width: 282,
            height: 282,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 30%, #15101f, #05060a)',
            boxShadow: 'inset 0 0 0 1px rgba(192,38,211,0.22)',
          }}
        />

        {/* The static ball render — circular, ~248px, NO iframe. The cheer
            wrapper re-keys on each pick so the GOAL bounce restarts cleanly. */}
        <div
          key={`cheer-${cheer}`}
          data-tri-cheer
          style={{
            position: 'relative',
            width: 248,
            height: 248,
            borderRadius: '50%',
            animation: reduced || cheer === 0
              ? 'none'
              : 'tri-ball-cheer 0.85s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          {/* Inner layer carries the perpetual spin + breath so it composes
              cleanly with the (occasional) cheer bounce on the wrapper. */}
          <div
            data-tri-spin
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 0 1px rgba(192,38,211,0.35), 0 0 30px rgba(192,38,211,0.30), 0 18px 44px rgba(0,0,0,0.55)',
              animation: reduced
                ? 'none'
                : 'tri-ball-spin 24s linear infinite, tri-ball-breath 4.2s ease-in-out infinite',
              willChange: 'transform',
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
        </div>
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
                // Re-key the active chip on each pick so the cheer keyframe
                // restarts from 0; inactive chips keep a stable key.
                key={active ? `${tm.code}-cheer-${cheer}` : tm.code}
                type="button"
                data-tri-chip={active ? '' : undefined}
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
                  animation:
                    active && !reduced && cheer > 0
                      ? 'tri-chip-cheer 0.6s cubic-bezier(0.34,1.56,0.64,1) both'
                      : undefined,
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
