#!/usr/bin/env node
// scripts/test-m2.js — M2 KG edges + PageRank coverage

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../lib/sqlite.js';
import { createEdges, runPageRank, refreshCommunities } from '../lib/kg.js';
import { recallHybrid } from '../lib/recall.js';
import { unigramize } from '../lib/cjk.js';

const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-m2-'));
const dbPath = join(work, 'long-memory.db');
const { driver } = migrate(dbPath, join(process.cwd(), 'migrations'), { driver: 'node-builtin' });

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✓', msg);
  else { console.log('  ✗', msg); failed++; }
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Edge creation
// ────────────────────────────────────────────────────────────────────────────
console.log('1. Edge creation');
{
  driver.exec('DELETE FROM edges; DELETE FROM memories;');

  // Insert a memory
  driver.prepare(
    `INSERT INTO memories (id, type, scope, content, origin, observed_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run('m1', 'PREFERENCE', 'user', '用户偏好中文', 'agent', Date.now());

  createEdges(driver, { id: 'm1', type: 'PREFERENCE', scope: 'user' });

  const edges = driver.prepare(`SELECT * FROM edges WHERE src='m1'`).all();
  assert(edges.length >= 2, `≥2 edges for m1 (got ${edges.length})`);
  assert(edges.some((e) => e.predicate === 'BELONGS_TO'), `BELONGS_TO edge exists`);
  assert(edges.some((e) => e.predicate === 'KNOWS'), `KNOWS edge exists`);

  // Supersession
  driver.prepare(
    `INSERT INTO memories (id, type, scope, content, origin, observed_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run('m2', 'PREFERENCE', 'user', '用户偏好英文', 'agent', Date.now());

  createEdges(driver, { id: 'm2', type: 'PREFERENCE', scope: 'user', supersededIds: ['m1'] });

  const supEdge = driver.prepare(
    `SELECT * FROM edges WHERE src='m1' AND dst='m2' AND predicate='SUPERSEDED_BY'`
  ).get();
  assert(!!supEdge, `SUPERSEDED_BY edge m1→m2 exists`);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. PageRank
// ────────────────────────────────────────────────────────────────────────────
console.log('2. PageRank');
{
  const scores = runPageRank(driver, ['m1', 'm2']);
  assert(scores.size >= 2, `≥2 nodes in PageRank result (got ${scores.size})`);
  for (const [id, score] of scores.entries()) {
    assert(typeof score === 'number' && score >= 0 && score <= 1, `${id} score ${score} in [0,1]`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Hybrid recall (FTS5 + PageRank)
// ────────────────────────────────────────────────────────────────────────────
console.log('3. Hybrid recall');
{
  // FTS5 needs unigramized content for CJK
  driver.prepare('INSERT INTO memories_fts(rowid, content) VALUES ((SELECT rowid FROM memories WHERE id=?), ?)').run('m1', unigramize('用户偏好中文'));
  driver.prepare('INSERT INTO memories_fts(rowid, content) VALUES ((SELECT rowid FROM memories WHERE id=?), ?)').run('m2', unigramize('用户偏好英文'));

  const r = recallHybrid(driver, { query: '中文', limit: 5 });
  assert(r.hits.length >= 1, `≥1 hybrid hit for "中文" (got ${r.hits.length})`);
  assert(r.score_path === 'hybrid', `score_path='hybrid' (got ${r.score_path})`);
  assert(r.hits[0].score >= 0 && r.hits[0].score <= 1, `hybrid score in [0,1]`);
}

// ────────────────────────────────────────────────────────────────────────────
// 4. FTS5 fallback (no edges)
// ────────────────────────────────────────────────────────────────────────────
console.log('4. FTS5 fallback (empty edges)');
{
  driver.exec('DELETE FROM edges;');
  const r = recallHybrid(driver, { query: '中文', limit: 5 });
  assert(r.score_path === 'fts5-only', `no edges → fts5-only (got ${r.score_path})`);
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Communities
// ────────────────────────────────────────────────────────────────────────────
console.log('5. Communities');
{
  refreshCommunities(driver);
  const comms = driver.prepare(`SELECT * FROM communities`).all();
  assert(comms.length >= 1, `≥1 community (got ${comms.length})`);
  assert(comms.every((c) => c.summary.length > 0), `every community has a summary`);
  const members = JSON.parse(comms[0].members);
  assert(Array.isArray(members) && members.length > 0, `community has members`);
}

driver.close();
rmSync(work, { recursive: true, force: true });

if (failed > 0) {
  console.log(`\n✗ ${failed} M2 assertion(s) failed`);
  process.exit(1);
}
console.log('\n✓ all M2 assertions passed');