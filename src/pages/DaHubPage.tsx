/**
 * DaHubPage — Tivi+ social hub.
 *
 * Faithful port of voyo-music's official DaHub (Dahub.tsx), suited to
 * Tivi+ and wired to REAL Tivi+ data:
 *  - ProfileCard + MY PASS use the member identity from useAuth()
 *    (customerName / tier / code / expires).
 *  - Friends + Messages tabs hit the live social RPCs via dahub-api
 *    (the member's access `code` is their social-graph id, best-effort).
 *  - DASH tab shows the real Tivi+ pricing + WhatsApp support/request.
 *
 * The music-player coupling from Voyo (miniPlayerActive / currentTrack)
 * is stripped — Tivi+ has no music player, so those are safe constants.
 * Renders inside the existing app shell (bottom nav + header stay).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users, MessageCircle, UserPlus, Check, Loader2, Clock, Plus,
  ChevronRight, Search, Zap, Bell, CreditCard, BadgeCheck, Tv,
} from 'lucide-react';
import {
  friendsAPI, messagesAPI, presenceAPI,
  APP_CODES, getAppDisplay,
  type Friend, type Conversation, type SharedAccountMember,
} from '@/lib/dahub/dahub-api';
import { DirectMessageChat } from '@/components/dahub/DirectMessageChat';
import { useBackGuard } from '@/hooks/useBackGuard';
import { VoyoCloseX } from '@/components/ui/VoyoCloseX';
import { useAuth } from '@/hooks/useAuth';

const WA_NUMBER = '224611361300';

// ==============================================
// CONSTANTS & HELPERS
// ==============================================

const SERVICE_COLORS: Record<string, string> = {
  netflix: '#E50914',
  spotify: '#1DB954',
  prime: '#00A8E1',
  'tivi+': '#9D4EDD',
  iptv: '#8B5CF6',
};

function getServiceColor(name: string): string {
  return SERVICE_COLORS[name.toLowerCase()] || '#8B5CF6';
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getAppIcon(appCode: string | null, size = 14) {
  const iconProps = { size, strokeWidth: 2.5 };
  return <Tv {...iconProps} />;
}

// Friendly tier label
function tierLabel(tier: string): string {
  const t = (tier || '').toLowerCase();
  if (t.includes('full')) return 'Full';
  if (t.includes('weekly') || t.includes('week')) return 'Weekly';
  if (t.includes('starter') || t.includes('basic')) return 'Starter';
  return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Member';
}

type Tab = 'friends' | 'messages' | 'dash';

// ==============================================
// PROFILE CARD — member identity from useAuth
// ==============================================

function ProfileCard({
  userName,
  coreId,
  totalFriends,
  onlineFriends,
  onAddFriend,
}: {
  userName: string;
  coreId: string;
  totalFriends: number;
  onlineFriends: Friend[];
  onAddFriend: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showFriendCount, setShowFriendCount] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(coreId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardTap = () => {
    if (showLive) {
      setShowLive(false);
      setShowFriendCount(false);
    } else if (showFriendCount) {
      setShowLive(true);
    } else {
      setShowFriendCount(true);
    }
  };

  const onlineCount = onlineFriends.length;

  return (
    <div className="px-6 pt-2 pb-6">
      <div
        className="relative flex items-center gap-5 p-6 rounded-3xl border border-white/[0.08] overflow-hidden cursor-pointer transition-transform active:scale-[0.98] animate-voyo-fade-in"
        onClick={handleCardTap}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.08) 45%, rgba(212,160,83,0.12) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/[0.04] to-[#D4A053]/[0.04] blur-2xl" />

        {!showLive && (
          <div key="id-card" className="flex items-center gap-5 w-full z-10 animate-voyo-fade-in">
            <div className="relative flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white ring-2 ring-white/[0.1]">
                {getInitials(userName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-green-500 border-[3px] border-[#0a0a0f]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-lg mb-1 truncate">{userName}</p>
              <button onClick={handleCopy} className="flex items-center gap-2 group">
                <span className="text-white/45 text-xs font-mono">{coreId}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                  copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 group-hover:bg-white/10'
                }`}>
                  {copied ? '✓' : 'Copy'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {showFriendCount && (
                <div className="text-center animate-voyo-scale-in">
                  <p className="text-white font-bold text-xl">{totalFriends}</p>
                  <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Friends</p>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onAddFriend(); }}
                className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-500/30 transition-all active:scale-95"
                aria-label="Add friend"
              >
                <UserPlus size={20} />
              </button>
            </div>

            {!showFriendCount && (
              <span className="absolute top-3 right-3 text-white/15 text-[9px]">tap</span>
            )}
          </div>
        )}

        {showLive && (
          <div key="live" className="flex items-center gap-5 w-full z-10 animate-voyo-fade-in">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(ellipse at 40% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, rgba(212, 160, 83, 0.25) 0%, transparent 50%)',
              }}
            />
            <div className="relative flex-shrink-0" style={{ width: '84px', height: '84px' }}>
              <div
                className="absolute inset-0 rounded-full border-2 border-white/15"
                style={{ animation: 'voyo-ambient-pulse 2.5s ease-in-out infinite' }}
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-white shadow-xl">
                    {onlineCount > 0 ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-[#D4A053] flex items-center justify-center text-base text-white font-bold">
                        {getInitials(onlineFriends[0]?.name || '?')}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white/30" />
                      </div>
                    )}
                  </div>
                  {onlineCount > 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
              </div>
              {onlineFriends.slice(1, 4).map((friend, i) => {
                const angles = [-50, 50, 180];
                const angle = angles[i] * (Math.PI / 180);
                const radius = 32;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <div
                    key={friend.dash_id}
                    className="absolute w-8 h-8 rounded-full overflow-hidden border-2 border-white/90 shadow-lg animate-voyo-pop-in"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      zIndex: 10 - i,
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-[#D4A053] flex items-center justify-center text-[9px] text-white font-bold">
                      {getInitials(friend.name)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
                <h3 className="text-white font-bold text-xl leading-tight">
                  {onlineCount > 0 ? 'Oyé! We Live' : 'No One Live'}
                </h3>
              </div>
              <p className="text-white/55 text-sm">
                {onlineCount === 0
                  ? 'Check back soon'
                  : `${onlineCount} friend${onlineCount !== 1 ? 's' : ''} Online`}
              </p>
            </div>

            {onlineCount > 0 && (
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95">
                <Users className="w-5 h-5 text-green-400" />
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${!showLive ? 'bg-white/60' : 'bg-white/20'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${showLive ? 'bg-white/60' : 'bg-white/20'}`} />
        </div>
      </div>
    </div>
  );
}

// ==============================================
// MY PASS CARD — the real subscription (priority)
// ==============================================

function MyPassCard({
  customerName,
  tier,
  expires,
  code,
}: {
  customerName: string;
  tier: string;
  expires: string;
  code: string;
}) {
  const greeting = customerName ? `Hi ${customerName.split(' ')[0]}` : 'Hi there';
  const isGuest = (tier || '').toLowerCase() === 'guest';
  const label = tierLabel(tier);

  // ── Guest (valid id+pin, no active entitlement) → activation upsell.
  if (isGuest) {
    const activateMsg = encodeURIComponent(
      `Hi DASH! I'd like to activate my Tivi+ pass. ` +
      `${customerName ? `Name: ${customerName}. ` : ''}` +
      `${code ? `DASH ID: ${code}.` : ''}`,
    );
    return (
      <div className="px-6 pb-6">
        <div
          className="relative rounded-3xl border border-white/[0.08] overflow-hidden p-6 animate-voyo-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.08) 45%, rgba(212,160,83,0.12) 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/[0.04] to-[#D4A053]/[0.04] blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/55 text-xs font-semibold uppercase tracking-wider mb-1">My Pass</p>
                <p className="text-white font-bold text-xl leading-tight truncate">{greeting}</p>
              </div>
              <div
                className="px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' }}
              >
                <Clock size={13} className="text-amber-300" />
                <span className="text-amber-200 text-xs font-bold">No active pass</span>
              </div>
            </div>

            <p className="text-white/55 text-[13px] leading-relaxed mt-4">
              Your DASH ID is recognized, but you don&apos;t have an active Tivi+ pass yet.
              Activate to unlock World Cup, EPL, UCL, movies &amp; premium channels.
            </p>

            <a
              href={`https://wa.me/${WA_NUMBER}?text=${activateMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
            >
              <CreditCard size={18} />
              <span>Activate your pass</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const expiryDate = expires ? new Date(expires) : null;
  const validExpiry = expiryDate && !isNaN(expiryDate.getTime());
  const daysLeft = validExpiry
    ? Math.ceil((expiryDate!.getTime() - Date.now()) / 86400000)
    : null;

  const expiryStr = validExpiry
    ? expiryDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const urgent = daysLeft != null && daysLeft <= 5;
  const accent = urgent ? '#f59e0b' : '#10b981';

  const renewMsg = encodeURIComponent(
    `Hi DASH! I'd like to renew my Tivi+ subscription. ` +
    `${customerName ? `Name: ${customerName}. ` : ''}` +
    `${code ? `Code: ${code}. ` : ''}` +
    `Plan: ${label}.`,
  );

  return (
    <div className="px-6 pb-6">
      <div
        className="relative rounded-3xl border border-white/[0.08] overflow-hidden p-6 animate-voyo-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.08) 45%, rgba(212,160,83,0.12) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/[0.04] to-[#D4A053]/[0.04] blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/55 text-xs font-semibold uppercase tracking-wider mb-1">My Pass</p>
              <p className="text-white font-bold text-xl leading-tight truncate">{greeting}</p>
            </div>
            <div
              className="px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0"
              style={{ background: 'rgba(157,78,221,0.18)', border: '1px solid rgba(157,78,221,0.35)' }}
            >
              <Tv size={13} className="text-purple-300" />
              <span className="text-purple-200 text-xs font-bold">Tivi+ {label}</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 mt-5">
            <div>
              <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Expires</p>
              <p className="text-white font-semibold text-[15px]">{expiryStr}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Days left</p>
              <p className="font-bold text-2xl" style={{ color: daysLeft != null ? accent : 'rgba(255,255,255,0.85)' }}>
                {daysLeft != null ? Math.max(0, daysLeft) : '—'}
              </p>
            </div>
          </div>

          {urgent && (
            <div
              className="mt-4 px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-2"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}
            >
              <Clock size={14} />
              {daysLeft != null && daysLeft <= 0 ? 'Your pass has expired — renew to keep watching.' : 'Your pass expires soon — renew now to avoid interruption.'}
            </div>
          )}

          <a
            href={`https://wa.me/${WA_NUMBER}?text=${renewMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
          >
            <CreditCard size={18} />
            <span>{urgent ? 'Renew now' : 'Renew / Request'}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ==============================================
// FOLLOWING SECTION — DASH services
// ==============================================

const FOLLOWING_DATA = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', verified: true },
  { id: 'spotify', name: 'Spotify', color: '#1DB954', verified: true },
  { id: 'prime', name: 'Prime', color: '#00A8E1', verified: true },
  { id: 'tivi', name: 'Tivi+', color: '#9D4EDD', verified: true, isLive: true },
  { id: 'iptv', name: 'IPTV', color: '#8B5CF6', verified: false },
];

function FollowingSection() {
  return (
    <div className="px-6 pt-2 pb-6">
      <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-4 text-center">Following</p>
      <div className="flex justify-center">
        <div className="w-full max-w-[420px] overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 py-1 px-2 justify-center">
            {FOLLOWING_DATA.map((svc) => (
              <button key={svc.id} className="flex-shrink-0 transition-transform active:scale-95">
                <div className={`relative w-20 h-20 rounded-2xl overflow-hidden ${svc.isLive ? 'ring-2 ring-red-500' : 'ring-1 ring-white/10'}`}>
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(155deg, ${svc.color}55 0%, ${svc.color}22 45%, rgba(10,10,15,0.95) 100%)` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-black text-2xl drop-shadow" style={{ opacity: 0.9 }}>
                      {svc.name[0]}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <p className="absolute bottom-1.5 left-0 right-0 text-center text-white text-[10px] font-semibold truncate px-1">
                    {svc.name}
                  </p>
                  {svc.verified && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <BadgeCheck className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {svc.isLive && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-red-500 text-[8px] font-bold text-white">
                      LIVE
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================
// TAB BAR
// ==============================================

function TabBar({
  activeTab,
  onTabChange,
  friendCount,
  unreadCount,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  friendCount: number;
  unreadCount: number;
}) {
  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number; color?: string }[] = [
    { id: 'friends', label: 'Friends', icon: Users, badge: friendCount || undefined },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadCount || undefined },
    { id: 'dash', label: 'DASH', icon: Zap, color: '#8B5CF6' },
  ];

  return (
    <div className="px-6 pt-2 pb-5">
      <div className="flex gap-2 p-2 bg-white/[0.03] rounded-2xl border border-white/[0.04]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-medium text-[15px] transition-all active:scale-[0.98] min-h-[48px] ${
                isActive ? 'text-white' : 'text-white/45 hover:text-white/65'
              }`}
            >
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl border border-purple-500/30"
                  style={{
                    background: 'linear-gradient(90deg, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.32) 50%, rgba(212,160,83,0.22) 100%)',
                  }}
                />
              )}
              <Icon
                size={17}
                className="relative z-10"
                style={tab.color ? { color: isActive ? tab.color : undefined } : {}}
              />
              <span className="relative z-10">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="relative z-10 min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center bg-purple-500 text-white">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================
// FRIEND ITEM
// ==============================================

function FriendItem({ friend, onClick }: { friend: Friend; onClick: () => void }) {
  const isOnline = friend.status === 'online';
  const appDisplay = getAppDisplay(friend.current_app);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all group active:scale-[0.98] min-h-[80px]"
    >
      <div className="relative flex-shrink-0">
        <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-semibold text-white bg-gradient-to-br from-purple-500/60 to-violet-600/60 ${!isOnline ? 'opacity-50' : ''}`}>
          <span className="text-base">{getInitials(friend.name)}</span>
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0a0a0f] ${
          friend.status === 'online' ? 'bg-green-500' :
          friend.status === 'away' ? 'bg-amber-500' : 'bg-white/20'
        }`} />
        {friend.current_app && isOnline && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg"
            style={{ background: appDisplay.color }}
          >
            {getAppIcon(friend.current_app, 10)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <p className={`font-semibold text-[15px] ${isOnline ? 'text-white' : 'text-white/55'}`}>
          {friend.nickname || friend.name}
        </p>
        <p className={`text-sm truncate mt-0.5 ${isOnline ? 'text-white/45' : 'text-white/30'}`}>
          {isOnline && friend.activity
            ? friend.activity
            : isOnline
              ? 'Online'
              : `Last seen ${formatTimeAgo(friend.last_seen)}`}
        </p>
      </div>

      <ChevronRight size={20} className="text-white/20 group-hover:text-white/40 transition-colors" />
    </button>
  );
}

// ==============================================
// MESSAGE ITEM
// ==============================================

function MessageItem({ convo, onClick }: { convo: Conversation; onClick: () => void }) {
  const hasUnread = convo.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] min-h-[80px] ${
        hasUnread ? 'bg-purple-500/[0.08]' : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-semibold text-white bg-gradient-to-br from-purple-500/60 to-violet-600/60">
          <span className="text-base">{getInitials(convo.friend_name)}</span>
        </div>
        {convo.is_online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0a0a0f]" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={`font-semibold text-[15px] truncate ${hasUnread ? 'text-white' : 'text-white/75'}`}>
            {convo.friend_name}
          </p>
          <span className="text-white/35 text-[11px] flex-shrink-0">
            {formatTimeAgo(convo.last_message_time)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {convo.sent_from && (
            <span
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: getAppDisplay(convo.sent_from).color + '25' }}
            >
              {getAppIcon(convo.sent_from, 10)}
            </span>
          )}
          <p className={`text-sm truncate ${hasUnread ? 'text-white/65 font-medium' : 'text-white/40'}`}>
            {convo.last_message}
          </p>
        </div>
      </div>

      {hasUnread && (
        <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
          <span className="text-white text-xs font-bold">
            {convo.unread_count > 9 ? '9+' : convo.unread_count}
          </span>
        </div>
      )}
    </button>
  );
}

// ==============================================
// DASH MEMBER ITEM
// ==============================================

function DashMemberItem({
  member,
  onConnect,
  isConnecting,
}: {
  member: SharedAccountMember;
  onConnect: () => void;
  isConnecting: boolean;
}) {
  const sharedServices = member.shared_services.slice(0, 3);

  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-voyo-fade-in">
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-semibold text-white bg-gradient-to-br from-white/10 to-white/5 opacity-55">
          <span className="text-base">{getInitials(member.name)}</span>
        </div>
        <div className="absolute -bottom-1 -right-1 flex opacity-90">
          {[...sharedServices].reverse().map((service, reverseIdx) => {
            const idx = sharedServices.length - 1 - reverseIdx;
            const offset = idx * 10;
            return (
              <div
                key={service.account_id || idx}
                className="absolute w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-lg border-2 border-[#0a0a0f]"
                style={{
                  background: getServiceColor(service.service_name),
                  right: offset,
                  zIndex: sharedServices.length - idx,
                }}
                title={service.service_name}
              >
                {service.service_name[0]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-white/85 font-medium text-[15px] truncate leading-tight">{member.name}</p>
        {sharedServices.length > 0 ? (
          <p className="text-[11px] truncate opacity-70 mt-1">
            <span className="font-bold" style={{ color: getServiceColor(sharedServices[0].service_name) }}>
              {sharedServices[0].service_name}
            </span>
            <span className="text-white/50"> member</span>
          </p>
        ) : (
          <p className="text-[11px] opacity-70 mt-1 text-white/50">DASH member</p>
        )}
      </div>

      {member.friend_status === 'pending' ? (
        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock size={13} />
          <span className="text-xs font-medium">Pending</span>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/20 transition-all disabled:opacity-50 active:scale-95 min-h-[36px]"
        >
          {isConnecting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <>
              <Plus size={13} />
              <span className="text-xs font-medium">Connect</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ==============================================
// ADD FRIEND MODAL
// ==============================================

function AddFriendModal({ userId, onClose, onAdded }: { userId: string; onClose: () => void; onAdded: () => void }) {
  const [friendId, setFriendId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  useBackGuard(true, onClose, 'dahub-add-friend');

  const handleAdd = async () => {
    if (!friendId.trim()) return;
    const id = friendId.trim().toUpperCase();
    if (id === userId) { setError("Can't add yourself"); setStatus('error'); return; }

    setStatus('loading');
    const success = await friendsAPI.addFriend(userId, id);
    if (success) {
      setStatus('success');
      setTimeout(() => { onAdded(); onClose(); }, 1000);
    } else {
      setError('User not found');
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-voyo-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#12121a] rounded-3xl p-7 shadow-2xl border border-white/10 animate-voyo-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">Add Friend</h2>
          <VoyoCloseX onClose={onClose} size="md" className="-mr-1" />
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-voyo-pop-in">
              <Check size={36} className="text-green-500" />
            </div>
            <p className="text-white font-semibold text-base">Request Sent!</p>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text" value={friendId}
                onChange={(e) => { setFriendId(e.target.value.toUpperCase()); setStatus('idle'); setError(''); }}
                placeholder="Enter DASH ID"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-purple-500/50 font-mono text-lg tracking-wider"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={!friendId.trim() || status === 'loading'}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                !friendId.trim() || status === 'loading'
                  ? 'bg-white/10 text-white/40'
                  : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30'
              }`}
            >
              {status === 'loading' ? <Loader2 size={20} className="animate-spin" /> : <><UserPlus size={20} /><span>Send Request</span></>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ==============================================
// DASH TAB — Support + real Tivi+ pricing
// ==============================================

const PRICING = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'LE100',
    color: '#9D4EDD',
    perks: 'Kids · Local · News · Basic Sports',
  },
  {
    id: 'full',
    name: 'Full',
    price: 'LE245',
    color: '#E50914',
    featured: true,
    perks: 'World Cup · EPL · UCL · Movies · Series · Premium',
  },
  {
    id: 'weekly',
    name: 'Weekly',
    price: 'LE50',
    color: '#00A8E1',
    perks: '7-day pass · all Full channels',
  },
];

function PricingCard({ plan }: { plan: typeof PRICING[number] }) {
  const msg = encodeURIComponent(`Hi DASH! I'd like the Tivi+ ${plan.name} plan (${plan.price}).`);
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative rounded-2xl overflow-hidden border transition-all active:scale-[0.98]"
      style={{
        background: `linear-gradient(150deg, ${plan.color}1f 0%, ${plan.color}10 40%, rgba(10,10,15,0.6) 100%)`,
        borderColor: plan.featured ? `${plan.color}55` : 'rgba(255,255,255,0.06)',
      }}
    >
      {plan.featured && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ background: plan.color, color: '#fff' }}
        >
          Most popular
        </div>
      )}
      <div className="p-5">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-white font-bold text-lg">{plan.name}</span>
          <span className="font-extrabold text-xl" style={{ color: plan.color }}>{plan.price}</span>
        </div>
        <p className="text-white/45 text-[12px] leading-relaxed">{plan.perks}</p>
        <div className="flex items-center gap-1.5 mt-3 text-[12px] font-medium" style={{ color: plan.color }}>
          <span>Get this plan</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </a>
  );
}

// ==============================================
// MAIN PAGE
// ==============================================

export function DaHubPage() {
  const { customerName, tier, code, coreId, expires } = useAuth();

  // Social-graph identity = the member's DASH ID (core_id, e.g. "001AA").
  // This is the PUBLIC shareable id — never the secret PIN/access code.
  // Falls back to the access code for legacy DASH-XXXX sessions.
  const userId = coreId || code || '';
  const userName = customerName || 'Guest';

  const [activeTab, setActiveTab] = useState<Tab>('dash');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sharedMembers, setSharedMembers] = useState<SharedAccountMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const [activeChat, setActiveChat] = useState<{ friendId: string; friendName: string; friendAvatar?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const onlineCount = friends.filter((f) => f.status === 'online').length;
  const suggestions = sharedMembers.filter((m) => m.friend_status !== 'accepted');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    if (!userId) {
      setFriends([]);
      setSharedMembers([]);
      setConversations([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    const [friendsRes, sharedRes, convosRes, unreadRes] = await Promise.allSettled([
      friendsAPI.getFriends(userId),
      friendsAPI.getSharedAccountMembers(userId),
      messagesAPI.getConversations(userId),
      messagesAPI.getUnreadCount(userId),
    ]);
    if (friendsRes.status === 'fulfilled') setFriends(friendsRes.value);
    if (sharedRes.status === 'fulfilled') setSharedMembers(sharedRes.value);
    if (convosRes.status === 'fulfilled') setConversations(convosRes.value);
    if (unreadRes.status === 'fulfilled') setUnreadCount(unreadRes.value);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
    let unsubscribe: (() => void) | null = null;
    if (userId) {
      try {
        presenceAPI.updatePresence(userId, 'online', APP_CODES.TV_PLUS);
        unsubscribe = messagesAPI.subscribeToMessages(userId, (msg) => {
          setConversations((prev) => {
            const existing = prev.find((c) => c.friend_id === msg.from_id);
            if (existing) {
              return prev.map((c) => c.friend_id === msg.from_id
                ? { ...c, last_message: msg.message, last_message_time: msg.created_at, unread_count: c.unread_count + 1 }
                : c);
            }
            return prev;
          });
          setUnreadCount((c) => c + 1);
        });
      } catch { /* social backend unreachable — UI degrades to empty */ }
    }
    return () => {
      try { unsubscribe?.(); } catch { /* noop */ }
      try { if (userId) presenceAPI.updatePresence(userId, 'offline', APP_CODES.TV_PLUS); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleConnect = async (member: SharedAccountMember) => {
    setConnectingId(member.dash_id);
    const success = await friendsAPI.addFriend(userId, member.dash_id);
    if (success) {
      setSharedMembers((prev) => prev.map((m) =>
        m.dash_id === member.dash_id ? { ...m, friend_status: 'pending' as const } : m));
    }
    setConnectingId(null);
  };

  return (
    <div
      className="relative min-h-screen pt-2 pb-32"
      style={{ background: 'transparent' }}
    >
      {/* Atmospheric layers */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-64 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(28,18,8,0.42) 0%, rgba(20,12,6,0.18) 28%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-6 pb-4 z-10 pt-14">
        <div className="flex items-center gap-3">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #D4A053 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            DaHub
          </h1>
          <span
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: 'rgba(212,160,83,0.12)',
              border: '1px solid rgba(212,160,83,0.28)',
              color: '#E6C58A',
            }}
          >
            Tivi+
          </span>
        </div>
      </div>

      {/* Profile Card — member identity */}
      <ProfileCard
        userName={userName}
        coreId={userId || 'Guest'}
        totalFriends={friends.length}
        onlineFriends={friends.filter((f) => f.status === 'online')}
        onAddFriend={() => setShowAddFriend(true)}
      />

      {/* MY PASS — the real subscription (priority) */}
      <MyPassCard customerName={customerName} tier={tier} expires={expires} code={code} />

      {/* Following — DASH services */}
      <FollowingSection />

      {/* Sticky tab bar */}
      <div
        className="sticky z-20"
        style={{
          top: 'max(0px, env(safe-area-inset-top, 0px))',
          background: 'linear-gradient(to bottom, #08080a 0%, #08080a 70%, rgba(8,8,10,0.85) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} friendCount={onlineCount} unreadCount={unreadCount} />
      </div>

      {/* Content */}
      <div className="px-6 relative z-10">
        {activeTab === 'friends' && (
          <div key="friends" className="space-y-1 animate-voyo-fade-in">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: '#D4A053' }} />
              </div>
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Users size={32} className="text-white/20" />
                </div>
                <p className="text-white/55 font-medium mb-1 text-base">No friends yet</p>
                <p className="text-white/30 text-sm">Add friends with their DASH ID</p>
              </div>
            ) : (
              friends.map((friend) => (
                <FriendItem
                  key={friend.dash_id}
                  friend={friend}
                  onClick={() => setActiveChat({ friendId: friend.dash_id, friendName: friend.name, friendAvatar: friend.avatar })}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div key="messages" className="space-y-1 animate-voyo-fade-in">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: '#D4A053' }} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <MessageCircle size={32} className="text-white/20" />
                </div>
                <p className="text-white/55 font-medium mb-1 text-base">No messages yet</p>
                <p className="text-white/30 text-sm">Start a conversation with a friend</p>
              </div>
            ) : (
              conversations.map((convo) => (
                <MessageItem
                  key={convo.friend_id}
                  convo={convo}
                  onClick={() => setActiveChat({ friendId: convo.friend_id, friendName: convo.friend_name, friendAvatar: convo.friend_avatar })}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'dash' && (
          <div key="dash" className="space-y-8 animate-voyo-fade-in">
            {/* Pricing — real Tivi+ tiers */}
            <div>
              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-4">Tivi+ Plans</p>
              <div className="space-y-3">
                {PRICING.map((plan) => (
                  <PricingCard key={plan.id} plan={plan} />
                ))}
              </div>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi DASH! I want to request another subscription (Netflix / Spotify / Prime / Tivi+).')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all active:scale-[0.98] min-h-[72px]"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#8B5CF615' }}>
                  <Plus size={22} style={{ color: '#8B5CF6' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white/85 font-medium text-[15px]">Request another subscription</p>
                  <p className="text-white/35 text-sm mt-0.5">Netflix · Spotify · Prime · Tivi+</p>
                </div>
                <ChevronRight size={20} className="text-white/25" />
              </a>
            </div>

            {/* Support */}
            <div>
              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-4">Support &amp; Updates</p>
              <div className="space-y-2.5">
                <button
                  onClick={() => setShowSupportMenu(!showSupportMenu)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all active:scale-[0.98] min-h-[76px]"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#FBBF2415' }}>
                    <Zap size={24} style={{ color: '#FBBF24' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white/85 font-medium text-[15px]">DASH Support</p>
                    <p className="text-white/35 text-sm mt-0.5">Get help anytime</p>
                  </div>
                  <div className="transition-transform" style={{ transform: showSupportMenu ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    <ChevronRight size={20} className="text-white/25" />
                  </div>
                </button>

                {showSupportMenu && (
                  <div className="overflow-hidden animate-voyo-fade-in">
                    <div className="pl-4 space-y-2.5 pb-2">
                      <a
                        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi DASH! I need help with my Tivi+ account.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 hover:bg-emerald-500/10 transition-all active:scale-[0.97] min-h-[60px]"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
                          <span className="text-emerald-400 font-bold text-sm">WA</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white/85 text-sm font-medium">DASH on WhatsApp</p>
                          <p className="text-white/35 text-xs mt-0.5">Support Agent · fastest</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </a>
                    </div>
                  </div>
                )}

                <button className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all active:scale-[0.98] min-h-[76px]">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#8B5CF615' }}>
                    <Bell size={24} style={{ color: '#8B5CF6' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white/85 font-medium text-[15px]">Announcements</p>
                    <p className="text-white/35 text-sm mt-0.5">Latest updates</p>
                  </div>
                  <ChevronRight size={20} className="text-white/25" />
                </button>
              </div>
            </div>

            {/* DASH Members (shared accounts) */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-4">DASH Members</p>
                <div className="space-y-2.5">
                  {suggestions.map((member) => (
                    <DashMemberItem
                      key={member.dash_id}
                      member={member}
                      onConnect={() => handleConnect(member)}
                      isConnecting={connectingId === member.dash_id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddFriend && (
        <AddFriendModal userId={userId} onClose={() => setShowAddFriend(false)} onAdded={loadData} />
      )}
      {activeChat && (
        <DirectMessageChat
          currentUserId={userId}
          currentUserName={userName}
          friendId={activeChat.friendId}
          friendName={activeChat.friendName}
          friendAvatar={activeChat.friendAvatar}
          onClose={() => { setActiveChat(null); loadData(); }}
        />
      )}
    </div>
  );
}

export default DaHubPage;
