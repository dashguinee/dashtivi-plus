import React, { useState, useEffect, useRef } from 'react';
import { Crown, ChevronLeft, Play } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { Channel } from '@/types';

interface Props {
  /** The premium channel the member tried to open (name shown as context). */
  channelName?: string;
  /** Recede the player surface — returns the member to the grid, keeps browsing. */
  onBack: () => void;
  /** Redeem flow for members who already hold a code (kept, but de-emphasised). */
  codeInput: string;
  setCodeInput: (v: string) => void;
  onSubmitCode: () => void;
  /** Free (direct-HLS) channels a guest CAN watch — the graceful fallback so no
   *  one is ever blocked. Empty/undefined => the notice renders exactly as before
   *  (no countdown, no options). */
  freeChannels?: Channel[];
  /** Play one of the free channels immediately (cancels the countdown). */
  onPlayFree?: (ch: Channel) => void;
}

/** Seconds before we auto-play a free channel — "we don't want to block anyone". */
const FREE_COUNTDOWN_SECONDS = 7;

/**
 * In-player Premium notice — NON-BLOCKING, with a graceful FREE fallback.
 *
 * Replaces the old full-screen Go-Premium modal. It is portaled into the PLAYER
 * surface (where the video would be), so it rides the surface's own rise/recede
 * + back handling. There is no app-wide overlay: the member can hit back / close
 * and keep browsing the grid, naturally landing on a free channel.
 *
 * Design DNA carried over from the old modal: GOLD = premium/pride/exclusive,
 * Crown badge, gold-shimmer CTA → WhatsApp upsell. Stripped to a single notice +
 * ONE action; code redemption is tucked behind a subtle link.
 *
 * ADDED (Aziz 2026-08-30, "we don't want to block anyone"): when free channels
 * are supplied, a 7-second countdown auto-plays a free channel, and a compact
 * row of free-channel tiles lets the member pick one instantly. The countdown
 * STOPS the moment the member interacts (WhatsApp CTA, code field, a free tile,
 * or back) — we never navigate out from under someone who is deciding.
 */
export const PremiumNotice: React.FC<Props> = ({ channelName, onBack, codeInput, setCodeInput, onSubmitCode, freeChannels, onPlayFree }) => {
  const { t, lang } = useLanguage();
  const [showCode, setShowCode] = useState(false);

  const hasFree = !!(freeChannels && freeChannels.length > 0 && onPlayFree);
  const firstFree = hasFree ? freeChannels![0] : null;
  const options = hasFree ? freeChannels!.slice(0, 6) : [];

  // ── 7s countdown → auto-play a free channel. Non-blocking + interrupt-safe. ──
  const [count, setCount] = useState(FREE_COUNTDOWN_SECONDS);
  // Set once the member starts interacting — the countdown never resumes after,
  // so we never yank someone off the screen mid-decision.
  const [countdownStopped, setCountdownStopped] = useState(false);
  const stopCountdown = () => setCountdownStopped(true);

  // Latest callback/list without re-arming the interval every parent re-render.
  const onPlayFreeRef = useRef(onPlayFree);
  onPlayFreeRef.current = onPlayFree;
  const freeChannelsRef = useRef(freeChannels);
  freeChannelsRef.current = freeChannels;

  // Tick down once a second while the countdown is live (free options exist, the
  // member hasn't interacted, and the code field isn't open). Opening the code
  // field pauses it too. Interval deps are only stable booleans → it isn't reset
  // by unrelated parent re-renders.
  useEffect(() => {
    if (!hasFree || countdownStopped || showCode) return;
    const id = setInterval(() => setCount((n) => (n <= 0 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, [hasFree, countdownStopped, showCode]);

  // Fire the auto-play exactly once when the countdown lands on 0.
  useEffect(() => {
    if (count === 0 && hasFree && !countdownStopped && !showCode) {
      const list = freeChannelsRef.current;
      if (list && list[0]) onPlayFreeRef.current?.(list[0]);
    }
  }, [count, hasFree, countdownStopped, showCode]);

  const countdownLive = hasFree && !countdownStopped && !showCode && count > 0;
  const freeLabel = lang === 'fr' ? 'Regarde gratuitement' : 'Watch free now';
  const playingInLabel = (n: number, name: string) =>
    lang === 'fr' ? `Lecture de ${name} dans ${n}s` : `Playing ${name} in ${n}s`;

  return (
    <div
      className="fixed inset-0 z-[52] flex flex-col"
      style={{
        // Cinematic premium ground — deep near-black with a warm gold floor,
        // matching the player's dark stage but signalling "exclusive".
        background: 'radial-gradient(120% 90% at 50% 18%, #14110a 0%, #0b0a07 52%, #060609 100%)',
      }}
    >
      <style>{`
        @keyframes gold-shimmer { 0% { background-position: -180% 0; } 100% { background-position: 180% 0; } }
        .gold-cta-shimmer::after {
          content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 48%, transparent 66%);
          background-size: 220% 100%; animation: gold-shimmer 2.6s ease-in-out infinite;
        }
      `}</style>

      {/* gold corner wash — the exclusive/pride glow */}
      <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,215,0,0.14) 0%, transparent 70%)' }} />

      {/* Back — the non-blocking escape. Recedes the player surface, returns to
          the exact grid position. Mirrors the player's own back affordance.
          Also halts the countdown (unmount clears it, but stop first so a late
          tick can't fire an auto-play as the member is leaving). */}
      <button
        onClick={() => { stopCountdown(); onBack(); }}
        aria-label="Back"
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,215,0,0.22)', backdropFilter: 'blur(8px)' }}
      >
        <ChevronLeft className="w-5 h-5 text-white/80" />
      </button>

      {/* Centre — the notice + ONE action. */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
        <span
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{
            background: 'linear-gradient(135deg, #FFE680 0%, #FFD700 45%, #C9A100 100%)',
            boxShadow: '0 8px 24px rgba(201,161,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          <Crown className="w-7 h-7" style={{ color: '#1a1400' }} />
        </span>

        <h3 className="text-2xl font-black tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", background: 'linear-gradient(135deg,#FFE680,#FFD700,#C9A100)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {t('premiumChannelTitle')}
        </h3>

        {channelName && (
          <p className="text-[13px] text-white/45 mt-1 max-w-[260px] truncate">{channelName}</p>
        )}

        <p className="text-[13px] text-white/55 mt-2 leading-snug max-w-[300px]">
          {t('goPremiumSubtitle')}
        </p>

        {/* ONE action — gold-shimmer CTA → WhatsApp upsell (same destination the
            old modal used). Tapping it means the member is engaging → stop the
            countdown so they aren't pulled onto a free channel mid-tap. */}
        <a
          href={`https://wa.me/224611361300?text=${encodeURIComponent(t('goPremiumWhatsappPrefill'))}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stopCountdown}
          className="gold-cta-shimmer relative block w-full max-w-[300px] text-center py-3.5 mt-6 rounded-xl text-sm font-black active:scale-[0.98] transition-transform overflow-hidden"
          style={{
            color: '#1a1400',
            background: 'linear-gradient(135deg, #FFE680 0%, #FFD700 48%, #E6B800 100%)',
            boxShadow: '0 8px 22px rgba(201,161,0,0.4), inset 0 1px 0 rgba(255,255,255,0.55)',
          }}
        >
          {t('goPremiumCta')}
        </a>

        {/* Tucked code-redeem — preserves the path for members who already paid,
            without competing with the single primary action. Opening it also
            pauses the countdown. */}
        {!showCode ? (
          <button
            onClick={() => { stopCountdown(); setShowCode(true); }}
            className="mt-4 text-[12.5px] font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            {t('premiumHaveCode')}
          </button>
        ) : (
          <div className="w-full max-w-[300px] mt-4">
            <input
              type="text"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder={t('goPremiumCodePlaceholder')}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white bg-white/[0.04] border border-white/10 focus:border-[rgba(255,215,0,0.45)] focus:outline-none mb-2 text-center tracking-wider placeholder:text-white/25"
              style={{ fontFamily: "'Space Grotesk', monospace" }}
              onKeyDown={e => e.key === 'Enter' && onSubmitCode()}
            />
            <button
              onClick={onSubmitCode}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white/70 bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:text-white transition-colors active:scale-95"
            >
              {t('goPremiumUnlock')}
            </button>
          </div>
        )}

        {/* ── FREE fallback — additive, below the upsell. "We don't want to block
            anyone." A 7s countdown auto-plays the first free channel; the tiles
            let the member pick one instantly (either cancels the countdown). Only
            rendered when free channels were supplied — otherwise the screen is
            byte-for-byte what it was before. ── */}
        {hasFree && (
          <div className="w-full max-w-[320px] mt-7">
            {/* thin gold divider — separates upsell from the free lane */}
            <div className="h-px w-full mb-4"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.22), transparent)' }} />

            {/* Countdown line (or a calm heading once it's stopped). */}
            <div className="flex items-center justify-center gap-2 mb-3 min-h-[20px]">
              {countdownLive && firstFree ? (
                <>
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-black tabular-nums"
                    style={{ color: '#1a1400', background: 'linear-gradient(135deg,#FFE680,#FFD700,#C9A100)', boxShadow: '0 2px 8px rgba(201,161,0,0.4)' }}
                    aria-live="polite"
                  >
                    {count}
                  </span>
                  <span className="text-[12.5px] text-white/70 truncate max-w-[240px]">
                    {playingInLabel(count, firstFree.name)}
                  </span>
                </>
              ) : (
                <span className="text-[12px] font-semibold tracking-wide uppercase text-white/40">
                  {freeLabel}
                </span>
              )}
            </div>

            {/* Compact free-channel tiles — tap one to play it now. */}
            <div className="grid grid-cols-3 gap-2">
              {options.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { stopCountdown(); onPlayFree?.(ch); }}
                  className="group relative flex flex-col items-center justify-center rounded-xl p-2 active:scale-95 transition-transform overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.16)' }}
                >
                  <span className="relative flex items-center justify-center w-full aspect-square rounded-lg mb-1 overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.35)' }}>
                    {ch.logo ? (
                      <img src={ch.logo} alt="" loading="lazy" className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Play className="w-4 h-4 text-white/50" />
                    )}
                    {/* play affordance on tap-hover */}
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.35)' }}>
                      <Play className="w-4 h-4" style={{ color: '#FFD700' }} />
                    </span>
                  </span>
                  <span className="text-[10.5px] leading-tight text-white/70 text-center line-clamp-2 w-full">
                    {ch.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
