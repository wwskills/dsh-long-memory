// Corrections + rules module (self-evolving learning).
//
// Provides:
//   • Signal word detection (configurable)
//   • Corrections CRUD + status machine (pending → promoted | ignored)
//   • Rules CRUD + status machine (proposed → approved → rejected | archived
//     | promoted_to_agents)
//   • Rule injection helpers (hit_count tracking)
//   • Rule conflict detection (Jaccard)
//   • Monthly usage stats

import { newId, nowMs } from './sqlite.js'
import type { SqlDriver, SqlRow } from './sqlite.js'

// ────────────────────────────────────────────────────────────────────────────
// Signal words
// ────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SIGNAL_WORDS_ZH: readonly string[] = Object.freeze([
  '不对', '应该是', '错了', '不是这样', '重做', '别这样', '不正确', '有问题',
])

export const DEFAULT_SIGNAL_WORDS_EN: readonly string[] = Object.freeze([
  'wrong', 'should be', 'not like this', 'redo', 'incorrect', "that's not right", 'this is wrong',
])

export const DEFAULT_SIGNAL_WORDS: readonly string[] = Object.freeze([...DEFAULT_SIGNAL_WORDS_ZH, ...DEFAULT_SIGNAL_WORDS_EN])

export function resolveSignalWords(opts: { configSignalWords?: unknown, signalWordsLocale?: string, locale?: string } = {}): readonly string[] {
  const { configSignalWords, signalWordsLocale, locale } = opts
  if (Array.isArray(configSignalWords) && configSignalWords.length > 0) {
    return Object.freeze(configSignalWords.filter((w): w is string => typeof w === 'string' && w.length > 0))
  }
  const wanted = (typeof signalWordsLocale === 'string' && signalWordsLocale) || ''
  const runtimeLocale = (typeof locale === 'string' && locale) || ''
  const pick =
    wanted === 'zh' || runtimeLocale.startsWith('zh') ? 'zh'
      : wanted === 'en' || runtimeLocale.startsWith('en') ? 'en'
        : null
  if (pick === 'zh') return DEFAULT_SIGNAL_WORDS_ZH
  if (pick === 'en') return DEFAULT_SIGNAL_WORDS_EN
  return DEFAULT_SIGNAL_WORDS
}

export function matchSignalWords(text: string, signals?: readonly string[]): boolean {
  if (!text || typeof text !== 'string') return false
  const haystack = text.toLowerCase()
  const list = Array.isArray(signals) && signals.length > 0 ? signals : DEFAULT_SIGNAL_WORDS
  for (const word of list) {
    if (typeof word !== 'string' || word.length === 0) continue
    if (haystack.includes(word.toLowerCase())) return true
  }
  return false
}

// ────────────────────────────────────────────────────────────────────────────
// User-text extraction from session/event payloads
// ────────────────────────────────────────────────────────────────────────────

export function extractUserText(event: unknown): string {
  if (!event || typeof event !== 'object') return ''
  const ev = event as Record<string, unknown>
  const data = (ev.data ?? ev.payload ?? ev) as Record<string, unknown>
  if (!data || typeof data !== 'object') return ''
  if (typeof data.text === 'string') return data.text
  if (typeof data.content === 'string') return data.content
  if (Array.isArray(data.content)) {
    return data.content
      .map((c: unknown) => (typeof c === 'string' ? c : ((c as { text?: string })?.text ?? '')))
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

// ────────────────────────────────────────────────────────────────────────────
// Corrections CRUD
// ────────────────────────────────────────────────────────────────────────────

/** Fields accepted by {@link insertCorrection}. */
export interface CorrectionInput {
  trigger: string
  error_summary?: string
  root_cause?: string
  correct_action?: string
  rule?: string
  context?: string
  sessionId?: string
}

export function insertCorrection(db: SqlDriver, input: CorrectionInput): { id: string, created_at: number } {
  const { trigger, error_summary, root_cause, correct_action, rule, context, sessionId } = input
  const id = newId()
  const created_at = nowMs()
  db.prepare(
    `INSERT INTO corrections (id, trigger, error_summary, root_cause, correct_action, rule, context, session_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, trigger, error_summary || null, root_cause || null, correct_action || null, rule || null, context || null, sessionId || null, created_at)
  bumpUsage(db, 'corrections_captured', 1)
  return { id, created_at }
}

export function listCorrections(db: SqlDriver, opts: { status?: string, trigger?: string, limit?: number } = {}): SqlRow[] {
  const limit = Math.max(1, Math.min((Number(opts.limit) | 0) || 100, 500))
  let sql = `SELECT * FROM corrections`
  const conditions: string[] = []
  const params: unknown[] = []
  if (opts.status) { conditions.push('status = ?'); params.push(opts.status) }
  if (opts.trigger) { conditions.push('trigger = ?'); params.push(opts.trigger) }
  if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ')
  sql += ` ORDER BY created_at DESC LIMIT ?`
  params.push(limit)
  return db.prepare(sql).all(...params)
}

export function getCorrection(db: SqlDriver, id: string): SqlRow | null {
  return db.prepare(`SELECT * FROM corrections WHERE id = ?`).get(id) ?? null
}

export function markCorrectionPromoted(db: SqlDriver, id: string, ruleId: string): boolean {
  const r = db.prepare(
    `UPDATE corrections SET status = 'promoted', rule_id = ? WHERE id = ? AND status = 'pending'`,
  ).run(ruleId, id)
  if (r.changes > 0) bumpUsage(db, 'corrections_promoted', 1)
  return r.changes > 0
}

export function markCorrectionIgnored(db: SqlDriver, id: string): boolean {
  const r = db.prepare(
    `UPDATE corrections SET status = 'ignored' WHERE id = ? AND status = 'pending'`,
  ).run(id)
  if (r.changes > 0) bumpUsage(db, 'corrections_ignored', 1)
  return r.changes > 0
}

export function countPendingCorrections(db: SqlDriver): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM corrections WHERE status = 'pending'`).get()
  return row !== undefined ? Number(row.n) : 0
}

// ────────────────────────────────────────────────────────────────────────────
// Rules CRUD
// ────────────────────────────────────────────────────────────────────────────

export function listRules(db: SqlDriver, opts: { status?: string, category?: string, limit?: number } = {}): SqlRow[] {
  const limit = Math.max(1, Math.min((Number(opts.limit) | 0) || 100, 500))
  let sql = `SELECT * FROM rules`
  const conditions: string[] = []
  const params: unknown[] = []
  if (opts.status) { conditions.push('status = ?'); params.push(opts.status) }
  if (opts.category) { conditions.push('category = ?'); params.push(opts.category) }
  if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ')
  sql += ` ORDER BY created_at DESC LIMIT ?`
  params.push(limit)
  return db.prepare(sql).all(...params)
}

export function getRule(db: SqlDriver, id: string): SqlRow | null {
  return db.prepare(`SELECT * FROM rules WHERE id = ?`).get(id) ?? null
}

export function updateRule(db: SqlDriver, id: string, patch: { content?: string, category?: string, tags?: string[] } = {}): boolean {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.content !== undefined) { sets.push('content = ?'); params.push(patch.content) }
  if (patch.category !== undefined) { sets.push('category = ?'); params.push(patch.category) }
  if (patch.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(patch.tags)) }
  if (sets.length === 0) return false
  params.push(id)
  const r = db.prepare(`UPDATE rules SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  return r.changes > 0
}

export function approveRule(db: SqlDriver, id: string): boolean {
  const r = db.prepare(
    `UPDATE rules SET status = 'approved', approved_at = ? WHERE id = ? AND status = 'proposed'`,
  ).run(nowMs(), id)
  if (r.changes > 0) bumpUsage(db, 'rules_approved', 1)
  return r.changes > 0
}

export function rejectRule(db: SqlDriver, id: string): boolean {
  const r = db.prepare(
    `UPDATE rules SET status = 'rejected' WHERE id = ? AND status = 'proposed'`,
  ).run(id)
  return r.changes > 0
}

export function promoteRule(db: SqlDriver, id: string): boolean {
  const r = db.prepare(
    `UPDATE rules SET status = 'promoted_to_agents' WHERE id = ? AND status = 'approved'`,
  ).run(id)
  return r.changes > 0
}

export function archiveRule(db: SqlDriver, id: string): boolean {
  const r = db.prepare(
    `UPDATE rules SET status = 'archived' WHERE id = ? AND status = 'approved'`,
  ).run(id)
  return r.changes > 0
}

export function archiveStaleRules(db: SqlDriver, ttlMs = 90 * 86400000): number {
  const cutoff = nowMs() - ttlMs
  // Rules still being injected refresh last_hit_at and legitimately stay
  // alive; rules that were NEVER injected must still expire — fall back to
  // created_at for them.
  const r = db.prepare(
    `UPDATE rules SET status = 'archived'
      WHERE COALESCE(last_hit_at, created_at) < ? AND status IN ('approved', 'promoted_to_agents')`,
  ).run(cutoff)
  return r.changes
}

export function incrementRuleHit(db: SqlDriver, id: string): void {
  db.prepare(
    `UPDATE rules SET hit_count = hit_count + 1, last_hit_at = ? WHERE id = ?`,
  ).run(nowMs(), id)
}

export function getRulesForInjection(db: SqlDriver, opts: { category?: string, limit?: number } = {}): SqlRow[] {
  let sql = `SELECT * FROM rules WHERE status = 'approved'`
  const params: unknown[] = []
  if (opts.category) { sql += ` AND category = ?`; params.push(opts.category) }
  // created_at as a deterministic tie-breaker keeps the order stable for
  // rules with equal hit_count.
  sql += ` ORDER BY hit_count DESC, created_at DESC LIMIT ?`
  params.push(opts.limit ?? 20)
  return db.prepare(sql).all(...params)
}

// ────────────────────────────────────────────────────────────────────────────
// Promote correction → draft rule
// ────────────────────────────────────────────────────────────────────────────

export function promoteCorrectionToRule(db: SqlDriver, id: string): { ok: boolean, error?: string, id?: string, rule_id?: string, status?: string } {
  const corr = getCorrection(db, id)
  if (corr === null) return { ok: false, error: 'correction not found' }
  if (corr.status !== 'pending') return { ok: false, error: `correction already ${String(corr.status)}`, id, status: String(corr.status) }

  const content = (corr.rule as string) || (corr.correct_action as string) || (corr.error_summary as string) || '(no rule)'
  const category = inferCategory(corr)
  const tags = inferTags(corr)
  const ruleId = newId()
  const created_at = nowMs()

  db.prepare(
    `INSERT INTO rules (id, content, category, tags, status, source_corrections, created_at)
     VALUES (?, ?, ?, ?, 'proposed', ?, ?)`,
  ).run(ruleId, content, category, JSON.stringify(tags), JSON.stringify([id]), created_at)

  markCorrectionPromoted(db, id, ruleId)
  bumpUsage(db, 'rules_proposed', 1)
  return { ok: true, id, rule_id: ruleId, status: 'promoted' }
}

function inferCategory(corr: SqlRow): string {
  const t = (String(corr.error_summary ?? '') + ' ' + String(corr.root_cause ?? '')).toLowerCase()
  if (/api|endpoint|http|fetch|request/.test(t)) return 'coding'
  if (/reply|answer|message|tone|polite/.test(t)) return 'communication'
  if (/workflow|step|order|first|then/.test(t)) return 'workflow'
  if (/danger|delete|rm|secret|token|password/.test(t)) return 'safety'
  return 'coding'
}

function inferTags(corr: SqlRow): string[] {
  const text = (String(corr.error_summary ?? '') + ' ' + String(corr.rule ?? '') + ' ' + String(corr.root_cause ?? '')).toLowerCase()
  const tags = new Set<string>()
  for (const kw of ['api', 'http', 'sql', 'fs', 'file', 'env', 'git', 'web', 'image', 'tool', 'timeout', 'auth']) {
    if (text.includes(kw)) tags.add(kw)
  }
  if (tags.size === 0) tags.add('general')
  return [...tags].slice(0, 8)
}

// ────────────────────────────────────────────────────────────────────────────
// Rule conflict detection
// ────────────────────────────────────────────────────────────────────────────

export interface RuleConflict {
  id: string
  content: string
  category: string
  overlap: number
}

export function findConflictingRules(db: SqlDriver, rule: SqlRow | null, threshold = 0.6): RuleConflict[] {
  if (!rule || !db) return []
  const sameCategory = listRules(db, { status: 'approved', category: rule.category !== null ? String(rule.category) : undefined, limit: 50 })
  if (sameCategory.length === 0) return []

  const ruleTokens = tokenize(String(rule.content ?? ''))
  if (ruleTokens.size === 0) return []

  const conflicts: RuleConflict[] = []
  for (const existing of sameCategory) {
    if (existing.id === rule.id) continue
    const exTokens = tokenize(String(existing.content ?? ''))
    if (exTokens.size === 0) continue
    const overlap = jaccard(ruleTokens, exTokens)
    if (overlap >= threshold) {
      conflicts.push({ id: String(existing.id), content: String(existing.content), category: String(existing.category), overlap })
    }
  }
  conflicts.sort((a, b) => b.overlap - a.overlap)
  return conflicts.slice(0, 5)
}

function tokenize(text: string): Set<string> {
  if (!text) return new Set()
  const lc = text.toLowerCase()
  const latin = lc.match(/[a-z0-9_]{2,}/g) ?? []
  const cjk = lc.match(/[\u4e00-\u9fff]{2}/g) ?? []
  return new Set([...latin, ...cjk])
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter)
}

// ────────────────────────────────────────────────────────────────────────────
// Monthly usage stats
// ────────────────────────────────────────────────────────────────────────────

export function bumpUsage(db: SqlDriver, field: string, delta = 1): void {
  const month = monthKey()
  db.prepare(
    `INSERT INTO usage_stats (month, ${field}) VALUES (?, ?)
     ON CONFLICT(month) DO UPDATE SET ${field} = ${field} + ?`,
  ).run(month, delta, delta)
}

export function aggregateStats(db: SqlDriver): Record<string, unknown> {
  const month = monthKey()
  const row = db.prepare(`SELECT * FROM usage_stats WHERE month = ?`).get(month) ?? {}
  const pending = countPendingCorrections(db)
  const proposedRules = Number((db.prepare(`SELECT COUNT(*) AS n FROM rules WHERE status = 'proposed'`).get() as SqlRow | undefined)?.n ?? 0)
  const approvedRules = Number((db.prepare(`SELECT COUNT(*) AS n FROM rules WHERE status = 'approved'`).get() as SqlRow | undefined)?.n ?? 0)
  const memoriesActive = Number((db.prepare(`SELECT COUNT(*) AS n FROM memories WHERE status = 'active'`).get() as SqlRow | undefined)?.n ?? 0)
  return {
    corrections_captured: row.corrections_captured ?? 0,
    corrections_pending: pending,
    corrections_promoted: row.corrections_promoted ?? 0,
    corrections_ignored: row.corrections_ignored ?? 0,
    rules_proposed: proposedRules,
    rules_approved: approvedRules,
    memories_extracted: row.extractions ?? 0,
    memories_active: memoriesActive,
    persona_updated_at: null,
    month,
  }
}

function monthKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Best-effort wrapper around {@link findConflictingRules}. */
export function okConflicts(rule: SqlRow | null, db: SqlDriver): RuleConflict[] {
  if (!rule || !db) return []
  try {
    return findConflictingRules(db, rule)
  } catch (e) {
    console.warn('[long-memory] rule conflict scan failed:', e instanceof Error ? e.message : e)
    return []
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Build AGENTS.md draft for rule promotion
// ────────────────────────────────────────────────────────────────────────────

export function buildAgentsMdDraft(rule: SqlRow | null): string {
  if (!rule || typeof rule !== 'object') return ''
  const rawTags = rule.tags
  const tags = Array.isArray(rawTags) ? rawTags.filter(Boolean) : []
  const lines = [
    '## ' + (rule.category !== null && rule.category !== undefined ? String(rule.category) : 'general'),
    '',
    '- **规则**: ' + (rule.content !== null && rule.content !== undefined ? String(rule.content) : '(empty)'),
    '- **分类**: ' + (rule.category !== null && rule.category !== undefined ? String(rule.category) : 'general'),
    tags.length > 0 ? '- **标签**: ' + tags.join(', ') : null,
    '- **命中次数**: ' + String(rule.hit_count ?? 0),
    '- **来源**: long-memory 自动提炼',
    '',
  ].filter((x): x is string => x !== null)
  return lines.join('\n')
}
