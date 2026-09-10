/** A dsh-tools value/parameter schema node. */
export interface SchemaSpec {
    type?: string;
    required?: boolean;
    description?: string;
    enum?: readonly string[];
    items?: SchemaSpec;
    properties?: Record<string, SchemaSpec>;
    additionalProperties?: boolean;
}
/** A tool's parameter map. */
export type ParamsSpec = Record<string, SchemaSpec>;
export declare const TYPES: readonly ["USER", "PREFERENCE", "PROJECT", "FACT", "SKILL", "EVENT", "TASK"];
export declare const SCOPES: readonly ["user", "project", "domain", "episodic"];
export declare const ORIGINS: readonly ["owner", "agent", "untrusted", "system", "user-edited"];
export declare const SCORE_PATHS: readonly ["exact", "generalized", "hybrid", "fts5-only", "vector-only"];
export declare const MEMORY_STATUSES: readonly ["active", "archived", "superseded"];
export declare const CONFIRM_STATUSES: readonly ["pending", "approved", "rejected"];
export declare const SESSION_KINDS: readonly ["interactive", "cron", "heartbeat", "subagent"];
export declare const memSearchParams: ParamsSpec;
export declare const memRecordParams: ParamsSpec;
export declare const memStatusParams: ParamsSpec;
export declare const memStatsParams: ParamsSpec;
export declare const memForgetParams: ParamsSpec;
export declare const memConfirmParams: ParamsSpec;
export declare const memSearchOutput: SchemaSpec;
export declare const memRecordOutput: SchemaSpec;
export declare const memStatusOutput: SchemaSpec;
export declare const memStatsOutput: SchemaSpec;
export declare const memForgetOutput: SchemaSpec;
export declare const memConfirmOutput: SchemaSpec;
export declare const memScopeListParams: ParamsSpec;
export declare const memScopeListOutput: SchemaSpec;
export declare const memScopeSetActiveParams: ParamsSpec;
export declare const memScopeSetActiveOutput: SchemaSpec;
//# sourceMappingURL=schema.d.ts.map