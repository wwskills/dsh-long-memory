import type { SqlDriver } from './sqlite.js';
/** One recall hit. */
export interface RecallHit {
    id: string;
    type: string;
    content: string;
    origin: string;
    score: number;
    score_path: string;
    scope: string;
    session_id: string;
    lang: string;
    observed_at: number;
    confidence: number;
}
/** Recall result envelope. */
export interface RecallResult {
    hits: RecallHit[];
    total: number;
    truncated: boolean;
    score_path: string;
}
/** Arguments accepted by recallFts5 / recallHybrid. */
export interface RecallArgs {
    query: string;
    scope?: string[];
    limit?: number;
    since?: number;
    sessionId?: string;
    includeSuperseded?: boolean;
    includeArchived?: boolean;
    maxBytes?: number;
    activeScope?: string;
    vectorScores?: Map<string, number>;
    /** When true, do not bump access counters (used by the vector re-run). */
    skipAccessBump?: boolean;
}
/** Search the memories table using FTS5 only. */
export declare function recallFts5(driver: SqlDriver, args: RecallArgs): RecallResult;
/**
 * Run FTS5 recall, then re-rank with KG-aware PageRank, optionally with vector
 * similarity when embeddings are available. Falls back to FTS5-only.
 */
export declare function recallHybrid(driver: SqlDriver, args: RecallArgs): RecallResult;
/** Vector filter options for {@link computeVectorSimilarity}. */
export interface VectorFilter {
    scope?: string[];
    includeSuperseded?: boolean;
    includeArchived?: boolean;
    limit?: number;
}
/**
 * Compute cosine similarity for a query against cached memory embeddings.
 * Returns a Map of memory id → similarity (0..1). Scope/status pre-filtering
 * narrows the linear scan; the dim filter keeps stale-model vectors out.
 */
export declare function computeVectorSimilarity(driver: SqlDriver, queryVec: number[], filter?: VectorFilter): Map<string, number>;
//# sourceMappingURL=recall.d.ts.map