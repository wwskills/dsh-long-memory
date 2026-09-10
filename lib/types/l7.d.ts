import type { SqlDriver } from './sqlite.js';
/** L7 plugin config subtree. */
export interface L7Config {
    l7?: {
        enabled?: boolean;
        interval_ms?: number;
        batch_turns?: number;
        auto_extract?: boolean;
        confirm_threshold?: number;
        extractor_model?: string;
        extractor_temp?: number;
    };
}
/** A candidate memory produced by extraction. */
interface Candidate {
    type: string;
    scope: string;
    content: string;
    confidence: number;
}
/** Minimal ctx shape L7 uses (extraction is otherwise ctx-independent). */
type ExtractCtx = unknown;
/** Buffer a user message to the persistent l7_buffer table. */
export declare function bufferMessage(driver: SqlDriver, sessionId: string, text: string): void;
/** Count of buffered sessions (diagnostics). */
export declare function bufferedSessionCount(driver: SqlDriver): number;
/** Schedule L7 extraction asynchronously so turn/end returns instantly. */
export declare function scheduleExtraction(driver: SqlDriver, sessionId: string, cfg?: L7Config, ctx?: ExtractCtx): void;
/** Result of one extraction run. */
export interface ExtractResult {
    extracted: number;
    queued?: number;
    superseded?: number;
    candidates: Candidate[];
}
/** Run extraction on a session's buffer and persist candidate memories. */
export declare function extractAndPersist(driver: SqlDriver, sessionId: string, cfg?: L7Config, ctx?: ExtractCtx): Promise<ExtractResult>;
export {};
//# sourceMappingURL=l7.d.ts.map