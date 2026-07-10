import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import { useLanguage } from '@/i18n';

// Mirrors the Hub top-right avatar (Aziz 2026-07-10): same public bucket + key
// (avatars/<coreId>.png). Tap opens the profile options — Change photo, Language,
// Logout — instead of a bare logout button. Anon uploads are allowed on the bucket.
const AVATAR_BASE = 'https://mclbbkmpovnvcfmwsoqt.supabase.co/storage/v1/object/public/avatars';

function hueFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export const ProfileMenu: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { lang, toggleLang, t } = useLanguage();
  const { coreId, tier } = useAuth();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const [ver, setVer] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cid = coreId || '';
  const initial = (cid || '?').charAt(0).toUpperCase();
  const hue = hueFor(cid || '?');
  const photoUrl = `${AVATAR_BASE}/${cid}.png${ver ? `?v=${ver}` : ''}`;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cid) return;
    setUploading(true);
    try {
      const sb = await getSupabase();
      const { error } = await sb.storage
        .from('avatars')
        .upload(`${cid}.png`, file, { upsert: true, contentType: file.type, cacheControl: '0' });
      if (!error) { setBroken(false); setVer(Date.now()); }
    } catch { /* non-blocking */ } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [cid]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-white/15 hover:ring-white/30 transition-shadow"
        aria-label="Profile"
        title="Profile"
      >
        {cid && !broken ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center text-white text-[13px] font-bold"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 68% 55%), hsl(${(hue + 45) % 360} 68% 45%))` }}
          >
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50 backdrop-blur-xl"
          style={{
            background: 'rgba(16,16,20,0.92)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.07)',
          }}
        >
          {/* Identity */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="text-white text-sm font-semibold truncate">{cid || '—'}</div>
            {tier && (
              <div className="text-white/40 text-[10.5px] uppercase tracking-[1.5px] mt-0.5">{tier}</div>
            )}
          </div>

          {/* Change photo */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/80 hover:bg-white/[0.06] transition-colors"
          >
            <Camera className="w-[17px] h-[17px] text-white/50" />
            <span className="text-[13.5px] font-medium">
              {uploading
                ? (lang === 'fr' ? 'Envoi…' : 'Uploading…')
                : (lang === 'fr' ? 'Changer la photo' : 'Change photo')}
            </span>
          </button>

          {/* Language (setting) */}
          <button
            onClick={toggleLang}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-white/80 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
          >
            <span className="text-[13.5px] font-medium">{lang === 'fr' ? 'Langue' : 'Language'}</span>
            <span className="text-[12px] font-bold text-white/50">{lang === 'fr' ? 'FR → EN' : 'EN → FR'}</span>
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-300/90 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]"
            >
              <LogOut className="w-[17px] h-[17px]" />
              <span className="text-[13.5px] font-medium">{t('logout')}</span>
            </button>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
};
