// @wwskills/dsh-long-memory — unified write path (P0#3 fix)
//
// All memory insertions go through this function so that FTS5 sync,
// KG edges, embedding cache, and audit log are never missed.
//
// Before this module, there were 5 separate write paths each
// responsible for calling ftsInsert/createEdges/audit independently.
// Two of them (Web API approve, mem_confirm tool approve) were missing
// FTS5 and KG edges — memories approved through confirm queue were
// invisible to search.

import { newId, nowMs } from './sqlite.js';
import { ftsInsert, ftsDelete } from './fts5-sync.js';
import { writeAuditLog } from './audit.js';
import { createEdges } from './kg.js';
import { embedBatch } from './embeddings.js';

/**
 * Insert a memory into the DB with all side-effects:
 *   1. INSERT into memories table
 *   2. FTS5 index sync
 *   3. KG edges
 *   4. Optional embedding (async, best-effort)
 *   5. Audit log
 *
 * @param {object} driver - SQLite driver
 * @param {object} params - memory fields
 * @param {string} params.type - PREFERENCE | FACT | PROJECT | EVENT | EPISODIC
 * @param {string} params.scope - user | project | domain | episodic
 * @param {string} params.content - memory text
 * @param {string} params.origin - agent | user-edited | system
 * @param {string} params.sessionKind - interactive | cron | heartbeat | subagent
 * @param {string} [params.sessionId] - session id
 * @param {string} [params.lang] - language
 * @param {string} [params.supersessionKey] - dedup key
 * @param {number} [params.confidence=1.0] - confidence score
 * @param {number} [params.accessCount=0] - initial access count
 * @param {string} [params.status='active'] - active | archived
 * @param {object} [embeddingConfig] - embedding config (provider, model, etc.)
 * @param {object} [audit] - audit log params
 * @param {string} [audit.actor]
 * @param {string} [audit.action]
 * @param {string} [audit.reason]
 * @returns {{ id: string, rowid: number }}
 */
export function writeMemory(driver, params, embeddingConfig, audit = {}) {
  const {
    type, scope, content, origin = 'agent', sessionKind = 'interactive',
    sessionId = null, lang = null, supersessionKey = null,
    confidence = 1.0, accessCount = 0, status = 'active'
  } = params;

  const id = params.id || newId();
  const ts = params.observedAt || nowMs();

  // 1. INSERT into memories
  const result = driver.prepare(
    `INSERT INTO memories
       (id, type, scope, content, origin, session_kind, session_id, lang,
        schema_version, observed_at, supersession_key, confidence,
        access_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
  ).run(
    id, type, scope, content, origin, sessionKind, sessionId, lang,
    ts, supersessionKey, confidence, accessCount, status
  );

  const rowid = Number(result.lastInsertRowid);

  // 2. FTS5 sync
  ftsInsert(driver, rowid, content);

  // 3. KG edges
  try {
    createEdges(driver, { id, type, scope });
  } catch (e) {
    // KG edge creation is best-effort; don't fail the write
  }

  // 4. Embedding (async, best-effort — fire and forget)
  if (embeddingConfig && embeddingConfig.provider !== 'none') {
    embedBatch(driver, embeddingConfig, [content]).catch(() => {
      // embedding failure is non-fatal; the memory is still searchable via FTS5
    });
  }

  // 5. Audit log
  if (audit.action) {
    writeAuditLog(driver, {
      actor: audit.actor || 'system',
      action: audit.action,
      targetId: id,
      targetKind: 'memory',
      scope,
      reason: audit.reason,
      newValue: { id, type, content: content.slice(0, 200), confidence },
      sessionId: sessionId || undefined
    });
  }

  return { id, rowid };
}

/**
 * Soft-delete (archive) or hard-delete a memory, with FTS5 cleanup.
 *
 * @param {object} driver - SQLite driver
 * @param {string} id - memory id
 * @param {boolean} hard - true = DELETE, false = archive (set status='archived')
 * @param {object} [audit] - audit params
 */
export function deleteMemory(driver, id, hard = false, audit = {}) {
  const row = driver.prepare(`SELECT rowid, content, type, scope, status FROM memories WHERE id = ?`).get(id);
  if (!row) return false;

  if (hard) {
    driver.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
  } else {
    driver.prepare(`UPDATE memories SET status = 'archived' WHERE id = ?`).run(id);
  }

  // FTS5 cleanup (only for hard delete; archived memories stay searchable)
  if (hard) {
    try { ftsDelete(driver, Number(row.rowid), row.content); } catch {}
  }

  // Audit
  if (audit.action) {
    writeAuditLog(driver, {
      actor: audit.actor || 'system',
      action: audit.action,
      targetId: id,
      targetKind: 'memory',
      scope: row.scope,
      reason: audit.reason,
      prevValue: { id, type: row.type, content: row.content.slice(0, 200), prevStatus: row.status },
      sessionId: audit.sessionId
    });
  }

  return true;
}
