// L7 consolidate.
//
// Extracts candidate memories from session conversations. Two modes:
//   • LLM-based: reads DSH's LLM config and calls the provider directly
//   • Keyword heuristic (fallback): regex-based pattern matching
//
// Flow: buffer user messages to SQLite → on turn/end schedule async
// extraction → interval throttle → write candidates (origin='agent') →
// sensitive/low-confidence content → confirm_queue.

import { newId } from './sqlite.js'
import type { SqlDriver } from './sqlite.js'
import { writeMemory } from './write.js'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

/** L7 plugin config subtree. */
export interface L7Config {
  l7?: {
    enabled?: boolean
    interval_ms?: number
    batch_turns?: number
    auto_extract?: boolean
    confirm_threshold?: number
    extractor_model?: string
    extractor_temp?: number
  }
}

/** A candidate memory produced by extraction. */
interface Candidate {
  type: string
  scope: string
  content: string
  confidence: number
}

/** Minimal ctx shape L7 uses (extraction is otherwise ctx-independent). */
type ExtractCtx = unknown

// Use DSH's bundled js-yaml if available; fall back to a minimal inline parser.
const _require = createRequire(import.meta.url)
type YamlParser = (text: string) => Record<string, unknown>
let _parseYAML: YamlParser
try {
  _parseYAML = (_require('js-yaml') as { load: YamlParser }).load
} catch {
  _parseYAML = (text: string): Record<string, unknown> => {
    const result: Record<string, unknown> = {}
    const stack: Array<{ indent: number, obj: Record<string, unknown> }> = [{ indent: -1, obj: result }]
    for (const line of text.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue
      const indent = line.length - line.trimStart().length
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop()
      const parent = stack[stack.length - 1].obj
      const trimmed = line.trim()
      if (trimmed.startsWith('- ')) {
        const key = Object.keys(parent).find(k => Array.isArray(parent[k]))
        if (key) (parent[key] as unknown[]).push(trimmed.slice(2))
      } else {
        const colonIdx = trimmed.indexOf(':')
        if (colonIdx === -1) continue
        const key = trimmed.slice(0, colonIdx).trim()
        const val = trimmed.slice(colonIdx + 1).trim()
        if (val === '' || val === '[]') {
          const child: unknown = val === '[]' ? [] : {}
          parent[key] = child
          if (typeof child === 'object' && !Array.isArray(child)) stack.push({ indent, obj: child as Record<string, unknown> })
        } else {
          parent[key] = val.replace(/^["']|["']$/g, '')
        }
      }
    }
    return result
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Persistent buffer (SQLite)
// ────────────────────────────────────────────────────────────────────────────

/** Buffer a user message to the persistent l7_buffer table. */
export function bufferMessage(driver: SqlDriver, sessionId: string, text: string): void {
  if (!sessionId || !text) return
  try {
    driver.prepare(
      `INSERT INTO l7_buffer (session_id, message, turn_count, created_at) VALUES (?, ?, ?, ?)`,
    ).run(sessionId, text, 0, Date.now())
    driver.prepare(
      `UPDATE l7_buffer SET turn_count = (SELECT COUNT(*) FROM l7_buffer WHERE session_id = ?) WHERE session_id = ? AND id = last_insert_rowid()`,
    ).run(sessionId, sessionId)
  } catch (e) {
    console.warn('[long-memory] L7 buffer failed:', e instanceof Error ? e.message : e)
  }
}

/** Buffered rows for a session, oldest first, with ids for range clearing. */
function getBufferedRows(driver: SqlDriver, sessionId: string): Array<{ id: number, message: string }> {
  return driver.prepare(
    `SELECT id, message FROM l7_buffer WHERE session_id = ? ORDER BY id ASC`,
  ).all(sessionId).map(r => ({ id: Number(r.id), message: String(r.message) }))
}

/** Clear the buffered rows in `[fromId, toId]` for a session. */
function clearBufferRange(driver: SqlDriver, sessionId: string, fromId: number, toId: number): void {
  driver.prepare(`DELETE FROM l7_buffer WHERE session_id = ? AND id >= ? AND id <= ?`).run(sessionId, fromId, toId)
}

/** Count of buffered sessions (diagnostics). */
export function bufferedSessionCount(driver: SqlDriver): number {
  if (!driver) return 0
  try {
    return Number((driver.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM l7_buffer`).get() as { n: number }).n)
  } catch {
    return 0
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Interval tracking
// ────────────────────────────────────────────────────────────────────────────

function getSessionLastRun(driver: SqlDriver, sessionKey: string): number {
  try {
    const row = driver.prepare(`SELECT value FROM schema_meta WHERE key = ?`).get(sessionKey)
    return row !== undefined ? Number(row.value) : 0
  } catch {
    return 0
  }
}

function setSessionLastRun(driver: SqlDriver, sessionKey: string, ts: number): void {
  try {
    driver.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)`).run(sessionKey, String(ts))
    // One key per session, never cleaned elsewhere — prune to the most recent
    // 100 sessions so schema_meta cannot grow without bound.
    try {
      driver.prepare(
        `DELETE FROM schema_meta WHERE key LIKE 'l7_last_run:%' AND key IN (
           SELECT key FROM schema_meta WHERE key LIKE 'l7_last_run:%'
           ORDER BY CAST(value AS INTEGER) DESC LIMIT -1 OFFSET 100
         )`,
      ).run()
    } catch { /* best-effort prune */ }
  } catch { /* best-effort */ }
}

// ────────────────────────────────────────────────────────────────────────────
// Extraction entry point (async, non-blocking)
// ────────────────────────────────────────────────────────────────────────────

/** Sessions with an extraction currently in flight (re-entrancy guard). */
const inflightExtractions = new Set<string>()

/** Schedule L7 extraction asynchronously so turn/end returns instantly. */
export function scheduleExtraction(driver: SqlDriver, sessionId: string, cfg: L7Config = {}, ctx?: ExtractCtx): void {
  if (!cfg.l7?.enabled) return

  const intervalMs = cfg.l7?.interval_ms ?? 21600000 // 6h default
  const sessionKey = `l7_last_run:${sessionId}`
  const lastRun = getSessionLastRun(driver, sessionKey)
  const now = Date.now()
  if (lastRun && now - lastRun < intervalMs) return

  // Re-entrancy guard: turn/end and session/end-seed can arrive almost
  // together, and the throttle timestamp is only written AFTER completion.
  if (inflightExtractions.has(sessionId)) return
  inflightExtractions.add(sessionId)

  setImmediate(async () => {
    try {
      const { extracted } = await extractAndPersist(driver, sessionId, cfg, ctx)
      setSessionLastRun(driver, sessionKey, Date.now())
      if (extracted > 0) console.log(`[long-memory] L7 extracted ${extracted} candidate(s) from session ${sessionId}`)
    } catch (e) {
      console.warn('[long-memory] L7 async extraction failed:', e instanceof Error ? e.message : e)
      // A transient failure must not lock the session out for the full
      // interval — back off 10 minutes instead of 6 hours.
      setSessionLastRun(driver, sessionKey, Date.now() - intervalMs + 10 * 60 * 1000)
    } finally {
      inflightExtractions.delete(sessionId)
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Extraction + persist
// ────────────────────────────────────────────────────────────────────────────

/** Result of one extraction run. */
export interface ExtractResult {
  extracted: number
  queued?: number
  superseded?: number
  candidates: Candidate[]
}

interface ExistingRow {
  id: string
  type: string
  scope: string
  content: string
  confidence: number
  observed_at: number
}

/** Run extraction on a session's buffer and persist candidate memories. */
export async function extractAndPersist(driver: SqlDriver, sessionId: string, cfg: L7Config = {}, ctx?: ExtractCtx): Promise<ExtractResult> {
  const rows = getBufferedRows(driver, sessionId)
  if (rows.length === 0) return { extracted: 0, candidates: [] }

  const maxTurns = cfg.l7?.batch_turns ?? 50
  const recentRows = rows.slice(-maxTurns)
  const messages = recentRows.map(r => r.message)
  // Clear exactly the extracted range: messages OLDER than the batch window
  // must stay buffered — clearing up to the newest id would drop them.
  const firstExtractedRowId = recentRows[0].id
  const lastExtractedRowId = recentRows[recentRows.length - 1].id

  // Try LLM extraction first, fall back to keyword heuristic
  let candidates: Candidate[] | undefined
  if (cfg.l7?.auto_extract !== false && ctx) {
    try {
      candidates = await extractWithLLM(cfg, messages)
      if (candidates.length > 0) console.log(`[long-memory] L7 LLM extracted ${candidates.length} candidate(s)`)
    } catch (e) {
      console.warn('[long-memory] L7 LLM extraction failed, falling back to keyword:', e instanceof Error ? e.message : e)
    }
  }
  if (!candidates || candidates.length === 0) {
    candidates = extractCandidates(messages)
  }

  // Dedup + supersession indexes over existing active memories.
  const existingRows = driver.prepare(
    `SELECT id, type, scope, content, confidence, observed_at
     FROM memories WHERE status='active'
     ORDER BY observed_at DESC`,
  ).all().map(r => ({
    id: String(r.id), type: String(r.type), scope: String(r.scope),
    content: String(r.content), confidence: Number(r.confidence), observed_at: Number(r.observed_at),
  })) as ExistingRow[]

  const existingByPrefix = new Map<string, ExistingRow>()
  for (const r of existingRows) {
    const prefix = r.content.slice(0, 100)
    if (!existingByPrefix.has(prefix)) existingByPrefix.set(prefix, r)
  }
  const existingByTypeScope = new Map<string, ExistingRow[]>()
  for (const r of existingRows) {
    const key = `${r.type}:${r.scope}`
    const list = existingByTypeScope.get(key) ?? []
    list.push(r)
    existingByTypeScope.set(key, list)
  }

  const L7_CONFIRM_THRESHOLD = cfg.l7?.confirm_threshold ?? 0.6

  let extracted = 0
  let queued = 0
  let superseded = 0
  for (const c of candidates) {
    const contentPrefix = c.content.slice(0, 100)
    if (existingByPrefix.get(contentPrefix) !== undefined) continue

    const typeScopeKey = `${c.type}:${c.scope}`
    const similar = (existingByTypeScope.get(typeScopeKey) ?? []).find(r => {
      const minLen = Math.min(r.content.length, c.content.length, 60)
      const overlap = r.content.slice(0, minLen) === c.content.slice(0, minLen)
      return overlap && r.content.slice(0, 30) === c.content.slice(0, 30)
    })

    try {
      if (c.confidence < L7_CONFIRM_THRESHOLD) {
        // Low-confidence → confirm queue. Supersession is deliberately NOT
        // applied: if the user rejects it, the old memory must be intact.
        const queueId = newId()
        driver.prepare(
          `INSERT INTO confirm_queue
             (queue_id, memory_id, type, content, scope, origin, supersession_key,
              confidence, tags, created_at, status)
           VALUES (?, NULL, ?, ?, ?, 'agent', NULL, ?, NULL, ?, 'pending')`,
        ).run(queueId, c.type, c.content, c.scope, c.confidence, Date.now())
        queued += 1
      } else {
        // Above threshold → goes live, so (and only so) is it safe to retire
        // an overlapping older memory — and only when at least as confident.
        if (similar && c.confidence >= (similar.confidence ?? 0)) {
          try {
            driver.prepare(`UPDATE memories SET status = 'superseded' WHERE id = ?`).run(similar.id)
            superseded += 1
          } catch { /* best-effort */ }
        }
        writeMemory(driver, {
          type: c.type, scope: c.scope, content: c.content,
          origin: 'agent', sessionKind: 'interactive',
          sessionId,
          confidence: c.confidence,
          accessCount: 0,
        }, null, {
          actor: `agent:${sessionId}`,
          action: 'record',
          reason: 'l7-auto-extract',
        })
        extracted += 1
      }
    } catch (e) {
      console.warn(`[long-memory] L7 persist failed for ${c.content.slice(0, 40)}: ${e instanceof Error ? e.message : e}`)
    }
  }

  if (queued > 0) console.log(`[long-memory] L7 queued ${queued} low-confidence candidate(s) for user confirmation`)
  if (superseded > 0) console.log(`[long-memory] L7 superseded ${superseded} old memory(s) with newer candidates`)

  clearBufferRange(driver, sessionId, firstExtractedRowId, lastExtractedRowId)

  return { extracted, queued, superseded, candidates }
}

// ────────────────────────────────────────────────────────────────────────────
// LLM extraction
// ────────────────────────────────────────────────────────────────────────────

interface LLMConfig {
  baseURL: string
  apiKey: string
  model: string
}

/** Resolve LLM call parameters from DSH's own settings.yaml + credentials. */
function resolveLLMConfig(cfg: L7Config): LLMConfig | null {
  // os.homedir() is the cross-platform home; a bare `HOME || '/root'`
  // collapses to /root on Windows and silently disables LLM extraction.
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')

  let settings: Record<string, unknown>
  try {
    settings = _parseYAML(readFileSync(join(dshHome, 'settings.yaml'), 'utf8'))
  } catch {
    return null
  }

  const defaultModel = settings['agent-default-model'] as { provider?: string, model?: string } | undefined
  if (!defaultModel?.provider) return null
  const providerName = defaultModel.provider

  let baseURL: string | undefined
  let apiKeyEnv: string | undefined
  let models: Array<{ id?: string }> | undefined
  for (const key of Object.keys(settings)) {
    if (!key.startsWith('llm-')) continue
    const group = settings[key] as Record<string, unknown> | undefined
    if (!group || typeof group !== 'object') continue

    const providers = group.providers as Record<string, { baseURL?: string, apiKeyEnv?: string, models?: Array<{ id?: string }> }> | undefined
    if (providers?.[providerName]) {
      const p = providers[providerName]
      baseURL = p.baseURL
      apiKeyEnv = p.apiKeyEnv
      models = p.models
      break
    }
    if (group.provider === providerName || key === `llm-${providerName}`) {
      baseURL = (group.baseURL as string) || (group.base_url as string)
      apiKeyEnv = group.apiKeyEnv as string
      models = group.models as Array<{ id?: string }>
      if (!apiKeyEnv) {
        const upper = providerName.replace(/-/g, '_').toUpperCase()
        apiKeyEnv = `${upper}_API_KEY`
      }
      if (!baseURL) continue
      break
    }
  }
  if (!baseURL || !apiKeyEnv) return null

  let apiKey = process.env[apiKeyEnv]
  if (!apiKey) {
    try {
      const credContent = readFileSync(join(dshHome, '.credentials.yaml'), 'utf8')
      const credMatch = credContent.match(new RegExp(`^\\s*${apiKeyEnv}:\\s*(.+)$`, 'm'))
      if (credMatch) apiKey = credMatch[1].trim()
    } catch { /* no credentials file */ }
  }
  if (!apiKey) return null

  const model = cfg?.l7?.extractor_model || models?.[0]?.id || defaultModel.model || ''
  if (!model) return null

  return { baseURL, apiKey, model }
}

async function extractWithLLM(cfg: L7Config, messages: readonly string[]): Promise<Candidate[]> {
  const llmConfig = resolveLLMConfig(cfg)
  if (llmConfig === null) return []

  const { baseURL, apiKey, model } = llmConfig
  const temp = cfg.l7?.extractor_temp ?? 0.2
  console.log(`[long-memory] L7 extractWithLLM: model=${model}, messages=${messages.length}`)

  const prompt = buildExtractionPrompt(messages)

  try {
    // Bound the request — an unbounded fetch would hang the per-session
    // throttle indefinitely.
    const LLM_TIMEOUT_MS = 60_000
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: temp,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    })
    if (!resp.ok) {
      console.warn(`[long-memory] L7 LLM HTTP ${resp.status}: ${await resp.text()}`)
      return []
    }
    const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> }
    const text = data?.choices?.[0]?.message?.content || ''
    return parseLLMResponse(text)
  } catch (e) {
    console.warn(`[long-memory] L7 LLM fetch failed: ${e instanceof Error ? e.message : e}`)
    return []
  }
}

const EXTRACTION_SYSTEM = `You are a memory extraction assistant. Extract key facts, preferences, project context, and decisions from the conversation. Return ONLY valid JSON.`

function buildExtractionPrompt(messages: readonly string[]): string {
  const joined = messages.map((m, i) => `[${i + 1}] ${m}`).join('\n\n')
  return `Extract memories from this conversation. Return a JSON object with a "memories" array. Each memory has:
- type: "PREFERENCE" | "FACT" | "PROJECT" | "EVENT"
- scope: "user" | "project" | "domain"
- content: concise one-line fact (max 200 chars)
- confidence: 0.0-1.0

Only extract MEANINGFUL, CONCISE facts. Skip small talk, greetings, and vague statements.
Return at most 5 memories.

Conversation:
${joined}`
}

function parseLLMResponse(text: string): Candidate[] {
  try {
    // Providers that do not honour response_format may wrap the JSON in a
    // ```fence``` — strip it before parsing.
    const stripped = String(text).replace(/^\s*```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const data = JSON.parse(stripped) as { memories?: unknown[], candidates?: unknown[] }
    const memories = data.memories || data.candidates || []
    return (memories as Array<{ type?: string, scope?: string, content?: unknown, confidence?: unknown }>)
      .filter(m => m && m.content && m.type && ['PREFERENCE', 'FACT', 'PROJECT', 'EVENT'].includes(m.type))
      .map(m => ({
        type: m.type as string,
        scope: m.scope || 'user',
        content: String(m.content).slice(0, 200),
        confidence: Math.min(1, Math.max(0, Number(m.confidence) || 0.5)),
      }))
  } catch {
    return []
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Keyword heuristic (fallback)
// ────────────────────────────────────────────────────────────────────────────

function extractCandidates(messages: readonly string[]): Candidate[] {
  const candidates: Candidate[] = []
  for (const msg of messages) {
    const sentences = msg.split(/[。！？\.\!\?\n]+/).filter(s => s.trim().length > 0)
    for (const sent of sentences) {
      const trimmed = sent.trim()
      if (trimmed.length < 5) continue

      let type: string | null = null
      let confidence = 0.3

      if (/偏好|prefer|喜欢用|习惯|preference|通常|always|never|偏好语言|中文|英文/.test(trimmed)) {
        type = 'PREFERENCE'
        confidence = 0.5
      } else if (/部署端口|端口是|port is|记住|版本|version|配置|config|API|端点|endpoint/.test(trimmed)) {
        type = 'FACT'
        confidence = 0.4
      } else if (/项目|project|约定|convention|架构|architecture|依赖|dependency/.test(trimmed)) {
        type = 'PROJECT'
        confidence = 0.4
      } else if (/修复|fix|bug|错误|error|完成|done|部署|deploy/.test(trimmed)) {
        type = 'EVENT'
        confidence = 0.35
      }

      if (type !== null) {
        candidates.push({
          type,
          scope: type === 'PROJECT' ? 'project' : 'user',
          content: trimmed.slice(0, 200),
          confidence,
        })
      }
    }
  }
  return candidates
}
