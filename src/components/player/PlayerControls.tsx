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
  Download,
} from 'lucide-react';
import type { PlayerState } from '@/types';
import { getStreamQuality, setStreamQuality } from '@/lib/xtream';
import type { StreamQuality } from '@/lib/xtream';

/** Format seconds into H:MM:SS or M:SS */
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

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
  onSeek?: (time: number) => void;
  visible: boolean;
  hasSubs?: boolean;
  subsOn?: boolean;
  onToggleSubs?: () => void;
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
  onSeek,
  visible,
  hasSubs,
  subsOn,
  onToggleSubs,
}) => {
  const [showQuality, setShowQuality] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const category = state.channel?.category?.toLowerCase() ?? '';
  const isVod = category === 'movie' || category === 'series';

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
              <span className="font-bold tracking-wider text-primary-light">DASH</span>
              {!isVod && (
                <span className="flex items-center gap-1">
                  <span className="live-pulse !w-1.5 !h-1.5" />
                  LIVE
                </span>
              )}
              {isVod && state.duration > 0 && (
                <span className="text-text-muted">
                  {formatTime(state.duration)}
                </span>
              )}
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
        {/* Progress bar — seek bar for VOD, live pulse for live */}
        {isVod && state.duration > 0 ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] text-white/60 font-mono min-w-[3.5rem] text-right">
              {formatTime(state.currentTime)}
            </span>
            <div
              className="relative flex-1 h-1 bg-white/10 rounded-full cursor-pointer group"
              onClick={(e) => {
                if (!onSeek) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(pct * state.duration);
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-[width] duration-100"
                style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${(state.currentTime / state.duration) * 100}% - 6px)` }}
              />
            </div>
            <span className="text-[11px] text-white/60 font-mono min-w-[3.5rem]">
              {formatTime(state.duration)}
            </span>
          </div>
        ) : (
          <div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-red-500 rounded-full w-full animate-pulse" />
          </div>
        )}

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

            {/* Live badge — only for live streams */}
            {!isVod && (
              <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded ml-2">
                LIVE
              </span>
            )}
            {/* Eco mode indicator */}
          </div>

          <div className="flex items-center gap-1">
            {/* Download button — only for VOD/series (mp4/mkv content) */}
            {state.channel?.url && (decodeURIComponent(state.channel.url).includes('.mp4') || decodeURIComponent(state.channel.url).includes('.mkv')) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (state.channel?.url) {
                    window.open(state.channel.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

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
                <StreamQualityMenu onClose={() => setShowQuality(false)} onApplyNow={onQualityChange} />
              )}
            </div>

            {/* CC / Subtitles */}
            {hasSubs && onToggleSubs && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSubs(); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${subsOn ? 'bg-primary/30 text-primary-light' : 'hover:bg-white/10 text-white/60'}`}
                title="Subtitles"
              >
                <span className="text-[10px] font-black tracking-tight border border-current rounded px-1 py-0.5">CC</span>
              </button>
            )}

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

function StreamQualityMenu({ onClose, onApplyNow }: { onClose: () => void; onApplyNow: (quality: string, index: number) => void }) {
  const [current, setCurrent] = useState<StreamQuality>(getStreamQuality());

  const toggle = (applyNow: boolean) => {
    const next: StreamQuality = current === 'hd' ? 'eco' : 'hd';
    setStreamQuality(next);
    setCurrent(next);
    onClose();
    if (applyNow) {
      // Signal quality change which triggers reconnect
      onApplyNow(next, next === 'eco' ? 1 : 0);
    }
  };

  return (
    <div className="absolute bottom-12 right-0 bg-bg-surface border border-white/10 rounded-xl shadow-2xl py-2 min-w-[170px] animate-slide-up">
      <p className="text-[10px] font-medium text-text-muted uppercase px-3 pb-1">
        Stream Quality
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); toggle(true); }}
        className="w-full text-left px-3 py-2.5 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-sm font-medium ${current === 'eco' ? 'text-primary-light' : 'text-white'}`}>
              {current === 'eco' ? 'Eco Mode' : 'HD'}
            </span>
            <p className="text-[10px] text-text-muted mt-0.5">
              {current === 'eco' ? 'Low data · smooth on 3G' : 'Full quality · source'}
            </p>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors ${current === 'eco' ? 'bg-primary' : 'bg-white/20'}`}>
            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${current === 'eco' ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'}`} />
          </div>
        </div>
      </button>
      <p className="text-[9px] text-text-muted px-3 pt-1 border-t border-white/5 mt-1">
        Applies immediately — stream will reconnect
      </p>
    </div>
  );
}
