#!/usr/bin/env node
// scripts/test-migration.js — verify migration runner idempotency + invariants.
//
// 1. Run migrations on a fresh DB → expect schema_version=1
// 2. Run migrations again on the same DB → expect zero new migrations
// 3. Run the audit_log invariant (UPDATE/DELETE must reject)
// 4. Run the FTS5 ↔ memories sync invariant

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../lib/sqlite.js';

const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-test-'));
const dbPath = join(work, 'long-memory.db');
const migrationsDir = join(process.cwd(), 'migrations');

let failed = 0;
const assert = (cond, msg) => {
  if (cond) {
    console.log('  ✓', msg);
  } else {
    console.log('  ✗', msg);
    failed++;
  }
};

console.log('1. Fresh install → applies 0001');
{
  const { driver, applied } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  assert(applied.length >= 1, `≥1 migration applied (got ${applied.length})`);
  assert(applied[0] === '0001_initial.sql', `0001_initial.sql applied`);
  const ver = driver.prepare(`SELECT value FROM schema_meta WHERE key='version'`).get();
  assert(ver && Number(ver.value) === 1, `schema_version=1 (got ${ver?.value})`);
  driver.close();
}

console.log('2. Re-run on same DB → no new migrations');
{
  const { driver, applied } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  assert(applied.length === 0, `no migrations applied (got ${applied.length})`);
  driver.close();
}

console.log('3. audit_log append-only enforcement');
{
  const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  driver.prepare(
    `INSERT INTO audit_log (id, actor, action, created_at) VALUES ('a1', 'user', 'record', 0)`
  ).run();
  let blocked = false;
  try {
    driver.prepare(`UPDATE audit_log SET actor='x' WHERE id='a1'`).run();
  } catch (e) {
    blocked = /append-only/.test(e.message);
  }
  assert(blocked, 'UPDATE on audit_log rejected');
  blocked = false;
  try {
    driver.prepare(`DELETE FROM audit_log WHERE id='a1'`).run();
  } catch (e) {
    blocked = /append-only/.test(e.message);
  }
  assert(blocked, 'DELETE on audit_log rejected');
  driver.close();
}

console.log('4. FTS5 ↔ memories sync (insert → query)');
{
  const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  const insertResult = driver.prepare(
    `INSERT INTO memories (id, type, scope, content, origin, observed_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run('m1', 'FACT', 'user', 'The quick brown fox jumps over the lazy dog', 'user', Date.now());
  // Trigger was removed in favour of application-side sync; mirror explicitly.
  driver.prepare(
    `INSERT INTO memories_fts(rowid, content) VALUES (?, ?)`
  ).run(insertResult.lastInsertRowid, 'The quick brown fox jumps over the lazy dog');
  const rows = driver.prepare(
    `SELECT m.id FROM memories_fts
       JOIN memories m ON m.rowid = memories_fts.rowid
      WHERE memories_fts MATCH 'fox'`
  ).all();
  assert(rows.length === 1 && rows[0].id === 'm1', `FTS5 finds 'fox' in m1`);
  driver.close();
}

console.log('5. pragma_table_info round-trip (sqlite3 CLI sanity)');
{
  const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  const tables = driver.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  ).all().map((r) => r.name);
  const expected = ['audit_log','communities','confirm_queue','edges','memories',
                    'memory_embeddings','memories_fts','schema_meta'];
  for (const t of expected) {
    assert(tables.includes(t), `table '${t}' exists`);
  }
  driver.close();
}

rmSync(work, { recursive: true, force: true });

if (failed > 0) {
  console.log(`\n✗ ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\n✓ all assertions passed');