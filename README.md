# @wwskills/dsh-long-memory

Long-term cross-session memory + self-evolving learning plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

SQLite-backed, FTS5 + optional embedding recall, append-only audit log, L7 auto-extraction, lesson capture from user corrections, rule lifecycle with context injection. Single-bundle dual-face packaging (Node service + browser UI).

## Features

### Memory & Recall

- **8 `mem_*` tools** — search, record, status, stats, forget, confirm, scope list, scope set
- **FTS5 full-text search** with CJK support (works out of the box, zero config)
- **Optional embedding** — Ollama (local, zero cost) or any OpenAI-compatible API
- **Hybrid recall** — BM25 + vector + RRF fusion when embedding is enabled, trust-weighted ranking
- **L7 auto-extraction** — automatically extracts memories from conversations on turn/end using your DSH LLM provider (zero extra config)
- **Keyword fallback** — if LLM is unavailable, regex-based keyword extraction kicks in
- **Confirm queue** — low-confidence L7 extractions go to confirm queue for user approval
- **Supersession** — overlapping L7 extractions auto-mark old memories as superseded
- **File tracks** — `MEMORY.md` session markers + `memory/YYYY-MM-DD.md` daily notes
- **Audit log** — append-only, tracks every memory operation

### Self-Evolving Learning (merged from dsh-agent-evolve)

- **Signal word detection** — real-time capture when user says "不对" / "wrong" / "should be" etc. (8 CN + 7 EN, configurable)
- **Tool error capture** — `tools/result` event listener auto-records tool failures as corrections
- **Agent error capture** — `agent/error` event listener auto-records harness-level errors
- **Lesson extraction** — LLM-powered structured lesson extraction from correction-triggering messages
- **Rule lifecycle** — proposed → approved → rejected → archived → promoted_to_agents
- **Rule injection** — approved rules auto-injected into agent context via `agent/pre-step` (≤800 token budget, hit_count tracking)
- **Rule conflict detection** — Jaccard overlap >60% warns on approve
- **AGENTS.md promotion** — high-hit-count rules can be promoted to AGENTS.md format
- **Daily decay** — stale rules (90 days unhit) auto-archived
- **Persona building** — auto-builds user persona from USER-type memories (tech stack, coding style, communication, common tasks)

### Browser UI

- **Sidebar + Main layout** — resizable sidebar (160-360px) with scope filter + search + stats
- **4 Tab management** — 教训 (Corrections) / 规则 (Rules) / 记忆 (Memories) / 画像 (Persona)
- **Recall test panel** — keyword-based memory recall testing with score/source display
- **Settings Modal** — extraction, persona, embedding, and signal word config in a modal dialog
- **Toast notifications** — success/error/warning feedback for all operations
- **PopoverMenu** — hover-revealed action menu (archive/delete) on memory cards
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
      confirm_threshold: 0.6      # memories below this confidence go to confirm queue
      interval_ms: 21600000       # 6h minimum between extractions
```

### Self-Evolving Learning

```yaml
- id: long-memory
  config:
    corrections:
      signal_words:               # trigger correction capture
        - '不对'
        - '错了'
        - '应该是'
      promote_threshold: 5        # minimum corrections before rule extraction
      rule_token_budget: 800      # max tokens for rule injection in context
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
| PUT | `/plugins/dsh-long-memory/api/memories/:id` | Archive a memory (status=archived) |
| DELETE | `/plugins/dsh-long-memory/api/memories` | Delete a memory |
| GET | `/plugins/dsh-long-memory/api/memories/stats` | Per-scope memory counts |
| GET | `/plugins/dsh-long-memory/api/confirm-queue` | Pending sensitive memories |
| POST | `/plugins/dsh-long-memory/api/confirm-queue` | Approve/reject |
| GET/POST | `/plugins/dsh-long-memory/api/config` | Get/save plugin config |
| GET | `/plugins/dsh-long-memory/api/corrections` | List corrections (status/trigger filter) |
| POST | `/plugins/dsh-long-memory/api/corrections/:id/extract` | Promote correction to rule |
| POST | `/plugins/dsh-long-memory/api/corrections/:id/ignore` | Ignore correction |
| GET | `/plugins/dsh-long-memory/api/rules` | List rules (status filter) |
| POST | `/plugins/dsh-long-memory/api/rules/:id/approve` | Approve rule |
| POST | `/plugins/dsh-long-memory/api/rules/:id/reject` | Reject rule |
| POST | `/plugins/dsh-long-memory/api/rules/:id/promote` | Promote to AGENTS.md |
| GET | `/plugins/dsh-long-memory/api/rules/:id/source` | View source corrections |
| PUT | `/plugins/dsh-long-memory/api/rules/:id` | Edit rule |
| GET | `/plugins/dsh-long-memory/api/stats` | Aggregate stats |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    long-memory plugin                            │
├──────────────┬──────────────┬───────────────────────────────────┤
│  Memory &    │  Self-Evolving│  Browser UI (Sidebar + Content)  │
│  Recall      │  Learning     │                                   │
│              │               │  ┌───────────┬─────────────────┐ │
│ • memories   │ • corrections │  │  Sidebar   │  4 Tab Panel   │ │
│ • FTS5       │ • rules       │  │  • scope   │  • 教训         │ │
│ • embedding  │ • signal words│  │  • search  │  • 规则         │ │
│ • L7 extract │ • tool errors │  │  • stats   │  • 记忆         │ │
│ • scope      │ • rule inject │  │            │  • 画像         │ │
│ • KG         │ • decay       │  │            │  • 召回测试     │ │
│ • 8 tools    │ • conflicts   │  │            │  • 设置 Modal   │ │
│ • audit log  │ • AGENTS.md   │  │            │  • Toast/Popover│ │
│ • persona    │               │  │            │                 │ │
└──────────────┴──────────────┴───────────────────────────────────┘
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