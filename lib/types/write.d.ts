import type { SqlDriver } from './sqlite.js';
import type { EmbeddingConfig } from './embeddings.js';
/** Fields for a memory write. */
export interface WriteMemoryParams {
    /** PREFERENCE | FACT | PROJECT | EVENT | EPISODIC | USER */
    type: string;
    /** user | project | domain | episodic (or project:<branch>) */
    scope: string;
    content: string;
    /** agent | user-edited | system | owner | untrusted */
    origin?: string;
    /** interactive | cron | heartbeat | subagent */
    sessionKind?: string;
    sessionId?: string | null;
    lang?: string | null;
    /** Dedup / supersession key. */
    supersessionKey?: string | null;
    confidence?: number;
    accessCount?: number;
    /** active | archived */
    status?: string;
    id?: string;
    observedAt?: number;
}
/** Audit parameters attached to a write. */
export interface WriteAudit {
    actor?: string;
    action?: string;
    reason?: string;
    sessionId?: string;
}
/**
 * Insert a memory into the DB with all side-effects:
 *   1. INSERT into memories table
 *   2. FTS5 index sync
 *   3. KG edges
 *   4. Optional embedding (async, best-effort)
 *   5. Audit log
 */
export declare function writeMemory(driver: SqlDriver, params: WriteMemoryParams, embeddingConfig?: EmbeddingConfig | null, audit?: WriteAudit): {
    id: string;
    rowid: number;
};
/**
 * Soft-delete (archive) or hard-delete a memory, with FTS5 cleanup.
 * Hard delete also removes the FTS entry; archived memories stay searchable.
 */
export declare function deleteMemory(driver: SqlDriver, id: string, hard?: boolean, audit?: WriteAudit): boolean;
//# sourceMappingURL=write.d.ts.map