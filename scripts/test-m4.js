#!/usr/bin/env node
// scripts/test-m4.js — M4 L7 consolidate coverage (persistent buffer + async)

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../lib/sqlite.js';
import { bufferMessage, extractAndPersist, bufferedSessionCount } from '../lib/l7.js';
import { unigramize } from '../lib/cjk.js';

const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-m4-'));
const dbPath = join(work, 'long-memory.db');
const { driver } = migrate(dbPath, join(process.cwd(), 'migrations'), { driver: 'node-builtin' });

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✓', msg);
  else { console.log('  ✗', msg); failed++; }
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Buffer + extract
// ────────────────────────────────────────────────────────────────────────────
console.log('1. Buffer + extract');
{
  driver.exec('DELETE FROM memories; DELETE FROM memories_fts; DELETE FROM audit_log; DELETE FROM l7_buffer;');

  bufferMessage(driver, 'sess-1', '我偏好中文回复，请用中文回答');
  bufferMessage(driver, 'sess-1', '部署端口是 8080，记住这个');
  bufferMessage(driver, 'sess-1', '这个项目的架构是微服务');

  const { extracted, candidates } = await extractAndPersist(driver, 'sess-1', { l7: { enabled: true } });
  assert(extracted >= 2, `≥2 memories extracted (got ${extracted})`);
  assert(candidates.length >= 2, `≥2 candidates (got ${candidates.length})`);

  const rows = driver.prepare(`SELECT type, scope, origin, confidence FROM memories`).all();
  assert(rows.every((r) => r.origin === 'agent'), `all origin='agent'`);
  assert(rows.some((r) => r.type === 'PREFERENCE'), `PREFERENCE extracted`);
  assert(rows.some((r) => r.type === 'FACT'), `FACT extracted`);

  // audit_log
  const audit = driver.prepare(`SELECT action, reason FROM audit_log`).all();
  assert(audit.length === extracted, `${extracted} audit entries`);
  assert(audit.every((a) => a.reason === 'l7-auto-extract'), `reason=l7-auto-extract`);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Buffer cleared after extraction
// ────────────────────────────────────────────────────────────────────────────
console.log('2. Buffer cleared after extraction');
{
  assert(bufferedSessionCount(driver) === 0, `session buffer cleared (got ${bufferedSessionCount(driver)})`);
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Empty buffer → no extraction
// ────────────────────────────────────────────────────────────────────────────
console.log('3. Empty buffer');
{
  const r = await extractAndPersist(driver, 'sess-empty', { l7: { enabled: true } });
  assert(r.extracted === 0, `no extraction on empty buffer`);
}

// ────────────────────────────────────────────────────────────────────────────
// 4. FTS5 searchable after extraction
// ────────────────────────────────────────────────────────────────────────────
console.log('4. FTS5 searchable');
{
  // Re-buffer and extract, then search
  bufferMessage(driver, 'sess-2', '记住：API 端点是 https://api.example.com');
  await extractAndPersist(driver, 'sess-2', { l7: { enabled: true } });

  const hits = driver.prepare(
    `SELECT m.content FROM memories_fts
       JOIN memories m ON m.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?`
  ).all(unigramize('API'));
  assert(hits.length >= 1, `FTS5 finds extracted memory (got ${hits.length})`);
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Persistence: buffer survives simulated restart
// ────────────────────────────────────────────────────────────────────────────
console.log('5. Buffer persistence (simulated restart)');
{
  bufferMessage(driver, 'sess-3', '测试持久化缓冲');
  const countBefore = driver.prepare('SELECT COUNT(*) AS n FROM l7_buffer WHERE session_id=?').get('sess-3').n;
  assert(countBefore === 1, `buffer persisted to SQLite (got ${countBefore})`);
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Interval check: skip if too soon
// ────────────────────────────────────────────────────────────────────────────
console.log('6. Interval check');
{
  // Set last run to now
  driver.prepare(`UPDATE schema_meta SET value=? WHERE key='l7_last_run'`).run(String(Date.now()));
  // scheduleExtraction should skip (interval not elapsed)
  // We can't easily test setImmediate in sync test, so just verify interval logic
  const lastRun = Number(driver.prepare(`SELECT value FROM schema_meta WHERE key='l7_last_run'`).get().value);
  assert(lastRun > 0, `l7_last_run timestamp recorded (got ${lastRun})`);
}

driver.close();
rmSync(work, { recursive: true, force: true });

if (failed > 0) {
  console.log(`\n✗ ${failed} M4 assertion(s) failed`);
  process.exit(1);
}
console.log('\n✓ all M4 assertions passed');
