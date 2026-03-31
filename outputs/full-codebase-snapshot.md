# DashTivi+ Full Codebase Snapshot
Generated: 2026-03-29

---

## FILE: /home/dash/tivi-plus/src/App.tsx
195 lines

```tsx
import React, { useState, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { AccessCodeLogin } from '@/components/ui/AccessCodeLogin';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/hooks/useAuth';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { getItem, setItem } from '@/lib/storage';
import { setCurrentChannel } from '@/lib/playlist';
import { startPreload, preloadApiData } from '@/lib/preloader';
import { playDashCinemaSound } from '@/lib/cinema-sound';
import { muteAmbient, unmuteAmbient, startAmbient, isAmbientEnabled, getAmbientPulse, initAudioReactive } from '@/lib/ambient-audio';
import { LanguageProvider } from '@/i18n';
import type { Channel } from '@/types';

// Start preloading immediately on script load — before React even mounts
startPreload();

// Lazy load pages
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LiveTVPage = lazy(() => import('@/pages/LiveTVPage').then((m) => ({ default: m.LiveTVPage })));
const MoviesPage = lazy(() => import('@/pages/MoviesPage').then((m) => ({ default: m.MoviesPage })));
const SeriesPage = lazy(() => import('@/pages/SeriesPage').then((m) => ({ default: m.SeriesPage })));
const FrenchPage = lazy(() => import('@/pages/FrenchPage').then((m) => ({ default: m.FrenchPage })));
const WelcomePage = lazy(() => import('@/pages/WelcomePage').then((m) => ({ default: m.WelcomePage })));
const PlatformsPage = lazy(() => import('@/pages/PlatformsPage').then((m) => ({ default: m.PlatformsPage })));

function AppContent() {
  const { credentials, logout } = useAuth();
  const player = usePlayer();
  const { addToHistory } = useWatchHistory();
  const ambientStartedRef = React.useRef(false);

  const [showFullPlayer, setShowFullPlayer] = useState(false);

  const handleAmbientStart = React.useCallback(() => {
    if (!ambientStartedRef.current && isAmbientEnabled()) {
      ambientStartedRef.current = true;
      startAmbient();
    }
  }, []);

  const handlePlayChannel = useCallback(
    (channel: Channel) => {
      const isVod = channel.category === 'movie' || channel.category === 'series';
      if (isVod) playDashCinemaSound();
      muteAmbient();
      player.playChannel(channel);
      addToHistory(channel);
      setCurrentChannel(channel.id);
      setShowFullPlayer(true);
    },
    [player, addToHistory]
  );

  const handleClosePlayer = useCallback(() => {
    unmuteAmbient();
    setShowFullPlayer(false);
  }, []);

  const handleStopPlayer = useCallback(() => {
    unmuteAmbient();
    setShowFullPlayer(false);
    player.stop();
  }, [player]);

  const handleExpandMini = useCallback(() => {
    setShowFullPlayer(true);
  }, []);

  // Ambient blobs — organic morphing glow + audio-reactive scale
  const blobsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    initAudioReactive();
    let running = true;
    let isVisible = false;
    const animate = () => {
      if (!running) return;
      const el = blobsRef.current;
      if (el) {
        const shouldShow = window.scrollY > 80;
        if (shouldShow && !isVisible) {
          el.style.opacity = '1';
          isVisible = true;
        } else if (!shouldShow && isVisible) {
          el.style.opacity = '0';
          isVisible = false;
        }
        if (isVisible) {
          const pulse = getAmbientPulse();
          el.style.transform = `translateX(-50%) scale(${1.0 + pulse * 0.03})`;
        }
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, []);

  if (!credentials) return null;

  return (
    <div className="min-h-screen bg-bg relative" onClick={handleAmbientStart}>
      <CosmicBackground />
      <div ref={blobsRef} className="ambient-blobs">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>
      <div className="relative z-10">
        <Header onLogout={logout} />
        <Navbar />
        <main className="pb-20 lg:pb-0 lg:pl-[72px]">
          <ErrorBoundary>
            <Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/live" element={<LiveTVPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/movies" element={<MoviesPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/series" element={<SeriesPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/french" element={<FrenchPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="/originals" element={<PlatformsPage credentials={credentials} onPlay={handlePlayChannel} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        {showFullPlayer && player.state.channel && (
          <VideoPlayer state={player.state} videoRef={player.videoRef} containerRef={player.containerRef}
            onTogglePlay={player.togglePlay} onToggleMute={player.toggleMute} onVolumeChange={player.setVolume}
            onToggleFullscreen={player.toggleFullscreen} onTogglePiP={player.togglePiP}
            onQualityChange={(_quality: string, _index: number) => { if (player.state.channel) handlePlayChannel(player.state.channel); }}
            onClose={handleClosePlayer} onRetry={handlePlayChannel} onBack={handleClosePlayer} onSeek={player.seek} />
        )}
        <MiniPlayer state={player.state} videoRef={player.videoRef} onTogglePlay={player.togglePlay}
          onClose={handleStopPlayer} onExpand={handleExpandMini} visible={!showFullPlayer && !!player.state.channel} />
        {!showFullPlayer && player.state.channel && (
          <video ref={player.videoRef as React.RefObject<HTMLVideoElement>} className="fixed -top-[9999px] -left-[9999px] w-1 h-1" playsInline autoPlay />
        )}
      </div>
    </div>
  );
}

function AppRouter() {
  const [showSplash, setShowSplash] = useState(() => !getItem<boolean>('splash_seen_plus', false));
  const auth = useAuth();
  const location = useLocation();

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setItem('splash_seen_plus', true);
    if (isAmbientEnabled()) startAmbient();
  }, []);

  if (location.pathname === '/welcome') {
    return (<Suspense fallback={<FullPageLoader />}><WelcomePage /></Suspense>);
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && !auth.isAuthenticated && (
        <AccessCodeLogin onLogin={async (code) => { if (isAmbientEnabled()) startAmbient(); return auth.login(code); }} />
      )}
      {auth.isAuthenticated && (() => {
        if (auth.credentials) {
          preloadApiData((import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim(), auth.credentials.username, auth.credentials.password);
        }
        return <AppContent />;
      })()}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </LanguageProvider>
  );
}
```

---

## FILE: /home/dash/tivi-plus/src/i18n.tsx (structure — first 50 + last 50 lines)
757 lines

```tsx
// FIRST 50 LINES:
export type Lang = 'fr' | 'en'

const translations = {
  fr: {
    // -- Navigation
    navHome: 'Accueil',
    navLiveTV: 'TV Direct',
    navMovies: 'Films',
    navSeries: 'Séries',
    navWorldEX: 'WorldEX',
    navFrench: 'Français',
    // -- Header
    welcome: 'Bienvenue',
    muteAmbient: 'Couper le son ambiant',
    playAmbient: 'Jouer le son ambiant',
    logout: 'Déconnexion',
    poweredBy: 'Propulsé par',
    // -- Access Code Login
    premiumStreaming: 'Streaming Premium',
    accessCode: "Code d'accès",
    accessCodePlaceholder: 'DASH-SL-001',
    enter: 'Entrer',
    verifying: 'Vérification',
    enterCodeFromDash: "Entrez le code de votre abonnement DASH",
    pleaseEnterCode: "Veuillez entrer votre code d'accès",
    invalidCode: "Code d'accès invalide",
    connectionError: 'Erreur de connexion — vérifiez votre internet',
    // -- Welcome Page
    signIn: 'Se connecter',
    showmaxBadge: 'Showmax a fermé. Pas nous.',
    heroTitle1: 'Showmax a disparu.',
    heroTitle2: 'Votre streaming continue.',
    heroSubtitle: '60 000+ films. 11 000 chaînes en direct. Bandes-annonces YouTube. Sélections IA.',
    heroPrice: 'À partir de 3$/mois.',
    heroCTA: 'Commencez — 48h gratuites',
    heroFooter: 'Pas de carte bancaire. Pas de parabole. Juste votre téléphone.',
    veeSmartPicks: 'VEE Smart Picks',
    veeSmartPicksDesc: "L'IA apprend vos goûts et personnalise votre flux",
    youtubeTrailers: 'Bandes-annonces YouTube',
    youtubeTrailersDesc: 'Découvrez chaque film avant de le regarder',
    worksOn3G: 'Fonctionne en 3G',
    worksOn3GDesc: 'Mode éco pour toute connexion',
    whatsStreaming: 'Que regarder maintenant',
    whatsStreamingDesc: 'Films, séries, TV en direct — tout au même endroit',
    first48Free: '48 premières heures gratuites',
    perMonth: '/mois',
    pricingDesc: 'Orange Money • Annulez quand vous voulez • Tous les appareils',
    // ... ~300 more fr keys ...

// LAST 50 LINES:
export type TranslationKey = keyof typeof translations.fr

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key]
}

export function detectLang(): Lang {
  const stored = localStorage.getItem('tivi-lang')
  if (stored === 'en' || stored === 'fr') return stored
  const nav = navigator.language.toLowerCase()
  return nav.startsWith('fr') ? 'fr' : nav.startsWith('en') ? 'en' : 'fr'
}

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface LanguageContextValue {
  lang: Lang
  t: (key: TranslationKey) => string
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang)
  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'fr' ? 'en' : 'fr'
      localStorage.setItem('tivi-lang', next)
      return next
    })
  }, [])
  const translate = useCallback(
    (key: TranslationKey) => translations[lang][key],
    [lang]
  )
  return (
    <LanguageContext.Provider value={{ lang, t: translate, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
```

---

## FILE: /home/dash/tivi-plus/index.html
31 lines

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/tivi-icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0A0A0A" />
    <meta name="description" content="DashTivi+ — Premium Streaming. Live TV, Movies, Series." />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="DashTivi+" />
    <link rel="apple-touch-icon" href="/tivi-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="dns-prefetch" href="https://stream.zionsynapse.online" />
    <link rel="preconnect" href="https://stream.zionsynapse.online" crossorigin />
    <link rel="preconnect" href="https://image.tmdb.org" crossorigin />
    <link rel="dns-prefetch" href="https://image.tmdb.org" />
    <link rel="preconnect" href="https://mclbbkmpovnvcfmwsoqt.supabase.co" crossorigin />
    <link rel="dns-prefetch" href="https://datahub11.com" />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>DashTivi+ — Premium Streaming</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://stream.zionsynapse.online https://mclbbkmpovnvcfmwsoqt.supabase.co https://datahub11.com https://image.tmdb.org https://cdn.jsdelivr.net *.r2.cloudflarestorage.com; img-src * data:; media-src *; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://piped.video https://inv.nadeko.net;" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## FILE: /home/dash/tivi-plus/src/pages/HomePage.tsx
1368 lines

[Full content captured in reading session — 1368 lines covering: time-aware hero banner, Continue Watching row, VeeWidget smart picks, FeedSection, PlatformShowcase, Because You Watched (firefly glow), Sports Break section, Hottest Fixtures (glowing circles), Discover Sports (tabbed), DASH Exclusives (cinema ticket cards), Dynamic Collection Rows, SectionHeader renderer, CollectionRow renderer for live/smart-vod/vod/series types]

Key architecture: Props-driven `{ credentials, onPlay }`. Lazy-loads smart rows after main content. Shared `categoryCache` ref prevents duplicate API fetches. `useScrollReveal` + `useScrollFocus` hooks drive the reveal/focus-lens systems. All rows use `data-focus-lens` + `scroll-smooth-x` for the scroll-focus glow effect.

---

## FILE: /home/dash/tivi-plus/src/pages/LiveTVPage.tsx (first 100 lines + render architecture)
761 lines

[Full content captured — imports, theme system with LIVETV_THEMES + THEME_SUBTYPES, search across Xtream + free channels, smart theme ordering via intelligence.ts, probe staleness detection, Browse mode with category sidebar, handlePlayFromList with playlist context and theme affinity recording]

---

## FILE: /home/dash/tivi-plus/src/pages/MoviesPage.tsx
552 lines

[Full content captured — complete file. Two-level tab navigation (MOVIE_TABS parent -> subtabs), TMDB-powered genre filtering, smart/rating/newest/name sort modes, trending row, moment pack rows (time-aware), progressive pagination (PAGE_SIZE=50), search with debounce, ContentDetailModal integration]

---

## FILE: /home/dash/tivi-plus/src/pages/SeriesPage.tsx (first 80 lines)
[Structure mirrors MoviesPage — SERIES_TABS, same genre/sort pattern, TMDB enrichment, mood row mapping]

---

## FILE: /home/dash/tivi-plus/src/pages/FrenchPage.tsx (first 100 lines + render)
520 lines

[Full content captured — WorldEX region portals (11 regions: Motherland, Sahara, Isles, Europe, South Asia, Crescent, USA, Persian, Pacific, Americas, Always On), region genre filters, free channel merging per culture, probe-based alive filtering]

---

## FILE: /home/dash/tivi-plus/src/pages/WelcomePage.tsx (first 50 lines)
356 lines

[Structure captured — public landing page with Showmax positioning, genre cards animation, login form with code prefill from URL params, feature cards (VEE Smart Picks, YouTube Trailers, Works on 3G), pricing section]

---

## FILE: /home/dash/tivi-plus/src/components/layout/Navbar.tsx
239 lines

```tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Clapperboard, PlayCircle, Globe } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';

interface NavItem {
  path: string;
  labelKey: TranslationKey;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number }>;
  isLive?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'navHome', icon: Home },
  { path: '/live', labelKey: 'navLiveTV', icon: Tv, isLive: true },
  { path: '/movies', labelKey: 'navMovies', icon: Clapperboard },
  { path: '/series', labelKey: 'navSeries', icon: PlayCircle },
  { path: '/french', labelKey: 'navWorldEX', icon: Globe },
];

// Mobile: fixed bottom nav bar (62px, rounded-2xl, backdrop-blur-2xl)
// Desktop: collapsible sidebar (72px collapsed, 220px expanded)
// Nav glow effect on tap (2s purple glow fade)
// Live TV gets animated pulse dot
// Active: icon lifts up, label fades in, bottom dot indicator
// Desktop active: left accent bar (3px, gradient purple)
```

---

## FILE: /home/dash/tivi-plus/src/components/layout/Header.tsx
110 lines

```tsx
// Fixed top header, z-40
// Home page: transparent gradient (from-black/60 via-black/30 to-transparent)
// Other pages: solid bg (rgba(10,10,10,0.95)) with border — PERF FIX: no backdrop-filter on non-home
// Logo: "DASH" (Space Grotesk 20px black) + "tivi" (Outfit 16px light white/40) + "+" (primary-light 13px bold)
// Welcome text: center-positioned, 12px, tracking-[5px], blink animation 6s
// Ambient toggle: custom SVG waveform (animated pulse when on, flat line when off)
// LangToggle + Logout button
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/PosterCard.tsx
180 lines

```tsx
// Memo'd component with Xtream -> TMDB poster fallback chain
// Platform badges (Netflix N, Prime, HBO, Disney+ D+, Apple tv+, Hulu, Starz, Paramount+)
// Platform logos for Netflix/Prime (3D renders)
// Image: safeImageUrl -> TMDB w342 fallback -> gradient fallback with title
// Bottom info: star rating (yellow), clean title, year, runtime (Clock icon)
// Trailer button: Clapperboard icon, bottom-left
// Interaction: card-press hover:scale-[1.03] active:scale-[0.96]
// Image loading: img-settle class (opacity 0 -> 1, scale 0.995 -> 1, 1.2s ease-out)
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/HexCard.tsx (first 50 lines)
[Structure: SVG hexagonal cards with 5 variants (netflix/dash/sports/club/discover), each with custom glow/accent/inner/border palettes. Club-specific colors for Liverpool, Man City, Man United, Arsenal, Chelsea, Barcelona, Real Madrid, PSG, Bayern, Juventus. Soft hex path with quadratic bezier rounded corners.]

---

## FILE: /home/dash/tivi-plus/src/components/ui/PlatformShowcase.tsx
208 lines

```tsx
// 6 platforms: Netflix, Prime, HBO, Disney+, Apple TV+, Hulu
// Each card: 240px wide, brand gradient fill, metallic beam sweep border animation
// Netflix special: bottom red gradient accent
// 3 poster previews per platform with Xtream -> TMDB fallback
// Bottom brand glow line
// Animation: platform-card-in 0.9s with staggered delays (120ms per card)
// Interaction: card-press hover:scale-[1.02] active:scale-[0.97]
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/FeedSection.tsx
378 lines

```tsx
// Curated community feed from Supabase + TMDB trending + live moments
// Card types: trending (TMDB poster), live_moment (gradient bg), newsletter, announcement
// Card shape: tucked bottom edges (clipPath: polygon with 4% inset)
// Overlay on tap: slide-up content panel with blurred image peek
// Accordion below card: OYE (Flame) + LOVE (Heart) reactions, local storage persistence
// Reaction glow animation on tap (400ms)
// 30min cache with localStorage
// Show More card (140px wide)
// Horizontal scroll with scroll-smooth-x
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/VeeWidget.tsx (first 80 lines)
[Structure: AI-powered movie recommendation widget. Hot (trending by rating) + Explore (mood-filtered) tabs. Mood overlay with genre-based filtering against TMDB data. Color interpolation (red->blue) for Hot/Explore slider. Gradient fallback backgrounds for poster-less items.]

---

## FILE: /home/dash/tivi-plus/src/components/ui/CosmicBackground.tsx
87 lines

```tsx
// Fixed full-screen background, z-0, pointer-events-none
// Canvas star field: max 120 stars, upward drift (speed 0.02-0.17), flicker via sin()
// Star color: rgba(200, 180, 255, flicker) — purple-tinted
// Aurora band: top 40vh, primary/[0.03] gradient
// Bottom ambient: 30vh, accent/[0.02] gradient
// Orbs removed — ambient blobs in App.tsx handle glow now
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/SplashScreen.tsx
63 lines

```tsx
// 4-phase animation: dark(0) -> brand(500ms) -> ready(3500ms) -> exit(4500ms) -> complete(5200ms)
// Failsafe timeout at 10000ms
// Purple pulse: radial gradient, expands from scale(0) to scale(1.5)
// Wordmark: "DASH" (Space Grotesk 36px) + "tivi" (Outfit 26px) + "+" (primary-light 18px)
// Loading bar: 12px wide, 2px tall, primary/40, loading-bar animation 1.5s
// Exit: opacity 0, duration 700ms
// Background: #060609
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/LangToggle.tsx
16 lines

```tsx
// 9x9 rounded-xl glass-light button
// Shows "EN" when lang=fr, "FR" when lang=en
// 11px font-bold tracking-wide text-white/50
```

---

## FILE: /home/dash/tivi-plus/src/components/ui/LoadingSpinner.tsx
55 lines

```tsx
// LoadingSpinner: sm/md/lg sizes, dual-ring (border-bg-elevated + border-t-primary spin)
// FullPageLoader: fixed inset-0, z-50, #060609 bg, DASHtivi+ wordmark + loading-bar
// SkeletonCard: skeleton class (shimmer animation)
// SkeletonRow: skeleton title bar + 6 skeleton cards in flex row
```

---

## FILE: /home/dash/tivi-plus/src/lib/collections.ts
~500 lines

```
Types: Collection, SmartCollection, CollectionCard, FeaturedHero, LiveTheme, SportType, RegionGenre

HOMEPAGE_COLLECTIONS (7 rows):
  1. fresh-movies (vod) — 749, 597 — limit 15
  2. live-sports (live) — beIN, Sky, 4K, Football, EPL — limit 15
  3. kids-family (live) — UK Kids, Kids — limit 15
  4. k-drama-turkish (series) — Korean, Turkish — limit 15
  5. news-world (live) — English News, UK News, Arabic News — limit 12
  6. cinema-4k (vod) — 4K, Blockbuster — limit 15
  7. world-cinema (live) — France, Germany, MBC Arabic, India — limit 15

COLLECTION_CARDS (8 pills): Sports, Movies, News, Africa, Series, Kids, Music, Faith

getFeaturedHero() — time-aware:
  6-12: Good Morning (blue gradient, -> /live)
  12-18: Afternoon Escape (amber gradient, -> /movies)
  18-23: Prime Time (primary gradient, -> /live)
  23-6: Late Night (indigo gradient, -> /series)

LIVETV_THEMES (9 themes): Sports, Entertainment, News, Kids, Movie Channels, Faith, Music, Premium 4K, Docs
  Each with categoryIds, gradient, glowColor

SPORT_TYPES (11 sub-tabs): All, Football Non-Stop, beIN Zone, Sky Sports, Cricket, NFL, Fans Space, African Football, Racing, Rugby, More
ENTERTAINMENT_TYPES (7): All, UK Lounge, USA Tonight, Canal+ & France, African Drama, Reality Rush, Asian Vibes
KIDS_TYPES (5): All, Cartoon World, Little Ones, Adventure, UK Kids
CINEMA_TYPES (7): All, beIN Cinema, Action Vault, Comedy Corner, Horror Room, Bollywood Palace, Netflix Loop
MUSIC_TYPES (6): All, Afro Beats, MTV World, Bollywood Beats, Throwback, Arabic Vibes
DISCOVERY_TYPES (5): All, Wild Planet, Science Lab, History Vault, Crime Files
FAITH_TYPES (3): All, Islamic, Christian
PREMIUM4K_TYPES: [inferred from THEME_SUBTYPES mapping]

REGION_GENRES: per-region genre filters (motherland, sahara, etc.)
```

---

## FILE: /home/dash/tivi-plus/src/lib/movie-collections.ts
219 lines

```
10 parent tabs, each with multiple subtabs:
  1. New & Hot (6 subtabs: All New, Hollywood, Bollywood, Tamil, Telugu, Turkish)
  2. Hollywood (14 subtabs: Latest, 2024, 2023, 4K Ultra, Blockbuster, Awards, Horror, Romance, Docs, 2020-2022, Classic, Arabic Sub, Hindi Dubbed, CAM)
  3. Netflix (2: English, Hindi)
  4. Turkish (3: Latest, 2024, Classic)
  5. Bollywood (11: Latest, 2024, 2023, 4K, Classic, South Dubbed, Star Power, Comedy, Old Gold, Multi Lang, CAM)
  6. South Indian (10: Tamil New, Tamil 2024, Tamil All, Telugu New, Telugu 2024, Telugu All, Malayalam New, Malayalam All, Kannada New, Kannada All)
  7. Collections (18: Marvel, Star Wars, Bond, Harry Potter, Fast & Furious, Jurassic Park, Godfather, Terminator, Alien, Rocky, Die Hard, Rambo, Van Damme, Bruce Lee, Denzel, Morgan Freeman, Predator, Indiana Jones)
  8. Kids (2: All, CAM)
  9. World Cinema (10: Bangla, Bangla New, Punjabi, Punjabi New, Marathi, Gujarati, Pakistan, Myanmar, Afrikaans, Arabic)
  10. Sports & Events (6: UFC, WWE, FIFA WC, Cricket, Kapil Sharma, Indian Idol)

16 GENRE_FILTERS (TMDB-powered): All, Action, Comedy, Thriller, Drama, Sci-Fi, Horror, Romance, Adventure, Animation, Documentary, Crime, Mystery, Family, Fantasy, War

4 SORT_MODES: Smart, Top Rated, Newest, A-Z
```

---

## FILE: /home/dash/tivi-plus/src/lib/series-collections.ts
137 lines

```
4 parent tabs:
  1. Platform Originals (16 subtabs: Netflix, Prime, HBO, Disney+, Apple TV+, Hulu, BBC, Paramount+, Starz, Peacock, Showtime, AMC+, Stan, Crave, BritBox, Acorn TV)
  2. Turkish (1: All Turkish)
  3. Korean (4: Multi Language, JTBC, TVING, tvN)
  4. Browse All (20 subtabs: Crime & Thriller, Reality TV, Hindi TV, Tamil TV, Kids, Islamic, Pakistani, Australian, Sports, Music, Documentaries, Indian OTT, FX, NBC, CBS, The CW, ABC US, FOX, Channel 4, ITV)

16 GENRE_FILTERS (TV-specific TMDB): All, Drama, Comedy, Crime, Thriller, Action, Sci-Fi, Mystery, Romance, Animation, Documentary, Family, Horror, Reality, War, Western
```

---

## FILE: /home/dash/tivi-plus/src/lib/feed-curator.ts
206 lines

[Full content captured — curateFeed() interleaves: Supabase feed_items, TMDB trending (top-rated movies with daily deterministic shuffle), and time-based live moments (sports windows, late night cinema, morning news). 5 editorial copy variations for trending cards. Reaction seeds based on TMDB rating.]

---

## FILE: /home/dash/tivi-plus/src/lib/moment-packs.ts
235 lines

```
8 moment packs (lifestyle-based curation):
  1. before-sleep (21:00-04:00) — Comedy/Drama/Romance/Family/Animation, rating 6.5+, max 120min
  2. everyone-watching (18:00-23:00) — All genres, rating 8.0+
  3. quick-lunch (11:00-14:00) — Comedy/Action/Animation, rating 6.0+, max 100min
  4. late-night (22:00-05:00) — Thriller/Mystery/Crime/Horror/Sci-Fi, rating 7.0+
  5. in-your-feelings (always) — Drama/Romance/War/History, rating 7.5+
  6. family-time (14:00-20:00) — Animation/Family/Comedy/Adventure, rating 6.0+, max 130min
  7. adrenaline (always) — Action/Adventure/Thriller/War, rating 6.5+
  8. mind-benders (always) — Sci-Fi/Mystery/Fantasy/Documentary, rating 7.5+

API: getActiveMomentPacks(hour), getMomentPackResults(pack, tmdbMap, limit)
Handles overnight windows (e.g. 22:00-05:00)
```

---

## FILE: /home/dash/tivi-plus/src/lib/intelligence.ts
197 lines

```
Theme Affinity Tracker:
  - Records watches, lastWatch timestamp, totalDuration per theme
  - CATEGORY_TO_THEME maps 50+ category IDs to 9 theme IDs
  - getSmartThemeOrder(): scores by recency (40%), frequency (35%), engagement (25%)

Content Freshness:
  - dailyShuffle(): deterministic daily shuffle using date + salt as seed (Fisher-Yates)
  - smartRotate(): pins top N by score, shuffles rest daily

Theme Inference:
  - inferThemeFromHistory(): keyword-based theme detection from watch history names
```

---

## FILE: /home/dash/tivi-plus/src/lib/ambient-audio.ts (first 60 lines + experience tracks)

```
Speed shifts: 0.65x (Welcome) -> 0.80x (Home) -> 0.85x (Inside) -> 1.00x (Playing)
VPS: https://stream.zionsynapse.online/ambient

EXPERIENCE_TRACKS (11 tracks — Afro soul):
  welcome: ritual-awakening.webm
  home: deep-earth-current.webm
  sports: tribal-heatline.webm
  entertainment: warm-drum-motion.webm
  kids: organic-invocation.webm
  movies247: midnight-polyrhythm.webm
  music: body-in-rhythm.webm
  news: shadowed-soil.webm
  documentary: echoes-of-earth.webm
  faith: ancestral-lift.webm
  football: tribal-language-rising.webm

HOME_ROTATION (8 tracks): deep-earth-current, warm-drum-motion, organic-invocation,
  sacred-groove-expansion, low-fire-drive, ancestral-lift, echoes-of-earth, rooted-ceremony

Volume: 0.4, enabled by default (localStorage 'tivi_ambient_enabled')
```

---

## FILE: /home/dash/tivi-plus/src/lib/xtream.ts (first 30 lines + key functions)

```
STREAM_BASE: datahub11.com:80 (env VITE_XTREAM_STREAM)
PROXY: stream.zionsynapse.online (env VITE_PROXY_URL)
CACHE_TTL: 1 hour
FETCH_TIMEOUT: 10s

safeImageUrl(url):
  - Fixes ttps: -> https:, removes trailing quotes
  - Replaces starshare.live -> datahub11.com
  - Blocks: webhop.live, imdb.com, wikia.nocookie.net, paste.pics, tensports.com.pk
  - HTTPS: pass through
  - HTTP: proxy through VPS (?url=encoded)

sortGemsFirst(streams):
  - GEM_STREAM_IDS set prioritized
  - Fallback: iconScore comparison
```

---

## FILE: /home/dash/tivi-plus/src/hooks/useScrollReveal.ts
75 lines

```
IntersectionObserver-based section reveal.
Elements with .reveal or .stagger-card get .visible on viewport entry.
rootMargin: '0px 0px 200px 0px' — triggers 200px before entering viewport.
Cascade: first 5 .reveal elements in viewport get data-reveal-delay (1-5) for guided entrance.
Respects prefers-reduced-motion.
Observes once — no re-triggering on scroll back up.
```

---

## FILE: /home/dash/tivi-plus/src/hooks/useScrollFocus.ts
72 lines

```
Event-driven (scroll + resize), NOT rAF loop.
Containers with [data-focus-lens].scroll-smooth-x get focus tracking.
Each child gets data-focus attribute: center (<60px), near (<50% container), far (rest).
Center cards: full opacity + purple contour glow.
Near: opacity 0.95.
Far: opacity 0.75.
Skips containers not in viewport.
Respects prefers-reduced-motion.
```

---

## FILE: /home/dash/tivi-plus/src/hooks/useAuth.ts (first 30 lines)
[Structure: Supabase REST API auth against access_codes table, stored auth with code/tier/expires/customerName, XtreamCredentials resolved from user_xtream/pass_xtream columns]

---

## FILE: /home/dash/tivi-plus/src/styles/globals.css
1233 lines

[Full content captured across all sections:]

**@layer base** (lines 1-48): Reset, tap-highlight, font-smoothing, overscroll-behavior, custom scrollbar (purple)

**@layer components** (lines 50-1193):
- Scrollbar hide, gradient masks (scroll-fade with 4% edges)
- Text gradients (primary purple-orange, subtle purple)
- Glass effects (glass, glass-strong blur(40px), glass-light blur(12px))
- Card shine (hover diagonal highlight)
- Card glow (neon border on hover, boxShadow)
- Skeleton (shimmer 2.5s, hex-skeleton-pulse)
- Live pulse (live-ring 2s infinite)
- Hero gradients (180deg, 90deg variants)
- Player controls gradients
- Cosmic orbs (orbit-1/2/3 at 25s/30s/20s with will-change + contain)
- Splash breathe (box-shadow pulse 2s)
- Float animations (6s/8s/6s+2s delay)
- Neon utilities (primary/accent/text)
- Section dividers (200px gradient line)
- Login particles (9 particles, 12-17s float)
- Login box appear (0.8s expo-out)
- Logo pulse (3s scale + opacity)
- Title shimmer (3s background-position)
- Button sweep (hover light pass)
- Hero cinematic (85vh)
- Hero subtitle reveal (shimmer 12s)
- Badge system (live, netflix, prime, hbo, 4k, new, popular)
- Cosmic bg rotate (20s linear infinite, 200%x200%)
- Loading bar (translateX sweep)
- Beam sweep (platform showcase borders)
- Welcome blink (6s opacity cycle)
- Sports ball float (3s bounce)
- Firefly glide (12s path animation for Because You Watched)
- Dash ticket shimmer (7s skewed light pass)
- Dash neon pulse (4s box-shadow breathe)
- Blade pass / blade pass reverse (diagonal light with rest period)
- Hex anim variants (shimmer/flicker/breathe/pulse with stagger delays)
- Ambient blobs (fixed, blur(80px), blob-morph-1/2 at 12s/9s)
- Reveal system (scale 0.96->1, opacity 0->0.999, 1.4s/1.8s)
- Cascade delays (100ms-650ms for data-reveal-delay 1-5)
- Stagger cards (scale 0.94->1, 1s/1.4s)
- Vee-card-in / platform-card-in keyframes (scale-based)
- Image settle (opacity + scale, 1.2s/1.8s)
- Live badge pulse (3s opacity cycle)
- Show more breathe (4s scale 1->1.015)
- Spring press (0.35s cubic-bezier(0.34, 1.56, 0.64, 1))
- Card press (0.8s cubic-bezier(0.25, 0.1, 0.25, 1))
- Scroll smooth-x (snap proximity)
- Feed overlay slide-up (0.4s)
- Feed reaction glow (0.4s)
- Feed count bump (0.3s)
- Feed pulse dot (2s ring expansion)
- Feed live dot (1.5s blink)
- Feed card hover (0.25s scale + shadow)
- Reduced motion: all animations disabled, opacity/transform reset

**Scroll focus system** (lines 1195-1223):
- .scroll-focus-card: transition opacity/box-shadow 1.5s, contain: layout style
- center: opacity 1 + purple glow
- near: opacity 0.95
- far: opacity 0.75

**@layer utilities** (lines 1225-1233): safe-bottom, safe-top (env safe-area-inset)

---

## FILE: /home/dash/tivi-plus/tailwind.config.js
121 lines

```js
Colors:
  bg: #050508 (DEFAULT), #0A0A0A (dark), elevated, card, card-hover, hover
  primary: #9D4EDD (DEFAULT), #C77DFF (light), #7B2CBF (dark), #2D1B4E (deeper)
  cyan: #00F5FF, #00D9FF
  accent: #FF6B35 (DEFAULT), #FF8F5E (light), gold #FFD700, red #FF006E, green #06FFA5, neon-blue #00D4FF
  text: white, #B8B8B8, #6B6B6B

Fonts: Outfit (primary), system-ui fallback

Custom timing functions:
  spring: cubic-bezier(0.34, 1.56, 0.64, 1)
  soft-land: cubic-bezier(0.22, 1, 0.36, 1)
  expo-out: cubic-bezier(0.16, 1, 0.3, 1)

Custom animations: pulse-live, fade-in, fade-in-up, slide-up, glow, glow-pulse,
  scale-in, portal-pulse-red, portal-pulse-blue, mood-pop, shimmer
```

---

## FILE: /home/dash/tivi-plus/public/sw.js (first 30 lines)

```js
const CACHE_NAME = 'tivi-cache-v8';
// Install: skipWaiting()
// Activate: purge all old caches
// Strategy: cacheFirstThenNetwork for static assets
```

---

## HOLISTIC ASSESSMENT

### 1. Animation/Transition Inventory

| Animation | Duration | Easing | Where Used |
|-----------|----------|--------|------------|
| `live-ring` | 2s infinite | default (ease) | Live pulse dots (Navbar, channel cards) |
| `orbit-1` | 25s infinite | ease-in-out | Cosmic orb 1 (CosmicBackground CSS, NOT used — orbs removed) |
| `orbit-2` | 30s infinite | ease-in-out | Cosmic orb 2 (same — dead code) |
| `orbit-3` | 20s infinite | ease-in-out | Cosmic orb 3 (same — dead code) |
| `splash-breathe` | 2s infinite | ease-in-out | Splash screen glow (NOT used — splash uses inline transitions) |
| `float` | 6s infinite | ease-in-out | Float utility (NOT visibly used anywhere) |
| `shimmer` | 2.5s infinite | cubic-bezier(0.4, 0, 0.6, 1) | Skeleton loading cards |
| `hex-skeleton-pulse` | 2.5s infinite | ease-in-out | Skeleton hex placeholders |
| `particle-float` | 12-17s infinite | ease-in-out | Login particles (9 particles) |
| `login-box-appear` | 0.8s once | cubic-bezier(0.16, 1, 0.3, 1) | Login box entrance |
| `logo-pulse` | 3s infinite | ease-in-out | Login logo pulse |
| `title-shimmer` | 3s infinite | ease-in-out | Login title shimmer |
| `cosmic-rotate` | 20s infinite | linear | Cosmic bg rotate (dead code — class exists but not used in components) |
| `loading-bar` | 1.5s infinite | (none specified — default ease) | Splash + FullPageLoader progress |
| `beam-sweep` | 5s infinite alternate | ease-in-out | PlatformShowcase metallic border sweep |
| `welcome-blink` | 6s infinite | ease-in-out | Header "Welcome" text blink |
| `sports-ball-float` | 3s infinite | ease-in-out | Sports section breaker floating ball |
| `firefly-glide` | 12s infinite | cubic-bezier(0.4, 0, 0.2, 1) | Because You Watched orange firefly |
| `dash-ticket-shimmer` | 7s infinite | cubic-bezier(0.4, 0, 0.2, 1) | DASH Exclusives cinema ticket light pass |
| `dash-neon-pulse` | 4s infinite | ease-in-out | DASH Exclusives portrait card glow |
| `blade-pass` | 7-10s infinite | cubic-bezier(0.25, 0.1, 0.25, 1) | Hex card shimmer/breathe/pulse variants |
| `blade-pass-reverse` | 7s infinite | cubic-bezier(0.25, 0.1, 0.25, 1) | Hex card flicker variant |
| `blob-morph-1` | 12s infinite | ease-in-out | Ambient blob purple (App.tsx) |
| `blob-morph-2` | 9s infinite | ease-in-out | Ambient blob blue (App.tsx) |
| `blob-morph-3` | (defined) | ease-in-out | DEAD — blob-3 is display:none |
| `.reveal` transition | opacity 1.4s / transform 1.8s | cubic-bezier(0.4, 0, 0.2, 1) / cubic-bezier(0.22, 1, 0.36, 1) | Every section on scroll reveal |
| `.stagger-card` | opacity 1s / transform 1.4s | same as reveal | Card entrance stagger |
| `vee-card-in` | 0.7s | cubic-bezier(0.4, 0, 0.2, 1) | Collection row cards (stagger 60ms) |
| `platform-card-in` | 0.9s | cubic-bezier(0.4, 0, 0.2, 1) | PlatformShowcase cards (stagger 120ms) |
| `.img-settle` | opacity 1.2s / transform 1.8s | ease-out / cubic-bezier(0.22, 1, 0.36, 1) | PosterCard image load |
| `subtitle-fade` | 0.8s | cubic-bezier(0.4, 0, 0.2, 1) | Section subtitles |
| `subtitle-gentle-shimmer` | 12s infinite | ease-in-out | Hero subtitle text shimmer |
| `live-badge` | 3s infinite | ease-in-out | Live badges (slower than live-ring) |
| `show-more-pulse` | 4s infinite | ease-in-out | Show More button breathe |
| `.spring-press` | 0.35s | cubic-bezier(0.34, 1.56, 0.64, 1) | Touch press on buttons |
| `.card-press` | 0.8s | cubic-bezier(0.25, 0.1, 0.25, 1) | Card press/release |
| `feed-overlay-slide-up` | 0.4s | cubic-bezier(0.22, 1, 0.36, 1) | Feed card overlay entrance |
| `feed-reaction-glow` | 0.4s | ease-out | Feed reaction icon glow |
| `feed-count-bump` | 0.3s | ease-out | Feed reaction count number |
| `feed-pulse-ring` | 2s infinite | (default) | Feed section header dot |
| `feed-live-blink` | 1.5s infinite | (default) | Feed live indicator |
| `.feed-card-hover` | 0.25s | cubic-bezier(0.22, 1, 0.36, 1) | Feed card hover scale |
| `.scroll-focus-card` | opacity/box-shadow 1.5s | cubic-bezier(0.25, 0.1, 0.25, 1) | Scroll focus lens system |
| rAF ambient pulse | 60fps continuous | N/A | App.tsx blob audio-reactive scale |
| Star field canvas | 60fps continuous | N/A | CosmicBackground star draw loop |

### 2. Background Layer Inventory

| Layer | Position | Z-Index | Description |
|-------|----------|---------|-------------|
| CosmicBackground canvas | fixed inset-0 | z-0 | Star field (120 stars, upward drift, purple flicker) |
| Aurora band | absolute top-0 | inside cosmic bg | 40vh gradient from-primary/[0.03] |
| Bottom ambient | absolute bottom-0 | inside cosmic bg | 30vh gradient from-accent/[0.02] |
| Ambient blobs container | fixed top-25%, left-50% | z-0 | 100vw x 50vh, opacity 0->1 on scroll>80px |
| Ambient blob 1 (purple) | absolute top-10%, left-30% | inside blobs | 350x350px, blur(80px), morph 12s |
| Ambient blob 2 (blue) | absolute top-20%, right-20% | inside blobs | 250x250px, blur(80px), morph 9s |
| Cosmic orb CSS (dead) | various | N/A | orbit-1/2/3 defined but NOT rendered |
| Cosmic bg rotate (dead) | fixed inset-0 | z-0 | 200%x200% radial gradient rotation — class defined but not used |

### 3. Performance Concerns

**Active GPU-heavy elements:**
- **Star canvas rAF loop**: Runs at 60fps perpetually. 120 stars = 120 arc() calls per frame. Acceptable but wasteful when tab is backgrounded (no visibility check).
- **Ambient blob rAF loop** (App.tsx lines 82-108): Runs at 60fps perpetually even when blobs are hidden (opacity 0). The `isVisible` flag only controls style updates, but `requestAnimationFrame(animate)` still fires every frame.
- **Two blur(80px) blobs**: Each blob creates an expensive GPU compositing layer. Morphing border-radius triggers repaints. `contain: strict` on parent helps but the blobs themselves still recomposite.
- **scroll-focus-card transitions on 50+ cards**: Each horizontal scroll row has 12-15 cards, and the focus system sets data-focus attributes with 1.5s opacity+box-shadow transitions. On a page with 10+ rows, that's 100+ elements with active transitions during any scroll event.
- **Multiple competing infinite animations**: On the home page at any given time: blob-morph-1 (12s), blob-morph-2 (9s), star canvas (60fps), multiple blade-pass shimmer variants (7-10s each), dash-neon-pulse (4s staggered), live-ring (2s on multiple elements), feed-pulse-ring (2s), show-more-breathe (4s), subtitle-gentle-shimmer (12s). That's 20+ concurrent GPU animations.
- **`will-change: opacity, transform` on every `.reveal` element**: This pre-promotes each section to its own compositing layer. On a home page with 15+ sections, that's 15+ promoted layers simultaneously. The `will-change: auto` reset after `.visible` is correct, but there's a window where many layers exist during initial reveal cascade.

**Dead code / unnecessary definitions:**
- Cosmic orb CSS (orbit-1/2/3) — defined but not rendered. ~40 lines of dead CSS.
- blob-morph-3 animation — defined but blob-3 is `display: none`.
- cosmic-bg-rotate — defined but no component uses the class.
- float/float-slow/float-delayed — defined but appear unused in components.
- Several hero-cinematic classes (hero-cinematic 85vh, hero-vignette, hero-gradient-left, hero-gradient-bottom) — appear to be from an older hero design, not used in current code.

### 4. Visual Consistency

**Easing language is NOT unified.** The codebase uses at least 7 different easing curves:
1. `ease-in-out` — most infinite loops (blobs, pulses, shimmer)
2. `cubic-bezier(0.4, 0, 0.2, 1)` — Material standard, used for reveal opacity, vee-card-in
3. `cubic-bezier(0.22, 1, 0.36, 1)` — Expo out, used for reveal transform, feed overlay, spring-soft
4. `cubic-bezier(0.25, 0.1, 0.25, 1)` — Custom ease, used for blade-pass, scroll-focus, card-press
5. `cubic-bezier(0.34, 1.56, 0.64, 1)` — Spring overshoot, used for spring-press
6. `cubic-bezier(0.16, 1, 0.3, 1)` — Expo-out (from Tailwind config), used for login-box-appear
7. `ease-out` — feed reactions, img-settle opacity

The Tailwind config defines 3 named curves (spring, soft-land, expo-out) but these are only sometimes used. Most animations use hardcoded curves directly.

**Duration inconsistency:**
- Reveal system: opacity 1.4s + transform 1.8s (mismatched — opacity arrives before transform settles)
- Image settle: opacity 1.2s + transform 1.8s (same mismatch)
- Card press: 0.8s but spring-press: 0.35s — different "tap" durations
- Stagger cards: 1s/1.4s vs vee-card-in: 0.7s — content entrance feels different per section

### 5. What Feels "Off" Architecturally

1. **Two competing background animation systems**: The canvas star field AND the CSS ambient blobs both run perpetually. The blobs were supposed to replace the orbs, but the star canvas remains as a third background layer. Three fixed-position background systems (canvas + blobs + aurora gradient) is redundant.

2. **Scroll reveal + scroll focus: overlapping responsibilities**. The reveal system makes sections appear on scroll. The focus system dims/brightens cards in scroll rows. Both observe scroll events, both modify opacity. A card in a horizontal row could be simultaneously affected by both systems — the section's reveal opacity AND the card's focus opacity multiply.

3. **rAF loop in App.tsx never stops**. The blob audio-reactive loop runs `requestAnimationFrame(animate)` unconditionally at 60fps for the entire app lifetime. It should use `Intersection Observer` or at minimum check `document.hidden`.

4. **Inline style animations vs CSS class animations**: Some animations use CSS classes (`.reveal`, `.hex-anim-shimmer`), others use inline `style={{ animation: '...' }}` (vee-card-in, platform-card-in, dash-neon-pulse with stagger delays). This makes the animation system hard to reason about — you need to check both globals.css AND every component's JSX.

5. **`transition-all` scattered in component JSX**: Many elements use `transition-all` in Tailwind classes, which transitions every property including layout-triggering ones. Should be `transition-colors` or `transition-opacity` for specific intent.

6. **The FeedSection overlay pattern fights the scroll-focus system**: Feed cards use a tap-to-expand overlay with `feed-overlay-slide-up` animation. But these cards are inside a scroll-smooth-x container with scroll-focus-card tracking. The expanded overlay creates a card taller than its neighbors, potentially confusing the focus distance calculation.

### 6. Specific Recommendations for a Final Coherence Pass

**Animation cleanup:**
- Delete dead CSS: cosmic-orb keyframes (orbit-1/2/3), blob-morph-3, cosmic-bg-rotate, cosmic-bg-rotate::before, float/float-slow/float-delayed (if unused), hero-cinematic/hero-vignette/hero-gradient-left/hero-gradient-bottom (if unused).
- Standardize on 3 easing curves max: (a) `cubic-bezier(0.22, 1, 0.36, 1)` for "soft-land" entrances, (b) `cubic-bezier(0.4, 0, 0.2, 1)` for standard motion, (c) `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring press. Remove the 0.25/0.1/0.25/1 variant — it's too similar to standard ease.
- Unify reveal opacity + transform durations: both should be 1.6s (split creates a "laggy transform" feel).
- Move inline `animation` styles to CSS classes with `animation-delay` set via CSS custom properties (e.g. `--stagger-delay`) for cleaner separation.

**Performance fixes:**
- Add `document.hidden` check to the blob rAF loop in App.tsx. Use `document.addEventListener('visibilitychange')` to pause/resume.
- Add the same to CosmicBackground canvas loop.
- Consider removing the star canvas entirely on mobile (check `matchMedia('(max-width: 768px)')`) — users rarely notice subtle stars on small screens.
- Reduce scroll-focus-card transition from 1.5s to 0.6s — at 1.5s, the focus effect trails far behind scroll position, feeling disconnected.
- Replace `transition-all` with specific transition properties throughout component JSX.

**Background simplification:**
- The current stack is: canvas stars + aurora gradient + bottom ambient + 2 morphing blobs. On mobile, this is overkill. Consider: (a) stars on desktop only, (b) blobs are the primary ambient, (c) aurora/bottom gradients are fine.

**Consistency pass:**
- The `.card-press` class uses 0.8s ease, but many cards also have Tailwind `hover:scale-[1.03] active:scale-[0.96]` with `transition-all`. The card-press class and the Tailwind transitions fight each other. Pick one: either card-press handles all scale transforms, or Tailwind classes do, not both.
- `spring-press` (0.35s with overshoot) is used on CTA buttons. `card-press` (0.8s smooth) is used on content cards. This is a good distinction — document it as intentional.
- The `vee-card-in` stagger (60ms per card) and `platform-card-in` stagger (120ms per card) should use the same interval for consistency across row types.
