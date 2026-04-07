import React, { useEffect, useCallback, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CosmicClose } from './CosmicClose';

// Embed sources — fallback chain: YouTube nocookie → Piped → Invidious
const EMBED_SOURCES = [
  (key: string) => `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0&modestbranding=1&playsinline=1&start=1&iv_load_policy=3`,
  (key: string) => `https://piped.video/embed/${key}?autoplay=1`,
  (key: string) => `https://inv.nadeko.net/embed/${key}?autoplay=1`,
];

interface TrailerModalProps {
  youtubeKey: string;
  title: string;
  poster?: string;
  overview?: string;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  youtubeKey,
  title,
  poster,
  overview,
  onClose,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    // Unlock rotation for trailer
    try { screen.orientation.unlock(); } catch {}
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const hasTrailer = youtubeKey && youtubeKey.length > 0;
  const [sourceIdx, setSourceIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const embedUrl = hasTrailer ? EMBED_SOURCES[sourceIdx](youtubeKey) : '';

  const tryNextSource = useCallback(() => {
    if (sourceIdx < EMBED_SOURCES.length - 1) {
      setLoaded(false);
      setSourceIdx(prev => prev + 1);
    }
  }, [sourceIdx]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[#060609]/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Close button */}
      <div className="absolute top-4 right-4 z-50">
        <CosmicClose onClick={onClose} />
      </div>

      {/* Content */}
      <div
        className="w-full max-w-[960px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base sm:text-lg font-semibold truncate">{title}</h2>
            <p className="text-[11px] text-white/30 mt-0.5 tracking-wide">TRAILER</p>
          </div>
          {hasTrailer && sourceIdx < EMBED_SOURCES.length - 1 && (
            <button
              onClick={tryNextSource}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/10 hover:bg-white/12 rounded-lg text-white/50 text-[11px] font-medium transition-colors duration-300 flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Try another source
            </button>
          )}
        </div>

        {hasTrailer ? (
          /* Video embed — fills width, 16:9 ratio, rounded + glow */
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/8">
            {/* Loading state */}
            {!loaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#060609]">
                <div className="text-center">
                  <div className="w-8 h-[2px] mx-auto rounded-full overflow-hidden bg-white/5">
                    <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
                  </div>
                </div>
              </div>
            )}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title={`${title} - Trailer`}
                allow="autoplay; encrypted-media; fullscreen; accelerometer; gyroscope"
                allowFullScreen
                frameBorder="0"
                onLoad={() => setLoaded(true)}
                onError={tryNextSource}
              />
            </div>
          </div>
        ) : (
          /* Fallback: poster + overview */
          <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 shadow-2xl shadow-primary/10">
            {poster && (
              <img
                src={poster}
                alt={title}
                className="w-full max-h-[400px] object-cover"
              />
            )}
            {overview && (
              <p className="text-white/60 text-sm leading-relaxed p-5">
                {overview}
              </p>
            )}
            {!poster && !overview && (
              <div className="p-12 text-center text-white/30 text-sm">
                No trailer available
              </div>
            )}
          </div>
        )}

        {/* Subtle hint */}
        {hasTrailer && (
          <p className="text-center text-[10px] text-white/15 mt-3 tracking-wide">
            Rotate your device for fullscreen
          </p>
        )}
      </div>
    </div>
  );
};
