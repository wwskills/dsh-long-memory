-- Migration 0003: embedding cache composite key
--
-- P1 fix: the original memory_embeddings table used content_sha256 as the
-- sole primary key. Switching embedding models (e.g. bge-m3 → nomic-embed-text)
-- would silently reuse the old cache, producing dimension/semantic mismatches.
--
-- This migration recreates the table with a composite primary key
-- (content_sha256, model, dim) so different models maintain separate caches.

-- 1. Drop the old index
DROP INDEX IF EXISTS idx_embeddings_model;

-- 2. Rename old table
ALTER TABLE memory_embeddings RENAME TO memory_embeddings_old;

-- 3. Create new table with composite PK
CREATE TABLE memory_embeddings (
  content_sha256  TEXT NOT NULL,
  model           TEXT NOT NULL,
  dim             INTEGER NOT NULL,
  embedding       BLOB NOT NULL,
  created_at      INTEGER NOT NULL,
  PRIMARY KEY (content_sha256, model, dim)
);

-- 4. Copy existing data (all rows keep their current model/dim)
INSERT OR IGNORE INTO memory_embeddings (content_sha256, model, dim, embedding, created_at)
  SELECT content_sha256, model, dim, embedding, created_at FROM memory_embeddings_old;

-- 5. Drop old table
DROP TABLE memory_embeddings_old;

-- 6. Recreate index (now queries by model are still efficient)
CREATE INDEX idx_embeddings_model ON memory_embeddings(model);

-- 7. Note: migrations_applied is updated by the migration runner,
--    so we do NOT self-update it here (was redundant in 0001/0002).
