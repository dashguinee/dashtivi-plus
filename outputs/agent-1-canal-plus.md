# IPTV Canal+ Streams Research Report
**Date**: February 27, 2026
**Task**: Find free IPTV streams for Canal+ channels (Canal+ Afrique, Canal+ Sport, Canal+ Guinée, Canal+ France)

---

## EXECUTIVE SUMMARY

Research identified limited free/public Canal+ M3U8 streams. Canal+ is a premium paid service with strong geo-blocking and DRM protections. Found:
- 2 confirmed "Canal+ En Clair" (free-to-air) streams
- Multiple IPTV aggregators with Canal+ entries
- Canal+ Sport 1-5 channels listed in iptv-org database but stream URLs not publicly accessible
- Legal/licensing concerns with all free alternatives

---

## 1. CONFIRMED FREE CANAL+ STREAMS

### Canal+ En Clair (Free-to-Air)

#### Stream 1: canalplus.com Source
**Channel Name**: CANAL+ EN CLAIR
**Quality**: 1080p (1920x1080)
**Bandwidth**: 6.28 Mbps (max)
**M3U8 URL**: `https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/canalplus/canalplusclair-hd.m3u8`
**Backup URL**: `https://viamotionhsi.netplus.ch/live/eds/canalplusclair/browser-dash/canalplusclair.mpd` (DASH format)
**Available Qualities**:
- 1280x720 (HD) - 4.2 Mbps
- 960x540 - 1.9-2.7 Mbps
- 640x360 - 1.4-1.6 Mbps
- 480x270 - 992 kbps-1.2 Mbps
- 416x234 (Low) - 339-511 kbps

**Audio Tracks**: French (vf), Original Version (vo), Audio Description (qad)
**Subtitles**: French with captions for hearing-impaired
**Region**: France
**Notes**: Tokenized CDN (expiration timestamps), via Canal+ infrastructure
**Source**: Paradise-91 ParaTV repository

---

#### Stream 2: Dailymotion Source
**Channel Name**: CANAL+ EN CLAIR
**Quality**: 1080p (1920x1080)
**Bandwidth**: 6.28 Mbps (max)
**M3U8 URL**: `https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/canalplus/canalplus-dm.m3u8`
**Available Qualities**:
- 1080p - 6.28 Mbps
- 720p - 2.18 Mbps
- 480p - 1.36 Mbps
- 380p - 782 kbps
- 240p - 475 kbps

**CDN Host**: Dailymotion (eu-north-1b region)
**Region**: France
**Notes**: Hosted on Dailymotion CDN, encrypted base URLs
**Source**: Paradise-91 ParaTV repository

---

## 2. IPTV AGGREGATORS WITH CANAL+ ENTRIES

### iptv-org Database
**URL**: https://github.com/iptv-org/iptv
**Channels Listed**: Canal+ France, Canal+ Sport 1-5, and regional variants
**Status**: User-editable database with CSV format
**Notable Entry**: https://iptv-org.github.io/channels/fr/CanalPlus

**Limitations**: Most premium Canal+ channels (Sport 1-5, Cinema, Action, etc.) are listed but stream URLs are not publicly accessible. Database focuses on officially free-to-air channels.

---

### Free-TV/IPTV Repository
**URL**: https://github.com/Free-TV/IPTV
**Main Playlist**: `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8`
**France-Specific**: `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_france.m3u8`
**Status**: No Canal+ entries in France playlist (confirms premium content excluded)
**Policy**: Only includes channels officially provided free to everybody in a particular country

---

### Paradise-91 ParaTV
**URL**: https://github.com/Paradise-91/ParaTV
**Main Repo**: Collection of IPTV streaming playlists for French television
**Canal+ Entries**:
- CANAL+ EN CLAIR [1080p-canalplus.com]
- CANAL+ EN CLAIR [1080p-dailymotion.com]
- Additional regional variants available in `/streams/canalplus/` directory

---

## 3. CANAL+ CHANNELS IN DATABASE (LIMITED ACCESSIBILITY)

From iptv-org/database search results:

| Channel | Quality | Region | Stream Status |
|---------|---------|--------|----------------|
| Canal+ (France) | 576i-1080p | France | Partially available (En Clair only) |
| Canal+ Sport 1 Afrique | HD | Africa/Guinea | No public stream found |
| Canal+ Sport 2 Afrique | HD | Africa/Guinea | No public stream found |
| Canal+ Sport 3 Afrique | HD | Africa/Guinea | No public stream found |
| Canal+ Sport 4 Afrique | HD | Africa/Guinea | No public stream found |
| Canal+ Sport 5 Afrique | HD | Africa/Guinea | No public stream found |
| Canal+ Action | SD/HD | France | No public stream found |
| Canal+ Cinema | SD/HD | France | No public stream found |
| Canal+ Kids | SD/HD | France | No public stream found |

**Source**: iptv-org/database and iptv-org/epg repositories

---

## 4. CANAL+ GUINÉE & WEST AFRICA

### Available Information
- **Official Service**: https://www.canalplus-afrique.com/
- **Coverage**: Guinea included in CanalSat Afrique service area
- **Authentication Required**: Subscription/digital authentication needed for premium content
- **Broadcast Methods**: Terrestrial TV, cable, satellite, IPTV, mobile/desktop apps

### Research Finding
No free public M3U8 streams found for Canal+ Guinée specifically. The service requires subscription through:
- CanalSat Afrique (official distributor)
- CANAL+ mobile app (requires authentication)
- Regional authorized resellers

---

## 5. ALTERNATIVE AFRICAN IPTV AGGREGATORS

### IPTV Cat
**URL**: https://iptvcat.net/africa/3
**Coverage**: Africa-wide channel aggregation
**Update Frequency**: Daily checks for working streams
**Notable Countries**: Guinea, Senegal, Ivory Coast entries
**Status**: No confirmed Canal+ Sport entries found in public listings

---

### AfrikaSTV
**URL**: https://roku.afrikastv.com/
**Type**: Legitimate streaming service
**Channels**: 500+ African live TV channels
**Availability**: Roku, Amazon FireTV, Android Mobile/TV, iOS, WebTV
**Canal+ Status**: Not confirmed as carrier

---

### AVO TV
**URL**: https://www.avo.tv/
**Type**: Free premium African content service
**Status**: Legitimate alternative for African TV
**Canal+ Status**: Not confirmed as carrier

---

### Squid TV
**URL**: https://www.squidtv.net/africa/
**Countries**: Guinea, Senegal, Ivory Coast supported
**Status**: Free live TV streaming aggregator

---

## 6. TECHNICAL DETAILS FOR CONFIRMED STREAMS

### Canal+ En Clair Stream Architecture

**Base M3U8 Playlist Structure**:
```
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0

#EXT-X-STREAM-INF:BANDWIDTH=6280000,RESOLUTION=1920x1080,CODECS="avc1.4d401f,ec-3"
https://[CDN]/v1/1920x1080/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=4200000,RESOLUTION=1280x720,CODECS="avc1.4d401f,ec-3"
https://[CDN]/v1/1280x720/playlist.m3u8

[Additional quality tiers...]
```

**Video Codec**: AVC1 (H.264)
**Audio Codecs**: EC-3 (Dolby Digital Plus) or AAC-LC
**DRM**: CDN tokens with expiration timestamps
**User-Agent Required**: Mozilla/5.0 (Windows NT 10.0; Win64; x64)

---

## 7. LEGAL & LICENSING NOTES

### Important Disclaimers

1. **Canal+ is a Premium Service**: All non-"En Clair" content is subscription-only
2. **Geo-Blocking**: Content is geo-restricted by region
3. **DRM Protection**: Streams contain digital rights management
4. **Copyright**: Free alternative streams may violate intellectual property rights
5. **Terms of Service**: Verify stream legality in your jurisdiction
6. **License Status**: Cannot guarantee that unverified M3U8 playlists carry proper broadcast licensing

### Legitimate Options
- Official Canal+ subscription (https://www.canalplus.com/)
- CanalSat Afrique for West Africa (authorized distributor)
- CANAL+ app (requires authentication)
- Regional licensed IPTV providers

---

## 8. RESEARCH SOURCES

### GitHub Repositories
- [Paradise-91/ParaTV](https://github.com/Paradise-91/ParaTV) - French IPTV playlists
- [iptv-org/iptv](https://github.com/iptv-org/iptv) - Worldwide IPTV channels database
- [iptv-org/database](https://github.com/iptv-org/database) - User-editable channel database
- [Free-TV/IPTV](https://github.com/Free-TV/IPTV) - Free-to-air TV playlists

### IPTV Aggregators
- [IPTV Cat - Africa](https://iptvcat.net/africa/3)
- [IPTV Cat - Senegal](https://iptvcat.org/senegal)
- [M3U8 Player](https://m3u8-player.net/)
- [IPTV Player Stream](https://iptvplayer.stream/)

### Official Services
- [Canal+ Afrique](https://www.canalplus-afrique.com/)
- [Canal+ France](https://www.canalplus.com/)
- [CanalSat Afrique](https://www.canalsatafrique.com/)
- [Live Soccer TV - Canal+ Sport Africa](https://www.livesoccertv.com/channels/canal-plus-sport-africa/)

### Legitimate African Alternatives
- [AfrikaSTV](https://roku.afrikastv.com/)
- [AVO TV](https://www.avo.tv/)
- [Squid TV](https://www.squidtv.net/africa/)

---

## 9. RECOMMENDATIONS

### For Legitimate Viewing (Recommended)
1. Subscribe to Canal+ directly: https://www.canalplus.com/
2. Use CanalSat Afrique for West African coverage
3. Check authorized regional IPTV providers with proper licensing
4. Use legitimate African streaming services (AfrikaSTV, AVO TV)

### If Using Free Streams (Use At Own Risk)
1. **Confirmed Working**: Canal+ En Clair streams via Paradise-91 ParaTV
2. **M3U8 URLs**: Both canalplusclair-hd.m3u8 and canalplus-dm.m3u8 documented above
3. **Quality Options**: Available from 240p to 1080p (adjust based on connection)
4. **Legal Disclaimer**: Verify legality in your jurisdiction before use

### For IPTV Playlist Integration
- Add Paradise-91 ParaTV main playlist: `https://raw.githubusercontent.com/Paradise-91/ParaTV/main/playlists/paratv/main/paratv.m3u`
- Add Free-TV France playlist: `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_france.m3u8`
- Use VLC Media Player or compatible IPTV app (Kodi, IPTV Smarters, etc.)

---

## CONCLUSION

Research found **2 confirmed free M3U8 streams** for Canal+ En Clair (free-to-air offering) but **no publicly accessible streams for premium Canal+ channels** (Sport, Cinema, Guinée service).

Canal+ Sport (Afrique) and Canal+ Guinée are premium services requiring subscription. Free alternatives and IPTV aggregators exist but carry legal/licensing uncertainties.

**Best Path**: Subscribe to official Canal+ or CanalSat Afrique for reliable, legal access to all content.

---

*Report generated: February 27, 2026*
*Research method: Web search + GitHub repository analysis*
*Status: COMPLETE*
