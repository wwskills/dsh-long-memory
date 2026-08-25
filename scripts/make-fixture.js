#!/usr/bin/env node
// scripts/make-fixture.js — generate an "old version" fixture DB for migration tests.
//
// Usage: node scripts/make-fixture.js <out-dir>
//   Creates <out-dir>/old.db with schema_version=1 applied via the migration
//   runner. The fixture can then be passed to test-migration.js to verify
//   idempotency and upgrade paths.
//
// We deliberately use the real 0001_initial.sql — the "old" fixture IS our
// current schema. Future tests will copy it and apply migrations on top.

import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const outDir = process.argv[2] ?? './fixtures';
if (!existsSync(outDir)) {
  const { mkdirSync } = await import('node:fs');
  mkdirSync(outDir, { recursive: true });
}

// Build a temp DB, run the migration, copy it to fixtures/old.db, then clean up.
const work = mkdtempSync(join(tmpdir(), 'dsh-longmem-fixture-'));
const dbPath = join(work, 'long-memory.db');

const code = `
import { migrate } from '${process.cwd()}/lib/sqlite.js';
const { driver, applied } = migrate('${dbPath}', '${process.cwd()}/migrations', { driver: 'node-builtin' });
console.log(JSON.stringify({ applied, dbPath: '${dbPath}' }));
driver.close();
`;

const tmpScript = join(work, 'build.mjs');
const { writeFileSync } = await import('node:fs');
writeFileSync(tmpScript, code);

const result = spawnSync('node', [tmpScript], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error('fixture build failed:', result.stderr);
  process.exit(1);
}
const parsed = JSON.parse(result.stdout.trim());
console.log('built fixture:', parsed);

// Copy to fixtures/
const target = join(outDir, 'old.db');
const { copyFileSync } = await import('node:fs');
copyFileSync(dbPath, target);
console.log('wrote', target);

// Clean up temp dir.
rmSync(work, { recursive: true, force: true });