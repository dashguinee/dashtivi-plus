import { useState, useCallback } from 'react';
import { getItem, setItem, removeItem } from '@/lib/storage';

const SWITCH_THRESHOLD = 3;
const TIME_THRESHOLD_MIN = 20;
const DISMISSED_KEY = 'tivi_gate_dismissed'; // sessionStorage

export interface WatchGateState {
  isGated: boolean;
  canDismiss: boolean;
  hasAccount: boolean;
}

export function useWatchGate() {
  const [isGated, setIsGated] = useState(false);

  const hasAccount = getItem<boolean>('gate_account', false);

  const canDismiss = (() => {
    try { return !sessionStorage.getItem(DISMISSED_KEY); }
    catch { return true; }
  })();

  const recordSwitch = useCallback((): boolean => {
    // Permanent bypass for "registered" users
    if (getItem<boolean>('gate_account', false)) {
      return false;
    }

    // Increment switch count
    const switches = getItem<number>('gate_switches', 0) + 1;
    setItem('gate_switches', switches);

    // Set time start if first switch
    if (!getItem<number>('gate_time_start', 0)) {
      setItem('gate_time_start', Date.now());
    }

    // Check thresholds
    const timeStart = getItem<number>('gate_time_start', Date.now());
    const minutesWatched = (Date.now() - timeStart) / 60000;

    if (switches >= SWITCH_THRESHOLD || minutesWatched >= TIME_THRESHOLD_MIN) {
      setIsGated(true);
      return true;
    }

    return false;
  }, []);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISSED_KEY, 'true'); }
    catch { /* ignore */ }
    setIsGated(false);
  }, []);

  const createAccount = useCallback(() => {
    setItem('gate_account', true);
    removeItem('gate_switches');
    removeItem('gate_time_start');
    setIsGated(false);
  }, []);

  const subscribe = useCallback(() => {
    window.open('https://dasuperhub.com', '_blank');
  }, []);

  const state: WatchGateState = { isGated, canDismiss, hasAccount };
  const actions = { recordSwitch, dismiss, createAccount, subscribe };

  return [state, actions] as const;
}
