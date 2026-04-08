import React, { useState, useCallback, memo } from 'react';
import { safeImageUrl, getChannelMeta } from '../../lib/xtream';

interface Props {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  eager?: boolean;
}

const COLORS = [
  '#9D4EDD', '#E50914', '#00A8E1', '#FF6B35', '#00D4FF',
  '#FFD700', '#FF006E', '#7B2CBF', '#00D4FF', '#C77DFF',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

// Map channel names to tv-logo GitHub CDN URLs
const TV_LOGO_BASE = 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries';
const LOGO_MAP: Record<string, string> = {
  // ── Sky Sports (UK) ──────────────────────────────────────────────────
  'sky sports main event': `${TV_LOGO_BASE}/united-kingdom/sky-sports-main-event-uk.png`,
  'sky sports premier league': `${TV_LOGO_BASE}/united-kingdom/sky-sports-premier-league-uk.png`,
  'sky sports football': `${TV_LOGO_BASE}/united-kingdom/sky-sports-football-uk.png`,
  'sky sports news': `${TV_LOGO_BASE}/united-kingdom/sky-sports-news-uk.png`,
  'sky sports cricket': `${TV_LOGO_BASE}/united-kingdom/sky-sports-cricket-uk.png`,
  'sky sports action': `${TV_LOGO_BASE}/united-kingdom/sky-sports-action-uk.png`,
  'sky sports golf': `${TV_LOGO_BASE}/united-kingdom/sky-sports-golf-uk.png`,
  'sky sports racing': `${TV_LOGO_BASE}/united-kingdom/sky-sports-racing-uk.png`,
  'sky sports mix': `${TV_LOGO_BASE}/united-kingdom/sky-sports-mix-uk.png`,
  'sky sports f1': `${TV_LOGO_BASE}/united-kingdom/sky-sports-f1-uk.png`,
  'sky sports arena': `${TV_LOGO_BASE}/united-kingdom/sky-sports-arena-uk.png`,
  'sky sports tennis': `${TV_LOGO_BASE}/united-kingdom/sky-sports-tennis-uk.png`,
  'sky sports nfl': `${TV_LOGO_BASE}/united-kingdom/sky-sports-nfl-uk.png`,
  'sky sports darts': `${TV_LOGO_BASE}/united-kingdom/sky-sports-darts-uk.png`,
  'sky sports box office': `${TV_LOGO_BASE}/united-kingdom/sky-sports-box-office-uk.png`,
  // ── Sky Cinema / Sky channels (UK) ───────────────────────────────────
  'sky cinema premiere': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-premiere-uk.png`,
  'sky cinema action': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-action-uk.png`,
  'sky cinema comedy': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-comedy-uk.png`,
  'sky cinema drama': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-drama-uk.png`,
  'sky cinema family': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-family-uk.png`,
  'sky cinema thriller': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-thriller-uk.png`,
  'sky cinema greats': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-greats-uk.png`,
  'sky cinema hits': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-hits-uk.png`,
  'sky cinema select': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-select-uk.png`,
  'sky cinema animation': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-animation-uk.png`,
  'sky cinema sci-fi': `${TV_LOGO_BASE}/united-kingdom/sky-cinema-sci-fi-and-horror-uk.png`,
  'sky news': `${TV_LOGO_BASE}/united-kingdom/sky-news-uk.png`,
  'sky atlantic': `${TV_LOGO_BASE}/united-kingdom/sky-atlantic-uk.png`,
  'sky one': `${TV_LOGO_BASE}/united-kingdom/sky-one-uk.png`,
  'sky max': `${TV_LOGO_BASE}/united-kingdom/sky-max-uk.png`,
  'sky showcase': `${TV_LOGO_BASE}/united-kingdom/sky-showcase-uk.png`,
  'sky arts': `${TV_LOGO_BASE}/united-kingdom/sky-arts-uk.png`,
  'sky comedy': `${TV_LOGO_BASE}/united-kingdom/sky-comedy-uk.png`,
  'sky crime': `${TV_LOGO_BASE}/united-kingdom/sky-crime-uk.png`,
  'sky nature': `${TV_LOGO_BASE}/united-kingdom/sky-nature-uk.png`,
  'sky history': `${TV_LOGO_BASE}/united-kingdom/sky-history-uk.png`,
  'sky documentaries': `${TV_LOGO_BASE}/united-kingdom/sky-documentaries-uk.png`,
  'sky witness': `${TV_LOGO_BASE}/united-kingdom/sky-witness-uk.png`,
  'sky kids': `${TV_LOGO_BASE}/united-kingdom/sky-kids-uk.png`,
  // ── TNT Sports (UK, formerly BT Sport) ───────────────────────────────
  'tnt sports 1': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-1-uk.png`,
  'tnt sports 2': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-2-uk.png`,
  'tnt sports 3': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-3-uk.png`,
  'tnt sports 4': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-4-uk.png`,
  'tnt sports 5': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-5-uk.png`,
  'tnt sports 6': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-6-uk.png`,
  'tnt sports box office': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-box-office-uk.png`,
  'tnt sports ultimate': `${TV_LOGO_BASE}/united-kingdom/tnt-sports-ultimate-uk.png`,
  'bt sport 1': `${TV_LOGO_BASE}/united-kingdom/bt-sport-1-uk.png`,
  'bt sport 2': `${TV_LOGO_BASE}/united-kingdom/bt-sport-2-uk.png`,
  'bt sport 3': `${TV_LOGO_BASE}/united-kingdom/bt-sport-3-uk.png`,
  'bt sport espn': `${TV_LOGO_BASE}/united-kingdom/bt-sport-espn-uk.png`,
  'bt sport box office': `${TV_LOGO_BASE}/united-kingdom/bt-sport-box-office-uk.png`,
  'bt sport ultimate': `${TV_LOGO_BASE}/united-kingdom/bt-sport-ultimate-uk.png`,
  // ── BBC (UK) ─────────────────────────────────────────────────────────
  'bbc one': `${TV_LOGO_BASE}/united-kingdom/bbc-one-uk.png`,
  'bbc two': `${TV_LOGO_BASE}/united-kingdom/bbc-two-uk.png`,
  'bbc three': `${TV_LOGO_BASE}/united-kingdom/bbc-three-uk.png`,
  'bbc four': `${TV_LOGO_BASE}/united-kingdom/bbc-four-uk.png`,
  'bbc news': `${TV_LOGO_BASE}/united-kingdom/bbc-news-uk.png`,
  'bbc world news': `${TV_LOGO_BASE}/united-kingdom/bbc-world-news-uk.png`,
  'bbc parliament': `${TV_LOGO_BASE}/united-kingdom/bbc-parliament-uk.png`,
  'bbc alba': `${TV_LOGO_BASE}/united-kingdom/bbc-alba-uk.png`,
  'bbc cbbc': `${TV_LOGO_BASE}/united-kingdom/bbc-cbbc-uk.png`,
  'bbc cbeebies': `${TV_LOGO_BASE}/united-kingdom/bbc-cbeebies-uk.png`,
  'bbc arabic': `${TV_LOGO_BASE}/international/bbc-arabic-int.png`,
  // ── ITV / Channel 4 / Channel 5 (UK) ────────────────────────────────
  'itv': `${TV_LOGO_BASE}/united-kingdom/itv-uk.png`,
  'itv 1': `${TV_LOGO_BASE}/united-kingdom/itv-1-uk.png`,
  'itv 2': `${TV_LOGO_BASE}/united-kingdom/itv-2-uk.png`,
  'itv 3': `${TV_LOGO_BASE}/united-kingdom/itv-3-uk.png`,
  'itv 4': `${TV_LOGO_BASE}/united-kingdom/itv-4-uk.png`,
  'itv be': `${TV_LOGO_BASE}/united-kingdom/itv-be-uk.png`,
  'channel 4': `${TV_LOGO_BASE}/united-kingdom/channel-4-uk.png`,
  'channel 5': `${TV_LOGO_BASE}/united-kingdom/channel-5-uk.png`,
  'dave': `${TV_LOGO_BASE}/united-kingdom/dave-uk.png`,
  'film4': `${TV_LOGO_BASE}/united-kingdom/channel-4-uk.png`,
  'mutv': `${TV_LOGO_BASE}/united-kingdom/mutv-uk.png`,
  // ── SuperSport (South Africa) ────────────────────────────────────────
  'supersport': `${TV_LOGO_BASE}/south-africa/supersport-za.png`,
  'supersport laliga': `${TV_LOGO_BASE}/south-africa/supersport-laliga-za.png`,
  'supersport football': `${TV_LOGO_BASE}/south-africa/supersport-football-za.png`,
  'supersport football plus': `${TV_LOGO_BASE}/south-africa/supersport-football-plus-za.png`,
  'supersport cricket': `${TV_LOGO_BASE}/south-africa/supersport-cricket-za.png`,
  'supersport blitz': `${TV_LOGO_BASE}/south-africa/supersport-blitz-za.png`,
  'supersport psl': `${TV_LOGO_BASE}/south-africa/supersport-psl-za.png`,
  'supersport premier league': `${TV_LOGO_BASE}/south-africa/supersport-premier-league-za.png`,
  'supersport rugby': `${TV_LOGO_BASE}/south-africa/supersport-rugby-za.png`,
  'supersport golf': `${TV_LOGO_BASE}/south-africa/supersport-golf-za.png`,
  'supersport tennis': `${TV_LOGO_BASE}/south-africa/supersport-tennis-za.png`,
  'supersport motorsport': `${TV_LOGO_BASE}/south-africa/supersport-motorsport-za.png`,
  'supersport action': `${TV_LOGO_BASE}/south-africa/supersport-action-za.png`,
  'supersport grandstand': `${TV_LOGO_BASE}/south-africa/supersport-grandstand-za.png`,
  'supersport variety': `${TV_LOGO_BASE}/south-africa/supersport-variety1-za.png`,
  'supersport variety 1': `${TV_LOGO_BASE}/south-africa/supersport-variety1-za.png`,
  'supersport variety 2': `${TV_LOGO_BASE}/south-africa/supersport-variety2-za.png`,
  'supersport variety 3': `${TV_LOGO_BASE}/south-africa/supersport-variety3-za.png`,
  'supersport variety 4': `${TV_LOGO_BASE}/south-africa/supersport-variety4-za.png`,
  'supersport wwe': `${TV_LOGO_BASE}/south-africa/supersport-wwe-za.png`,
  'supersport maximo': `${TV_LOGO_BASE}/south-africa/supersport-maximo1-za.png`,
  // ── African channels (South Africa / DSTV ecosystem) ─────────────────
  'africa magic': `${TV_LOGO_BASE}/south-africa/1magic-za.png`,
  '1magic': `${TV_LOGO_BASE}/south-africa/1magic-za.png`,
  'mzansi magic': `${TV_LOGO_BASE}/south-africa/mzansi-magic-za.png`,
  'mzansi wethu': `${TV_LOGO_BASE}/south-africa/mzansi-wethu-za.png`,
  'mzansi bioskop': `${TV_LOGO_BASE}/south-africa/mzansi-bioskop-za.png`,
  'maisha magic': `${TV_LOGO_BASE}/south-africa/maisha-magic-east-za.png`,
  'maisha magic east': `${TV_LOGO_BASE}/south-africa/maisha-magic-east-za.png`,
  'maisha magic bongo': `${TV_LOGO_BASE}/south-africa/maisha-magic-bongo-za.png`,
  'maisha magic movies': `${TV_LOGO_BASE}/south-africa/maisha-magic-movies-za.png`,
  'maisha magic plus': `${TV_LOGO_BASE}/south-africa/maisha-magic-plus-za.png`,
  'zambezi magic': `${TV_LOGO_BASE}/south-africa/zambezi-magic-za.png`,
  'pearl magic': `${TV_LOGO_BASE}/south-africa/pearl-magic-prime-za.png`,
  'novela magic': `${TV_LOGO_BASE}/south-africa/novela-magic-za.png`,
  'm-net': `${TV_LOGO_BASE}/south-africa/m-net-za.png`,
  'm-net movies': `${TV_LOGO_BASE}/south-africa/m-net-movies-za.png`,
  'm-net movies 1': `${TV_LOGO_BASE}/south-africa/m-net-movies-1-za.png`,
  'm-net movies 2': `${TV_LOGO_BASE}/south-africa/m-net-movies-2-za.png`,
  'm-net movies 3': `${TV_LOGO_BASE}/south-africa/m-net-movies-3-za.png`,
  'm-net movies 4': `${TV_LOGO_BASE}/south-africa/m-net-movies-4-za.png`,
  'm-net city': `${TV_LOGO_BASE}/south-africa/m-net-city-za.png`,
  'kyknet': `${TV_LOGO_BASE}/south-africa/kyknet-za.png`,
  'e tv': `${TV_LOGO_BASE}/south-africa/e-tv-za.png`,
  'e nca': `${TV_LOGO_BASE}/south-africa/e-nca-za.png`,
  'channel o': `${TV_LOGO_BASE}/south-africa/channel-o-za.png`,
  'sabc 1': `${TV_LOGO_BASE}/south-africa/sabc-1-za.png`,
  'sabc 2': `${TV_LOGO_BASE}/south-africa/sabc-2-za.png`,
  'sabc 3': `${TV_LOGO_BASE}/south-africa/sabc-3-za.png`,
  'sabc news': `${TV_LOGO_BASE}/south-africa/sabc-news-za.png`,
  'newzroom afrika': `${TV_LOGO_BASE}/south-africa/newzroom-afrika-za.png`,
  'moja love': `${TV_LOGO_BASE}/south-africa/moja-love-za.png`,
  // ── Trace (France-hosted, Africa/Caribbean reach) ────────────────────
  'trace urban': `${TV_LOGO_BASE}/france/trace-urban-fr.png`,
  'trace africa': `${TV_LOGO_BASE}/france/trace-urban-fr.png`,
  'trace sport stars': `${TV_LOGO_BASE}/france/trace-sport-stars-fr.png`,
  'trace caribbean': `${TV_LOGO_BASE}/france/trace-caribbean-fr.png`,
  'trace latina': `${TV_LOGO_BASE}/france/trace-latina-fr.png`,
  'trace muzika': `${TV_LOGO_BASE}/france/trace-urban-fr.png`,
  'trace naija': `${TV_LOGO_BASE}/france/trace-urban-fr.png`,
  // ── Canal+ (France) ──────────────────────────────────────────────────
  'canal+': `${TV_LOGO_BASE}/france/canal-plus-fr.png`,
  'canal+ sport': `${TV_LOGO_BASE}/france/canal-plus-sport-fr.png`,
  'canal+ sport 360': `${TV_LOGO_BASE}/france/canal-plus-sport-360-fr.png`,
  'canal+ cinema': `${TV_LOGO_BASE}/france/canal-plus-cinemas-fr.png`,
  'canal+ cinemas': `${TV_LOGO_BASE}/france/canal-plus-cinemas-fr.png`,
  'canal+ family': `${TV_LOGO_BASE}/france/canal-plus-family-fr.png`,
  'canal+ kids': `${TV_LOGO_BASE}/france/canal-plus-kids-fr.png`,
  'canal+ premiere': `${TV_LOGO_BASE}/france/canal-plus-premier-league-fr.png`,
  'canal+ premier league': `${TV_LOGO_BASE}/france/canal-plus-premier-league-fr.png`,
  'canal+ series': `${TV_LOGO_BASE}/france/canal-plus-series-fr.png`,
  'canal+ docs': `${TV_LOGO_BASE}/france/canal-plus-docs-fr.png`,
  'canal+ foot': `${TV_LOGO_BASE}/france/canal-plus-foot-fr.png`,
  'canal+ box office': `${TV_LOGO_BASE}/france/canal-plus-box-office-fr.png`,
  'canal+ grand ecran': `${TV_LOGO_BASE}/france/canal-plus-grand-ecran-fr.png`,
  // ── French broadcast ─────────────────────────────────────────────────
  'tf1': `${TV_LOGO_BASE}/france/tf1-fr.png`,
  'france 2': `${TV_LOGO_BASE}/france/france-2-fr.png`,
  'france 3': `${TV_LOGO_BASE}/france/france-3-fr.png`,
  'france 4': `${TV_LOGO_BASE}/france/france-4-fr.png`,
  'france 5': `${TV_LOGO_BASE}/france/france-5-fr.png`,
  'france 24': `${TV_LOGO_BASE}/france/france-24-fr.png`,
  'france 24 english': `${TV_LOGO_BASE}/international/france-24-english-int.png`,
  'm6': `${TV_LOGO_BASE}/france/m6-fr.png`,
  'c8': `${TV_LOGO_BASE}/france/c8-fr.png`,
  'arte': `${TV_LOGO_BASE}/france/arte-fr.png`,
  'bfm tv': `${TV_LOGO_BASE}/france/bfm-tv-fr.png`,
  'lci': `${TV_LOGO_BASE}/france/lci-fr.png`,
  'tv5 monde': `${TV_LOGO_BASE}/france/tv5-monde-fr.png`,
  'tv5monde': `${TV_LOGO_BASE}/france/tv5-monde-fr.png`,
  'eurosport 1': `${TV_LOGO_BASE}/france/eurosport-1-fr.png`,
  'eurosport 2': `${TV_LOGO_BASE}/france/eurosport-2-fr.png`,
  'eurosport': `${TV_LOGO_BASE}/france/eurosport-1-fr.png`,
  'gulli': `${TV_LOGO_BASE}/france/gulli-fr.png`,
  'rtl9': `${TV_LOGO_BASE}/france/rtl9-fr.png`,
  // ── MBC (UAE — now with correct per-channel logos) ───────────────────
  'mbc 1': `${TV_LOGO_BASE}/united-arab-emirates/mbc-1-ae.png`,
  'mbc 2': `${TV_LOGO_BASE}/united-arab-emirates/mbc-2-ae.png`,
  'mbc 3': `${TV_LOGO_BASE}/united-arab-emirates/mbc-3-ae.png`,
  'mbc 4': `${TV_LOGO_BASE}/united-arab-emirates/mbc-4-ae.png`,
  'mbc 5': `${TV_LOGO_BASE}/united-arab-emirates/mbc-5-ae.png`,
  'mbc action': `${TV_LOGO_BASE}/united-arab-emirates/mbc-action-ae.png`,
  'mbc drama': `${TV_LOGO_BASE}/united-arab-emirates/mbc-drama-ae.png`,
  'mbc max': `${TV_LOGO_BASE}/united-arab-emirates/mbc-max-ae.png`,
  'mbc masr': `${TV_LOGO_BASE}/united-arab-emirates/mbc-maser-ae.png`,
  'mbc masr 2': `${TV_LOGO_BASE}/united-arab-emirates/mbc-maser-2-ae.png`,
  'mbc persia': `${TV_LOGO_BASE}/united-arab-emirates/mbc-persia-ae.png`,
  'mbc variety': `${TV_LOGO_BASE}/united-arab-emirates/mbc-plus-variety-ae.png`,
  'mbc iraq': `${TV_LOGO_BASE}/united-arab-emirates/mbc-iraq-ae.png`,
  'mbc bollywood': `${TV_LOGO_BASE}/united-arab-emirates/mbc-bollywood-ae.png`,
  'mbc usa': `${TV_LOGO_BASE}/united-arab-emirates/mbc-usa-ae.png`,
  'mbc plus drama': `${TV_LOGO_BASE}/united-arab-emirates/mbc-plus-drama-ae.png`,
  // ── Arabic channels (UAE) ────────────────────────────────────────────
  'al arabiya': `${TV_LOGO_BASE}/united-arab-emirates/al-arabiya-ae.png`,
  'al arabiya al hadath': `${TV_LOGO_BASE}/united-arab-emirates/al-arabiya-al-hadath-ae.png`,
  'al hadath': `${TV_LOGO_BASE}/united-arab-emirates/al-arabiya-al-hadath-ae.png`,
  'dubai tv': `${TV_LOGO_BASE}/united-arab-emirates/dubai-tv-ae.png`,
  'dubai one': `${TV_LOGO_BASE}/united-arab-emirates/dubai-one-ae.png`,
  'dubai sports': `${TV_LOGO_BASE}/united-arab-emirates/dubai-sports-tv-ae.png`,
  'dubai racing': `${TV_LOGO_BASE}/united-arab-emirates/dubai-racing-tv-ae.png`,
  'dubai zaman': `${TV_LOGO_BASE}/united-arab-emirates/dubai-zaman-ae.png`,
  'sama dubai': `${TV_LOGO_BASE}/united-arab-emirates/sama-dubai-ae.png`,
  'abu dhabi tv': `${TV_LOGO_BASE}/united-arab-emirates/abu-dhabi-tv-ae.png`,
  'abu dhabi sports': `${TV_LOGO_BASE}/united-arab-emirates/abu-dhabi-sports-tv-ae.png`,
  'al emarat': `${TV_LOGO_BASE}/united-arab-emirates/al-emarat-tv-ae.png`,
  'sharjah tv': `${TV_LOGO_BASE}/united-arab-emirates/sharjah-tv-ae.png`,
  'ajman tv': `${TV_LOGO_BASE}/united-arab-emirates/ajman-tv-ae.png`,
  'qatar tv': `${TV_LOGO_BASE}/united-arab-emirates/qatar-tv-ae.png`,
  'al saudiya': `${TV_LOGO_BASE}/united-arab-emirates/al-saudiya-ae.png`,
  'sbc': `${TV_LOGO_BASE}/united-arab-emirates/sbc-ae.png`,
  'noor dubai': `${TV_LOGO_BASE}/united-arab-emirates/noor-dubai-ae.png`,
  'majid tv': `${TV_LOGO_BASE}/united-arab-emirates/majid-tv-ae.png`,
  'nat geo abu dhabi': `${TV_LOGO_BASE}/united-arab-emirates/national-geographic-abu-dhabi-ae.png`,
  'national geographic abu dhabi': `${TV_LOGO_BASE}/united-arab-emirates/national-geographic-abu-dhabi-ae.png`,
  // ── OSN (UAE) ────────────────────────────────────────────────────────
  'osn movies': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-hollywood-ae.png`,
  'osn movies action': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-action-ae.png`,
  'osn movies comedy': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-comedy-ae.png`,
  'osn movies family': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-family-ae.png`,
  'osn movies premiere': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-premiere-ae.png`,
  'osn movies horror': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-horror-ae.png`,
  'osn movies hollywood': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-movies-hollywood-ae.png`,
  'osn yahala': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-yahala-ae.png`,
  'osn yahala aflam': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-yahala-aflam-ae.png`,
  'osn yahala bil arabi': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-yahala-bil-arabi-ae.png`,
  'osn showcase': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-showcase-ae.png`,
  'osn now': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-now-ae.png`,
  'osn news': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-news-ae.png`,
  'osn comedy': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-comedy-ae.png`,
  'osn crime': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-crime-ae.png`,
  'osn kids': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-kids-ae.png`,
  'osn pop up': `${TV_LOGO_BASE}/united-arab-emirates/osn-tv-pop-up-ae.png`,
  // ── beIN Sports (France path) ────────────────────────────────────────
  'bein sports': `${TV_LOGO_BASE}/france/bein-sports-fr.png`,
  'bein sports 1': `${TV_LOGO_BASE}/france/bein-sports-1-french-fr.png`,
  'bein sports 2': `${TV_LOGO_BASE}/france/bein-sports-2-french-fr.png`,
  'bein sports 3': `${TV_LOGO_BASE}/france/bein-sports-3-french-fr.png`,
  'bein movies': `${TV_LOGO_BASE}/france/bein-sports-fr.png`,
  // ── US Sports ────────────────────────────────────────────────────────
  'espn': `${TV_LOGO_BASE}/united-states/espn-us.png`,
  'espn 2': `${TV_LOGO_BASE}/united-states/espn-2-us.png`,
  'espn 3': `${TV_LOGO_BASE}/united-states/espn-3-us.png`,
  'espn deportes': `${TV_LOGO_BASE}/united-states/espn-deportes-us.png`,
  'espn plus': `${TV_LOGO_BASE}/united-states/espn-plus-us.png`,
  'espn u': `${TV_LOGO_BASE}/united-states/espn-u-us.png`,
  'espnews': `${TV_LOGO_BASE}/united-states/espnews-us.png`,
  'espn classic': `${TV_LOGO_BASE}/united-states/espn-classic-us.png`,
  'fox sports': `${TV_LOGO_BASE}/united-states/fox-sports-us.png`,
  'fox sports 1': `${TV_LOGO_BASE}/united-states/fox-sports-1-us.png`,
  'fox sports 2': `${TV_LOGO_BASE}/united-states/fox-sports-2-us.png`,
  'fox sport': `${TV_LOGO_BASE}/united-states/fox-sports-1-us.png`,
  'fox sports deportes': `${TV_LOGO_BASE}/united-states/fox-sports-deportes-us.png`,
  'fox news': `${TV_LOGO_BASE}/united-states/fox-news-us.png`,
  'fox business': `${TV_LOGO_BASE}/united-states/fox-business-us.png`,
  'nfl network': `${TV_LOGO_BASE}/united-states/nfl-network-us.png`,
  'nfl red zone': `${TV_LOGO_BASE}/united-states/nfl-red-zone-us.png`,
  'nba tv': `${TV_LOGO_BASE}/united-states/nba-tv-us.png`,
  'nbc sports': `${TV_LOGO_BASE}/united-states/nbc-sports-us.png`,
  'cbs sports': `${TV_LOGO_BASE}/united-states/cbs-sports-us.png`,
  'cbs sports network': `${TV_LOGO_BASE}/united-states/cbs-sports-network-us.png`,
  'tnt': `${TV_LOGO_BASE}/united-states/tnt-us.png`,
  'tbs': `${TV_LOGO_BASE}/united-states/tbs-us.png`,
  // ── US Broadcast / News ──────────────────────────────────────────────
  'cnn': `${TV_LOGO_BASE}/united-states/cnn-us.png`,
  'cnn international': `${TV_LOGO_BASE}/international/cnn-international-int.png`,
  'cnbc': `${TV_LOGO_BASE}/united-states/cnbc-us.png`,
  'msnbc': `${TV_LOGO_BASE}/united-states/msnbc-hz-us.png`,
  'abc': `${TV_LOGO_BASE}/united-states/abc-us.png`,
  'abc news': `${TV_LOGO_BASE}/united-states/abc-news-us.png`,
  'nbc': `${TV_LOGO_BASE}/united-states/nbc-us.png`,
  'nbc news': `${TV_LOGO_BASE}/united-states/nbc-news-now-us.png`,
  'cbs news': `${TV_LOGO_BASE}/united-states/cbs-news-us.png`,
  'hbo': `${TV_LOGO_BASE}/united-states/hbo-us.png`,
  'amc': `${TV_LOGO_BASE}/united-states/amc-us.png`,
  'a&e': `${TV_LOGO_BASE}/united-states/a-and-e-us.png`,
  // ── Americas / Latin ─────────────────────────────────────────────────
  'univision': `${TV_LOGO_BASE}/united-states/univision-us.png`,
  'telemundo': `${TV_LOGO_BASE}/united-states/telemundo-us.png`,
  'telemundo deportes': `${TV_LOGO_BASE}/united-states/telemundo-deportes-us.png`,
  'azteca': `${TV_LOGO_BASE}/mexico/azteca-mx.png`,
  'azteca uno': `${TV_LOGO_BASE}/mexico/azteca-uno-mx.png`,
  'azteca 7': `${TV_LOGO_BASE}/mexico/azteca-7-mx.png`,
  'las estrellas': `${TV_LOGO_BASE}/mexico/las-estrellas-mx.png`,
  'canal 5': `${TV_LOGO_BASE}/mexico/canal-5-mx.png`,
  'tudn': `${TV_LOGO_BASE}/mexico/tudn-mx.png`,
  'tv globo': `${TV_LOGO_BASE}/brazil/globo-br.png`,
  'globo': `${TV_LOGO_BASE}/brazil/globo-br.png`,
  'globo news': `${TV_LOGO_BASE}/brazil/globo-news-br.png`,
  'band': `${TV_LOGO_BASE}/brazil/band-br.png`,
  'band news': `${TV_LOGO_BASE}/brazil/band-news-br.png`,
  'band sports': `${TV_LOGO_BASE}/brazil/band-sports-br.png`,
  'sbt': `${TV_LOGO_BASE}/brazil/sbt-br.png`,
  'record': `${TV_LOGO_BASE}/brazil/record-br.png`,
  'record news': `${TV_LOGO_BASE}/brazil/record-news-br.png`,
  'rede tv': `${TV_LOGO_BASE}/brazil/rede-tv-br.png`,
  'sportv': `${TV_LOGO_BASE}/brazil/sportv-br.png`,
  'sportv 2': `${TV_LOGO_BASE}/brazil/sportv2-br.png`,
  'sportv 3': `${TV_LOGO_BASE}/brazil/sportv3-br.png`,
  'tv cultura': `${TV_LOGO_BASE}/brazil/tv-cultura-br.png`,
  'multishow': `${TV_LOGO_BASE}/brazil/multishow-br.png`,
  'cnn brasil': `${TV_LOGO_BASE}/brazil/cnn-brasil-br.png`,
  // ── DAZN + International sports ──────────────────────────────────────
  'dazn': `${TV_LOGO_BASE}/international/dazn-int.png`,
  'dazn 1': `${TV_LOGO_BASE}/international/dazn1-int.png`,
  'dazn 2': `${TV_LOGO_BASE}/international/dazn2-int.png`,
  'f1 tv': `${TV_LOGO_BASE}/international/f1-tv-int.png`,
  'eleven sports': `${TV_LOGO_BASE}/international/eleven-sports-int.png`,
  'eleven sports 1': `${TV_LOGO_BASE}/international/eleven-sports-1-int.png`,
  'eleven sports 2': `${TV_LOGO_BASE}/international/eleven-sports-2-int.png`,
  // ── Indian channels ──────────────────────────────────────────────────
  'star plus': `${TV_LOGO_BASE}/india/star-plus-in.png`,
  'star gold': `${TV_LOGO_BASE}/india/star-gold-in.png`,
  'star gold 2': `${TV_LOGO_BASE}/india/star-gold-2-in.png`,
  'star gold select': `${TV_LOGO_BASE}/india/star-gold-select-in.png`,
  'star bharat': `${TV_LOGO_BASE}/india/star-bharat-in.png`,
  'star world': `${TV_LOGO_BASE}/india/star-world-in.png`,
  'star movies': `${TV_LOGO_BASE}/india/star-movies-in.png`,
  'star sports 1': `${TV_LOGO_BASE}/india/star-sports-1-in.png`,
  'star sports 2': `${TV_LOGO_BASE}/india/star-sports-2-in.png`,
  'star sports 3': `${TV_LOGO_BASE}/india/star-sports-3-in.png`,
  'star sports select 1': `${TV_LOGO_BASE}/india/star-sports-select-1-in.png`,
  'star sports select 2': `${TV_LOGO_BASE}/india/star-sports-select-2-in.png`,
  'star sports first': `${TV_LOGO_BASE}/india/star-sports-first-in.png`,
  'star sports 1 hindi': `${TV_LOGO_BASE}/india/star-sports-1-hindi-in.png`,
  'star jalsha': `${TV_LOGO_BASE}/india/star-jalsha-in.png`,
  'star maa': `${TV_LOGO_BASE}/india/star-maa-in.png`,
  'star utsav': `${TV_LOGO_BASE}/india/star-utsav-in.png`,
  'star life': `${TV_LOGO_BASE}/india/star-life-in.png`,
  'star pravah': `${TV_LOGO_BASE}/india/star-pravah-in.png`,
  'zee tv': `${TV_LOGO_BASE}/india/zee-tv-in.png`,
  'zee cinema': `${TV_LOGO_BASE}/india/zee-cinema-in.png`,
  'zee news': `${TV_LOGO_BASE}/india/zee-news-in.png`,
  'zee cafe': `${TV_LOGO_BASE}/india/zee-cafe-in.png`,
  'zee bollywood': `${TV_LOGO_BASE}/india/zee-bollywood-in.png`,
  'zee classic': `${TV_LOGO_BASE}/india/zee-classic-in.png`,
  'zee action': `${TV_LOGO_BASE}/india/zee-action-in.png`,
  'zee bangla': `${TV_LOGO_BASE}/india/zee-bangla-in.png`,
  'zee marathi': `${TV_LOGO_BASE}/india/zee-marathi-in.png`,
  'zee tamil': `${TV_LOGO_BASE}/india/zee-tamil-in.png`,
  'zee telugu': `${TV_LOGO_BASE}/india/zee-telugu-in.png`,
  'zee kannada': `${TV_LOGO_BASE}/india/zee-kannada-in.png`,
  'zee punjabi': `${TV_LOGO_BASE}/india/zee-punjabi-in.png`,
  'zee zindagi': `${TV_LOGO_BASE}/india/zee-zindagi-in.png`,
  'zee business': `${TV_LOGO_BASE}/india/zee-business-in.png`,
  'zee zest': `${TV_LOGO_BASE}/india/zee-zest-in.png`,
  'colors': `${TV_LOGO_BASE}/india/colors-in.png`,
  'colors tv': `${TV_LOGO_BASE}/india/colors-in.png`,
  'colors infinity': `${TV_LOGO_BASE}/india/colors-infinity-in.png`,
  'colors cineplex': `${TV_LOGO_BASE}/india/colors-cineplex-in.png`,
  'colors rishtey': `${TV_LOGO_BASE}/india/colors-rishtey-in.png`,
  'colors marathi': `${TV_LOGO_BASE}/india/colors-marathi-in.png`,
  'sony entertainment': `${TV_LOGO_BASE}/india/sony-entertainment-television-in.png`,
  'sony ten': `${TV_LOGO_BASE}/india/sony-ten-1-in.png`,
  'sony ten 1': `${TV_LOGO_BASE}/india/sony-ten-1-in.png`,
  'sony ten 2': `${TV_LOGO_BASE}/india/sony-ten-2-in.png`,
  'sony ten 3': `${TV_LOGO_BASE}/india/sony-ten-3-in.png`,
  'sony ten 4': `${TV_LOGO_BASE}/india/sony-ten-4-in.png`,
  'sony ten 5': `${TV_LOGO_BASE}/india/sony-ten-5-in.png`,
  'sony max': `${TV_LOGO_BASE}/india/sony-max-in.png`,
  'sony max 2': `${TV_LOGO_BASE}/india/sony-max-2-in.png`,
  'sony pix': `${TV_LOGO_BASE}/india/sony-pix-in.png`,
  'sony sab': `${TV_LOGO_BASE}/india/sony-sab-in.png`,
  'sony pal': `${TV_LOGO_BASE}/india/sony-pal-in.png`,
  'sony wah': `${TV_LOGO_BASE}/india/sony-wah-in.png`,
  'sony yay': `${TV_LOGO_BASE}/india/sony-yay-in.png`,
  'sony bbc earth': `${TV_LOGO_BASE}/india/sony-bbc-earth-in.png`,
  'ndtv 24x7': `${TV_LOGO_BASE}/india/ndtv-24x7-in.png`,
  'ndtv india': `${TV_LOGO_BASE}/india/ndtv-india-in.png`,
  'ndtv profit': `${TV_LOGO_BASE}/india/ndtv-profit-in.png`,
  'times now': `${TV_LOGO_BASE}/india/times-now-in.png`,
  'aaj tak': `${TV_LOGO_BASE}/india/aaj-tak-in.png`,
  'dd national': `${TV_LOGO_BASE}/india/dd-national-in.png`,
  'dd news': `${TV_LOGO_BASE}/india/dd-news-in.png`,
  'dd sports': `${TV_LOGO_BASE}/india/dd-sports-in.png`,
  'dd india': `${TV_LOGO_BASE}/india/dd-india-in.png`,
  'mtv india': `${TV_LOGO_BASE}/india/mtv-in.png`,
  // ── International / Kids / Entertainment ─────────────────────────────
  'cartoon network': `${TV_LOGO_BASE}/international/cartoon-network-int.png`,
  'nickelodeon': `${TV_LOGO_BASE}/international/nickelodeon-int.png`,
  'disney channel': `${TV_LOGO_BASE}/international/disney-channel-int.png`,
  'disney plus': `${TV_LOGO_BASE}/international/disney-plus-int.png`,
  'animal planet': `${TV_LOGO_BASE}/international/animal-planet-int.png`,
  'arirang': `${TV_LOGO_BASE}/international/arirang-int.png`,
  'dw': `${TV_LOGO_BASE}/international/dw-int.png`,
  'dw english': `${TV_LOGO_BASE}/international/dw-english-int.png`,
  'euronews': `${TV_LOGO_BASE}/international/euro-news-int.png`,
  'fashion tv': `${TV_LOGO_BASE}/international/fashion-tv-int.png`,
  'cgtn': `${TV_LOGO_BASE}/international/cgtn-int.png`,
  'cgtn africa': `${TV_LOGO_BASE}/international/cgtn-africa-int.png`,
  'cgtn french': `${TV_LOGO_BASE}/international/cgtn-french-int.png`,
  'cgtn arabic': `${TV_LOGO_BASE}/international/cgtn-arabic-int.png`,
  'kbs world': `${TV_LOGO_BASE}/international/kbs-world-int.png`,
  // ── US Sports / Entertainment (additional) ──────────────────────────
  'nba network': `${TV_LOGO_BASE}/united-states/nba-tv-us.png`,
  'ufc fight pass': `${TV_LOGO_BASE}/united-states/ufc-fight-pass-us.png`,
  'tsn': `${TV_LOGO_BASE}/canada/tsn-ca.png`,
  'sec network': `${TV_LOGO_BASE}/united-states/sec-network-us.png`,
  'yes network': `${TV_LOGO_BASE}/united-states/yes-network-us.png`,
  'destination america': `${TV_LOGO_BASE}/united-states/destination-america-us.png`,
  'diy network': `${TV_LOGO_BASE}/united-states/diy-network-us.png`,
  'hallmark channel': `${TV_LOGO_BASE}/united-states/hallmark-channel-us.png`,
  'hallmark movies': `${TV_LOGO_BASE}/united-states/hallmark-movies-and-mysteries-us.png`,
  'stv': `${TV_LOGO_BASE}/united-kingdom/stv-uk.png`,
  'watch': `${TV_LOGO_BASE}/united-kingdom/w-uk.png`,
  'sixx': `${TV_LOGO_BASE}/germany/sixx-de.png`,
  '13th street': `${TV_LOGO_BASE}/germany/13th-street-de.png`,
  'rtl crime': `${TV_LOGO_BASE}/germany/rtl-crime-de.png`,
  'hum masala': `${TV_LOGO_BASE}/pakistan/hum-masala-pk.png`,
  'hum tv': `${TV_LOGO_BASE}/pakistan/hum-tv-pk.png`,
  'al hurra': `${TV_LOGO_BASE}/international/alhurra-int.png`,
  'spotv': `${TV_LOGO_BASE}/international/spotv-int.png`,
  'mlb': `${TV_LOGO_BASE}/united-states/mlb-network-us.png`,
};

function findLogoUrl(channelName: string): string | null {
  // Normalize: strip prefixes, lowercase
  const norm = channelName
    .replace(/^(UK\s*[\|:]+\s*|UHD\s*▎\s*|\|[A-Z]+\|\s*|FR\s*\([^)]*\)\s*)/i, '')
    .replace(/\s*[\[(][^\])]*[\])]\s*$/g, '')
    .replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Direct match
  if (LOGO_MAP[norm]) return LOGO_MAP[norm];

  // Partial match — find longest matching key
  for (const [key, url] of Object.entries(LOGO_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return url;
  }

  return null;
}

const sizes = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
};

export const ChannelIcon = memo(function ChannelIcon({ src, name, size = 'md', className = '', eager = false }: Props) {
  const [failed, setFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const letter = name.charAt(0).toUpperCase();

  // Priority: 1. safeImageUrl (handles dead domains, HTTP proxy)  2. tv-logo CDN  3. Letter avatar
  let safeSrc: string | null = null;
  if (!failed) {
    safeSrc = safeImageUrl(src);
    if (!safeSrc && !logoFailed) {
      safeSrc = findLogoUrl(name);
    }
  }

  // Letter fallback (used as placeholder during load AND as final fallback)
  const letterEl = (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(10,10,18,0.95) 50%, rgba(157,78,221,0.06) 100%)',
        border: '1px solid rgba(157,78,221,0.1)',
        color: 'rgba(157,78,221,0.7)',
        fontSize: size === 'lg' ? '14px' : size === 'md' ? '11px' : '9px',
        letterSpacing: '0.05em',
      }}
    >
      {letter}
    </div>
  );

  if (!safeSrc) return letterEl;

  return (
    <div className={`${sizes[size]} relative rounded-xl overflow-hidden flex-shrink-0 ${className}`}>
      {/* Letter always behind — prevents layout shift when image loads/fails */}
      {letterEl}
      <img
        src={safeSrc}
        alt={name}
        className={`absolute inset-0 w-full h-full rounded-xl object-contain bg-white/5 p-1 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (import.meta.env.DEV) console.warn('[ICON] Failed:', name, safeSrc?.slice(0, 60));
          if (safeSrc?.includes('tv-logos')) setLogoFailed(true);
          else setFailed(true);
        }}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
});

// ── Channel Badge (flag + quality) ──────────────────────────────────

const QUALITY_STYLE: Record<string, { text: string; opacity: string; glow?: string }> = {
  '4K': { text: '4K', opacity: 'opacity-80', glow: '0 0 4px rgba(255,215,0,0.4)' },
  'FHD': { text: 'FHD', opacity: 'opacity-50' },
  'HD': { text: 'HD', opacity: 'opacity-25' },
  'SD': { text: '', opacity: '' },
};

export const ChannelBadge = memo(function ChannelBadge({ streamId, compact = false }: { streamId: number; compact?: boolean }) {
  const meta = getChannelMeta(streamId);
  if (!meta) return null;
  const { flag, qualityTag } = meta;
  const qStyle = qualityTag ? QUALITY_STYLE[qualityTag.toUpperCase()] : null;
  const showQuality = qStyle && qStyle.text;
  if (!flag && !showQuality) return null;

  return (
    <div className={`absolute ${compact ? 'bottom-0.5 right-0.5 gap-0.5' : 'bottom-1 right-1 gap-1'} flex items-center pointer-events-none`}>
      {flag && <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} opacity-30 leading-none`}>{flag}</span>}
      {showQuality && (
        <span
          className={`${compact ? 'text-[6px] font-bold' : 'text-[7px] font-semibold'} text-white/50 ${qStyle.opacity} leading-none`}
          style={qStyle.glow ? { textShadow: qStyle.glow } : undefined}
        >
          {qStyle.text}
        </span>
      )}
    </div>
  );
});
