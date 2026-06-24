import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Home, Trophy } from 'lucide-react';
import { useLanguage, t } from '@/i18n';
import type { XtreamCredentials } from '@/lib/xtream';
import { buildLiveUrl } from '@/lib/xtream';
import {
  getCatalog,
  getCatalogSync,
  buildCatalogUrl,
  type Catalog,
  type CatalogChannel,
} from '@/lib/catalog';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed } from '@/lib/ambient-audio';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { tap } from '@/lib/haptics';
import type { Channel } from '@/types';

/**
 * NbaPage — the dedicated NBA collection. NBA-themed twin of the experience
 * pages, but sourced straight from the static catalog (Sports experience,
 * /nba/i name filter) — the same seam the home NbaShowcase uses, so the two
 * can never disagree. Deep navy → dark red → black, NBA red + royal blue.
 */

const NBA_RED = '#C8102E';
const NBA_BLUE = '#1D428A';
const NBA_RE = /nba/i;

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function toChannel(ch: CatalogChannel, credentials: XtreamCredentials): Channel {
  const url = ch.plays === 'direct'
    ? buildCatalogUrl(ch, credentials)
    : buildLiveUrl(credentials, ch.stream_id);
  return {
    id: `live-${ch.stream_id}`,
    name: cleanName(ch.name),
    url,
    logo: ch.icon,
    category: 'live',
  };
}

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const NbaPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(getCatalogSync());

  useEffect(() => {
    setAmbientSpeed(1.2);
    let mounted = true;
    if (!catalog) getCatalog().then((c) => { if (mounted) setCatalog(c); });
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const channels = (catalog?.byExperience['Sports'] || []).filter((c) => NBA_RE.test(c.name));

  const play = useCallback((ch: CatalogChannel) => {
    if (channels.length > 1) setPlaylist(channels.map((c) => toChannel(c, credentials)));
    const channel = toChannel(ch, credentials);
    setCurrentChannel(channel.id);
    onPlay(channel);
  }, [channels, credentials, onPlay]);

  const liveLabel = t(lang, 'liveLabel');

  return (
    <div className="pt-14 pb-32 min-h-screen">
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div
        className="relative px-4 pt-4 pb-5"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 20% 10%, rgba(29,66,138,0.30) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 80% 80% at 95% 95%, rgba(200,16,46,0.18) 0%, transparent 70%), ' +
            'linear-gradient(160deg, #0d1a33 0%, #1a0a14 60%, #050608 100%)',
        }}
      >
        <button
          onPointerDown={() => tap()}
          onClick={() => navigate('/')}
          aria-label={lang === 'fr' ? 'Accueil' : 'Home'}
          className="group flex items-center gap-1.5 pr-3.5 pl-2.5 py-2 min-h-[40px] rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] mb-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none"
            className="group-hover:-translate-x-0.5 transition-transform duration-200">
            <path d="M8.5 3L4.5 7l4 4" stroke="rgba(157,180,232,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-semibold tracking-wide text-white/60">
            {lang === 'fr' ? 'Accueil' : 'Home'}
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
            style={{ background: `linear-gradient(135deg, ${NBA_RED}, ${NBA_BLUE})`, boxShadow: '0 0 22px rgba(200,16,46,0.30)' }}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">NBA</h1>
            <p className="text-xs text-white/40">
              {channels.length} {lang === 'fr' ? 'chaînes en direct' : 'channels live'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Channel grid ────────────────────────────────────────────── */}
      <section className="px-4 mt-5">
        {channels.length === 0 ? (
          <div className="text-center py-16 text-white/25 text-sm">
            {lang === 'fr' ? 'Aucune chaîne NBA disponible' : 'No NBA channels available'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {channels.map((ch, i) => (
              <button
                key={ch.stream_id}
                onPointerDown={() => tap()}
                onClick={() => play(ch)}
                className="group"
                style={i < 12 ? { animation: `vee-card-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms both` } : undefined}
              >
                <div
                  className="relative aspect-video rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.03] group-active:scale-[0.96]"
                  style={{
                    background: 'linear-gradient(157deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.012) 100%)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(29,66,138,0.30)',
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-2/3 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 85% 100% at 32% 0%, ${NBA_BLUE}33, transparent 72%)` }}
                  />
                  <ChannelIcon src={ch.icon} name={ch.name} size="md" />
                  <div
                    className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: NBA_RED }} />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: NBA_RED, boxShadow: '0 0 5px rgba(200,16,46,0.9)' }} />
                    </span>
                    <span className="text-[7px] font-bold text-white/75 tracking-wide">{liveLabel}</span>
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(0,0,0,0.42)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(6px)' }}
                    >
                      <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] leading-tight text-white/60 text-center mt-1.5 px-0.5 line-clamp-2 font-medium tracking-tight group-hover:text-white/90 transition-colors">
                  {cleanName(ch.name)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Bottom quick-nav ────────────────────────────────────────── */}
      <div
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/80 backdrop-blur-lg border border-white/10"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 10px rgba(200,16,46,0.25)' }}
      >
        <button
          onPointerDown={() => tap()}
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          {lang === 'fr' ? 'Accueil' : 'Home'}
        </button>
        <div className="w-px h-4 bg-white/10" />
        <button
          onPointerDown={() => tap()}
          onClick={() => navigate('/live/sports')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <Trophy className="w-3.5 h-3.5" />
          Sports
        </button>
      </div>
    </div>
  );
};
