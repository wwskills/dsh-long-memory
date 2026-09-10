import { newId, nowMs } from "./sqlite.js";
function writeAuditLog(driver, entry) {
  driver.prepare(
    `INSERT INTO audit_log
       (id, actor, action, target_id, target_kind, scope, reason,
        prev_value, new_value, session_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId(),
    entry.actor,
    entry.action,
    entry.targetId ?? null,
    entry.targetKind ?? null,
    entry.scope ?? null,
    entry.reason ?? null,
    entry.prevValue === void 0 ? null : JSON.stringify(entry.prevValue),
    entry.newValue === void 0 ? null : JSON.stringify(entry.newValue),
    entry.sessionId ?? null,
    nowMs()
  );
}
const AUDIT_ACTIONS = Object.freeze([
  "record",
  "forget",
  "forget-hard",
  "supersede",
  "confirm-approve",
  "confirm-reject"
]);
export {
  AUDIT_ACTIONS,
  writeAuditLog
};
//# sourceMappingURL=audit.js.map
