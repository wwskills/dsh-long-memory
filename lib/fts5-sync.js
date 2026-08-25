// @wwskills/dsh-long-memory — application-side FTS5 sync
//
// SQLite triggers cannot invoke external tokenisers, so we maintain
// `memories_fts` explicitly here. The `memories.content` column keeps the
// original (human-readable) value; `memories_fts.content` carries the
// CJK-unigramised form so Chinese recall works.
//
// All three primitives are idempotent: re-syncing a row that is already in
// sync is a no-op.

import { unigramize } from './cjk.js';

/** Index a single row's content under its rowid. */
export function ftsInsert(driver, rowid, content) {
  driver.prepare(
    `INSERT INTO memories_fts(rowid, content) VALUES (?, ?)`
  ).run(rowid, unigramize(content));
}

/** Remove a single row's index entry. */
export function ftsDelete(driver, rowid, content) {
  driver.prepare(
    `INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', ?, ?)`
  ).run(rowid, unigramize(content));
}

/** Replace a row's index entry (delete + insert in one transaction). */
export function ftsUpdate(driver, rowid, oldContent, newContent) {
  driver.transaction(() => {
    ftsDelete(driver, rowid, oldContent);
    ftsInsert(driver, rowid, newContent);
  })();
}