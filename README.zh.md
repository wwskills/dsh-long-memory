# @wwskills/dsh-long-memory

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的跨会话长期记忆插件。

SQLite 存储、FTS5 + 可选向量召回、append-only 审计日志、L7 自动记忆抽取、自进化学习（教训→规则闭环）。单包双面打包（Node 服务 + 浏览器 UI）。

## 功能

- **8 个 `mem_*` 工具** — 搜索、记录、状态、统计、删除、确认、scope 列表、scope 设置
- **FTS5 全文搜索**，支持中文（开箱即用，零配置）
- **可选 Embedding** — Ollama（本地，零成本）或任意 OpenAI 兼容 API
- **混合召回** — 启用 embedding 后自动融合 BM25 + 向量 + RRF，信任加权排序
- **L7 自动抽取** — 在 turn/end 时自动从对话中提取记忆，复用 DSH 的 LLM 配置，无需额外设置
- **关键词降级** — LLM 不可用时自动切换到正则关键词提取
- **自进化学习** — 信号词检测 → 教训捕获 → 规则提炼 → 规则注入 agent 上下文（来自 dsh-agent-evolve 合并）
- **确认队列** — 低置信度 L7 抽取进入确认队列，用户可审批或拒绝
- **记忆画像** — 从 USER 类型记忆自动构建用户画像（技术栈/编码风格/沟通偏好/常见任务）
- **文件轨** — `MEMORY.md` 会话标记 + `memory/YYYY-MM-DD.md` 每日笔记
- **审计日志** — append-only，记录所有记忆操作
- **浏览器 UI** — 侧栏 + 主内容布局，4 个 Tab（教训/规则/记忆/画像）+ 召回测试面板 + 设置 Modal

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
      confirm_threshold: 0.6      # 低于此置信度的记忆进入确认队列
      interval_ms: 21600000       # 两次抽取最小间隔 6h
```

### 自进化学习

信号词检测 + 规则提炼，自动从对话中学习。

```yaml
- id: long-memory
  config:
    corrections:
      signal_words:               # 触发纠正捕获的信号词
        - '不对'
        - '错了'
        - '应该是'
      promote_threshold: 5        # 规则提炼阈值（条）
      rule_token_budget: 800      # 规则注入上下文 token 上限
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

## WebUI

| 区域 | 功能 |
|------|------|
| **侧栏** | scope 筛选（全部/user/project/domain/episodic）、搜索、统计 |
| **教训 Tab** | 纠正记录列表，支持提炼为规则或忽略 |
| **规则 Tab** | 规则生命周期管理（审批/拒绝/编辑/晋升到 AGENTS.md） |
| **记忆 Tab** | 记忆管理（搜索/筛选/归档/删除），PopoverMenu 操作菜单 |
| **画像 Tab** | 自动构建的用户画像，支持手动编辑和重建 |
| **召回测试** | 输入关键词测试记忆召回效果 |
| **设置 Modal** | 抽取设置 + 画像与 Embedding + 信号词配置 |

## 环境要求

- Node ≥ 22.5（使用内置 `node:sqlite`）
- DeepSeek Harness 0.1.0-rc.2+

## 开发

宿主侧源码位于 `src/`（严格 TypeScript）；浏览器 bundle 目前为
`src/client.js`（预包装产物，后续改为 TSX 源码）。`lib/` 仅为构建产物。

```sh
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm test            # vitest + 遗留 node 脚本（迁移、工具 e2e）
pnpm run build       # esbuild 宿主/invariant bundle + 逐模块转换 + 客户端拷贝 + tsc 声明
pnpm run check       # 以上全部
```

构建会把 `src/*.ts` 逐模块同步到 `lib/*.js` 的扁平布局（`scripts/` 测试
脚本直接引用这些模块路径）。DSH / cordis 宿主包保持 external——运行时
由 DSH profile 的 node_modules 提供。

## 许可证

MIT — 见 [LICENSE](./LICENSE)。