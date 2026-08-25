// @wwskills/dsh-long-memory — invariant tests
//
// Standalone invariant assertions that can be run independently of the
// test-migration suite. Verifies the append-only audit_log contract
// enforced by SQLite triggers.
//
// Usage: import { runInvariants } from './invariant.js';

import { migrate, pickDriver } from './sqlite.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export async function runInvariants({ tmpDir }) {
  const path = `${tmpDir}/invariant.db`;
  const migrationsDir = resolveMigrationsDir();
  const { driver } = migrate(path, migrationsDir, { driver: 'node-builtin' });

  // Append-only audit_log: triggers must reject UPDATE and DELETE.
  const fail = (msg) => { throw new Error(`invariant failed: ${msg}`); };
  driver.prepare(
    `INSERT INTO audit_log (id, actor, action, created_at) VALUES ('a', 'user', 'record', 0)`
  ).run();
  try {
    driver.prepare(`UPDATE audit_log SET actor = 'x' WHERE id = 'a'`).run();
    fail('audit_log UPDATE should have been rejected');
  } catch (e) {
    if (!/append-only/.test(e.message)) throw e;
  }
  try {
    driver.prepare(`DELETE FROM audit_log WHERE id = 'a'`).run();
    fail('audit_log DELETE should have been rejected');
  } catch (e) {
    if (!/append-only/.test(e.message)) throw e;
  }

  driver.close();
  return { passed: true };
}

function resolveMigrationsDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', 'migrations');
}
