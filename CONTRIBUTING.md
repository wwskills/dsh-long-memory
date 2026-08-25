# Contributing to dsh-long-memory

Thanks for your interest in contributing! This plugin extends [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) with cross-session long-term memory.

## Development Setup

```sh
git clone https://github.com/wwskills/dsh-long-memory.git
cd dsh-long-memory
```

Requirements:
- Node.js ≥ 22.5 (uses built-in `node:sqlite`)
- DeepSeek Harness 0.1.0-rc.2+

## Running Tests

```sh
# Migration tests (schema, FTS5, audit_log triggers)
npm test

# Or run individually
node scripts/test-migration.js
node scripts/test-tools-e2e.js
```

All tests must pass before submitting a PR.

## Code Style

- ESM modules (`import`/`export`, no `require`)
- Snake_case for config keys (matches DSH/Cordis conventions)
- Every memory write must go through `writeMemory()` in `lib/write.js`
- All errors in recall/embedding/L7 paths must be caught and degrade gracefully (never block the agent)
- No hardcoded credentials, paths, or provider-specific values

## Project Structure

```
lib/
  index.js        — plugin entry: Cordis apply + 8 tools + Web API
  write.js         — unified write path (INSERT + FTS5 + KG + embedding + audit)
  recall.js        — FTS5 + hybrid vector recall
  embeddings.js    — embedding providers (none/ollama/openai-compatible)
  l7.js            — L7 auto-extraction (LLM + keyword fallback)
  sqlite.js        — SQLite driver + migration runner
  schema.js        — tool parameter/output schemas
  kg.js            — KG edges + PageRank
  scopes.js        — scope management
  file-tracks.js   — markdown file tracks (MEMORY.md + daily notes)
  audit.js         — append-only audit log
  fts5-sync.js     — FTS5 index sync
  cjk.js           — CJK unigram tokenizer
  settings-schema.js — settings field descriptors
  client.js        — browser-side UI
  invariant.js     — standalone invariant tests
migrations/
  0001_initial.sql
  0002_l7_buffer.sql
  0003_embedding_cache_key.sql
```

## Submitting Changes

1. Fork the repo and create a feature branch
2. Write tests for new functionality
3. Ensure `npm test` passes
4. Submit a PR with a clear description of what changed and why

## Releasing

Releases are managed by the maintainer. Versioning follows [SemVer](https://semver.org/).

## License

MIT — see [LICENSE](./LICENSE).
