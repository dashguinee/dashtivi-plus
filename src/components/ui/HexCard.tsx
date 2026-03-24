import React, { useMemo, useId } from 'react';
import { ChannelIcon } from './ChannelIcon';

// ── Hex Variants ─────────────────────────────────────────────────

export type HexVariant = 'netflix' | 'dash' | 'sports' | 'club' | 'discover';

// ── Color palettes per variant ───────────────────────────────────
// Each variant: primary glow, secondary accent, inner radiance

interface HexPalette {
  glow: string;        // outer halo color
  accent: string;      // secondary glow / accent
  inner: string;       // inner radiance tint
  borderOpacity: number; // base border visibility (0-1)
}

const PALETTES: Record<HexVariant, HexPalette> = {
  netflix:  { glow: '#E50914', accent: '#FF6B6B', inner: '#E50914', borderOpacity: 0.7 },
  dash:     { glow: '#9D4EDD', accent: '#E040FB', inner: '#B06EF0', borderOpacity: 0.7 },
  sports:   { glow: '#EF4444', accent: '#F97316', inner: '#EF4444', borderOpacity: 0.65 },
  club:     { glow: '#9D4EDD', accent: '#3B82F6', inner: '#6366F1', borderOpacity: 0.5 },
  discover: { glow: '#9D4EDD', accent: '#7C3AED', inner: '#9D4EDD', borderOpacity: 0.15 },
};

// ── Club-specific colors ─────────────────────────────────────────

export const CLUB_COLORS: Record<string, { primary: string; secondary: string; name: string }> = {
  liverpool:  { primary: '#C8102E', secondary: '#00B2A9', name: 'Liverpool FC' },
  mancity:    { primary: '#6CABDD', secondary: '#1C2C5B', name: 'Manchester City' },
  manutd:     { primary: '#DA291C', secondary: '#FBE122', name: 'Manchester United' },
  arsenal:    { primary: '#EF0107', secondary: '#063672', name: 'Arsenal' },
  chelsea:    { primary: '#034694', secondary: '#DBA111', name: 'Chelsea' },
  barca:      { primary: '#A50044', secondary: '#004D98', name: 'FC Barcelona' },
  realmadrid: { primary: '#FEBE10', secondary: '#00529F', name: 'Real Madrid' },
  psg:        { primary: '#004170', secondary: '#DA291C', name: 'PSG' },
  bayern:     { primary: '#DC052D', secondary: '#0066B2', name: 'Bayern Munich' },
  juventus:   { primary: '#000000', secondary: '#FFFFFF', name: 'Juventus' },
};

// ── Soft hex path (rounded corners via quadratic bezier) ─────────

const HEX_OUTER = 'M50,3 L90,25 Q94,28 94,32 L94,68 Q94,72 90,75 L50,97 Q47,99 44,97 L10,75 Q6,72 6,68 L6,32 Q6,28 10,25 L44,3 Q47,1 50,3 Z';
const HEX_INNER = 'M50,7 L86,27 Q89,29 89,32 L89,68 Q89,71 86,73 L50,93 Q48,94 46,93 L14,73 Q11,71 11,68 L11,32 Q11,29 14,27 L46,7 Q48,6 50,7 Z';

// ── HexCard Component ────────────────────────────────────────────

interface HexCardProps {
  variant: HexVariant;
  clubColors?: { primary: string; secondary: string };
  title?: string;
  subtitle?: string;
  image?: string;
  icon?: string;
  isLive?: boolean;
  scale?: number;
  filled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const HexCardInner: React.FC<HexCardProps> = ({
  variant,
  clubColors,
  title,
  subtitle,
  image,
  icon,
  isLive,
  scale = 1,
  filled = false,
  onClick,
  children,
  className = '',
}) => {
  const palette = useMemo(() => {
    if (variant === 'club' && clubColors) {
      return { glow: clubColors.primary, accent: clubColors.secondary, inner: clubColors.primary, borderOpacity: 0.55 };
    }
    return PALETTES[variant];
  }, [variant, clubColors]);

  const uid = useId().replace(/:/g, '');

  // Variant-specific animation class for the GLOW layer (not the border)
  const glowAnim = variant === 'netflix' ? 'hex-anim-breathe'
    : variant === 'dash' ? 'hex-anim-shimmer'
    : variant === 'sports' ? 'hex-anim-flicker'
    : variant === 'discover' ? 'hex-anim-pulse'
    : ''; // club: no animation

  const isGate = variant === 'sports';

  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 group transition-transform duration-300 hover:scale-[1.05] active:scale-[0.97] ${glowAnim} ${className}`}
      style={{ width: 140 * scale, height: 160 * scale }}
    >
      {isGate ? (
        <>
          {/* ── FADE GATE — sports variant ── */}
          {/* ── Same hex halo system as other variants, but with sports flicker ── */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full hex-anim-flicker"
            style={{ filter: `drop-shadow(0 0 ${6 * scale}px ${palette.glow}80) drop-shadow(0 0 ${12 * scale}px ${palette.glow}40)` }}>
            <path d={HEX_OUTER} fill="none" stroke={palette.glow} strokeWidth="3" strokeOpacity={palette.borderOpacity} strokeLinejoin="round" />
          </svg>

          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id={`rad${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={palette.inner} stopOpacity="0.08" />
                <stop offset="60%" stopColor={palette.inner} stopOpacity="0.03" />
                <stop offset="100%" stopColor={palette.glow} stopOpacity="0.12" />
              </radialGradient>
              <linearGradient id={`fill${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.inner} stopOpacity="0.04" />
                <stop offset="100%" stopColor={palette.accent} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={HEX_INNER} fill={`url(#fill${uid})`} />
            <path d={HEX_INNER} fill={`url(#rad${uid})`} />
          </svg>
        </>
      ) : (
        <>
          {/* ── HEX MODE — neon halo for non-sports variants ── */}
          {/* Layer 1: Outer border — static glow, no orbiting */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full"
            style={{ filter: `drop-shadow(0 0 ${5 * scale}px ${palette.glow}50) drop-shadow(0 0 ${10 * scale}px ${palette.glow}20)` }}>
            <path d={HEX_OUTER} fill="none" stroke={palette.glow} strokeWidth="1.5" strokeOpacity={palette.borderOpacity} strokeLinejoin="round" />
          </svg>

          {/* Layer 2: Inner radiance gradient */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id={`rad${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={palette.inner} stopOpacity="0.08" />
                <stop offset="60%" stopColor={palette.inner} stopOpacity="0.03" />
                <stop offset="100%" stopColor={palette.glow} stopOpacity="0.12" />
              </radialGradient>
              <linearGradient id={`fill${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.inner} stopOpacity="0.04" />
                <stop offset="100%" stopColor={palette.accent} stopOpacity="0.02" />
              </linearGradient>
              <clipPath id={`clip${uid}`}>
                <path d={HEX_INNER} />
              </clipPath>
              {filled && (
                <linearGradient id={`ov${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="black" stopOpacity="0" />
                  <stop offset="45%" stopColor="black" stopOpacity="0.1" />
                  <stop offset="75%" stopColor="black" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="black" stopOpacity="0.92" />
                </linearGradient>
              )}
            </defs>

            <path d={HEX_INNER} fill={`url(#fill${uid})`} />
            <path d={HEX_INNER} fill={`url(#rad${uid})`} />

            {(image || (filled && icon)) && (
              <image
                href={filled ? (icon || image) : image}
                x="10" y="5" width="80" height="90"
                clipPath={`url(#clip${uid})`}
                preserveAspectRatio="xMidYMid slice"
                opacity={filled ? '1' : '0.3'}
              />
            )}

            {filled && <path d={HEX_INNER} fill={`url(#ov${uid})`} />}
          </svg>
        </>
      )}

      {/* Content layer */}
      <div
        className={`absolute inset-0 flex flex-col z-10 px-2 ${filled ? 'justify-end items-center' : 'justify-center items-center'}`}
        style={!filled && !isGate ? {
          clipPath: 'polygon(50% 6%, 87% 27%, 90% 32%, 90% 68%, 87% 73%, 50% 94%, 13% 73%, 10% 68%, 10% 32%, 13% 27%)',
        } : undefined}
      >
        {children ? children : (
          <>
            {icon && !filled && (
              <div className="w-10 h-10 mb-1">
                <ChannelIcon src={icon} name={title || ''} size="md" className="!w-10 !h-10 !rounded-lg" />
              </div>
            )}

            {isLive && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/90 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[8px] font-bold text-white">LIVE</span>
              </div>
            )}

            {title && (
              <span
                className={`font-bold text-center leading-tight ${filled
                  ? 'text-[10px] text-white line-clamp-2 mb-1 max-w-[90%]'
                  : 'text-[10px] text-white/90 font-semibold line-clamp-2 px-1'
                }`}
                style={{
                  textShadow: filled
                    ? `0 0 8px ${palette.glow}, 0 0 16px ${palette.glow}60, 0 1px 3px rgba(0,0,0,0.95)`
                    : `0 0 6px ${palette.glow}40`,
                }}
              >
                {title}
              </span>
            )}

            {subtitle && (
              <span className="text-[8px] text-white/40 mt-0.5 text-center">{subtitle}</span>
            )}
          </>
        )}
      </div>
    </button>
  );
};

export const HexCard = React.memo(HexCardInner);

// ── HexRow ───────────────────────────────────────────────────────

interface HexRowProps {
  title: string;
  titleIcon?: React.ReactNode;
  titleGlow?: string;
  children: React.ReactNode;
  perspective?: boolean;
  onSeeMore?: () => void;
}

const HexRowInner: React.FC<HexRowProps> = ({ title, titleGlow, children, onSeeMore }) => (
  <section className="mb-2 py-3">
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[20px] font-black tracking-tight text-white">{title}</h2>
        <div
          className="w-1.5 h-1.5 rounded-full mb-0.5 flex-shrink-0"
          style={{
            background: titleGlow || '#9D4EDD',
            boxShadow: `0 0 6px ${titleGlow || '#9D4EDD'}60`,
          }}
        />
      </div>
      {onSeeMore && (
        <button onClick={onSeeMore} className="text-[11px] text-white/20 hover:text-white/50 transition-colors tracking-wide">
          More
        </button>
      )}
    </div>
    <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 py-2 items-end">
      {children}
    </div>
  </section>
);

export const HexRow = React.memo(HexRowInner);
