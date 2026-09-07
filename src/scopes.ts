// Scope management.
//
// Provides:
//   • Git branch detection for project-scope granularity
//   • Scope listing and activation
//   • Auto-archiving of old branch memories on branch switch

import { execSync } from 'node:child_process'
import type { SqlDriver } from './sqlite.js'

/** One scope with its active-memory count. */
export interface ScopeInfo {
  scope: string
  count: number
  active: boolean
}

/**
 * Detect the current git branch for the given workspace directory.
 * Returns null when not in a git repo or git is unavailable.
 */
export function detectGitBranch(cwd: string): string | null {
  if (!cwd) return null
  try {
    const output = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const branch = output.trim()
    return branch !== '' && branch !== 'HEAD' ? branch : null
  } catch {
    return null
  }
}

/**
 * Resolve the effective project scope for a session: 'project:<branch>' when
 * a git branch is detected, otherwise the default 'project'.
 */
export function resolveProjectScope(cwd: string): string {
  const branch = detectGitBranch(cwd)
  return branch !== null ? `project:${branch}` : 'project'
}

/**
 * List all known scopes with memory counts. The 'active' flag marks the scope
 * new memories will be written to.
 */
export function listScopes(driver: SqlDriver, activeScope?: string): ScopeInfo[] {
  const rows = driver.prepare(
    `SELECT scope, COUNT(*) AS count
       FROM memories
      WHERE status = 'active'
      GROUP BY scope
      ORDER BY count DESC`,
  ).all()
  const active = activeScope || 'project'
  return rows.map(r => ({ scope: String(r.scope), count: Number(r.count), active: r.scope === active }))
}

/**
 * Archive all memories under a given scope (soft archive). Used when
 * switching branches to prevent cross-branch memory pollution.
 *
 * Only branch-specific scopes (project:<branch>) are archived — never the
 * root 'project' scope, to prevent mass data loss.
 */
export function archiveScope(driver: SqlDriver, scope: string): number {
  if (!scope) return 0
  if (!scope.startsWith('project:')) return 0
  const r = driver.prepare(
    `UPDATE memories SET status = 'archived'
      WHERE scope = ? AND status = 'active'`,
  ).run(scope)
  return r.changes
}

/** The current active scope for a workspace ('project:<branch>' or 'project'). */
export function getActiveScope(cwd: string): string {
  return resolveProjectScope(cwd)
}
