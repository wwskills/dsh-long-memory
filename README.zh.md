# @wwskills/dsh-long-memory

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的跨会话长期记忆插件。

SQLite 存储、FTS5 + 可选向量召回、append-only 审计日志、L7 自动记忆抽取。单包双面打包（Node 服务 + 浏览器 UI）。

## 功能

- **8 个 `mem_*` 工具** — 搜索、记录、状态、统计、删除、确认、scope 列表、scope 设置
- **FTS5 全文搜索**，支持中文（开箱即用，零配置）
- **可选 Embedding** — Ollama（本地，零成本）或任意 OpenAI 兼容 API
- **混合召回** — 启用 embedding 后自动融合 BM25 + 向量 + RRF
- **L7 自动抽取** — 在 turn/end 时自动从对话中提取记忆，复用 DSH 的 LLM 配置，无需额外设置
- **关键词降级** — LLM 不可用时自动切换到正则关键词提取
- **文件轨** — `MEMORY.md` 会话标记 + `memory/YYYY-MM-DD.md` 每日笔记
- **审计日志** — append-only，记录所有记忆操作
- **浏览器 UI** — 设置页 + 记忆管理 + 确认队列

## 安装

```sh
dsh plugin --profile web add @wwskills/dsh-long-memory
```

## 配置

默认值已可用，按需通过 profile patch 层覆盖。

### Embedding

| Provider | 适用场景 | 成本 |
|----------|----------|------|
| `none` | 纯 FTS5 关键词（默认） | 零 |
| `ollama` | 本地 Ollama 服务 | 零（本地） |
| `openai-compatible` | 任意 OpenAI 风格 API | 按调用计费 |

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

### L7 自动抽取

L7 自动读取 DSH 的 LLM 配置，无需额外填写 API Key。

```yaml
- id: long-memory
  config:
    l7:
      enabled: true               # 启用自动记忆抽取
      auto_extract: true          # LLM 抽取 + 关键词降级
      extractor_model: ''         # 空则用 DSH 配置中最便宜的模型
      extractor_temp: 0.2
      interval_ms: 21600000       # 两次抽取最小间隔 6h
```

### 存储

```yaml
    storage:
      path: '${DSH_HOME}/long-memory/long-memory.db'
      markdown_dir: '${DSH_HOME}/long-memory/markdown'
```

## 工具列表

| 工具 | 作用 |
|---|---|
| `mem_search` | FTS5 + 混合搜索记忆 |
| `mem_record` | 显式记录记忆；自动识别 scope |
| `mem_status` | 存储与召回状态 |
| `mem_stats` | 聚合统计 |
| `mem_forget` | 归档或删除；写审计日志 |
| `mem_confirm` | 审批/拒绝敏感记忆队列 |
| `mem_scope_list` | 列出所有 scope |
| `mem_scope_set_active` | 设置活跃 scope 过滤器 |

## 环境要求

- Node ≥ 22.5（使用内置 `node:sqlite`）
- DeepSeek Harness 0.1.0-rc.2+

## 许可证

MIT — 见 [LICENSE](./LICENSE)。
