import type { SqlDriver } from './sqlite.js';
import type { EmbeddingConfig } from './embeddings.js';
/** Handle for the file watcher. */
export interface WatcherHandle {
    close(): void;
}
/**
 * Append a one-line marker to MEMORY.md identifying a freshly-started
 * session. Idempotent per session.
 */
export declare function appendSessionStart(markdownDir: string, sessionId: string): void;
/** Append a one-line pointer for a user message to today's daily note. */
export declare function appendDailyEntry(markdownDir: string, entry: {
    sessionId: string;
    content: string;
}): void;
/**
 * Walk the daily-note directory and ingest any line we haven't seen yet.
 * Lines are matched by their `(sessionId, HH:MM:SS, sha256)` triple so a
 * re-scan doesn't double-write. Origin is 'user-edited' because the line
 * came from disk, not from a model/tool call.
 */
export declare function ingestDailyNotes(driver: SqlDriver, markdownDir: string, embeddingConfig?: EmbeddingConfig | null): {
    ingested: number;
    scanned: number;
};
export declare function startWatcher(markdownDir: string, onChange: () => void): WatcherHandle;
/** List the daily-note files in a dir matching the date pattern. */
export declare function listMarkdowns(markdownDir: string): string[];
//# sourceMappingURL=file-tracks.d.ts.map