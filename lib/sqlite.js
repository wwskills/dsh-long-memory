// @wwskills/dsh-long-memory — SQLite driver + migration runner
//
// Driver: wraps node:sqlite (Node ≥ 22.5). The driver abstraction leaves room
// for a future better-sqlite3 backend (§17.5 risk 7) without changing the
// migration interface.
//
// Migration runner: append-only, transactional, fail-loud (§16). Reads
// schema_meta to determine which `migrations/NNNN_*.sql` files to apply.

import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

// ────────────────────────────────────────────────────────────────────────────
// Driver: node:sqlite
// ────────────────────────────────────────────────────────────────────────────

/**
 * Open a SQLite database via node:sqlite. The returned object exposes the
 * subset of the better-sqlite3 API that this plugin uses, so the rest of the
 * codebase does not depend on the underlying driver.
 *
 * @param {string} path - SQLite file path. Use ':memory:' for tests.
 * @param {{ busyTimeoutMs?: number }} [opts]
 * @returns Driver handle with { exec, prepare, transaction, close, pragma }
 */
export function openNodeSqlite(path, opts = {}) {
  const db = new DatabaseSync(path);

  // PRAGMAs applied outside any transaction (node:sqlite forbids
  // journal_mode changes inside tx; foreign_keys is per-connection).
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  if (opts.busyTimeoutMs) {
    db.exec(`PRAGMA busy_timeout = ${opts.busyTimeoutMs}`);
  }

  return {
    kind: 'node-builtin',
    raw: db,

    /** Execute one or more SQL statements verbatim. */
    exec(sql) {
      db.exec(sql);
    },

    /** Compile a statement. Returns { all, get, run, iterate, free }. */
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        all(...params) {
          return stmt.all(...params).map(rowidToNumber);
        },
        get(...params) {
          return rowidToNumber(stmt.get(...params));
        },
        run(...params) {
          const r = stmt.run(...params);
          return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
        },
        iterate(...params) {
          return mapIterator(rowidToNumber, stmt.iterate(...params));
        },
        free() { /* node:sqlite statements are GC-managed */ }
      };
    },

    /**
     * Run `fn` inside a SAVEPOINT. fn may call other methods on the driver.
     * Rolls back on any thrown error.
     */
    transaction(fn) {
      return (...args) => {
        db.exec('SAVEPOINT tx');
        try {
          const r = fn(...args);
          db.exec('RELEASE tx');
          return r;
        } catch (e) {
          try { db.exec('ROLLBACK TO tx'); } catch {}
          throw e;
        }
      };
    },

    close() { db.close(); },

    pragma(name) {
      const row = db.prepare(`PRAGMA ${name}`).get();
      return row ? Object.values(row)[0] : null;
    }
  };
}

/**
 * node:sqlite returns rowids as BigInt; convert every BigInt in an object
 * (recursively, depth-bounded) to Number so downstream code can bind them.
 */
function rowidToNumber(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    out[k] = typeof v === 'bigint' ? Number(v)
           : (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) ? rowidToNumber(v)
           : v;
  }
  return out;
}

function mapIterator(fn, it) {
  return {
    next() {
      const r = it.next();
      if (r.done) return r;
      return { value: fn(r.value), done: false };
    },
    [Symbol.iterator]() { return this; },
    return: it.return?.bind(it),
    throw: it.throw?.bind(it)
  };
}

/**
 * Pick a driver. M0 only supports node-builtin. M2+ will add better-sqlite3.
 * @param {{ driver?: string }} config
 */
export function pickDriver(config = {}) {
  const requested = config.driver ?? 'node-builtin';
  if (requested === 'node-builtin') return openNodeSqlite;
  // Future: requested === 'better-sqlite3' -> return openBetterSqlite3
  throw new Error(`sqlite driver "${requested}" not implemented (M0 supports: node-builtin)`);
}

// ────────────────────────────────────────────────────────────────────────────
// Migration runner
// ────────────────────────────────────────────────────────────────────────────

/**
 * Ensure the DB file's parent directory exists, then open with the chosen
 * driver, then run any unapplied migrations from `migrationsDir`.
 *
 * @param {string} dbPath
 * @param {string} migrationsDir
 * @param {{ driver?: string, busyTimeoutMs?: number }} opts
 * @returns {{ driver, applied: string[] }}
 */
export function migrate(dbPath, migrationsDir, opts = {}) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const open = pickDriver(opts);
  const driver = open(dbPath, { busyTimeoutMs: opts.busyTimeoutMs ?? 3000 });

  // schema_meta is created by the first migration (0001). On a DB that
  // already has migrations applied, it exists; on a fresh install, the
  // migration runner will see "no schema_meta yet" and apply everything.
  const applied = readAppliedVersion(driver);
  const files = listMigrationFiles(migrationsDir);
  const newlyApplied = [];

  for (const file of files) {
    const num = file.num;
    if (num <= applied) continue;

    const sql = readFileSync(join(migrationsDir, file.name), 'utf8');

    // Wrap the whole migration in SAVEPOINT so we can roll back cleanly.
    // Schema-version tracking lives at the end of each migration file
    // (INSERT INTO schema_meta ... 'version' = N).
    driver.exec('SAVEPOINT mig');
    try {
      driver.exec(sql);
      driver.exec('RELEASE mig');
      newlyApplied.push(file);
    } catch (e) {
      driver.exec('ROLLBACK TO mig');
      driver.close();
      throw new Error(`migration ${file.name} failed: ${e.message}`);
    }
  }

  if (newlyApplied.length > 0) {
    // Use the highest migration file number as the version,
    // not a sequential count (safe with gaps in numbering).
    const maxVersion = newlyApplied.reduce((max, f) => Math.max(max, f.num), applied);
    driver.prepare(
      `INSERT INTO schema_meta(key, value) VALUES('migrations_applied', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(maxVersion));
  }

  // Always keep schema version in sync with migrations_applied
  // (covers both fresh installs and existing DBs that were upgraded).
  const currentApplied = readAppliedVersion(driver);
  driver.prepare(
    `INSERT INTO schema_meta(key, value) VALUES('version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(String(currentApplied));
  return { driver, applied: newlyApplied.map((f) => f.name) };
}

function readAppliedVersion(driver) {
  try {
    const row = driver.prepare(
      `SELECT value FROM schema_meta WHERE key = 'migrations_applied'`
    ).get();
    if (!row) return 0;
    return Number(row.value) || 0;
  } catch (e) {
    // schema_meta doesn't exist yet → fresh install → 0 migrations applied.
    if (/no such table/i.test(e.message)) return 0;
    throw e;
  }
}

function listMigrationFiles(dir) {
  let names;
  try {
    names = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  } catch {
    return [];
  }
  return names
    .map((name) => {
      const m = /^(\d{4})_(.+)\.sql$/.exec(name);
      if (!m) throw new Error(`migration file "${name}" does not match NNNN_*.sql`);
      return { name, num: Number(m[1]) };
    })
    .sort((a, b) => a.num - b.num);
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers used by tool implementations
// ────────────────────────────────────────────────────────────────────────────

export function newId() {
  return randomUUID();
}

export function nowMs() {
  return Date.now();
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}