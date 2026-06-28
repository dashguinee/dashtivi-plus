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
import { HeroDeck, type HeroSlide } from '@/components/home/HeroDeck';
import { WorldCupBackdrop } from '@/components/home/WorldCupBackdrop';
import { TriondaBall, WcFlagBeam } from '@/components/home/TriondaBall';
import {
  getCatalog,
  getCatalogSync,
  buildCatalogUrl,
  EXPERIENCE_TO_CURATOR_ID,
  type Catalog,
  type CatalogChannel,
} from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { FreePill } from '@/components/ui/FreePill';
import { tap } from '@/lib/haptics';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';
import { setAmbientSpeed } from '@/lib/ambient-audio';
import { useWatchHistory, isInProgress, resumePosition } from '@/hooks/useWatchHistory';
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

// DASHtivi+ brand blue — the "+" flare. Electric royal blue that complements
// the violet. Used for premium accents + the "À l'instant" live indicator.
const DASH_BLUE = '#4F8DF7';

// Per-experience accent — one signature color per row. Green stays reserved
// for the FREE gift signal only.
const EXPERIENCE_ACCENT: Record<string, string> = {
  'World Cup': '#C026D3',
  'Sports': '#C026D3',
  'Movies': '#9D4EDD',
  'Entertainment': '#C77DFF',
  'Français': '#3B82F6',
  'African': '#F97316',
  'Arabic': '#14B8A6',
  'Kids': '#EC4899',
  'News': '#EF4444',
  'Documentary': '#A78BFA',
  '4K Showcase': DASH_BLUE,
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

  // The mid-feed cinema beat — the "Made in Hollywood" live video card, surfaced
  // for EVERYONE (the free pool loads for all; only the grid below is gated).
  // Tapping the frame goes to Movies.
  const hollywoodFeature = useMemo<FreeHlsChannel | null>(() => {
    if (!freeHls || freeHls.channels.length === 0) return null;
    return freeHls.channels.find((c) => c.id === 'free-2339' || /hollywood/i.test(c.name)) || null;
  }, [freeHls]);

  // ── Play a channel, with the full row as playlist context (next/prev) ──
  const play = useCallback((ch: CatalogChannel, row: CatalogChannel[]) => {
    if (row.length > 1) {
      setPlaylist(row.map((c) => toChannel(c, credentials)));
    }
    const channel = toChannel(ch, credentials);
    setCurrentChannel(channel.id);
    onPlay(channel);
  }, [credentials, onPlay]);

  // ── Ambient bloom drift — the bloom is alive: it wanders organically around
  // its center, and its motion mirrors the user's energy. Scrolling feeds a
  // decaying "energy" value; drift speed + amplitude both scale with it, so it
  // moves while you scroll and settles to rest when idle. ONE rAF loop,
  // transform-only per frame (no layout/paint/opacity), and it SLEEPS fully
  // when idle or the tab is hidden — resuming on the next scroll. Visuals
  // (color/size/position/gradient) are never touched, only the drift transform.
  // MUST stay ABOVE the loading-skeleton early return so this hook runs on
  // EVERY render (cold/null-catalog included) — no conditional hooks (React #310).
  const bloomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bloomRef.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let energy = 0;            // 0 = at rest, 1 = actively scrolling
    let t = 0;                 // organic phase clock (faster when energetic)
    let last = performance.now();
    let raf = 0;
    let running = false;

    const AMP_X = 13, AMP_Y = 9, SCALE = 0.012; // small — a whisper, not a lamp

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp tab-switch jumps
      last = now;

      // Energy decays toward 0 when no scroll feeds it (~0.7s gentle tail).
      energy = Math.max(0, energy - dt * 1.45);
      // Phase advances; slow drift when calm, livelier while scrolling.
      t += dt * (0.25 + energy * 1.4);

      // Organic wander = sum of detuned sines → a non-mechanical path.
      const nx = (Math.sin(t * 0.62) + 0.5 * Math.sin(t * 1.13 + 1.3)) / 1.5;
      const ny = (Math.cos(t * 0.51) + 0.5 * Math.sin(t * 0.91 + 0.7)) / 1.5;
      const a = energy; // amplitude tracks energy → idle settles to center

      const dx = (nx * AMP_X * a).toFixed(2);
      const dy = (ny * AMP_Y * a).toFixed(2);
      const sc = (1 + SCALE * a).toFixed(4);
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sc})`;

      if (energy <= 0.001) {
        // Fully settle, then SLEEP (battery). Next scroll wakes it.
        el.style.transform = 'translate3d(0,0,0) scale(1)';
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    // Scroll handler stays O(1): feed energy, (re)start the loop. capture:true
    // catches inner scroll containers too (scroll doesn't bubble).
    const onScroll = () => {
      energy = Math.min(1, energy + 0.34);
      start();
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else if (energy > 0.001) {
        start();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

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

  // ── Hero deck — World Cup first, then each non-empty experience in order,
  // capped at 10 (HeroDeck enforces the cap + skips empties too). Each slide
  // carries its own accent. 'Movies' shows as "Cinéma Live" to match the row.
  const heroSlides: HeroSlide[] = [];
  if (worldcup.length > 0) {
    heroSlides.push({
      key: 'World Cup',
      title: 'World Cup',
      accent: EXPERIENCE_ACCENT['World Cup'],
      channels: worldcup,
      onPlay: (ch) => play(ch, worldcup),
      onSeeAll: () => navigate('/live/sports'),
    });
  }
  for (const experience of catalog.experienceOrder) {
    if (experience === 'World Cup') continue; // already the lead slide
    const chans = catalog.byExperience[experience] || [];
    if (chans.length === 0) continue;
    const seeAllId = EXPERIENCE_TO_CURATOR_ID[experience];
    heroSlides.push({
      key: experience,
      title: experience === 'Movies' ? 'Cinéma Live' : experience,
      accent: EXPERIENCE_ACCENT[experience] || '#9D4EDD',
      channels: chans,
      onPlay: (ch) => play(ch, chans),
      onSeeAll: seeAllId ? () => navigate(`/live/${seeAllId}`) : undefined,
    });
  }

  return (
    <div className="pt-16 pb-48">
      {/* Ambient bloom — a soft blue-white halo that lifts the dark canvas.
          ONE fixed, composited radial: GPU-cheap, no blur filter, no per-tile
          cost. It DRIFTS organically (transform-only) — alive, mirroring the
          user's energy (see the rAF loop above). Visuals untouched. */}
      <div
        ref={bloomRef}
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          willChange: 'transform',
          background:
            'radial-gradient(62% 40% at 50% 38%, rgba(79,141,247,0.10) 0%, rgba(255,255,255,0.05) 30%, transparent 70%)',
        }}
      />

      {/* TOP ZONE — relative shell so the World Cup backdrop sits BEHIND the
          hero deck + WC/Sports lead only, fading out before the rest. */}
      <div className="relative">
        <WorldCupBackdrop />

        <div className="relative z-10">
      {/* TOP HERO — the strongest live pick auto-plays at the top for everyone,
          calm, no click. FreeHlsShowcaseCard owns the one live <video> surface. */}
      {helloChannel && (
        <section className="mb-8">
          <div className="px-4 mb-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: DASH_BLUE }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: DASH_BLUE, boxShadow: '0 0 6px rgba(79,141,247,0.8)' }} />
            </span>
            <span className="text-[10px] font-black tracking-[2.5px] uppercase" style={{ color: '#93B8FF' }}>
              {lang === 'fr' ? 'À l’instant' : 'Right now'}
            </span>
          </div>
          <FreeHlsShowcaseCard channel={helloChannel} onSurf={surfHello} priority />
        </section>
      )}

      {/* ── The hero deck — swipe horizontally to glide through one cinematic
          hero per category (World Cup first), each with its own accent.
          Independent of the top hero above. ── */}
      {heroSlides.length > 0 && (
        <HeroDeck slides={heroSlides} lang={lang} />
      )}
        </div>
      </div>

      {/* ── The curated experiences, in experience_order, exact names ─── */}
      <div className="mt-5">
        {(() => {
          let rendered = 0;
          return catalog.experienceOrder.map((experience, idx) => {
          const channels = catalog.byExperience[experience] || [];
          if (channels.length === 0) return null;
          // Rendered position (skips empty collections) — anchors the featured
          // beat + breathers robustly, no matter which raw slots are empty.
          const rpos = rendered++;
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
                title={
                  experience === 'Movies'
                    ? 'Cinéma Live'
                    : experience === 'World Cup'
                      ? 'World Cup'
                      : experience
                }
                worldCup={experience === 'World Cup'}
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
              {/* Keep Watching — woven MID-FEED after the 2nd rendered row.
                  In-progress movies/series, tap resumes (#4). Renders nothing
                  when there's nothing to resume, so the slot stays clean. */}
              {rpos === 1 && <KeepWatchingRow onPlay={onPlay} lang={lang} />}
              {/* ── The "Featured Destination" gateway — ONE curated district at a
                  time (see `featured` below), tapping THROUGH to it. Anchored to the
                  3rd RENDERED row (rpos), so empty collections can't skip it. ── */}
              {rpos === 2 && hollywoodFeature && (
                /* The mid-feed cinema beat — the live "Made in Hollywood" VIDEO
                   card auto-plays when it scrolls on-screen; tapping it opens the
                   SAME free-HLS stream in the full player. We hand onPlay a
                   free-HLS Channel that carries the channel's own direct .m3u8 url
                   (NOT a proxy/catalog url), with category 'live' — the exact
                   shape the free-gem row tiles use, so usePlayer routes it through
                   createHlsPlayer (free path), never the premium proxy path.
                   (No `reveal` wrapper: it's conditionally mounted, so the global
                   reveal observer never catches it; the card animates itself.) */
                <div className="mb-9">
                  <FreeHlsShowcaseCard
                    channel={hollywoodFeature}
                    bare
                    onClick={() => onPlay({
                      id: hollywoodFeature.id,
                      name: hollywoodFeature.name,
                      url: hollywoodFeature.url,
                      logo: hollywoodFeature.logo,
                      category: 'live',
                    })}
                  />
                </div>
              )}
              {/* Breathing beat — an INTENTIONAL mental-reset after every 2
                  collections (restrained hairline + air), NOT the accidental
                  wide cache-gap. Skips the idx-3 slot (FeaturedDestination is
                  already its own beat there). */}
              {rpos % 2 === 1 && (
                <div className="h-9 flex items-center justify-center" aria-hidden>
                  <div className="w-8 h-px rounded-full bg-white/[0.07]" />
                </div>
              )}
            </React.Fragment>
          );
          });
        })()}
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
              style={{ background: '#9D4EDD', boxShadow: '0 0 6px rgba(157,78,221,0.6)' }}
            />
            <h2 className="text-[19px] font-black tracking-tight text-white">
              {lang === 'fr' ? 'VOYO · Son africain' : 'VOYO · African sound'}
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

      {/* EXPLORATION beat — Movies with auto-playing trailers. A little vertical
          breathing room so Films à la Une + the VOYO sections aren't cramped. */}
      <div className="py-4">
        <MoviesExploration credentials={credentials} onPlay={onPlay} featured={isFree ? 3 : 2} />
      </div>

      {/* PREMIUM: the village, embedded SUBTLY — restraint = premium. No neon
          grid; just a low-key, calm door into BOTH Oyé Africa + Stations (both
          must be reachable for premium too, just quietly). */}
      {isPremium && (
        <section className="px-4 mt-6 mb-3">
          <div className="flex items-center gap-2 mb-3.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#9D4EDD', boxShadow: '0 0 6px rgba(157,78,221,0.55)' }}
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

// ── Keep Watching ───────────────────────────────────────────────────
// In-progress movies/series with a saved position (not finished). Tapping a
// card resumes from where the member left off (the player reads the same watch
// history via getResume). Reuses the row grammar; portrait-leaning poster cards
// with a thin progress bar. Renders null when there's nothing to resume.
function KeepWatchingRow({ onPlay, lang }: { onPlay: (ch: Channel) => void; lang: Lang }) {
  const { history } = useWatchHistory();
  const items = useMemo(
    () => history.filter((e) => isInProgress(e) && !!e.url).slice(0, 14),
    [history]
  );
  if (items.length === 0) return null;

  const accent = '#9D4EDD';
  const cardW = 150;
  const cardH = 96;

  return (
    <section className="mb-9">
      <div className="flex items-center justify-between px-4 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          <h2 className="text-[19px] font-black tracking-tight text-white truncate">
            {lang === 'fr' ? 'Reprendre' : 'Keep Watching'}
          </h2>
          <span className="tivi-count-metal text-[8px] font-bold flex-shrink-0" style={{ letterSpacing: '0.5px' }}>
            {items.length}
          </span>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
        {items.map((e) => {
          const total = e.totalDuration ?? 0;
          const pos = resumePosition(e);
          const pct = total > 0 ? Math.min(100, Math.max(3, (pos / total) * 100)) : 0;
          return (
            <button
              key={e.channelId}
              onPointerDown={() => tap()}
              onClick={() =>
                onPlay({
                  id: e.channelId,
                  name: e.name || '',
                  url: e.url || '',
                  logo: e.logo,
                  category: e.category,
                  knownDuration: e.totalDuration,
                })
              }
              className="flex-shrink-0 group"
              style={{ width: cardW }}
            >
              <div
                className="relative rounded-2xl overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.04] group-active:scale-[0.95]"
                style={{
                  width: cardW,
                  height: cardH,
                  background: 'linear-gradient(157deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.012) 100%)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.045)',
                }}
              >
                {e.logo && (
                  <img src={e.logo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" loading="lazy" />
                )}
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, rgba(6,6,9,0.85) 100%)` }} />

                {/* Resume affordance on hover/press */}
                <div className="absolute inset-0 z-[3] flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0,0,0,0.42)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(6px)' }}>
                    <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                  </div>
                </div>

                {/* Resume progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15 z-[2]">
                  <div className="h-full rounded-r-full" style={{ width: `${pct}%`, background: accent, boxShadow: `0 0 6px ${accent}` }} />
                </div>
              </div>
              <p className="text-[10.5px] leading-tight text-white/60 text-center mt-1.5 px-0.5 line-clamp-2 font-medium tracking-tight group-hover:text-white/90 transition-colors">
                {cleanName(e.name || '')}
              </p>
            </button>
          );
        })}
      </div>
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
  worldCup = false,
}: {
  title: string;
  accent: string;
  channels: CatalogChannel[];
  onPlay: (ch: CatalogChannel) => void;
  onSeeAll?: () => void;
  lang: Lang;
  index?: number;
  /** World Cup row — show the spinning TRIONDA ball icon + picked-flag beam. */
  worldCup?: boolean;
}) {
  // Small experiences (e.g. Movies = 3) render honestly — bigger cards, no
  // "See all", no padding to fake a fuller row.
  const isSmall = channels.length <= 4;
  const cardW = isSmall ? 158 : 130;
  const cardH = isSmall ? 112 : 96;

  // ── Continuous reveal (Bug #6) ────────────────────────────────────────────
  // No "Load More" text. A long row starts partly rolled out; a soft portal-beam
  // end-cap sits at the row's tail. Scrolling into it auto-reveals the next batch
  // (the beam pulses while more remain). Once everything's out, the beam becomes
  // a gentle "carry-on" affordance that taps THROUGH to the full experience — so
  // reaching the end never dead-ends.
  const INITIAL = 12;
  const STEP = 12;
  const [shown, setShown] = useState(() => Math.min(channels.length, INITIAL));
  const hasMore = shown < channels.length;
  const stripRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stripRef.current;
    const target = beamRef.current;
    if (!root || !target) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && shown < channels.length) {
          setShown((s) => Math.min(channels.length, s + STEP));
        }
      },
      { root, threshold: 0.6, rootMargin: '0px 240px 0px 0px' }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [shown, channels.length]);

  const visibleChannels = channels.slice(0, shown);

  return (
    <section className="mb-9 cv-row" style={{ animation: 'row-in 0.55s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(index, 9) * 65}ms` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {worldCup ? (
            // The REAL interactive TRIONDA 3D ball (drag to spin) replaces the
            // dot/⚽. The ball itself = spin-only; its sibling "Your team" pill
            // opens the African-team picker pop. Picked flag rides an orbiting beam.
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <TriondaBall size="icon" px={64} />
              <WcFlagBeam size={26} />
            </span>
          ) : (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
            />
          )}
          <h2 className="text-[19px] font-black tracking-tight text-white truncate">{title}</h2>
          <span className="tivi-count-metal text-[8px] font-bold flex-shrink-0" style={{ letterSpacing: '0.5px' }}>
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
      <div ref={stripRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
        {visibleChannels.map((ch) => {
          return (
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
              <div className="absolute inset-x-0 top-0 h-2/3 pointer-events-none z-[1]"
                style={{ background: `radial-gradient(ellipse 85% 100% at 32% 0%, ${accent}26, transparent 72%)` }} />

              <ChannelIcon src={ch.icon} name={ch.name} size="md" />

              {/* LIVE dot — breathing on the shared rhythm */}
              <div className="absolute top-1.5 left-1.5 z-[2] flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${ch.free ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${ch.free ? 'bg-green-400' : 'bg-red-400'}`} style={{ boxShadow: ch.free ? '0 0 5px rgba(74,222,128,0.95)' : '0 0 5px rgba(248,113,113,0.9)' }} />
                </span>
              </div>

              {/* Neon-green FREE pill — the free-gift identity (bottom-left). */}
              {ch.free && (
                <div className="absolute bottom-1.5 left-1.5 z-[2]">
                  <FreePill />
                </div>
              )}

              {/* Language pill — premium, subtle, faded (top-right) */}
              {ch.language && (
                <div className="absolute top-1.5 right-1.5 z-[2] px-1 py-[1px] rounded-md"
                  style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <span className="text-[7px] font-bold tracking-[1px] text-white/40">{ch.language}</span>
                </div>
              )}

              {/* glassy play affordance on hover/press */}
              <div className="absolute inset-0 z-[3] flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
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
          );
        })}

        {/* ── Portal-beam end-cap (Bug #6) — no "Load More" text. ──
            • more left → a soft purple beam that pulses; scrolling into it
              auto-reveals the next batch (the IntersectionObserver above).
            • all out → a gentle carry-on chevron that taps THROUGH to the full
              experience, so the row never dead-ends. */}
        {(hasMore || onSeeAll) && (
          <div
            ref={beamRef}
            onClick={() => { if (!hasMore && onSeeAll) onSeeAll(); }}
            className={`flex-shrink-0 flex items-center justify-center ${!hasMore && onSeeAll ? 'cursor-pointer group' : ''}`}
            style={{ width: hasMore ? 64 : 84, height: cardH }}
            aria-hidden={hasMore}
          >
            <div className="relative h-full flex items-center">
              {/* vertical portal beam */}
              <div
                className="w-[3px] rounded-full"
                style={{
                  height: '62%',
                  background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
                  boxShadow: `0 0 12px ${accent}`,
                  animation: hasMore ? 'beam-pulse 1.3s ease-in-out infinite' : 'none',
                  opacity: hasMore ? 1 : 0.55,
                }}
              />
              {!hasMore && onSeeAll && (
                <ChevronRight
                  className="w-5 h-5 ml-2 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-[color,transform] duration-200"
                  style={{ filter: `drop-shadow(0 0 5px ${accent}80)` }}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes beam-pulse { 0%,100% { opacity:0.45; transform:scaleY(0.85); } 50% { opacity:1; transform:scaleY(1.12); } }`}</style>
    </section>
  );
});
