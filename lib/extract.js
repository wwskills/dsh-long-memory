class TaskQueue {
  concurrency;
  timeout;
  queue = [];
  running = 0;
  disposed = false;
  constructor(opts = {}) {
    this.concurrency = opts.concurrency ?? 1;
    this.timeout = opts.timeout ?? 3e4;
  }
  add(fn) {
    if (this.disposed) return Promise.reject(new Error("TaskQueue disposed"));
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.drain();
    });
  }
  drain() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry === void 0) return;
      this.running += 1;
      const timer = setTimeout(() => {
        entry.reject(new Error(`TaskQueue: task timed out after ${this.timeout}ms`));
        this.done();
      }, this.timeout);
      void Promise.resolve().then(() => entry.fn()).then(entry.resolve, entry.reject).finally(() => {
        clearTimeout(timer);
        this.done();
      });
    }
  }
  done() {
    this.running -= 1;
    if (this.queue.length > 0) this.drain();
  }
  dispose() {
    this.disposed = true;
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry === void 0) break;
      entry.reject(new Error("TaskQueue disposed"));
    }
  }
}
async function streamLlm(llm, opts = { messages: [] }) {
  if (llm === null || llm === void 0 || typeof llm.stream !== "function") {
    throw new Error("streamLlm: llm service unavailable or missing stream() method");
  }
  if (!Array.isArray(opts.messages) || opts.messages.length === 0) {
    throw new Error("streamLlm: messages array required and non-empty");
  }
  const request = { input: { messages: opts.messages, stream: true }, signal: opts.signal };
  if (opts.model !== void 0) request.model = opts.model;
  if (opts.provider !== void 0) request.provider = opts.provider;
  const raw = llm.stream(request);
  const iter = raw !== null && typeof raw === "object" && typeof raw.then === "function" ? await raw : raw;
  if (iter === null || iter === void 0 || typeof iter[Symbol.asyncIterator] !== "function") {
    throw new Error("streamLlm: llm.stream() did not return an async iterable");
  }
  let text = "";
  for await (const chunk of iter) {
    if (chunk === null || chunk === void 0) continue;
    if (chunk.delta !== void 0 && typeof chunk.delta.text === "string") {
      text += chunk.delta.text;
    } else if (typeof chunk.text === "string") {
      text += chunk.text;
    }
    if (chunk.type === "message_stop" || chunk.type === "done") break;
  }
  return text;
}
function parseJsonResponse(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
  }
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fence !== null) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
    }
  }
  const start = text.search(/[[{]/);
  if (start >= 0) {
    try {
      return JSON.parse(text.slice(start));
    } catch {
    }
  }
  const m = /(\[[\s\S]*\]|\{[\s\S]*\})/.exec(text);
  if (m !== null) {
    try {
      return JSON.parse(m[1]);
    } catch {
    }
  }
  return null;
}
function buildLessonPrompt(opts = {}) {
  const systemContent = 'You are a lesson extraction assistant. Analyze the user correction and extract a structured lesson. Return JSON: { "error_summary": string, "root_cause": string, "correct_action": string, "rule": string, "confidence": number }. All fields are strings except confidence (0-1). Respond with JSON only, no prose.';
  const userLines = [];
  if (opts.sessionHint !== void 0) userLines.push(`Session: ${opts.sessionHint}`);
  if (Array.isArray(opts.context) && opts.context.length > 0) {
    userLines.push("Recent context:");
    for (const c of opts.context.slice(-5)) {
      const role = String(c?.role ?? c?.type ?? "unknown");
      const content = typeof c === "string" ? c : String(c?.text ?? c?.content ?? "");
      if (content.length > 0) userLines.push(`  ${role}: ${content}`);
    }
  }
  userLines.push(`User message: ${opts.text ?? "(empty)"}`);
  return [
    { role: "system", content: systemContent },
    { role: "user", content: userLines.join("\n") || "(empty \u2014 nothing to extract)" }
  ];
}
function buildRulePrompt(corrections) {
  if (!Array.isArray(corrections) || corrections.length === 0) return [];
  const systemContent = 'You are a rule distillation assistant. From multiple user corrections, infer a single general rule that prevents the same class of mistakes. Return JSON: { "content": string, "category": "coding"|"communication"|"workflow"|"safety", "tags": string[], "source_corrections": string[] }. Respond with JSON only.';
  const userLines = ["Corrections to distill:"];
  for (const c of corrections) {
    userLines.push(`- [${c.id}] ${c.error_summary ?? c.rule ?? c.correct_action ?? "(no summary)"}`);
    if (c.root_cause !== void 0) userLines.push(`  Root cause: ${c.root_cause}`);
    if (c.rule !== void 0) userLines.push(`  Rule: ${c.rule}`);
  }
  return [
    { role: "system", content: systemContent },
    { role: "user", content: userLines.join("\n") }
  ];
}
export {
  TaskQueue,
  buildLessonPrompt,
  buildRulePrompt,
  parseJsonResponse,
  streamLlm
};
//# sourceMappingURL=extract.js.map
