/**
 * DashTivi+ Playback Telemetry
 *
 * Observability layer for streaming playback. Batched Supabase inserts for
 * every playback event — success, failure, error, stall.
 * Fire-and-forget. Never blocks video. Never throws. sendBeacon on pagehide.
 *
 * Design goals:
 * - Zero impact on video thread (no sync work, no awaits in call path)
 * - Survives network failures (batching + retry)
 * - Survives page unload (sendBeacon)
 * - Mirrors VOYO Music telemetry pattern exactly
 *
 * Table: tivi_playback_events
 * See: supabase/migrations/tivi_playback_events.sql
 */

const APP_ID = 'dashtivi';
const TABLE = 'tivi_playback_events';

const SB_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim();
const SB_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export type PlaybackEventType =
  | 'play_start'     // user-initiated channel load
  | 'play_success'   // video element onplaying — actually streaming
  | 'play_fail'      // terminal error after all retries exhausted
  | 'pause'          // user paused or video paused
  | 'resume'         // user resumed after pause
  | 'stream_error'   // video element onerror — mid-stream failure
  | 'stream_stall'   // video element onwaiting — buffer underrun
  | 'stream_end'     // video ended unexpectedly (live channel dropped)
  | 'quality_drop';  // adaptive quality degraded (source → eco)

export type StreamType = 'live' | 'vod' | 'hls' | 'mpegts' | 'unknown';

interface PlaybackEvent {
  event_type: PlaybackEventType;
  track_id: string;            // channel.id
  track_title?: string;        // channel.name
  source?: string | null;      // stream type or quality (e.g. 'live', 'vod', 'eco')
  error_code?: string | null;  // error message (truncated)
  latency_ms?: number | null;
  is_background: boolean;
  user_agent: string;
  session_id: string;
  meta?: Record<string, unknown> | null;
}

// Session ID persists for the lifetime of the tab
const sessionId = `${APP_ID}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Batching config
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_SIZE = 20;
const MAX_BUFFER = 100; // Hard cap — drop oldest on overflow (network outage scenario)

let buffer: PlaybackEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveFailures = 0;

function endpoint(): string {
  return `${SB_URL}/rest/v1/${TABLE}`;
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  if (!SB_KEY) return; // No key configured — drop silently

  const batch = buffer.splice(0, buffer.length);
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      consecutiveFailures++;
      if (consecutiveFailures <= 3) {
        console.debug(`[TiviTelemetry] Insert failed (${consecutiveFailures}): ${res.status}`);
      }
      // Too many failures — something structural is wrong (schema, auth).
      // Stop buffering to avoid memory leak.
      if (consecutiveFailures > 10) {
        console.debug('[TiviTelemetry] Too many failures, disabling for this session');
        buffer = [];
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      }
    } else {
      consecutiveFailures = 0;
    }
  } catch {
    consecutiveFailures++;
    // Network failure — events re-enter buffer on next call (already spliced out)
    // Accept the loss rather than re-adding (avoids double-logging on recovery)
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Log a playback event. Fire-and-forget — never throws, never blocks.
 * Batched and flushed every 10s or when buffer hits 20 events.
 */
export function logPlaybackEvent(
  event: Omit<PlaybackEvent, 'is_background' | 'user_agent' | 'session_id'>
): void {
  try {
    const hidden = typeof document !== 'undefined' && document.hidden;
    const full: PlaybackEvent = {
      ...event,
      is_background: hidden,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
      session_id: sessionId,
    };

    // Background: use sendBeacon so events survive tab being backgrounded.
    // sendBeacon bypasses background timer throttling. Supabase REST accepts
    // apikey as a URL query param for anon-role inserts (no custom header needed).
    if (hidden && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const url = `${endpoint()}?apikey=${encodeURIComponent(SB_KEY)}`;
        const blob = new Blob([JSON.stringify([full])], { type: 'application/json' });
        const ok = navigator.sendBeacon(url, blob);
        if (ok) return; // queued — don't also buffer
        // Beacon rejected (queue full) → fall through to buffer
      } catch {
        // fall through to buffer
      }
    }

    // Hard cap — drop oldest on overflow
    if (buffer.length >= MAX_BUFFER) {
      buffer.shift();
    }
    buffer.push(full);
    if (buffer.length >= FLUSH_SIZE) {
      flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // Never break playback for telemetry
  }
}

/**
 * Flush remaining events on page hide / unload.
 * sendBeacon is specifically designed to survive page unload.
 */
if (typeof window !== 'undefined') {
  const unloadFlush = () => {
    if (buffer.length === 0 || !SB_KEY) return;
    try {
      const body = JSON.stringify(buffer);
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(`${endpoint()}?apikey=${encodeURIComponent(SB_KEY)}`, blob);
      } else {
        fetch(endpoint(), {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body,
          keepalive: true,
        }).catch(() => {});
      }
      buffer = [];
    } catch {
      // best-effort
    }
  };

  window.addEventListener('pagehide', unloadFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && buffer.length > 0) {
      flush();
    }
  });
}

/**
 * DEBUG: expose telemetry control to window for manual testing in console.
 * `tiviTelemetry.flush()` — force immediate flush
 * `tiviTelemetry.stats()` — see buffer state
 */
if (typeof window !== 'undefined') {
  (window as any).tiviTelemetry = {
    flush,
    stats: () => ({ bufferSize: buffer.length, sessionId, consecutiveFailures }),
    sessionId: () => sessionId,
  };
}
