# @wwskills/dsh-long-memory

Long-term cross-session memory plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

SQLite-backed, FTS5 + optional embedding recall, append-only audit log, L7 auto-extraction. Single-bundle dual-face packaging (Node service + browser UI).

## Features

- **8 `mem_*` tools** — search, record, status, stats, forget, confirm, scope list, scope set
- **FTS5 full-text search** with CJK support (works out of the box, zero config)
- **Optional embedding** — Ollama (local, zero cost) or any OpenAI-compatible API
- **Hybrid recall** — BM25 + vector + RRF fusion when embedding is enabled
- **L7 auto-extraction** — automatically extracts memories from conversations on turn/end using your DSH LLM provider (zero extra config)
- **Keyword fallback** — if LLM is unavailable, regex-based keyword extraction kicks in
- **File tracks** — `MEMORY.md` session markers + `memory/YYYY-MM-DD.md` daily notes
- **Audit log** — append-only, tracks every memory operation
- **Browser UI** — settings tab + memory manager + confirm queue

## Install

```sh
dsh plugin --profile web add @wwskills/dsh-long-memory
```

## Configuration

Defaults are sensible. Override via your profile's patch layer as needed.

### Embedding

| Provider | Use case | Cost |
|----------|----------|------|
| `none` | FTS5 keyword only (default) | Zero |
| `ollama` | Local Ollama service | Zero (local) |
| `openai-compatible` | Any OpenAI-style API | Per-call |

```yaml
- id: long-memory
  config:
    embedding:
      provider: 'ollama'          # 'none' | 'ollama' | 'openai-compatible'
      model: 'bge-m3'
      dimension: 1024
      ollama:
        base_url: 'http://127.0.0.1:11434'
```

### L7 Auto-extraction

L7 reads your DSH LLM provider config automatically — no extra API key needed.

```yaml
- id: long-memory
  config:
    l7:
      enabled: true               # enable auto memory extraction
      auto_extract: true          # LLM-based + keyword fallback
      extractor_model: ''         # empty = use cheapest model from your DSH config
      extractor_temp: 0.2
      interval_ms: 21600000       # 6h minimum between extractions
```

### Storage

```yaml
    storage:
      path: '${DSH_HOME}/long-memory/long-memory.db'
      markdown_dir: '${DSH_HOME}/long-memory/markdown'
```

## Tools

| Tool | Purpose |
|---|---|
| `mem_search` | FTS5 + hybrid search across memories |
| `mem_record` | Persist a memory; auto-detects scope |
| `mem_status` | Storage + recall state |
| `mem_stats` | Aggregate statistics |
| `mem_forget` | Archive or delete; writes audit log |
| `mem_confirm` | Approve/reject queued sensitive memory |
| `mem_scope_list` | List all scopes |
| `mem_scope_set_active` | Set active scope filter |

## Requirements

- Node ≥ 22.5 (uses built-in `node:sqlite`)
- DeepSeek Harness 0.1.0-rc.2+

## License

MIT — see [LICENSE](./LICENSE).
