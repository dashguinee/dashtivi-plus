import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  X,
  ChevronLeft,
  Download,
  Waves,
  Zap,
} from 'lucide-react';
import type { PlayerState } from '@/types';

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
  const [showVolume, setShowVolume] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const category = state.channel?.category?.toLowerCase() ?? '';
  const isVod = category === 'movie' || category === 'series';

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Top gradient + info */}
      <div className="player-top-gradient p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
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
              <HeaderBrand duration={state.duration} isVod={isVod} />
              {!isVod && (
                <span className="flex items-center gap-1">
                  <span className="live-pulse !w-1.5 !h-1.5" />
                  LIVE
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center play button — ghost for live TV, visible for VOD */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={onTogglePlay}
          className={`rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
            isVod
              ? 'w-16 h-16 bg-primary/80 backdrop-blur-sm hover:bg-primary hover:scale-105 shadow-lg shadow-primary/30'
              : 'w-12 h-12 bg-white/[0.07] hover:bg-white/[0.12]'
          }`}
        >
          {state.isPlaying ? (
            <Pause className={isVod ? 'w-8 h-8 text-white' : 'w-5 h-5 text-white/30'} />
          ) : (
            <Play className={isVod ? 'w-8 h-8 text-white ml-1' : 'w-5 h-5 text-white/30 ml-0.5'} />
          )}
        </button>
      </div>

      {/* Bottom controls */}
      <div className="player-controls-gradient p-4 pt-12">
        {/* Progress bar — seek for mp4 passthrough, display-only for remux */}
        {isVod && state.duration > 0 ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] text-white/60 font-mono min-w-[3.5rem] text-right">
              {formatTime(state.currentTime)}
            </span>
            <div
              className="relative flex-1 h-2 bg-white/10 rounded-full cursor-pointer group py-2"
              onClick={(e) => {
                if (!onSeek) return;
                // Seek works for all VOD formats — both direct proxy (/?url=) and FFmpeg remux (/vod?)
                // The browser handles range requests for direct, and the remux endpoint supports seeking
                // via the video element's currentTime assignment
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(pct * state.duration);
              }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-white/10 rounded-full" />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary rounded-full transition-[width] duration-100"
                style={{ width: `${Math.min(100, (state.currentTime / state.duration) * 100)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 group-active:w-6 group-active:h-6 transition-[opacity,width,height] duration-300"
                style={{ left: `calc(${Math.min(100, (state.currentTime / state.duration) * 100)}% - 8px)` }}
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
            {/* Play/Pause — ghost on live, visible on VOD */}
            <button
              onClick={onTogglePlay}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                isVod ? 'hover:bg-white/10' : 'hover:bg-white/5'
              }`}
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <Pause className={isVod ? 'w-5 h-5' : 'w-4 h-4 text-white/20'} />
              ) : (
                <Play className={isVod ? 'w-5 h-5 ml-0.5' : 'w-4 h-4 text-white/20 ml-0.5'} />
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
                className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label={state.isMuted ? 'Unmute' : 'Mute'}
              >
                {state.isMuted || state.volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div
                className={`overflow-hidden transition-[width,opacity] duration-300 ${
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

            {/* Flow pill — tap to toggle Flow on/off */}
            {state.quality && state.quality !== 'Auto' && (
              <button
                key={state.quality}
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle: clear per-channel eco memory and force passthrough
                  const id = state.channel?.url?.match(/id=(\d+)/)?.[1];
                  if (id) localStorage.removeItem('flow-eco-' + id);
                  onQualityChange('hd', 0);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-2 bg-white/[0.03] border transition-colors duration-1000 active:scale-95"
                style={{
                  borderColor: state.quality === '4K' ? 'rgba(245,158,11,0.4)'
                    : state.quality === '1080p' ? 'rgba(0,212,255,0.3)'
                    : state.quality === '720p' ? 'rgba(157,78,221,0.25)'
                    : 'rgba(255,255,255,0.08)',
                  animation: 'flow-pill-flash 2s ease-out',
                }}
              >
                <span className="text-[9px] font-medium text-white/30 tracking-wider">Flow</span>
                <span className="text-[8px] text-white/15">·</span>
                <span className="text-[10px] font-semibold text-white/40 tracking-wide">
                  {state.quality === '4K' ? 'UHD' : state.quality === '1080p' ? 'HD' : state.quality === '480p' ? 'Steady' : state.quality}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Download button — for all VOD content (movies + series) */}
            {isVod && state.channel?.url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (state.channel?.url) {
                    // Use anchor + download attribute for proper file download
                    const a = document.createElement('a');
                    a.href = state.channel.url;
                    // Generate filename from channel name
                    const safeName = (state.channel.name || 'video')
                      .replace(/[^a-zA-Z0-9\s\-_.()]/g, '')
                      .replace(/\s+/g, '_')
                      .substring(0, 100);
                    // Detect extension from URL
                    const urlExt = state.channel.url.match(/\.(\w{2,4})(?:\?|$)/)?.[1] || 'mp4';
                    a.download = `${safeName}.${urlExt}`;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                }}
                className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {/* CC / Subtitles */}
            {hasSubs && onToggleSubs && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSubs(); }}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${subsOn ? 'bg-primary/30 text-primary-light' : 'hover:bg-white/10 text-white/60'}`}
                title="Subtitles"
              >
                <span className="text-[10px] font-black tracking-tight border border-current rounded px-1 py-0.5">CC</span>
              </button>
            )}

            {/* PiP */}
            <button
              onClick={onTogglePiP}
              className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Picture in Picture"
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label={state.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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


/** Header brand — swaps from "DASH · Tivi+" to "DASH · 2h 36m" after 2s */
function HeaderBrand({ duration, isVod }: { duration: number; isVod: boolean }) {
  const [showDuration, setShowDuration] = useState(false);

  useEffect(() => {
    if (!isVod || duration <= 0) return;
    const t = setTimeout(() => setShowDuration(true), 2000);
    return () => clearTimeout(t);
  }, [duration, isVod]);

  const formatted = duration > 0 ? formatTime(duration) : null;

  return (
    <span className="transition-opacity duration-500">
      <span className="font-bold tracking-wider text-primary-light">DASH</span>
      <span className="text-white/30"> · </span>
      <span className="text-white/40">
        {showDuration && formatted ? formatted : 'Tivi+'}
      </span>
    </span>
  );
}
