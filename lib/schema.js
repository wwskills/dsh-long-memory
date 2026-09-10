const TYPES = Object.freeze([
  "USER",
  "PREFERENCE",
  "PROJECT",
  "FACT",
  "SKILL",
  "EVENT",
  "TASK"
]);
const SCOPES = Object.freeze(["user", "project", "domain", "episodic"]);
const ORIGINS = Object.freeze([
  "owner",
  "agent",
  "untrusted",
  "system",
  "user-edited"
]);
const SCORE_PATHS = Object.freeze([
  "exact",
  "generalized",
  "hybrid",
  "fts5-only",
  "vector-only"
]);
const MEMORY_STATUSES = Object.freeze(["active", "archived", "superseded"]);
const CONFIRM_STATUSES = Object.freeze(["pending", "approved", "rejected"]);
const SESSION_KINDS = Object.freeze([
  "interactive",
  "cron",
  "heartbeat",
  "subagent"
]);
const memSearchParams = {
  query: { type: "string", required: true, description: "Search query (max 500 chars)." },
  scope: {
    type: "array",
    items: { type: "string", enum: [...SCOPES] },
    description: "Restrict to these scopes. Default: all."
  },
  limit: { type: "integer", description: "Default 10, max 50." },
  since: { type: "integer", description: "Timestamp (ms). Default 0 (no lower bound)." },
  session_id: { type: "string", description: "Filter by originating session id." },
  include_superseded: { type: "boolean", description: "Default false." },
  include_archived: { type: "boolean", description: "Default false." },
  use_vector: { type: "boolean", description: "Default true if embedding available, else false." }
};
const memRecordParams = {
  memory_type: { type: "string", enum: [...TYPES], required: true, description: "Type of memory: USER | PREFERENCE | PROJECT | FACT | SKILL | EVENT | TASK" },
  content: { type: "string", required: true, description: "Max 2000 chars (soft limit)." },
  scope: { type: "string", enum: [...SCOPES], description: "Auto-detected if omitted." },
  supersession_key: { type: "string", description: "Version key for in-place update." },
  tags: {
    type: "array",
    items: { type: "string" },
    description: "Max 10 tags."
  },
  lang: { type: "string", description: "BCP-47 tag (e.g. zh-CN). Defaults to current locale." },
  confidence: { type: "number", description: "0..1. Default 1.0." }
};
const memStatusParams = {};
const memStatsParams = {
  scope: { type: "string", enum: [...SCOPES] },
  group_by: { type: "string", enum: ["type", "scope", "origin"] }
};
const memForgetParams = {
  target: {
    type: "object",
    additionalProperties: false,
    required: true,
    description: 'Either { kind: "id", id } | { kind: "scope", scope } | { kind: "supersession_key", key }.',
    properties: {
      kind: { type: "string", enum: ["id", "scope", "supersession_key"], required: true },
      id: { type: "string" },
      scope: { type: "string", enum: [...SCOPES] },
      key: { type: "string" }
    }
  },
  reason: { type: "string", description: 'Logged; required when target scope is "user".' },
  hard: { type: "boolean", description: "true = DELETE row, false = archive. Default false." }
};
const memConfirmParams = {
  queue_id: { type: "string", required: true },
  decision: { type: "string", enum: ["approve", "reject"], required: true },
  reason: { type: "string" }
};
const memSearchOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    hits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          content: { type: "string" },
          origin: { type: "string" },
          score: { type: "number" },
          score_path: { type: "string", enum: [...SCORE_PATHS] },
          scope: { type: "string" },
          session_id: { type: "string" },
          lang: { type: "string" },
          observed_at: { type: "integer" },
          confidence: { type: "number", description: "Memory confidence score (0..1). Trust-weighted ranking." }
        }
      }
    },
    total: { type: "integer" },
    truncated: { type: "boolean" },
    score_path: { type: "string", enum: [...SCORE_PATHS] }
  }
};
const memRecordOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    status: { type: "string", enum: ["active", "pending-confirm", "no-op"] },
    superseded: {
      type: "object",
      additionalProperties: false,
      properties: {
        count: { type: "integer" },
        ids: { type: "array", items: { type: "string" } }
      }
    },
    pending_confirm_id: { type: "string" }
  }
};
const memStatusOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_version: { type: "integer" },
    storage_path: { type: "string" },
    storage_mode: { type: "string" },
    total_records: { type: "integer" },
    by_scope: { type: "object", additionalProperties: true },
    by_type: { type: "object", additionalProperties: true },
    embedding_available: { type: "boolean" },
    l7_last_run: { type: "integer" },
    pending_confirms: { type: "integer" }
  }
};
const memStatsOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    total: { type: "integer" },
    groups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string" },
          count: { type: "integer" },
          avg_confidence: { type: "number" }
        }
      }
    },
    oldest: { type: "integer" },
    newest: { type: "integer" }
  }
};
const memForgetOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    affected: { type: "integer" },
    archived: { type: "integer" },
    deleted: { type: "integer" }
  }
};
const memConfirmOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["active", "rejected"] },
    memory_id: { type: "string" }
  }
};
const memScopeListParams = {};
const memScopeListOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    scopes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scope: { type: "string" },
          count: { type: "integer" },
          active: { type: "boolean" }
        }
      }
    }
  }
};
const memScopeSetActiveParams = {
  scope: { type: "string", required: true, description: 'Scope to activate (e.g. "project", "project:main", "user")' }
};
const memScopeSetActiveOutput = {
  type: "object",
  additionalProperties: false,
  properties: {
    previous: { type: "string" },
    current: { type: "string" },
    archived: { type: "integer" }
  }
};
export {
  CONFIRM_STATUSES,
  MEMORY_STATUSES,
  ORIGINS,
  SCOPES,
  SCORE_PATHS,
  SESSION_KINDS,
  TYPES,
  memConfirmOutput,
  memConfirmParams,
  memForgetOutput,
  memForgetParams,
  memRecordOutput,
  memRecordParams,
  memScopeListOutput,
  memScopeListParams,
  memScopeSetActiveOutput,
  memScopeSetActiveParams,
  memSearchOutput,
  memSearchParams,
  memStatsOutput,
  memStatsParams,
  memStatusOutput,
  memStatusParams
};
//# sourceMappingURL=schema.js.map
