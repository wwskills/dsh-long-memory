// @wwskills/dsh-long-memory — corrections + rules module (merged from agent-evolve)
//
// Provides:
//   • Signal word detection (8 CN + 7 EN, configurable)
//   • Lesson extraction (LLM-based, from correction-triggering messages)
//   • Corrections CRUD + status machine (pending → promoted | ignored)
//   • Rules CRUD + status machine (proposed → approved → rejected | archived | promoted_to_agents)
//   • Rule injection helpers (hit_count tracking, keyword scoring)
//   • Monthly usage stats

import { newId, nowMs } from './sqlite.js';

// ────────────────────────────────────────────────────────────────────────────
// Signal words
// ────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SIGNAL_WORDS_ZH = Object.freeze([
  '不对', '应该是', '错了', '不是这样', '重做', '别这样', '不正确', '有问题',
]);

export const DEFAULT_SIGNAL_WORDS_EN = Object.freeze([
  'wrong', 'should be', 'not like this', 'redo', 'incorrect', "that's not right", 'this is wrong',
]);

export const DEFAULT_SIGNAL_WORDS = Object.freeze([...DEFAULT_SIGNAL_WORDS_ZH, ...DEFAULT_SIGNAL_WORDS_EN]);

export function resolveSignalWords({ configSignalWords, signalWordsLocale, locale } = {}) {
  if (Array.isArray(configSignalWords) && configSignalWords.length > 0) {
    return Object.freeze(configSignalWords.filter((w) => typeof w === 'string' && w.length > 0));
  }
  const wanted = (typeof signalWordsLocale === 'string' && signalWordsLocale) || '';
  const runtimeLocale = (typeof locale === 'string' && locale) || '';
  const pick =
    wanted === 'zh' || runtimeLocale.startsWith('zh') ? 'zh'
    : wanted === 'en' || runtimeLocale.startsWith('en') ? 'en'
    : null;
  if (pick === 'zh') return DEFAULT_SIGNAL_WORDS_ZH;
  if (pick === 'en') return DEFAULT_SIGNAL_WORDS_EN;
  return DEFAULT_SIGNAL_WORDS;
}

export function matchSignalWords(text, signals) {
  if (!text || typeof text !== 'string') return false;
  const haystack = text.toLowerCase();
  const list = Array.isArray(signals) && signals.length > 0 ? signals : DEFAULT_SIGNAL_WORDS;
  for (const word of list) {
    if (typeof word !== 'string' || word.length === 0) continue;
    if (haystack.includes(word.toLowerCase())) return true;
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// User-text extraction from session/event payloads
// ────────────────────────────────────────────────────────────────────────────

export function extractUserText(event) {
  if (!event || typeof event !== 'object') return '';
  const data = event.data ?? event.payload ?? event;
  if (!data || typeof data !== 'object') return '';
  if (typeof data.text === 'string') return data.text;
  if (typeof data.content === 'string') return data.content;
  if (Array.isArray(data.content)) {
    return data.content
      .map((c) => (typeof c === 'string' ? c : c?.text || ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

// ────────────────────────────────────────────────────────────────────────────
// Corrections CRUD
// ────────────────────────────────────────────────────────────────────────────

export function insertCorrection(db, { trigger, error_summary, root_cause, correct_action, rule, context, sessionId } = {}) {
  const id = newId();
  const created_at = nowMs();
  db.prepare(
    `INSERT INTO corrections (id, trigger, error_summary, root_cause, correct_action, rule, context, session_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, trigger, error_summary || null, root_cause || null, correct_action || null, rule || null, context || null, sessionId || null, created_at);
  bumpUsage(db, 'corrections_captured', 1);
  return { id, created_at };
}

export function listCorrections(db, { status, trigger, limit = 100 } = {}) {
  limit = Math.max(1, Math.min(Number(limit) | 0 || 100, 500));
  let sql = `SELECT * FROM corrections`;
  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (trigger) { conditions.push('trigger = ?'); params.push(trigger); }
  if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params);
}

export function getCorrection(db, id) {
  return db.prepare(`SELECT * FROM corrections WHERE id = ?`).get(id) || null;
}

export function markCorrectionPromoted(db, id, ruleId) {
  const r = db.prepare(
    `UPDATE corrections SET status = 'promoted', rule_id = ? WHERE id = ? AND status = 'pending'`,
  ).run(ruleId, id);
  if (r.changes > 0) bumpUsage(db, 'corrections_promoted', 1);
  return r.changes > 0;
}

export function markCorrectionIgnored(db, id) {
  const r = db.prepare(
    `UPDATE corrections SET status = 'ignored' WHERE id = ? AND status = 'pending'`,
  ).run(id);
  if (r.changes > 0) bumpUsage(db, 'corrections_ignored', 1);
  return r.changes > 0;
}

export function countPendingCorrections(db) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM corrections WHERE status = 'pending'`).get();
  return row?.n || 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Rules CRUD
// ────────────────────────────────────────────────────────────────────────────

const VALID_RULE_STATUS = Object.freeze(['proposed', 'approved', 'rejected', 'archived', 'promoted_to_agents']);

export function listRules(db, { status, category, limit = 100 } = {}) {
  limit = Math.max(1, Math.min(Number(limit) | 0 || 100, 500));
  let sql = `SELECT * FROM rules`;
  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params);
}

export function getRule(db, id) {
  return db.prepare(`SELECT * FROM rules WHERE id = ?`).get(id) || null;
}

export function updateRule(db, id, { content, category, tags } = {}) {
  const sets = [];
  const params = [];
  if (content !== undefined) { sets.push('content = ?'); params.push(content); }
  if (category !== undefined) { sets.push('category = ?'); params.push(category); }
  if (tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(tags)); }
  if (sets.length === 0) return false;
  params.push(id);
  const r = db.prepare(`UPDATE rules SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return r.changes > 0;
}

export function approveRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'approved', approved_at = ? WHERE id = ? AND status = 'proposed'`,
  ).run(nowMs(), id);
  if (r.changes > 0) bumpUsage(db, 'rules_approved', 1);
  return r.changes > 0;
}

export function rejectRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'rejected' WHERE id = ? AND status = 'proposed'`,
  ).run(id);
  return r.changes > 0;
}

export function promoteRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'promoted_to_agents' WHERE id = ? AND status = 'approved'`,
  ).run(id);
  return r.changes > 0;
}

export function archiveRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'archived' WHERE id = ? AND status = 'approved'`,
  ).run(id);
  return r.changes > 0;
}

export function archiveStaleRules(db, ttlMs = 90 * 86400000) {
  const cutoff = nowMs() - ttlMs;
  const r = db.prepare(
    `UPDATE rules SET status = 'archived'
      WHERE last_hit_at IS NOT NULL AND last_hit_at < ? AND status IN ('approved', 'promoted_to_agents')`,
  ).run(cutoff);
  return r.changes;
}

export function incrementRuleHit(db, id) {
  const now = nowMs();
  db.prepare(
    `UPDATE rules SET hit_count = hit_count + 1, last_hit_at = ? WHERE id = ?`,
  ).run(now, id);
}

export function getRulesForInjection(db, { category, limit = 20 } = {}) {
  let sql = `SELECT * FROM rules WHERE status = 'approved'`;
  const params = [];
  if (category) { sql += ` AND category = ?`; params.push(category); }
  sql += ` ORDER BY hit_count DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params);
}

// ────────────────────────────────────────────────────────────────────────────
// Promote correction → draft rule
// ────────────────────────────────────────────────────────────────────────────

export function promoteCorrectionToRule(db, id) {
  const corr = getCorrection(db, id);
  if (!corr) return { ok: false, error: 'correction not found' };
  if (corr.status !== 'pending') return { ok: false, error: `correction already ${corr.status}`, id, status: corr.status };

  const content = corr.rule || corr.correct_action || corr.error_summary || '(no rule)';
  const category = inferCategory(corr);
  const tags = inferTags(corr);
  const ruleId = newId();
  const created_at = nowMs();

  db.prepare(
    `INSERT INTO rules (id, content, category, tags, status, source_corrections, created_at)
     VALUES (?, ?, ?, ?, 'proposed', ?, ?)`,
  ).run(ruleId, content, category, JSON.stringify(tags), JSON.stringify([id]), created_at);

  markCorrectionPromoted(db, id, ruleId);
  bumpUsage(db, 'rules_proposed', 1);
  return { ok: true, id, rule_id: ruleId, status: 'promoted' };
}

function inferCategory(corr) {
  const t = ((corr.error_summary || '') + ' ' + (corr.root_cause || '')).toLowerCase();
  if (/api|endpoint|http|fetch|request/.test(t)) return 'coding';
  if (/reply|answer|message|tone|polite/.test(t)) return 'communication';
  if (/workflow|step|order|first|then/.test(t)) return 'workflow';
  if (/danger|delete|rm|secret|token|password/.test(t)) return 'safety';
  return 'coding';
}

function inferTags(corr) {
  const text = ((corr.error_summary || '') + ' ' + (corr.rule || '') + ' ' + (corr.root_cause || '')).toLowerCase();
  const tags = new Set();
  for (const kw of ['api', 'http', 'sql', 'fs', 'file', 'env', 'git', 'web', 'image', 'tool', 'timeout', 'auth']) {
    if (text.includes(kw)) tags.add(kw);
  }
  if (tags.size === 0) tags.add('general');
  return [...tags].slice(0, 8);
}

// ────────────────────────────────────────────────────────────────────────────
// Rule conflict detection (P3.23)
// ────────────────────────────────────────────────────────────────────────────

export function findConflictingRules(db, rule, threshold = 0.6) {
  if (!rule || !db) return [];
  const sameCategory = listRules(db, { status: 'approved', category: rule.category, limit: 50 });
  if (!sameCategory || sameCategory.length === 0) return [];

  const ruleTokens = tokenize(String(rule.content || ''));
  if (ruleTokens.length === 0) return [];

  const conflicts = [];
  for (const existing of sameCategory) {
    if (existing.id === rule.id) continue;
    const exTokens = tokenize(String(existing.content || ''));
    if (exTokens.length === 0) continue;
    const overlap = jaccard(ruleTokens, exTokens);
    if (overlap >= threshold) {
      conflicts.push({ id: existing.id, content: existing.content, category: existing.category, overlap });
    }
  }
  conflicts.sort((a, b) => b.overlap - a.overlap);
  return conflicts.slice(0, 5);
}

function tokenize(text) {
  if (!text) return new Set();
  const lc = text.toLowerCase();
  const latin = lc.match(/[a-z0-9_]{2,}/g) || [];
  const cjk = lc.match(/[\u4e00-\u9fff]{2}/g) || [];
  return new Set([...latin, ...cjk]);
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// ────────────────────────────────────────────────────────────────────────────
// Monthly usage stats
// ────────────────────────────────────────────────────────────────────────────

export function bumpUsage(db, field, delta = 1) {
  const month = monthKey();
  db.prepare(
    `INSERT INTO usage_stats (month, ${field}) VALUES (?, ?)
     ON CONFLICT(month) DO UPDATE SET ${field} = ${field} + ?`,
  ).run(month, delta, delta);
}

export function aggregateStats(db) {
  const month = monthKey();
  const row = db.prepare(`SELECT * FROM usage_stats WHERE month = ?`).get(month) || {};
  const pending = countPendingCorrections(db);
  const proposedRules = db.prepare(`SELECT COUNT(*) AS n FROM rules WHERE status = 'proposed'`).get()?.n || 0;
  const approvedRules = db.prepare(`SELECT COUNT(*) AS n FROM rules WHERE status = 'approved'`).get()?.n || 0;
  const memoriesActive = db.prepare(`SELECT COUNT(*) AS n FROM memories WHERE status = 'active'`).get()?.n || 0;
  return {
    corrections_captured: row.corrections_captured || 0,
    corrections_pending: pending,
    corrections_promoted: row.corrections_promoted || 0,
    corrections_ignored: row.corrections_ignored || 0,
    rules_proposed: proposedRules,
    rules_approved: approvedRules,
    memories_extracted: row.extractions || 0,
    memories_active: memoriesActive,
    persona_updated_at: null,
    month,
  };
}

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Rule conflict detection wrapper
// ────────────────────────────────────────────────────────────────────────────

export function okConflicts(rule, db) {
  if (!rule || !db) return [];
  try {
    return findConflictingRules(db, rule);
  } catch (e) {
    console.warn('[long-memory] rule conflict scan failed:', e?.message || e);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Build AGENTS.md draft for rule promotion
// ────────────────────────────────────────────────────────────────────────────

export function buildAgentsMdDraft(rule) {
  if (!rule || typeof rule !== 'object') return '';
  const tags = Array.isArray(rule.tags) ? rule.tags.filter(Boolean) : [];
  const lines = [
    '## ' + (rule.category || 'general'),
    '',
    '- **规则**: ' + (rule.content || '(empty)'),
    '- **分类**: ' + (rule.category || 'general'),
    tags.length > 0 ? '- **标签**: ' + tags.join(', ') : null,
    '- **命中次数**: ' + String(rule.hit_count || 0),
    '- **来源**: long-memory 自动提炼',
    '',
  ].filter(Boolean);
  return lines.join('\n');
}
