/** Minimal shape of a chat message handed to / returned from the prompts. */
export interface ChatMessage {
    role: string;
    content: string;
}
/** Anything that can stream chat completions (the DSH llm service). */
export interface LlmStreamService {
    stream(opts: Record<string, unknown>): AsyncIterable<StreamChunk> | Promise<AsyncIterable<StreamChunk>>;
}
/** One streamed chunk from an llm.stream() iteration. */
export interface StreamChunk {
    type?: string;
    text?: string;
    delta?: {
        text?: string;
    };
}
/** Options accepted by streamLlm. */
export interface StreamLlmOpts {
    provider?: string;
    model?: string;
    messages: ChatMessage[];
    signal?: AbortSignal;
}
/** A correction record handed to buildRulePrompt. */
export interface CorrectionRecord {
    id: string;
    error_summary?: string;
    root_cause?: string;
    correct_action?: string;
    rule?: string;
}
/** Options for buildLessonPrompt. */
export interface LessonPromptOpts {
    text?: string;
    context?: ReadonlyArray<Record<string, unknown>>;
    sessionHint?: string;
}
/** Concurrency-limited async task queue with per-task timeout. */
export declare class TaskQueue {
    private readonly concurrency;
    private readonly timeout;
    private readonly queue;
    private running;
    private disposed;
    constructor(opts?: {
        concurrency?: number;
        timeout?: number;
    });
    add<A>(fn: () => A | Promise<A>): Promise<A>;
    private drain;
    private done;
    dispose(): void;
}
/** Call llm.stream() and concatenate the text chunks into one string. */
export declare function streamLlm(llm: LlmStreamService | null | undefined, opts?: StreamLlmOpts): Promise<string>;
/** Extract a JSON value from LLM text output (handles code fences and prose). */
export declare function parseJsonResponse(text: unknown): unknown;
/** ChatML for extracting a structured lesson from a user correction. */
export declare function buildLessonPrompt(opts?: LessonPromptOpts): ChatMessage[];
/** ChatML for distilling one general rule from accumulated corrections. */
export declare function buildRulePrompt(corrections: ReadonlyArray<CorrectionRecord>): ChatMessage[];
//# sourceMappingURL=extract.d.ts.map