import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { MoodCard } from './MoodCard';

// ── Mood → TMDB genre mapping ──────────────────────────────────────

export const MOOD_GENRES: Record<string, number[]> = {
  adrenaline: [28, 53, 80],
  chill: [35, 10749, 10751],
  'mind-games': [9648, 878, 14],
  'feel-good': [35, 10749, 16],
  'date-night': [10749, 18, 35],
  'late-night': [27, 53, 9648],
  surprise: [],
};

const MOOD_OPTIONS = [
  { key: 'adrenaline', emoji: '\uD83D\uDD25', label: 'Adrenaline Rush', gradient: 'from-red-900/60 to-orange-900/60', neonColor: 'rgba(239,68,68,0.35)' },
  { key: 'chill',      emoji: '\uD83C\uDF0A', label: 'Chill & Vibes',   gradient: 'from-cyan-900/60 to-teal-900/60',  neonColor: 'rgba(6,182,212,0.35)' },
  { key: 'mind-games', emoji: '\uD83E\uDDE0', label: 'Mind Games',      gradient: 'from-purple-900/60 to-violet-900/60', neonColor: 'rgba(139,92,246,0.35)' },
  { key: 'feel-good',  emoji: '\u2764\uFE0F', label: 'Feel Good',       gradient: 'from-pink-900/60 to-rose-900/60',   neonColor: 'rgba(244,63,94,0.35)' },
  { key: 'date-night', emoji: '\uD83C\uDF39', label: 'Date Night',      gradient: 'from-rose-900/60 to-red-900/60',    neonColor: 'rgba(251,113,133,0.35)' },
  { key: 'late-night', emoji: '\uD83C\uDF19', label: 'Late Night',      gradient: 'from-slate-900/60 to-zinc-900/60',  neonColor: 'rgba(100,116,139,0.35)' },
];

interface VeeMoodOverlayProps {
  mode: 'hot' | 'explore';
  onClose: () => void;
  onMoodSelect: (moodKey: string, genreIds: number[]) => void;
  onSearch: (query: string) => void;
}

export const VeeMoodOverlay: React.FC<VeeMoodOverlayProps> = ({
  mode,
  onClose,
  onMoodSelect,
  onSearch,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleMoodClick = (moodKey: string) => {
    setSelectedMood(moodKey);
    const genres = MOOD_GENRES[moodKey] || [];
    // Small delay so user sees selection before overlay closes
    setTimeout(() => {
      onMoodSelect(moodKey, genres);
    }, 250);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      onSearch(search.trim());
    }
  };

  const accentColor = mode === 'hot' ? '#ef4444' : '#3b82f6';
  const accentGlow = mode === 'hot'
    ? 'rgba(239,68,68,0.4)'
    : 'rgba(59,130,246,0.4)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold tracking-[3px] text-white/25 uppercase mb-2">
            Video Emotional Intelligence
          </p>
          <h2 className="text-2xl font-extrabold mb-1">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: mode === 'hot'
                  ? 'linear-gradient(135deg, #ef4444, #f97316, #ef4444)'
                  : 'linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6)',
              }}
            >
              What are we watching?
            </span>
          </h2>
          <p className="text-white/40 text-sm">
            {mode === 'hot' ? 'Pick a vibe, VEE handles the rest' : 'Let VEE find something new tonight'}
          </p>
        </div>

        {/* Mood grid — 2x3 */}
        <div className="grid grid-cols-3 gap-3 mb-4 px-2">
          {MOOD_OPTIONS.map((mood) => (
            <MoodCard
              key={mood.key}
              emoji={mood.emoji}
              label={mood.label}
              gradient={mood.gradient}
              neonColor={mood.neonColor}
              onClick={() => handleMoodClick(mood.key)}
              selected={selectedMood === mood.key}
            />
          ))}
        </div>

        {/* Surprise Me */}
        <div className="flex justify-center mb-5 px-2">
          <button
            onClick={() => handleMoodClick('surprise')}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-purple-900/50 via-primary/30 to-purple-900/50
              border transition-all duration-300
              hover:scale-105 active:scale-95
              ${selectedMood === 'surprise'
                ? 'border-primary-light/60'
                : 'border-white/15 hover:border-primary/40'
              }
            `}
            style={{
              boxShadow: selectedMood === 'surprise'
                ? '0 0 20px rgba(157,78,221,0.4)'
                : '0 0 10px rgba(157,78,221,0.2)',
            }}
          >
            <Sparkles className="w-4 h-4 text-primary-light" />
            <span className="text-sm font-semibold text-white">Surprise Me</span>
          </button>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="px-2">
          <div
            className="relative rounded-xl overflow-hidden border border-white/15 transition-all focus-within:border-white/30"
            style={{
              boxShadow: `0 0 10px ${accentGlow}`,
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, genre, or vibe..."
              className="w-full bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 outline-none"
              style={{ caretColor: accentColor }}
            />
          </div>
        </form>
      </div>
    </div>
  );
};
