import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { t, useLanguage } from '@/i18n';
import type { Lang } from '@/i18n';
import type { XtreamCredentials } from '@/lib/xtream';
import { buildLiveUrl } from '@/lib/xtream';
import { useShowcaseTier } from '@/hooks/useShowcaseTier';
import { FreeHlsShowcaseCard, type FreeHlsChannel } from '@/components/ui/FreeHlsShowcaseCard';
import { OyeAfricaCard, StationsCard } from '@/components/voyo';
import { MoviesExploration } from '@/components/home/MoviesExploration';
import {
  getCatalog,
  getCatalogSync,
  buildCatalogUrl,
  EXPERIENCE_TO_CURATOR_ID,
  type Catalog,
  type CatalogChannel,
} from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { tap } from '@/lib/haptics';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed } from '@/lib/ambient-audio';
import type { Channel } from '@/types';

/**
 * HomePage — football-first, hand-curated home for Guinea / Sierra Leone.
 *
 * "Think from Tivi up." This is NOT a generic IPTV grid. The home is driven
 * 100% by the static curated catalog (/tivi-curated.json via catalog.ts):
 *   1. A cinematic World Cup hero (collections.worldcup) — football leads.
 *   2. One clean horizontal row per experience, in experience_order, exact
 *      names. No invented theme sections, no weather, no VOD posters.
 *
 * Every channel plays through buildLiveUrl(credentials, stream_id), the same
 * proxy/direct seam catalog.ts already wires for the rest of the app.
 */

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

// Per-experience accent — one signature color per row (premium, not a rainbow).
// Football / sports lead with World-Cup green.
const EXPERIENCE_ACCENT: Record<string, string> = {
  'World Cup': '#22C55E',
  'Sports': '#22C55E',
  'Movies': '#9D4EDD',
  'Entertainment': '#C77DFF',
  'France': '#3B82F6',
  'African': '#F97316',
  'Arabic': '#14B8A6',
  'Kids': '#EC4899',
  'News': '#EF4444',
  'Documentary': '#A78BFA',
  '4K Showcase': '#EAB308',
};

// Clean a curated channel name for display — keep the FULL readable name,
// just normalize whitespace (no truncation to "…orts HD1").
function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

// Build a runtime Channel from a catalog channel, ready for the player.
function toChannel(ch: CatalogChannel, credentials: XtreamCredentials): Channel {
  // direct (free HLS) channels carry their own url; proxy channels build via creds.
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

// ── Free-HLS "alive gift" — curated picks woven into the home for guests.
// Hand-picked ids from /streamore-locked.json: global-CDN-first, strong for
// our people, spread across districts so the scatter reads varied. Each is
// SCATTERED after a specific row index (begin / middle / end of the feed).
const FREE_HLS_WEAVE: { id: string; afterRow: number }[] = [
  { id: 'free-923',  afterRow: 0 }, // beIN Sports Xtra — football, top of feed
  { id: 'free-2339', afterRow: 3 }, // Made in Hollywood — cinema, mid feed
  { id: 'free-2667', afterRow: 6 }, // France 24 — français, deeper
  { id: 'free-344',  afterRow: 9 }, // Trace Urban HD — music, near the end
];

// ── The magic hello — the strongest live pick auto-plays at the very TOP for
// EVERYONE (free + premium). One good thing, calm, no click ("there it is").
// First id present in the locked pool wins; falls back to first channel.
const HELLO_PREFERENCE = ['free-923', 'free-845', 'free-2616'];

interface FreeHlsData {
  channels: FreeHlsChannel[];
}

export const HomePage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(getCatalogSync());
  const [freeHls, setFreeHls] = useState<FreeHlsData | null>(null);

  // ONE source of truth for the free-vs-premium showcase split (shared with the
  // Stream+ tab + page so they can never disagree).
  //   FREE  → loud: neon free-HLS grid woven into the feed.
  //   PREMIUM → calm: no free grid; a single SUBTLE VOYO/Oyé music embed instead.
  const { isPremium, isFree } = useShowcaseTier();

  useEffect(() => {
    setAmbientSpeed(0.8);
    let mounted = true;
    if (!catalog) {
      getCatalog().then((c) => { if (mounted) setCatalog(c); });
    }
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the free-HLS showcase pool for EVERYONE — the magic-hello visor at the
  // very top is shown to free AND premium (one good thing auto-plays, calm).
  // The full neon GRID stays gated below (free-only); premium only uses the
  // pool for the single hello card.
  useEffect(() => {
    let alive = true;
    fetch('/streamore-locked.json', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((d: FreeHlsData) => { if (alive) setFreeHls(d); })
      .catch(() => { /* showcase is a bonus — silent on failure */ });
    return () => { alive = false; };
  }, []);

  // Resolve the hello — strongest pick, falls back to first in the pool.
  // A surf offset (set by swiping the visor) shifts which pool channel shows,
  // turning the top visor into a swipeable "new-era remote" over the free pool.
  const [helloSurf, setHelloSurf] = useState(0);
  const baseHelloChannel = useMemo<FreeHlsChannel | null>(() => {
    if (!freeHls || freeHls.channels.length === 0) return null;
    const byId = new Map(freeHls.channels.map((c) => [c.id, c]));
    for (const id of HELLO_PREFERENCE) {
      const c = byId.get(id);
      if (c) return c;
    }
    return freeHls.channels[0];
  }, [freeHls]);

  const helloChannel = useMemo<FreeHlsChannel | null>(() => {
    if (!freeHls || freeHls.channels.length === 0 || !baseHelloChannel) return null;
    const list = freeHls.channels;
    const baseIdx = list.findIndex((c) => c.id === baseHelloChannel.id);
    if (baseIdx === -1) return baseHelloChannel;
    const n = list.length;
    const idx = ((baseIdx + helloSurf) % n + n) % n;
    return list[idx];
  }, [freeHls, baseHelloChannel, helloSurf]);

  const surfHello = useCallback((dir: 1 | -1) => {
    setHelloSurf((s) => s + dir);
  }, []);

  // Resolve the curated weave to real channels, keyed by the row to follow.
  // Skip the hello channel — it already plays in the top visor (no dupe).
  const weaveByRow = useMemo(() => {
    const map = new Map<number, FreeHlsChannel>();
    if (!isFree || !freeHls) return map;
    const byId = new Map(freeHls.channels.map((c) => [c.id, c]));
    for (const w of FREE_HLS_WEAVE) {
      if (w.id === helloChannel?.id) continue;
      const ch = byId.get(w.id);
      if (ch) map.set(w.afterRow, ch);
    }
    return map;
  }, [isFree, freeHls, helloChannel]);

  // ── Play a channel, with the full row as playlist context (next/prev) ──
  const play = useCallback((ch: CatalogChannel, row: CatalogChannel[]) => {
    if (row.length > 1) {
      setPlaylist(row.map((c) => toChannel(c, credentials)));
    }
    const channel = toChannel(ch, credentials);
    setCurrentChannel(channel.id);
    onPlay(channel);
  }, [credentials, onPlay]);

  if (!catalog) {
    return (
      <div className="pt-20 px-4 space-y-6 animate-pulse">
        <div className="h-[34vh] rounded-2xl bg-white/[0.03]" />
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 w-32 rounded bg-white/[0.04] mb-3" />
              <div className="flex gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-[88px] w-[124px] rounded-xl bg-white/[0.02]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── World Cup hero — the live moment. Marquee = first WC feed (beIN). ──
  const worldcup = catalog.worldcup;
  const heroChannel = worldcup[0] || null;

  return (
    <div className="pt-16 pb-48">
      {/* ════════════════════════════════════════════════════════════════
          THE MAGIC HELLO — one good thing auto-plays at the very top, for
          EVERYONE (free + premium). The FreeHlsShowcaseCard focus engine
          claims the centered card the moment the page paints, so the visor
          (sitting at the very top) plays itself. Calm: ONE live at a time,
          everything below stays a poster until you scroll to it.
          ════════════════════════════════════════════════════════════════ */}
      {helloChannel && (
        <section className="mb-8">
          <div className="px-4 mb-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: '#22C55E' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#22C55E' }} />
            </span>
            <span className="text-[10px] font-black tracking-[2.5px] uppercase" style={{ color: '#86EFAC' }}>
              {lang === 'fr' ? 'En direct · à l’instant' : 'Live · right now'}
            </span>
          </div>
          <FreeHlsShowcaseCard channel={helloChannel} onSurf={surfHello} />
        </section>
      )}

      {heroChannel && (
        <WorldCupHero
          channel={heroChannel}
          channels={worldcup}
          lang={lang}
          onPlay={() => play(heroChannel, worldcup)}
        />
      )}

      {/* ── The curated experiences, in experience_order, exact names ─── */}
      <div className="mt-5">
        {catalog.experienceOrder.map((experience, idx) => {
          const channels = catalog.byExperience[experience] || [];
          if (channels.length === 0) return null;
          // /live/:experienceId page exists for these curator ids. World Cup
          // has no dedicated page, so its "See all" lands on Sports (which
          // also surfaces the WC feeds).
          const seeAllId = experience === 'World Cup'
            ? 'sports'
            : EXPERIENCE_TO_CURATOR_ID[experience];
          // A free-HLS "alive gift" card woven in AFTER this row (free only).
          const woven = weaveByRow.get(idx);
          return (
            <React.Fragment key={experience}>
              <ExperienceRow
                index={idx}
                title={experience}
                accent={EXPERIENCE_ACCENT[experience] || '#9D4EDD'}
                channels={channels}
                onPlay={(ch) => play(ch, channels)}
                onSeeAll={seeAllId ? () => navigate(`/live/${seeAllId}`) : undefined}
                lang={lang}
              />
              {woven && (
                <div className="mb-9">
                  <FreeHlsShowcaseCard channel={woven} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          THE CONTINUATION — Stream+ is no longer a tab; it's the home canvas
          continuing. Premium experiences strong up top, the free village +
          exploration build as you scroll deeper. One cohesive canvas.
          ════════════════════════════════════════════════════════════════ */}

      {/* FREE: the village, LOUD — Oyé + Stations prominent in the continuation,
          framed as "the village is expanding". (The neon free grid already
          wove through the rows above.) */}
      {isFree && (
        <section className="px-4 mt-6 mb-3">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#FFD700', boxShadow: '0 0 6px rgba(255,215,0,0.6)' }}
            />
            <h2 className="text-[19px] font-black tracking-tight text-white">
              {lang === 'fr' ? 'VOYO · Le continent' : 'VOYO · The continent'}
            </h2>
          </div>
          <div className="space-y-4">
            <OyeAfricaCard />
            <StationsCard />
          </div>
          <p className="text-[11px] text-white/35 mt-3.5 px-0.5 leading-snug">
            {lang === 'fr'
              ? 'Tout un univers musical — touchez, VOYO s’ouvre sans quitter Tivi+.'
              : 'A whole music universe — tap, and VOYO opens without leaving Tivi+.'}
          </p>
        </section>
      )}

      {/* ── EXPLORATION beat — Movies, with auto-playing trailers. "Home is
          THE happening place." Free = loud (featured 3); premium = present
          but calmer (featured 2). One live trailer at a time, shared with the
          free-HLS focus engine (a playing trailer = THE one live surface). */}
      <MoviesExploration credentials={credentials} onPlay={onPlay} featured={isFree ? 3 : 2} />

      {/* PREMIUM: the village, embedded SUBTLY — restraint = premium. No neon
          grid; just a low-key, calm door into BOTH Oyé Africa + Stations (both
          must be reachable for premium too, just quietly). */}
      {isPremium && (
        <section className="px-4 mt-6 mb-3">
          <div className="flex items-center gap-2 mb-3.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#FFD700', boxShadow: '0 0 6px rgba(255,215,0,0.55)' }}
            />
            <h2 className="text-[15px] font-semibold tracking-tight text-white/55">
              VOYO · Musique
            </h2>
          </div>
          <div className="space-y-4">
            <OyeAfricaCard />
            <StationsCard />
          </div>
        </section>
      )}

      {/* ── GIRA INFINITE LOOP — never a dead end. When the canvas bottoms out
          and the user keeps reaching for more, glide them back to the top. */}
      <GiraLoopSentinel />
    </div>
  );
};

// ── Gira infinite loop ──────────────────────────────────────────────
// The home canvas should feel endless (the Gira "no stop" DNA). When the user
// scrolls to the very bottom and keeps pulling, we smoothly carry them back to
// the top instead of letting them hit a wall. Subtle, debounced, never jarring.
function GiraLoopSentinel() {
  const { lang } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const looping = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastY = window.scrollY;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        const goingDown = window.scrollY > lastY;
        lastY = window.scrollY;
        // Only loop when the sentinel is fully in view AND the user was still
        // scrolling DOWN into it (an intentional reach for more), once at a time.
        if (e.isIntersecting && e.intersectionRatio > 0.9 && goingDown && !looping.current) {
          looping.current = true;
          // A breath, then a smooth glide home — the canvas "wraps".
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => { looping.current = false; }, 1400);
          }, 360);
        }
      },
      { threshold: [0, 0.9, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center gap-2 pt-16 pb-24 select-none">
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,215,0,0.5)', animation: 'gira-pulse 1.4s ease-in-out infinite' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,215,0,0.5)', animation: 'gira-pulse 1.4s ease-in-out 0.2s infinite' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,215,0,0.5)', animation: 'gira-pulse 1.4s ease-in-out 0.4s infinite' }} />
      </div>
      <p className="text-[10.5px] tracking-wide text-white/25 font-medium">
        {lang === 'fr' ? 'On recommence en haut…' : 'Looping back to the top…'}
      </p>
      <style>{`@keyframes gira-pulse { 0%,100% { opacity:0.25; transform:scale(0.8) } 50% { opacity:1; transform:scale(1.2) } }`}</style>
    </div>
  );
}

// ── World Cup hero ──────────────────────────────────────────────────

function WorldCupHero({
  channel,
  channels,
  lang,
  onPlay,
}: {
  channel: CatalogChannel;
  channels: CatalogChannel[];
  lang: Lang;
  onPlay: () => void;
}) {
  const liveLabel = t(lang, 'liveLabel');
  return (
    <section className="px-4">
      <button
        onClick={onPlay}
        className="relative w-full overflow-hidden rounded-2xl text-left active:scale-[0.99] transition-transform duration-200 group"
        style={{
          height: '34vh',
          minHeight: 220,
          maxHeight: 300,
          background:
            'radial-gradient(ellipse 90% 70% at 25% 20%, rgba(34,197,94,0.22) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 80% 80% at 90% 90%, rgba(16,40,24,0.6) 0%, transparent 70%), ' +
            'linear-gradient(160deg, #0a1a0f 0%, #060b08 55%, #050608 100%)',
          border: '1px solid rgba(34,197,94,0.18)',
          boxShadow: '0 0 40px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <style>{`
          @keyframes hero-sweep { 0%{transform:translateX(-40%)} 100%{transform:translateX(140%)} }
          @keyframes hero-play-breathe {
            0%,100% { box-shadow: 0 0 22px rgba(34,197,94,0.45); transform: scale(1); }
            50%     { box-shadow: 0 0 34px rgba(34,197,94,0.70); transform: scale(1.06); }
          }
        `}</style>
        {/* Stadium-light sweep — slow, continuous */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-y-0 -left-1/3 w-2/3 opacity-70"
            style={{
              background: 'linear-gradient(115deg, transparent 20%, rgba(34,197,94,0.07) 46%, rgba(255,255,255,0.05) 50%, transparent 70%)',
              animation: 'hero-sweep 7s ease-in-out infinite',
            }}
          />
        </div>
        {/* Cinema vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
        />

        {/* LIVE · World Cup pill — top left */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(34,197,94,0.14)',
            border: '1px solid rgba(34,197,94,0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[11px] font-black tracking-[2.5px] text-green-300 uppercase">
            {liveLabel} · World Cup
          </span>
        </div>

        {/* Marquee channel — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <ChannelIcon src={channel.icon} name={channel.name} size="md" eager className="!w-14 !h-14" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-[2px] uppercase text-green-300/70 mb-1">
              Now streaming
            </p>
            <h1 className="text-[23px] leading-tight font-black text-white tracking-tight line-clamp-2">
              {cleanName(channel.name)}
            </h1>
            <p className="text-[12px] text-white/45 mt-0.5">
              {channels.length} World Cup feed{channels.length !== 1 ? 's' : ''} live now
            </p>
          </div>
          {/* Big play target */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              animation: 'hero-play-breathe 2.8s ease-in-out infinite',
            }}
          >
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </div>
        </div>
      </button>
    </section>
  );
}

// ── Experience row ──────────────────────────────────────────────────

const ExperienceRow = React.memo(function ExperienceRow({
  title,
  accent,
  channels,
  onPlay,
  onSeeAll,
  lang,
  index = 0,
}: {
  title: string;
  accent: string;
  channels: CatalogChannel[];
  onPlay: (ch: CatalogChannel) => void;
  onSeeAll?: () => void;
  lang: Lang;
  index?: number;
}) {
  const liveLabel = t(lang, 'liveLabel');
  // Small experiences (e.g. Movies = 3) render honestly — bigger cards, no
  // "See all", no padding to fake a fuller row.
  const isSmall = channels.length <= 4;
  const cardW = isSmall ? 158 : 130;
  const cardH = isSmall ? 112 : 96;

  return (
    <section className="mb-9" style={{ animation: 'row-in 0.55s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(index, 9) * 65}ms` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
          />
          <h2 className="text-[19px] font-black tracking-tight text-white truncate">{title}</h2>
          <span className="text-[10px] font-semibold text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded-full flex-shrink-0">
            {channels.length}
          </span>
        </div>
        {onSeeAll && !isSmall && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-[11px] text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          >
            {t(lang, 'seeAll')}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Horizontal channel strip */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
        {channels.map((ch) => (
          <button
            key={ch.stream_id}
            onPointerDown={() => tap()}
            onClick={() => onPlay(ch)}
            className="flex-shrink-0 group"
            style={{ width: cardW }}
          >
            <div
              className="relative rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.04] group-active:scale-[0.95]"
              style={{
                width: cardW,
                height: cardH,
                background: 'linear-gradient(157deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.012) 100%)',
                boxShadow: ch.free
                  ? '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1.5px rgba(34,197,94,0.55), 0 0 16px rgba(34,197,94,0.16)'
                  : '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.045)',
              }}
            >
              {/* per-experience accent sheen, top-lit */}
              <div className="absolute inset-x-0 top-0 h-2/3 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 85% 100% at 32% 0%, ${accent}26, transparent 72%)` }} />

              <ChannelIcon src={ch.icon} name={ch.name} size="md" />

              {/* LIVE dot — breathing on the shared rhythm */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${ch.free ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${ch.free ? 'bg-green-400' : 'bg-red-400'}`} style={{ boxShadow: ch.free ? '0 0 5px rgba(74,222,128,0.95)' : '0 0 5px rgba(248,113,113,0.9)' }} />
                </span>
                <span className="text-[7px] font-bold text-white/75 tracking-wide">{ch.free ? 'FREE' : liveLabel}</span>
              </div>

              {/* glassy play affordance on hover/press */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
                style={{ background: 'rgba(0,0,0,0.42)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(6px)' }}>
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>
            {/* FULL clean channel name — refined, wraps to 2 lines */}
            <p className="text-[10.5px] leading-tight text-white/60 text-center mt-1.5 px-0.5 line-clamp-2 font-medium tracking-tight group-hover:text-white/90 transition-colors">
              {cleanName(ch.name)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
});
