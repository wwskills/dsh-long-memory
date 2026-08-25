#!/usr/bin/env node
// scripts/test-tools-e2e.js — exercise the core write/read/audit paths
// directly via the SQLite driver, matching what each mem_* tool does. This
// avoids the cost of booting Cordis + dsh-tools here while still proving
// the schema, queries, and audit invariants hold end-to-end.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../lib/sqlite.js';
import { recallFts5 } from '../lib/recall.js';
import { writeAuditLog } from '../lib/audit.js';
import { ftsInsert, ftsDelete } from '../lib/fts5-sync.js';
import { newId, nowMs } from '../lib/sqlite.js';

const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-e2e-'));
const dbPath = join(work, 'long-memory.db');
const migrationsDir = join(process.cwd(), 'migrations');

const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✓', msg);
  else { console.log('  ✗', msg); failed++; }
};

const session = { id: 'test-session-1', kind: 'interactive' };
const agentActor = `agent:${session.id}`;

// ────────────────────────────────────────────────────────────────────────────
// Helpers — mirror what lib/index.js does inside each tool's execute().
// ────────────────────────────────────────────────────────────────────────────

function recordMemory({ type, scope = 'user', content, supersession_key = null, lang = null, tags = null, sessionKind = 'interactive', sessionId = session.id }) {
  // Sensitive-content gate mirrors the rule in mem_record execute().
  const sensitive = /(api[_-]?key|secret|password|token|密钥|密码|凭证)/i.test(content);

  if (sensitive) {
    const queueId = newId();
    driver.prepare(
      `INSERT INTO confirm_queue (queue_id, type, content, scope, origin, supersession_key, confidence, tags, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(queueId, type, content, scope, 'agent', supersession_key, 1.0, tags ? JSON.stringify(tags) : null, nowMs());
    writeAuditLog(driver, {
      actor: agentActor,
      action: 'record',
      targetId: queueId,
      targetKind: 'memory',
      scope,
      reason: 'sensitive-needs-confirm',
      newValue: { queueId, type, content },
      sessionId
    });
    return { id: null, status: 'pending-confirm', pending_confirm_id: queueId };
  }

  // Carry over access_count from any superseded rows.
  let carriedAccess = 0;
  let supersededIds = [];
  if (supersession_key) {
    const existing = driver.prepare(
      `SELECT id, access_count FROM memories WHERE supersession_key = ? AND status = 'active'`
    ).all(supersession_key);
    if (existing.length > 0) {
      supersededIds = existing.map((r) => r.id);
      carriedAccess = existing.reduce((s, r) => s + Number(r.access_count), 0);
      driver.prepare(
        `UPDATE memories SET status = 'superseded' WHERE id IN (${existing.map(() => '?').join(',')})`
      ).run(...existing.map((r) => r.id));
    }
  }

  const id = newId();
  const insertResult = driver.prepare(
    `INSERT INTO memories
       (id, type, scope, content, origin, session_kind, session_id, lang,
        schema_version, observed_at, supersession_key, confidence, access_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1.0, ?, 'active')`
  ).run(
    id, type, scope, content, 'agent', sessionKind, sessionId, lang,
    nowMs(), supersession_key, carriedAccess
  );
  // Mirror into FTS5 with CJK-unigramised content (mirrors lib/index.js).
  ftsInsert(driver, Number(insertResult.lastInsertRowid), content);
  writeAuditLog(driver, {
    actor: agentActor,
    action: supersededIds.length > 0 ? 'supersede' : 'record',
    targetId: id,
    targetKind: 'memory',
    scope,
    newValue: { id, type, scope, content, supersededIds },
    prevValue: supersededIds.length > 0 ? { supersededIds } : undefined,
    sessionId
  });
  return { id, status: 'active', superseded: { count: supersededIds.length, ids: supersededIds } };
}

function forgetMemory({ target, reason, hard = false }) {
  let prevSnapshot, count;
  const action = hard ? 'forget-hard' : 'forget';

  if (target.kind === 'id') {
    prevSnapshot = driver.prepare(`SELECT rowid, * FROM memories WHERE id = ?`).get(target.id);
    if (!prevSnapshot) throw new Error(`target-not-found ${target.id}`);
    const r = hard
      ? driver.prepare(`DELETE FROM memories WHERE id = ?`).run(target.id)
      : driver.prepare(`UPDATE memories SET status='archived' WHERE id = ? AND status != 'archived'`).run(target.id);
    if (hard) ftsDelete(driver, prevSnapshot.rowid, prevSnapshot.content);
    count = r.changes;
  } else if (target.kind === 'scope') {
    if (target.scope === 'user' && !reason) throw new Error('scope-protected');
    prevSnapshot = { scope: target.scope };
    const rows = hard
      ? driver.prepare(`SELECT rowid, content FROM memories WHERE scope = ?`).all(target.scope)
      : [];
    const r = hard
      ? driver.prepare(`DELETE FROM memories WHERE scope = ?`).run(target.scope)
      : driver.prepare(`UPDATE memories SET status='archived' WHERE scope = ? AND status != 'archived'`).run(target.scope);
    if (hard) for (const row of rows) ftsDelete(driver, row.rowid, row.content);
    count = r.changes;
  } else if (target.kind === 'supersession_key') {
    prevSnapshot = { key: target.key };
    const rows = hard
      ? driver.prepare(`SELECT rowid, content FROM memories WHERE supersession_key = ?`).all(target.key)
      : [];
    const r = hard
      ? driver.prepare(`DELETE FROM memories WHERE supersession_key = ?`).run(target.key)
      : driver.prepare(`UPDATE memories SET status='archived' WHERE supersession_key = ? AND status != 'archived'`).run(target.key);
    if (hard) for (const row of rows) ftsDelete(driver, row.rowid, row.content);
    count = r.changes;
  }
  writeAuditLog(driver, {
    actor: agentActor, action,
    targetId: target.kind === 'id' ? target.id : null,
    targetKind: target.kind,
    scope: target.kind === 'scope' ? target.scope : null,
    reason,
    prevValue: prevSnapshot,
    sessionId: session.id
  });
  return { affected: count, archived: hard ? 0 : count, deleted: hard ? count : 0 };
}

function confirmQueue(queueId, decision) {
  const q = driver.prepare(`SELECT * FROM confirm_queue WHERE queue_id = ?`).get(queueId);
  if (!q) throw new Error(`queue-id-not-found`);
  if (q.status !== 'pending') throw new Error('already-resolved');
  if (decision === 'approve') {
    const id = newId();
    driver.prepare(
      `INSERT INTO memories (id, type, scope, content, origin, session_kind, schema_version, observed_at, supersession_key, confidence, status)
       VALUES (?, ?, ?, ?, ?, 'interactive', 1, ?, ?, ?, 'active')`
    ).run(id, q.type, q.scope, q.content, q.origin, nowMs(), q.supersession_key, q.confidence);
    driver.prepare(`UPDATE confirm_queue SET status='approved', memory_id=? WHERE queue_id=?`).run(id, queueId);
    writeAuditLog(driver, {
      actor: agentActor, action: 'confirm-approve',
      targetId: id, targetKind: 'memory', scope: q.scope,
      newValue: { id, type: q.type, content: q.content, queueId },
      sessionId: session.id
    });
    return { status: 'active', memory_id: id };
  } else {
    driver.prepare(`UPDATE confirm_queue SET status='rejected' WHERE queue_id = ?`).run(queueId);
    writeAuditLog(driver, {
      actor: agentActor, action: 'confirm-reject',
      scope: q.scope, prevValue: { queueId, content: q.content },
      sessionId: session.id
    });
    return { status: 'rejected' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

console.log('1. mem_status on empty DB');
{
  const total = driver.prepare(`SELECT COUNT(*) AS n FROM memories`).get().n;
  assert(Number(total) === 0, `empty DB → 0 records`);
  const pending = driver.prepare(`SELECT COUNT(*) AS n FROM confirm_queue WHERE status='pending'`).get().n;
  assert(Number(pending) === 0, `0 pending confirms`);
}

console.log('2. record × 3');
{
  const r1 = recordMemory({ type: 'PREFERENCE', content: '用户偏好中文回复', tags: ['lang'] });
  assert(r1.status === 'active' && !!r1.id, `record #1 active`);

  const r2 = recordMemory({ type: 'PROJECT', content: '项目部署端口是 8080', scope: 'project' });
  assert(r2.status === 'active', `record #2 active (scope=project)`);

  const r3 = recordMemory({ type: 'FACT', content: '记忆插件用 node:sqlite 作为后端', lang: 'zh-CN' });
  assert(r3.status === 'active', `record #3 active (lang=zh-CN)`);

  const total = driver.prepare(`SELECT COUNT(*) AS n FROM memories`).get().n;
  assert(Number(total) === 3, `3 records in DB`);
}

console.log('3. search "端口" → 1 hit');
{
  const r = recallFts5(driver, { query: '端口', limit: 10 });
  assert(r.hits.length >= 1, `≥1 hit for "端口" (got ${r.hits.length})`);
  assert(r.hits[0].content.includes('8080'), `hit contains 8080`);
  assert(r.score_path === 'fts5-only', `score_path=fts5-only`);
}

console.log('4. search with session_id filter (no hits for foreign session)');
{
  const r = recallFts5(driver, { query: '端口', sessionId: 'other-session' });
  assert(r.hits.length === 0, `0 hits when session_id mismatches`);
}

console.log('5. supersession triggers supersede + audit');
{
  const r1 = recordMemory({ type: 'FACT', content: '部署端口是 8080', supersession_key: 'deploy-port' });
  assert(r1.status === 'active', `v1 active`);
  const r2 = recordMemory({ type: 'FACT', content: '部署端口是 9090', supersession_key: 'deploy-port' });
  assert(r2.status === 'active', `v2 active`);
  assert(r2.superseded.count === 1, `superseded.count=1`);
  const sup = driver.prepare(
    `SELECT COUNT(*) AS n FROM memories WHERE status='superseded' AND supersession_key='deploy-port'`
  ).get().n;
  assert(Number(sup) === 1, `1 superseded row in DB`);
  const audits = driver.prepare(`SELECT action FROM audit_log WHERE action='supersede'`).all();
  assert(audits.length === 1, `1 supersede entry in audit_log`);
}

console.log('6. sensitive content → confirm queue');
{
  const r = recordMemory({ type: 'FACT', content: 'the api_key is sk-abc123' });
  assert(r.status === 'pending-confirm', `sensitive → pending-confirm`);
  assert(!!r.pending_confirm_id, `pending_confirm_id returned`);
  const q = driver.prepare(`SELECT status FROM confirm_queue WHERE queue_id=?`).get(r.pending_confirm_id);
  assert(q.status === 'pending', `queue entry pending`);
}

console.log('7. confirm-approve');
{
  const q = driver.prepare(`SELECT queue_id FROM confirm_queue WHERE status='pending' LIMIT 1`).get();
  const r = confirmQueue(q.queue_id, 'approve');
  assert(r.status === 'active' && !!r.memory_id, `approve → active with memory_id`);
  const audits = driver.prepare(`SELECT action FROM audit_log WHERE action='confirm-approve'`).all();
  assert(audits.length === 1, `1 confirm-approve audit`);
}

console.log('8. forget (soft archive)');
{
  const m = driver.prepare(`SELECT id FROM memories WHERE type='PREFERENCE' LIMIT 1`).get();
  const r = forgetMemory({ target: { kind: 'id', id: m.id }, reason: 'user request' });
  assert(r.affected === 1 && r.archived === 1, `1 archived`);
  const audits = driver.prepare(`SELECT action FROM audit_log WHERE action='forget'`).all();
  assert(audits.length === 1, `1 forget audit`);
}

console.log('9. forget hard=true (DELETE)');
{
  const m = driver.prepare(`SELECT id FROM memories WHERE type='PROJECT' LIMIT 1`).get();
  const r = forgetMemory({ target: { kind: 'id', id: m.id }, reason: 'user explicit', hard: true });
  assert(r.deleted === 1, `1 hard-deleted`);
  const audits = driver.prepare(`SELECT action FROM audit_log WHERE action='forget-hard'`).all();
  assert(audits.length === 1, `1 forget-hard audit`);
}

console.log('10. scope-protected forget (user scope requires reason)');
{
  let blocked = false;
  try { forgetMemory({ target: { kind: 'scope', scope: 'user' } }); }
  catch (e) { blocked = /scope-protected/.test(e.message); }
  assert(blocked, `forgetting user scope without reason blocked`);
}

console.log('11. aggregate group_by=type');
{
  const rows = driver.prepare(
    `SELECT type AS key, COUNT(*) AS count, AVG(confidence) AS avg_confidence
       FROM memories GROUP BY type ORDER BY count DESC`
  ).all();
  assert(rows.length > 0, `group_by=type returns ≥1 row`);
  assert(typeof rows[0].count === 'number' || typeof rows[0].count === 'bigint',
    `count is numeric`);
}

console.log('12. lang field stored and returned');
{
  const zh = driver.prepare(`SELECT COUNT(*) AS n FROM memories WHERE lang='zh-CN'`).get().n;
  assert(Number(zh) >= 1, `≥1 record with lang='zh-CN'`);
  const r = recallFts5(driver, { query: 'node:sqlite' });
  if (r.hits.length > 0) {
    assert(r.hits[0].lang === 'zh-CN', `lang=zh-CN propagated through search`);
  }
}

console.log('13. superseded excluded from default search');
{
  // Search for the superseded "8080" — should NOT appear since it's now superseded.
  const r = recallFts5(driver, { query: '8080' });
  assert(r.hits.every((h) => !h.content.includes('8080')),
    `superseded "8080" excluded (include_superseded=false default)`);

  // With includeSuperseded=true, it should appear.
  const r2 = recallFts5(driver, { query: '8080', includeSuperseded: true });
  assert(r2.hits.some((h) => h.content.includes('8080')),
    `with includeSuperseded=true, "8080" returns`);
}

driver.close();
rmSync(work, { recursive: true, force: true });

if (failed > 0) {
  console.log(`\n✗ ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\n✓ all e2e assertions passed');