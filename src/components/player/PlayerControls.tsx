import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  X,
  ChevronLeft,
} from 'lucide-react';
import type { PlayerState } from '@/types';

interface Props {
  state: PlayerState;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onQualityChange: (quality: string, index: number) => void;
  onClose: () => void;
  onBack?: () => void;
  visible: boolean;
}

export const PlayerControls: React.FC<Props> = ({
  state,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
  onTogglePiP,
  onQualityChange,
  onClose,
  onBack,
  visible,
}) => {
  const [showQuality, setShowQuality] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  // Close quality menu on click outside
  useEffect(() => {
    if (!showQuality) return;
    const handler = () => setShowQuality(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showQuality]);

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Top gradient + info */}
      <div className="player-top-gradient p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white">
              {state.channel?.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              {state.channel?.country && <span>{state.channel.country}</span>}
              {state.channel?.category && (
                <span className="capitalize">{state.channel.category}</span>
              )}
              <span className="flex items-center gap-1">
                <span className="live-pulse !w-1.5 !h-1.5" />
                LIVE
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center play button */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center hover:bg-primary transition-all hover:scale-110 active:scale-95 shadow-lg shadow-primary/30"
        >
          {state.isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>
      </div>

      {/* Bottom controls */}
      <div className="player-controls-gradient p-4 pt-12">
        {/* Live indicator bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-red-500 rounded-full w-full animate-pulse" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              {state.isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* Volume */}
            <div
              className="relative flex items-center"
              ref={volumeRef}
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                onClick={onToggleMute}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                {state.isMuted || state.volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume slider */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  showVolume ? 'w-20 opacity-100 ml-1' : 'w-0 opacity-0'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.isMuted ? 0 : state.volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Live badge */}
            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded ml-2">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Quality selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuality(!showQuality);
                }}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              {showQuality && (
                <div className="absolute bottom-12 right-0 bg-bg-surface border border-white/10 rounded-xl shadow-2xl py-2 min-w-[140px] animate-slide-up">
                  <p className="text-[10px] font-medium text-text-muted uppercase px-3 pb-1">
                    Quality
                  </p>
                  {state.qualities.map((q, i) => (
                    <button
                      key={q}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQualityChange(q, i);
                        setShowQuality(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-bg-hover transition-colors ${
                        state.quality === q ? 'text-primary-light font-medium' : 'text-text-secondary'
                      }`}
                    >
                      {q}
                      {state.quality === q && (
                        <span className="ml-2 text-xs text-primary">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              onClick={onTogglePiP}
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              {state.isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
