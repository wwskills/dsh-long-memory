-- @wangww/dsh-long-memory initial schema (M0)
--
-- See design doc §3.3 for field rationale. Schema version 1.
-- This migration is the only one applied on a fresh install. Future
-- migrations (0002_*.sql, 0003_*.sql, …) extend this base. They must never
-- modify a column introduced here in a way that breaks already-stored rows;
-- see design §16 for migration policy.
--
-- NOTE: PRAGMA statements (journal_mode, synchronous, foreign_keys) are
-- applied by the driver *outside* the migration transaction because node:sqlite
-- forbids journal_mode changes inside a transaction.

-- ────────────────────────────────────────────────────────────────────────────
-- Core memory table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE memories (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,                  -- USER/PREFERENCE/PROJECT/FACT/SKILL/EVENT/TASK
  scope           TEXT NOT NULL DEFAULT 'user',   -- user/project/domain/episodic
  content         TEXT NOT NULL,
  origin          TEXT NOT NULL,                  -- owner/agent/untrusted/system/user-edited
  session_kind    TEXT NOT NULL DEFAULT 'interactive',  -- interactive/cron/heartbeat/subagent
  session_id      TEXT,
  lang            TEXT,
  schema_version  INTEGER NOT NULL DEFAULT 1,
  observed_at     INTEGER NOT NULL,
  supersession_key TEXT,
  confidence      REAL NOT NULL DEFAULT 1.0,
  access_count    INTEGER NOT NULL DEFAULT 0,
  last_access     INTEGER,
  status          TEXT NOT NULL DEFAULT 'active'  -- active/archived/superseded
);

-- ────────────────────────────────────────────────────────────────────────────
-- Knowledge graph edges + communities (M2 — schema in place for M0)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE edges (
  src        TEXT NOT NULL,
  dst        TEXT NOT NULL,
  predicate  TEXT NOT NULL,
  weight     REAL NOT NULL DEFAULT 1.0
);

CREATE TABLE communities (
  id       TEXT NOT NULL,
  members  TEXT NOT NULL,            -- JSON array of memory ids
  summary  TEXT
);

-- ────────────────────────────────────────────────────────────────────────────
-- FTS5 content index — kept in sync via triggers
-- ────────────────────────────────────────────────────────────────────────────

CREATE VIRTUAL TABLE memories_fts USING fts5(
  content,
  content='memories',
  content_rowid='rowid'
);

-- FTS5 sync triggers are NOT used here. Application code (lib/fts5-sync.js)
-- inserts into memories_fts directly with the unigramized CJK form, because
-- SQLite triggers cannot invoke an external tokeniser. Application-level
-- sync keeps the FTS5 content and the `memories` table in lock-step.

-- ────────────────────────────────────────────────────────────────────────────
-- Embedding cache (content_sha256 dedup, populated lazily in M2+)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE memory_embeddings (
  content_sha256  TEXT PRIMARY KEY,
  model           TEXT NOT NULL,
  embedding       BLOB NOT NULL,
  dim             INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);

-- ────────────────────────────────────────────────────────────────────────────
-- Confirm queue (M3 — schema in place for M0)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE confirm_queue (
  queue_id          TEXT PRIMARY KEY,
  memory_id         TEXT,
  type              TEXT NOT NULL,
  content           TEXT NOT NULL,
  scope             TEXT NOT NULL,
  origin            TEXT NOT NULL,
  supersession_key  TEXT,
  confidence        REAL NOT NULL,
  tags              TEXT,                       -- JSON array
  created_at        INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'  -- pending/approved/rejected
);

-- ────────────────────────────────────────────────────────────────────────────
-- Audit log (append-only; triggers reject UPDATE/DELETE)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id           TEXT PRIMARY KEY,
  actor        TEXT NOT NULL,                   -- 'user' | 'agent:<sessionId>' | 'system'
  action       TEXT NOT NULL,                   -- record/forget/forget-hard/supersede/confirm-approve/confirm-reject
  target_id    TEXT,
  target_kind  TEXT,                            -- memory/scope/supersession_key
  scope        TEXT,
  reason       TEXT,
  prev_value   TEXT,                            -- JSON snapshot (forget/supersede)
  new_value    TEXT,                            -- JSON snapshot (record/approve)
  session_id   TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes (single-column + composite recall-path indexes)
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_memories_scope         ON memories(scope);
CREATE INDEX idx_memories_type          ON memories(type);
CREATE INDEX idx_memories_origin        ON memories(origin);
CREATE INDEX idx_memories_session_kind  ON memories(session_kind);
CREATE INDEX idx_memories_session_id    ON memories(session_id);
CREATE INDEX idx_memories_lang          ON memories(lang);
CREATE INDEX idx_memories_supersession  ON memories(supersession_key);
CREATE INDEX idx_memories_status        ON memories(status);
CREATE INDEX idx_memories_observed      ON memories(observed_at DESC);
CREATE INDEX idx_memories_last_access   ON memories(last_access DESC);
CREATE INDEX idx_memories_scope_type    ON memories(scope, type);
CREATE INDEX idx_memories_scope_status  ON memories(scope, status);

CREATE INDEX idx_edges_src              ON edges(src);
CREATE INDEX idx_edges_dst              ON edges(dst);
CREATE INDEX idx_edges_predicate        ON edges(predicate);
CREATE INDEX idx_communities_id         ON communities(id);

CREATE INDEX idx_embeddings_model       ON memory_embeddings(model);

CREATE INDEX idx_confirm_status         ON confirm_queue(status);

CREATE INDEX idx_audit_actor            ON audit_log(actor);
CREATE INDEX idx_audit_action           ON audit_log(action);
CREATE INDEX idx_audit_target           ON audit_log(target_id);
CREATE INDEX idx_audit_created          ON audit_log(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- Migration bookkeeping (see §16)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO schema_meta(key, value) VALUES ('version', '1');
INSERT INTO schema_meta(key, value) VALUES ('migrations_applied', '1');