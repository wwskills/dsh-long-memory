# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
