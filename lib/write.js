import { newId, nowMs } from "./sqlite.js";
import { ftsInsert, ftsDelete } from "./fts5-sync.js";
import { writeAuditLog } from "./audit.js";
import { createEdges } from "./kg.js";
import { embedBatch } from "./embeddings.js";
function writeMemory(driver, params, embeddingConfig, audit = {}) {
  const {
    type,
    scope,
    content,
    origin = "agent",
    sessionKind = "interactive",
    sessionId = null,
    lang = null,
    supersessionKey = null,
    confidence = 1,
    accessCount = 0,
    status = "active"
  } = params;
  const id = params.id || newId();
  const ts = params.observedAt || nowMs();
  const result = driver.prepare(
    `INSERT INTO memories
       (id, type, scope, content, origin, session_kind, session_id, lang,
        schema_version, observed_at, supersession_key, confidence,
        access_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
  ).run(
    id,
    type,
    scope,
    content,
    origin,
    sessionKind,
    sessionId,
    lang,
    ts,
    supersessionKey,
    confidence,
    accessCount,
    status
  );
  const rowid = Number(result.lastInsertRowid);
  ftsInsert(driver, rowid, content);
  try {
    createEdges(driver, { id, type, scope });
  } catch {
  }
  if (embeddingConfig && embeddingConfig.provider !== "none") {
    void embedBatch(driver, embeddingConfig, [content]).catch(() => {
    });
  }
  if (audit.action) {
    writeAuditLog(driver, {
      actor: audit.actor || "system",
      action: audit.action,
      targetId: id,
      targetKind: "memory",
      scope,
      reason: audit.reason,
      newValue: { id, type, content: content.slice(0, 200), confidence },
      sessionId: sessionId ?? void 0
    });
  }
  return { id, rowid };
}
function deleteMemory(driver, id, hard = false, audit = {}) {
  const row = driver.prepare(`SELECT rowid, content, type, scope, status FROM memories WHERE id = ?`).get(id);
  if (row === void 0) return false;
  if (hard) {
    driver.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
  } else {
    driver.prepare(`UPDATE memories SET status = 'archived' WHERE id = ?`).run(id);
  }
  if (hard) {
    try {
      ftsDelete(driver, Number(row.rowid), String(row.content));
    } catch {
    }
  }
  if (audit.action) {
    writeAuditLog(driver, {
      actor: audit.actor || "system",
      action: audit.action,
      targetId: id,
      targetKind: "memory",
      scope: row.scope !== null ? String(row.scope) : void 0,
      reason: audit.reason,
      prevValue: { id, type: row.type, content: String(row.content).slice(0, 200), prevStatus: row.status },
      sessionId: audit.sessionId
    });
  }
  return true;
}
export {
  deleteMemory,
  writeMemory
};
//# sourceMappingURL=write.js.map
