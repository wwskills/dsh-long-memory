// @wwskills/dsh-long-memory — audit log helper
//
// All destructive or user-visible mutations (record / forget / supersede /
// confirm-approve / confirm-reject) MUST go through writeAuditLog. The
// audit_log table is append-only at the SQL layer (triggers reject
// UPDATE/DELETE; see migration 0001), so this helper only ever inserts.

import { newId, nowMs } from './sqlite.js';

/**
 * Append an audit entry. Throws on driver error; caller decides whether to
 * surface it as a tool error or fall back to in-memory buffering (the M3
 * DoD requires mem_forget/superede/confirm to be blocked when audit fails,
 * so we always throw).
 *
 * @param {object} driver - SQLite driver handle from lib/sqlite.js
 * @param {object} entry
 * @param {string} entry.actor - 'user' | 'agent:<sessionId>' | 'system'
 * @param {string} entry.action - one of the action vocabulary
 * @param {string} [entry.targetId]
 * @param {string} [entry.targetKind] - 'memory' | 'supersession_key' | 'scope'
 * @param {string} [entry.scope]
 * @param {string} [entry.reason]
 * @param {*}      [entry.prevValue]  - JSON-serialisable, stored as JSON text
 * @param {*}      [entry.newValue]
 * @param {string} [entry.sessionId]
 */
export function writeAuditLog(driver, entry) {
  const stmt = driver.prepare(
    `INSERT INTO audit_log
       (id, actor, action, target_id, target_kind, scope, reason,
        prev_value, new_value, session_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    newId(),
    entry.actor,
    entry.action,
    entry.targetId ?? null,
    entry.targetKind ?? null,
    entry.scope ?? null,
    entry.reason ?? null,
    entry.prevValue === undefined ? null : JSON.stringify(entry.prevValue),
    entry.newValue  === undefined ? null : JSON.stringify(entry.newValue),
    entry.sessionId ?? null,
    nowMs()
  );
}

/** Enumerate the allowed audit actions. Keep in sync with §13 / §3.3. */
export const AUDIT_ACTIONS = Object.freeze([
  'record',
  'forget',
  'forget-hard',
  'supersede',
  'confirm-approve',
  'confirm-reject'
]);