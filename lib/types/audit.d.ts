import type { SqlDriver } from './sqlite.js';
/** One audit entry. */
export interface AuditEntry {
    /** 'user' | 'agent:<sessionId>' | 'system' */
    actor: string;
    /** One of the AUDIT_ACTIONS vocabulary. */
    action: string;
    targetId?: string;
    /** 'memory' | 'supersession_key' | 'scope' */
    targetKind?: string;
    scope?: string;
    reason?: string;
    /** JSON-serialisable, stored as JSON text. */
    prevValue?: unknown;
    newValue?: unknown;
    sessionId?: string;
}
/**
 * Append an audit entry. Throws on driver error; the M3 DoD requires
 * mem_forget/supersede/confirm to be blocked when audit fails, so we
 * always throw rather than buffer.
 */
export declare function writeAuditLog(driver: SqlDriver, entry: AuditEntry): void;
/** Enumerate the allowed audit actions. Keep in sync with the schema. */
export declare const AUDIT_ACTIONS: readonly string[];
//# sourceMappingURL=audit.d.ts.map