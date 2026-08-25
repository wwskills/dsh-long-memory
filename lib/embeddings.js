// @wwskills/dsh-long-memory — embedding provider (M3)
//
// Three providers:
//   'none'              — FTS5 keyword fallback only (zero cost, always works)
//   'ollama'            — local Ollama service (zero API cost, requires Ollama running)
//   'openai-compatible' — any OpenAI-style endpoint (SiliconFlow, OpenAI, Tencent Cloud, etc.)
//
// Config uses nested structure:
//   embedding.ollama.baseUrl         — Ollama base URL
//   embedding.openaiCompatible.baseUrl — API base URL
//   embedding.openaiCompatible.apiKey  — API key (supports '$ENV_VAR' SecretRef)
//
// All calls are cached per content SHA-256 in the `memory_embeddings` table,
// so identical content is never re-embedded. The cache is forward-compatible
// with model/backend changes: a new model or dimension produces a different
// cache key.

import { sha256 } from './sqlite.js';

// ────────────────────────────────────────────────────────────────────────────
// Provider interface
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} EmbeddingResult
 * @property {number[]} embedding - float vector
 * @property {number} dim - vector dimension
 * @property {string} model - model name used
 * @property {boolean} cached - whether this came from cache
 */

/**
 * Embed a batch of texts. Tries cache first, then calls the provider.
 *
 * @param {object} driver - SQLite driver (for cache reads/writes)
 * @param {object} config - from long-memory config.embedding.*
 * @param {string[]} texts - texts to embed
 * @returns {Promise<EmbeddingResult[]>}
 */
export async function embedBatch(driver, config, texts) {
  if (!config || config.provider === 'none' || !texts.length) {
    return texts.map(() => null);
  }

  const model = config.model || 'bge-m3'; // bge-m3 is the most common default for Ollama users
  const dim = config.dimension || 1024;
  const results = new Array(texts.length).fill(null);
  const toFetch = [];

  // 1. Check cache
  for (let i = 0; i < texts.length; i++) {
    const hash = sha256(texts[i]);
    const cached = driver.prepare(
      `SELECT embedding, dim, model FROM memory_embeddings WHERE content_sha256 = ? AND model = ? AND dim = ?`
    ).get(hash, model, dim);
    if (cached) {
      results[i] = {
        embedding: parseEmbedding(cached.embedding),
        dim: cached.dim,
        model: cached.model,
        cached: true
      };
    } else {
      toFetch.push({ index: i, hash, text: texts[i] });
    }
  }

  if (toFetch.length === 0) return results;

  // 2. Call provider
  let fetched;
  try {
    fetched = await callProvider(config, toFetch.map((f) => f.text), model, dim);
  } catch (e) {
    console.warn(`[long-memory] embedding failed (${config.provider}): ${e.message}`);
    return results; // return partial results
  }

  // 3. Store in cache
  for (let i = 0; i < fetched.length; i++) {
    const emb = fetched[i];
    if (!emb) continue;
    const fi = toFetch[i];
    const blob = serializeEmbedding(emb);
    driver.prepare(
      `INSERT OR REPLACE INTO memory_embeddings (content_sha256, model, dim, embedding, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(fi.hash, model, dim, blob, Date.now());
    results[fi.index] = { embedding: emb, dim: emb.length, model, cached: false };
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// Provider call
// ────────────────────────────────────────────────────────────────────────────

async function callProvider(config, texts, model, dim) {
  const batchSize = config.batch_size || config.batchSize || 16;
  const allResults = [];
  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const url = buildUrl(config, model);
    const body = buildBody(config, batch, model);
    const headers = buildHeaders(config);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout_ms || config.timeoutMs || 30000);

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!r.ok) throw new Error(`${config.provider} returned ${r.status}`);
      const data = await r.json();
      allResults.push(...parseResponse(config, data, dim));
    } finally {
      clearTimeout(timeout);
    }
  }
  return allResults;
}

function buildUrl(config, model) {
  if (config.provider === 'ollama') {
    const base = config.ollama?.base_url || config.ollama?.baseUrl || 'http://127.0.0.1:11434';
    return `${base}/v1/embeddings`;
  }
  // openai-compatible
  const base = config.openai_compatible?.base_url || config.openaiCompatible?.baseUrl || 'http://127.0.0.1:11434/v1/';
  return `${base}embeddings`;
}

function buildHeaders(config) {
  const h = { 'Content-Type': 'application/json' };
  if (config.provider === 'openai-compatible') {
    let key = config.openai_compatible?.api_key || config.openaiCompatible?.apiKey || '';
    // SecretRef: '$ENV_VAR_NAME' → resolve from env
    if (key.startsWith('$')) {
      key = process.env[key.slice(1)] || '';
    }
    if (key) h['Authorization'] = `Bearer ${key}`;
  }
  return h;
}

function buildBody(config, texts, model) {
  return { model, input: texts };
}

function parseResponse(config, data, dim) {
  return (data.data || []).map((e) => {
    const emb = e.embedding;
    if (!Array.isArray(emb)) return null;
    return emb.map(Number);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Serialization
// ────────────────────────────────────────────────────────────────────────────

function serializeEmbedding(vec) {
  // Store as Float32Array bytes in BLOB for compact storage
  const buf = new ArrayBuffer(vec.length * 4);
  const view = new Float32Array(buf);
  view.set(vec);
  return new Uint8Array(buf);
}

function parseEmbedding(blob) {
  if (!blob) return null;
  // node:sqlite returns BLOBs as objects with numeric keys
  if (typeof blob === 'object' && !Array.isArray(blob) && !(blob instanceof Uint8Array)) {
    const len = Object.keys(blob).length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = blob[i] ?? 0;
    return Array.from(new Float32Array(arr.buffer));
  }
  const buf = blob.buffer || blob;
  return Array.from(new Float32Array(buf));
}