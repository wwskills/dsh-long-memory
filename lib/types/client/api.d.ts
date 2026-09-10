/**
 * Typed client for the long-memory Web API. Every route lives here so the
 * components never hand-build URLs or repeat the list-response unwrapping.
 *
 * Note: the HTTP prefix is `dsh-long-memory` (the plugin's route namespace),
 * which differs from the module id `@wwskills/dsh-long-memory`.
 *
 * @module @wwskills/dsh-long-memory/client/api
 */
export interface Correction {
    id: string;
    trigger: string;
    error_summary?: string;
    root_cause?: string;
    correct_action?: string;
    rule?: string;
    context?: string;
    status: string;
    created_at: number;
}
export interface Rule {
    id: string;
    content: string;
    category: string;
    tags?: string[] | string;
    status: string;
    hit_count?: number;
    last_hit_at?: number;
    source_correction_ids?: string[];
    correction_ids?: string[];
    sources?: string[];
}
export interface Memory {
    id: string;
    type: string;
    scope: string;
    content: string;
    origin?: string;
    status: string;
    confidence?: number;
    access_count?: number;
    observed_at?: number;
    tags?: string[] | string;
    score?: number;
}
export interface Stats {
    corrections_pending?: number;
    rules_proposed?: number;
    memories_active?: number;
    memories_archived?: number;
    [key: string]: unknown;
}
export interface EmbeddingStatus {
    mode?: string;
    [key: string]: unknown;
}
export interface PluginConfigView {
    enabled?: boolean;
    batchSize?: number;
    ruleThreshold?: number;
    ruleTokenBudget?: number;
    llmTimeoutMs?: number;
    personaEverySessions?: number;
    personaEveryMs?: number;
    model?: string;
    signalWords?: string[] | string;
    embedding?: Record<string, unknown>;
    embeddingStatus?: EmbeddingStatus;
}
export declare const getStats: () => Promise<Stats>;
export declare const getConfig: () => Promise<PluginConfigView>;
export declare const saveConfig: (payload: Record<string, unknown>) => Promise<PluginConfigView>;
export declare const setEnabled: (enabled: boolean) => Promise<PluginConfigView>;
export declare const probeEmbedding: () => Promise<PluginConfigView>;
export declare function listCorrections(): Promise<Correction[]>;
export declare const extractCorrection: (id: string) => Promise<unknown>;
export declare const ignoreCorrection: (id: string) => Promise<unknown>;
export declare function listRules(status: string): Promise<Rule[]>;
export declare const approveRule: (id: string) => Promise<{
    warning?: {
        conflicts?: Array<{
            overlap: number;
            content: string;
            id: string;
        }>;
    };
}>;
export declare const rejectRule: (id: string) => Promise<unknown>;
export declare const updateRule: (id: string, patch: {
    content?: string;
    category?: string;
    tags?: string[];
}) => Promise<unknown>;
export declare function promoteRule(id: string): Promise<string>;
export interface MemoryQuery {
    q?: string;
    scope?: string;
    type?: string;
    status?: string;
    limit?: number;
}
export declare function listMemories(query?: MemoryQuery): Promise<Memory[]>;
export declare const archiveMemory: (id: string) => Promise<unknown>;
export declare function deleteMemory(id: string, hard: boolean, reason?: string): Promise<unknown>;
export declare const getPersona: () => Promise<unknown>;
export declare const savePersonaDim: (key: string, value: string) => Promise<unknown>;
export declare const rebuildPersona: () => Promise<unknown>;
//# sourceMappingURL=api.d.ts.map