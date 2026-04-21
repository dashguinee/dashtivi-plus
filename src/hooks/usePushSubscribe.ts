/**
 * usePushSubscribe — opt into first-class Web Push on Tivi+.
 *
 * Writes into the shared dash_push_tokens table in the Command Center
 * Supabase (same project). Tivi+ has no dash_id in the access-code
 * model, so we use a stable device id derived from the endpoint.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const VAPID_KEY_RAW = ((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '').trim();

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function deviceId(endpoint: string): string {
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) {
    hash = ((hash << 5) - hash + endpoint.charCodeAt(i)) | 0;
  }
  return 'device-' + Math.abs(hash).toString(16).padStart(8, '0');
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushSubscribe(appCode: string = 'tivi', userId?: string | null) {
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && !!VAPID_KEY_RAW;

  const [permission, setPermission] = useState<PushPermission>(
    supported ? (Notification.permission as PushPermission) : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setIsSubscribed(!!sub);
    }).catch(() => { /* noop */ });
    return () => { cancelled = true; };
  }, [supported]);

  const request = useCallback(async (): Promise<'success' | 'denied' | 'failed'> => {
    if (!supported) { setLastError('Push not supported here'); return 'failed'; }
    setIsBusy(true);
    setLastError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== 'granted') { setLastError('Permission denied'); return 'denied'; }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY_RAW).buffer as ArrayBuffer,
        });
      }

      const tokenOwner = userId || deviceId(sub.endpoint);
      const { error } = await supabase.from('dash_push_tokens').upsert(
        {
          user_id: tokenOwner,
          app: appCode,
          subscription: sub.toJSON(),
          tags: [],
        },
        { onConflict: 'subscription' }
      );
      if (error) {
        console.warn('[Push] token upsert failed:', error.message);
        setLastError(error.message);
        return 'failed';
      }

      try {
        reg.showNotification('Alerts enabled', {
          body: 'You\'ll get drops and updates right here.',
          icon: '/icons/icon-192.png',
          tag: 'tivi-welcome',
        });
      } catch { /* noop */ }

      setIsSubscribed(true);
      return 'success';
    } catch (e: any) {
      console.warn('[Push] subscribe exception:', e);
      setLastError(e?.message || 'Subscribe failed');
      return 'failed';
    } finally {
      setIsBusy(false);
    }
  }, [appCode, userId, supported]);

  return { supported, permission, isSubscribed, isBusy, lastError, request };
}
