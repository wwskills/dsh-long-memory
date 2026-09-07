# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

## [Unreleased] — 2026-09-07

### Fixed — P1 Quality Improvements

- **Sidebar resize throttle**: added `requestAnimationFrame` throttle to mousemove handler
- **Empty `.catch()` blocks**: 10 silent error swallowers replaced with `showToast` error notifications
- **Hardcoded colors**: 19 inline hex colors replaced with DSH CSS variables
- **Missing loading states**: added `scopeCountsLoading` indicator for sidebar stats
- **Recall test UX**: added `recallError`/`recallNoResults` empty/error state display

### Improved — P2 Polish

- **JSDoc comments**: 31 JSDoc annotations on core components (Toast, PopoverMenu, Modal, MemoryCard, Sidebar)
- **i18n robustness**: added `safeT()` fallback wrapper for missing translation keys
- **CSS transitions**: 16 transition effects on sidebar, modal, toast, hover, and popover interactions

---

## [Unreleased] — 2026-09-04

### Added — WebUI Layout Restructuring (M0+M1+M2)

- **Sidebar + Main content layout**: resizable sidebar (160-360px) with scope filter (all/user/project/domain/episodic), search input, and statistics
- **Toast notification system**: top-right overlay, auto-dismiss 3s, supports success/error/warning
- **PopoverMenu component**: hover-reveal "⋯" button on memory cards, click to open archive/delete menu
- **Modal component**: reusable dialog with Esc/backdrop-close, used for settings
- **Recall test panel**: 5th tab for keyword-based memory recall testing with score/source/content display
- **Settings Modal**: config panel moved from inline collapse to modal dialog with save/cancel buttons
- **Sidebar search**: Enter-triggered FTS5 search, switches to memories tab
- **Scope counts**: per-scope memory counts fetched from `/api/memories/stats`

### Changed

- `lib/client.js`: 2769 → 3224 lines (+455), main layout restructured to `display: flex` sidebar + content
- `MemoryCard`: hover state + PopoverMenu replaces inline action buttons
- `MemoriesTab`: added `doArchive` function (PUT `/api/memories/:id`), `scopeFilter`/`searchQuery` props
- `LongMemorySettingsTab`: settings panel moved to Modal, sidebar state + resize logic added
- i18n: 26 new zh/en key pairs for sidebar, recall, settings modal, toast

### Fixed

- P0: Sidebar state was orphan code — JSX now renders the sidebar UI
- P0: `handleSidebarSearch` was a no-op — now reads `e.target.value`, calls `setSearchQuery`, switches to memories tab
- P0: `personaFreqSessions`/`personaFreqDays` i18n keys had missing `{n}` parameter — now passes actual values

### Removed

- Inline config panel (replaced by Settings Modal)

## [0.2.0] — 2026-08-28

### Added — Self-evolving learning (merged from dsh-agent-evolve)

- Signal word detection: real-time correction capture on user messages containing signal words (8 CN + 7 EN, configurable)
- Tool error capture: tools/result event listener auto-records tool failures as corrections
- Agent error capture: agent/error event listener auto-records harness-level errors
- Lesson extraction: LLM-powered structured lesson extraction from correction-triggering messages
- Rule lifecycle: proposed to approved to rejected to archived to promoted_to_agents state machine
- Rule injection: approved rules auto-injected into agent context via agent/pre-step (800 token budget, hit_count tracking)
- Rule conflict detection: Jaccard overlap >60% warns on approve
- AGENTS.md promotion: high-hit-count rules can be promoted to AGENTS.md format
- Daily rules decay: stale rules (90 days unhit) auto-archived
- Persona building: auto-builds user persona from USER-type memories (tech stack, coding style, communication, common tasks)
- 6 new Web API routes: corrections (list/extract/ignore), rules (list/approve/reject/promote/source/edit), stats
- 4 Tab WebUI: Corrections / Rules / Memories / Persona (replaces previous stub)
- Migration 0004: corrections + rules + usage_stats tables

### Changed

- lib/client.js: replaced 458-line stub with 2769-line complete 4 Tab management UI
- lib/index.js: added tools/result + agent/error listeners, rule injection in agent/pre-step, signal word detection in session/event, 6 API routes, daily rules decay timer

### Removed

- dsh-agent-evolve as standalone plugin (merged into long-memory)


## [0.2.0-beta] - 2026-08-26

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