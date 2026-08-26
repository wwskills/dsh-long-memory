// @wwskills/dsh-long-memory — L7 consolidate (M4)
//
// Extracts candidate memories from session conversations. Two modes:
//   • LLM-based (M4+): reads DSH's LLM config and calls the provider directly
//   • Keyword heuristic (fallback): regex-based pattern matching
//
// Flow:
//   1. During a session, buffer user messages to SQLite (survives restart)
//   2. On turn/end, schedule async extraction (setImmediate, non-blocking)
//   3. Interval check: skip if last run was < interval_ms ago
//   4. Write candidate memories to the DB with origin='agent' and low confidence
//   5. Sensitive content → confirm_queue for user approval
//
// Async execution: uses setImmediate so turn/end returns instantly.

import { newId, nowMs } from './sqlite.js';
import { writeMemory } from './write.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// Use DSH's bundled js-yaml if available; fall back to a minimal inline parser.
// This avoids adding a hard dependency for plugin users.
const _require = createRequire(import.meta.url);
let _parseYAML;
try {
  _parseYAML = _require('js-yaml').load;
} catch {
  // Minimal YAML parser for settings.yaml (handles simple nested key: value + lists)
  _parseYAML = (text) => {
    const result = {};
    const stack = [{ indent: -1, obj: result }];
    for (const line of text.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const indent = line.length - line.trimStart().length;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const parent = stack[stack.length - 1].obj;
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        // list item
        const key = Object.keys(parent).find(k => Array.isArray(parent[k]));
        if (key) parent[key].push(trimmed.slice(2));
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        if (val === '' || val === '[]') {
          const child = val === '[]' ? [] : {};
          parent[key] = child;
          if (typeof child === 'object' && !Array.isArray(child)) stack.push({ indent, obj: child });
        } else {
          parent[key] = val.replace(/^["']|["']$/g, '');
        }
      }
    }
    return result;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Persistent buffer (SQLite)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Buffer a user message to the persistent l7_buffer table.
 */
export function bufferMessage(driver, sessionId, text) {
  if (!sessionId || !text) return;
  try {
    driver.prepare(
      `INSERT INTO l7_buffer (session_id, message, turn_count, created_at) VALUES (?, ?, ?, ?)`
    ).run(sessionId, text, 0, Date.now());
    // Update turn_count for this session (count of messages)
    driver.prepare(
      `UPDATE l7_buffer SET turn_count = (SELECT COUNT(*) FROM l7_buffer WHERE session_id = ?) WHERE session_id = ? AND id = last_insert_rowid()`
    ).run(sessionId, sessionId);
  } catch (e) {
    console.warn('[long-memory] L7 buffer failed:', e.message);
  }
}

/**
 * Get buffered messages for a session (and optionally delete them).
 */
function getBufferedMessages(driver, sessionId) {
  const rows = driver.prepare(
    `SELECT message FROM l7_buffer WHERE session_id = ? ORDER BY id ASC`
  ).all(sessionId);
  return rows.map(r => r.message);
}

/**
 * Clear buffered messages for a session.
 */
function clearBuffer(driver, sessionId) {
  driver.prepare(`DELETE FROM l7_buffer WHERE session_id = ?`).run(sessionId);
}

/**
 * Get count of buffered sessions (for diagnostics).
 */
export function bufferedSessionCount(driver) {
  if (!driver) return 0;
  try {
    return driver.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM l7_buffer`).get().n;
  } catch {
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Interval tracking
// ────────────────────────────────────────────────────────────────────────────

function getLastRunTs(driver) {
  try {
    const row = driver.prepare(`SELECT value FROM schema_meta WHERE key = 'l7_last_run'`).get();
    return row ? Number(row.value) : 0;
  } catch {
    return 0;
  }
}

function setLastRunTs(driver, ts) {
  try {
    driver.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'l7_last_run'`).run(String(ts));
  } catch { /* best-effort */ }
}

/** Per-session last-run timestamp (replaces global throttle). */
function getSessionLastRun(driver, sessionKey) {
  try {
    const row = driver.prepare(`SELECT value FROM schema_meta WHERE key = ?`).get(sessionKey);
    return row ? Number(row.value) : 0;
  } catch {
    return 0;
  }
}

function setSessionLastRun(driver, sessionKey, ts) {
  try {
    driver.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)`).run(sessionKey, String(ts));
  } catch { /* best-effort */ }
}

// ────────────────────────────────────────────────────────────────────────────
// Extraction entry point (async, non-blocking)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Schedule L7 extraction asynchronously so turn/end returns instantly.
 * Uses setImmediate — the extraction runs after the current event loop tick.
 */
export function scheduleExtraction(driver, sessionId, cfg = {}, ctx) {
  if (!cfg.l7?.enabled) return;

  // Per-session throttle: skip if this session was recently extracted
  const intervalMs = cfg.l7?.interval_ms ?? 21600000; // 6h default
  const sessionKey = `l7_last_run:${sessionId}`;
  const lastRun = getSessionLastRun(driver, sessionKey);
  const now = Date.now();
  if (lastRun && now - lastRun < intervalMs) return;

  // Async: don't block turn/end
  setImmediate(async () => {
    try {
      const { extracted } = await extractAndPersist(driver, sessionId, cfg, ctx);
      setSessionLastRun(driver, sessionKey, Date.now());
      if (extracted > 0) console.log(`[long-memory] L7 extracted ${extracted} candidate(s) from session ${sessionId}`);
    } catch (e) {
      console.warn('[long-memory] L7 async extraction failed:', e.message);
      setSessionLastRun(driver, sessionKey, Date.now());
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Extraction + persist
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run extraction on a session's buffer and write candidate memories.
 * After extraction, the buffer is cleared.
 */
export async function extractAndPersist(driver, sessionId, cfg = {}, ctx) {
  const messages = getBufferedMessages(driver, sessionId);
  if (messages.length === 0) return { extracted: 0, candidates: [] };

  const maxTurns = cfg.l7?.batch_turns ?? 50;
  const recent = messages.slice(-maxTurns);

  // Try LLM extraction first, fall back to keyword heuristic
  let candidates;
  if (cfg.l7?.auto_extract !== false && ctx) {
    try {
      candidates = await extractWithLLM(ctx, cfg, recent);
      if (candidates.length > 0) console.log(`[long-memory] L7 LLM extracted ${candidates.length} candidate(s)`);
    } catch (e) {
      console.warn('[long-memory] L7 LLM extraction failed, falling back to keyword:', e.message);
    }
  }
  if (!candidates || candidates.length === 0) {
    candidates = extractCandidates(recent);
  }

  // v0.2.0: Improved dedup — instead of just skipping duplicates, mark old
  // memories as superseded when a newer candidate covers the same fact.
  // Also checks for similar memories by type+scope+content-prefix overlap.
  const existingByPrefix = new Map();
  const existingRows = driver.prepare(
    `SELECT id, type, scope, content, confidence, observed_at
     FROM memories WHERE status='active'
     ORDER BY observed_at DESC`
  ).all();
  for (const r of existingRows) {
    const prefix = r.content.slice(0, 100);
    if (!existingByPrefix.has(prefix)) {
      existingByPrefix.set(prefix, r);
    }
  }

  // Also build a type+scope index for semantic dedup (same type+scope+similar content)
  const existingByTypeScope = new Map();
  for (const r of existingRows) {
    const key = `${r.type}:${r.scope}`;
    if (!existingByTypeScope.has(key)) existingByTypeScope.set(key, []);
    existingByTypeScope.get(key).push(r);
  }

  // v0.2.0: Low-confidence L7 extractions go to confirm_queue instead of
  // being silently inserted as active memories. This prevents L7 noise from
  // accumulating in the recall pool without user oversight.
  //
  // Threshold: candidates with confidence < L7_CONFIRM_THRESHOLD go to queue;
  // candidates above the threshold are inserted directly (trust-weighted
  // ranking in recall.js ensures they sink below user-explicit records).
  const L7_CONFIRM_THRESHOLD = cfg.l7?.confirm_threshold ?? 0.6;
  const { newId } = await import('./sqlite.js');

  let extracted = 0;
  let queued = 0;
  let superseded = 0;
  for (const c of candidates) {
    const contentPrefix = c.content.slice(0, 100);
    const existing = existingByPrefix.get(contentPrefix);

    // v0.2.0: If an exact-prefix duplicate exists, skip (same as before)
    if (existing) {
      continue;
    }

    // v0.2.0: Check for semantic supersession — same type+scope, content
    // shares significant prefix overlap (> 60% of shorter content's first 60 chars)
    const typeScopeKey = `${c.type}:${c.scope}`;
    const similar = (existingByTypeScope.get(typeScopeKey) || []).find(r => {
      const minLen = Math.min(r.content.length, c.content.length, 60);
      const overlap = r.content.slice(0, minLen) === c.content.slice(0, minLen);
      return overlap && r.content.slice(0, 30) === c.content.slice(0, 30);
    });

    if (similar) {
      // Mark the old memory as superseded by the new one
      try {
        driver.prepare(
          `UPDATE memories SET status = 'superseded' WHERE id = ?`
        ).run(similar.id);
        superseded++;
      } catch {
        // best-effort; don't block the new insertion
      }
    }

    try {
      if (c.confidence < L7_CONFIRM_THRESHOLD) {
        // Low-confidence → confirm queue (user must approve before activation)
        const queueId = newId();
        driver.prepare(
          `INSERT INTO confirm_queue
             (queue_id, memory_id, type, content, scope, origin, supersession_key,
              confidence, tags, created_at, status)
           VALUES (?, NULL, ?, ?, ?, 'agent', NULL, ?, NULL, ?, 'pending')`
        ).run(queueId, c.type, c.content, c.scope, c.confidence, Date.now());
        queued++;
      } else {
        // Above threshold → insert directly (trust weighting handles ranking)
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
        });
        extracted++;
      }
    } catch (e) {
      console.warn(`[long-memory] L7 persist failed for ${c.content.slice(0, 40)}: ${e.message}`);
    }
  }

  if (queued > 0) {
    console.log(`[long-memory] L7 queued ${queued} low-confidence candidate(s) for user confirmation`);
  }
  if (superseded > 0) {
    console.log(`[long-memory] L7 superseded ${superseded} old memory(s) with newer candidates`);
  }

  // Clear buffer
  clearBuffer(driver, sessionId);

  return { extracted, queued, superseded, candidates };
}

// ────────────────────────────────────────────────────────────────────────────
// LLM extraction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Dynamically resolve LLM call parameters from DSH's own configuration.
 *
 * DSH users already configure their LLM provider in settings.yaml + .credentials.yaml.
 * This function reads that config so the plugin needs zero extra setup.
 *
 * Chain:
 *   settings.yaml → agent-default-model.provider (e.g. "tokenhub")
 *   settings.yaml → llm-*.providers[provider].apiKeyEnv (e.g. "TOKENHUB_API_KEY")
 *   settings.yaml → llm-*.providers[provider].baseURL (e.g. "https://...")
 *   settings.yaml → llm-*.providers[provider].models[0].id (cheapest model)
 *   .credentials.yaml → refs[apiKeyEnv]  OR  process.env[apiKeyEnv]
 *
 * @param {object} cfg - plugin config; cfg.l7.extractor_model overrides the auto-detected model.
 * @returns {{ baseURL: string, apiKey: string, model: string } | null}
 */
function resolveLLMConfig(cfg) {
  const dshHome = process.env.DSH_HOME || join(process.env.HOME || '/root', '.dsh');

  let settings;
  try {
    settings = _parseYAML(readFileSync(join(dshHome, 'settings.yaml'), 'utf8'));
  } catch { return null; }

  // 1. Get default provider + model from DSH config
  const defaultModel = settings?.['agent-default-model'];
  if (!defaultModel?.provider) return null;
  const providerName = defaultModel.provider;

  // 2. Find provider details — search all llm-* provider groups in settings
  let baseURL, apiKeyEnv, models;
  for (const key of Object.keys(settings)) {
    if (!key.startsWith('llm-')) continue;
    const group = settings[key];
    if (!group || typeof group !== 'object') continue;

    // Case A: llm-pi-ai style (providers map with named entries)
    if (group.providers?.[providerName]) {
      const p = group.providers[providerName];
      baseURL = p.baseURL;
      apiKeyEnv = p.apiKeyEnv;
      models = p.models;
      break;
    }
    // Case B: direct provider match (e.g. llm-deepseek with provider field)
    if (group.provider === providerName || key === `llm-${providerName}`) {
      baseURL = group.baseURL || group.base_url;
      apiKeyEnv = group.apiKeyEnv;
      models = group.models;
      // If apiKeyEnv is missing, try common convention: PROVIDER_API_KEY
      if (!apiKeyEnv) {
        const upper = providerName.replace(/-/g, '_').toUpperCase();
        apiKeyEnv = `${upper}_API_KEY`;
      }
      // If baseURL is still missing, we can't make HTTP calls
      if (!baseURL) continue;
      break;
    }
  }
  if (!baseURL || !apiKeyEnv) return null;

  // 3. Resolve API key: env first, then credentials file
  let apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    try {
      const credContent = readFileSync(join(dshHome, '.credentials.yaml'), 'utf8');
      const credMatch = credContent.match(new RegExp(`^\\s*${apiKeyEnv}:\\s*(.+)$`, 'm'));
      if (credMatch) apiKey = credMatch[1].trim();
    } catch {}
  }
  if (!apiKey) return null;

  // 4. Pick model: user override > first (cheapest) model > default model
  const model = cfg?.l7?.extractor_model || models?.[0]?.id || defaultModel.model || '';
  if (!model) return null;

  return { baseURL, apiKey, model };
}

async function extractWithLLM(_ctx, cfg, messages) {
  const llmConfig = resolveLLMConfig(cfg);
  if (!llmConfig) return [];

  const { baseURL, apiKey, model } = llmConfig;
  const temp = cfg.l7?.extractor_temp ?? 0.2;
  console.log(`[long-memory] L7 extractWithLLM: model=${model}, messages=${messages.length}`);

  const prompt = buildExtractionPrompt(messages);

  try {
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
    });
    if (!resp.ok) {
      console.warn(`[long-memory] L7 LLM HTTP ${resp.status}: ${await resp.text()}`);
      return [];
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const parsed = parseLLMResponse(text);
    return parsed;
  } catch (e) {
    console.warn(`[long-memory] L7 LLM fetch failed: ${e.message}`);
    return [];
  }
}

const EXTRACTION_SYSTEM = `You are a memory extraction assistant. Extract key facts, preferences, project context, and decisions from the conversation. Return ONLY valid JSON.`;

function buildExtractionPrompt(messages) {
  const joined = messages.map((m, i) => `[${i + 1}] ${m}`).join('\n\n');
  return `Extract memories from this conversation. Return a JSON object with a "memories" array. Each memory has:
- type: "PREFERENCE" | "FACT" | "PROJECT" | "EVENT"
- scope: "user" | "project" | "domain"
- content: concise one-line fact (max 200 chars)
- confidence: 0.0-1.0

Only extract MEANINGFUL, CONCISE facts. Skip small talk, greetings, and vague statements.
Return at most 5 memories.

Conversation:
${joined}`;
}

function parseLLMResponse(text) {
  try {
    const data = JSON.parse(text);
    const memories = data.memories || data.candidates || [];
    return memories.filter((m) =>
      m.content && m.type &&
      ['PREFERENCE', 'FACT', 'PROJECT', 'EVENT'].includes(m.type)
    ).map((m) => ({
      type: m.type,
      scope: m.scope || 'user',
      content: String(m.content).slice(0, 200),
      confidence: Math.min(1, Math.max(0, Number(m.confidence) || 0.5)),
    }));
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Keyword heuristic (fallback)
// ────────────────────────────────────────────────────────────────────────────

function extractCandidates(messages) {
  const candidates = [];

  for (const msg of messages) {
    const sentences = msg.split(/[。！？\.\!\?\n]+/).filter((s) => s.trim().length > 0);

    for (const sent of sentences) {
      const trimmed = sent.trim();
      if (trimmed.length < 5) continue;

      let type = null;
      let confidence = 0.3;

      if (/偏好|prefer|喜欢用|习惯|preference|通常|always|never|偏好语言|中文|英文/.test(trimmed)) {
        type = 'PREFERENCE';
        confidence = 0.5;
      }
      else if (/部署端口|端口是|port is|记住|版本|version|配置|config|API|端点|endpoint/.test(trimmed)) {
        type = 'FACT';
        confidence = 0.4;
      }
      else if (/项目|project|约定|convention|架构|architecture|依赖|dependency/.test(trimmed)) {
        type = 'PROJECT';
        confidence = 0.4;
      }
      else if (/修复|fix|bug|错误|error|完成|done|部署|deploy/.test(trimmed)) {
        type = 'EVENT';
        confidence = 0.35;
      }

      if (type) {
        candidates.push({
          type,
          scope: type === 'PROJECT' ? 'project' : 'user',
          content: trimmed.slice(0, 200),
          confidence,
        });
      }
    }
  }

  return candidates;
}
