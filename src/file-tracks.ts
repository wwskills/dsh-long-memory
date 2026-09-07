// File tracks: two markdown tracks, both human-editable, both kept in sync
// with the memories table.
//
//   $DSH_HOME/long-memory/MEMORY.md
//     Long-form ledger, "always injected" at session start.
//     One section per active session; user can edit freely.
//
//   $DSH_HOME/long-memory/memory/YYYY-MM-DD.md
//     Daily episodic notes. Append-only, one line per user message
//     (head + length). Not injected automatically — recalled via FTS5.
//
// Reverse sync (markdown → DB): on startup (and via a debounced fs watcher),
// scan memory/YYYY-MM-DD.md files for new content and parse it into memories
// with origin='user-edited'.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { join, basename } from 'node:path'
import { nowMs } from './sqlite.js'
import type { SqlDriver } from './sqlite.js'
import { writeMemory } from './write.js'
import type { EmbeddingConfig } from './embeddings.js'

/** Handle for the file watcher. */
export interface WatcherHandle {
  close(): void
}

/** One parsed daily-note line. */
interface ParsedDailyLine {
  ts: string
  sessionId: string
  head: string
  sha: string
  timestampMs: number
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** ISO date string in the user's local timezone (YYYY-MM-DD). */
function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Extract the head line of a user message (first non-empty line, max 80
 * chars). The full content lives in the FTS5 index; the daily note is just
 * a pointer.
 */
function headLine(text: string): string {
  if (typeof text !== 'string') return ''
  const lines = text.split(/\r?\n/)
  for (const ln of lines) {
    const t = ln.trim()
    if (t.length > 0) return t.length > 80 ? t.slice(0, 79) + '…' : t
  }
  return ''
}

// ────────────────────────────────────────────────────────────────────────────
// File-track writer (DB → markdown)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Append a one-line marker to MEMORY.md identifying a freshly-started
 * session. Idempotent per session.
 */
export function appendSessionStart(markdownDir: string, sessionId: string): void {
  mkdirSync(markdownDir, { recursive: true })
  const path = join(markdownDir, 'MEMORY.md')
  const now = new Date().toISOString()
  const marker = `<!-- session started: ${sessionId} @ ${now} -->`

  let current = ''
  if (existsSync(path)) {
    current = readFileSync(path, 'utf8')
    if (current.includes(`session started: ${sessionId}`)) return // already noted
  }

  const block = `\n\n## session ${sessionId}\n\n_${now}_\n\n<!-- track: long-memory -->\n`
  writeFileSync(path, current + block + marker + '\n', 'utf8')
}

/** Append a one-line pointer for a user message to today's daily note. */
export function appendDailyEntry(markdownDir: string, entry: { sessionId: string, content: string }): void {
  const dir = join(markdownDir, 'memory')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${todayLocal()}.md`)

  const head = headLine(entry.content)
  // Local-time HH:MM:SS — the ingest side parses the note's date+time as
  // local, so writing UTC here would shift observed_at by a full timezone.
  const now = new Date()
  const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
  const line = `- \`${ts}\` [${entry.sessionId}] ${head} (${entry.content.length} chars)\n`

  let current = ''
  if (existsSync(file)) current = readFileSync(file, 'utf8')
  writeFileSync(file, current + line, 'utf8')
}

// ────────────────────────────────────────────────────────────────────────────
// Reverse sync (markdown → DB)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Walk the daily-note directory and ingest any line we haven't seen yet.
 * Lines are matched by their `(sessionId, HH:MM:SS, sha256)` triple so a
 * re-scan doesn't double-write. Origin is 'user-edited' because the line
 * came from disk, not from a model/tool call.
 */
export function ingestDailyNotes(driver: SqlDriver, markdownDir: string, embeddingConfig?: EmbeddingConfig | null): { ingested: number, scanned: number } {
  const dir = join(markdownDir, 'memory')
  if (!existsSync(dir)) return { ingested: 0, scanned: 0 }

  let scanned = 0
  let ingested = 0
  for (const name of readdirSync(dir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue
    const day = basename(name, '.md')
    scanned += 1
    const text = readFileSync(join(dir, name), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseDailyLine(line, day)
      if (parsed === null) continue
      const dedupeKey = `${day}::${parsed.sessionId}::${parsed.ts}::${parsed.sha}`
      const seen = driver.prepare(
        `SELECT 1 FROM memories WHERE supersession_key = ?`,
      ).get(`daily:${dedupeKey}`)
      if (seen !== undefined) continue

      const content = `[${day} ${parsed.ts}] ${parsed.head}`
      writeMemory(driver, {
        type: 'EPISODIC', scope: 'episodic', content,
        origin: 'user-edited', sessionKind: 'interactive',
        sessionId: parsed.sessionId,
        supersessionKey: `daily:${dedupeKey}`,
        confidence: 0.7,
        observedAt: parsed.timestampMs,
      }, embeddingConfig, {
        actor: 'system',
        action: 'record',
        reason: 'markdown-ingest',
      })
      ingested += 1
    }
  }
  return { ingested, scanned }
}

function parseDailyLine(line: string, day?: string): ParsedDailyLine | null {
  // Format: `- `HH:MM:SS` `[sessionId]` head (N chars)`
  const m = /^-\s+`(\d{2}:\d{2}:\d{2})`\s+\[([^\]]+)\]\s+(.+?)\s+\((\d+)\s+chars\)\s*$/.exec(line)
  if (m === null) return null
  const [, ts, sessionId, head] = m
  const sha = simpleHash(`${ts}|${sessionId}|${head}`)
  // The timestamp must come from the FILE's own date, not "today" — ingesting
  // a historical file with today's date scrambles the timeline. No 'Z'
  // suffix: the notes are written in local time, so parse them as local.
  const dateStr = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayLocal()
  const timestampMs = Date.parse(`${dateStr}T${ts}`)
  return {
    ts,
    sessionId,
    head,
    sha,
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : nowMs(),
  }
}

function simpleHash(s: string): string {
  // Tiny non-cryptographic hash (we just need stability across runs).
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}

// ────────────────────────────────────────────────────────────────────────────
// Live watcher
// ────────────────────────────────────────────────────────────────────────────

export function startWatcher(markdownDir: string, onChange: () => void): WatcherHandle {
  const dir = join(markdownDir, 'memory')
  if (!existsSync(dir)) return { close() { /* no-op */ } }

  let timer: NodeJS.Timeout | null = null
  const w: FSWatcher = watch(dir, { persistent: false }, (_eventType, filename) => {
    if (filename === null || !/^\d{4}-\d{2}-\d{2}\.md$/.test(filename)) return
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      try { onChange() } catch { /* swallowed by design */ }
    }, 500)
  })

  return {
    close(): void {
      if (timer !== null) clearTimeout(timer)
      try { w.close() } catch { /* best effort */ }
    },
  }
}

/** List the daily-note files in a dir matching the date pattern. */
export function listMarkdowns(markdownDir: string): string[] {
  const dir = join(markdownDir, 'memory')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
}
