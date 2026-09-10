import { execSync } from "node:child_process";
function detectGitBranch(cwd) {
  if (!cwd) return null;
  try {
    const output = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
      timeout: 2e3,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const branch = output.trim();
    return branch !== "" && branch !== "HEAD" ? branch : null;
  } catch {
    return null;
  }
}
function resolveProjectScope(cwd) {
  const branch = detectGitBranch(cwd);
  return branch !== null ? `project:${branch}` : "project";
}
function listScopes(driver, activeScope) {
  const rows = driver.prepare(
    `SELECT scope, COUNT(*) AS count
       FROM memories
      WHERE status = 'active'
      GROUP BY scope
      ORDER BY count DESC`
  ).all();
  const active = activeScope || "project";
  return rows.map((r) => ({ scope: String(r.scope), count: Number(r.count), active: r.scope === active }));
}
function archiveScope(driver, scope) {
  if (!scope) return 0;
  if (!scope.startsWith("project:")) return 0;
  const r = driver.prepare(
    `UPDATE memories SET status = 'archived'
      WHERE scope = ? AND status = 'active'`
  ).run(scope);
  return r.changes;
}
function getActiveScope(cwd) {
  return resolveProjectScope(cwd);
}
export {
  archiveScope,
  detectGitBranch,
  getActiveScope,
  listScopes,
  resolveProjectScope
};
//# sourceMappingURL=scopes.js.map
