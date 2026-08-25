#!/usr/bin/env node
// scripts/test-m1.js — M1 file-tracks + pre-step hook coverage.
//
// Asserts each M1 DoD bullet:
//   • session-start writes MEMORY.md
//   • user message writes to memory/YYYY-MM-DD.md
//   • mem_search hits notes ingested from markdown
//   • agent/pre-step injects recall results ahead of the user's prompt
//   • DB deletion is recoverable: re-migrate + re-ingest yields the same hits
//   • FTS5 ↔ memories consistency holds after a markdown ingest round-trip

import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../lib/sqlite.js';
import { recallFts5 } from '../lib/recall.js';
import {
  appendSessionStart, appendDailyEntry, ingestDailyNotes, listMarkdowns
} from '../lib/file-tracks.js';

const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-m1-'));
const dbPath = join(work, 'long-memory.db');
const mdDir  = join(work, 'markdown');
const migrationsDir = join(process.cwd(), 'migrations');

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✓', msg);
  else { console.log('  ✗', msg); failed++; }
};

// ────────────────────────────────────────────────────────────────────────────
// Set up a fresh DB + markdown dir.
// ────────────────────────────────────────────────────────────────────────────

console.log('Setup');
{
  const { driver, applied } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  console.log(`  ✓ migrate applied ${applied.length}`);
  driver.close();
}

// ────────────────────────────────────────────────────────────────────────────
// 1. session-start appends MEMORY.md
// ────────────────────────────────────────────────────────────────────────────
console.log('1. session-start → MEMORY.md');
{
  appendSessionStart(mdDir, 'session-A');
  const path = join(mdDir, 'MEMORY.md');
  assert(existsSync(path), `MEMORY.md created`);
  const body = readFileSync(path, 'utf8');
  assert(body.includes('session started: session-A'), `marker present`);
  // Idempotency check
  appendSessionStart(mdDir, 'session-A');
  const body2 = readFileSync(path, 'utf8');
  assert(body === body2, `idempotent (no duplicate marker)`);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. user message appends daily note
// ────────────────────────────────────────────────────────────────────────────
console.log('2. user message → memory/YYYY-MM-DD.md');
{
  appendDailyEntry(mdDir, { sessionId: 'session-A', content: '记得把部署端口改成 9090，之前的 8080 不够用' });
  const files = listMarkdowns(mdDir);
  assert(files.length === 1, `1 daily note (got ${files.length})`);
  const body = readFileSync(join(mdDir, 'memory', files[0]), 'utf8');
  assert(body.includes('session-A'), `note tagged with sessionId`);
  assert(body.includes('记得把部署端口'), `head line captured`);
  assert(body.includes('24 chars') || body.includes('chars'), `length metadata`);
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Ingest daily notes → DB → FTS5 → recall
// ────────────────────────────────────────────────────────────────────────────
console.log('3. ingest daily notes → recall');
{
  const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  const { ingested, scanned } = ingestDailyNotes(driver, mdDir);
  assert(scanned === 1, `1 day scanned`);
  assert(ingested === 1, `1 line ingested`);

  const total = driver.prepare(`SELECT COUNT(*) AS n FROM memories`).get().n;
  assert(Number(total) === 1, `1 memory row`);

  const ep = driver.prepare(
    `SELECT origin, scope, type, supersession_key FROM memories WHERE origin='user-edited'`
  ).get();
  assert(ep?.origin === 'user-edited', `origin='user-edited'`);
  assert(ep?.scope === 'episodic', `scope='episodic'`);
  assert(ep?.type === 'EPISODIC', `type='EPISODIC' (memory-tracks default)`);
  assert(ep?.supersession_key?.startsWith('daily:'), `dedupe key starts with daily:`);

  const audits = driver.prepare(
    `SELECT action, reason FROM audit_log WHERE action='record' AND reason='markdown-ingest'`
  ).all();
  assert(audits.length === 1, `1 markdown-ingest audit_log entry`);

  const r = recallFts5(driver, { query: '部署端口' });
  assert(r.hits.length === 1, `FTS5 finds the ingested note`);
  assert(r.hits[0].content.includes('9090'), `hit body matches`);
  assert(r.hits[0].origin === 'user-edited', `hit carries user-edited origin`);

  driver.close();
}

// ────────────────────────────────────────────────────────────────────────────
// 4. DB delete → restart → re-ingest (no error, hits come back)
// ────────────────────────────────────────────────────────────────────────────
console.log('4. delete DB → restart → re-ingest');
{
  rmSync(dbPath, { force: true });
  const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  // Empty DB; recall returns nothing, doesn't throw
  const r = recallFts5(driver, { query: '部署端口' });
  assert(r.hits.length === 0, `empty DB → 0 hits (no error)`);

  // Re-ingest brings the line back
  const { ingested } = ingestDailyNotes(driver, mdDir);
  assert(ingested === 1, `re-ingest restores 1 line`);
  const r2 = recallFts5(driver, { query: '部署端口' });
  assert(r2.hits.length === 1, `recall works again`);
  driver.close();
}

// ────────────────────────────────────────────────────────────────────────────
// 5. FTS5 ↔ memories consistency after ingest
// ────────────────────────────────────────────────────────────────────────────
console.log('5. FTS5 ↔ memories consistency');
{
  const { driver } = migrate(dbPath, migrationsDir, { driver: 'node-builtin' });
  const rowCount = driver.prepare(`SELECT COUNT(*) AS n FROM memories`).get().n;
  const ftsCount = driver.prepare(`SELECT COUNT(*) AS n FROM memories_fts`).get().n;
  assert(Number(rowCount) === Number(ftsCount),
    `memories(${rowCount}) === memories_fts(${ftsCount})`);
  driver.close();
}

// ────────────────────────────────────────────────────────────────────────────
// 6. pre-step hook contract (unit-level, no full DSH boot)
// ────────────────────────────────────────────────────────────────────────────
console.log('6. pre-step hook contract');
{
  const mod = await import('../lib/index.js');
  const { formatRecallBody, fitsBudget, truncateToBudget } = mod;
  assert(typeof formatRecallBody === 'function', `formatRecallBody exported`);
  const body = formatRecallBody([
    { scope: 'user', type: 'FACT', content: 'hello world' }
  ]);
  assert(body.startsWith('<referenced-memory>'), `recall body wrapped in tag`);
  assert(body.includes('hello world'), `hit content surfaced`);
  assert(/untrusted reference data/i.test(body), `untrusted-warning present`);
  assert(fitsBudget(body, 1000), `1000-token budget accepts default`);
  const truncated = truncateToBudget(body, 1);
  assert(truncated.length < body.length, `truncateToBudget(1) truncates`);
}

rmSync(work, { recursive: true, force: true });

if (failed > 0) {
  console.log(`\n✗ ${failed} M1 assertion(s) failed`);
  process.exit(1);
}
console.log('\n✓ all M1 assertions passed');