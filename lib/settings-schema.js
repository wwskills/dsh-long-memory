// @wwskills/dsh-long-memory — settings schema (M1.5)
//
// The shape of the `long-memory.config.*` namespace, expressed as a plain
// zod-ish spec consumable by both node (validation, defaults) and browser
// (schema-form rendering).
//
// Sections:
//   embedding.*     — provider / endpoint / model / dimension / api key ref
//   recall.*        — max_hits / max_recall_bytes / token_budget / scope
//   storage.*       — path / markdown_dir / driver
//   l7.*            — enabled / interval_ms / batch_turns / auto_extract
//                     / extractor_model / extractor_temp
//   domain_keywords — list of literal strings for scope auto-detect (§3.4)
//   audit.*         — retention_rows

export const SETTINGS_SCHEMA_VERSION = 1;

export const EMBEDDING_PROVIDERS = ['none', 'ollama', 'openai-compatible'];

export const SCOPES = ['user', 'project', 'domain', 'episodic'];

/**
 * The settings document shape. We use a typed-table description that maps
 * 1:1 onto a JSON Schema later when dsh-schema-form lands a zod adapter.
 * For now this object is consumed by lib/index.js's SettingsService to
 * register the namespace, and exported so the browser UI can read it.
 */
export const settingsSchema = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  fields: [
    // ─── embedding ────────────────────────────────────────────────────────
    {
      key: 'embedding.provider',
      type: 'enum',
      label: 'Embedding provider',
      options: EMBEDDING_PROVIDERS,
      default: 'none',
      description: 'none = FTS5 keyword fallback only; ollama = local Ollama service; openai-compatible = any OpenAI-style API (SiliconFlow, OpenAI, Tencent Cloud, etc.)'
    },
    {
      key: 'embedding.model',
      type: 'string',
      label: 'Model name',
      default: '',
      placeholder: 'bge-m3',
      showWhen: { 'embedding.provider': ['ollama', 'openai-compatible'] }
    },
    {
      key: 'embedding.dimension',
      type: 'integer',
      label: 'Vector dimension',
      default: 1024,
      showWhen: { 'embedding.provider': ['ollama', 'openai-compatible'] }
    },
    {
      key: 'embedding.batch_size',
      type: 'integer',
      label: 'Batch size',
      default: 16,
      description: 'Number of texts per embedding API call.',
      showWhen: { 'embedding.provider': ['ollama', 'openai-compatible'] }
    },
    {
      key: 'embedding.timeout_ms',
      type: 'integer',
      label: 'Timeout (ms)',
      default: 30000,
      description: 'If an embedding call exceeds this, recall short-circuits to FTS5 (§15).',
      showWhen: { 'embedding.provider': ['ollama', 'openai-compatible'] }
    },
    {
      key: 'embedding.ollama.base_url',
      type: 'string',
      label: 'Ollama base URL',
      default: 'http://127.0.0.1:11434',
      showWhen: { 'embedding.provider': ['ollama'] }
    },
    {
      key: 'embedding.openai_compatible.base_url',
      type: 'string',
      label: 'API base URL',
      default: '',
      placeholder: 'https://api.siliconflow.cn/v1',
      showWhen: { 'embedding.provider': ['openai-compatible'] }
    },
    {
      key: 'embedding.openai_compatible.api_key',
      type: 'string',
      label: 'API key',
      default: '',
      placeholder: 'sk-...',
      showWhen: { 'embedding.provider': ['openai-compatible'] },
      description: 'API key string. For DSH SecretRef, prefix with "$" (e.g. "$EMBEDDING_API_KEY") to resolve from env.'
    },

    // ─── recall ───────────────────────────────────────────────────────────
    { key: 'recall.maxHits',             type: 'integer', label: 'Max hits', default: 10 },
    { key: 'recall.maxRecallBytes',      type: 'integer', label: 'Per-hit truncation (bytes)', default: 4096 },
    { key: 'recall.tokenBudget',         type: 'integer', label: 'Pre-step token budget', default: 1000 },
    {
      key: 'recall.scope',
      type: 'enum-multi',
      label: 'Active scopes',
      options: SCOPES,
      default: SCOPES
    },

    // ─── l7 consolidate ────────────────────────────────────────────────────
    {
      key: 'l7.enabled',
      type: 'boolean',
      label: 'L7 background consolidation',
      default: true,
      description: 'When on, auto-extracts memories from conversations on session end.'
    },
    { key: 'l7.intervalMs',     type: 'integer', label: 'Interval (ms)',     default: 21600000 },
    { key: 'l7.batchTurns',     type: 'integer', label: 'Batch size (turns)', default: 50 },
    { key: 'l7.autoExtract',    type: 'boolean', label: 'Auto-extract',      default: true },
    { key: 'l7.extractorModel', type: 'string',  label: 'Extractor model',   default: '' },
    { key: 'l7.extractorTemp',  type: 'number',  label: 'Extractor temp',    default: 0.2 },

    // ─── domain keywords (scope auto-detect) ──────────────────────────────
    {
      key: 'domainKeywords',
      type: 'string-list',
      label: 'Domain keywords',
      default: ['中国法', 'legal', '编程', 'programming', '写作', 'writing'],
      description: 'If mem_record content contains any of these, scope auto-detect picks "domain".'
    },

    // ─── audit ─────────────────────────────────────────────────────────────
    { key: 'audit.retentionRows', type: 'integer', label: 'Audit retention (rows)', default: 100000 }
  ]
};

export const SETTINGS_NS = 'long-memory';

/**
 * Default values flattened into a plain object, ready to be the seed for the
 * settings namespace on a fresh install.
 */
export function settingsDefaults() {
  const out = {};
  for (const f of settingsSchema.fields) {
    const parts = f.key.split('.');
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] = cursor[parts[i]] ?? {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = structuredClone(f.default);
  }
  return out;
}

/**
 * Validate a settings patch against the schema; returns a list of issues.
 * Light-weight: only checks types + required presence. M2 will add a real
 * zod-backed validator.
 */
export function validateSettings(patch) {
  const issues = [];
  for (const f of settingsSchema.fields) {
    const v = readPath(patch, f.key);
    if (v === undefined || v === null) continue;
    switch (f.type) {
      case 'integer':
        if (typeof v !== 'number' || !Number.isInteger(v)) issues.push(`${f.key}: expected integer`);
        break;
      case 'number':
        if (typeof v !== 'number') issues.push(`${f.key}: expected number`);
        break;
      case 'boolean':
        if (typeof v !== 'boolean') issues.push(`${f.key}: expected boolean`);
        break;
      case 'enum':
        if (!f.options.includes(v)) issues.push(`${f.key}: must be one of ${f.options.join('|')}`);
        break;
      case 'enum-multi':
        if (!Array.isArray(v) || v.some((x) => !f.options.includes(x))) issues.push(`${f.key}: bad array`);
        break;
      case 'string-list':
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) issues.push(`${f.key}: bad string[]`);
        break;
      case 'string':
        if (typeof v !== 'string') issues.push(`${f.key}: expected string`);
        break;
    }
  }
  return issues;
}

function readPath(obj, path) {
  return path.split('.').reduce((acc, k) => acc?.[k], obj);
}