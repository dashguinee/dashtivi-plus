import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

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
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const hasTrailer = youtubeKey && youtubeKey.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Close trailer"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Content container */}
      <div
        className="w-full max-w-[900px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-white text-lg font-semibold mb-3 truncate px-1">
          {title}
        </h2>

        {hasTrailer ? (
          /* YouTube embed with 16:9 aspect ratio */
          <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden bg-black shadow-2xl">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
              title={`${title} - Trailer`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        ) : (
          /* Fallback: poster + overview */
          <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
            {poster && (
              <img
                src={poster}
                alt={title}
                className="w-full max-h-[400px] object-cover"
              />
            )}
            {overview && (
              <p className="text-white/70 text-sm leading-relaxed p-4">
                {overview}
              </p>
            )}
            {!poster && !overview && (
              <div className="p-8 text-center text-white/40 text-sm">
                No trailer available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
