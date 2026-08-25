-- 0002_l7_buffer.sql — L7 message buffer persistence + interval tracking
--
-- Persists buffered user messages so they survive DSH restarts.
-- Also tracks last L7 extraction timestamp for interval-based scheduling.

CREATE TABLE IF NOT EXISTS l7_buffer (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  message     TEXT NOT NULL,
  turn_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_l7_buffer_session ON l7_buffer(session_id);

-- Track last L7 run timestamp (key-value)
INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('l7_last_run', '0');

UPDATE schema_meta SET value = '2' WHERE key = 'migrations_applied';
