/**
 * DAHUB API for Tivi+
 *
 * Adapted from voyo-music's dahub-api. Points at Tivi+'s existing
 * `supabase` client (project mclbbkmpovnvcfmwsoqt) — the SAME backend
 * that hosts the social RPCs (get_friends_with_presence, get_conversations,
 * add_friend, update_presence, etc.). No separate Command-Center client.
 *
 * The member's identity in the social graph is their access `code`
 * (e.g. DASH-XXXXXX) passed in as `userId`. Whether that code maps to a
 * row the RPCs recognise is best-effort — calls degrade to empty lists.
 */

import { getSupabase } from '../supabase';

// Lightweight dev-logging shims (voyo had dedicated logger utils).
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};
const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn(...args);
};

export const isDahubConfigured = true;

// ==============================================
// TYPES
// ==============================================

export interface Friend {
  dash_id: string;
  name: string;
  nickname?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  current_app: string | null;
  activity?: string;
  activity_data?: Record<string, unknown>;
  last_seen?: string;
}

export interface Message {
  id: string;
  from_id: string;
  to_id: string;
  message: string;
  sent_from?: string;
  attachment_type?: 'track' | 'channel' | 'link' | 'image' | 'file';
  attachment_data?: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  friend_id: string;
  friend_name: string;
  friend_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  sent_from?: string;
  is_online: boolean;
  current_app?: string;
}

export interface UserPresence {
  core_id: string;
  status: 'online' | 'offline' | 'away';
  current_app: string | null;
  activity: string | null;
  activity_data: Record<string, unknown> | null;
  last_seen: string;
}

// Shared account member (people on same Netflix/Spotify/Prime accounts)
export interface SharedService {
  service_type: string;
  account_id: string;
  service_name: string;
  service_color: string;
  service_icon: string;
}

export interface SharedAccountMember {
  dash_id: string;
  name: string;
  avatar?: string;
  shared_services: SharedService[];
  friend_status: 'suggested' | 'pending' | 'accepted';
  status?: 'online' | 'offline' | 'away';
  current_app?: string | null;
  activity?: string;
}

// Service display info
export const SERVICE_DISPLAY: Record<string, { name: string; color: string; icon: string }> = {
  NF: { name: 'Netflix', color: '#E50914', icon: 'netflix' },
  SP: { name: 'Spotify', color: '#1DB954', icon: 'spotify' },
  AP: { name: 'Prime', color: '#00A8E1', icon: 'prime' },
  CL: { name: 'Claude', color: '#D97757', icon: 'claude' },
  GP: { name: 'ChatGPT', color: '#10A37F', icon: 'chatgpt' },
  YT: { name: 'YouTube', color: '#FF0000', icon: 'youtube' },
  DP: { name: 'Disney+', color: '#113CCF', icon: 'disney' },
};

// App codes — Tivi+ is the TV+ surface.
export const APP_CODES = {
  COMMAND_CENTER: 'CC',
  VOYO: 'V',
  DASH_EDU: 'E',
  TV_PLUS: 'TV',
  DA_CLUB: 'DC',
  DASH_FASHION: 'DF',
  DASH_TRAVEL: 'DT',
} as const;

export type AppCode = typeof APP_CODES[keyof typeof APP_CODES];

// ==============================================
// FRIENDS API
// ==============================================

export const friendsAPI = {
  async getFriends(userId: string, appFilter?: AppCode): Promise<Friend[]> {
    if (!userId) return [];
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.rpc('get_friends_with_presence', {
        p_user_id: userId,
      });

      if (!error && data?.length) {
        let friends: Friend[] = data.map((row: Record<string, unknown>) => ({
          dash_id: (row.friend_id as string),
          name: (row.full_name as string) || (row.friend_id as string),
          nickname: row.nickname as string | undefined,
          avatar: undefined,
          status: (row.status as Friend['status']) || 'offline',
          current_app: (row.current_app as string) ?? null,
          activity: row.activity as string | undefined,
          activity_data: undefined,
          last_seen: row.last_seen as string | undefined,
        }));

        if (appFilter && appFilter !== APP_CODES.COMMAND_CENTER) {
          friends = friends.filter((f) => f.current_app === appFilter);
        }
        return friends;
      }

      // Fall back to shared-account members treated as friends.
      const sharedMembers = await this.getSharedAccountMembers(userId);
      let friends: Friend[] = sharedMembers.map((m) => ({
        dash_id: m.dash_id,
        name: m.name,
        nickname: undefined,
        avatar: m.avatar,
        status: (m.status as Friend['status']) || 'offline',
        current_app: m.current_app || null,
        activity: m.activity,
        activity_data: undefined,
        last_seen: undefined,
      }));
      if (appFilter && appFilter !== APP_CODES.COMMAND_CENTER) {
        friends = friends.filter((f) => f.current_app === appFilter);
      }
      return friends;
    } catch (err) {
      devWarn('[DAHUB] Failed to fetch friends:', err);
      return [];
    }
  },

  async addFriend(userId: string, friendId: string, nickname?: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.rpc('add_friend', {
        p_user_id: userId,
        p_friend_id: friendId,
        p_nickname: nickname || null,
      });
      return !error;
    } catch (err) {
      devWarn('[DAHUB] Failed to add friend:', err);
      return false;
    }
  },

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.rpc('remove_friend', {
        p_user_id: userId,
        p_friend_id: friendId,
      });
      return !error;
    } catch (err) {
      devWarn('[DAHUB] Failed to remove friend:', err);
      return false;
    }
  },

  async searchUsers(query: string): Promise<{ dash_id: string; name: string }[]> {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('core_id, full_name')
        .or(`core_id.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);
      if (error) return [];
      return (data || []).map((u: Record<string, unknown>) => ({
        dash_id: u.core_id as string,
        name: u.full_name as string,
      }));
    } catch (err) {
      devWarn('[DAHUB] Failed to search users:', err);
      return [];
    }
  },

  async getSharedAccountMembers(userId: string): Promise<SharedAccountMember[]> {
    if (!userId) return [];
    try {
      const supabase = await getSupabase();
      const { data: userServices, error: userServicesError } = await supabase
        .from('user_services')
        .select('account_id, service_type')
        .eq('core_id', userId);

      if (userServicesError || !userServices?.length) {
        devLog('[DAHUB] No shared accounts found for user');
        return [];
      }

      const accountIds = userServices
        .map((s: Record<string, unknown>) => s.account_id as string)
        .filter(Boolean);
      if (accountIds.length === 0) return [];

      const { data: sharedMembers, error: membersError } = await supabase
        .from('user_services')
        .select('core_id, account_id, service_type')
        .in('account_id', accountIds)
        .neq('core_id', userId);

      if (membersError || !sharedMembers?.length) return [];

      const memberCoreIds = [...new Set(sharedMembers.map((m: Record<string, unknown>) => m.core_id as string))];
      const { data: usersData } = await supabase
        .from('users')
        .select('core_id, full_name')
        .in('core_id', memberCoreIds);

      const usersMap = new Map(
        (usersData || []).map((u: Record<string, unknown>) => [u.core_id as string, u.full_name as string]),
      );

      const memberMap = new Map<string, SharedAccountMember>();
      for (const row of sharedMembers as Record<string, unknown>[]) {
        const memberId = row.core_id as string;
        const serviceType = row.service_type as string;
        const serviceInfo = SERVICE_DISPLAY[serviceType];

        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            dash_id: memberId,
            name: usersMap.get(memberId) || memberId,
            avatar: undefined,
            shared_services: [],
            friend_status: 'suggested',
            status: 'offline',
          });
        }

        if (serviceInfo) {
          const member = memberMap.get(memberId)!;
          if (!member.shared_services.find((s) => s.account_id === (row.account_id as string))) {
            member.shared_services.push({
              service_type: serviceType,
              account_id: row.account_id as string,
              service_name: serviceInfo.name,
              service_color: serviceInfo.color,
              service_icon: serviceInfo.icon,
            });
          }
        }
      }

      const memberIds = Array.from(memberMap.keys());
      if (memberIds.length > 0) {
        const { data: presenceData } = await supabase
          .from('user_presence')
          .select('core_id, status, current_app, activity')
          .in('core_id', memberIds);

        (presenceData || []).forEach((p: Record<string, unknown>) => {
          const member = memberMap.get(p.core_id as string);
          if (member) {
            member.status = (p.status as SharedAccountMember['status']) || 'offline';
            member.current_app = (p.current_app as string) ?? null;
            member.activity = p.activity as string | undefined;
          }
        });
      }

      return Array.from(memberMap.values());
    } catch (err) {
      devWarn('[DAHUB] Failed to get shared account members:', err);
      return [];
    }
  },
};

// ==============================================
// MESSAGES API
// ==============================================

export const messagesAPI = {
  async getConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.rpc('get_conversations', {
        p_user_id: userId,
      });
      if (error) {
        devWarn('[DAHUB] Error fetching conversations:', error);
        return [];
      }
      return (data || []).map((row: Record<string, unknown>) => ({
        friend_id: row.friend_id as string,
        friend_name: (row.friend_name as string) || (row.friend_id as string),
        friend_avatar: undefined,
        last_message: row.last_message as string,
        last_message_time: row.last_message_at as string,
        unread_count: Number(row.unread_count) || 0,
        sent_from: row.sent_from as string | undefined,
        is_online: false,
        current_app: undefined,
      }));
    } catch (err) {
      devWarn('[DAHUB] Failed to fetch conversations:', err);
      return [];
    }
  },

  async getMessages(user1: string, user2: string, limit = 50): Promise<Message[]> {
    if (!user1 || !user2) return [];
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.rpc('get_conversation', {
        p_user_1: user1,
        p_user_2: user2,
        p_limit: limit,
      });
      if (error) return [];
      return (data || []) as Message[];
    } catch (err) {
      devWarn('[DAHUB] Failed to fetch messages:', err);
      return [];
    }
  },

  async sendMessage(
    fromId: string,
    toId: string,
    message: string,
    sentFrom: AppCode = APP_CODES.TV_PLUS,
    attachment?: { type: string; data: Record<string, unknown> },
    senderName?: string,
  ): Promise<boolean> {
    if (!fromId || !toId) return false;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.from('messages').insert({
        from_id: fromId,
        to_id: toId,
        message: message.slice(0, 1000),
        sent_from: sentFrom,
        attachment_type: attachment?.type || null,
        attachment_data: attachment?.data || null,
      });
      if (error) return false;

      // Fire-and-forget notification for the recipient.
      void supabase
        .from('dash_notifications')
        .insert({
          app: 'all',
          title: senderName ? `${senderName} sent a message` : 'New message',
          body: message.slice(0, 140),
          url: '/?action=dahub',
          target_user: toId,
          sent_by: fromId,
          status: 'sent',
        })
        .then((res: { error?: { message?: string } | null }) => {
          if (res?.error) devWarn('[DAHUB] notification insert failed:', res.error.message);
        });

      return true;
    } catch (err) {
      devWarn('[DAHUB] Failed to send message:', err);
      return false;
    }
  },

  async markAsRead(userId: string, friendId: string): Promise<boolean> {
    if (!userId || !friendId) return false;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.rpc('mark_messages_read', {
        p_user_id: userId,
        p_friend_id: friendId,
      });
      return !error;
    } catch (err) {
      devWarn('[DAHUB] Failed to mark messages read:', err);
      return false;
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const supabase = await getSupabase();
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_id', userId)
        .is('read_at', null);
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  subscribeToMessages(userId: string, onMessage: (msg: Message) => void) {
    if (!userId) return () => {};
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sb: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    (async () => {
      try {
        const supabase = await getSupabase();
        if (cancelled) return;
        sb = supabase;
        channel = supabase
          .channel(`messages:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `to_id=eq.${userId}`,
            },
            (payload: { new: Message }) => {
              onMessage(payload.new);
            },
          )
          .subscribe();
      } catch { /* noop */ }
    })();
    return () => {
      cancelled = true;
      try { if (sb && channel) sb.removeChannel(channel); } catch { /* noop */ }
    };
  },
};

// ==============================================
// PRESENCE API
// ==============================================

export const presenceAPI = {
  async updatePresence(
    userId: string,
    status: 'online' | 'offline' | 'away',
    app: AppCode = APP_CODES.TV_PLUS,
    activity?: string,
    activityData?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!userId) return false;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.rpc('update_presence', {
        p_core_id: userId,
        p_status: status,
        p_app: app,
        p_activity: activity || null,
        p_activity_data: activityData || null,
      });
      return !error;
    } catch (err) {
      devWarn('[DAHUB] Failed to update presence:', err);
      return false;
    }
  },
};

// ==============================================
// APP DISPLAY HELPERS
// ==============================================

export const APP_DISPLAY = {
  CC: { name: 'Command Center', color: '#8b5cf6', icon: 'command' },
  V: { name: 'VOYO', color: '#a855f7', icon: 'music' },
  E: { name: 'DASH EDU', color: '#3b82f6', icon: 'graduation-cap' },
  TV: { name: 'TV+', color: '#9D4EDD', icon: 'tv' },
  DC: { name: 'DaClub', color: '#f97316', icon: 'users' },
  DF: { name: 'Fashion', color: '#ec4899', icon: 'shirt' },
  DT: { name: 'Travel', color: '#14b8a6', icon: 'plane' },
} as Record<string, { name: string; color: string; icon: string }>;

export function getAppDisplay(appCode: string | null) {
  return APP_DISPLAY[appCode || 'CC'] || APP_DISPLAY.CC;
}

export default {
  friends: friendsAPI,
  messages: messagesAPI,
  presence: presenceAPI,
  APP_CODES,
  APP_DISPLAY,
  SERVICE_DISPLAY,
  getAppDisplay,
};
