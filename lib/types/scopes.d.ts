import type { SqlDriver } from './sqlite.js';
/** One scope with its active-memory count. */
export interface ScopeInfo {
    scope: string;
    count: number;
    active: boolean;
}
/**
 * Detect the current git branch for the given workspace directory.
 * Returns null when not in a git repo or git is unavailable.
 */
export declare function detectGitBranch(cwd: string): string | null;
/**
 * Resolve the effective project scope for a session: 'project:<branch>' when
 * a git branch is detected, otherwise the default 'project'.
 */
export declare function resolveProjectScope(cwd: string): string;
/**
 * List all known scopes with memory counts. The 'active' flag marks the scope
 * new memories will be written to.
 */
export declare function listScopes(driver: SqlDriver, activeScope?: string): ScopeInfo[];
/**
 * Archive all memories under a given scope (soft archive). Used when
 * switching branches to prevent cross-branch memory pollution.
 *
 * Only branch-specific scopes (project:<branch>) are archived — never the
 * root 'project' scope, to prevent mass data loss.
 */
export declare function archiveScope(driver: SqlDriver, scope: string): number;
/** The current active scope for a workspace ('project:<branch>' or 'project'). */
export declare function getActiveScope(cwd: string): string;
//# sourceMappingURL=scopes.d.ts.map