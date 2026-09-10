import type { SqlDriver } from './sqlite.js';
/** Index a single row's content under its rowid. */
export declare function ftsInsert(driver: SqlDriver, rowid: number, content: string): void;
/** Remove a single row's index entry. */
export declare function ftsDelete(driver: SqlDriver, rowid: number, content: string): void;
/** Replace a row's index entry (delete + insert in one transaction). */
export declare function ftsUpdate(driver: SqlDriver, rowid: number, oldContent: string, newContent: string): void;
//# sourceMappingURL=fts5-sync.d.ts.map