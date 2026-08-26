# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-26

### Added

- **Trust-weighted recall ranking**: BM25 scores now blended with `confidence` and `origin` weights so that high-confidence user records outrank low-confidence L7 auto-extractions. Formula: `score = bm25Norm * 0.6 + confidence * 0.3 + originWeight * 0.1`.
- **L7 confirm queue**: L7 auto-extracted memories with confidence below `l7.confirm_threshold` (default 0.6) now go to the confirm queue instead of being silently inserted as active memories. Users can approve or reject them via `mem_confirm`.
- **L7 supersession**: When L7 extracts a memory that semantically overlaps with an existing same-type/scope memory (content prefix match), the old memory is marked `superseded` instead of keeping both active.
- **Vector search pre-filtering**: `computeVectorSimilarity` now accepts scope/status filters to narrow the scan range before cosine computation, eliminating the silent LIMIT 500 exclusion.
- New setting: `l7.confirmThreshold` (default 0.6, configurable via Settings UI).

### Changed

- `recallFts5` results now sorted by trust-weighted score instead of raw BM25.
- `recallHybrid` vector-only path also applies trust weighting.
- `computeVectorSimilarity` signature extended with optional `filter` parameter.
- `extractAndPersist` return value now includes `queued` and `superseded` counts.

### Fixed

- Prevents L7 noise accumulation: low-confidence auto-extractions no longer pollute the active recall pool.
- Prevents stale fact retention: superseded old memories are excluded from default search.

## [0.1.0] - 2026-08-25

### Added

- SQLite + FTS5 schema with CJK unigram support (migration 0001 + 0002)
- 8 `mem_*` tools: search, record, status, stats, forget, confirm, scope_list, scope_set_active
- Three embedding providers: `none` (FTS5 only), `ollama` (local), `openai-compatible` (cloud API)
- Hybrid recall: BM25 + vector + RRF fusion when embedding is enabled
- L7 auto-extraction: automatically extracts memories from conversations on turn/end
  - LLM-based extraction via DSH provider config (zero extra configuration)
  - Keyword heuristic fallback when LLM is unavailable
- File tracks: `MEMORY.md` session markers + `memory/YYYY-MM-DD.md` daily notes
- Append-only audit log with trigger protection
- Browser UI: settings tab + memory manager + confirm queue
- Unified `writeMemory()` / `deleteMemory()` for all write paths (FTS5 + KG + embedding + audit)
- Per-session L7 throttle (each session extracted independently)

### Changed

- N/A (initial release)

### Deprecated

- N/A (initial release)

### Removed

- N/A (initial release)

### Security

- API keys support `$ENV_VAR_NAME` SecretRef pattern
- Sensitive content detection (api_key/secret/password) routes to confirm queue
- No hardcoded credentials, paths, or provider-specific values

## [Unreleased]

### Fixed

- Embedding cache key now uses composite `(content_sha256, model, dim)` instead of `content_sha256` alone (migration 0003). Switching embedding models no longer silently reuses stale vectors.
