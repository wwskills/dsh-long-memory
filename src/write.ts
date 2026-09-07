// Unified write path.
//
// All memory insertions go through this function so that FTS5 sync, KG edges,
// embedding cache, and audit log are never missed. (Historically there were 5
// separate write paths; two of them missed FTS5/KG edges, leaving
// confirm-approved memories invisible to search.)

import { newId, nowMs } from './sqlite.js'
import type { SqlDriver } from './sqlite.js'
import { ftsInsert, ftsDelete } from './fts5-sync.js'
import { writeAuditLog } from './audit.js'
import { createEdges } from './kg.js'
import { embedBatch } from './embeddings.js'
import type { EmbeddingConfig } from './embeddings.js'

/** Fields for a memory write. */
export interface WriteMemoryParams {
  /** PREFERENCE | FACT | PROJECT | EVENT | EPISODIC | USER */
  type: string
  /** user | project | domain | episodic (or project:<branch>) */
  scope: string
  content: string
  /** agent | user-edited | system | owner | untrusted */
  origin?: string
  /** interactive | cron | heartbeat | subagent */
  sessionKind?: string
  sessionId?: string | null
  lang?: string | null
  /** Dedup / supersession key. */
  supersessionKey?: string | null
  confidence?: number
  accessCount?: number
  /** active | archived */
  status?: string
  id?: string
  observedAt?: number
}

/** Audit parameters attached to a write. */
export interface WriteAudit {
  actor?: string
  action?: string
  reason?: string
  sessionId?: string
}

/**
 * Insert a memory into the DB with all side-effects:
 *   1. INSERT into memories table
 *   2. FTS5 index sync
 *   3. KG edges
 *   4. Optional embedding (async, best-effort)
 *   5. Audit log
 */
export function writeMemory(driver: SqlDriver, params: WriteMemoryParams, embeddingConfig?: EmbeddingConfig | null, audit: WriteAudit = {}): { id: string, rowid: number } {
  const {
    type, scope, content, origin = 'agent', sessionKind = 'interactive',
    sessionId = null, lang = null, supersessionKey = null,
    confidence = 1.0, accessCount = 0, status = 'active',
  } = params

  const id = params.id || newId()
  const ts = params.observedAt || nowMs()

  // 1. INSERT into memories
  const result = driver.prepare(
    `INSERT INTO memories
       (id, type, scope, content, origin, session_kind, session_id, lang,
        schema_version, observed_at, supersession_key, confidence,
        access_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
  ).run(
    id, type, scope, content, origin, sessionKind, sessionId, lang,
    ts, supersessionKey, confidence, accessCount, status,
  )

  const rowid = Number(result.lastInsertRowid)

  // 2. FTS5 sync
  ftsInsert(driver, rowid, content)

  // 3. KG edges (best-effort; don't fail the write)
  try {
    createEdges(driver, { id, type, scope })
  } catch {
    // KG edge creation failure is non-fatal.
  }

  // 4. Embedding (async, best-effort — fire and forget)
  if (embeddingConfig && embeddingConfig.provider !== 'none') {
    void embedBatch(driver, embeddingConfig, [content]).catch(() => {
      // embedding failure is non-fatal; still searchable via FTS5
    })
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
      sessionId: sessionId ?? undefined,
    })
  }

  return { id, rowid }
}

/**
 * Soft-delete (archive) or hard-delete a memory, with FTS5 cleanup.
 * Hard delete also removes the FTS entry; archived memories stay searchable.
 */
export function deleteMemory(driver: SqlDriver, id: string, hard = false, audit: WriteAudit = {}): boolean {
  const row = driver.prepare(`SELECT rowid, content, type, scope, status FROM memories WHERE id = ?`).get(id)
  if (row === undefined) return false

  if (hard) {
    driver.prepare(`DELETE FROM memories WHERE id = ?`).run(id)
  } else {
    driver.prepare(`UPDATE memories SET status = 'archived' WHERE id = ?`).run(id)
  }

  // FTS5 cleanup (only for hard delete)
  if (hard) {
    try { ftsDelete(driver, Number(row.rowid), String(row.content)) } catch { /* best-effort */ }
  }

  // Audit
  if (audit.action) {
    writeAuditLog(driver, {
      actor: audit.actor || 'system',
      action: audit.action,
      targetId: id,
      targetKind: 'memory',
      scope: row.scope !== null ? String(row.scope) : undefined,
      reason: audit.reason,
      prevValue: { id, type: row.type, content: String(row.content).slice(0, 200), prevStatus: row.status },
      sessionId: audit.sessionId,
    })
  }

  return true
}
