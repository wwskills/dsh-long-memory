import type { SqlDriver } from './sqlite.js';
/** One embedded text. */
export interface EmbeddingResult {
    embedding: number[];
    dim: number;
    model: string;
    cached: boolean;
}
/** The embedding config shape from the plugin settings. */
export interface EmbeddingConfig {
    provider?: string;
    model?: string;
    dimension?: number;
    batch_size?: number;
    batchSize?: number;
    timeout_ms?: number;
    timeoutMs?: number;
    ollama?: {
        base_url?: string;
        baseUrl?: string;
    };
    openai_compatible?: {
        base_url?: string;
        baseUrl?: string;
        api_key?: string;
        apiKey?: string;
    };
    openaiCompatible?: {
        base_url?: string;
        baseUrl?: string;
        api_key?: string;
        apiKey?: string;
    };
}
/**
 * Embed a batch of texts. Tries cache first, then calls the provider.
 * Entries the provider could not satisfy stay null.
 */
export declare function embedBatch(driver: SqlDriver, config: EmbeddingConfig | null | undefined, texts: readonly string[]): Promise<Array<EmbeddingResult | null>>;
/** Decode a cached embedding BLOB as a float vector; null when unusable. */
export declare function parseEmbedding(blob: unknown): number[] | null;
//# sourceMappingURL=embeddings.d.ts.map