import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerControls } from './PlayerControls';
import { RefreshCw, AlertTriangle, ChevronLeft as ChevLeft, ChevronRight as ChevRight, SkipForward, SkipBack, Tv } from 'lucide-react';
import { useAdjacentChannels, usePlaylistState, setCurrentChannel, setPlaylist } from '@/lib/playlist';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSwipeSurf } from '@/hooks/useSwipeSurf';
import {
  experienceForChannelId,
  adjacentCategory,
  accentForExperience,
} from '@/lib/catalog';
import { tap } from '@/lib/haptics';
import { setAmbientPlayerState, toggleAmbient, isAmbientEnabled } from '@/lib/ambient-audio';
import { useLanguage } from '@/i18n';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { SmartMatch } from './SmartMatch';
import { EpgWidget } from './EpgWidget';
import type { Channel, PlayerState } from '@/types';

function detectVod(state: PlayerState): boolean {
  const cat = state.channel?.category?.toLowerCase() ?? '';
  if (cat === 'movie' || cat === 'series') return true;
  const url = state.channel?.url ?? '';
  if (url.includes('/vod?') || url.includes('/series/')) return true;
  if (/\.(mp4|mkv|avi)/.test(decodeURIComponent(url))) return true;
  return false;
}

interface Props {
  state: PlayerState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onQualityChange: () => void;
  onClose: () => void;
  onRetry: (channel: Channel) => void;
  onBack?: () => void;
  onSeek?: (time: number) => void;
  onGenreSwitch?: (themeId: string) => void;
  /** Credentials — needed to build the playlist when surfing to a new category. */
  credentials?: { username: string; password: string } | null;
}

// ── Connecting-card throttle ──────────────────────────────────────────────
// Show the logo + channel-name "connecting" block only the FIRST few times per
// session (weak-network reassurance is most valuable early). After that the
// thin top beam alone signals the switch — no full card. Module-level so it
// survives player remounts within a session, resets on full reload.
const CONNECT_CARD_MAX = 3;
let _connectCardSeen = 0;
const _connectCardChannels = new Set<string>();
/** Returns true if the full connecting card should render for this channel. */
function shouldShowConnectCard(channelId: string | null | undefined): boolean {
  if (!channelId) return false;
  // Count each distinct channel once — re-buffering the same channel doesn't
  // burn a slot, and a quick A→B→A surf doesn't either.
  if (_connectCardChannels.has(channelId)) return _connectCardSeen <= CONNECT_CARD_MAX;
  if (_connectCardSeen >= CONNECT_CARD_MAX) return false;
  _connectCardSeen += 1;
  _connectCardChannels.add(channelId);
  return true;
}

export const VideoPlayer: React.FC<Props> = ({
  state,
  videoRef,
  containerRef,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
  onTogglePiP,
  onQualityChange,
  onClose,
  onRetry,
  onBack,
  onSeek,
  onGenreSwitch,
  credentials,
}) => {
  const { t } = useLanguage();
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Mirrors state.isSwitching so timers/callbacks can read it without re-binding.
  // Controls STAY visible + sharp through a switch — we only auto-hide while
  // actively watching (never DURING the switch transition).
  const isSwitchingRef = useRef(false);
  const [seekIndicator, setSeekIndicator] = useState(false);
  const [seekDirection, setSeekDirection] = useState<'forward' | 'backward'>('forward');

  const isVod = detectVod(state);

  // Ambient breathing layer — guides on control show, retreats on hide
  const [ambientOn, setAmbientOn] = useState(() => isAmbientEnabled());
  useEffect(() => {
    if (!ambientOn) return;
    setAmbientPlayerState(controlsVisible, isVod);
  }, [controlsVisible, isVod, ambientOn]);

  // ── Live continuity (Bug #1) ──────────────────────────────────────────────
  // The player chrome (channel carousel, edge arrows, corner hints, SmartMatch,
  // landscape genre bar, EPG) used to gate on `url.includes('/live?')`. Premium
  // channels proxy through a `/live?` endpoint, but FREE channels are direct
  // HLS `.m3u8` URLs with no `/live?` — so all that chrome silently vanished on
  // free streams ("hls player has no buttons"). A live stream is simply anything
  // that isn't VOD: key the chrome off that so free/HLS gets the SAME control set.
  const isLiveStream = !isVod;

  // ── Channel-suggestion grid auto-fade (Bug #2) ───────────────────────────
  // The suggestions conveyor (ChannelCarousel) lingers ~15s after the last
  // interaction, then fades to leave the clean minimal HLS look. Any tap/move
  // re-shows it (wired through showControls below) and resets the 15s timer.
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const lastTapRef = useRef<{ x: number; t: number }>({ x: 0, t: 0 });
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const { prev: adjPrev, next: adjNext } = useAdjacentChannels();

  // ── New-era remote: swipe-surf the channel. Live only (VOD uses double-tap
  //    seek). The hook handles all gesture coexistence (scroll / scrubber /
  //    close / tap pass through untouched). dragX drives a subtle slide. ──
  const [surfDragX, setSurfDragX] = useState(0);
  const handleSurfPrev = useCallback(() => {
    if (adjPrev) { setCurrentChannel(adjPrev.id); onRetry(adjPrev); }
  }, [adjPrev, onRetry]);
  const handleSurfNext = useCallback(() => {
    if (adjNext) { setCurrentChannel(adjNext.id); onRetry(adjNext); }
  }, [adjNext, onRetry]);
  // ── Vertical surf = CATEGORY switch. Derive the current category from the
  //    playing channel's experience (via the catalog), jump to the adjacent
  //    category's channels as the new playlist, play its first channel, and
  //    bloom a brief full-screen accent overlay. Live only. ──
  const [catOverlay, setCatOverlay] = useState<{ name: string; accent: string; key: number } | null>(null);
  const catOverlayTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const credsRef = useRef(credentials);
  useEffect(() => { credsRef.current = credentials; }, [credentials]);

  const surfCategory = useCallback((dir: 1 | -1) => {
    const currentExp = experienceForChannelId(state.channel?.id);
    const adj = adjacentCategory(currentExp, dir, credsRef.current ?? null);
    if (!adj || adj.channels.length === 0) return; // not a catalog channel / no ring — do nothing
    tap();
    setPlaylist(adj.channels);
    const first = adj.channels[0];
    setCurrentChannel(first.id);
    onRetry(first as unknown as Channel);
    // Bloom the accent overlay — blooms, holds, fades into the new channel.
    if (catOverlayTimerRef.current) clearTimeout(catOverlayTimerRef.current);
    setCatOverlay({ name: adj.name, accent: accentForExperience(adj.name), key: Date.now() });
    catOverlayTimerRef.current = setTimeout(() => setCatOverlay(null), 1100);
  }, [state.channel?.id, onRetry]);

  const handleSurfUp = useCallback(() => surfCategory(-1), [surfCategory]);   // swipe DOWN → prev category
  const handleSurfDown = useCallback(() => surfCategory(1), [surfCategory]);  // swipe UP   → next category

  useEffect(() => () => { if (catOverlayTimerRef.current) clearTimeout(catOverlayTimerRef.current); }, []);

  const surfHandlers = useSwipeSurf({
    enabled: !isVod,
    onPrev: handleSurfPrev,
    onNext: handleSurfNext,
    onUp: handleSurfUp,
    onDown: handleSurfDown,
    onDrag: setSurfDragX,
  });

  // ── Live hold-to-freeze + smart catch-up ──────────────────────────────────
  // Hold (500ms) on live → freezes frame. Release:
  //   < 8s held → 2x playback catch-up to live edge, then back to 1x (replay the blink)
  //   > 8s held → jump directly to live edge (too much to replay)
  const liveHoldTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const liveHoldActiveRef = useRef(false);
  const liveHoldStartRef = useRef(0);
  const liveCatchupTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [liveHolding, setLiveHolding] = useState(false);
  const [liveCatchingUp, setLiveCatchingUp] = useState(false);

  // Poll while catching up: detect when we've reached the live edge and restore 1x.
  const startCatchup = useCallback((v: HTMLVideoElement) => {
    setLiveCatchingUp(true);
    v.playbackRate = 2.0;
    liveCatchupTimerRef.current = setInterval(() => {
      if (!v || v.paused) { clearInterval(liveCatchupTimerRef.current); setLiveCatchingUp(false); return; }
      const buffEnd = v.buffered.length > 0 ? v.buffered.end(v.buffered.length - 1) : 0;
      // Caught up = within 1.5s of the buffered edge
      if (buffEnd > 0 && buffEnd - v.currentTime < 1.5) {
        v.playbackRate = 1.0;
        clearInterval(liveCatchupTimerRef.current);
        setLiveCatchingUp(false);
      }
    }, 250);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    tapStartRef.current = { x: touch.clientX, y: touch.clientY };
    if (!isVod) {
      liveHoldActiveRef.current = false;
      clearTimeout(liveHoldTimerRef.current);
      liveHoldTimerRef.current = setTimeout(() => {
        liveHoldActiveRef.current = true;
        liveHoldStartRef.current = Date.now();
        setLiveHolding(true);
        videoRef.current?.pause();
      }, 500);
    }
  }, [isVod, videoRef]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isVod && !liveHoldActiveRef.current && liveHoldTimerRef.current) {
      const start = tapStartRef.current;
      const touch = e.touches[0];
      if (start && (Math.abs(touch.clientX - start.x) > 15 || Math.abs(touch.clientY - start.y) > 15)) {
        clearTimeout(liveHoldTimerRef.current); // swipe detected — cancel the hold
      }
    }
  }, [isVod]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimeout(liveHoldTimerRef.current);
    const start = tapStartRef.current;
    tapStartRef.current = null;

    if (!isVod && liveHoldActiveRef.current) {
      liveHoldActiveRef.current = false;
      setLiveHolding(false);
      const heldMs = Date.now() - liveHoldStartRef.current;
      const v = videoRef.current;
      if (v) {
        const buffEnd = v.buffered.length > 0 ? v.buffered.end(v.buffered.length - 1) : 0;
        if (heldMs < 8000 && buffEnd > 0) {
          // Short hold: 2x catch-up to live edge, then restore 1x
          v.play().then(() => startCatchup(v)).catch(() => {});
        } else {
          // Long hold: jump straight to live edge
          try { if (buffEnd > 0) v.currentTime = buffEnd; } catch { /* ignore */ }
          v.play().catch(() => {});
        }
      }
      return;
    }

    // VOD double-tap seek (the only touch gesture VideoPlayer still owns —
    // channel surfing is handled by useSwipeSurf via pointer events).
    if (!isVod || !start) return;
    const touch = e.changedTouches[0];
    const absDx = Math.abs(touch.clientX - start.x);
    const absDy = Math.abs(touch.clientY - start.y);
    // Double-tap: +10s forward (right side) or -10s backward (left side).
    // Must be a tap, not a drag (so it never collides with a swipe/seek-drag).
    if (absDx < 20 && absDy < 20) {
      const now = Date.now();
      const screenW = window.innerWidth;
      const isRightSide = touch.clientX > screenW * 0.55;
      const isLeftSide = touch.clientX < screenW * 0.45;
      if ((isRightSide || isLeftSide) && now - lastTapRef.current.t < 300 && Math.abs(touch.clientX - lastTapRef.current.x) < 60) {
        if (onSeek && state.duration > 0) {
          if (isRightSide) {
            onSeek(Math.min(state.duration, state.currentTime + 10));
          } else {
            onSeek(Math.max(0, state.currentTime - 10));
          }
          setSeekIndicator(true);
          setSeekDirection(isRightSide ? 'forward' : 'backward');
          setTimeout(() => setSeekIndicator(false), 600);
        }
        lastTapRef.current = { x: 0, t: 0 };
        return;
      }
      lastTapRef.current = { x: touch.clientX, t: now };
    }
  }, [isVod, onSeek, state.duration, state.currentTime]);

  // Auto-retry with backoff: 3s → 6s → 10s, then give up to manual
  const autoRetryRef = useRef(0);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    // "No active package" is a definitive state — don't auto-retry it (no pass = it
    // will never connect); show the reason and let the member act.
    if (state.error && !state.error.includes('Retry') && !state.error.includes('package') && !state.isPlaying && state.channel) {
      if (autoRetryRef.current < 3) {
        const delay = [3000, 6000, 10000][autoRetryRef.current] || 10000;
        autoRetryTimerRef.current = setTimeout(() => {
          autoRetryRef.current += 1;
          onRetry(state.channel!);
        }, delay);
      }
    }
    if (state.isPlaying) autoRetryRef.current = 0;
    return () => { if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current); };
  }, [state.error, state.isPlaying, state.channel, onRetry]);
  const [hasSubs, setHasSubs] = useState(false);
  const [subsOn, setSubsOn] = useState(false);
  const [subsUnavailable, setSubsUnavailable] = useState(false);

  // Live TV channel switch: keep the header controls AND the carousel/recommendations
  // visible for continuous browsing. The switch transition no longer hides or blurs
  // the controls — they stay sharp on top. `state.isSwitching` is the canonical
  // signal (set the instant the user taps in usePlayer); mirror it to a ref and
  // pin the controls up the moment a switch begins.
  useEffect(() => {
    isSwitchingRef.current = state.isSwitching;
    if (state.isSwitching && !isVod) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current); // no idle-hide mid-switch
    }
  }, [state.isSwitching, isVod]);

  // Cinema intro — shows until video is READY (not a fixed timer)
  const [showCinemaIntro, setShowCinemaIntro] = useState(false);
  // Post-cinema blackout: pure black screen between intro and playback (no overlay, no controls)
  const [postCinemaBlackout, setPostCinemaBlackout] = useState(false);
  const cinemaChannelRef = useRef<string | null>(null);
  const cinemaMinTimeRef = useRef(false); // has minimum 2.5s elapsed?

  const cinemaMinTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const cinemaMaxTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Trigger the cinema intro when a VOD channel begins.
  const cinemaAbortedRef = useRef(false);
  const cinemaMutedByUsRef = useRef(false); // tracks if cinema intro owns the mute
  // ── ROOT-CAUSE FIX (movies black) ─────────────────────────────────────────
  // Keyed on the channel ID ONLY — never on state.isLoading. isLoading toggles
  // constantly (the early isLoading:false in playChannel, every buffer stall), and
  // the previous version's cleanup cleared the cinema timers + unmuted on EVERY
  // toggle. That stranded `cinemaMinTimeRef=false` forever, so the dismiss effect
  // never fired and `showCinemaIntro` stayed true — the black intro / blackout sat
  // ON TOP of a playing movie (controls portal renders over the persistent <video>).
  // Now the timers are armed once per actual channel change; teardown is unmount-only.
  // FLICKER FIX: useLayoutEffect (not useEffect) so showCinemaIntro is set BEFORE the
  // browser paints the channel-change render — the cinema intro appears in the SAME
  // frame, eliminating the 1-frame gap where the bare loading video would flash.
  useLayoutEffect(() => {
    const ch = state.channel;
    const channelId = ch?.id ?? null;
    const isVodCh = ch?.category === 'movie' || ch?.category === 'series';

    if (!channelId) {
      cinemaChannelRef.current = null;
      setShowCinemaIntro(false);
      setPostCinemaBlackout(false);
      return;
    }
    if (channelId === cinemaChannelRef.current) return; // same channel — don't re-arm
    cinemaChannelRef.current = channelId;

    // Reset any in-flight cinema timers from a previous channel.
    clearTimeout(cinemaMinTimerRef.current);
    clearTimeout(cinemaMaxTimerRef.current);

    if (!isVodCh) {
      // Live channel — no cinema intro; ensure no black overlay lingers.
      setShowCinemaIntro(false);
      setPostCinemaBlackout(false);
      return;
    }

    // VOD — run the DASH cinema bumper while the movie buffers.
    cinemaMinTimeRef.current = false;
    cinemaAbortedRef.current = false;
    setShowCinemaIntro(true);
    setPostCinemaBlackout(false);
    if (videoRef.current && !state.isMuted) {
      videoRef.current.muted = true;
      cinemaMutedByUsRef.current = true;
    }
    cinemaMinTimerRef.current = setTimeout(() => { cinemaMinTimeRef.current = true; }, 2500);
    cinemaMaxTimerRef.current = setTimeout(() => {
      if (cinemaAbortedRef.current) return;
      // Bumper time expired without frames — fall back to the pure-black hold; the
      // safety-lift effect below guarantees this can never strand the viewer.
      setShowCinemaIntro(false);
      setPostCinemaBlackout(true);
      setControlsVisible(false);
    }, 8000);
  }, [state.channel?.id]);

  // Cinema timers: cleared only on unmount (channel-change resets happen above).
  useEffect(() => () => {
    clearTimeout(cinemaMinTimerRef.current);
    clearTimeout(cinemaMaxTimerRef.current);
  }, []);

  // ── SAFETY: a movie must NEVER sit behind a stuck black overlay. ───────────
  // The cinema intro + post-cinema blackout are black layers above the <video>. If
  // any state event is missed they can strand the viewer on a black screen with
  // audio. This force-LIFTS both the instant the stream actually presents frames
  // (readyState≥3 + clock advancing), after a brief min-hold so the bumper breathes,
  // and hard-caps them with an absolute timeout. It only ever CLEARS black overlays.
  useEffect(() => {
    if (!showCinemaIntro && !postCinemaBlackout) return;
    const video = videoRef.current;
    const start = Date.now();
    const lift = () => {
      if (cinemaMutedByUsRef.current && videoRef.current) {
        videoRef.current.muted = false;
        cinemaMutedByUsRef.current = false;
      }
      cinemaAbortedRef.current = true;
      setShowCinemaIntro(false);
      setPostCinemaBlackout(false);
    };
    const onFrame = () => {
      const v = videoRef.current;
      if (v && !v.paused && v.readyState >= 3 && v.currentTime > 0 && Date.now() - start >= 1200) lift();
    };
    onFrame(); // already presenting? lift (respecting the min-hold).
    const minHoldCheck = setTimeout(onFrame, 1300); // re-check right after the min-hold
    video?.addEventListener('timeupdate', onFrame);
    video?.addEventListener('playing', onFrame);
    video?.addEventListener('loadeddata', onFrame);
    const hardCap = setTimeout(lift, 9000); // absolute — black can never outlive this
    return () => {
      clearTimeout(minHoldCheck);
      clearTimeout(hardCap);
      video?.removeEventListener('timeupdate', onFrame);
      video?.removeEventListener('playing', onFrame);
      video?.removeEventListener('loadeddata', onFrame);
    };
  }, [showCinemaIntro, postCinemaBlackout]);

  // Dismiss cinema intro when video starts playing AND min time elapsed
  useEffect(() => {
    if (showCinemaIntro && state.isPlaying && cinemaMinTimeRef.current) {
      const video = videoRef.current;
      // Verify video has actually decoded frames (readyState >= HAVE_CURRENT_DATA)
      if (video && video.readyState >= 2) {
        if (cinemaMutedByUsRef.current) {
          video.muted = false;
          cinemaMutedByUsRef.current = false;
        }
        cinemaAbortedRef.current = true;
        setControlsVisible(false);
        setShowCinemaIntro(false);
        // No blackout needed — video is already playing with frames decoded
      } else {
        // Video not fully ready — enter blackout (pure black until frames arrive)
        cinemaAbortedRef.current = true;
        setShowCinemaIntro(false);
        setPostCinemaBlackout(true);
        setControlsVisible(false);
        // Unmute will happen when blackout lifts
      }
    }
  }, [showCinemaIntro, state.isPlaying]);

  // Also enter blackout when cinema max timer fires but video isn't playing yet
  // (the 8s max timer in the cinema effect above sets showCinemaIntro=false)

  // Lift blackout once video has decoded frames
  useEffect(() => {
    if (postCinemaBlackout && state.isPlaying) {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        // Unmute if cinema intro owned the mute
        if (cinemaMutedByUsRef.current) {
          video.muted = false;
          cinemaMutedByUsRef.current = false;
        }
        setPostCinemaBlackout(false);
        // Let movie breathe — controls hidden for 3s
        setControlsVisible(false);
        hideTimerRef.current = setTimeout(() => setControlsVisible(true), 3000);
      } else {
        // Not fully decoded yet — poll briefly
        const poll = setInterval(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            clearInterval(poll);
            if (cinemaMutedByUsRef.current) {
              if (videoRef.current.muted) onToggleMute();
              cinemaMutedByUsRef.current = false;
            }
            setPostCinemaBlackout(false);
            setControlsVisible(false);
          }
        }, 200);
        return () => clearInterval(poll);
      }
    }
  }, [postCinemaBlackout, state.isPlaying]);

  const isPlayingRef = useRef(state.isPlaying);
  useEffect(() => { isPlayingRef.current = state.isPlaying; }, [state.isPlaying]);

  // ── Flow pill show + fade lifecycle ───────────────────────────────────────
  // Aziz loves the Flow pill but wants it to SOFTLY fade away, not linger/blink.
  // On each rising edge of state.flowAdapting (a fresh tier step) we mount the
  // pill and bump `flowKey` so the pure-CSS `flow-fade` animation replays from
  // solid (hold ~10s → ease to transparent by ~30s, fill-mode forwards). When
  // the 30s animation ends, onAnimationEnd unmounts it. No JS timers.
  const [flowShow, setFlowShow] = useState(false);
  const [flowKey, setFlowKey] = useState(0);
  const flowWasAdaptingRef = useRef(false);
  useEffect(() => {
    if (state.flowAdapting && !flowWasAdaptingRef.current) {
      setFlowShow(true);
      setFlowKey((k) => k + 1); // restart the show+fade on every fresh step
    }
    flowWasAdaptingRef.current = !!state.flowAdapting;
  }, [state.flowAdapting]);

  // Connecting-card throttle — decide once per (channel, loading-start) whether
  // the full logo+name block shows. After the first few channels this session,
  // only the thin top beam remains. Computed in an effect so the render stays
  // a pure read (no side effect during render).
  const [showConnectCard, setShowConnectCard] = useState(false);
  const [hasSmartMatch, setHasSmartMatch] = useState(false);
  const connectDecidedForRef = useRef<string | null>(null);
  useEffect(() => {
    const id = state.channel?.id ?? null;
    // Decide once per SWITCH (not per rebuffer) — a stall on the current channel must
    // not consume a connecting-card throttle slot or flash the card. Live-only: the
    // card never renders for VOD (cinema intro owns that), so VOD must not burn slots.
    if (state.isSwitching && id && !isVod) {
      if (connectDecidedForRef.current !== id) {
        connectDecidedForRef.current = id;
        setShowConnectCard(shouldShowConnectCard(id));
      }
    } else if (!state.isSwitching) {
      connectDecidedForRef.current = null;
    }
  }, [state.isSwitching, state.channel?.id, isVod]);

  // ── Buffering pill — DEBOUNCED both directions (FLICKER FIX) ──────────────
  // A rough stream fires `waiting`/`playing` repeatedly, toggling state.isLoading
  // fast. Rendering the pill directly off isLoading made it mount/unmount on every
  // toggle, restarting its fade-in each time = a flicker. We debounce: the pill only
  // appears after the buffering condition holds ~500ms, and only hides after it has
  // been clear ~400ms — so micro-stalls and rapid toggles never flicker it.
  const [showBuffering, setShowBuffering] = useState(false);
  const bufTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const buffering = state.isLoading && !state.isSwitching && state.isPlaying
      && !state.error && !showCinemaIntro && !postCinemaBlackout;
    clearTimeout(bufTimerRef.current);
    bufTimerRef.current = setTimeout(() => setShowBuffering(buffering), buffering ? 500 : 400);
    return () => clearTimeout(bufTimerRef.current);
  }, [state.isLoading, state.isSwitching, state.isPlaying, state.error, showCinemaIntro, postCinemaBlackout]);

  // Re-show the suggestions grid and restart its 15s idle fade. Lives outside the
  // controls' switch-cooldown guard so a tap always brings the grid back.
  const pokeSuggestions = useCallback(() => {
    setSuggestionsVisible(true);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(() => setSuggestionsVisible(false), 15000);
  }, []);

  const showControls = useCallback(() => {
    pokeSuggestions(); // grid follows its own 15s lifecycle, re-shown on any interaction
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // Auto-hide only while actively watching — never mid-switch (controls must
      // stay sharp on top through the whole transition).
      if (isPlayingRef.current && !isSwitchingRef.current) setControlsVisible(false);
    }, 3000);
  }, [pokeSuggestions]);

  // Controls lifecycle:
  //  • paused / VOD-paused → show controls (unless cinema/blackout owns the screen)
  //  • live switch in progress → keep controls visible + SHARP, no auto-hide
  //  • normal watching (incl. the moment a switch resolves) → show then auto-hide
  useEffect(() => {
    if (!state.isPlaying) {
      if (!showCinemaIntro && !postCinemaBlackout) {
        setControlsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
    } else if (!isVod && state.isSwitching) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showControls();
    }
  }, [state.isPlaying, state.isSwitching, showControls, isVod]);

  // Keyboard controls — extracted to useKeyboard hook
  const handleNextChannel = useCallback(() => {
    if (adjNext) { setCurrentChannel(adjNext.id); onRetry(adjNext); }
  }, [adjNext, onRetry]);

  const handlePrevChannel = useCallback(() => {
    if (adjPrev) { setCurrentChannel(adjPrev.id); onRetry(adjPrev); }
  }, [adjPrev, onRetry]);

  useKeyboard({
    isActive: !!state.channel,
    isPlaying: state.isPlaying,
    isMuted: state.isMuted,
    isVod,
    onTogglePlay,
    onToggleMute,
    onToggleFullscreen,
    onSeek,
    currentTime: state.currentTime,
    duration: state.duration,
    onNext: adjNext ? handleNextChannel : undefined,
    onPrev: adjPrev ? handlePrevChannel : undefined,
    onClose,
    onShowControls: showControls,
  });

  // Load subtitles for MKV VOD content
  useEffect(() => {
    const video = videoRef.current;
    const url = state.channel?.url;
    if (!video || !url || !url.includes('/vod?')) {
      setHasSubs(false);
      setSubsOn(false);
      setSubsUnavailable(false);
      return;
    }

    // Build subs URL from VOD URL params
    const subsUrl = url.replace('/vod?', '/subs?');
    const subsAbort = new AbortController();

    let activeBlobUrl: string | null = null;

    fetch(subsUrl, { signal: subsAbort.signal }).then(res => {
      if (res.status === 200) {
        return res.blob().then(blob => {
          activeBlobUrl = URL.createObjectURL(blob);
          // Remove existing tracks (proper iteration — don't use querySelector loop)
          Array.from(video.querySelectorAll('track')).forEach(t => {
            if (t.src) URL.revokeObjectURL(t.src);
            t.remove();
          });
          // Add new track
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = 'English';
          track.srclang = 'en';
          track.src = activeBlobUrl;
          track.default = false;
          video.appendChild(track);
          setHasSubs(true);
          setSubsUnavailable(false);
        });
      } else {
        setHasSubs(false);
        setSubsUnavailable(true);
      }
    }).catch((err) => { if (err.name !== 'AbortError') { setHasSubs(false); setSubsUnavailable(true); } });

    return () => {
      subsAbort.abort();
      // Revoke blob URL on cleanup — prevents memory leak
      if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
      // Remove tracks from video element
      if (video) Array.from(video.querySelectorAll('track')).forEach(t => t.remove());
    };
  }, [state.channel, videoRef]);

  const toggleSubs = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks[0]) return;
    const newState = !subsOn;
    video.textTracks[0].mode = newState ? 'showing' : 'hidden';
    setSubsOn(newState);
  }, [subsOn, videoRef]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

  if (!state.channel) return null;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="fixed inset-0 z-[51] flex items-center justify-center"
      // touch-action: manipulation disables iOS double-tap-to-zoom so the VOD
      // double-tap seek gesture can't accidentally zoom the layout. Pan + pinch stay.
      style={{ touchAction: 'manipulation' }}
      onMouseMove={showControls}
      onTouchStart={(e) => { showControls(); handleTouchStart(e); }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={surfHandlers.onPointerDown}
      onPointerMove={surfHandlers.onPointerMove}
      onPointerUp={surfHandlers.onPointerUp}
      onPointerCancel={surfHandlers.onPointerCancel}
      onClick={() => {
        if (controlsVisible) showControls();
        else setControlsVisible(true);
      }}
    >
      {/* Video element lives in App.tsx (persistent, never unmounts).
          It renders at z-50 behind this overlay when full player is active.
          No <video> here — eliminates mount/unmount audio orphaning. */}

      {/* New-era remote: directional swipe-surf peek. A subtle edge glow that
          tracks the live horizontal drag (live only), then settles. Purely a
          visual hint over the controls layer — never touches the <video>. */}
      {!isVod && surfDragX !== 0 && (
        <div className="absolute inset-0 z-[45] pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 bottom-0 w-16 sm:w-24"
            style={{
              [surfDragX > 0 ? 'left' : 'right']: 0,
              background: surfDragX > 0
                ? 'linear-gradient(90deg, rgba(157,78,221,0.30), transparent)'
                : 'linear-gradient(270deg, rgba(157,78,221,0.30), transparent)',
              opacity: Math.min(1, Math.abs(surfDragX) / 80),
              transition: `opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)`,
            } as React.CSSProperties}
          />
          {/* Channel-intent preview — confirms WHICH way you're surfing once the
              throw is committed (so swipe never feels like a guess). */}
          {Math.abs(surfDragX) > 100 && (surfDragX > 0 ? adjPrev : adjNext) && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${surfDragX > 0 ? 'left-3' : 'right-3'} flex flex-col items-center gap-1`}
              style={{ opacity: Math.min(1, (Math.abs(surfDragX) - 100) / 60) }}
            >
              <span className="text-[9px] uppercase tracking-[0.18em] text-primary-light/70 font-semibold">
                {surfDragX > 0 ? 'Prev' : 'Next'}
              </span>
              <span className="text-[11px] text-white/80 font-medium max-w-[88px] truncate text-center">
                {(surfDragX > 0 ? adjPrev : adjNext)?.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Category-surf bloom — vertical swipe switched category. A wash in the
          category accent + the NAME centered with a pulse. Blooms, holds ~0.6s,
          fades into the new channel. pointer-events-none — never blocks tap /
          controls / close / playback. */}
      {catOverlay && (
        <div
          key={catOverlay.key}
          className="absolute inset-0 z-[48] flex items-center justify-center pointer-events-none"
          style={{ animation: 'cat-bloom 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          {/* Accent wash */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${catOverlay.accent}38 0%, ${catOverlay.accent}1a 40%, transparent 72%)`,
            }}
          />
          {/* Pulse ring + name */}
          <div className="relative flex flex-col items-center gap-3">
            <div
              className="absolute -inset-10 rounded-full"
              style={{ boxShadow: `0 0 0 0 ${catOverlay.accent}59`, animation: 'connect-pulse 1.1s ease-out' }}
            />
            <span
              className="relative text-4xl sm:text-5xl font-black uppercase tracking-tight select-none"
              style={{
                color: '#fff',
                textShadow: `0 0 28px ${catOverlay.accent}cc, 0 0 60px ${catOverlay.accent}66`,
              }}
            >
              {catOverlay.name}
            </span>
          </div>
        </div>
      )}

      {/* Cinema intro — VOD only, runs independently of loading state.
          Suppressed on error: the full-screen z-[55] skip layer below would otherwise sit
          on top of the error/Reconnect overlay (z-40) and eat the recovery tap. */}
      {showCinemaIntro && !state.error && (
        <>
          <DashCinemaLoader title={state.channel?.name} />
          {/* Tap-to-skip — tap anywhere dismisses the cinema intro early and lets
              the stream through (never traps the viewer behind the brand bumper). */}
          <button
            onClick={(e) => { e.stopPropagation(); cinemaAbortedRef.current = true; setShowCinemaIntro(false); }}
            className="absolute inset-0 z-[55] cursor-pointer"
            aria-label="Skip intro"
          />
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-[56] pointer-events-none">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/35 font-semibold">Tap to skip</span>
          </div>
          {/* Escape hatch — always accessible during cinema intro */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowCinemaIntro(false); onClose(); }}
            className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="absolute bottom-6 left-6 z-[60] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Pause"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><rect x="2" y="1" width="3.5" height="12" rx="1"/><rect x="8.5" y="1" width="3.5" height="12" rx="1"/></svg>
          </button>
        </>
      )}

      {/* Live hold indicator */}
      {(liveHolding || liveCatchingUp) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div style={{
            background: 'rgba(5,3,15,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 20,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid rgba(255,255,255,0.10)',
          }}>
            {liveHolding ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>PAUSED — release to catch up</span>
              </>
            ) : (
              <>
                <span style={{ color: '#a855f7', fontSize: 14 }}>▶▶</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>Catching up to live…</span>
              </>
            )}
          </div>
        </div>
      )}

      {seekIndicator && (
        <div className={`absolute ${seekDirection === 'forward' ? 'right-8 sm:right-16' : 'left-8 sm:left-16'} top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-pulse`}>
          <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3.5 py-2.5">
            {seekDirection === 'forward' ? (
              <SkipForward className="w-5 h-5 text-white" />
            ) : (
              <SkipBack className="w-5 h-5 text-white" />
            )}
            <span className="text-base text-white font-semibold">10s</span>
          </div>
        </div>
      )}

      {/* Post-cinema blackout — pure black screen while video buffers after DASH intro */}
      {postCinemaBlackout && (
        <div className="absolute inset-0 z-40 bg-[#060609]" />
      )}

      {/* ── Channel SWITCH transition ──────────────────────────────────────
          Re-layered so the header controls stay SHARP on top of the blur. The
          loved flow is intact: frozen-frame snapshot (in App.tsx, z-50) + the
          250ms fade + generation guard + the instant connecting card. ONLY for a
          deliberate SWITCH / first-play (state.isSwitching) — a plain rebuffer of
          the current channel keeps controls sharp with no blur (handled below).
          Final z-order inside this overlay:
            blur (z-20, BELOW controls) → controls (z-30, sharp) → beam + card
            (z-45, on top). Every switch layer is pointer-events-none so it can
            never eat a tap on the controls / arrows / Flow button.
          GLITCH FIX: gated on !isVod. `state.isSwitching` is set SYNCHRONOUSLY in
          playChannel, but `showCinemaIntro` is set in a post-render effect — so for
          a VOD play this block rendered for ONE frame (the purple switch-blur flash)
          before the cinema intro took over. The blur/connecting-card is a live-surf
          concept anyway; VOD masking is owned entirely by the cinema intro. */}
      {state.isSwitching && !isVod && !state.error && !showCinemaIntro && !postCinemaBlackout && (
        <>
          {/* Blur overlay on the frozen frame — sits BELOW the controls layer. */}
          <div className="absolute inset-0 z-20 bg-black/35 transition-opacity duration-300 pointer-events-none"
               style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
          {/* Beam + connecting card — ABOVE the controls (top of the stack). */}
          <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
            {/* Thin beam at top */}
            <div className="absolute top-0 left-0 right-0 h-[2px]">
              <div className="h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.7), rgba(157,78,221,0.9), rgba(157,78,221,0.7), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'dash-beam 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </div>
            {/* Calm premium "connecting" — reassures on weak networks (buffering = the #1
                SL pain). Throttled: full logo+name block shows only the first few channels
                per session; after that just the thin top beam signals the switch. */}
            {showConnectCard && (
              <div className="relative flex flex-col items-center gap-3.5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-2xl" style={{ animation: 'connect-pulse 1.7s ease-in-out infinite' }} />
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(157,78,221,0.32)' }}>
                    {state.channel?.logo
                      ? <img src={state.channel.logo} alt="" className="w-full h-full object-contain p-1.5" />
                      : <Tv className="w-7 h-7 text-white/40" />}
                  </div>
                </div>
                <p className="text-[13px] text-white/85 font-medium tracking-wide max-w-xs text-center line-clamp-1 px-4">
                  {state.channel?.name || '…'}
                </p>
                {/* Only surfaces on genuinely slow connections — 4s delay means fast switches never see it. */}
                <p className="text-[11px] text-white/40 text-center -mt-1.5"
                   style={{ animation: 'fade-in 0.6s ease-out 4s both' }}>
                  Low network? Turn on FLOW
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Plain rebuffer of the CURRENT channel (not a switch) — the stream stalled
          while watching. Keep controls visible + SHARP: no blur, no connecting card,
          no control-hide. Just a subtle top-center spinner so the viewer knows it's
          working. pointer-events-none so it never eats a tap on the controls. */}
      {showBuffering && (
        <div className="absolute top-[64px] left-1/2 -translate-x-1/2 z-[35] pointer-events-none"
             style={{ animation: 'fade-in 0.3s ease-out both' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
               style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(157,78,221,0.2)' }}>
            <div className="w-3 h-3 rounded-full border-[1.5px] border-white/20 border-t-primary-light animate-spin" />
            <span className="text-[10px] text-white/55 font-medium tracking-wide">Buffering</span>
          </div>
        </div>
      )}

      {/* ── Flow indicator (predictive adapt) ──────────────────────────────────
          Subtle "Flow" mark shown when the predictive controller steps tiers (down
          to fit a shrinking pipe, or quietly back up) — a calm "holding it together"
          cue, never alarming. Aziz loves it but wants it to SOFTLY fade out: it shows
          solid, holds ~10s, then eases to fully transparent by ~30s via the pure-CSS
          `flow-fade` keyframe (fill-mode forwards). A fresh tier step bumps `flowKey`
          → the animation replays from solid. onAnimationEnd unmounts it (no JS timers).
          Suppressed while a switch/buffering pill already owns the top-center spot. */}
      {flowShow && !isVod && !state.isSwitching && !state.error && !showBuffering && (
        <div key={flowKey}
             className="absolute top-[64px] left-1/2 -translate-x-1/2 z-[35] pointer-events-none"
             style={{ animation: 'flow-fade 30s ease-in-out forwards' }}
             onAnimationEnd={() => setFlowShow(false)}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
               style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(157,78,221,0.22)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-primary-light" style={{ animation: 'flow-dot-pulse 1.6s ease-in-out infinite' }} />
            <span className="text-[10px] text-primary-light/80 font-medium tracking-[0.14em] uppercase">{t('flowHolding')}</span>
          </div>
        </div>
      )}

      {/* Unified reconnection flow — seamless between inner retries and outer retries */}
      {state.error && !state.isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#060609]/90 z-40">
          {state.error.includes('Retry') || (autoRetryRef.current < 3 && !state.error.includes('package')) ? (
            <div className="text-center">
              <p className="text-[12px] text-white/25 font-light tracking-wide">Reconnecting</p>
              <div className="mt-3 mx-auto w-8 h-[2px] rounded-full overflow-hidden bg-white/5">
                <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.2s ease-in-out infinite' }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-sm text-white/40">{state.error || 'Unable to connect — tap to try again'}</p>
              <div className="flex items-center gap-2.5">
                {!state.error.includes('package') && (
                  <button
                    onClick={() => { autoRetryRef.current = 0; state.channel && onRetry(state.channel); }}
                    className="flex items-center gap-2 px-5 py-3 bg-primary rounded-xl font-medium text-sm hover:bg-primary-light transition-colors active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reconnect
                  </button>
                )}
                {/* Never trap the viewer in a broken stream — give a way out. */}
                <button
                  onClick={() => (onBack || onClose)()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-white/70 hover:text-white transition-colors active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <ChevLeft className="w-4 h-4" />
                  Choose another
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart Match — quality variants + family channels (live only, hidden for VOD) */}
      {/* Stays visible during channel switch so user can keep browsing */}
      {!isVod && (
        <SmartMatchOverlay
          channel={state.channel}
          visible={controlsVisible || state.isSwitching}
          isLive={isLiveStream}
          onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
          onHasContent={setHasSmartMatch}
        />
      )}

      {/* Channel carousel = the channel-SUGGESTION grid. Rides its own 15s idle
          fade (Bug #2): lingers after the controls hide, then fades to the clean
          minimal look; any tap/move re-shows it. Still shows through a switch. */}
      {!isVod && (
        <ChannelCarousel
          visible={suggestionsVisible || state.isSwitching}
          isLive={isLiveStream}
          onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
        />
      )}

      {/* CC unavailable indicator — shown when subtitle fetch failed for a VOD */}
      {subsUnavailable && state.channel?.url?.includes('/vod?') && (
        <div className="absolute bottom-20 right-4 z-40 pointer-events-none">
          <span className="text-[10px] text-white/40 bg-black/60 px-2 py-0.5 rounded">CC unavailable</span>
        </div>
      )}

      {/* Channel switching arrows — large edge zones (live only, hidden for VOD) */}
      {!isVod && (
        <ChannelArrows
          controlsVisible={controlsVisible}
          isLive={isLiveStream}
          onRetry={onRetry}
          showControls={showControls}
        />
      )}

      {/* Top corner prev/next hints (live only, hidden for VOD) */}
      {!isVod && (
        <ChannelHints
          visible={controlsVisible}
          isLive={isLiveStream}
          onSwitch={(ch) => { setCurrentChannel(ch.id); onRetry(ch); }}
        />
      )}

      {/* Landscape genre quick-switch (live only, hidden for VOD) */}
      {!isVod && (
        <LandscapeGenreBar
          visible={controlsVisible}
          isFullscreen={state.isFullscreen}
          isLive={isLiveStream}
          onGenreSwitch={onGenreSwitch}
          hasSibling={hasSmartMatch}
        />
      )}

      {/* EPG Widget — bottom-left now playing + schedule */}
      <EpgWidget
        streamId={state.channel?.id ? parseInt(state.channel.id.replace(/^live-/, ''), 10) || null : null}
        visible={controlsVisible}
        isLive={isLiveStream}
      />

      {/* Permanent ambient aurora tint — always on for live channels, very soft.
          The controls gradient (below) blooms stronger on tap; this is the baseline. */}
      {!isVod && !showCinemaIntro && !postCinemaBlackout && (
        <div className="player-ambient-tint absolute bottom-0 left-0 right-0 h-[7%] z-[19] pointer-events-none" />
      )}

      {/* Controls overlay — hidden during cinema intro and post-cinema blackout.
          Wrapped at z-30 so it renders SHARP above the switch blur (z-20) while the
          beam + connecting card (z-45) stay on top. This is the layer that must
          never blur during a switch — next/prev, Flow button + options live here. */}
      {!showCinemaIntro && !postCinemaBlackout && (
        <div className="absolute inset-0 z-30">
          <PlayerControls
            state={state}
            onTogglePlay={onTogglePlay}
            onToggleMute={onToggleMute}
            onVolumeChange={onVolumeChange}
            onToggleFullscreen={onToggleFullscreen}
            onTogglePiP={onTogglePiP}
            onQualityChange={onQualityChange}
            onClose={onClose}
            onBack={onBack}
            onSeek={onSeek}
            visible={controlsVisible}
            hasSubs={hasSubs}
            subsOn={subsOn}
            onToggleSubs={toggleSubs}
            ambientOn={ambientOn}
            onToggleAmbient={() => {
              const next = toggleAmbient();
              setAmbientOn(next);
            }}
          />
        </div>
      )}
    </div>
  );
};

/** DASH Cinema Loader — cinematic intro that masks buffer time for VOD content.
 *  Phase timeline (~2.5s total):
 *    0 (0-200ms)      — Pure black, screen settles
 *    1 (200-700ms)    — Purple glow emanates from center + "Zzzzoum" sound
 *    2 (700-1200ms)   — "DASH" text fades in, letter-spacing widens + "toundoum" impact
 *    3 (1200-2000ms)  — Movie title fades in, subtle pulse on glow
 *    4 (2000-2500ms)  — Everything fades to transparent, video takes over
 */
function DashCinemaLoader({ title }: { title?: string }) {
  const [phase, setPhase] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 0 → 1: Black settles, then glow + sound
    // Sound plays from App.tsx click handler (user gesture required for AudioContext)
    timers.push(setTimeout(() => setPhase(1), 200));

    // Phase 1 → 2: DASH text appears (synced with "toundoum" at ~500ms into sound)
    timers.push(setTimeout(() => setPhase(2), 700));

    // Phase 2 → 3: Movie title fades in
    timers.push(setTimeout(() => setPhase(3), 1200));

    // Phase 3 → 4: Fade out — video takes over
    timers.push(setTimeout(() => setPhase(4), 2000));

    // Final dismiss after fade-out transition completes
    timers.push(setTimeout(() => setDismissed(true), 2500));

    return () => timers.forEach(clearTimeout);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: 'black',
        opacity: phase >= 4 ? 0 : 1,
        transition: 'opacity 500ms ease-out',
        pointerEvents: phase >= 4 ? 'none' : 'auto',
      }}
    >
      {/* Purple radial glow — expands from center */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(157,78,221,0.35) 0%, rgba(157,78,221,0.12) 35%, rgba(157,78,221,0.03) 60%, transparent 75%)',
          transform: `scale(${phase >= 1 ? (phase >= 2 ? 1.8 : 1.2) : 0})`,
          opacity: phase >= 1 ? (phase >= 4 ? 0 : 1) : 0,
          transition: phase >= 2 ? 'transform 800ms ease-out, opacity 500ms ease-out' : 'transform 500ms ease-out, opacity 400ms ease-out',
        }}
      />

      {/* Glow pulse ring — synced with "toundoum" bass hit */}
      {phase >= 2 && phase < 4 && (
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            border: '1px solid rgba(157,78,221,0.2)',
            animation: 'cinema-pulse 1.5s ease-out forwards',
          }}
        />
      )}

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* DASH text — letter-spacing animates from tight to wide */}
        <h2
          className="text-3xl sm:text-4xl font-black uppercase select-none"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: `translateY(${phase >= 2 ? 0 : 12}px)`,
            letterSpacing: phase >= 2 ? (phase >= 3 ? '0.5em' : '0.15em') : '0.05em',
            color: '#C77DFF',
            textShadow: phase >= 2
              ? '0 0 30px rgba(157,78,221,0.6), 0 0 60px rgba(157,78,221,0.2)'
              : 'none',
            transition: 'opacity 400ms ease-out, transform 400ms ease-out, letter-spacing 800ms cubic-bezier(0.16, 1, 0.3, 1), text-shadow 400ms ease-out',
          }}
        >
          DASH
        </h2>

        {/* Thin accent line under DASH */}
        <div
          style={{
            width: phase >= 2 ? 60 : 0,
            height: 1,
            marginTop: 12,
            background: 'linear-gradient(90deg, transparent, rgba(199,125,255,0.5), transparent)',
            opacity: phase >= 2 ? (phase >= 4 ? 0 : 0.7) : 0,
            transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-out',
          }}
        />

        {/* Movie title */}
        {title && (
          <p
            className="mt-5 text-sm sm:text-base text-center max-w-xs select-none"
            style={{
              opacity: phase >= 3 ? (phase >= 4 ? 0 : 0.4) : 0,
              transform: `translateY(${phase >= 3 ? 0 : 8}px)`,
              color: 'rgba(255,255,255,0.4)',
              transition: 'opacity 500ms ease-out, transform 500ms ease-out',
            }}
          >
            {title}
          </p>
        )}
      </div>

      <style>{`
        @keyframes cinema-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/** Channel switching arrows — large edge zones between top bar and carousel */
function ChannelArrows({
  controlsVisible,
  isLive,
  onRetry,
  showControls,
}: {
  controlsVisible: boolean;
  isLive: boolean;
  onRetry: (channel: import('@/types').Channel) => void;
  showControls: () => void;
}) {
  const { prev, next } = useAdjacentChannels();

  const switchTo = useCallback((channel: import('@/types').Channel) => {
    setCurrentChannel(channel.id);
    onRetry(channel);
  }, [onRetry]);

  // Keyboard: PageUp/PageDown for channel switching
  useEffect(() => {
    if (!isLive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'PageUp' && prev) {
        e.preventDefault();
        switchTo(prev);
        showControls();
      } else if (e.key === 'PageDown' && next) {
        e.preventDefault();
        switchTo(next);
        showControls();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLive, prev, next, switchTo, showControls]);

  if (!isLive || (!prev && !next)) return null;

  // Safe zone: below top bar (56px), above carousel+controls (~160px from bottom)
  return (
    <>
      {/* Left edge — large tap zone spanning safe middle area */}
      {prev && (
        <button
          onClick={(e) => { e.stopPropagation(); switchTo(prev); }}
          className={`absolute left-0 top-[56px] bottom-[160px] w-12 sm:w-14 z-40
                      flex items-center justify-center group
                      transition-opacity duration-300
                      ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label={`Previous: ${prev.name}`}
        >
          {/* Gradient edge glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center
                          bg-black/25 backdrop-blur-sm border border-white/8
                          group-hover:bg-primary/15 group-hover:border-primary/40
                          group-hover:shadow-lg group-hover:shadow-primary/25
                          group-active:scale-90 transition-[transform,background-color,border-color,box-shadow] duration-300">
            <ChevLeft
              className="w-5 h-5 text-white/50 group-hover:text-primary-light transition-colors"
              style={{ filter: 'drop-shadow(0 0 4px rgba(157, 78, 221, 0.3))' }}
            />
          </div>
        </button>
      )}

      {/* Right edge — same, mirrored */}
      {next && (
        <button
          onClick={(e) => { e.stopPropagation(); switchTo(next); }}
          className={`absolute right-0 top-[56px] bottom-[160px] w-12 sm:w-14 z-40
                      flex items-center justify-center group
                      transition-opacity duration-300
                      ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label={`Next: ${next.name}`}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center
                          bg-black/25 backdrop-blur-sm border border-white/8
                          group-hover:bg-primary/15 group-hover:border-primary/40
                          group-hover:shadow-lg group-hover:shadow-primary/25
                          group-active:scale-90 transition-[transform,background-color,border-color,box-shadow] duration-300">
            <ChevRight
              className="w-5 h-5 text-white/50 group-hover:text-primary-light transition-colors"
              style={{ filter: 'drop-shadow(0 0 4px rgba(157, 78, 221, 0.3))' }}
            />
          </div>
        </button>
      )}
    </>
  );
}

/** Top corner prev/next channel hints — subtle VOYO SmallCard style */
function ChannelHints({
  visible,
  isLive,
  onSwitch,
}: {
  visible: boolean;
  isLive: boolean;
  onSwitch: (channel: import('@/types').Channel) => void;
}) {
  const { prev, next } = useAdjacentChannels();

  if (!isLive || (!prev && !next)) return null;

  return (
    <>
      {/* Previous channel — top left, below the top bar */}
      {prev && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentChannel(prev.id); onSwitch(prev); }}
          title={`Previous: ${prev.name}`}
          className={`absolute top-[56px] left-3 z-35 flex items-center gap-2 px-2 py-1.5 rounded-xl
                      transition-opacity duration-300
                      ${visible ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <ChevLeft className="w-3 h-3 text-white/50" />
          <div className="w-6 h-6 flex-shrink-0">
            <ChannelIcon src={prev.logo} name={prev.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
          </div>
          <span className="text-[10px] text-white/55 max-w-[64px] truncate hidden sm:block">{prev.name}</span>
        </button>
      )}

      {/* Next channel — top right, below the top bar, offset from X button */}
      {next && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentChannel(next.id); onSwitch(next); }}
          title={`Next: ${next.name}`}
          className={`absolute top-[56px] right-[calc(2.75rem+0.5rem)] z-35 flex items-center gap-2 px-2 py-1.5 rounded-xl
                      transition-opacity duration-300
                      ${visible ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span className="text-[10px] text-white/55 max-w-[64px] truncate hidden sm:block">{next.name}</span>
          <div className="w-6 h-6 flex-shrink-0">
            <ChannelIcon src={next.logo} name={next.name} size="sm" className="!w-6 !h-6 !text-[8px] !rounded-md" />
          </div>
          <ChevRight className="w-3 h-3 text-white/50" />
        </button>
      )}
    </>
  );
}

/** Landscape genre quick-switch bar — fullscreen-only horizontal pill row */
function LandscapeGenreBar({
  visible,
  isFullscreen,
  isLive,
  onGenreSwitch,
  hasSibling,
}: {
  visible: boolean;
  isFullscreen: boolean;
  isLive: boolean;
  onGenreSwitch?: (themeId: string) => void;
  hasSibling?: boolean;
}) {
  const themes = [
    { id: 'sports',        name: 'Sports' },
    { id: 'news',          name: 'News' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'kids',          name: 'Kids' },
    { id: 'movies247',     name: 'Movies' },
    { id: 'documentary',   name: 'Discovery' },
    { id: 'music',         name: 'Music' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const rafRef = useRef(0);

  // Dismissed by swipe-down — resets whenever the bar becomes visible again
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (visible) setDismissed(false); }, [visible]);

  // Track focused pill based on scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const containerRect = el.getBoundingClientRect();
        const center = containerRect.left + containerRect.width / 2;
        let bestIdx = 0, bestDist = Infinity;
        pillRefs.current.forEach((pill, i) => {
          if (!pill) return;
          const r = pill.getBoundingClientRect();
          const dist = Math.abs((r.left + r.width / 2) - center);
          if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        });
        setFocusIdx(bestIdx);
      });
    };
    el.addEventListener('scroll', update, { passive: true });
    update(); // run once on mount
    return () => { el.removeEventListener('scroll', update); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Swipe-down to dismiss — non-passive so we can prevent scroll bleed
  const swipeDownRef = useRef<{ startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => { swipeDownRef.current = { startY: e.touches[0].clientY }; };
    const onMove = (e: TouchEvent) => {
      if (!swipeDownRef.current) return;
      const dy = e.touches[0].clientY - swipeDownRef.current.startY;
      if (dy > 8) e.preventDefault(); // prevent page scroll during downward intent
    };
    const onEnd = (e: TouchEvent) => {
      if (!swipeDownRef.current) return;
      const dy = e.changedTouches[0].clientY - swipeDownRef.current.startY;
      swipeDownRef.current = null;
      if (dy > 36) setDismissed(true);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  if (!isFullscreen || !isLive) return null;

  const isShown = visible && !dismissed;

  return (
    <div
      ref={containerRef}
      className={`absolute left-0 right-0 z-30 transition-[opacity,transform] duration-300
                  ${isShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
      style={{ bottom: hasSibling ? 130 : 48, transition: 'opacity 300ms, transform 300ms, bottom 300ms' }}
    >
      <div
        className="mx-3 rounded-xl px-1 py-2 flex justify-center"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          transform: hasSibling ? undefined : 'scale(1.35)',
          transformOrigin: 'bottom center',
          transition: 'transform 300ms',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden"
          style={{ maskImage: 'linear-gradient(to right, transparent 0px, black 14px, black calc(100% - 14px), transparent 100%)' }}
        >
          <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-3">
            {themes.map((theme, i) => {
              const isFocal = i === focusIdx;
              return (
                <button
                  key={theme.id}
                  ref={el => { pillRefs.current[i] = el; }}
                  onClick={() => { if (onGenreSwitch) onGenreSwitch(theme.id); }}
                  style={{
                    transform: isFocal ? 'scale(1.12)' : 'scale(0.92)',
                    transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms, color 250ms, border-color 250ms',
                  }}
                  className={`flex-shrink-0 text-[12px] px-4 py-2 rounded-full font-medium active:scale-95
                              bg-black/30 backdrop-blur-sm border
                              ${isFocal
                                ? 'text-white border-white/30'
                                : 'text-white/40 border-white/[0.06]'}`}
                >
                  {theme.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** SmartMatch overlay — bridges playlist state to SmartMatch component */
function SmartMatchOverlay({
  channel,
  visible,
  isLive,
  onSwitch,
  onHasContent,
}: {
  channel: Channel | null;
  visible: boolean;
  isLive: boolean;
  onSwitch: (channel: Channel) => void;
  onHasContent?: (has: boolean) => void;
}) {
  const { channels } = usePlaylistState();

  if (!isLive || !channel || channels.length <= 1) return null;

  return (
    <SmartMatch
      currentChannel={channel}
      allChannels={channels}
      onSwitch={onSwitch}
      visible={visible}
      onHasContent={onHasContent}
    />
  );
}

/** Channel carousel — concave arc conveyor belt (VOYO CompassArc adapted) */
function ChannelCarousel({
  visible,
  isLive,
  onSwitch,
}: {
  visible: boolean;
  isLive: boolean;
  onSwitch: (channel: import('@/types').Channel) => void;
}) {
  const { channels, currentId } = usePlaylistState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to center the current channel
  useEffect(() => {
    if (!scrollRef.current || !currentId) return;
    const el = scrollRef.current.querySelector(`[data-chid="${currentId}"]`) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentId]);

  if (!isLive || channels.length <= 1) return null;

  // Compute arc offsets relative to current channel index
  const currentIdx = channels.findIndex(c => c.id === currentId);

  return (
    <div
      className={`absolute bottom-[164px] sm:bottom-[176px] left-0 right-0 z-40 transition-[opacity,transform] duration-300
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      {/* Glass background */}
      <div className="mx-2 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(157, 78, 221, 0.12)',
        }}
      >
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-2 py-2 items-end"
          style={{ minHeight: 56 }}
          onClick={(e) => e.stopPropagation()}
        >
          {channels.map((ch, i) => {
            const isCurrent = ch.id === currentId;
            // Concave arc: cards further from center dip down + shrink
            const absOffset = currentIdx >= 0 ? Math.abs(i - currentIdx) : 0;
            const yShift = Math.min(absOffset * absOffset * 1.5, 12); // quadratic dip, max 12px
            const scale = Math.max(1 - absOffset * 0.04, 0.85); // subtle shrink
            const opacity = isCurrent ? 1 : Math.max(1 - absOffset * 0.12, 0.4);

            return (
              <button
                key={ch.id}
                data-chid={ch.id}
                onPointerDown={() => {
                  // Pre-warm the HLS manifest on first touch — by the time the player
                  // is created (~100ms later), the 1KB .m3u8 is already in browser cache.
                  // Never fire on proxy .ts streams (would start VPS transcoding early).
                  if (!isCurrent && ch.url?.includes('.m3u8')) {
                    fetch(ch.url, { signal: AbortSignal.timeout(3000) })
                      .then(r => r.body?.cancel())
                      .catch(() => {});
                  }
                }}
                onClick={() => { if (!isCurrent) onSwitch(ch); }}
                className={`flex-shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1.5 rounded-xl transition-[transform,background-color,border-color,box-shadow] duration-300
                  ${isCurrent
                    ? 'bg-primary/20 border border-primary/50 shadow-md shadow-primary/20'
                    : 'bg-white/[0.04] border border-transparent hover:bg-white/[0.08] hover:border-white/15 active:scale-95'
                  }`}
                style={{
                  transform: `translateY(${yShift}px) scale(${scale})`,
                  opacity,
                }}
              >
                <div className="w-7 h-7 flex-shrink-0">
                  <ChannelIcon src={ch.logo} name={ch.name} size="sm" className="!w-7 !h-7 !text-[10px] !rounded-lg" />
                </div>
                <span className={`text-[10px] whitespace-nowrap max-w-[70px] truncate leading-tight
                  ${isCurrent ? 'text-primary-light font-semibold' : 'text-white/50'}`}>
                  {ch.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
