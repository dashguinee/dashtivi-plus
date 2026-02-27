import React, { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export const ContentRow: React.FC<Props> = ({ title, subtitle, onSeeAll, children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 400);
  }, [checkScroll]);

  return (
    <section className="relative group/row">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs text-primary-light font-medium hover:text-primary transition-colors flex items-center gap-1"
          >
            See All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-bg to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-bg-elevated/90 flex items-center justify-center hover:bg-bg-hover transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
        )}

        {/* Content */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 px-4 lg:px-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x-mandatory pb-2"
        >
          {children}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-bg to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-bg-elevated/90 flex items-center justify-center hover:bg-bg-hover transition-colors">
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        )}
      </div>
    </section>
  );
};
