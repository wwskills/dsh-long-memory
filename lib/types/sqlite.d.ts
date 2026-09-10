/** A single row as returned by the driver (values may be null/number/string/BLOB). */
export type SqlRow = Record<string, unknown>;
/** Result of a statement `run`. */
export interface RunResult {
    changes: number;
    lastInsertRowid: number;
}
/** Compiled statement handle. */
export interface SqlStatement {
    all(...params: unknown[]): SqlRow[];
    get(...params: unknown[]): SqlRow | undefined;
    run(...params: unknown[]): RunResult;
    iterate(...params: unknown[]): IterableIterator<SqlRow>;
    free(): void;
}
/**
 * The driver surface this plugin uses — a subset of the better-sqlite3 API, so
 * the rest of the codebase stays driver-agnostic.
 */
export interface SqlDriver {
    readonly kind: string;
    readonly raw: unknown;
    exec(sql: string): void;
    prepare(sql: string): SqlStatement;
    /** Wrap `fn` in a SAVEPOINT; rolls back on any thrown error. */
    transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
    close(): void;
    pragma(name: string): unknown;
}
/**
 * Open a SQLite database via node:sqlite.
 * @param path - SQLite file path. Use ':memory:' for tests.
 */
export declare function openNodeSqlite(path: string, opts?: {
    busyTimeoutMs?: number;
}): SqlDriver;
/** Pick a driver factory. Currently only node-builtin is implemented. */
export declare function pickDriver(config?: {
    driver?: string;
}): (path: string, opts: {
    busyTimeoutMs?: number;
}) => SqlDriver;
/**
 * Ensure the DB file's parent directory exists, open with the chosen driver,
 * then run any unapplied migrations from `migrationsDir`.
 */
export declare function migrate(dbPath: string, migrationsDir: string, opts?: {
    driver?: string;
    busyTimeoutMs?: number;
}): {
    driver: SqlDriver;
    applied: string[];
};
export declare function newId(): string;
export declare function nowMs(): number;
export declare function sha256(text: string): string;
//# sourceMappingURL=sqlite.d.ts.map