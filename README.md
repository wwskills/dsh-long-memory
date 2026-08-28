# @wwskills/dsh-long-memory

Long-term cross-session memory + self-evolving learning plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

SQLite-backed, FTS5 + optional embedding recall, append-only audit log, L7 auto-extraction, lesson capture from user corrections, rule lifecycle with context injection. Single-bundle dual-face packaging (Node service + browser UI).

## Features

### Memory & Recall

- **8 `mem_*` tools** — search, record, status, stats, forget, confirm, scope list, scope set
- **FTS5 full-text search** with CJK support (works out of the box, zero config)
- **Optional embedding** — Ollama (local, zero cost) or any OpenAI-compatible API
- **Hybrid recall** — BM25 + vector + RRF fusion when embedding is enabled
- **L7 auto-extraction** — automatically extracts memories from conversations on turn/end using your DSH LLM provider (zero extra config)
- **Keyword fallback** — if LLM is unavailable, regex-based keyword extraction kicks in
- **File tracks** — `MEMORY.md` session markers + `memory/YYYY-MM-DD.md` daily notes
- **Audit log** — append-only, tracks every memory operation

### Self-Evolving Learning (merged from agent-evolve)

- **Signal word detection** — real-time capture when user says "不对" / "wrong" / "should be" etc. (8 CN + 7 EN, configurable)
- **Tool error capture** — `tools/result` event listener auto-records tool failures as corrections
- **Agent error capture** — `agent/error` event listener auto-records harness-level errors
- **Lesson extraction** — LLM-powered structured lesson extraction from correction-triggering messages
- **Rule lifecycle** — proposed → approved → rejected → archived → promoted_to_agents
- **Rule injection** — approved rules auto-injected into agent context via `agent/pre-step` (≤800 token budget, hit_count tracking)
- **Rule conflict detection** — Jaccard overlap >60% warns on approve
- **AGENTS.md promotion** — high-hit-count rules can be promoted to AGENTS.md format
- **Daily decay** — stale rules (90 days unhit) auto-archived

### Browser UI

- **4 Tab management panel** — 教训 (Corrections) / 规则 (Rules) / 记忆 (Memories) / 画像 (Persona)
- **Overview strip** — pending corrections, proposed rules, active memories at a glance
- **Config panel** — embedding, LLM model, signal words, extraction settings
- **30s auto-refresh** — stats and badges stay current

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

### Signal Words (Self-Evolving)

Signal words trigger real-time correction capture when users say things like "不对" or "wrong":

```yaml
- id: long-memory
  config:
    # Default signal words (8 CN + 7 EN) are built-in.
    # Override via WebUI Settings → Plugins → Long Memory.
    # Or set in patch:
    # signal_words:
    #   - '不对'
    #   - 'wrong'
    #   - ...
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

## Web API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/plugins/dsh-long-memory/api/memories` | List memories (scope/type/q filter) |
| DELETE | `/plugins/dsh-long-memory/api/memories` | Delete a memory |
| GET | `/plugins/dsh-long-memory/api/confirm-queue` | Pending sensitive memories |
| POST | `/plugins/dsh-long-memory/api/confirm-queue` | Approve/reject |
| GET/POST | `/plugins/dsh-long-memory/api/embedding-config` | Embedding settings |
| GET | `/plugins/dsh-long-memory/api/corrections` | List corrections (status/trigger filter) |
| POST | `/plugins/dsh-long-memory/api/corrections/:id/extract` | Promote correction to rule |
| POST | `/plugins/dsh-long-memory/api/corrections/:id/ignore` | Ignore correction |
| GET | `/plugins/dsh-long-memory/api/rules` | List rules (status filter) |
| POST | `/plugins/dsh-long-memory/api/rules/:id/approve` | Approve rule |
| POST | `/plugins/dsh-long-memory/api/rules/:id/reject` | Reject rule |
| POST | `/plugins/dsh-long-memory/api/rules/:id/promote` | Promote to AGENTS.md |
| GET | `/plugins/dsh-long-memory/api/rules/:id/source` | View source corrections |
| PUT | `/plugins/dsh-long-memory/api/rules/:id` | Edit rule |
| GET | `/plugins/dsh-long-memory/api/stats` | Monthly stats |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    long-memory plugin                       │
├──────────────┬──────────────┬──────────────────────────────┤
│  Memory &    │  Self-Evolving│  Browser UI                  │
│  Recall      │  Learning     │  (4 Tab Panel)               │
│              │               │                              │
│ • memories   │ • corrections │ • 教训 Tab (list/extract)   │
│ • FTS5       │ • rules       │ • 规则 Tab (approve/edit)   │
│ • embedding  │ • signal words│ • 记忆 Tab (search/filter)  │
│ • L7 extract │ • tool errors │ • 画像 Tab (persona)        │
│ • scope      │ • rule inject │ • Config panel              │
│ • KG         │ • decay       │ • 30s auto-refresh          │
│ • 8 tools    │ • conflicts   │                              │
│ • audit log  │ • AGENTS.md   │                              │
└──────────────┴──────────────┴──────────────────────────────┘
```

## Requirements

- Node ≥ 22.5 (uses built-in `node:sqlite`)
- DeepSeek Harness 0.1.0-rc.2+

## Migrations

| # | File | Description |
|---|------|-------------|
| 0001 | `0001_initial.sql` | Core tables: memories, embeddings, audit_log, confirm_queue, schema_meta |
| 0002 | `0002_l7_buffer.sql` | L7 message buffer table |
| 0003 | `0003_embedding_cache_key.sql` | Composite PK for embeddings |
| 0004 | `0004_corrections_rules.sql` | Corrections + rules + usage_stats (self-evolving) |

## License

MIT — see [LICENSE](./LICENSE).
