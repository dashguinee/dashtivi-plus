import { useState, useMemo, useCallback } from 'react';
import { allChannels, getChannelsByCategory } from '@/data/channels';
import { useChannelHealth } from '@/hooks/useChannelHealth';
import type { Channel, CategoryId } from '@/types';

export function useChannels() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const { isChannelDead, deadCount } = useChannelHealth();

  const channels = useMemo(() => {
    return getChannelsByCategory(activeCategory).filter((ch) => !isChannelDead(ch.id));
  }, [activeCategory, isChannelDead, deadCount]);

  const changeCategory = useCallback((cat: CategoryId) => {
    setActiveCategory(cat);
  }, []);

  return {
    channels,
    activeCategory,
    changeCategory,
    totalCount: allChannels.length - deadCount,
  };
}

// Get channels grouped by category for home page rows
export function useHomeRows() {
  const { isChannelDead, deadCount } = useChannelHealth();

  return useMemo(() => {
    const rows: { title: string; channels: Channel[]; categoryId: CategoryId }[] = [];

    const filter = (chs: Channel[]) => chs.filter((ch) => !isChannelDead(ch.id));

    const african = filter(getChannelsByCategory('africa'));
    if (african.length > 0) rows.push({ title: 'African Channels', channels: african, categoryId: 'africa' });

    const news = filter(getChannelsByCategory('news'));
    if (news.length > 0) rows.push({ title: 'News', channels: news.slice(0, 20), categoryId: 'news' });

    const sports = filter(getChannelsByCategory('sports'));
    if (sports.length > 0) rows.push({ title: 'Sports', channels: sports.slice(0, 20), categoryId: 'sports' });

    const entertainment = filter(getChannelsByCategory('entertainment'));
    if (entertainment.length > 0)
      rows.push({ title: 'Entertainment', channels: entertainment.slice(0, 20), categoryId: 'entertainment' });

    const kids = filter(getChannelsByCategory('kids'));
    if (kids.length > 0) rows.push({ title: 'Kids', channels: kids.slice(0, 20), categoryId: 'kids' });

    const music = filter(getChannelsByCategory('music'));
    if (music.length > 0) rows.push({ title: 'Music', channels: music.slice(0, 20), categoryId: 'music' });

    const movies = filter(getChannelsByCategory('movies'));
    if (movies.length > 0) rows.push({ title: 'Movies & Series', channels: movies.slice(0, 20), categoryId: 'movies' });

    const documentary = filter(getChannelsByCategory('documentary'));
    if (documentary.length > 0)
      rows.push({ title: 'Documentary', channels: documentary.slice(0, 20), categoryId: 'documentary' });

    const religious = filter(getChannelsByCategory('religious'));
    if (religious.length > 0) rows.push({ title: 'Religious', channels: religious.slice(0, 20), categoryId: 'religious' });

    return rows;
  }, [isChannelDead, deadCount]);
}
