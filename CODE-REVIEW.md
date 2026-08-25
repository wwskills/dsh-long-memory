# @wwskills/dsh-long-memory 代码评审报告

> 评审对象：`/root/dsh/dsh-long-memory/`（v0.1.0）
> 评审日期：2026-08-24
> 评审范围：15 个 `lib/` 模块、2 个迁移、8 个测试脚本、README、`cordis.patch.yml`、设计文档
> 评审维度：合理性 / Bug / 冗余 / 可行性 / 可开源 / 可长期维护

---

## 0. 总体结论（TL;DR）

这是一份**架构思路成熟、工程化意识良好、但完成度约 60–70%** 的插件。

- **架构合理**：七层记忆栈定位清晰，「写路径即安全边界」+「失败永不阻塞回复」两条原则贯彻得好，双存储（文件轨 + SQLite）符合"无隐藏状态"的哲学。
- **模块划分干净**：15 个 lib 模块职责单一，迁移 runner、审计日志、FTS5 应用层同步都是正确的工程选择。
- **但存在若干真实 bug**（见 §2），其中 **`mem_confirm` approve 后不写 FTS5 索引**、**写路径完全缺失 embedding**、**FTS5 应用层同步的脆弱性** 是三个最需要修的。
- **文档与代码已经明显漂移**（§5），对开源和长期维护都是隐患。
- **结论**：可以继续用、可以作为内部工具落地，但**在修复 §2 的关键 bug 并统一配置来源之前，不建议正式开源**。

---

## 1. 架构与实现概览

### 1.1 分层定位

```
L5 语义长期  ← 本插件主体（用户偏好/项目约定/API 坑点）
L6 情节归档  ← 复用 DSH Session JSONL
L7 整合层    ← 本插件 l7.js（后台从会话提炼 → 写 L5）
```

定位精准，没有越界去碰 L0–L4（这些是 DSH 已有的能力），符合"补 DSH 缺的层"这一初衷。

### 1.2 模块地图

| 模块 | 职责 | 评价 |
|------|------|------|
| `sqlite.js` | node:sqlite 封装 + 迁移 runner | ✅ 规范：append-only、事务化、fail-loud |
| `schema.js` | 工具参数/输出 schema + 枚举 | ✅ 集中管理枚举，避免魔法字符串 |
| `fts5-sync.js` + `cjk.js` | FTS5 应用层同步 + CJK unigram | ✅ 正确（SQLite trigger 无法调外部 tokenizer） |
| `recall.js` | FTS5 / vector / PageRank 三路召回 | ⚠️ 向量路径有正确性隐患（§2.4） |
| `kg.js` | KG 边 + PageRank + 社区 | ⚠️ 社区检测是死代码（§3） |
| `embeddings.js` | embedding provider 抽象 | ⚠️ 缓存 key 设计有缺陷（§2.4） |
| `l7.js` | 会话→记忆抽取 | ⚠️ 节流语义错误（§2.7） |
| `index.js` | Cordis apply + 8 工具 + settings + hook | ⚠️ 单文件 1400 行，偏重 |
| `client.js` | 浏览器设置页 | ✅ 已从"stub"变成完整 UI，但文档没跟上 |
| `audit.js` / `invariant.js` | 审计 + 不变量 | ✅ 审计好；invariant 是占位符 |

---

## 2. Bug 分析（按严重度排序）

### 🔴 P0 — 会直接破坏数据或功能

**2.1 `mem_confirm` approve 后不写 FTS5 索引**
- 位置：`lib/index.js` `memConfirm`（approve 分支）+ Web API `/api/confirm-queue` approve 分支
- 现象：approve 时 `INSERT INTO memories` 后**没有调用 `ftsInsert()`**，也没有 `createEdges()`。结果是：被批准的记忆进了 `memories` 表，但**永远无法被 FTS5 关键词搜索到**，也没有 KG 边。
- 对比：`mem_record`、L7 抽取、markdown ingest 都正确调用了 `ftsInsert`，唯独 confirm 路径漏了。
- 测试盲区：`test-tools-e2e.js` 的 `confirmQueue()` 同样没写 FTS5，所以测试也发现不了。

**2.2 写路径完全缺失 embedding（向量召回对新增数据空转）**
- 位置：全代码 `embedBatch()` 只在 `mem_search` 查询 query 时调用（`index.js:588`），`mem_record`/`mem_confirm`/L7 写记忆时**从不 embedding**。
- 后果：只有开发期（8/19）缓存的那批 embedding 有效；此后每条新记忆都没有向量，向量召回对新数据形同虚设，只剩 FTS5 一条腿。
- 这直接击穿了 README 声称的"FTS5 + 向量召回"卖点。

**2.3 FTS5 应用层同步的脆弱性（本次评审实锤触发）**
- 因为 FTS5 同步靠应用代码（无 trigger），**任何绕过 `ftsInsert`/`ftsDelete` 的直接 SQL 写/删都会让索引与 `memories` 表脱节**，进而触发 `fts5: missing row N from content table` / `database disk image is malformed`，导致整个 CJK 关键词搜索失败。
- 本次评审期间我（为绕过 mem_record 报错）用 raw `sqlite3` 删了重复记录，就直接踩中此雷；最后靠 `unigramize` 全量重建才恢复。
- 根因是**缺少一个统一的 `writeMemory()` 写入口**，散落各处的 INSERT/DELETE 都要人工记得同步 FTS5。

### 🟠 P1 — 正确性隐患 / 逻辑错误

**2.4 向量缓存 key 只有 `content_sha256`，换模型后旧向量不失效**
- 位置：`memory_embeddings` 主键是 `content_sha256`，`embeddings.js` 注释声称"新模型/维度产生不同 cache key"，但实现里 key 只有 sha256，**与注释矛盾**。
- 后果：一旦切换 embedding 模型（如 bge-m3 → 别的维度），旧记忆向量与新 query 向量维度/语义错配，`cosineSimilarity` 返回 0 或乱序，且不会被重嵌。

**2.5 `checkEmbeddingAvailable` 硬编码模型名**
- 位置：`embeddings.js:104,107`，URL 用 `bge-m3`、body 用 `nomic-embed-text`，两者不一致。虽只是可达性探测，但结果不可信。

**2.6 `mem_scope_list` 的 `active` 字段恒为 `true`**
- 位置：`scopes.js:68`，硬编码 `active: true`，没有读 `mem_scope_set_active` 维护的 `svc._activeScope`。列表无法真实反映哪个 scope 是激活的。

**2.7 L7 节流语义错误（全局单次 vs 每 session）**
- 位置：`l7.js` `scheduleExtraction`，用**全局** `l7_last_run` + `interval_ms=6h` 做节流。
- 后果：6 小时内只有**第一个** `session/end-seed` 触发抽取，其余 session 直接 return 且 buffer 永不清空；而抽取又是**按 sessionId 只处理当前 session**，所以其它 session 的消息会永久积压在 `l7_buffer`。
- 正确语义应是「每 session 至少间隔 X」，而不是「全局 6h 只抽一次」。

**2.8 `mem_scope_set_active` 会粗暴归档整个旧 scope**
- 位置：`index.js` `memScopeSetActive`，`archiveScope(previous)` 会归档旧 scope 下**所有** active 记忆，默认 previous='project' 意味着一次切换就把全部 project 记忆归档，语义过重。

### 🟡 P2 — 轻微 / 一致性

**2.9 `schema_meta` 的 `version` 与 `migrations_applied` 语义重叠且会漂移**
- 0001 设 `version=1`；0002 只更新 `migrations_applied=2`，`version` 仍是 1。两个字段并存但不同步，未来会让人困惑。

**2.10 `mem_status` 的 `embedding_available` 读的是 composition 配置而非实际生效配置**
- 位置：`state.embeddingAvailable` 读 `cfg.embedding.provider`（patch.yml 里的 'none'），而实际生效的是 `config.json` 里的 'ollama'。导致 `mem_status` 报 `embedding_available: false`，与真实行为矛盾。

---

## 3. 冗余 / 死代码分析

| 项 | 位置 | 说明 |
|----|------|------|
| `simpleHash`（djb2） | `recall.js:317` | **从未被调用**，实际用的是 `sha256`；`file-tracks.js` 里还有一份 |
| `parseEmbedding` 重复 | `recall.js:323` + `embeddings.js:198` | 两份几乎相同的实现，逻辑略有出入，应收敛到一处 |
| 配置 schema 双份 | `settings-schema.js`（18 字段 camelCase）vs `index.js` `ServiceConfig`（snake_case） | 同一份配置描述了两遍，且命名风格不一致，是配置双源在代码层的表现 |
| `communities` 表 + `refreshCommunities` | `kg.js:207` | **没有任何调用点**，社区检测是纯 stub，`communities` 表始终为空 |
| `invariant.js` | 39 行 | 占位符，与 `test-migration.js` 的断言重复 |
| `checkEmbeddingAvailable` | `embeddings.js:99` | 定义后**从未被调用** |
| migration `0002_l7_buffer` 的 `turn_count` 列 | `0002_l7_buffer.sql` | 每条消息插入后都 `UPDATE` 全 session 计数，设计冗余且低效 |
| README 工具表 | `README.md:100` | 只列 6 工具，实际注册了 8 个（漏了 2 个 scope 工具） |

---

## 4. 可行性评估

**技术上可行，且已实际跑通**：
- node:sqlite（Node ≥ 22.5）稳定；FTS5 成熟；Ollama + bge-m3 可达，向量召回可用。
- 8 个工具已注册（启动日志 `registered 8/8 tools`），迁移测试、e2e SQL 测试全部通过。
- DB 可被独立 `sqlite3` CLI 打开（标准 SQLite），满足"无隐藏状态"。

**"可行但没做完"的部分**：
- 写路径 embedding 缺失（§2.2）让"向量召回"名不副实，实际只有 FTS5 对新增数据有效。
- L7 仍未迁到 `ctx.jobs` 后台任务（还是 `session/end-seed` + `setImmediate`）。
- `scopes.js` 里有 `detectGitBranch`，但 `index.js` 的 `autoDetectScope` **没调用它**，project 分支感知实际没接上。

---

## 5. 可开源评估

### ✅ 具备的条件
- MIT license；README 中英双版；872 行设计文档。
- 代码注释充分，几乎每个模块都有 header 说明设计意图。
- 无硬编码密钥（api_key 支持 `$ENV_VAR` SecretRef）；默认本地 SQLite，隐私友好。

### ❌ 开源前的拦路项
1. **文档与代码严重漂移**：`DSH-LONG-MEMORY.md` 声称 `client.js` 是"252 行 stub、加载但不渲染"，实际已是 285 行**完整设置页 UI**（含 embedding 配置、确认队列、统计卡）；声称"profile bundles 缺该条目"，实际已加；声称"L7 默认禁用"，实际 `enabled: true`；声称"M5 已移除"，实际 `scopes.js` 仍有 git 检测。开源用户会被直接误导。
2. **P0 bug 未修**（§2.1–2.3），尤其 confirm 不写 FTS5 和写路径无 embedding。
3. **测试不是真 e2e**：`test-tools-e2e.js` 不 boot Cordis/dsh-tools，只是**手动镜像 SQL 逻辑**，无法证明工具真能注册/调用，也无法覆盖 schema 校验、apply 装配。
4. **无 CI 配置**（无 `.github/workflows`）；`npm publish` 未做。
5. **`config.json` 运行时覆盖机制是"脏"的**：不是标准 DSH 配置方式，`$DSH_HOME/long-memory/config.json` 这种"运行时副作用文件"会随部署丢失，开源用户难以理解。
6. **peerDependencies 锁定 `^0.1.0-rc.6`**：依赖 DSH 的 rc 版本，说明上游 API 尚未冻结，开源后要承受 API 变动。

---

## 6. 可长期维护评估

### ✅ 优势
- 模块单一职责、迁移 runner 规范、枚举集中、审计机制完善。
- "失败永不阻塞回复"降级策略降低了长期运行的脆弱性。

### ⚠️ 风险
1. **配置双份 schema 会持续漂移**（`settings-schema.js` vs `ServiceConfig`），已经是 camelCase/snake_case 不一致，长期要同步两处。
2. **文档是手写静态快照**（`DSH-LONG-MEMORY.md` 517 行），已经过时，且无生成/校验机制。
3. **FTS5 应用层同步是持续脆弱点**：未来每加一个写路径都要记得同步 FTS5，否则重演"missing row"事故。缺一个统一 `writeMemory()` 封装。
4. **里程碑 TODO 散落全库**（"M2+ 会…""M3 将…"），这些注释会随时间腐烂，误导后来者。
5. **测试覆盖有缺口**：无 embedding 路径测试、无 confirm→FTS5 同步测试、无 Cordis 集成测试。
6. **bus factor = 1**：单作者 + 个人 scope（`@wwskills`）。

---

## 7. 分级问题清单（汇总）

### 必修（修复后才可对外）
1. `mem_confirm` approve 补 `ftsInsert` + `createEdges`（§2.1）
2. 补写路径 embedding（`mem_record` 落库后异步 embed content）（§2.2）
3. 提供统一写入口消除 FTS5 脱节风险（§2.3）
4. 收敛配置来源（删 `config.json` 覆盖，统一进 `cordis.patch.yml` / settings namespace）（§2.10、§5.5）

### 应修（正确性）
5. 向量缓存 key 加入 model+dim（§2.4）
6. L7 节流改成"每 session"语义（§2.7）
7. `mem_scope_list` 的 active 字段真实化（§2.6）
8. 修复 `checkEmbeddingAvailable` 模型名不一致（§2.5）

### 建议（质量）
9. 清理死代码：`simpleHash`、`parseEmbedding` 重复、`refreshCommunities`、`invariant.js`、`checkEmbeddingAvailable`（§3）
10. 统一配置 schema 为单一来源（§3、§6.1）
11. 更新 README 工具表（8 工具）+ 刷新 `DSH-LONG-MEMORY.md` 或改为生成式文档（§5.1）
12. 补 CI + 真正的 Cordis 集成测试（§5.3）

---

## 附：评审期间实际观测记录

- `mem_search` 曾出现 output schema 漂移（返回字段超出声明、`session_id`/`lang` 为 null），重启后消失，属工具层 schema 与真实数据不同步的历史遗留。
- 本次评审发现的 FTS5 "missing row 11" 事故，根因是评审者用 raw SQLite 绕过工具删记录所致，**恰好暴露了 §2.3 的架构脆弱点**，而非插件固有 bug——但这正是需要在设计层面补统一写入口的理由。
