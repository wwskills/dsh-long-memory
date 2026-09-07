// Tool parameter/output schemas.
//
// Plain shape descriptors compatible with dsh-tools' ParameterSchemaSpec /
// ValueSchemaSpec DSL. Kept as plain data so they also feed the settings UI
// (the schema-form renderer walks the same shape).

/** A dsh-tools value/parameter schema node. */
export interface SchemaSpec {
  type?: string
  required?: boolean
  description?: string
  enum?: readonly string[]
  items?: SchemaSpec
  properties?: Record<string, SchemaSpec>
  additionalProperties?: boolean
}

/** A tool's parameter map. */
export type ParamsSpec = Record<string, SchemaSpec>

// Enumerated string sets — exported so tool implementations can validate too.

export const TYPES = Object.freeze([
  'USER', 'PREFERENCE', 'PROJECT', 'FACT', 'SKILL', 'EVENT', 'TASK',
] as const)

export const SCOPES = Object.freeze(['user', 'project', 'domain', 'episodic'] as const)

export const ORIGINS = Object.freeze([
  'owner', 'agent', 'untrusted', 'system', 'user-edited',
] as const)

export const SCORE_PATHS = Object.freeze([
  'exact', 'generalized', 'hybrid', 'fts5-only', 'vector-only',
] as const)

export const MEMORY_STATUSES = Object.freeze(['active', 'archived', 'superseded'] as const)

export const CONFIRM_STATUSES = Object.freeze(['pending', 'approved', 'rejected'] as const)

export const SESSION_KINDS = Object.freeze([
  'interactive', 'cron', 'heartbeat', 'subagent',
] as const)

// ────────────────────────────────────────────────────────────────────────────
// Tool parameter schemas
// ────────────────────────────────────────────────────────────────────────────

export const memSearchParams: ParamsSpec = {
  query: { type: 'string', required: true, description: 'Search query (max 500 chars).' },
  scope: {
    type: 'array',
    items: { type: 'string', enum: [...SCOPES] },
    description: 'Restrict to these scopes. Default: all.',
  },
  limit: { type: 'integer', description: 'Default 10, max 50.' },
  since: { type: 'integer', description: 'Timestamp (ms). Default 0 (no lower bound).' },
  session_id: { type: 'string', description: 'Filter by originating session id.' },
  include_superseded: { type: 'boolean', description: 'Default false.' },
  include_archived: { type: 'boolean', description: 'Default false.' },
  use_vector: { type: 'boolean', description: 'Default true if embedding available, else false.' },
}

export const memRecordParams: ParamsSpec = {
  memory_type: { type: 'string', enum: [...TYPES], required: true, description: 'Type of memory: USER | PREFERENCE | PROJECT | FACT | SKILL | EVENT | TASK' },
  content: { type: 'string', required: true, description: 'Max 2000 chars (soft limit).' },
  scope: { type: 'string', enum: [...SCOPES], description: 'Auto-detected if omitted.' },
  supersession_key: { type: 'string', description: 'Version key for in-place update.' },
  tags: {
    type: 'array',
    items: { type: 'string' },
    description: 'Max 10 tags.',
  },
  lang: { type: 'string', description: 'BCP-47 tag (e.g. zh-CN). Defaults to current locale.' },
  confidence: { type: 'number', description: '0..1. Default 1.0.' },
}

export const memStatusParams: ParamsSpec = {}

export const memStatsParams: ParamsSpec = {
  scope: { type: 'string', enum: [...SCOPES] },
  group_by: { type: 'string', enum: ['type', 'scope', 'origin'] },
}

export const memForgetParams: ParamsSpec = {
  target: {
    type: 'object',
    additionalProperties: false,
    required: true,
    description: 'Either { kind: "id", id } | { kind: "scope", scope } | { kind: "supersession_key", key }.',
    properties: {
      kind: { type: 'string', enum: ['id', 'scope', 'supersession_key'], required: true },
      id: { type: 'string' },
      scope: { type: 'string', enum: [...SCOPES] },
      key: { type: 'string' },
    },
  },
  reason: { type: 'string', description: 'Logged; required when target scope is "user".' },
  hard: { type: 'boolean', description: 'true = DELETE row, false = archive. Default false.' },
}

export const memConfirmParams: ParamsSpec = {
  queue_id: { type: 'string', required: true },
  decision: { type: 'string', enum: ['approve', 'reject'], required: true },
  reason: { type: 'string' },
}

// ────────────────────────────────────────────────────────────────────────────
// Tool output schemas
// ────────────────────────────────────────────────────────────────────────────

export const memSearchOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    hits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          content: { type: 'string' },
          origin: { type: 'string' },
          score: { type: 'number' },
          score_path: { type: 'string', enum: [...SCORE_PATHS] },
          scope: { type: 'string' },
          session_id: { type: 'string' },
          lang: { type: 'string' },
          observed_at: { type: 'integer' },
          confidence: { type: 'number', description: 'Memory confidence score (0..1). Trust-weighted ranking.' },
        },
      },
    },
    total: { type: 'integer' },
    truncated: { type: 'boolean' },
    score_path: { type: 'string', enum: [...SCORE_PATHS] },
  },
}

export const memRecordOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['active', 'pending-confirm', 'no-op'] },
    superseded: {
      type: 'object',
      additionalProperties: false,
      properties: {
        count: { type: 'integer' },
        ids: { type: 'array', items: { type: 'string' } },
      },
    },
    pending_confirm_id: { type: 'string' },
  },
}

export const memStatusOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema_version: { type: 'integer' },
    storage_path: { type: 'string' },
    storage_mode: { type: 'string' },
    total_records: { type: 'integer' },
    by_scope: { type: 'object', additionalProperties: true },
    by_type: { type: 'object', additionalProperties: true },
    embedding_available: { type: 'boolean' },
    l7_last_run: { type: 'integer' },
    pending_confirms: { type: 'integer' },
  },
}

export const memStatsOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    total: { type: 'integer' },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string' },
          count: { type: 'integer' },
          avg_confidence: { type: 'number' },
        },
      },
    },
    oldest: { type: 'integer' },
    newest: { type: 'integer' },
  },
}

export const memForgetOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    affected: { type: 'integer' },
    archived: { type: 'integer' },
    deleted: { type: 'integer' },
  },
}

export const memConfirmOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['active', 'rejected'] },
    memory_id: { type: 'string' },
  },
}

// ────────────────────────────────────────────────────────────────────────────
// Scope management tools
// ────────────────────────────────────────────────────────────────────────────

export const memScopeListParams: ParamsSpec = {}

export const memScopeListOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scopes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          scope: { type: 'string' },
          count: { type: 'integer' },
          active: { type: 'boolean' },
        },
      },
    },
  },
}

export const memScopeSetActiveParams: ParamsSpec = {
  scope: { type: 'string', required: true, description: 'Scope to activate (e.g. "project", "project:main", "user")' },
}

export const memScopeSetActiveOutput: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    previous: { type: 'string' },
    current: { type: 'string' },
    archived: { type: 'integer' },
  },
}
