import type { SqlDriver, SqlRow } from './sqlite.js';
export declare const DEFAULT_SIGNAL_WORDS_ZH: readonly string[];
export declare const DEFAULT_SIGNAL_WORDS_EN: readonly string[];
export declare const DEFAULT_SIGNAL_WORDS: readonly string[];
export declare function resolveSignalWords(opts?: {
    configSignalWords?: unknown;
    signalWordsLocale?: string;
    locale?: string;
}): readonly string[];
export declare function matchSignalWords(text: string, signals?: readonly string[]): boolean;
export declare function extractUserText(event: unknown): string;
/** Fields accepted by {@link insertCorrection}. */
export interface CorrectionInput {
    trigger: string;
    error_summary?: string;
    root_cause?: string;
    correct_action?: string;
    rule?: string;
    context?: string;
    sessionId?: string;
}
export declare function insertCorrection(db: SqlDriver, input: CorrectionInput): {
    id: string;
    created_at: number;
};
export declare function listCorrections(db: SqlDriver, opts?: {
    status?: string;
    trigger?: string;
    limit?: number;
}): SqlRow[];
export declare function getCorrection(db: SqlDriver, id: string): SqlRow | null;
export declare function markCorrectionPromoted(db: SqlDriver, id: string, ruleId: string): boolean;
export declare function markCorrectionIgnored(db: SqlDriver, id: string): boolean;
export declare function countPendingCorrections(db: SqlDriver): number;
export declare function listRules(db: SqlDriver, opts?: {
    status?: string;
    category?: string;
    limit?: number;
}): SqlRow[];
export declare function getRule(db: SqlDriver, id: string): SqlRow | null;
export declare function updateRule(db: SqlDriver, id: string, patch?: {
    content?: string;
    category?: string;
    tags?: string[];
}): boolean;
export declare function approveRule(db: SqlDriver, id: string): boolean;
export declare function rejectRule(db: SqlDriver, id: string): boolean;
export declare function promoteRule(db: SqlDriver, id: string): boolean;
export declare function archiveRule(db: SqlDriver, id: string): boolean;
export declare function archiveStaleRules(db: SqlDriver, ttlMs?: number): number;
export declare function incrementRuleHit(db: SqlDriver, id: string): void;
export declare function getRulesForInjection(db: SqlDriver, opts?: {
    category?: string;
    limit?: number;
}): SqlRow[];
export declare function promoteCorrectionToRule(db: SqlDriver, id: string): {
    ok: boolean;
    error?: string;
    id?: string;
    rule_id?: string;
    status?: string;
};
export interface RuleConflict {
    id: string;
    content: string;
    category: string;
    overlap: number;
}
export declare function findConflictingRules(db: SqlDriver, rule: SqlRow | null, threshold?: number): RuleConflict[];
export declare function bumpUsage(db: SqlDriver, field: string, delta?: number): void;
export declare function aggregateStats(db: SqlDriver): Record<string, unknown>;
/** Best-effort wrapper around {@link findConflictingRules}. */
export declare function okConflicts(rule: SqlRow | null, db: SqlDriver): RuleConflict[];
export declare function buildAgentsMdDraft(rule: SqlRow | null): string;
//# sourceMappingURL=corrections.d.ts.map