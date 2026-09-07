// SPDX-License-Identifier: MIT
/**
 * Typed client for the long-memory Web API. Every route lives here so the
 * components never hand-build URLs or repeat the list-response unwrapping.
 *
 * Note: the HTTP prefix is `dsh-long-memory` (the plugin's route namespace),
 * which differs from the module id `@wwskills/dsh-long-memory`.
 *
 * @module @wwskills/dsh-long-memory/client/api
 */

const BASE = '/plugins/dsh-long-memory/api'

// ── Domain shapes (loose — the backend is the source of truth) ──────────────

export interface Correction {
  id: string
  trigger: string
  error_summary?: string
  root_cause?: string
  correct_action?: string
  rule?: string
  context?: string
  status: string
  created_at: number
}

export interface Rule {
  id: string
  content: string
  category: string
  tags?: string[] | string
  status: string
  hit_count?: number
  last_hit_at?: number
  source_correction_ids?: string[]
  correction_ids?: string[]
  sources?: string[]
}

export interface Memory {
  id: string
  type: string
  scope: string
  content: string
  origin?: string
  status: string
  confidence?: number
  access_count?: number
  observed_at?: number
  tags?: string[] | string
  score?: number
}

export interface Stats {
  corrections_pending?: number
  rules_proposed?: number
  memories_active?: number
  memories_archived?: number
  [key: string]: unknown
}

export interface EmbeddingStatus { mode?: string, [key: string]: unknown }

export interface PluginConfigView {
  enabled?: boolean
  batchSize?: number
  ruleThreshold?: number
  ruleTokenBudget?: number
  llmTimeoutMs?: number
  personaEverySessions?: number
  personaEveryMs?: number
  model?: string
  signalWords?: string[] | string
  embedding?: Record<string, unknown>
  embeddingStatus?: EmbeddingStatus
}

// ── Low-level helpers ───────────────────────────────────────────────────────

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<T>
}

async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<T>
}

/** Unwrap the various list envelopes the backend may return. */
function asList<T>(data: unknown, ...keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data !== null && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key]
      if (Array.isArray(value)) return value as T[]
    }
  }
  return []
}

// ── Stats / config ──────────────────────────────────────────────────────────

export const getStats = (): Promise<Stats> => getJson<Stats>('/stats')
export const getConfig = (): Promise<PluginConfigView> => getJson<PluginConfigView>('/config')
export const saveConfig = (payload: Record<string, unknown>): Promise<PluginConfigView> => sendJson('POST', '/config', payload)
export const setEnabled = (enabled: boolean): Promise<PluginConfigView> => sendJson('POST', '/config', { enabled })
export const probeEmbedding = (): Promise<PluginConfigView> => sendJson('POST', '/config', { __testEmbedding: true })

// ── Corrections ───────────────────────────────────────────────────────────

export async function listCorrections(): Promise<Correction[]> {
  return asList<Correction>(await getJson('/corrections'), 'corrections')
}
export const extractCorrection = (id: string): Promise<unknown> => sendJson('POST', `/corrections/${encodeURIComponent(id)}/extract`)
export const ignoreCorrection = (id: string): Promise<unknown> => sendJson('POST', `/corrections/${encodeURIComponent(id)}/ignore`)

// ── Rules ─────────────────────────────────────────────────────────────────

export async function listRules(status: string): Promise<Rule[]> {
  return asList<Rule>(await getJson(`/rules?status=${encodeURIComponent(status)}`), 'rules', 'items')
}
export const approveRule = (id: string): Promise<{ warning?: { conflicts?: Array<{ overlap: number, content: string, id: string }> } }> =>
  sendJson('POST', `/rules/${encodeURIComponent(id)}/approve`)
export const rejectRule = (id: string): Promise<unknown> => sendJson('POST', `/rules/${encodeURIComponent(id)}/reject`)
export const updateRule = (id: string, patch: { content?: string, category?: string, tags?: string[] }): Promise<unknown> =>
  sendJson('PUT', `/rules/${encodeURIComponent(id)}`, patch)
export async function promoteRule(id: string): Promise<string> {
  const data = await sendJson<Record<string, unknown>>('POST', `/rules/${encodeURIComponent(id)}/promote`)
  return String(data.draft ?? data.agents_md ?? data.text ?? '')
}

// ── Memories ────────────────────────────────────────────────────────────────

export interface MemoryQuery {
  q?: string
  scope?: string
  type?: string
  status?: string
  limit?: number
}

export async function listMemories(query: MemoryQuery = {}): Promise<Memory[]> {
  const params = new URLSearchParams()
  if (query.q !== undefined && query.q !== '') params.set('q', query.q)
  if (query.scope !== undefined && query.scope !== '' && query.scope !== 'all') params.set('scope', query.scope)
  if (query.type !== undefined && query.type !== '' && query.type !== 'all') params.set('type', query.type)
  // Backend ignores status while searching; only send it in browse mode.
  if (query.q === undefined || query.q === '') {
    if (query.status !== undefined && query.status !== '' && query.status !== 'all') params.set('status', query.status)
  }
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  const qs = params.toString()
  return asList<Memory>(await getJson(`/memories${qs !== '' ? `?${qs}` : ''}`), 'rows', 'items', 'memories')
}
export const archiveMemory = (id: string): Promise<unknown> => sendJson('PUT', `/memories/${encodeURIComponent(id)}`, { status: 'archived' })
export async function deleteMemory(id: string, hard: boolean, reason?: string): Promise<unknown> {
  const r = await fetch(`${BASE}/memories`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, hard, reason: reason ?? (hard ? 'ui-hard-delete' : 'ui-delete') }),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

// ── Persona ─────────────────────────────────────────────────────────────────

export const getPersona = (): Promise<unknown> => getJson('/persona')
export const savePersonaDim = (key: string, value: string): Promise<unknown> => sendJson('PUT', `/persona/${encodeURIComponent(key)}`, { value })
export const rebuildPersona = (): Promise<unknown> => sendJson('POST', '/persona/rebuild')
