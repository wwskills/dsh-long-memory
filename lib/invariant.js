// src/sqlite.ts
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
function openNodeSqlite(path, opts = {}) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA foreign_keys = ON");
  if (opts.busyTimeoutMs) {
    db.exec(`PRAGMA busy_timeout = ${opts.busyTimeoutMs}`);
  }
  return {
    kind: "node-builtin",
    raw: db,
    exec(sql) {
      db.exec(sql);
    },
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
        free() {
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        db.exec("SAVEPOINT tx");
        try {
          const r = fn(...args);
          db.exec("RELEASE tx");
          return r;
        } catch (e) {
          try {
            db.exec("ROLLBACK TO tx");
          } catch {
          }
          throw e;
        }
      };
    },
    close() {
      db.close();
    },
    pragma(name) {
      const row = db.prepare(`PRAGMA ${name}`).get();
      return row !== void 0 ? Object.values(row)[0] : null;
    }
  };
}
function rowidToNumber(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    out[k] = typeof v === "bigint" ? Number(v) : v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) ? rowidToNumber(v) : v;
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
    [Symbol.iterator]() {
      return this;
    },
    return: it.return?.bind(it),
    throw: it.throw?.bind(it)
  };
}
function pickDriver(config = {}) {
  const requested = config.driver ?? "node-builtin";
  if (requested === "node-builtin") return openNodeSqlite;
  throw new Error(`sqlite driver "${requested}" not implemented (supported: node-builtin)`);
}
function migrate(dbPath, migrationsDir, opts = {}) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const open = pickDriver(opts);
  const driver = open(dbPath, { busyTimeoutMs: opts.busyTimeoutMs ?? 3e3 });
  const applied = readAppliedVersion(driver);
  const files = listMigrationFiles(migrationsDir);
  const newlyApplied = [];
  for (const file of files) {
    if (file.num <= applied) continue;
    const sql = readFileSync(join(migrationsDir, file.name), "utf8");
    driver.exec("SAVEPOINT mig");
    try {
      driver.exec(sql);
      driver.exec("RELEASE mig");
      newlyApplied.push(file);
    } catch (e) {
      driver.exec("ROLLBACK TO mig");
      driver.close();
      throw new Error(`migration ${file.name} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (newlyApplied.length > 0) {
    const maxVersion = newlyApplied.reduce((max, f) => Math.max(max, f.num), applied);
    driver.prepare(
      `INSERT INTO schema_meta(key, value) VALUES('migrations_applied', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(maxVersion));
  }
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
    if (row === void 0) return 0;
    return Number(row.value) || 0;
  } catch (e) {
    if (e instanceof Error && /no such table/i.test(e.message)) return 0;
    throw e;
  }
}
function listMigrationFiles(dir) {
  let names;
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  } catch {
    return [];
  }
  return names.map((name) => {
    const m = /^(\d{4})_(.+)\.sql$/.exec(name);
    if (m === null) throw new Error(`migration file "${name}" does not match NNNN_*.sql`);
    return { name, num: Number(m[1]) };
  }).sort((a, b) => a.num - b.num);
}

// src/invariant.ts
import { fileURLToPath } from "node:url";
import { dirname as dirname2, join as join2 } from "node:path";
async function runInvariants(opts) {
  const path = `${opts.tmpDir}/invariant.db`;
  const migrationsDir = resolveMigrationsDir();
  const { driver } = migrate(path, migrationsDir, { driver: "node-builtin" });
  driver.prepare(
    `INSERT INTO audit_log (id, actor, action, created_at) VALUES ('a', 'user', 'record', 0)`
  ).run();
  try {
    driver.prepare(`UPDATE audit_log SET actor = 'x' WHERE id = 'a'`).run();
    throw new Error("invariant failed: audit_log UPDATE should have been rejected");
  } catch (e) {
    if (!(e instanceof Error) || !/append-only/.test(e.message)) throw e;
  }
  try {
    driver.prepare(`DELETE FROM audit_log WHERE id = 'a'`).run();
    throw new Error("invariant failed: audit_log DELETE should have been rejected");
  } catch (e) {
    if (!(e instanceof Error) || !/append-only/.test(e.message)) throw e;
  }
  driver.close();
  return { passed: true };
}
function resolveMigrationsDir() {
  const here = dirname2(fileURLToPath(import.meta.url));
  return join2(here, "..", "migrations");
}
export {
  runInvariants
};
//# sourceMappingURL=invariant.js.map
