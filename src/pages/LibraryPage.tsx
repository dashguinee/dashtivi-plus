import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, History, Download, Library as LibraryIcon } from 'lucide-react';
import { PosterCard } from '@/components/ui/PosterCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLanguage } from '@/i18n';
import { useLikes } from '@/lib/likes';
import { useDownloads } from '@/lib/downloads';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { tap } from '@/lib/haptics';
import type { Channel } from '@/types';
import type { XtreamCredentials } from '@/lib/xtream';

interface Props {
  credentials?: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

/**
 * LibraryPage — the member's own corner: Likes, Recently Watched, My Downloads.
 * Everything reads from localStorage (tivi_likes / watch_history / tivi_downloads) which
 * is the source of truth. Reuses PosterCard so the grids feel native to the catalog.
 */
export const LibraryPage: React.FC<Props> = ({ onPlay }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const likes = useLikes();
  const downloads = useDownloads();
  const { history } = useWatchHistory();

  // Only history rows that carry enough metadata to replay (name + url).
  const recent = history.filter((h) => h.name && h.url);

  const playFromHistory = useCallback((channelId: string) => {
    const h = history.find((e) => e.channelId === channelId);
    if (!h || !h.url || !h.name) return;
    tap();
    onPlay({
      id: h.channelId,
      name: h.name,
      url: h.url,
      logo: h.logo,
      category: h.category,
    });
  }, [history, onPlay]);

  const openDownload = useCallback((url: string) => {
    tap();
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className="min-h-screen pb-16">
      {/* ── Page header ── */}
      <div className="pt-16 pb-5 px-5">
        <h1 className="text-[22px] font-semibold text-white/85 tracking-tight flex items-center gap-2.5"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
          <LibraryIcon className="w-5 h-5 text-primary-light" strokeWidth={2} />
          {lang === 'fr' ? 'Ma Bibliothèque' : 'My Library'}
        </h1>
        <div className="w-16 h-[2px] rounded-full mt-2"
          style={{ background: 'linear-gradient(90deg, rgba(157,78,221,0.6) 0%, rgba(157,78,221,0.15) 60%, transparent 100%)' }} />
      </div>

      {/* ── Likes ── */}
      <LibrarySection
        icon={<Heart className="w-4 h-4" style={{ color: '#C77DFF' }} fill="#C77DFF" />}
        title={lang === 'fr' ? "J'aime" : 'Likes'}
        count={likes.length}
      >
        {likes.length === 0 ? (
          <EmptyState
            icon="film"
            title={lang === 'fr' ? 'Aucun favori pour le moment' : 'No likes yet'}
            subtitle={lang === 'fr'
              ? 'Touchez le cœur sur un film ou une série pour le retrouver ici.'
              : 'Tap the heart on a movie or series to keep it here.'}
            action={{
              label: lang === 'fr' ? 'Explorer les films' : 'Browse movies',
              onClick: () => navigate('/movies'),
            }}
          />
        ) : (
          <PosterGrid>
            {likes.map((l) => (
              <PosterCard
                key={l.id}
                title={l.title}
                poster={l.poster}
                categoryId={l.categoryId}
                onClick={() => { tap(); navigate(l.type === 'series' ? '/series' : '/movies'); }}
              />
            ))}
          </PosterGrid>
        )}
      </LibrarySection>

      {/* ── Recently Watched ── */}
      <LibrarySection
        icon={<History className="w-4 h-4 text-white/60" />}
        title={lang === 'fr' ? 'Vu récemment' : 'Recently Watched'}
        count={recent.length}
      >
        {recent.length === 0 ? (
          <EmptyState
            icon="tv"
            title={lang === 'fr' ? 'Rien dans l\'historique' : 'Nothing watched yet'}
            subtitle={lang === 'fr'
              ? 'Vos lectures récentes apparaîtront ici pour reprendre en un geste.'
              : 'What you play shows up here so you can jump back in.'}
            action={{
              label: lang === 'fr' ? 'Voir la TV en direct' : 'Watch Live TV',
              onClick: () => navigate('/live'),
            }}
          />
        ) : (
          <PosterGrid>
            {recent.map((h) => (
              <PosterCard
                key={h.channelId}
                title={h.name || h.channelId}
                poster={h.logo}
                categoryId={h.category}
                onClick={() => playFromHistory(h.channelId)}
              />
            ))}
          </PosterGrid>
        )}
      </LibrarySection>

      {/* ── My Downloads ── */}
      <LibrarySection
        icon={<Download className="w-4 h-4 text-white/60" />}
        title={lang === 'fr' ? 'Mes téléchargements' : 'My Downloads'}
        count={downloads.length}
      >
        {downloads.length === 0 ? (
          <EmptyState
            icon="browse"
            title={lang === 'fr' ? 'Aucun téléchargement' : 'No downloads yet'}
            subtitle={lang === 'fr'
              ? 'Les films et épisodes que vous téléchargez se rangent ici.'
              : 'Movies and episodes you download are kept here.'}
            action={{
              label: lang === 'fr' ? 'Explorer les films' : 'Browse movies',
              onClick: () => navigate('/movies'),
            }}
          />
        ) : (
          <PosterGrid>
            {downloads.map((d) => (
              <PosterCard
                key={d.url}
                title={d.title}
                poster={d.poster}
                onClick={() => openDownload(d.url)}
              />
            ))}
          </PosterGrid>
        )}
      </LibrarySection>
    </div>
  );
};

// ── Section shell ───────────────────────────────────────────────
function LibrarySection({
  icon, title, count, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 pt-2 pb-6">
      <h2 className="text-[16px] font-bold text-white/80 mb-3 flex items-center gap-2">
        {icon}
        {title}
        {count > 0 && (
          <span className="text-[11px] font-semibold text-white/30 tabular-nums px-1.5 py-0.5 rounded-full bg-white/[0.05]">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function PosterGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 min-[500px]:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-x-3 gap-y-5">
      {children}
    </div>
  );
}

export default LibraryPage;
