// @wwskills/dsh-long-memory — LLM extraction helpers (merged from agent-evolve)
//
// Provides:
//   • TaskQueue — concurrency-limited async task queue with timeout
//   • streamLlm — wraps llm.stream() into a single text string
//   • buildLessonPrompt — ChatML for lesson extraction from corrections
//   • buildRulePrompt — ChatML for rule distillation from accumulated corrections
//   • parseJsonResponse — extract JSON from LLM text output

// ────────────────────────────────────────────────────────────────────────────
// TaskQueue
// ────────────────────────────────────────────────────────────────────────────

export class TaskQueue {
  constructor({ concurrency = 1, timeout = 30000 } = {}) {
    this.concurrency = concurrency;
    this.timeout = timeout;
    this._queue = [];
    this._running = 0;
    this._disposed = false;
  }

  add(fn) {
    if (this._disposed) return Promise.reject(new Error('TaskQueue disposed'));
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject });
      this._drain();
    });
  }

  _drain() {
    while (this._running < this.concurrency && this._queue.length > 0) {
      const { fn, resolve, reject } = this._queue.shift();
      this._running++;
      const timer = setTimeout(() => {
        reject(new Error('TaskQueue: task timed out after ' + this.timeout + 'ms'));
        this._done();
      }, this.timeout);

      Promise.resolve()
        .then(() => fn())
        .then(resolve, reject)
        .finally(() => { clearTimeout(timer); this._done(); });
    }
  }

  _done() {
    this._running--;
    if (this._queue.length > 0) this._drain();
  }

  dispose() {
    this._disposed = true;
    while (this._queue.length > 0) {
      const { reject } = this._queue.shift();
      reject(new Error('TaskQueue disposed'));
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// streamLlm — call llm.stream() and concatenate text chunks
// ────────────────────────────────────────────────────────────────────────────

export async function streamLlm(llm, { provider, model, messages, signal } = {}) {
  if (!llm || typeof llm.stream !== 'function') {
    throw new Error('streamLlm: llm service unavailable or missing stream() method');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('streamLlm: messages array required and non-empty');
  }

  const opts = { input: { messages, stream: true }, signal };
  if (model) opts.model = model;
  if (provider) opts.provider = provider;

  const raw = llm.stream(opts);
  const iter = (raw && typeof raw.then === 'function') ? await raw : raw;
  if (!iter || typeof iter[Symbol.asyncIterator] !== 'function') {
    throw new Error('streamLlm: llm.stream() did not return an async iterable');
  }

  let text = '';
  for await (const chunk of iter) {
    if (!chunk) continue;
    if (chunk.delta && typeof chunk.delta.text === 'string') {
      text += chunk.delta.text;
    } else if (typeof chunk.text === 'string') {
      text += chunk.text;
    }
    if (chunk.type === 'message_stop' || chunk.type === 'done') break;
  }
  return text;
}

// ────────────────────────────────────────────────────────────────────────────
// parseJsonResponse — extract JSON from LLM output
// ────────────────────────────────────────────────────────────────────────────

export function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null;
  // Try direct parse first
  try {
    const v = JSON.parse(text);
    return v;
  } catch {}
  // Try extracting from code fence
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }
  // Try finding first { or [ and matching
  const start = text.search(/[\[{]/);
  if (start < 0) return null;
  const slice = text.slice(start);
  try { return JSON.parse(slice); } catch {}
  // Last resort: find balanced braces
  const m = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (m) {
    try { return JSON.parse(m[1]); } catch {}
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// buildLessonPrompt — extract a structured lesson from a correction
// ────────────────────────────────────────────────────────────────────────────

export function buildLessonPrompt({ text, context, sessionHint } = {}, cfg = {}) {
  const systemContent = 'You are a lesson extraction assistant. Analyze the user correction and extract a structured lesson. Return JSON: { "error_summary": string, "root_cause": string, "correct_action": string, "rule": string, "confidence": number }. All fields are strings except confidence (0-1). Respond with JSON only, no prose.';

  const userLines = [];
  if (sessionHint) userLines.push(`Session: ${sessionHint}`);
  if (Array.isArray(context) && context.length > 0) {
    userLines.push('Recent context:');
    for (const c of context.slice(-5)) {
      const role = c?.role || c?.type || 'unknown';
      const content = typeof c === 'string' ? c : (c?.text || c?.content || '');
      if (content) userLines.push(`  ${role}: ${content}`);
    }
  }
  userLines.push(`User message: ${text || '(empty)'}`);

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userLines.join('\n') || '(empty — nothing to extract)' },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// buildRulePrompt — distill a general rule from N corrections
// ────────────────────────────────────────────────────────────────────────────

export function buildRulePrompt(corrections, _cfg = {}) {
  if (!Array.isArray(corrections) || corrections.length === 0) return [];

  const systemContent = 'You are a rule distillation assistant. From multiple user corrections, infer a single general rule that prevents the same class of mistakes. Return JSON: { "content": string, "category": "coding"|"communication"|"workflow"|"safety", "tags": string[], "source_corrections": string[] }. Respond with JSON only.';

  const userLines = ['Corrections to distill:'];
  for (const c of corrections) {
    userLines.push(`- [${c.id}] ${c.error_summary || c.rule || c.correct_action || '(no summary)'}`);
    if (c.root_cause) userLines.push(`  Root cause: ${c.root_cause}`);
    if (c.rule) userLines.push(`  Rule: ${c.rule}`);
  }

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userLines.join('\n') },
  ];
}
