import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getFreeChannels, freeToLiveStream, buildFreeUrlMap, type FreeChannel } from '@/lib/xtream';
import { Play, Search, Radio, Globe, Tv } from 'lucide-react';
import { setPlaylist, setCurrentChannel } from '@/lib/playlist';

import type { Channel } from '@/types';

interface Props {
  onPlay: (channel: Channel) => void;
}

export const TestChannelsPage: React.FC<Props> = ({ onPlay }) => {
  const [channels, setChannels] = useState<FreeChannel[]>([]);
  const [freeUrlMap, setFreeUrlMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCulture, setFilterCulture] = useState('all');
  const [filterExp, setFilterExp] = useState('all');

  useEffect(() => {
    getFreeChannels().then(chs => {
      setChannels(chs);
      setFreeUrlMap(buildFreeUrlMap(chs));
      setLoading(false);
    });
  }, []);

  const cultures = useMemo(() => {
    const set = new Set(channels.map(c => c.culture));
    return ['all', ...Array.from(set).sort()];
  }, [channels]);

  const experiences = useMemo(() => {
    const set = new Set(channels.map(c => c.experience));
    return ['all', ...Array.from(set).sort()];
  }, [channels]);

  const filtered = useMemo(() => {
    let result = channels;
    if (filterCulture !== 'all') result = result.filter(c => c.culture === filterCulture);
    if (filterExp !== 'all') result = result.filter(c => c.experience === filterExp);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [channels, filterCulture, filterExp, search]);

  const handlePlay = useCallback((ch: FreeChannel) => {
    // Build playlist from current filtered list
    const playlist: Channel[] = filtered.map(c => ({
      id: `live-${freeToLiveStream(c).stream_id}`,
      name: c.name,
      url: c.url,
      logo: c.logo,
      category: 'live',
    }));
    setPlaylist(playlist);

    const channelObj: Channel = {
      id: `live-${freeToLiveStream(ch).stream_id}`,
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      category: 'live',
    };
    setCurrentChannel(channelObj.id);
    onPlay(channelObj);
  }, [onPlay, filtered]);

  if (loading) {
    return (
      <div className="pt-20 pb-32 flex items-center justify-center min-h-screen">
        <div className="text-white/30 text-sm">Loading free channels...</div>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-32 min-h-screen px-4">
      {/* Header */}
      <div className="mb-4 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-4 h-4" style={{ color: '#C9F03C' }} />
          <h1 className="text-lg font-black text-white tracking-tight">Test Channels</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,240,60,0.1)', color: 'rgba(201,240,60,0.6)' }}>
            {filtered.length} / {channels.length}
          </span>
        </div>
        <p className="text-[11px] text-white/25">Free HLS channels — tap to test playback</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-1 overflow-x-auto scrollbar-hide pb-1">
        <div className="flex items-center gap-1 mr-1">
          <Globe className="w-3 h-3 text-white/20" />
          <span className="text-[9px] text-white/20 uppercase tracking-wider">Region</span>
        </div>
        {cultures.map(c => (
          <button
            key={c}
            onClick={() => setFilterCulture(c)}
            className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: filterCulture === c ? 'rgba(201,240,60,0.15)' : 'rgba(255,255,255,0.04)',
              color: filterCulture === c ? 'rgba(201,240,60,0.9)' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${filterCulture === c ? 'rgba(201,240,60,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <div className="flex items-center gap-1 mr-1">
          <Tv className="w-3 h-3 text-white/20" />
          <span className="text-[9px] text-white/20 uppercase tracking-wider">Type</span>
        </div>
        {experiences.map(e => (
          <button
            key={e}
            onClick={() => setFilterExp(e)}
            className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: filterExp === e ? 'rgba(157,78,221,0.15)' : 'rgba(255,255,255,0.04)',
              color: filterExp === e ? 'rgba(157,78,221,0.9)' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${filterExp === e ? 'rgba(157,78,221,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.map((ch, i) => {
          const stream = freeToLiveStream(ch);
          return (
            <button
              key={ch.id}
              onClick={() => handlePlay(ch)}
              className="group relative rounded-xl overflow-hidden text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                    {ch.logo ? (
                      <img src={ch.logo} alt="" className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <Radio className="w-4 h-4 text-white/10" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/70 font-medium truncate leading-tight">{ch.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono"
                        style={{ background: 'rgba(157,78,221,0.1)', color: 'rgba(157,78,221,0.5)' }}>
                        {ch.experience}
                      </span>
                      <span className="text-[8px] text-white/15">{ch.culture}</span>
                    </div>
                  </div>
                </div>
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                  <Play className="w-6 h-6 text-white" fill="white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/20 text-sm">No channels match filters</p>
        </div>
      )}
    </div>
  );
};

export default TestChannelsPage;
