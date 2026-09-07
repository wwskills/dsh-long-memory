// KG edges + PageRank.
//
// Edge creation: each mem_record call automatically creates typed edges
// linking the new memory to relevant entities. Simple deterministic rules:
//   - BELONGS_TO: memory → its scope (user/project/domain/episodic)
//   - KNOWS: user/PREFERENCE memory → user node; project/FACT → project node
//   - SUPERSEDED_BY: superseded → new memory (when supersession_key triggers)
//
// PageRank: personalized PageRank over the candidate graph, damping=0.85,
// 10 iterations. Personalization weights follow scope priority
// (project > user > domain > episodic).

import type { SqlDriver } from './sqlite.js'

/** A memory record the edge rules operate on. */
export interface EdgeRecord {
  id: string
  type: string
  scope: string
  /** Memories this one replaces (SUPERSEDED_BY sources). */
  supersededIds?: readonly string[]
}

/** Adjacency entry for one graph node. */
interface GraphNode {
  out: Set<string>
  weights: Map<string, number>
}

/**
 * Create edges for a newly-recorded memory. Idempotent: re-running on the
 * same memory id is a no-op (edges are keyed by src+dst+predicate).
 */
export function createEdges(driver: SqlDriver, record: EdgeRecord): void {
  const { id, type, scope } = record

  // 1. BELONGS_TO: memory → scope
  if (scope) {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'BELONGS_TO', 1.0)`,
    ).run(id, scopeNodeId(scope))
  }

  // 2. KNOWS: user/project context
  if (type === 'PREFERENCE' || type === 'USER') {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'KNOWS', 1.0)`,
    ).run(id, scopeNodeId('user'))
  }
  if (type === 'PROJECT' || type === 'FACT') {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'KNOWS', 1.0)`,
    ).run(id, scopeNodeId('project'))
  }

  // 3. SUPERSEDED_BY: old → new (when supersession_key triggers)
  if (record.supersededIds !== undefined && record.supersededIds.length > 0) {
    for (const oldId of record.supersededIds) {
      driver.prepare(
        `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'SUPERSEDED_BY', 1.0)`,
      ).run(oldId, id)
    }
  }
}

function scopeNodeId(scope: string): string {
  return `scope:${scope}`
}

// ────────────────────────────────────────────────────────────────────────────
// PageRank
// ────────────────────────────────────────────────────────────────────────────

/** Options for {@link runPageRank}. */
export interface PageRankOptions {
  damping?: number
  iterations?: number
  /** Scope for personalization weights. */
  activeScope?: string
}

/**
 * Run personalized PageRank over a candidate graph.
 * @returns Map of memory id → PageRank score.
 */
export function runPageRank(driver: SqlDriver, candidateIds: readonly string[], opts: PageRankOptions = {}): Map<string, number> {
  if (candidateIds.length === 0) return new Map()

  const damping = opts.damping ?? 0.85
  const iterations = opts.iterations ?? 10
  const activeScope = opts.activeScope ?? 'user'

  // 1. Build the graph: candidates + 1-hop neighbors
  const graph = buildGraph(driver, candidateIds)

  // 2. Personalization vector: scope-weighted
  const personalization = buildPersonalization(graph.keys(), activeScope)

  // 3. Run PageRank
  return iteratePageRank(graph, personalization, damping, iterations)
}

/**
 * Build an adjacency graph from the edges table: node id →
 * { out: Set<neighborId>, weights: Map<neighborId, number> }.
 */
function buildGraph(driver: SqlDriver, seeds: readonly string[]): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>()

  const nodeSet = new Set<string>(seeds)
  const placeholders = seeds.map(() => '?').join(',')

  const ensure = (node: string): GraphNode => {
    let entry = graph.get(node)
    if (entry === undefined) {
      entry = { out: new Set(), weights: new Map() }
      graph.set(node, entry)
    }
    return entry
  }

  // Outgoing edges from seeds
  const outEdges = driver.prepare(
    `SELECT src, dst, weight FROM edges WHERE src IN (${placeholders})`,
  ).all(...seeds)
  for (const e of outEdges) {
    const src = String(e.src)
    const dst = String(e.dst)
    nodeSet.add(dst)
    const entry = ensure(src)
    entry.out.add(dst)
    entry.weights.set(dst, (entry.weights.get(dst) ?? 0) + Number(e.weight))
  }

  // Incoming edges to seeds (neighbors pointing to seeds)
  const inEdges = driver.prepare(
    `SELECT src, dst, weight FROM edges WHERE dst IN (${placeholders})`,
  ).all(...seeds)
  for (const e of inEdges) {
    const src = String(e.src)
    const dst = String(e.dst)
    nodeSet.add(src)
    const entry = ensure(src)
    entry.out.add(dst)
    entry.weights.set(dst, (entry.weights.get(dst) ?? 0) + Number(e.weight))
  }

  // Ensure all nodes have an entry (even isolated ones)
  for (const n of nodeSet) ensure(n)

  return graph
}

/** Scope personalization weights: project > user > domain > episodic. */
const SCOPE_WEIGHTS: Record<string, number> = {
  project: 1.0,
  user: 0.7,
  domain: 0.5,
  episodic: 0.2,
}

/** Build the normalized personalization vector. */
function buildPersonalization(nodeIds: Iterable<string>, activeScope: string): Map<string, number> {
  const base = SCOPE_WEIGHTS[activeScope] ?? 1.0
  const map = new Map<string, number>()
  for (const id of nodeIds) {
    if (id.startsWith('scope:')) {
      const scope = id.slice(6)
      map.set(id, (SCOPE_WEIGHTS[scope] ?? 0.5) / base)
    } else {
      map.set(id, 1.0 / base)
    }
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0)
  if (total > 0) {
    for (const [k, v] of map) map.set(k, v / total)
  }
  return map
}

/** Iterative PageRank with dangling-mass redistribution. */
function iteratePageRank(graph: Map<string, GraphNode>, personalization: Map<string, number>, damping: number, iterations: number): Map<string, number> {
  const N = graph.size
  if (N === 0) return new Map()
  const nodes = Array.from(graph.keys())
  let scores = new Map<string, number>()
  const initScore = 1.0 / N
  for (const n of nodes) scores.set(n, initScore)

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<string, number>()
    const danglingSum = Array.from(scores.entries())
      .filter(([n]) => (graph.get(n)?.out.size ?? 0) === 0)
      .reduce((s, [, v]) => s + v, 0)

    for (const n of nodes) {
      let rank = (1 - damping) * (personalization.get(n) ?? initScore)
      rank += (damping * danglingSum) / N

      // Incoming edges: sum over predecessors
      for (const [pred, predData] of graph.entries()) {
        if (predData.out.has(n)) {
          const w = predData.weights.get(n) ?? 1
          const outSum = Array.from(predData.weights.values()).reduce((a, b) => a + b, 0)
          rank += (damping * (scores.get(pred) ?? 0) * w) / (outSum || 1)
        }
      }
      next.set(n, rank)
    }
    scores = next
  }

  return scores
}
