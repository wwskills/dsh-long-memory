import type { SqlDriver } from './sqlite.js';
/** A memory record the edge rules operate on. */
export interface EdgeRecord {
    id: string;
    type: string;
    scope: string;
    /** Memories this one replaces (SUPERSEDED_BY sources). */
    supersededIds?: readonly string[];
}
/**
 * Create edges for a newly-recorded memory. Idempotent: re-running on the
 * same memory id is a no-op (edges are keyed by src+dst+predicate).
 */
export declare function createEdges(driver: SqlDriver, record: EdgeRecord): void;
/** Options for {@link runPageRank}. */
export interface PageRankOptions {
    damping?: number;
    iterations?: number;
    /** Scope for personalization weights. */
    activeScope?: string;
}
/**
 * Run personalized PageRank over a candidate graph.
 * @returns Map of memory id → PageRank score.
 */
export declare function runPageRank(driver: SqlDriver, candidateIds: readonly string[], opts?: PageRankOptions): Map<string, number>;
//# sourceMappingURL=kg.d.ts.map