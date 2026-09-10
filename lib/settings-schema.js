const SETTINGS_SCHEMA_VERSION = 1;
const EMBEDDING_PROVIDERS = ["none", "ollama", "openai-compatible"];
const SCOPES = ["user", "project", "domain", "episodic"];
const settingsSchema = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  fields: [
    // ─── embedding ────────────────────────────────────────────────────────
    {
      key: "embedding.provider",
      type: "enum",
      label: "Embedding provider",
      options: [...EMBEDDING_PROVIDERS],
      default: "none",
      description: "none = FTS5 keyword fallback only; ollama = local Ollama service; openai-compatible = any OpenAI-style API."
    },
    { key: "embedding.model", type: "string", label: "Model name", default: "", placeholder: "bge-m3", showWhen: { "embedding.provider": ["ollama", "openai-compatible"] } },
    { key: "embedding.dimension", type: "integer", label: "Vector dimension", default: 1024, showWhen: { "embedding.provider": ["ollama", "openai-compatible"] } },
    { key: "embedding.batch_size", type: "integer", label: "Batch size", default: 16, description: "Number of texts per embedding API call.", showWhen: { "embedding.provider": ["ollama", "openai-compatible"] } },
    { key: "embedding.timeout_ms", type: "integer", label: "Timeout (ms)", default: 3e4, description: "If an embedding call exceeds this, recall short-circuits to FTS5.", showWhen: { "embedding.provider": ["ollama", "openai-compatible"] } },
    { key: "embedding.ollama.base_url", type: "string", label: "Ollama base URL", default: "http://127.0.0.1:11434", showWhen: { "embedding.provider": ["ollama"] } },
    { key: "embedding.openai_compatible.base_url", type: "string", label: "API base URL", default: "", placeholder: "https://api.siliconflow.cn/v1", showWhen: { "embedding.provider": ["openai-compatible"] } },
    {
      key: "embedding.openai_compatible.api_key",
      type: "string",
      label: "API key",
      default: "",
      placeholder: "sk-...",
      showWhen: { "embedding.provider": ["openai-compatible"] },
      description: 'API key string. For DSH SecretRef, prefix with "$" (e.g. "$EMBEDDING_API_KEY") to resolve from env.'
    },
    // ─── recall ───────────────────────────────────────────────────────────
    { key: "recall.maxHits", type: "integer", label: "Max hits", default: 10 },
    { key: "recall.maxRecallBytes", type: "integer", label: "Per-hit truncation (bytes)", default: 4096 },
    { key: "recall.tokenBudget", type: "integer", label: "Pre-step token budget", default: 1e3 },
    { key: "recall.scope", type: "enum-multi", label: "Active scopes", options: [...SCOPES], default: [...SCOPES] },
    // ─── l7 consolidate ────────────────────────────────────────────────────
    { key: "l7.enabled", type: "boolean", label: "L7 background consolidation", default: true, description: "When on, auto-extracts memories from conversations on session end." },
    { key: "l7.intervalMs", type: "integer", label: "Interval (ms)", default: 216e5 },
    { key: "l7.batchTurns", type: "integer", label: "Batch size (turns)", default: 50 },
    { key: "l7.autoExtract", type: "boolean", label: "Auto-extract", default: true },
    { key: "l7.extractorModel", type: "string", label: "Extractor model", default: "" },
    { key: "l7.extractorTemp", type: "number", label: "Extractor temp", default: 0.2 },
    {
      key: "l7.confirmThreshold",
      type: "number",
      label: "Confirm threshold",
      default: 0.6,
      description: "L7 candidates below this confidence go to the confirm queue instead of being inserted as active memories. 0 disables queuing; 1.0 requires confirmation for all."
    },
    // ─── domain keywords (scope auto-detect) ──────────────────────────────
    {
      key: "domainKeywords",
      type: "string-list",
      label: "Domain keywords",
      default: ["\u4E2D\u56FD\u6CD5", "legal", "\u7F16\u7A0B", "programming", "\u5199\u4F5C", "writing"],
      description: 'If mem_record content contains any of these, scope auto-detect picks "domain".'
    },
    // ─── audit ─────────────────────────────────────────────────────────────
    { key: "audit.retentionRows", type: "integer", label: "Audit retention (rows)", default: 1e5 },
    // ── self-evolving config ──
    { key: "signalWords", type: "string-list", label: "Correction signal words", default: ["\u4E0D\u5BF9", "\u5E94\u8BE5\u662F", "\u9519\u4E86", "\u4E0D\u662F\u8FD9\u6837", "\u91CD\u505A", "\u522B\u8FD9\u6837", "\u4E0D\u6B63\u786E", "\u6709\u95EE\u9898", "wrong", "should be", "not like this", "redo", "incorrect", "that's not right", "this is wrong"] },
    { key: "ruleThreshold", type: "integer", label: "Rule extraction threshold", default: 5 },
    { key: "ruleTokenBudget", type: "integer", label: "Rule injection token budget", default: 800 },
    { key: "provider", type: "string", label: "LLM provider route id", default: "" },
    { key: "llmTimeoutMs", type: "integer", label: "LLM call timeout (ms)", default: 3e4 },
    { key: "batchSize", type: "integer", label: "Extraction batch size", default: 3 }
  ]
};
const SETTINGS_NS = "long-memory";
function settingsDefaults() {
  const out = {};
  for (const f of settingsSchema.fields) {
    const parts = f.key.split(".");
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cursor[parts[i]] !== "object" || cursor[parts[i]] === null) cursor[parts[i]] = {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = structuredClone(f.default);
  }
  return out;
}
function validateSettings(patch) {
  const issues = [];
  for (const f of settingsSchema.fields) {
    const v = readPath(patch, f.key);
    if (v === void 0 || v === null) continue;
    switch (f.type) {
      case "integer":
        if (typeof v !== "number" || !Number.isInteger(v)) issues.push(`${f.key}: expected integer`);
        break;
      case "number":
        if (typeof v !== "number") issues.push(`${f.key}: expected number`);
        break;
      case "boolean":
        if (typeof v !== "boolean") issues.push(`${f.key}: expected boolean`);
        break;
      case "enum":
        if (!(f.options ?? []).includes(v)) issues.push(`${f.key}: must be one of ${(f.options ?? []).join("|")}`);
        break;
      case "enum-multi":
        if (!Array.isArray(v) || v.some((x) => !(f.options ?? []).includes(x))) issues.push(`${f.key}: bad array`);
        break;
      case "string-list":
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) issues.push(`${f.key}: bad string[]`);
        break;
      case "string":
        if (typeof v !== "string") issues.push(`${f.key}: expected string`);
        break;
    }
  }
  return issues;
}
function readPath(obj, path) {
  return path.split(".").reduce((acc, k) => acc !== null && typeof acc === "object" ? acc[k] : void 0, obj);
}
export {
  EMBEDDING_PROVIDERS,
  SCOPES,
  SETTINGS_NS,
  SETTINGS_SCHEMA_VERSION,
  settingsDefaults,
  settingsSchema,
  validateSettings
};
//# sourceMappingURL=settings-schema.js.map
