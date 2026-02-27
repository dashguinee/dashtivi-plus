import React from 'react';
import { Play, Pause, X, Maximize2 } from 'lucide-react';
import type { PlayerState } from '@/types';

interface Props {
  state: PlayerState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onClose: () => void;
  onExpand: () => void;
  visible: boolean;
}

export const MiniPlayer: React.FC<Props> = ({
  state,
  onTogglePlay,
  onClose,
  onExpand,
  visible,
}) => {
  if (!state.channel || !visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-40 animate-slide-up">
      <div className="glass-strong rounded-2xl shadow-2xl shadow-black/50 overflow-hidden w-72 sm:w-80 neon-primary">
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail placeholder */}
          <div
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-indigo-900/30 flex items-center justify-center flex-shrink-0 cursor-pointer"
            onClick={onExpand}
          >
            <span className="text-lg font-bold text-white/20">
              {state.channel.name.charAt(0)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">{state.channel.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="live-pulse !w-1.5 !h-1.5" />
              <span className="text-[10px] text-success font-medium">LIVE</span>
              {state.isLoading && (
                <span className="text-[10px] text-warning">Buffering...</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePlay}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
            >
              {state.isPlaying ? (
                <Pause className="w-4 h-4 text-primary-light" />
              ) : (
                <Play className="w-4 h-4 text-primary-light ml-0.5" />
              )}
            </button>
            <button
              onClick={onExpand}
              className="w-8 h-8 rounded-full hover:bg-bg-hover flex items-center justify-center transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-bg-hover flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Progress bar (visual only for live) */}
        <div className="h-0.5 bg-bg-elevated">
          <div className="h-full bg-primary w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};
