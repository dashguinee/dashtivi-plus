import React from 'react';
import { categories } from '@/data/categories';
import { categoryCounts } from '@/data/channels';
import type { CategoryId } from '@/types';

interface Props {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

export const CategoryFilter: React.FC<Props> = ({ active, onChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 lg:px-6 py-3">
      {categories.map((cat) => {
        const isActive = active === cat.id;
        const count = cat.id === 'all' ? undefined : categoryCounts[cat.id] || 0;

        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-white border border-white/5'
            }`}
          >
            <span className="text-base">{cat.icon}</span>
            <span>{cat.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-bg-hover text-text-muted'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
