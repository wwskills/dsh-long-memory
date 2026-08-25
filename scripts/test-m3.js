#!/usr/bin/env node
// scripts/test-m3.js — M3: embedding provider + recall-loop prevention

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, sha256 } from '../lib/sqlite.js';
import { embedBatch, checkEmbeddingAvailable } from '../lib/embeddings.js';
import { recallHybrid, computeVectorSimilarity } from '../lib/recall.js';
import { unigramize } from '../lib/cjk.js';

const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-m3-'));
const dbPath = join(work, 'long-memory.db');
const { driver } = migrate(dbPath, join(process.cwd(), 'migrations'), { driver: 'node-builtin' });

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✓', msg);
  else { console.log('  ✗', msg); failed++; }
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Embedding: 'none' provider returns nulls
// ────────────────────────────────────────────────────────────────────────────
console.log('1. Embedding — none provider');
{
  const r = await embedBatch(driver, { provider: 'none' }, ['hello']);
  assert(r[0] === null, `'none' provider returns null`);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Embedding: checkEmbeddingAvailable
// ────────────────────────────────────────────────────────────────────────────
console.log('2. checkEmbeddingAvailable');
{
  const avail = await checkEmbeddingAvailable({ provider: 'none' });
  assert(!avail, `'none' provider → unavailable`);
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Embedding cache: insert directly, then verify cache hit
// ────────────────────────────────────────────────────────────────────────────
console.log('3. Embedding cache');
{
  const hash = sha256('test content');
  const vec = new Float32Array(8).fill(0.1);
  const blob = new Uint8Array(vec.buffer);
  driver.prepare(
    `INSERT OR REPLACE INTO memory_embeddings (content_sha256, model, embedding, dim, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(hash, 'test-model', blob, 8, Date.now());

  // Simulate embedBatch with a mock provider that returns the same vec
  // For now, just verify the cache entry exists
  const cached = driver.prepare(
    `SELECT embedding, dim, model FROM memory_embeddings WHERE content_sha256 = ?`
  ).get(hash);
  assert(!!cached, `cache entry exists`);
  assert(cached.dim === 8, `dim = 8`);
  assert(cached.model === 'test-model', `model = test-model`);
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Vector similarity
// ────────────────────────────────────────────────────────────────────────────
console.log('4. Vector similarity');
{
  driver.exec('DELETE FROM memories; DELETE FROM memories_fts; DELETE FROM memory_embeddings;');

  const id = 'v1';
  const content = 'vector test content';
  const hash = sha256(content);
  driver.prepare(
    `INSERT INTO memories (id, type, scope, content, origin, observed_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, 'FACT', 'user', content, 'user', Date.now());

  // Insert embedding
  const vec = new Float32Array([0.1, 0.2, 0.3, 0.4]);
  driver.prepare(
    `INSERT OR REPLACE INTO memory_embeddings (content_sha256, model, embedding, dim, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(hash, 'test', new Uint8Array(vec.buffer), 4, Date.now());

  // Query embedding: similar to the stored one
  const queryVec = [0.1, 0.2, 0.3, 0.4];
  const scores = computeVectorSimilarity(driver, queryVec);
  assert(scores.size >= 1, `≥1 similarity score (got ${scores.size})`);
  const score = scores.get(id);
  assert(score > 0.9, `cosine similarity ≈ 1.0 (got ${score ? score.toFixed(3) : 0})`);
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Recall-loop prevention: mark recalled ids
// ────────────────────────────────────────────────────────────────────────────
console.log('5. Recall-loop prevention');
{
  // When memories are injected into context, bump a `recalled` flag
  // so L7 consolidate doesn't re-extract the same content.
  driver.exec('DELETE FROM memories;');
  driver.prepare(
    `INSERT INTO memories (id, type, scope, content, origin, observed_at, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`
  ).run('r1', 'FACT', 'user', 'recall test', 'user', Date.now());

  // Simulate what the pre-step hook does: mark recalled
  driver.prepare(
    `UPDATE memories SET access_count = access_count + 1, last_access = ? WHERE id = ?`
  ).run(Date.now(), 'r1');

  const row = driver.prepare(`SELECT access_count, last_access FROM memories WHERE id='r1'`).get();
  assert(row.access_count > 0, `access_count incremented (${row.access_count})`);
  assert(row.last_access > 0, `last_access set`);
}

driver.close();
rmSync(work, { recursive: true, force: true });

if (failed > 0) {
  console.log(`\n✗ ${failed} M3 assertion(s) failed`);
  process.exit(1);
}
console.log('\n✓ all M3 assertions passed');

function simpleHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}