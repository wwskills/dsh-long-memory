// Audit log helper.
//
// All destructive or user-visible mutations (record / forget / supersede /
// confirm-approve / confirm-reject) MUST go through writeAuditLog. The
// audit_log table is append-only at the SQL layer (triggers reject
// UPDATE/DELETE; see migration 0001), so this helper only ever inserts.

import { newId, nowMs } from './sqlite.js'
import type { SqlDriver } from './sqlite.js'

/** One audit entry. */
export interface AuditEntry {
  /** 'user' | 'agent:<sessionId>' | 'system' */
  actor: string
  /** One of the AUDIT_ACTIONS vocabulary. */
  action: string
  targetId?: string
  /** 'memory' | 'supersession_key' | 'scope' */
  targetKind?: string
  scope?: string
  reason?: string
  /** JSON-serialisable, stored as JSON text. */
  prevValue?: unknown
  newValue?: unknown
  sessionId?: string
}

/**
 * Append an audit entry. Throws on driver error; the M3 DoD requires
 * mem_forget/supersede/confirm to be blocked when audit fails, so we
 * always throw rather than buffer.
 */
export function writeAuditLog(driver: SqlDriver, entry: AuditEntry): void {
  driver.prepare(
    `INSERT INTO audit_log
       (id, actor, action, target_id, target_kind, scope, reason,
        prev_value, new_value, session_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId(),
    entry.actor,
    entry.action,
    entry.targetId ?? null,
    entry.targetKind ?? null,
    entry.scope ?? null,
    entry.reason ?? null,
    entry.prevValue === undefined ? null : JSON.stringify(entry.prevValue),
    entry.newValue === undefined ? null : JSON.stringify(entry.newValue),
    entry.sessionId ?? null,
    nowMs(),
  )
}

/** Enumerate the allowed audit actions. Keep in sync with the schema. */
export const AUDIT_ACTIONS: readonly string[] = Object.freeze([
  'record',
  'forget',
  'forget-hard',
  'supersede',
  'confirm-approve',
  'confirm-reject',
])
