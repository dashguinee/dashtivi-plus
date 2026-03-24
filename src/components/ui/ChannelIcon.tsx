import React, { useState, memo } from 'react';

interface Props {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = [
  '#9D4EDD', '#E50914', '#00A8E1', '#FF6B35', '#06FFA5',
  '#FFD700', '#FF006E', '#7B2CBF', '#00D4FF', '#C77DFF',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

// Map channel names to tv-logo GitHub CDN URLs
const TV_LOGO_BASE = 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries';
const LOGO_MAP: Record<string, string> = {
  // Sky Sports
  'sky sports main event': `${TV_LOGO_BASE}/united-kingdom/sky-sports-main-event-uk.png`,
  'sky sports premier league': `${TV_LOGO_BASE}/united-kingdom/sky-sports-premier-league-uk.png`,
  'sky sports football': `${TV_LOGO_BASE}/united-kingdom/sky-sports-football-uk.png`,
  'sky sports news': `${TV_LOGO_BASE}/united-kingdom/sky-sports-news-uk.png`,
  'sky sports cricket': `${TV_LOGO_BASE}/united-kingdom/sky-sports-cricket-uk.png`,
  'sky sports action': `${TV_LOGO_BASE}/united-kingdom/sky-sports-action-uk.png`,
  'sky sports golf': `${TV_LOGO_BASE}/united-kingdom/sky-sports-golf-uk.png`,
  'sky sports racing': `${TV_LOGO_BASE}/united-kingdom/sky-sports-racing-uk.png`,
  'sky sports mix': `${TV_LOGO_BASE}/united-kingdom/sky-sports-mix-uk.png`,
  'sky sports f1': `${TV_LOGO_BASE}/united-kingdom/sky-sports-f1-uk.png`,
  // BBC
  'bbc one': `${TV_LOGO_BASE}/united-kingdom/bbc-one-uk.png`,
  'bbc two': `${TV_LOGO_BASE}/united-kingdom/bbc-two-uk.png`,
  'bbc news': `${TV_LOGO_BASE}/united-kingdom/bbc-news-uk.png`,
  'bbc world news': `${TV_LOGO_BASE}/united-kingdom/bbc-world-news-uk.png`,
  // SuperSport
  'supersport laliga': `${TV_LOGO_BASE}/south-africa/supersport-laliga-za.png`,
  'supersport football': `${TV_LOGO_BASE}/south-africa/supersport-football-za.png`,
  'supersport cricket': `${TV_LOGO_BASE}/south-africa/supersport-cricket-za.png`,
  'supersport blitz': `${TV_LOGO_BASE}/south-africa/supersport-blitz-za.png`,
  'supersport psl': `${TV_LOGO_BASE}/south-africa/supersport-football-plus-za.png`,
  // Canal+
  'canal+ sport': `${TV_LOGO_BASE}/france/canal-plus-sport-fr.png`,
  'canal+ cinema': `${TV_LOGO_BASE}/france/canal-plus-cinemas-fr.png`,
  'canal+ family': `${TV_LOGO_BASE}/france/canal-plus-family-fr.png`,
  'canal+ premiere': `${TV_LOGO_BASE}/france/canal-plus-premier-fr.png`,
  'canal+': `${TV_LOGO_BASE}/france/canal-plus-fr.png`,
  // Other
  'sony ten': `${TV_LOGO_BASE}/india/sony-ten-1-in.png`,
  'mutv': `${TV_LOGO_BASE}/united-kingdom/mutv-uk.png`,
};

function findLogoUrl(channelName: string): string | null {
  // Normalize: strip prefixes, lowercase
  const norm = channelName
    .replace(/^(UK\s*[\|:]+\s*|UHD\s*▎\s*|\|[A-Z]+\|\s*|FR\s*\([^)]*\)\s*)/i, '')
    .replace(/\s*[\[(][^\])]*[\])]\s*$/g, '')
    .replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Direct match
  if (LOGO_MAP[norm]) return LOGO_MAP[norm];

  // Partial match — find longest matching key
  for (const [key, url] of Object.entries(LOGO_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return url;
  }

  return null;
}

const sizes = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
};

export const ChannelIcon = memo(function ChannelIcon({ src, name, size = 'md', className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const letter = name.charAt(0).toUpperCase();
  const color = getColor(name);

  // Sanitize common URL issues (missing 'h', trailing quotes)
  // Sanitize common URL issues (missing 'h', trailing quotes, dead starshare domain)
  const cleanSrc = src?.replace(/^ttps:/, 'https:').replace(/"$/, '').replace('starshare.live:8080', 'datahub11.com:8080') || '';

  // Priority: 1. HTTPS src from API  2. tv-logo CDN  3. Proxied HTTP  4. Letter avatar
  let safeSrc: string | null = null;
  if (!failed) {
    if (cleanSrc?.startsWith('https://') && !cleanSrc.includes('webhop.live') && !cleanSrc.includes('paste.pics') && !cleanSrc.includes('tensports.com.pk')) {
      safeSrc = cleanSrc;
    } else if (!logoFailed) {
      const logoUrl = findLogoUrl(name);
      if (logoUrl) safeSrc = logoUrl;
    }
    if (!safeSrc && cleanSrc?.startsWith('http://') && !cleanSrc.includes('webhop.live')) {
      safeSrc = `https://stream.zionsynapse.online/?url=${encodeURIComponent(cleanSrc)}`;
    }
  }

  if (safeSrc) {
    return (
      <img
        src={safeSrc}
        alt={name}
        className={`${sizes[size]} rounded-xl object-contain bg-white/5 p-1 ${className}`}
        onError={() => {
          // If tv-logo CDN failed, try next in chain
          if (safeSrc?.includes('tv-logos')) setLogoFailed(true);
          else setFailed(true);
        }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(10,10,18,0.95) 50%, rgba(157,78,221,0.06) 100%)',
        border: '1px solid rgba(157,78,221,0.1)',
        color: 'rgba(157,78,221,0.7)',
        fontSize: size === 'lg' ? '14px' : size === 'md' ? '11px' : '9px',
        letterSpacing: '0.05em',
        textShadow: '0 0 8px rgba(157,78,221,0.3)',
      }}
    >
      {letter}
    </div>
  );
});
