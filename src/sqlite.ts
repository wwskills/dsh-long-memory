// @wwskills/dsh-long-memory — SQLite driver + migration runner
//
// Driver: wraps node:sqlite (Node ≥ 22.5). The driver abstraction leaves room
// for a future better-sqlite3 backend without changing the migration interface.
//
// Migration runner: append-only, transactional, fail-loud. Reads schema_meta
// to determine which `migrations/NNNN_*.sql` files to apply.

import { readdirSync, readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

/** A single row as returned by the driver (values may be null/number/string/BLOB). */
export type SqlRow = Record<string, unknown>

/** Result of a statement `run`. */
export interface RunResult {
  changes: number
  lastInsertRowid: number
}

/** Compiled statement handle. */
export interface SqlStatement {
  all(...params: unknown[]): SqlRow[]
  get(...params: unknown[]): SqlRow | undefined
  run(...params: unknown[]): RunResult
  iterate(...params: unknown[]): IterableIterator<SqlRow>
  free(): void
}

/**
 * The driver surface this plugin uses — a subset of the better-sqlite3 API, so
 * the rest of the codebase stays driver-agnostic.
 */
export interface SqlDriver {
  readonly kind: string
  readonly raw: unknown
  exec(sql: string): void
  prepare(sql: string): SqlStatement
  /** Wrap `fn` in a SAVEPOINT; rolls back on any thrown error. */
  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R
  close(): void
  pragma(name: string): unknown
}

// ────────────────────────────────────────────────────────────────────────────
// Driver: node:sqlite
// ────────────────────────────────────────────────────────────────────────────

/**
 * Open a SQLite database via node:sqlite.
 * @param path - SQLite file path. Use ':memory:' for tests.
 */
export function openNodeSqlite(path: string, opts: { busyTimeoutMs?: number } = {}): SqlDriver {
  const db = new DatabaseSync(path)

  // PRAGMAs applied outside any transaction (node:sqlite forbids
  // journal_mode changes inside tx; foreign_keys is per-connection).
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA synchronous = NORMAL')
  db.exec('PRAGMA foreign_keys = ON')
  if (opts.busyTimeoutMs) {
    db.exec(`PRAGMA busy_timeout = ${opts.busyTimeoutMs}`)
  }

  return {
    kind: 'node-builtin',
    raw: db,

    exec(sql: string): void {
      db.exec(sql)
    },

    prepare(sql: string): SqlStatement {
      const stmt = db.prepare(sql)
      return {
        all(...params: unknown[]): SqlRow[] {
          return (stmt.all(...params) as SqlRow[]).map(rowidToNumber) as SqlRow[]
        },
        get(...params: unknown[]): SqlRow | undefined {
          return rowidToNumber(stmt.get(...params) as SqlRow | undefined) as SqlRow | undefined
        },
        run(...params: unknown[]): RunResult {
          const r = stmt.run(...params)
          return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }
        },
        iterate(...params: unknown[]): IterableIterator<SqlRow> {
          return mapIterator(rowidToNumber, stmt.iterate(...params) as IterableIterator<SqlRow>)
        },
        free(): void { /* node:sqlite statements are GC-managed */ },
      }
    },

    transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
      return (...args: A): R => {
        db.exec('SAVEPOINT tx')
        try {
          const r = fn(...args)
          db.exec('RELEASE tx')
          return r
        } catch (e) {
          try { db.exec('ROLLBACK TO tx') } catch { /* already rolled back */ }
          throw e
        }
      }
    },

    close(): void {
      db.close()
    },

    pragma(name: string): unknown {
      const row = db.prepare(`PRAGMA ${name}`).get() as SqlRow | undefined
      return row !== undefined ? Object.values(row)[0] : null
    },
  }
}

/**
 * node:sqlite returns rowids as BigInt; convert every BigInt in an object
 * (recursively, depth-bounded) to Number so downstream code can bind them.
 */
function rowidToNumber<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj) as unknown as T
  if (typeof obj !== 'object') return obj
  const out: Record<string, unknown> = Array.isArray(obj) ? [] as unknown as Record<string, unknown> : {}
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[k]
    out[k] = typeof v === 'bigint' ? Number(v)
      : (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) ? rowidToNumber(v)
      : v
  }
  return out as unknown as T
}

function mapIterator(fn: (value: SqlRow) => SqlRow, it: IterableIterator<SqlRow>): IterableIterator<SqlRow> {
  return {
    next(): IteratorResult<SqlRow> {
      const r = it.next()
      if (r.done) return r
      return { value: fn(r.value), done: false }
    },
    [Symbol.iterator](): IterableIterator<SqlRow> {
      return this
    },
    return: it.return?.bind(it),
    throw: it.throw?.bind(it),
  }
}

/** Pick a driver factory. Currently only node-builtin is implemented. */
export function pickDriver(config: { driver?: string } = {}): (path: string, opts: { busyTimeoutMs?: number }) => SqlDriver {
  const requested = config.driver ?? 'node-builtin'
  if (requested === 'node-builtin') return openNodeSqlite
  throw new Error(`sqlite driver "${requested}" not implemented (supported: node-builtin)`)
}

// ────────────────────────────────────────────────────────────────────────────
// Migration runner
// ────────────────────────────────────────────────────────────────────────────

interface MigrationFile {
  name: string
  num: number
}

/**
 * Ensure the DB file's parent directory exists, open with the chosen driver,
 * then run any unapplied migrations from `migrationsDir`.
 */
export function migrate(dbPath: string, migrationsDir: string, opts: { driver?: string, busyTimeoutMs?: number } = {}): { driver: SqlDriver, applied: string[] } {
  mkdirSync(dirname(dbPath), { recursive: true })
  const open = pickDriver(opts)
  const driver = open(dbPath, { busyTimeoutMs: opts.busyTimeoutMs ?? 3000 })

  // schema_meta is created by the first migration (0001). On a DB that
  // already has migrations applied, it exists; on a fresh install, the
  // migration runner will see "no schema_meta yet" and apply everything.
  const applied = readAppliedVersion(driver)
  const files = listMigrationFiles(migrationsDir)
  const newlyApplied: MigrationFile[] = []

  for (const file of files) {
    if (file.num <= applied) continue

    const sql = readFileSync(join(migrationsDir, file.name), 'utf8')

    // Wrap the whole migration in SAVEPOINT so we can roll back cleanly.
    driver.exec('SAVEPOINT mig')
    try {
      driver.exec(sql)
      driver.exec('RELEASE mig')
      newlyApplied.push(file)
    } catch (e) {
      driver.exec('ROLLBACK TO mig')
      driver.close()
      throw new Error(`migration ${file.name} failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (newlyApplied.length > 0) {
    // Use the highest migration file number as the version, not a sequential
    // count (safe with gaps in numbering).
    const maxVersion = newlyApplied.reduce((max, f) => Math.max(max, f.num), applied)
    driver.prepare(
      `INSERT INTO schema_meta(key, value) VALUES('migrations_applied', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(String(maxVersion))
  }

  // Always keep schema version in sync with migrations_applied (covers both
  // fresh installs and existing DBs that were upgraded).
  const currentApplied = readAppliedVersion(driver)
  driver.prepare(
    `INSERT INTO schema_meta(key, value) VALUES('version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(currentApplied))
  return { driver, applied: newlyApplied.map(f => f.name) }
}

function readAppliedVersion(driver: SqlDriver): number {
  try {
    const row = driver.prepare(
      `SELECT value FROM schema_meta WHERE key = 'migrations_applied'`,
    ).get()
    if (row === undefined) return 0
    return Number(row.value) || 0
  } catch (e) {
    // schema_meta doesn't exist yet → fresh install → 0 migrations applied.
    if (e instanceof Error && /no such table/i.test(e.message)) return 0
    throw e
  }
}

function listMigrationFiles(dir: string): MigrationFile[] {
  let names: string[]
  try {
    names = readdirSync(dir).filter(f => f.endsWith('.sql'))
  } catch {
    return []
  }
  return names
    .map(name => {
      const m = /^(\d{4})_(.+)\.sql$/.exec(name)
      if (m === null) throw new Error(`migration file "${name}" does not match NNNN_*.sql`)
      return { name, num: Number(m[1]) }
    })
    .sort((a, b) => a.num - b.num)
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers used by tool implementations
// ────────────────────────────────────────────────────────────────────────────

export function newId(): string {
  return randomUUID()
}

export function nowMs(): number {
  return Date.now()
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}
