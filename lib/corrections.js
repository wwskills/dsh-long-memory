import { newId, nowMs } from "./sqlite.js";
const DEFAULT_SIGNAL_WORDS_ZH = Object.freeze([
  "\u4E0D\u5BF9",
  "\u5E94\u8BE5\u662F",
  "\u9519\u4E86",
  "\u4E0D\u662F\u8FD9\u6837",
  "\u91CD\u505A",
  "\u522B\u8FD9\u6837",
  "\u4E0D\u6B63\u786E",
  "\u6709\u95EE\u9898"
]);
const DEFAULT_SIGNAL_WORDS_EN = Object.freeze([
  "wrong",
  "should be",
  "not like this",
  "redo",
  "incorrect",
  "that's not right",
  "this is wrong"
]);
const DEFAULT_SIGNAL_WORDS = Object.freeze([...DEFAULT_SIGNAL_WORDS_ZH, ...DEFAULT_SIGNAL_WORDS_EN]);
function resolveSignalWords(opts = {}) {
  const { configSignalWords, signalWordsLocale, locale } = opts;
  if (Array.isArray(configSignalWords) && configSignalWords.length > 0) {
    return Object.freeze(configSignalWords.filter((w) => typeof w === "string" && w.length > 0));
  }
  const wanted = typeof signalWordsLocale === "string" && signalWordsLocale || "";
  const runtimeLocale = typeof locale === "string" && locale || "";
  const pick = wanted === "zh" || runtimeLocale.startsWith("zh") ? "zh" : wanted === "en" || runtimeLocale.startsWith("en") ? "en" : null;
  if (pick === "zh") return DEFAULT_SIGNAL_WORDS_ZH;
  if (pick === "en") return DEFAULT_SIGNAL_WORDS_EN;
  return DEFAULT_SIGNAL_WORDS;
}
function matchSignalWords(text, signals) {
  if (!text || typeof text !== "string") return false;
  const haystack = text.toLowerCase();
  const list = Array.isArray(signals) && signals.length > 0 ? signals : DEFAULT_SIGNAL_WORDS;
  for (const word of list) {
    if (typeof word !== "string" || word.length === 0) continue;
    if (haystack.includes(word.toLowerCase())) return true;
  }
  return false;
}
function extractUserText(event) {
  if (!event || typeof event !== "object") return "";
  const ev = event;
  const data = ev.data ?? ev.payload ?? ev;
  if (!data || typeof data !== "object") return "";
  if (typeof data.text === "string") return data.text;
  if (typeof data.content === "string") return data.content;
  if (Array.isArray(data.content)) {
    return data.content.map((c) => typeof c === "string" ? c : c?.text ?? "").filter(Boolean).join("\n");
  }
  return "";
}
function insertCorrection(db, input) {
  const { trigger, error_summary, root_cause, correct_action, rule, context, sessionId } = input;
  const id = newId();
  const created_at = nowMs();
  db.prepare(
    `INSERT INTO corrections (id, trigger, error_summary, root_cause, correct_action, rule, context, session_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(id, trigger, error_summary || null, root_cause || null, correct_action || null, rule || null, context || null, sessionId || null, created_at);
  bumpUsage(db, "corrections_captured", 1);
  return { id, created_at };
}
function listCorrections(db, opts = {}) {
  const limit = Math.max(1, Math.min(Number(opts.limit) | 0 || 100, 500));
  let sql = `SELECT * FROM corrections`;
  const conditions = [];
  const params = [];
  if (opts.status) {
    conditions.push("status = ?");
    params.push(opts.status);
  }
  if (opts.trigger) {
    conditions.push("trigger = ?");
    params.push(opts.trigger);
  }
  if (conditions.length > 0) sql += ` WHERE ` + conditions.join(" AND ");
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params);
}
function getCorrection(db, id) {
  return db.prepare(`SELECT * FROM corrections WHERE id = ?`).get(id) ?? null;
}
function markCorrectionPromoted(db, id, ruleId) {
  const r = db.prepare(
    `UPDATE corrections SET status = 'promoted', rule_id = ? WHERE id = ? AND status = 'pending'`
  ).run(ruleId, id);
  if (r.changes > 0) bumpUsage(db, "corrections_promoted", 1);
  return r.changes > 0;
}
function markCorrectionIgnored(db, id) {
  const r = db.prepare(
    `UPDATE corrections SET status = 'ignored' WHERE id = ? AND status = 'pending'`
  ).run(id);
  if (r.changes > 0) bumpUsage(db, "corrections_ignored", 1);
  return r.changes > 0;
}
function countPendingCorrections(db) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM corrections WHERE status = 'pending'`).get();
  return row !== void 0 ? Number(row.n) : 0;
}
function listRules(db, opts = {}) {
  const limit = Math.max(1, Math.min(Number(opts.limit) | 0 || 100, 500));
  let sql = `SELECT * FROM rules`;
  const conditions = [];
  const params = [];
  if (opts.status) {
    conditions.push("status = ?");
    params.push(opts.status);
  }
  if (opts.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }
  if (conditions.length > 0) sql += ` WHERE ` + conditions.join(" AND ");
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params);
}
function getRule(db, id) {
  return db.prepare(`SELECT * FROM rules WHERE id = ?`).get(id) ?? null;
}
function updateRule(db, id, patch = {}) {
  const sets = [];
  const params = [];
  if (patch.content !== void 0) {
    sets.push("content = ?");
    params.push(patch.content);
  }
  if (patch.category !== void 0) {
    sets.push("category = ?");
    params.push(patch.category);
  }
  if (patch.tags !== void 0) {
    sets.push("tags = ?");
    params.push(JSON.stringify(patch.tags));
  }
  if (sets.length === 0) return false;
  params.push(id);
  const r = db.prepare(`UPDATE rules SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return r.changes > 0;
}
function approveRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'approved', approved_at = ? WHERE id = ? AND status = 'proposed'`
  ).run(nowMs(), id);
  if (r.changes > 0) bumpUsage(db, "rules_approved", 1);
  return r.changes > 0;
}
function rejectRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'rejected' WHERE id = ? AND status = 'proposed'`
  ).run(id);
  return r.changes > 0;
}
function promoteRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'promoted_to_agents' WHERE id = ? AND status = 'approved'`
  ).run(id);
  return r.changes > 0;
}
function archiveRule(db, id) {
  const r = db.prepare(
    `UPDATE rules SET status = 'archived' WHERE id = ? AND status = 'approved'`
  ).run(id);
  return r.changes > 0;
}
function archiveStaleRules(db, ttlMs = 90 * 864e5) {
  const cutoff = nowMs() - ttlMs;
  const r = db.prepare(
    `UPDATE rules SET status = 'archived'
      WHERE COALESCE(last_hit_at, created_at) < ? AND status IN ('approved', 'promoted_to_agents')`
  ).run(cutoff);
  return r.changes;
}
function incrementRuleHit(db, id) {
  db.prepare(
    `UPDATE rules SET hit_count = hit_count + 1, last_hit_at = ? WHERE id = ?`
  ).run(nowMs(), id);
}
function getRulesForInjection(db, opts = {}) {
  let sql = `SELECT * FROM rules WHERE status = 'approved'`;
  const params = [];
  if (opts.category) {
    sql += ` AND category = ?`;
    params.push(opts.category);
  }
  sql += ` ORDER BY hit_count DESC, created_at DESC LIMIT ?`;
  params.push(opts.limit ?? 20);
  return db.prepare(sql).all(...params);
}
function promoteCorrectionToRule(db, id) {
  const corr = getCorrection(db, id);
  if (corr === null) return { ok: false, error: "correction not found" };
  if (corr.status !== "pending") return { ok: false, error: `correction already ${String(corr.status)}`, id, status: String(corr.status) };
  const content = corr.rule || corr.correct_action || corr.error_summary || "(no rule)";
  const category = inferCategory(corr);
  const tags = inferTags(corr);
  const ruleId = newId();
  const created_at = nowMs();
  db.prepare(
    `INSERT INTO rules (id, content, category, tags, status, source_corrections, created_at)
     VALUES (?, ?, ?, ?, 'proposed', ?, ?)`
  ).run(ruleId, content, category, JSON.stringify(tags), JSON.stringify([id]), created_at);
  markCorrectionPromoted(db, id, ruleId);
  bumpUsage(db, "rules_proposed", 1);
  return { ok: true, id, rule_id: ruleId, status: "promoted" };
}
function inferCategory(corr) {
  const t = (String(corr.error_summary ?? "") + " " + String(corr.root_cause ?? "")).toLowerCase();
  if (/api|endpoint|http|fetch|request/.test(t)) return "coding";
  if (/reply|answer|message|tone|polite/.test(t)) return "communication";
  if (/workflow|step|order|first|then/.test(t)) return "workflow";
  if (/danger|delete|rm|secret|token|password/.test(t)) return "safety";
  return "coding";
}
function inferTags(corr) {
  const text = (String(corr.error_summary ?? "") + " " + String(corr.rule ?? "") + " " + String(corr.root_cause ?? "")).toLowerCase();
  const tags = /* @__PURE__ */ new Set();
  for (const kw of ["api", "http", "sql", "fs", "file", "env", "git", "web", "image", "tool", "timeout", "auth"]) {
    if (text.includes(kw)) tags.add(kw);
  }
  if (tags.size === 0) tags.add("general");
  return [...tags].slice(0, 8);
}
function findConflictingRules(db, rule, threshold = 0.6) {
  if (!rule || !db) return [];
  const sameCategory = listRules(db, { status: "approved", category: rule.category !== null ? String(rule.category) : void 0, limit: 50 });
  if (sameCategory.length === 0) return [];
  const ruleTokens = tokenize(String(rule.content ?? ""));
  if (ruleTokens.size === 0) return [];
  const conflicts = [];
  for (const existing of sameCategory) {
    if (existing.id === rule.id) continue;
    const exTokens = tokenize(String(existing.content ?? ""));
    if (exTokens.size === 0) continue;
    const overlap = jaccard(ruleTokens, exTokens);
    if (overlap >= threshold) {
      conflicts.push({ id: String(existing.id), content: String(existing.content), category: String(existing.category), overlap });
    }
  }
  conflicts.sort((a, b) => b.overlap - a.overlap);
  return conflicts.slice(0, 5);
}
function tokenize(text) {
  if (!text) return /* @__PURE__ */ new Set();
  const lc = text.toLowerCase();
  const latin = lc.match(/[a-z0-9_]{2,}/g) ?? [];
  const cjk = lc.match(/[\u4e00-\u9fff]{2}/g) ?? [];
  return /* @__PURE__ */ new Set([...latin, ...cjk]);
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function bumpUsage(db, field, delta = 1) {
  const month = monthKey();
  db.prepare(
    `INSERT INTO usage_stats (month, ${field}) VALUES (?, ?)
     ON CONFLICT(month) DO UPDATE SET ${field} = ${field} + ?`
  ).run(month, delta, delta);
}
function aggregateStats(db) {
  const month = monthKey();
  const row = db.prepare(`SELECT * FROM usage_stats WHERE month = ?`).get(month) ?? {};
  const pending = countPendingCorrections(db);
  const proposedRules = Number(db.prepare(`SELECT COUNT(*) AS n FROM rules WHERE status = 'proposed'`).get()?.n ?? 0);
  const approvedRules = Number(db.prepare(`SELECT COUNT(*) AS n FROM rules WHERE status = 'approved'`).get()?.n ?? 0);
  const memoriesActive = Number(db.prepare(`SELECT COUNT(*) AS n FROM memories WHERE status = 'active'`).get()?.n ?? 0);
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
    month
  };
}
function monthKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function okConflicts(rule, db) {
  if (!rule || !db) return [];
  try {
    return findConflictingRules(db, rule);
  } catch (e) {
    console.warn("[long-memory] rule conflict scan failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
function buildAgentsMdDraft(rule) {
  if (!rule || typeof rule !== "object") return "";
  const rawTags = rule.tags;
  const tags = Array.isArray(rawTags) ? rawTags.filter(Boolean) : [];
  const lines = [
    "## " + (rule.category !== null && rule.category !== void 0 ? String(rule.category) : "general"),
    "",
    "- **\u89C4\u5219**: " + (rule.content !== null && rule.content !== void 0 ? String(rule.content) : "(empty)"),
    "- **\u5206\u7C7B**: " + (rule.category !== null && rule.category !== void 0 ? String(rule.category) : "general"),
    tags.length > 0 ? "- **\u6807\u7B7E**: " + tags.join(", ") : null,
    "- **\u547D\u4E2D\u6B21\u6570**: " + String(rule.hit_count ?? 0),
    "- **\u6765\u6E90**: long-memory \u81EA\u52A8\u63D0\u70BC",
    ""
  ].filter((x) => x !== null);
  return lines.join("\n");
}
export {
  DEFAULT_SIGNAL_WORDS,
  DEFAULT_SIGNAL_WORDS_EN,
  DEFAULT_SIGNAL_WORDS_ZH,
  aggregateStats,
  approveRule,
  archiveRule,
  archiveStaleRules,
  buildAgentsMdDraft,
  bumpUsage,
  countPendingCorrections,
  extractUserText,
  findConflictingRules,
  getCorrection,
  getRule,
  getRulesForInjection,
  incrementRuleHit,
  insertCorrection,
  listCorrections,
  listRules,
  markCorrectionIgnored,
  markCorrectionPromoted,
  matchSignalWords,
  okConflicts,
  promoteCorrectionToRule,
  promoteRule,
  rejectRule,
  resolveSignalWords,
  updateRule
};
//# sourceMappingURL=corrections.js.map
