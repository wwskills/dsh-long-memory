// Standalone invariant assertions, runnable independently of the migration
// suite. Verifies the append-only audit_log contract enforced by SQLite
// triggers.
//
// Usage: import { runInvariants } from './invariant.js'

import { migrate } from './sqlite.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export async function runInvariants(opts: { tmpDir: string }): Promise<{ passed: true }> {
  const path = `${opts.tmpDir}/invariant.db`
  const migrationsDir = resolveMigrationsDir()
  const { driver } = migrate(path, migrationsDir, { driver: 'node-builtin' })

  // Append-only audit_log: triggers must reject UPDATE and DELETE.
  driver.prepare(
    `INSERT INTO audit_log (id, actor, action, created_at) VALUES ('a', 'user', 'record', 0)`,
  ).run()
  try {
    driver.prepare(`UPDATE audit_log SET actor = 'x' WHERE id = 'a'`).run()
    throw new Error('invariant failed: audit_log UPDATE should have been rejected')
  } catch (e) {
    if (!(e instanceof Error) || !/append-only/.test(e.message)) throw e
  }
  try {
    driver.prepare(`DELETE FROM audit_log WHERE id = 'a'`).run()
    throw new Error('invariant failed: audit_log DELETE should have been rejected')
  } catch (e) {
    if (!(e instanceof Error) || !/append-only/.test(e.message)) throw e
  }

  driver.close()
  return { passed: true }
}

function resolveMigrationsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return join(here, '..', 'migrations')
}
