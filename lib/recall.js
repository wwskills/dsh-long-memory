// @wwskills/dsh-long-memory — recall engine
//
// FTS5-only recall by default; adds KG-aware PageRank re-ranking on top of FTS5
// results (the "hybrid" score_path). The shape returned is stable across
// milestones — only score_path / score values change.

import { unigramize } from './cjk.js';
import { runPageRank } from './kg.js';
import { embedBatch, parseEmbedding } from './embeddings.js';
import { sha256 } from './sqlite.js';
import { MAX_RECALL_BYTES_DEFAULT } from './constants.js';

/**
 * Search the memories table using FTS5 only.
 *
 * @param {object} driver - SQLite driver handle
 * @param {object} args
 * @param {string} args.query
 * @param {string[]} [args.scope]  - whitelist of scopes; null/undefined means all
 * @param {number} [args.limit=10]  - clamped to [1, 50]
 * @param {number} [args.since=0]   - timestamp ms lower bound
 * @param {string} [args.sessionId]
 * @param {boolean} [args.includeSuperseded=false]
 * @param {boolean} [args.includeArchived=false]
 * @param {number} [args.maxBytes=4096] - per-row content truncation length
 * @returns {{ hits: object[], total: number, truncated: boolean, score_path: string }}
 */
export function recallFts5(driver, args) {
  const query = (args.query ?? '').trim();
  if (!query) return { hits: [], total: 0, truncated: false, score_path: 'fts5-only' };

  const limit = clamp(args.limit ?? 10, 1, 50);
  const since = args.since ?? 0;
  const scopes = Array.isArray(args.scope) && args.scope.length > 0 ? args.scope : null;
  const maxBytes = args.maxBytes ?? MAX_RECALL_BYTES_DEFAULT;

  // Build FTS5 MATCH expression. FTS5 syntax treats certain characters as
  // operators; we strip them defensively so user queries like 'O(n log n)'
  // don't blow up MATCH parsing. We also unigramize CJK runs so '端口' can
  // match the spaced version stored in memories_fts.
  const match = sanitiseFtsQuery(query);

  // Status filter: superseded / archived are off by default.
  const statuses = ['active'];
  if (args.includeSuperseded) statuses.push('superseded');
  if (args.includeArchived)   statuses.push('archived');

  // Build the WHERE clause incrementally so the indexes in §14 stay useful.
  const where = ['m.status IN (' + statuses.map(() => '?').join(',') + ')'];
  const params = [...statuses];

  if (scopes) {
    where.push('m.scope IN (' + scopes.map(() => '?').join(',') + ')');
    params.push(...scopes);
  }
  if (since > 0) {
    where.push('m.observed_at >= ?');
    params.push(since);
  }
  if (args.sessionId) {
    where.push('m.session_id = ?');
    params.push(args.sessionId);
  }

  // bm25 returns a relevance score; lower = better. We negate + normalise to a
  // 0..1 "score" where 1 is the top hit (approximate — first row's bm25 is
  // the anchor, capped so M2 hybrid won't have to re-think the semantics).
  const sql = `
    SELECT m.id, m.type, m.content, m.origin, m.scope, m.session_id, m.lang,
           m.observed_at, m.supersession_key, m.confidence,
           bm25(memories_fts) AS bm
      FROM memories_fts
      JOIN memories m ON m.rowid = memories_fts.rowid
     WHERE memories_fts MATCH ?
       AND ${where.join(' AND ')}
     ORDER BY bm
     LIMIT ?
  `;
  const rows = driver.prepare(sql).all(match, ...params, limit);

  if (rows.length === 0) {
    return { hits: [], total: 0, truncated: false, score_path: 'fts5-only' };
  }

  // Normalise bm25 → score (best row gets 1.0, others scaled relatively).
  // Then apply trust weighting so confidence/origin influence ranking.
  const bestBm = Math.abs(rows[0].bm);
  const hits = rows.map((r) => {
    const bm25Norm = bestBm > 0 ? Math.min(1, Math.abs(r.bm) / bestBm) : 0;
    const weightedScore = applyTrustWeight(bm25Norm, r.confidence ?? 1.0, r.origin);
    return {
      id: r.id,
      type: r.type,
      content: truncate(r.content, maxBytes),
      origin: r.origin,
      score: weightedScore,
      score_path: 'fts5-only',
      scope: r.scope,
      // session_id and lang are nullable in the DB (column-level constraint
      // doesn't enforce non-null), but our output schema requires strings.
      // Normalize null to '' so the DSH tools runtime validator passes.
      session_id: r.session_id ?? '',
      lang: r.lang ?? '',
      observed_at: r.observed_at,
      confidence: r.confidence ?? 1.0
    };
  }).sort((a, b) => b.score - a.score);

  // Bump access counters (best-effort; do not abort on failure).
  try {
    const ids = hits.map((h) => h.id);
    if (ids.length > 0) {
      driver.prepare(
        `UPDATE memories
            SET access_count = access_count + 1,
                last_access  = ?
          WHERE id IN (${ids.map(() => '?').join(',')})`
      ).run(Date.now(), ...ids);
    }
  } catch {
    /* metric update is not critical — recall still returns */
  }

  return {
    hits,
    total: hits.length,
    truncated: hits.length === limit,   // heuristic; exact count would require a second COUNT(*)
    score_path: 'fts5-only'
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Trust-weighted ranking (v0.2.0 — Gap 4)
//
// BM25 alone treats a low-confidence L7 auto-extracted memory the same as a
// high-confidence user-explicit record. In practice L7 noise can dominate
// top-K results when auto-extraction accumulates over time.
//
// We apply a trust multiplier after BM25 normalisation so that:
//   - owner / user-edited memories rank higher than agent auto-extracted ones
//   - low-confidence (0.3-0.5) memories sink below high-confidence (0.9-1.0)
//
// Formula:
//   finalScore = bm25Norm * W_BM + confidence * W_CONF + originWeight * W_ORIGIN
//
// Weights are tuned so that BM25 relevance still dominates (a highly relevant
// low-confidence memory can still appear, just not at the very top), while a
// marginally-relevant high-confidence memory gets a small boost.
// ────────────────────────────────────────────────────────────────────────────

/** Origin → trust weight. Higher = more trusted. */
const ORIGIN_WEIGHTS = {
  'owner':        1.0,   // user explicitly recorded via mem_record
  'user-edited':  0.9,   // user edited/confirmed via confirm_queue
  'system':       0.7,   // system-generated (scheduled tasks, etc.)
  'agent':        0.5,   // agent auto-extracted (L7 or agent self-record)
  'untrusted':    0.3,   // untrusted external source
};

/** Score weights: must sum to 1.0 for interpretability. */
const W_BM = 0.6;      // BM25 relevance (primary signal)
const W_CONF = 0.3;    // confidence (trust signal)
const W_ORIGIN = 0.1;  // origin (source trust)

/**
 * Apply trust weighting to a normalised BM25 score.
 *
 * @param {number} bm25Norm - normalised BM25 score (0..1, 1 = best match)
 * @param {number} confidence - memory confidence (0..1)
 * @param {string} origin - memory origin field
 * @returns {number} trust-weighted score (0..1)
 */
function applyTrustWeight(bm25Norm, confidence, origin) {
  const ow = ORIGIN_WEIGHTS[origin] ?? 0.5;
  return bm25Norm * W_BM + confidence * W_CONF + ow * W_ORIGIN;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function truncate(s, max) {
  if (typeof s !== 'string') return '';
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + '…';
}

/**
 * Defensive FTS5 query sanitiser:
 *  - Strip FTS5 operator chars (`"*()^:`).
 *  - CJK-unigramize so Chinese queries can match spaced index entries.
 *  - For CJK characters, use OR semantics (any char match) for better recall.
 *  - For non-CJK terms, keep AND semantics.
 */
function sanitiseFtsQuery(q) {
  const unigrammed = unigramize(q);
  const cleaned = unigrammed
    .replace(/["\*\(\):^]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '""';
  // Split into terms; join CJK single chars with OR, keep ASCII words as AND
  const terms = cleaned.split(' ').filter(Boolean);
  const cjkTerms = terms.filter(t => /^[\u4e00-\u9fff]$/.test(t));
  const asciiTerms = terms.filter(t => !/^[\u4e00-\u9fff]$/.test(t));
  const parts = [];
  if (cjkTerms.length > 0) {
    // OR for CJK: any character match is enough (BM25 will rank relevance)
    parts.push(cjkTerms.map(t => `"${t.replace(/"/g, '""')}"`).join(' OR '));
  }
  if (asciiTerms.length > 0) {
    // AND for ASCII: each word must match
    parts.push(asciiTerms.map(t => `"${t.replace(/"/g, '""')}"`).join(' '));
  }
  const expr = parts.join(' ');
  return expr || '""';
}

// ────────────────────────────────────────────────────────────────────────────
// M2: Hybrid recall (FTS5 + PageRank re-ranking). M3 adds vector similarity.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run FTS5 recall, then re-rank with KG-aware PageRank, optionally with
 * vector similarity when embeddings are available.
 *
 * Falls back to FTS5-only when no graph edges exist.
 *
 * @param {object} driver - SQLite driver
 * @param {object} args - same as recallFts5, plus `activeScope`, `embeddingConfig`, `query`
 * @returns {object} hits with appropriate score_path
 */
export function recallHybrid(driver, args) {
  // 1. FTS5 recall (base layer)
  const ftsResult = recallFts5(driver, args);

  // 1b. If FTS5 found nothing but we have vector scores, do pure-vector recall
  if (ftsResult.hits.length === 0 && args.vectorScores && args.vectorScores.size > 0) {
    const limit = args.limit ?? 10;
    const scopeFilter = args.scope;
    const since = args.since ?? 0;
    const includeSuperseded = !!args.includeSuperseded;
    const includeArchived = !!args.includeArchived;
    // Sort vector scores descending, take top-K, fetch memory rows
    const sorted = [...args.vectorScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    if (sorted.length === 0) return ftsResult;
    const placeholders = sorted.map(() => '?').join(',');
    const rows = driver.prepare(
      `SELECT id, type, scope, content, origin, session_kind, session_id, lang,
              observed_at, confidence, access_count, last_access, status
       FROM memories
       WHERE id IN (${placeholders})
         AND (status = 'active'${includeSuperseded ? " OR status = 'superseded'" : ''}${includeArchived ? " OR status = 'archived'" : ''})
         AND observed_at >= ?
         ${scopeFilter ? `AND scope IN (${scopeFilter.map(() => '?').join(',')})` : ''}
    `).all(...sorted.map(s => s[0]), since, ...(scopeFilter || []));
    // Map back to hits with vector score + trust weighting
    const scoreMap = new Map(sorted);
    const hits = rows.map(r => {
      const vecScore = scoreMap.get(r.id) ?? 0;
      const ow = ORIGIN_WEIGHTS[r.origin] ?? 0.5;
      const trustBoost = (r.confidence ?? 0.5) * W_CONF + ow * W_ORIGIN;
      return {
        id: r.id,
        type: r.type,
        content: r.content,
        origin: r.origin || '',
        score: vecScore * W_BM + trustBoost,
        score_path: 'vector-only',
        scope: r.scope,
        session_id: r.session_id ?? '',
        lang: r.lang ?? '',
        observed_at: r.observed_at,
        confidence: r.confidence ?? 0.5
      };
    }).sort((a, b) => b.score - a.score);
    return { hits, total: hits.length, truncated: false, score_path: 'vector-only' };
  }

  if (ftsResult.hits.length === 0) return ftsResult;

  // 2. Check if edges table has any data
  const edgeCount = driver.prepare(`SELECT COUNT(*) AS n FROM edges`).get().n;
  const hasEmbeddings = driver.prepare(
    `SELECT COUNT(*) AS n FROM memory_embeddings`
  ).get().n > 0;

  if (Number(edgeCount) === 0 && !hasEmbeddings) {
    return ftsResult;
  }

  // 3. PageRank over the candidate graph (when edges exist)
  const candidateIds = ftsResult.hits.map((h) => h.id);
  let pageRank = null;
  if (Number(edgeCount) > 0) {
    pageRank = runPageRank(driver, candidateIds, {
      activeScope: args.activeScope ?? 'user'
    });
  }

  // 4. Vector similarity (when embeddings available, M3)
  //    This is synchronous because embedBatch is async — we do a fast
  //    linear scan of cached embeddings. The async embedding path is
  //    deferred to the mem_search tool's async execute.
  let vectorScores = null;
  if (hasEmbeddings && args.vectorScores) {
    vectorScores = args.vectorScores;
  }

  // 5. Combine scores
  const hits = ftsResult.hits.map((h) => {
    let score = h.score;
    let divisor = 1;
    let path = 'fts5-only';

    if (pageRank) {
      score = score * 0.5 + (pageRank.get(h.id) ?? 0) * 0.5;
      path = 'hybrid';
    }
    if (vectorScores) {
      score = score * 0.6 + (vectorScores.get(h.id) ?? 0) * 0.4;
      path = path === 'hybrid' ? 'hybrid' : 'exact';
    }

    return { ...h, score, score_path: path };
  }).sort((a, b) => b.score - a.score);

  return {
    hits,
    total: hits.length,
    truncated: ftsResult.truncated,
    score_path: hits[0]?.score_path || 'fts5-only'
  };
}

/**
 * Compute cosine similarity for a query against all cached memory embeddings.
 * Returns a Map of memory id → similarity score (0..1).
 *
 * v0.2.0: Added scope/type/status pre-filtering to narrow the scan range
 * before the linear cosine computation. This avoids the LIMIT 500 cliff where
 * memories beyond 500 are silently excluded from vector search.
 *
 * For very large datasets (> 10K memories with embeddings), consider
 * upgrading to sqlite-vec for ANN search (future v0.3.0+).
 *
 * @param {object} driver - SQLite driver
 * @param {number[]} queryVec - embedding of the query text
 * @param {{ scope?: string[], types?: string[], includeSuperseded?: boolean, includeArchived?: boolean, limit?: number }} [filter]
 * @returns {Map<string, number>}
 */
export function computeVectorSimilarity(driver, queryVec, filter = {}) {
  const scores = new Map();
  if (!queryVec || queryVec.length === 0) return scores;

  // Build pre-filtered query instead of naked LIMIT 500
  const statuses = ['active'];
  if (filter.includeSuperseded) statuses.push('superseded');
  if (filter.includeArchived)   statuses.push('archived');

  const where = [`m.status IN (${statuses.map(() => '?').join(',')})`];
  const params = [...statuses];

  if (filter.scope && filter.scope.length > 0) {
    where.push(`m.scope IN (${filter.scope.map(() => '?').join(',')})`);
    params.push(...filter.scope);
  }

  // Join with memory_embeddings to only scan memories that HAVE embeddings
  // This is much better than scanning all memories then looking up embeddings
  const scanLimit = filter.limit ?? 5000;  // safety cap, but pre-filtering usually narrows it
  const sql = `
    SELECT m.id, e.embedding, e.dim
      FROM memories m
      JOIN memory_embeddings e ON e.content_sha256 = ?
     WHERE ${where.join(' AND ')}
     LIMIT ?
  `;

  // We need content hash to join — but the old approach looked up embeddings
  // by content hash. The join approach requires knowing the hash upfront.
  // Simpler: pre-filter memories, then look up embeddings (keeps the same
  // hash-based dedup that writeMemory uses).
  const memSql = `
    SELECT id, content FROM memories m
     WHERE ${where.join(' AND ')}
     LIMIT ?
  `;
  const allMemories = driver.prepare(memSql).all(...params, scanLimit);

  for (const mem of allMemories) {
    const hash = sha256(mem.content);
    const emb = driver.prepare(
      `SELECT embedding FROM memory_embeddings WHERE content_sha256 = ?`
    ).get(hash);
    if (!emb) continue;
    const vec = parseEmbedding(emb.embedding);
    if (!vec) continue;
    const sim = cosineSimilarity(queryVec, vec);
    if (sim > 0) scores.set(mem.id, sim);
  }

  return scores;
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}