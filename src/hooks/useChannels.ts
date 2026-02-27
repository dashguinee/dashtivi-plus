import { useState, useMemo, useCallback } from 'react';
import { allChannels, getChannelsByCategory } from '@/data/channels';
import type { Channel, CategoryId } from '@/types';

export function useChannels() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');

  const channels = useMemo(() => {
    return getChannelsByCategory(activeCategory);
  }, [activeCategory]);

  const changeCategory = useCallback((cat: CategoryId) => {
    setActiveCategory(cat);
  }, []);

  return {
    channels,
    activeCategory,
    changeCategory,
    totalCount: allChannels.length,
  };
}

// Get channels grouped by category for home page rows
export function useHomeRows() {
  return useMemo(() => {
    const rows: { title: string; channels: Channel[]; categoryId: CategoryId }[] = [];

    const african = getChannelsByCategory('africa');
    if (african.length > 0) rows.push({ title: 'African Channels', channels: african, categoryId: 'africa' });

    const news = getChannelsByCategory('news');
    if (news.length > 0) rows.push({ title: 'News', channels: news.slice(0, 20), categoryId: 'news' });

    const sports = getChannelsByCategory('sports');
    if (sports.length > 0) rows.push({ title: 'Sports', channels: sports.slice(0, 20), categoryId: 'sports' });

    const entertainment = getChannelsByCategory('entertainment');
    if (entertainment.length > 0)
      rows.push({ title: 'Entertainment', channels: entertainment.slice(0, 20), categoryId: 'entertainment' });

    const kids = getChannelsByCategory('kids');
    if (kids.length > 0) rows.push({ title: 'Kids', channels: kids.slice(0, 20), categoryId: 'kids' });

    const music = getChannelsByCategory('music');
    if (music.length > 0) rows.push({ title: 'Music', channels: music.slice(0, 20), categoryId: 'music' });

    const movies = getChannelsByCategory('movies');
    if (movies.length > 0) rows.push({ title: 'Movies & Series', channels: movies.slice(0, 20), categoryId: 'movies' });

    const documentary = getChannelsByCategory('documentary');
    if (documentary.length > 0)
      rows.push({ title: 'Documentary', channels: documentary.slice(0, 20), categoryId: 'documentary' });

    const religious = getChannelsByCategory('religious');
    if (religious.length > 0) rows.push({ title: 'Religious', channels: religious.slice(0, 20), categoryId: 'religious' });

    return rows;
  }, []);
}
