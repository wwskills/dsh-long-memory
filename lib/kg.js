function createEdges(driver, record) {
  const { id, type, scope } = record;
  if (scope) {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'BELONGS_TO', 1.0)`
    ).run(id, scopeNodeId(scope));
  }
  if (type === "PREFERENCE" || type === "USER") {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'KNOWS', 1.0)`
    ).run(id, scopeNodeId("user"));
  }
  if (type === "PROJECT" || type === "FACT") {
    driver.prepare(
      `INSERT OR IGNORE INTO edges (src, dst, predicate, weight) VALUES (?, ?, 'KNOWS', 1.0)`
    ).run(id, scopeNodeId("project"));
  }
  if (record.supersededIds !== void 0 && record.supersededIds.length > 0) {
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
function runPageRank(driver, candidateIds, opts = {}) {
  if (candidateIds.length === 0) return /* @__PURE__ */ new Map();
  const damping = opts.damping ?? 0.85;
  const iterations = opts.iterations ?? 10;
  const activeScope = opts.activeScope ?? "user";
  const graph = buildGraph(driver, candidateIds);
  const personalization = buildPersonalization(graph.keys(), activeScope);
  return iteratePageRank(graph, personalization, damping, iterations);
}
function buildGraph(driver, seeds) {
  const graph = /* @__PURE__ */ new Map();
  const nodeSet = new Set(seeds);
  const placeholders = seeds.map(() => "?").join(",");
  const ensure = (node) => {
    let entry = graph.get(node);
    if (entry === void 0) {
      entry = { out: /* @__PURE__ */ new Set(), weights: /* @__PURE__ */ new Map() };
      graph.set(node, entry);
    }
    return entry;
  };
  const outEdges = driver.prepare(
    `SELECT src, dst, weight FROM edges WHERE src IN (${placeholders})`
  ).all(...seeds);
  for (const e of outEdges) {
    const src = String(e.src);
    const dst = String(e.dst);
    nodeSet.add(dst);
    const entry = ensure(src);
    entry.out.add(dst);
    entry.weights.set(dst, (entry.weights.get(dst) ?? 0) + Number(e.weight));
  }
  const inEdges = driver.prepare(
    `SELECT src, dst, weight FROM edges WHERE dst IN (${placeholders})`
  ).all(...seeds);
  for (const e of inEdges) {
    const src = String(e.src);
    const dst = String(e.dst);
    nodeSet.add(src);
    const entry = ensure(src);
    entry.out.add(dst);
    entry.weights.set(dst, (entry.weights.get(dst) ?? 0) + Number(e.weight));
  }
  for (const n of nodeSet) ensure(n);
  return graph;
}
const SCOPE_WEIGHTS = {
  project: 1,
  user: 0.7,
  domain: 0.5,
  episodic: 0.2
};
function buildPersonalization(nodeIds, activeScope) {
  const base = SCOPE_WEIGHTS[activeScope] ?? 1;
  const map = /* @__PURE__ */ new Map();
  for (const id of nodeIds) {
    if (id.startsWith("scope:")) {
      const scope = id.slice(6);
      map.set(id, (SCOPE_WEIGHTS[scope] ?? 0.5) / base);
    } else {
      map.set(id, 1 / base);
    }
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const [k, v] of map) map.set(k, v / total);
  }
  return map;
}
function iteratePageRank(graph, personalization, damping, iterations) {
  const N = graph.size;
  if (N === 0) return /* @__PURE__ */ new Map();
  const nodes = Array.from(graph.keys());
  let scores = /* @__PURE__ */ new Map();
  const initScore = 1 / N;
  for (const n of nodes) scores.set(n, initScore);
  for (let iter = 0; iter < iterations; iter++) {
    const next = /* @__PURE__ */ new Map();
    const danglingSum = Array.from(scores.entries()).filter(([n]) => (graph.get(n)?.out.size ?? 0) === 0).reduce((s, [, v]) => s + v, 0);
    for (const n of nodes) {
      let rank = (1 - damping) * (personalization.get(n) ?? initScore);
      rank += damping * danglingSum / N;
      for (const [pred, predData] of graph.entries()) {
        if (predData.out.has(n)) {
          const w = predData.weights.get(n) ?? 1;
          const outSum = Array.from(predData.weights.values()).reduce((a, b) => a + b, 0);
          rank += damping * (scores.get(pred) ?? 0) * w / (outSum || 1);
        }
      }
      next.set(n, rank);
    }
    scores = next;
  }
  return scores;
}
export {
  createEdges,
  runPageRank
};
//# sourceMappingURL=kg.js.map
