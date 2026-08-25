// @wwskills/dsh-long-memory — scope management
//
// Provides:
//   • Git branch detection for project-scope granularity
//   • Scope listing and activation
//   • Auto-archiving of old branch memories on branch switch

import { execSync } from 'node:child_process';

// ────────────────────────────────────────────────────────────────────────────
// Git branch detection
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detect the current git branch for the given workspace directory.
 * Returns null when not in a git repo or git is unavailable.
 *
 * @param {string} cwd - workspace directory
 * @returns {string|null} branch name or null
 */
export function detectGitBranch(cwd) {
  if (!cwd) return null;
  try {
    const output = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const branch = output.trim();
    return branch && branch !== 'HEAD' ? branch : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the effective project scope for a session.
 *   - If git branch is detected, scope = 'project:<branch>'
 *   - Otherwise, scope = 'project' (default)
 *
 * @param {string} cwd - workspace directory
 * @returns {string}
 */
export function resolveProjectScope(cwd) {
  const branch = detectGitBranch(cwd);
  return branch ? `project:${branch}` : 'project';
}

// ────────────────────────────────────────────────────────────────────────────
// Scope listing
// ────────────────────────────────────────────────────────────────────────────

/**
 * List all known scopes with memory counts.
 * The 'active' flag marks the scope that new memories will be written to
 * (derived from the current git branch or default 'project').
 *
 * @param {object} driver - SQLite driver
 * @param {string} [activeScope] - the currently active scope
 * @returns {{ scope: string, count: number, active: boolean }[]}
 */
export function listScopes(driver, activeScope) {
  const rows = driver.prepare(
    `SELECT scope, COUNT(*) AS count
       FROM memories
      WHERE status = 'active'
      GROUP BY scope
      ORDER BY count DESC`
  ).all();
  // Default active scope if not provided
  const active = activeScope || 'project';
  return rows.map((r) => ({ scope: r.scope, count: Number(r.count), active: r.scope === active }));
}

/**
 * Archive all memories under a given scope (soft archive).
 * Used when switching branches to prevent cross-branch memory pollution.
 *
 * @param {object} driver - SQLite driver
 * @param {string} scope - scope to archive
 * @returns {number} count of archived memories
 */
export function archiveScope(driver, scope) {
  if (!scope) return 0;
  const r = driver.prepare(
    `UPDATE memories SET status = 'archived'
      WHERE scope = ? AND status = 'active'`
  ).run(scope);
  return r.changes;
}

/**
 * Get the current active scope for a workspace.
 * If git branch is available, returns 'project:<branch>'; otherwise 'project'.
 *
 * @param {string} cwd - workspace directory
 * @returns {string}
 */
export function getActiveScope(cwd) {
  return resolveProjectScope(cwd);
}