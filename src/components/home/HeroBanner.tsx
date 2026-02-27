import React, { useState, useEffect, useCallback } from 'react';
import { Play, Info, ChevronLeft, ChevronRight, Tv, Star } from 'lucide-react';
import type { Channel } from '@/types';

interface Props {
  channels: Channel[];
  onPlay: (channel: Channel) => void;
}

// Rich cinematic palettes — OG's cosmic purple DNA
const heroPalettes = [
  { accent: 'rgba(157, 78, 221, 0.18)', tint: '#9D4EDD' },
  { accent: 'rgba(255, 50, 50, 0.14)', tint: '#FF006E' },
  { accent: 'rgba(0, 200, 83, 0.12)', tint: '#06FFA5' },
  { accent: 'rgba(0, 245, 255, 0.14)', tint: '#00F5FF' },
  { accent: 'rgba(255, 215, 0, 0.12)', tint: '#FFD700' },
];

export const HeroBanner: React.FC<Props> = ({ channels, onPlay }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const total = channels.length;
  const INTERVAL = 8000;

  const transition = useCallback((nextIndex: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setActiveIndex(nextIndex);
      setProgress(0);
      setTimeout(() => setTransitioning(false), 50);
    }, 400);
  }, []);

  const goNext = useCallback(() => {
    transition((activeIndex + 1) % total);
  }, [activeIndex, total, transition]);

  const goPrev = useCallback(() => {
    transition((activeIndex - 1 + total) % total);
  }, [activeIndex, total, transition]);

  useEffect(() => {
    if (isHovered || total <= 1) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goNext();
          return 0;
        }
        return prev + (100 / (INTERVAL / 50));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, total, goNext]);

  if (total === 0) return null;

  const channel = channels[activeIndex];
  const palette = heroPalettes[activeIndex % heroPalettes.length];

  return (
    <div
      className="hero-cinematic group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background — Ken Burns with OG depth */}
      <div
        className="absolute inset-0 w-[110%] h-[110%] animate-ken-burns"
        key={`bg-${activeIndex}`}
        style={{ filter: 'brightness(0.5)' }}
      >
        {/* Cinematic ambient orbs */}
        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full animate-breathe"
          style={{ backgroundColor: palette.accent, filter: 'blur(150px)' }}
        />
        <div
          className="absolute bottom-1/3 left-1/5 w-[400px] h-[400px] rounded-full animate-breathe"
          style={{ backgroundColor: palette.accent, filter: 'blur(120px)', animationDelay: '2s' }}
        />

        {/* Film grain — OG texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* OG gradient layers — this is what gives the depth */}
      <div className="absolute inset-0 hero-gradient-left" />
      <div className="absolute inset-0 hero-gradient-bottom" />
      <div className="hero-vignette" />

      {/* Content — OG positioning: bottom 15%, left 5% */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12 lg:pl-20 xl:pl-60">
        <div
          className={`max-w-[650px] transition-all duration-500 ${
            transitioning ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Premium badge — OG style */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-[1.5px] text-white"
              style={{
                background: `linear-gradient(135deg, ${palette.tint}, ${palette.tint}cc)`,
                boxShadow: `0 4px 15px ${palette.accent}`,
              }}
            >
              <Star className="w-3 h-3 fill-current" />
              Featured
            </span>
            <span className="flex items-center gap-2">
              <span className="live-pulse" />
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-success">
                Live
              </span>
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-xs text-text-muted">
              {total} channels
            </span>
          </div>

          {/* Channel name — OG cinematic title */}
          <h1
            className="font-extrabold mb-4 leading-[1.1] tracking-tight"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 4px 40px rgba(0,0,0,0.6)',
              letterSpacing: '-1px',
            }}
          >
            {channel.name}
          </h1>

          {/* Meta pills — OG glassmorphic style */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {channel.country && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 glass-light rounded-full text-sm font-medium text-white/80 border border-white/10">
                {channel.country}
              </span>
            )}
            {channel.category && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 glass-light rounded-full text-sm capitalize text-white/60 border border-white/10">
                {channel.category}
              </span>
            )}
            {channel.quality && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 glass-light rounded-full text-sm font-semibold border border-primary/20"
                style={{ color: palette.tint }}
              >
                {channel.quality}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 glass-light rounded-full text-xs text-white/50 border border-white/10">
              <Tv className="w-3.5 h-3.5" />
              Free
            </span>
          </div>

          {/* Action buttons — OG premium feel */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPlay(channel)}
              className="btn-sweep flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark rounded-2xl font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
              style={{
                boxShadow: `0 4px 20px rgba(157,78,221,0.4), 0 0 40px rgba(157,78,221,0.2)`,
              }}
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </button>
            <button className="flex items-center gap-2.5 px-6 py-4 glass rounded-2xl font-medium text-white/90 hover:bg-white/10 transition-all duration-300 border border-white/10">
              <Info className="w-5 h-5" />
              Details
            </button>
          </div>
        </div>

        {/* Progress dots — refined */}
        <div className="flex items-center gap-2 mt-8">
          {channels.map((_, i) => (
            <button
              key={i}
              onClick={() => transition(i)}
              className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: i === activeIndex ? 56 : 14 }}
            >
              <div className="absolute inset-0 bg-white/15 rounded-full" />
              {i === activeIndex && (
                <div
                  className="absolute inset-0 rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${palette.tint}, ${palette.tint}99)`,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation arrows — glassmorphic OG style */}
      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 border border-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 border border-white/10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
};
