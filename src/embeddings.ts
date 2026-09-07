// Embedding provider.
//
// Three providers:
//   'none'              — FTS5 keyword fallback only (zero cost, always works)
//   'ollama'            — local Ollama service (zero API cost, requires Ollama running)
//   'openai-compatible' — any OpenAI-style endpoint (SiliconFlow, OpenAI, etc.)
//
// All calls are cached per content SHA-256 in the `memory_embeddings` table,
// keyed by (content_sha256, model, dim) so identical content is never
// re-embedded and a model/dimension change produces a different cache key.

import { sha256 } from './sqlite.js'
import type { SqlDriver } from './sqlite.js'

/** One embedded text. */
export interface EmbeddingResult {
  embedding: number[]
  dim: number
  model: string
  cached: boolean
}

/** The embedding config shape from the plugin settings. */
export interface EmbeddingConfig {
  provider?: string
  model?: string
  dimension?: number
  batch_size?: number
  batchSize?: number
  timeout_ms?: number
  timeoutMs?: number
  ollama?: { base_url?: string, baseUrl?: string }
  openai_compatible?: { base_url?: string, baseUrl?: string, api_key?: string, apiKey?: string }
  openaiCompatible?: { base_url?: string, baseUrl?: string, api_key?: string, apiKey?: string }
}

/** One pending provider fetch. */
interface FetchItem {
  index: number
  hash: string
  text: string
}

/**
 * Embed a batch of texts. Tries cache first, then calls the provider.
 * Entries the provider could not satisfy stay null.
 */
export async function embedBatch(driver: SqlDriver, config: EmbeddingConfig | null | undefined, texts: readonly string[]): Promise<Array<EmbeddingResult | null>> {
  if (!config || config.provider === 'none' || texts.length === 0) {
    return texts.map(() => null)
  }

  const model = config.model || 'bge-m3' // most common default for Ollama users
  const dim = config.dimension || 1024
  const results: Array<EmbeddingResult | null> = new Array(texts.length).fill(null)
  const toFetch: FetchItem[] = []

  // 1. Check cache
  for (let i = 0; i < texts.length; i++) {
    const hash = sha256(texts[i])
    const cached = driver.prepare(
      `SELECT embedding, dim, model FROM memory_embeddings WHERE content_sha256 = ? AND model = ? AND dim = ?`,
    ).get(hash, model, dim)
    if (cached !== undefined) {
      results[i] = {
        embedding: parseEmbedding(cached.embedding) ?? [],
        dim: Number(cached.dim),
        model: String(cached.model),
        cached: true,
      }
    } else {
      toFetch.push({ index: i, hash, text: texts[i] })
    }
  }

  if (toFetch.length === 0) return results

  // 2. Call provider
  let fetched: Array<number[] | null>
  try {
    fetched = await callProvider(config, toFetch.map(f => f.text), model, dim)
  } catch (e) {
    console.warn(`[long-memory] embedding failed (${String(config.provider)}): ${e instanceof Error ? e.message : String(e)}`)
    return results // partial results (cached hits only)
  }

  // 3. Store in cache. The dim column records the ACTUAL vector length — a
  // configured dimension the provider does not honour must not be recorded as
  // if it did, or later dim-filtered lookups serve mismatched vectors.
  for (let i = 0; i < fetched.length; i++) {
    const emb = fetched[i]
    if (emb === null || emb.length === 0) continue
    const fi = toFetch[i]
    const blob = serializeEmbedding(emb)
    driver.prepare(
      `INSERT OR REPLACE INTO memory_embeddings (content_sha256, model, dim, embedding, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(fi.hash, model, emb.length, blob, Date.now())
    results[fi.index] = { embedding: emb, dim: emb.length, model, cached: false }
  }

  return results
}

// ────────────────────────────────────────────────────────────────────────────
// Provider call
// ────────────────────────────────────────────────────────────────────────────

async function callProvider(config: EmbeddingConfig, texts: readonly string[], model: string, dim: number): Promise<Array<number[] | null>> {
  const batchSize = config.batch_size || config.batchSize || 16
  const allResults: Array<number[] | null> = []
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const url = buildUrl(config)
    const body = { model, input: batch }
    const headers = buildHeaders(config)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeout_ms || config.timeoutMs || 30000)

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!r.ok) throw new Error(`${String(config.provider)} returned ${r.status}`)
      const data = await r.json() as { data?: Array<{ embedding?: unknown }> }
      allResults.push(...parseResponse(data, dim))
    } finally {
      clearTimeout(timeout)
    }
  }
  return allResults
}

function buildUrl(config: EmbeddingConfig): string {
  if (config.provider === 'ollama') {
    const raw = config.ollama?.base_url || config.ollama?.baseUrl || 'http://127.0.0.1:11434'
    // Accept bases with or without a trailing /v1 — normalising avoids both
    // a double slash and a duplicated /v1/v1 prefix.
    const base = raw.replace(/\/+$/, '').replace(/\/v1$/, '')
    return `${base}/v1/embeddings`
  }
  // openai-compatible
  const raw = config.openai_compatible?.base_url || config.openaiCompatible?.baseUrl || 'http://127.0.0.1:11434/v1'
  const base = raw.replace(/\/+$/, '')
  return `${base}/embeddings`
}

function buildHeaders(config: EmbeddingConfig): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.provider === 'openai-compatible') {
    let key = config.openai_compatible?.api_key || config.openaiCompatible?.apiKey || ''
    // SecretRef: '$ENV_VAR_NAME' → resolve from env
    if (key.startsWith('$')) {
      key = process.env[key.slice(1)] || ''
    }
    if (key !== '') h['Authorization'] = `Bearer ${key}`
  }
  return h
}

function parseResponse(data: { data?: Array<{ embedding?: unknown }> }, dim: number): Array<number[] | null> {
  return (data.data || []).map(e => {
    const emb = e.embedding
    if (!Array.isArray(emb) || emb.length === 0) return null
    const vec = emb.map(Number)
    // Reject vectors that do not honour the configured dimension — accepting
    // them would poison the dim-keyed cache.
    if (dim > 0 && vec.length !== dim) return null
    if (vec.some(v => !Number.isFinite(v))) return null
    return vec
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Serialization
// ────────────────────────────────────────────────────────────────────────────

function serializeEmbedding(vec: readonly number[]): Uint8Array {
  // Store as Float32 bytes in a BLOB for compact storage.
  const buf = new ArrayBuffer(vec.length * 4)
  const view = new Float32Array(buf)
  view.set(vec)
  return new Uint8Array(buf)
}

/** Decode a cached embedding BLOB as a float vector; null when unusable. */
export function parseEmbedding(blob: unknown): number[] | null {
  if (blob === null || blob === undefined) return null
  // node:sqlite returns BLOBs as objects with numeric keys
  if (typeof blob === 'object' && !Array.isArray(blob) && !(blob instanceof Uint8Array)) {
    const len = Object.keys(blob as Record<number, unknown>).length
    const arr = new Uint8Array(len)
    for (let i = 0; i < len; i++) arr[i] = (blob as Record<number, number>)[i] ?? 0
    if (len % 4 !== 0) return null
    return Array.from(new Float32Array(arr.buffer))
  }
  // Uint8Array path: a view may sit at an offset inside a larger buffer, so
  // copy it out (offset 0, exact length). A length that is not a multiple of
  // 4 is corrupt — skip it.
  const bytes = new Uint8Array(blob as Uint8Array | number[])
  const byteLength = bytes.byteLength ?? bytes.length
  if (byteLength === 0 || byteLength % 4 !== 0) return null
  return Array.from(new Float32Array(bytes.buffer, 0, byteLength / 4))
}
