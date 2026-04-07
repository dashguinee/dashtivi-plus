import { useEffect } from 'react';

interface UseKeyboardProps {
  isActive: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isVod: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSeek?: (time: number) => void;
  currentTime: number;
  duration: number;
  onNext?: () => void;
  onPrev?: () => void;
  onClose: () => void;
  onShowControls: () => void;
}

/**
 * Keyboard shortcuts for the video player (desktop).
 *
 * Space / K  = play / pause
 * M          = mute / unmute
 * F          = toggle fullscreen
 * Escape     = close player
 * ArrowRight = seek +10 s  (VOD only)
 * ArrowLeft  = seek -10 s  (VOD only)
 * ArrowUp    = next channel (live only)
 * ArrowDown  = prev channel (live only)
 */
export function useKeyboard({
  isActive,
  isPlaying,
  isMuted,
  isVod,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  onSeek,
  currentTime,
  duration,
  onNext,
  onPrev,
  onClose,
  onShowControls,
}: UseKeyboardProps) {
  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs, textareas, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // Don't fire when a modal/dialog is open (check for common patterns)
      if (document.querySelector('[role="dialog"]') || document.querySelector('[data-modal]')) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          onTogglePlay();
          break;

        case 'm':
          e.preventDefault();
          onToggleMute();
          break;

        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;

        case 'Escape':
          onClose();
          break;

        case 'ArrowRight':
          if (isVod && onSeek && duration > 0) {
            e.preventDefault();
            onSeek(Math.min(duration, currentTime + 10));
          }
          break;

        case 'ArrowLeft':
          if (isVod && onSeek && duration > 0) {
            e.preventDefault();
            onSeek(Math.max(0, currentTime - 10));
          }
          break;

        case 'ArrowUp':
          if (!isVod && onNext) {
            e.preventDefault();
            onNext();
          }
          break;

        case 'ArrowDown':
          if (!isVod && onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;

        default:
          return; // don't trigger showControls for unhandled keys
      }

      onShowControls();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isActive,
    isPlaying,
    isMuted,
    isVod,
    onTogglePlay,
    onToggleMute,
    onToggleFullscreen,
    onSeek,
    currentTime,
    duration,
    onNext,
    onPrev,
    onClose,
    onShowControls,
  ]);
}
