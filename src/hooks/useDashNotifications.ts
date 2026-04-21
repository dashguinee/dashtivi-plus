/**
 * useDashNotifications — realtime subscription to the shared
 * `dash_notifications` table in the Command Center Supabase.
 *
 * Filters to this app's audience:
 *   - `app` is 'all' OR matches `appCode` ('tivi')
 *   - `target_user` is null (broadcast) OR equals the current dashId
 *   - `status = 'sent'`
 *
 * Returns the latest 20 matching rows plus `markRead(id)`. Read state
 * is sessionStorage-backed (no per-recipient server tracking yet).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface DashNotification {
  id: string;
  app: string;
  title: string;
  body: string;
  url: string | null;
  target_tags: string[] | null;
  target_user: string | null;
  sent_by: string | null;
  sent_at: string;
  status: string;
  read?: boolean;
}

interface Options {
  appCode: 'voyo' | 'hub' | 'giraf' | 'tivi' | string;
  dashId?: string | null;
  limit?: number;
}

const READ_KEY = (id: string) => `dn-read:${id}`;
function isReadLocally(id: string): boolean {
  try { return sessionStorage.getItem(READ_KEY(id)) === '1'; } catch { return false; }
}
function markReadLocally(id: string): void {
  try { sessionStorage.setItem(READ_KEY(id), '1'); } catch { /* noop */ }
}

function matchesAudience(
  row: DashNotification,
  appCode: string,
  dashId: string | null | undefined,
): boolean {
  if (row.app !== 'all' && row.app !== appCode) return false;
  if (row.status && row.status !== 'sent') return false;
  if (row.target_user && row.target_user !== dashId) return false;
  return true;
}

export function useDashNotifications({ appCode, dashId, limit = 20 }: Options): {
  notifications: DashNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
} {
  const [notifications, setNotifications] = useState<DashNotification[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('dash_notifications')
          .select('*')
          .in('app', ['all', appCode])
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(limit);
        if (cancelled) return;
        if (error) { console.warn('[DashNotifications] fetch error:', error.message); return; }
        const rows = (data || [])
          .filter((r: DashNotification) => matchesAudience(r, appCode, dashId))
          .map((r: DashNotification) => ({ ...r, read: isReadLocally(r.id) }));
        setNotifications(rows);
      } catch (e) {
        console.warn('[DashNotifications] fetch exception:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [appCode, dashId, limit]);

  useEffect(() => {
    if (!supabase) return;
    // supabase-js 2.104+ tightened the .on() overload types; the
    // realtime event strings are accepted at runtime but the TS
    // overload resolution misfires, so we cast the .on() handler.
    const channel = (supabase.channel(`dash_notifications:${appCode}`) as any)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dash_notifications' },
        (payload: { new?: DashNotification }) => {
          const row = payload.new;
          if (!row) return;
          if (!matchesAudience(row, appCode, dashId)) return;
          setNotifications(prev => {
            if (prev.some(p => p.id === row.id)) return prev;
            return [{ ...row, read: isReadLocally(row.id) }, ...prev].slice(0, limit);
          });
        },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [appCode, dashId, limit]);

  const markRead = useCallback((id: string) => {
    markReadLocally(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

  return { notifications, unreadCount, markRead };
}
