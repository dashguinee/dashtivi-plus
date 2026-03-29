import React from 'react';
import { useLanguage } from '@/i18n';

export const LangToggle: React.FC = () => {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-white/10 transition-colors text-[11px] font-bold tracking-wide text-white/50 hover:text-white"
      aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
    >
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  );
};
