// @wwskills/dsh-long-memory — KG edges + PageRank (M2)
//
// Edge creation: each mem_record call automatically creates typed edges
// linking the new memory to relevant entities. Simple deterministic rules:
//   - BELONGS_TO: memory → its scope (user/project/domain/episodic)
//   - KNOWS: user/PREFERENCE memory → user node; project/FACT → project node
//   - SUPERSEDED_BY: superseded → new memory (when supersession_key triggers)
//
// PageRank: personalized PageRank over the candidate graph, damping=0.85,
// 10 iterations. Personalization weights follow scope priority
// (project > user > domain > episodic), matching the recall rank in §3.4.

import { newId, nowMs } from './sqlite.js';

// ────────────────────────────────────────────────────────────────────────────
// Edge creation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create edges for a newly-recorded memory.
 * Idempotent: re-running on the same memory id is a no-op (edges are keyed by
 * src+dst+predicate; INSERT OR IGNORE).
 *
 * @param {object} driver - SQLite driver
 * @param {object} record - { id, type, scope, supersededIds }
 */
export function createEdges(driver, record) {
  const { id, type, scope } = record;

  // 1. BELONGS_TO: memory → scope
  if (scope) {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'BELONGS_TO', 1.0)`
    ).run(id, scopeNodeId(scope));
  }

  // 2. KNOWS: user/project context
  if (type === 'PREFERENCE' || type === 'USER') {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'KNOWS', 1.0)`
    ).run(id, scopeNodeId('user'));
  }
  if (type === 'PROJECT' || type === 'FACT') {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'KNOWS', 1.0)`
    ).run(id, scopeNodeId('project'));
  }

  // 3. SUPERSEDED_BY: old → new (when supersession_key triggers)
  if (record.supersededIds?.length > 0) {
    for (const oldId of record.supersededIds) {
      driver.prepare(
        `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'SUPERSEDED_BY', 1.0)`
      ).run(oldId, id);
    }
  }
}

function scopeNodeId(scope) {
  return `scope:${scope}`;
}

// ────────────────────────────────────────────────────────────────────────────
// PageRank
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run personalized PageRank over a candidate graph.
 *
 * @param {object} driver - SQLite driver
 * @param {string[]} candidateIds - FTS5 recall hits (memory ids)
 * @param {object} opts
 * @param {number} [opts.damping=0.85]
 * @param {number} [opts.iterations=10]
 * @param {string} [opts.activeScope='user'] - scope for personalization weights
 * @returns {Map<string, number>} memory id → PageRank score
 */
export function runPageRank(driver, candidateIds, opts = {}) {
  if (candidateIds.length === 0) return new Map();

  const damping = opts.damping ?? 0.85;
  const iterations = opts.iterations ?? 10;
  const activeScope = opts.activeScope ?? 'user';

  // 1. Build the graph: candidates + 2-hop neighbors
  const graph = buildGraph(driver, candidateIds);

  // 2. Personalization vector: scope-weighted
  const personalization = buildPersonalization(graph.keys(), activeScope);

  // 3. Run PageRank
  return iteratePageRank(graph, personalization, damping, iterations);
}

/**
 * Build adjacency graph from the edges table. Returns a Map of
 * nodeId → { out: Set<neighborId>, weight: Map<neighborId, number> }.
 */
function buildGraph(driver, seeds) {
  const graph = new Map();

  // Collect nodes: seeds + their out-neighbors (edges from seeds)
  const nodeSet = new Set(seeds);
  const placeholders = seeds.map(() => '?').join(',');

  // Outgoing edges from seeds
  const outEdges = driver.prepare(
    `SELECT src, dst, predicate, weight FROM edges WHERE src IN (${placeholders})`
  ).all(...seeds);

  for (const e of outEdges) {
    nodeSet.add(e.dst);
    if (!graph.has(e.src)) graph.set(e.src, { out: new Set(), weights: new Map() });
    graph.get(e.src).out.add(e.dst);
    graph.get(e.src).weights.set(e.dst, (graph.get(e.src).weights.get(e.dst) ?? 0) + e.weight);
  }

  // Incoming edges to seeds (neighbors pointing to seeds)
  const inEdges = driver.prepare(
    `SELECT src, dst, predicate, weight FROM edges WHERE dst IN (${placeholders})`
  ).all(...seeds);

  for (const e of inEdges) {
    nodeSet.add(e.src);
    if (!graph.has(e.src)) graph.set(e.src, { out: new Set(), weights: new Map() });
    graph.get(e.src).out.add(e.dst);
    graph.get(e.src).weights.set(e.dst, (graph.get(e.src).weights.get(e.dst) ?? 0) + e.weight);
  }

  // Ensure all nodes have an entry (even isolated ones)
  for (const n of nodeSet) {
    if (!graph.has(n)) graph.set(n, { out: new Set(), weights: new Map() });
  }

  return graph;
}

/**
 * Build the personalization vector: scope-aware weights.
 *   project=1.0 > user=0.7 > domain=0.5 > episodic=0.2
 */
function buildPersonalization(nodeIds, activeScope) {
  const weights = { project: 1.0, user: 0.7, domain: 0.5, episodic: 0.2 };
  const base = weights[activeScope] ?? 1.0;
  const map = new Map();
  for (const id of nodeIds) {
    if (id.startsWith('scope:')) {
      const scope = id.slice(6);
      map.set(id, (weights[scope] ?? 0.5) / base);
    } else {
      map.set(id, 1.0 / base);
    }
  }
  // Normalize
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const [k, v] of map) map.set(k, v / total);
  }
  return map;
}

/**
 * Iterative PageRank.
 */
function iteratePageRank(graph, personalization, damping, iterations) {
  const N = graph.size;
  const nodes = Array.from(graph.keys());
  let scores = new Map();
  const initScore = 1.0 / N;
  for (const n of nodes) scores.set(n, initScore);

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map();
    const danglingSum = Array.from(scores.entries())
      .filter(([n]) => !graph.get(n).out.size)
      .reduce((s, [, v]) => s + v, 0);

    for (const n of nodes) {
      const neighbor = graph.get(n);
      let rank = (1 - damping) * (personalization.get(n) ?? initScore);
      rank += damping * danglingSum / N;

      // Incoming edges: sum over predecessors
      for (const [pred, predData] of graph.entries()) {
        if (predData.out.has(n)) {
          const w = predData.weights.get(n) ?? 1;
          const outSum = Array.from(predData.weights.values()).reduce((a, b) => a + b, 0);
          rank += damping * scores.get(pred) * w / (outSum || 1);
        }
      }
      next.set(n, rank);
    }
    scores = next;
  }

  return scores;
}

// ────────────────────────────────────────────────────────────────────────────
// Community detection (M2 stub — renamed to M3 for full implementation)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a community summary for a set of related memories. M2 ships a
 * placeholder that writes one community per scope.
 */
export function refreshCommunities(driver) {
  const scopes = driver.prepare(
    `SELECT DISTINCT scope FROM memories WHERE status='active'`
  ).all();

  for (const { scope } of scopes) {
    const members = driver.prepare(
      `SELECT id FROM memories WHERE scope=? AND status='active' LIMIT 50`
    ).all(scope).map((r) => r.id);

    if (members.length === 0) continue;

    const communityId = `community:${scope}`;
    const summary = `Community of ${members.length} ${scope}-scoped memories`;

    driver.prepare(
      `INSERT OR REPLACE INTO communities (id, members, summary) VALUES (?, ?, ?)`
    ).run(communityId, JSON.stringify(members), summary);
  }
}