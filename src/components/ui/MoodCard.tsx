import React from 'react';

interface MoodCardProps {
  emoji: string;
  label: string;
  gradient: string;
  neonColor: string;
  onClick: () => void;
  selected?: boolean;
}

export const MoodCard: React.FC<MoodCardProps> = ({
  emoji,
  label,
  gradient,
  neonColor,
  onClick,
  selected = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-2
        rounded-xl px-4 py-5 min-w-[100px]
        bg-gradient-to-br ${gradient}
        border transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        animate-mood-pop
        ${selected
          ? 'border-white/60'
          : 'border-white/15 hover:border-white/30'
        }
      `}
      style={{
        boxShadow: selected
          ? `0 0 20px ${neonColor}, 0 0 40px ${neonColor}`
          : `0 0 10px ${neonColor}`,
      }}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-semibold text-white whitespace-nowrap">
        {label}
      </span>
    </button>
  );
};
