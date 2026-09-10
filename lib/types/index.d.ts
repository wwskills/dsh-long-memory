import Schema from '@deepseek-ai/schemastery';
import { settingsSchema, settingsDefaults, validateSettings } from './settings-schema.js';
import type { EmbeddingConfig } from './embeddings.js';
import type { WatcherHandle } from './file-tracks.js';
import type { SqlDriver } from './sqlite.js';
/** The subset of the cordis context this plugin touches. */
interface PluginContext {
    on(event: string, listener: (...args: any[]) => unknown, opts?: {
        global?: boolean;
    }): unknown;
    effect(fn: () => unknown, label?: string): unknown;
    inject(deps: readonly string[], callback: (ctx: PluginContext) => void): unknown;
    get(name: string): unknown;
}
/** The settings handle as the DSH settings service returns it. */
interface SettingsHandleLike {
    get(): Record<string, any>;
    update(patch: Record<string, unknown>): void | Promise<void>;
    watch?(cb: (next: Record<string, any>) => void): unknown;
}
/** The runtime config this plugin reads (snake_case fields). */
interface PluginConfig {
    storage?: {
        driver?: string;
        path?: string;
        markdown_dir?: string;
        busy_timeout_ms?: number;
    };
    embedding?: EmbeddingConfig;
    recall?: {
        max_hits?: number;
        max_recall_bytes?: number;
        token_budget?: number;
        scope?: string[];
    };
    l7?: {
        enabled?: boolean;
        interval_ms?: number;
        batch_turns?: number;
        auto_extract?: boolean;
        extractor_model?: string;
        extractor_temp?: number;
        confirm_threshold?: number;
    };
    domain_keywords?: string[];
    audit?: {
        retention_rows?: number;
    };
    signalWords?: unknown;
    signalWordsLocale?: string;
    ruleThreshold?: number;
    ruleTokenBudget?: number;
    [key: string]: unknown;
}
/** Mutable runtime state the tool factories close over. */
interface LongMemoryState {
    ctx: PluginContext;
    cfg: PluginConfig;
    driver: SqlDriver;
    dbPath: string;
    markdownDir: string;
    _initialised: boolean;
    embeddingAvailable: boolean;
    embeddingConfig: EmbeddingConfig;
    activeScope: string;
    watcher: WatcherHandle;
    _lastIngest?: {
        ingested?: number;
        scanned?: number;
        error?: string;
    } | undefined;
    settingsHandle?: SettingsHandleLike | undefined;
    settingsService?: {
        register(ns: string, schema: unknown, opts?: {
            base?: Record<string, unknown>;
        }): SettingsHandleLike;
    } | undefined;
    isWriteGated(sessionKind: string): boolean;
    autoDetectScope(input: {
        scope?: string;
        content?: string;
        sessionKind?: string;
    }): string;
    resolveProjectScope(cwd: string): string;
    schemaVersion(): number;
}
declare const ServiceConfig: Schema<Schemastery.ObjectS<{
    storage: Schema<Schemastery.ObjectS<{
        driver: Schema<"node-builtin" | "better-sqlite3", "node-builtin" | "better-sqlite3">;
        path: Schema<string, string>;
        markdown_dir: Schema<string, string>;
        busy_timeout_ms: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        driver: Schema<"node-builtin" | "better-sqlite3", "node-builtin" | "better-sqlite3">;
        path: Schema<string, string>;
        markdown_dir: Schema<string, string>;
        busy_timeout_ms: Schema<number, number>;
    }>>;
    embedding: Schema<Schemastery.ObjectS<{
        provider: Schema<"none" | "ollama" | "openai-compatible", "none" | "ollama" | "openai-compatible">;
        model: Schema<string, string>;
        dimension: Schema<number, number>;
        batch_size: Schema<number, number>;
        timeout_ms: Schema<number, number>;
        ollama: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
        }>>;
        openai_compatible: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>>;
    }>, Schemastery.ObjectT<{
        provider: Schema<"none" | "ollama" | "openai-compatible", "none" | "ollama" | "openai-compatible">;
        model: Schema<string, string>;
        dimension: Schema<number, number>;
        batch_size: Schema<number, number>;
        timeout_ms: Schema<number, number>;
        ollama: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
        }>>;
        openai_compatible: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>>;
    }>>;
    recall: Schema<Schemastery.ObjectS<{
        max_hits: Schema<number, number>;
        max_recall_bytes: Schema<number, number>;
        token_budget: Schema<number, number>;
        scope: Schema<("user" | "project" | "domain" | "episodic")[], ("user" | "project" | "domain" | "episodic")[]>;
    }>, Schemastery.ObjectT<{
        max_hits: Schema<number, number>;
        max_recall_bytes: Schema<number, number>;
        token_budget: Schema<number, number>;
        scope: Schema<("user" | "project" | "domain" | "episodic")[], ("user" | "project" | "domain" | "episodic")[]>;
    }>>;
    l7: Schema<Schemastery.ObjectS<{
        enabled: Schema<boolean, boolean>;
        interval_ms: Schema<number, number>;
        batch_turns: Schema<number, number>;
        auto_extract: Schema<boolean, boolean>;
        extractor_model: Schema<string, string>;
        extractor_temp: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        enabled: Schema<boolean, boolean>;
        interval_ms: Schema<number, number>;
        batch_turns: Schema<number, number>;
        auto_extract: Schema<boolean, boolean>;
        extractor_model: Schema<string, string>;
        extractor_temp: Schema<number, number>;
    }>>;
    domain_keywords: Schema<string[], string[]>;
    audit: Schema<Schemastery.ObjectS<{
        retention_rows: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        retention_rows: Schema<number, number>;
    }>>;
}>, Schemastery.ObjectT<{
    storage: Schema<Schemastery.ObjectS<{
        driver: Schema<"node-builtin" | "better-sqlite3", "node-builtin" | "better-sqlite3">;
        path: Schema<string, string>;
        markdown_dir: Schema<string, string>;
        busy_timeout_ms: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        driver: Schema<"node-builtin" | "better-sqlite3", "node-builtin" | "better-sqlite3">;
        path: Schema<string, string>;
        markdown_dir: Schema<string, string>;
        busy_timeout_ms: Schema<number, number>;
    }>>;
    embedding: Schema<Schemastery.ObjectS<{
        provider: Schema<"none" | "ollama" | "openai-compatible", "none" | "ollama" | "openai-compatible">;
        model: Schema<string, string>;
        dimension: Schema<number, number>;
        batch_size: Schema<number, number>;
        timeout_ms: Schema<number, number>;
        ollama: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
        }>>;
        openai_compatible: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>>;
    }>, Schemastery.ObjectT<{
        provider: Schema<"none" | "ollama" | "openai-compatible", "none" | "ollama" | "openai-compatible">;
        model: Schema<string, string>;
        dimension: Schema<number, number>;
        batch_size: Schema<number, number>;
        timeout_ms: Schema<number, number>;
        ollama: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
        }>>;
        openai_compatible: Schema<Schemastery.ObjectS<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>, Schemastery.ObjectT<{
            base_url: Schema<string, string>;
            api_key: Schema<string, string>;
        }>>;
    }>>;
    recall: Schema<Schemastery.ObjectS<{
        max_hits: Schema<number, number>;
        max_recall_bytes: Schema<number, number>;
        token_budget: Schema<number, number>;
        scope: Schema<("user" | "project" | "domain" | "episodic")[], ("user" | "project" | "domain" | "episodic")[]>;
    }>, Schemastery.ObjectT<{
        max_hits: Schema<number, number>;
        max_recall_bytes: Schema<number, number>;
        token_budget: Schema<number, number>;
        scope: Schema<("user" | "project" | "domain" | "episodic")[], ("user" | "project" | "domain" | "episodic")[]>;
    }>>;
    l7: Schema<Schemastery.ObjectS<{
        enabled: Schema<boolean, boolean>;
        interval_ms: Schema<number, number>;
        batch_turns: Schema<number, number>;
        auto_extract: Schema<boolean, boolean>;
        extractor_model: Schema<string, string>;
        extractor_temp: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        enabled: Schema<boolean, boolean>;
        interval_ms: Schema<number, number>;
        batch_turns: Schema<number, number>;
        auto_extract: Schema<boolean, boolean>;
        extractor_model: Schema<string, string>;
        extractor_temp: Schema<number, number>;
    }>>;
    domain_keywords: Schema<string[], string[]>;
    audit: Schema<Schemastery.ObjectS<{
        retention_rows: Schema<number, number>;
    }>, Schemastery.ObjectT<{
        retention_rows: Schema<number, number>;
    }>>;
}>>;
declare function formatRecallBody(hits: ReadonlyArray<{
    scope: unknown;
    type: unknown;
    content: unknown;
}>): string;
declare function fitsBudget(text: string, tokenBudget: number): boolean;
declare function truncateToBudget(text: string, tokenBudget: number): string;
declare const name = "long-memory";
declare const inject: string[];
declare function apply(ctx: PluginContext, config?: PluginConfig): LongMemoryState;
export { name, inject, ServiceConfig as Config, apply };
export default apply;
export { formatRecallBody, fitsBudget, truncateToBudget };
export { settingsSchema, settingsDefaults, validateSettings };
//# sourceMappingURL=index.d.ts.map