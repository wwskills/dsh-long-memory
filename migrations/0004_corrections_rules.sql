-- 0004_corrections_rules.sql
-- agent-evolve merge: corrections + rules tables for lesson capture + rule lifecycle

-- ── corrections ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corrections (
  id            TEXT PRIMARY KEY,
  trigger       TEXT NOT NULL,           -- 'user_correction' | 'tool_error' | 'agent_error'
  error_summary TEXT,
  root_cause     TEXT,
  correct_action TEXT,
  rule           TEXT,
  context        TEXT,                    -- JSON array of recent messages
  session_id     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'promoted' | 'ignored'
  rule_id        TEXT,                    -- FK -> rules.id
  created_at     INTEGER NOT NULL,
  FOREIGN KEY (rule_id) REFERENCES rules(id)
);

CREATE INDEX IF NOT EXISTS idx_corrections_status  ON corrections(status);
CREATE INDEX IF NOT EXISTS idx_corrections_trigger ON corrections(trigger);
CREATE INDEX IF NOT EXISTS idx_corrections_created ON corrections(created_at);

-- ── rules ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rules (
  id                 TEXT PRIMARY KEY,
  content            TEXT NOT NULL,
  category           TEXT NOT NULL DEFAULT 'coding',  -- 'coding' | 'communication' | 'workflow' | 'safety'
  tags               TEXT DEFAULT '[]',               -- JSON array
  status             TEXT NOT NULL DEFAULT 'proposed', -- 'proposed' | 'approved' | 'rejected' | 'archived' | 'promoted_to_agents'
  source_corrections TEXT DEFAULT '[]',               -- JSON array of correction ids
  approved_at        INTEGER,
  hit_count          INTEGER DEFAULT 0,
  last_hit_at        INTEGER,
  created_at         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_status   ON rules(status);
CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category);
CREATE INDEX IF NOT EXISTS idx_rules_hit      ON rules(hit_count);

-- ── usage_stats (monthly counters) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_stats (
  month                 TEXT PRIMARY KEY,  -- 'YYYY-MM' (UTC)
  corrections_captured  INTEGER DEFAULT 0,
  corrections_promoted  INTEGER DEFAULT 0,
  corrections_ignored   INTEGER DEFAULT 0,
  rules_proposed        INTEGER DEFAULT 0,
  rules_approved        INTEGER DEFAULT 0,
  extractions           INTEGER DEFAULT 0,
  persona_rebuilds      INTEGER DEFAULT 0
);
