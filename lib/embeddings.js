import { sha256 } from "./sqlite.js";
async function embedBatch(driver, config, texts) {
  if (!config || config.provider === "none" || texts.length === 0) {
    return texts.map(() => null);
  }
  const model = config.model || "bge-m3";
  const dim = config.dimension || 1024;
  const results = new Array(texts.length).fill(null);
  const toFetch = [];
  for (let i = 0; i < texts.length; i++) {
    const hash = sha256(texts[i]);
    const cached = driver.prepare(
      `SELECT embedding, dim, model FROM memory_embeddings WHERE content_sha256 = ? AND model = ? AND dim = ?`
    ).get(hash, model, dim);
    if (cached !== void 0) {
      results[i] = {
        embedding: parseEmbedding(cached.embedding) ?? [],
        dim: Number(cached.dim),
        model: String(cached.model),
        cached: true
      };
    } else {
      toFetch.push({ index: i, hash, text: texts[i] });
    }
  }
  if (toFetch.length === 0) return results;
  let fetched;
  try {
    fetched = await callProvider(config, toFetch.map((f) => f.text), model, dim);
  } catch (e) {
    console.warn(`[long-memory] embedding failed (${String(config.provider)}): ${e instanceof Error ? e.message : String(e)}`);
    return results;
  }
  for (let i = 0; i < fetched.length; i++) {
    const emb = fetched[i];
    if (emb === null || emb.length === 0) continue;
    const fi = toFetch[i];
    const blob = serializeEmbedding(emb);
    driver.prepare(
      `INSERT OR REPLACE INTO memory_embeddings (content_sha256, model, dim, embedding, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(fi.hash, model, emb.length, blob, Date.now());
    results[fi.index] = { embedding: emb, dim: emb.length, model, cached: false };
  }
  return results;
}
async function callProvider(config, texts, model, dim) {
  const batchSize = config.batch_size || config.batchSize || 16;
  const allResults = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const url = buildUrl(config);
    const body = { model, input: batch };
    const headers = buildHeaders(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout_ms || config.timeoutMs || 3e4);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!r.ok) throw new Error(`${String(config.provider)} returned ${r.status}`);
      const data = await r.json();
      allResults.push(...parseResponse(data, dim));
    } finally {
      clearTimeout(timeout);
    }
  }
  return allResults;
}
function buildUrl(config) {
  if (config.provider === "ollama") {
    const raw2 = config.ollama?.base_url || config.ollama?.baseUrl || "http://127.0.0.1:11434";
    const base2 = raw2.replace(/\/+$/, "").replace(/\/v1$/, "");
    return `${base2}/v1/embeddings`;
  }
  const raw = config.openai_compatible?.base_url || config.openaiCompatible?.baseUrl || "http://127.0.0.1:11434/v1";
  const base = raw.replace(/\/+$/, "");
  return `${base}/embeddings`;
}
function buildHeaders(config) {
  const h = { "Content-Type": "application/json" };
  if (config.provider === "openai-compatible") {
    let key = config.openai_compatible?.api_key || config.openaiCompatible?.apiKey || "";
    if (key.startsWith("$")) {
      key = process.env[key.slice(1)] || "";
    }
    if (key !== "") h["Authorization"] = `Bearer ${key}`;
  }
  return h;
}
function parseResponse(data, dim) {
  return (data.data || []).map((e) => {
    const emb = e.embedding;
    if (!Array.isArray(emb) || emb.length === 0) return null;
    const vec = emb.map(Number);
    if (dim > 0 && vec.length !== dim) return null;
    if (vec.some((v) => !Number.isFinite(v))) return null;
    return vec;
  });
}
function serializeEmbedding(vec) {
  const buf = new ArrayBuffer(vec.length * 4);
  const view = new Float32Array(buf);
  view.set(vec);
  return new Uint8Array(buf);
}
function parseEmbedding(blob) {
  if (blob === null || blob === void 0) return null;
  if (typeof blob === "object" && !Array.isArray(blob) && !(blob instanceof Uint8Array)) {
    const len = Object.keys(blob).length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = blob[i] ?? 0;
    if (len % 4 !== 0) return null;
    return Array.from(new Float32Array(arr.buffer));
  }
  const bytes = new Uint8Array(blob);
  const byteLength = bytes.byteLength ?? bytes.length;
  if (byteLength === 0 || byteLength % 4 !== 0) return null;
  return Array.from(new Float32Array(bytes.buffer, 0, byteLength / 4));
}
export {
  embedBatch,
  parseEmbedding
};
//# sourceMappingURL=embeddings.js.map
