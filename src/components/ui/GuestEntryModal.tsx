import React, { useState, useCallback } from 'react';
import { X, MessageCircle, Check, Trophy, Film, Clapperboard, Newspaper, Baby, Music, Moon, Crown } from 'lucide-react';
import { t, useLanguage } from '@/i18n';

interface GuestLead {
  name: string;
  whatsapp: string;
  interests: string[];
  firstTime: boolean | null;
  capturedAt: number;
}

interface Props {
  open: boolean;
  onConfirm: (lead: GuestLead) => void;
  onSkip: () => void;
  onClose: () => void;
}

const INTERESTS = [
  { id: 'sports',        Icon: Trophy,       labelKey: 'guestCat.sports' as const },
  { id: 'movies',        Icon: Film,         labelKey: 'guestCat.movies' as const },
  { id: 'entertainment', Icon: Clapperboard, labelKey: 'guestCat.entertainment' as const },
  { id: 'news',          Icon: Newspaper,    labelKey: 'guestCat.news' as const },
  { id: 'kids',          Icon: Baby,         labelKey: 'guestCat.kids' as const },
  { id: 'music',         Icon: Music,        labelKey: 'guestCat.music' as const },
  { id: 'faith',         Icon: Moon,         labelKey: 'guestCat.faith' as const },
  { id: 'premium4k',     Icon: Crown,        labelKey: 'guestCat.premium4k' as const },
];

const WA_AGENT_NUMBER = '224611361300';

export const GuestEntryModal: React.FC<Props> = ({ open, onConfirm, onSkip, onClose }) => {
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [firstTime, setFirstTime] = useState<boolean | null>(null);

  const toggleInterest = useCallback((id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const canSubmit = name.trim().length >= 2 && whatsapp.trim().length >= 6;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onConfirm({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      interests,
      firstTime,
      capturedAt: Date.now(),
    });
  }, [canSubmit, name, whatsapp, interests, firstTime, onConfirm]);

  const buildWhatsAppLink = useCallback(() => {
    const interestText = interests.length
      ? interests.map(i => INTERESTS.find(x => x.id === i)?.id).join(', ')
      : 'Tivi+';
    const msg = `${t(lang, 'guestModal.whatsappPrefill')} ${name ? `(${name})` : ''} — ${interestText}`;
    return `https://wa.me/${WA_AGENT_NUMBER}?text=${encodeURIComponent(msg)}`;
  }, [lang, name, interests]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1a0d2e] to-[#0a0512] border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="close"
        >
          <X size={16} className="text-white/60" />
        </button>

        <div className="p-6 pb-2">
          <p className="text-[10px] uppercase tracking-widest text-purple-300/70 mb-1">DashTivi+</p>
          <h2 className="text-2xl font-bold text-white leading-tight">{t(lang, 'guestModal.title')}</h2>
          <p className="text-sm text-white/55 mt-1">{t(lang, 'guestModal.subtitle')}</p>
        </div>

        <div className="px-6 pb-2 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 block mb-1.5">
              {t(lang, 'guestModal.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t(lang, 'guestModal.namePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 focus:bg-white/[0.07]"
              autoComplete="given-name"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 block mb-1.5">
              {t(lang, 'guestModal.whatsappLabel')}
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+224 6XX XX XX XX"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 focus:bg-white/[0.07]"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 block mb-1.5">
              {t(lang, 'guestModal.interestLabel')}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {INTERESTS.map(item => {
                const active = interests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleInterest(item.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-medium transition-all ${
                      active
                        ? 'bg-purple-500/20 border-purple-400/60 text-white'
                        : 'bg-white/[0.03] border-white/10 text-white/55 hover:bg-white/[0.06]'
                    }`}
                  >
                    <item.Icon className="w-4 h-4" strokeWidth={1.8} />
                    <span>{t(lang, item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 block mb-1.5">
              {t(lang, 'guestModal.firstTimeLabel')}
            </label>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button
                  key={String(val)}
                  onClick={() => setFirstTime(val)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    firstTime === val
                      ? 'bg-purple-500/20 border-purple-400/60 text-white'
                      : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  {firstTime === val && <Check size={14} className="inline mr-1 -mt-0.5" />}
                  {t(lang, val ? 'guestModal.firstTimeYes' : 'guestModal.firstTimeNo')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-3 space-y-2 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
              canSubmit
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 active:scale-[0.98]'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            {t(lang, 'guestModal.cta')}
          </button>

          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/15 text-green-300 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle size={14} />
            {t(lang, 'guestModal.whatsappCta')}
          </a>

          <button
            onClick={onSkip}
            className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {t(lang, 'guestModal.skip')}
          </button>

          <p className="text-[10px] text-center text-white/30 pt-1">
            {t(lang, 'guestModal.footer')}
          </p>
        </div>
      </div>
    </div>
  );
};

export type { GuestLead };
