export declare const SETTINGS_SCHEMA_VERSION = 1;
export declare const EMBEDDING_PROVIDERS: readonly ["none", "ollama", "openai-compatible"];
export declare const SCOPES: readonly ["user", "project", "domain", "episodic"];
/** One settings field descriptor. */
export interface SettingsField {
    key: string;
    type: 'enum' | 'enum-multi' | 'string' | 'string-list' | 'integer' | 'number' | 'boolean';
    label: string;
    default: unknown;
    options?: readonly string[];
    placeholder?: string;
    description?: string;
    showWhen?: Record<string, readonly string[]>;
}
/** The full settings document schema. */
export interface SettingsSchema {
    schemaVersion: number;
    fields: SettingsField[];
}
export declare const settingsSchema: SettingsSchema;
export declare const SETTINGS_NS = "long-memory";
/** Default values flattened into a nested object, ready to seed the namespace. */
export declare function settingsDefaults(): Record<string, unknown>;
/**
 * Validate a settings patch against the schema; returns a list of issues.
 * Light-weight: checks types + required presence only.
 */
export declare function validateSettings(patch: unknown): string[];
//# sourceMappingURL=settings-schema.d.ts.map