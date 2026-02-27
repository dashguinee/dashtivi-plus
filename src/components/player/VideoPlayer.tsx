import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerControls } from './PlayerControls';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { Channel, PlayerState } from '@/types';

interface Props {
  state: PlayerState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onQualityChange: (quality: string, index: number) => void;
  onClose: () => void;
  onRetry: (channel: Channel) => void;
  onBack?: () => void;
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
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (state.isPlaying) setControlsVisible(false);
    }, 3000);
  }, [state.isPlaying]);

  // Show controls when paused
  useEffect(() => {
    if (!state.isPlaying) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showControls();
    }
  }, [state.isPlaying, showControls]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          onToggleMute();
          break;
        case 'Escape':
          if (state.isFullscreen) onToggleFullscreen();
          else onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(1, state.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(0, state.volume - 0.1));
          break;
      }
      showControls();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, onTogglePlay, onToggleFullscreen, onToggleMute, onVolumeChange, onClose, showControls]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!state.channel) return null;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center ${
        state.isFullscreen ? '' : ''
      }`}
      onMouseMove={showControls}
      onClick={() => {
        if (controlsVisible) showControls();
        else setControlsVisible(true);
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
      />

      {/* Loading overlay */}
      {state.isLoading && !state.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <LoadingSpinner size="lg" text="Loading stream..." />
        </div>
      )}

      {/* Error overlay */}
      {state.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-error" />
            </div>
            <h3 className="text-lg font-semibold">Channel Unavailable</h3>
            <p className="text-sm text-text-secondary">{state.error}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => state.channel && onRetry(state.channel)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-bg-elevated rounded-lg font-medium text-sm hover:bg-bg-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls overlay */}
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
        visible={controlsVisible}
      />
    </div>
  );
};
