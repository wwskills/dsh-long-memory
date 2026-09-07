// LLM extraction helpers (merged from agent-evolve).
//
// Provides:
//   • TaskQueue — concurrency-limited async task queue with timeout
//   • streamLlm — wraps llm.stream() into a single text string
//   • buildLessonPrompt — ChatML for lesson extraction from corrections
//   • buildRulePrompt — ChatML for rule distillation from accumulated corrections
//   • parseJsonResponse — extract JSON from LLM text output

/** Minimal shape of a chat message handed to / returned from the prompts. */
export interface ChatMessage {
  role: string
  content: string
}

/** Anything that can stream chat completions (the DSH llm service). */
export interface LlmStreamService {
  stream(opts: Record<string, unknown>): AsyncIterable<StreamChunk> | Promise<AsyncIterable<StreamChunk>>
}

/** One streamed chunk from an llm.stream() iteration. */
export interface StreamChunk {
  type?: string
  text?: string
  delta?: { text?: string }
}

/** Options accepted by streamLlm. */
export interface StreamLlmOpts {
  provider?: string
  model?: string
  messages: ChatMessage[]
  signal?: AbortSignal
}

/** A correction record handed to buildRulePrompt. */
export interface CorrectionRecord {
  id: string
  error_summary?: string
  root_cause?: string
  correct_action?: string
  rule?: string
}

/** Options for buildLessonPrompt. */
export interface LessonPromptOpts {
  text?: string
  context?: ReadonlyArray<Record<string, unknown>>
  sessionHint?: string
}

/** One queued task: fn starts the work, the promise settles with its result. */
interface QueueEntry {
  fn: () => unknown
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** Concurrency-limited async task queue with per-task timeout. */
export class TaskQueue {
  private readonly concurrency: number
  private readonly timeout: number
  private readonly queue: QueueEntry[] = []
  private running = 0
  private disposed = false

  constructor(opts: { concurrency?: number, timeout?: number } = {}) {
    this.concurrency = opts.concurrency ?? 1
    this.timeout = opts.timeout ?? 30000
  }

  add<A>(fn: () => A | Promise<A>): Promise<A> {
    if (this.disposed) return Promise.reject(new Error('TaskQueue disposed'))
    return new Promise<A>((resolve, reject) => {
      this.queue.push({ fn: fn as () => unknown, resolve: resolve as (value: unknown) => void, reject })
      this.drain()
    })
  }

  private drain(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const entry = this.queue.shift()
      if (entry === undefined) return
      this.running += 1
      const timer = setTimeout(() => {
        entry.reject(new Error(`TaskQueue: task timed out after ${this.timeout}ms`))
        this.done()
      }, this.timeout)

      void Promise.resolve()
        .then(() => entry.fn())
        .then(entry.resolve, entry.reject)
        .finally(() => { clearTimeout(timer); this.done() })
    }
  }

  private done(): void {
    this.running -= 1
    if (this.queue.length > 0) this.drain()
  }

  dispose(): void {
    this.disposed = true
    while (this.queue.length > 0) {
      const entry = this.queue.shift()
      if (entry === undefined) break
      entry.reject(new Error('TaskQueue disposed'))
    }
  }
}

/** Call llm.stream() and concatenate the text chunks into one string. */
export async function streamLlm(llm: LlmStreamService | null | undefined, opts: StreamLlmOpts = { messages: [] }): Promise<string> {
  if (llm === null || llm === undefined || typeof llm.stream !== 'function') {
    throw new Error('streamLlm: llm service unavailable or missing stream() method')
  }
  if (!Array.isArray(opts.messages) || opts.messages.length === 0) {
    throw new Error('streamLlm: messages array required and non-empty')
  }

  const request: Record<string, unknown> = { input: { messages: opts.messages, stream: true }, signal: opts.signal }
  if (opts.model !== undefined) request.model = opts.model
  if (opts.provider !== undefined) request.provider = opts.provider

  const raw = llm.stream(request)
  const iter = (raw !== null && typeof raw === 'object' && typeof (raw as Promise<unknown>).then === 'function')
    ? await (raw as Promise<AsyncIterable<StreamChunk>>)
    : (raw as AsyncIterable<StreamChunk>)
  if (iter === null || iter === undefined || typeof (iter as AsyncIterable<StreamChunk>)[Symbol.asyncIterator] !== 'function') {
    throw new Error('streamLlm: llm.stream() did not return an async iterable')
  }

  let text = ''
  for await (const chunk of iter) {
    if (chunk === null || chunk === undefined) continue
    if (chunk.delta !== undefined && typeof chunk.delta.text === 'string') {
      text += chunk.delta.text
    } else if (typeof chunk.text === 'string') {
      text += chunk.text
    }
    if (chunk.type === 'message_stop' || chunk.type === 'done') break
  }
  return text
}

/** Extract a JSON value from LLM text output (handles code fences and prose). */
export function parseJsonResponse(text: unknown): unknown {
  if (typeof text !== 'string' || text.length === 0) return null
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch { /* fall through */ }
  // Try extracting from a code fence
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  if (fence !== null) {
    try { return JSON.parse(fence[1].trim()) } catch { /* fall through */ }
  }
  // Try from the first { or [ to the end
  const start = text.search(/[[{]/)
  if (start >= 0) {
    try { return JSON.parse(text.slice(start)) } catch { /* fall through */ }
  }
  // Last resort: any balanced-looking braces/brackets span
  const m = /(\[[\s\S]*\]|\{[\s\S]*\})/.exec(text)
  if (m !== null) {
    try { return JSON.parse(m[1]) } catch { /* fall through */ }
  }
  return null
}

/** ChatML for extracting a structured lesson from a user correction. */
export function buildLessonPrompt(opts: LessonPromptOpts = {}): ChatMessage[] {
  const systemContent = 'You are a lesson extraction assistant. Analyze the user correction and extract a structured lesson. Return JSON: { "error_summary": string, "root_cause": string, "correct_action": string, "rule": string, "confidence": number }. All fields are strings except confidence (0-1). Respond with JSON only, no prose.'

  const userLines: string[] = []
  if (opts.sessionHint !== undefined) userLines.push(`Session: ${opts.sessionHint}`)
  if (Array.isArray(opts.context) && opts.context.length > 0) {
    userLines.push('Recent context:')
    for (const c of opts.context.slice(-5)) {
      const role = String((c as Record<string, unknown>)?.role ?? (c as Record<string, unknown>)?.type ?? 'unknown')
      const content = typeof c === 'string' ? c : String((c as Record<string, unknown>)?.text ?? (c as Record<string, unknown>)?.content ?? '')
      if (content.length > 0) userLines.push(`  ${role}: ${content}`)
    }
  }
  userLines.push(`User message: ${opts.text ?? '(empty)'}`)

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userLines.join('\n') || '(empty — nothing to extract)' },
  ]
}

/** ChatML for distilling one general rule from accumulated corrections. */
export function buildRulePrompt(corrections: ReadonlyArray<CorrectionRecord>): ChatMessage[] {
  if (!Array.isArray(corrections) || corrections.length === 0) return []

  const systemContent = 'You are a rule distillation assistant. From multiple user corrections, infer a single general rule that prevents the same class of mistakes. Return JSON: { "content": string, "category": "coding"|"communication"|"workflow"|"safety", "tags": string[], "source_corrections": string[] }. Respond with JSON only.'

  const userLines = ['Corrections to distill:']
  for (const c of corrections) {
    userLines.push(`- [${c.id}] ${c.error_summary ?? c.rule ?? c.correct_action ?? '(no summary)'}`)
    if (c.root_cause !== undefined) userLines.push(`  Root cause: ${c.root_cause}`)
    if (c.rule !== undefined) userLines.push(`  Rule: ${c.rule}`)
  }

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userLines.join('\n') },
  ]
}
