// Recall engine.
//
// FTS5-only recall by default; adds KG-aware PageRank re-ranking and optional
// vector similarity on top of FTS5 results (the "hybrid"/"vector" score_path).

import { unigramize } from './cjk.js'
import { runPageRank } from './kg.js'
import { parseEmbedding } from './embeddings.js'
import { sha256 } from './sqlite.js'
import type { SqlDriver } from './sqlite.js'
import { MAX_RECALL_BYTES_DEFAULT } from './constants.js'

/** One recall hit. */
export interface RecallHit {
  id: string
  type: string
  content: string
  origin: string
  score: number
  score_path: string
  scope: string
  session_id: string
  lang: string
  observed_at: number
  confidence: number
}

/** Recall result envelope. */
export interface RecallResult {
  hits: RecallHit[]
  total: number
  truncated: boolean
  score_path: string
}

/** Arguments accepted by recallFts5 / recallHybrid. */
export interface RecallArgs {
  query: string
  scope?: string[]
  limit?: number
  since?: number
  sessionId?: string
  includeSuperseded?: boolean
  includeArchived?: boolean
  maxBytes?: number
  activeScope?: string
  vectorScores?: Map<string, number>
  /** When true, do not bump access counters (used by the vector re-run). */
  skipAccessBump?: boolean
}

/** Search the memories table using FTS5 only. */
export function recallFts5(driver: SqlDriver, args: RecallArgs): RecallResult {
  const query = (args.query ?? '').trim()
  if (!query) return { hits: [], total: 0, truncated: false, score_path: 'fts5-only' }

  const limit = clamp(args.limit ?? 10, 1, 50)
  const since = args.since ?? 0
  const scopes = Array.isArray(args.scope) && args.scope.length > 0 ? args.scope : null
  const maxBytes = args.maxBytes ?? MAX_RECALL_BYTES_DEFAULT

  const match = sanitiseFtsQuery(query)
  // A query made purely of FTS operators sanitises to the empty phrase '""',
  // which some SQLite builds reject as a MATCH syntax error — return no hits.
  if (match === '""') return { hits: [], total: 0, truncated: false, score_path: 'fts5-only' }

  const statuses = ['active']
  if (args.includeSuperseded) statuses.push('superseded')
  if (args.includeArchived) statuses.push('archived')

  const where = ['m.status IN (' + statuses.map(() => '?').join(',') + ')']
  const params: unknown[] = [...statuses]

  if (scopes) {
    where.push('m.scope IN (' + scopes.map(() => '?').join(',') + ')')
    params.push(...scopes)
  }
  if (since > 0) {
    where.push('m.observed_at >= ?')
    params.push(since)
  }
  if (args.sessionId) {
    where.push('m.session_id = ?')
    params.push(args.sessionId)
  }

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
  `
  const rows = driver.prepare(sql).all(match, ...params, limit)

  if (rows.length === 0) {
    return { hits: [], total: 0, truncated: false, score_path: 'fts5-only' }
  }

  // Normalise bm25 → score (best row 1.0), then trust-weight.
  const bestBm = Math.abs(Number(rows[0].bm))
  const hits: RecallHit[] = rows.map(r => {
    const bm25Norm = bestBm > 0 ? Math.min(1, Math.abs(Number(r.bm)) / bestBm) : 0
    const weightedScore = applyTrustWeight(bm25Norm, Number(r.confidence ?? 1.0), String(r.origin))
    return {
      id: String(r.id),
      type: String(r.type),
      content: truncate(String(r.content), maxBytes),
      origin: String(r.origin),
      score: weightedScore,
      score_path: 'fts5-only',
      scope: String(r.scope),
      session_id: r.session_id !== null && r.session_id !== undefined ? String(r.session_id) : '',
      lang: r.lang !== null && r.lang !== undefined ? String(r.lang) : '',
      observed_at: Number(r.observed_at),
      confidence: Number(r.confidence ?? 1.0),
    }
  }).sort((a, b) => b.score - a.score)

  // Bump access counters (best-effort). The vector-enriched re-run passes
  // skipAccessBump so a single mem_search does not count twice.
  if (!args.skipAccessBump) {
    try {
      const ids = hits.map(h => h.id)
      if (ids.length > 0) {
        driver.prepare(
          `UPDATE memories
              SET access_count = access_count + 1,
                  last_access  = ?
            WHERE id IN (${ids.map(() => '?').join(',')})`,
        ).run(Date.now(), ...ids)
      }
    } catch {
      /* metric update is not critical */
    }
  }

  return {
    hits,
    total: hits.length,
    truncated: hits.length === limit,
    score_path: 'fts5-only',
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Trust-weighted ranking
// ────────────────────────────────────────────────────────────────────────────

/** Origin → trust weight. Higher = more trusted. */
const ORIGIN_WEIGHTS: Record<string, number> = {
  owner: 1.0,
  'user-edited': 0.9,
  system: 0.7,
  agent: 0.5,
  untrusted: 0.3,
}

/** Score weights (sum to 1.0). */
const W_BM = 0.6
const W_CONF = 0.3
const W_ORIGIN = 0.1

function applyTrustWeight(bm25Norm: number, confidence: number, origin: string): number {
  const ow = ORIGIN_WEIGHTS[origin] ?? 0.5
  return bm25Norm * W_BM + confidence * W_CONF + ow * W_ORIGIN
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function truncate(s: string, max: number): string {
  if (typeof s !== 'string') return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
}

/**
 * Defensive FTS5 query sanitiser: strip operator chars, CJK-unigramize, join
 * CJK chars with OR and ASCII words with AND (all quoted as phrases).
 */
function sanitiseFtsQuery(q: string): string {
  const unigrammed = unigramize(q)
  const cleaned = unigrammed
    .replace(/["\*\(\):^]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return '""'
  const terms = cleaned.split(' ').filter(Boolean)
  const cjkTerms = terms.filter(t => /^[\u4e00-\u9fff]$/.test(t))
  const asciiTerms = terms.filter(t => !/^[\u4e00-\u9fff]$/.test(t))
  const parts: string[] = []
  if (cjkTerms.length > 0) {
    parts.push(cjkTerms.map(t => `"${t.replace(/"/g, '""')}"`).join(' OR '))
  }
  if (asciiTerms.length > 0) {
    parts.push(asciiTerms.map(t => `"${t.replace(/"/g, '""')}"`).join(' '))
  }
  const expr = parts.join(' ')
  return expr || '""'
}

// ────────────────────────────────────────────────────────────────────────────
// Hybrid recall (FTS5 + PageRank + optional vector)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run FTS5 recall, then re-rank with KG-aware PageRank, optionally with vector
 * similarity when embeddings are available. Falls back to FTS5-only.
 */
export function recallHybrid(driver: SqlDriver, args: RecallArgs): RecallResult {
  // 1. FTS5 recall (base layer). `args.skipAccessBump` flows straight through
  // so the vector-enriched re-run does not bump access counters twice.
  const ftsResult = recallFts5(driver, args)

  // 1b. FTS5 found nothing but we have vector scores → pure-vector recall.
  if (ftsResult.hits.length === 0 && args.vectorScores && args.vectorScores.size > 0) {
    const limit = args.limit ?? 10
    const scopeFilter = args.scope
    const since = args.since ?? 0
    const includeSuperseded = args.includeSuperseded === true
    const includeArchived = args.includeArchived === true
    const sorted = [...args.vectorScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
    if (sorted.length === 0) return ftsResult
    const placeholders = sorted.map(() => '?').join(',')
    const rows = driver.prepare(
      `SELECT id, type, scope, content, origin, session_kind, session_id, lang,
              observed_at, confidence, access_count, last_access, status
       FROM memories
       WHERE id IN (${placeholders})
         AND (status = 'active'${includeSuperseded ? " OR status = 'superseded'" : ''}${includeArchived ? " OR status = 'archived'" : ''})
         AND observed_at >= ?
         ${scopeFilter ? `AND scope IN (${scopeFilter.map(() => '?').join(',')})` : ''}
    `).all(...sorted.map(s => s[0]), since, ...(scopeFilter ?? []))
    const scoreMap = new Map(sorted)
    const hits: RecallHit[] = rows.map(r => {
      const vecScore = scoreMap.get(String(r.id)) ?? 0
      const ow = ORIGIN_WEIGHTS[String(r.origin)] ?? 0.5
      const trustBoost = Number(r.confidence ?? 0.5) * W_CONF + ow * W_ORIGIN
      return {
        id: String(r.id),
        type: String(r.type),
        content: String(r.content),
        origin: r.origin !== null && r.origin !== undefined ? String(r.origin) : '',
        score: vecScore * W_BM + trustBoost,
        score_path: 'vector-only',
        scope: String(r.scope),
        session_id: r.session_id !== null && r.session_id !== undefined ? String(r.session_id) : '',
        lang: r.lang !== null && r.lang !== undefined ? String(r.lang) : '',
        observed_at: Number(r.observed_at),
        confidence: Number(r.confidence ?? 0.5),
      }
    }).sort((a, b) => b.score - a.score)
    return { hits, total: hits.length, truncated: false, score_path: 'vector-only' }
  }

  if (ftsResult.hits.length === 0) return ftsResult

  // 2. Check whether edges / embeddings exist
  const edgeCount = Number((driver.prepare(`SELECT COUNT(*) AS n FROM edges`).get() as { n: number }).n)
  const hasEmbeddings = Number((driver.prepare(`SELECT COUNT(*) AS n FROM memory_embeddings`).get() as { n: number }).n) > 0

  if (edgeCount === 0 && !hasEmbeddings) {
    return ftsResult
  }

  // 3. PageRank over the candidate graph (when edges exist)
  const candidateIds = ftsResult.hits.map(h => h.id)
  let pageRank: Map<string, number> | null = null
  if (edgeCount > 0) {
    pageRank = runPageRank(driver, candidateIds, { activeScope: args.activeScope ?? 'user' })
  }

  // 4. Vector similarity (when embeddings available)
  const vectorScores = hasEmbeddings && args.vectorScores ? args.vectorScores : null

  // 5. Combine scores
  const hits: RecallHit[] = ftsResult.hits.map(h => {
    let score = h.score
    let path = 'fts5-only'
    if (pageRank) {
      score = score * 0.5 + (pageRank.get(h.id) ?? 0) * 0.5
      path = 'hybrid'
    }
    if (vectorScores) {
      score = score * 0.6 + (vectorScores.get(h.id) ?? 0) * 0.4
      path = path === 'hybrid' ? 'hybrid' : 'exact'
    }
    return { ...h, score, score_path: path }
  }).sort((a, b) => b.score - a.score)

  return {
    hits,
    total: hits.length,
    truncated: ftsResult.truncated,
    score_path: hits[0]?.score_path ?? 'fts5-only',
  }
}

/** Vector filter options for {@link computeVectorSimilarity}. */
export interface VectorFilter {
  scope?: string[]
  includeSuperseded?: boolean
  includeArchived?: boolean
  limit?: number
}

/**
 * Compute cosine similarity for a query against cached memory embeddings.
 * Returns a Map of memory id → similarity (0..1). Scope/status pre-filtering
 * narrows the linear scan; the dim filter keeps stale-model vectors out.
 */
export function computeVectorSimilarity(driver: SqlDriver, queryVec: number[], filter: VectorFilter = {}): Map<string, number> {
  const scores = new Map<string, number>()
  if (!queryVec || queryVec.length === 0) return scores

  const statuses = ['active']
  if (filter.includeSuperseded) statuses.push('superseded')
  if (filter.includeArchived) statuses.push('archived')

  const where = [`m.status IN (${statuses.map(() => '?').join(',')})`]
  const params: unknown[] = [...statuses]

  if (filter.scope && filter.scope.length > 0) {
    where.push(`m.scope IN (${filter.scope.map(() => '?').join(',')})`)
    params.push(...filter.scope)
  }

  const scanLimit = filter.limit ?? 5000
  const memSql = `
    SELECT id, content FROM memories m
     WHERE ${where.join(' AND ')}
     LIMIT ?
  `
  const allMemories = driver.prepare(memSql).all(...params, scanLimit)

  for (const mem of allMemories) {
    const hash = sha256(String(mem.content))
    // Filter by dim so a cache row from a previous embedding model is not
    // served for the same content (cosine against a mismatched dimension
    // silently scores 0 for everything).
    const emb = driver.prepare(
      `SELECT embedding FROM memory_embeddings WHERE content_sha256 = ? AND dim = ?`,
    ).get(hash, queryVec.length)
    if (emb === undefined) continue
    const vec = parseEmbedding(emb.embedding)
    if (vec === null || vec.length !== queryVec.length) continue
    const sim = cosineSimilarity(queryVec, vec)
    if (sim > 0) scores.set(String(mem.id), sim)
  }

  return scores
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}
