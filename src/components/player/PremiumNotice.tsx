import React, { useState } from 'react';
import { Crown, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/i18n';

interface Props {
  /** The premium channel the member tried to open (name shown as context). */
  channelName?: string;
  /** Recede the player surface — returns the member to the grid, keeps browsing. */
  onBack: () => void;
  /** Redeem flow for members who already hold a code (kept, but de-emphasised). */
  codeInput: string;
  setCodeInput: (v: string) => void;
  onSubmitCode: () => void;
}

/**
 * In-player Premium notice — NON-BLOCKING.
 *
 * Replaces the old full-screen Go-Premium modal. It is portaled into the PLAYER
 * surface (where the video would be), so it rides the surface's own rise/recede
 * + back handling. There is no app-wide overlay: the member can hit back / close
 * and keep browsing the grid, naturally landing on a free channel.
 *
 * Design DNA carried over from the old modal: GOLD = premium/pride/exclusive,
 * Crown badge, gold-shimmer CTA → WhatsApp upsell. Stripped to a single notice +
 * ONE action; code redemption is tucked behind a subtle link.
 */
export const PremiumNotice: React.FC<Props> = ({ channelName, onBack, codeInput, setCodeInput, onSubmitCode }) => {
  const { t } = useLanguage();
  const [showCode, setShowCode] = useState(false);

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
          the exact grid position. Mirrors the player's own back affordance. */}
      <button
        onClick={onBack}
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
            old modal used). */}
        <a
          href={`https://wa.me/224611361300?text=${encodeURIComponent(t('goPremiumWhatsappPrefill'))}`}
          target="_blank"
          rel="noopener noreferrer"
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
            without competing with the single primary action. */}
        {!showCode ? (
          <button
            onClick={() => setShowCode(true)}
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
      </div>
    </div>
  );
};
