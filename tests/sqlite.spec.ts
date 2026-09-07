// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from '../src/sqlite.js'
import { runInvariants } from '../src/invariant.js'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

function tempDbPath(): { dir: string, path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-long-memory-'))
  return { dir, path: join(dir, 'test.db') }
}

describe('migrate', () => {
  it('applies all four migrations to a fresh database', () => {
    const { dir, path } = tempDbPath()
    try {
      const { driver, applied } = migrate(path, MIGRATIONS_DIR, { driver: 'node-builtin' })
      expect(applied).toHaveLength(4)
      const version = driver.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get() as { value: unknown }
      expect(Number(version.value)).toBe(4)
      driver.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('is idempotent — a second open applies nothing new', () => {
    const { dir, path } = tempDbPath()
    try {
      const first = migrate(path, MIGRATIONS_DIR, { driver: 'node-builtin' })
      first.driver.close()
      const second = migrate(path, MIGRATIONS_DIR, { driver: 'node-builtin' })
      expect(second.applied).toHaveLength(0)
      second.driver.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('creates the memories + memories_fts tables', () => {
    const { dir, path } = tempDbPath()
    try {
      const { driver } = migrate(path, MIGRATIONS_DIR, { driver: 'node-builtin' })
      const tables = driver.prepare(
        `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`,
      ).all() as Array<{ name: string }>
      const names = tables.map(t => t.name)
      expect(names).toContain('memories')
      expect(names).toContain('memories_fts')
      expect(names).toContain('audit_log')
      driver.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('runInvariants', () => {
  it('enforces the append-only audit_log contract', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-long-memory-inv-'))
    try {
      const result = await runInvariants({ tmpDir: dir })
      expect(result.passed).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
