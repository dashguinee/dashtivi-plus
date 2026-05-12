-- DashTivi+ Playback Telemetry
-- Mirrors voyo_playback_events schema exactly (same columns, same indexes, same RLS policy).
-- Captures every playback attempt, success, failure, stall, and quality drop.

CREATE TABLE IF NOT EXISTS tivi_playback_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL, -- 'play_start' | 'play_success' | 'play_fail' | 'pause' | 'resume' | 'stream_error' | 'stream_stall' | 'stream_end' | 'quality_drop'
  track_id TEXT NOT NULL,   -- channel.id
  track_title TEXT,         -- channel.name
  source TEXT,              -- 'live' | 'vod' | 'hls' | 'mpegts' | 'eco' | null
  error_code TEXT,          -- e.g. 'stream_unavailable' | 'hls_fatal' | 'timeout' | 'forbidden' | 'stream_limit' | 'not_found' | 'unknown'
  latency_ms INT,           -- ms from play_start to play_success (populated by caller if known)
  is_background BOOLEAN DEFAULT false,
  user_agent TEXT,
  session_id TEXT,
  meta JSONB                -- flexible context (stall readyState, quality drop detail, etc.)
);

CREATE INDEX IF NOT EXISTS tivi_playback_events_created_idx ON tivi_playback_events(created_at DESC);
CREATE INDEX IF NOT EXISTS tivi_playback_events_type_idx ON tivi_playback_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS tivi_playback_events_track_idx ON tivi_playback_events(track_id);
CREATE INDEX IF NOT EXISTS tivi_playback_events_error_idx ON tivi_playback_events(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS tivi_playback_events_session_idx ON tivi_playback_events(session_id);

-- Public insert via anon key (RLS allows INSERT, blocks SELECT for anon)
ALTER TABLE tivi_playback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tivi_playback_events_insert_anon" ON tivi_playback_events
  FOR INSERT TO anon WITH CHECK (true);

-- Quick failure summary view (use service key for dashboards)
CREATE OR REPLACE VIEW tivi_recent_failures AS
SELECT
  date_trunc('minute', created_at) AS minute,
  error_code,
  source,
  COUNT(*) AS count,
  COUNT(DISTINCT track_id) AS unique_channels
FROM tivi_playback_events
WHERE event_type IN ('play_fail', 'stream_error') AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- Quality drop summary view
CREATE OR REPLACE VIEW tivi_quality_drops AS
SELECT
  date_trunc('hour', created_at) AS hour,
  meta->>'stream_id' AS stream_id,
  COUNT(*) AS drop_count
FROM tivi_playback_events
WHERE event_type = 'quality_drop' AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2
ORDER BY 3 DESC;
