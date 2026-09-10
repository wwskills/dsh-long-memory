import { unigramize } from "./cjk.js";
function ftsInsert(driver, rowid, content) {
  driver.prepare(
    `INSERT INTO memories_fts(rowid, content) VALUES (?, ?)`
  ).run(rowid, unigramize(content));
}
function ftsDelete(driver, rowid, content) {
  driver.prepare(
    `INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', ?, ?)`
  ).run(rowid, unigramize(content));
}
function ftsUpdate(driver, rowid, oldContent, newContent) {
  driver.transaction(() => {
    ftsDelete(driver, rowid, oldContent);
    ftsInsert(driver, rowid, newContent);
  })();
}
export {
  ftsDelete,
  ftsInsert,
  ftsUpdate
};
//# sourceMappingURL=fts5-sync.js.map
