// @wwskills/dsh-long-memory — file tracks (M1)
//
// Two markdown tracks, both human-editable, both kept in sync with the
// memories table:
//
//   $DSH_HOME/long-memory/MEMORY.md
//     Long-form ledger, "always injected" at session start.
//     One section per active session; user can edit freely.
//
//   $DSH_HOME/long-memory/memory/YYYY-MM-DD.md
//     Daily episodic notes. Append-only, one line per user message
//     (head + length). Not injected automatically — recalled via FTS5.
//
// Reverse sync (markdown → DB):
//   On startup, scan MEMORY.md and the most recent memory/YYYY-MM-DD.md
//   for new content; parse into memories with origin='user-edited'.
//   After startup, a chokidar watcher reacts to external edits with a
//   debounce; the same parser re-ingests.
//
// Why app-level, not SQL triggers:
//   Markdown is plain text — there's no clean SQL way to "trigger" on a
//   file change. chokidar's `addListener` fires fs events we can route.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync, watch } from 'node:fs';
import { join, basename } from 'node:path';
import { nowMs } from './sqlite.js';
import { writeMemory } from './write.js';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** ISO date string in the user's local timezone (YYYY-MM-DD). */
function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Extract the head line of a user message (first non-empty line, max 80 chars).
 * The full content lives in MEMORY.md and in the FTS5 index; the daily note is
 * just a pointer.
 */
function headLine(text) {
  if (typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const t = ln.trim();
    if (t.length > 0) return t.length > 80 ? t.slice(0, 79) + '…' : t;
  }
  return '';
}

// ────────────────────────────────────────────────────────────────────────────
// File-track writer (DB → markdown)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Append a one-line marker to MEMORY.md identifying a freshly-started session.
 * Idempotent per session (we match the existing block before appending).
 */
export function appendSessionStart(markdownDir, sessionId) {
  mkdirSync(markdownDir, { recursive: true });
  const path = join(markdownDir, 'MEMORY.md');
  const now = new Date().toISOString();
  const marker = `<!-- session started: ${sessionId} @ ${now} -->`;

  let current = '';
  if (existsSync(path)) {
    current = readFileSync(path, 'utf8');
    if (current.includes(`session started: ${sessionId}`)) return; // already noted
  }

  const block = `\n\n## session ${sessionId}\n\n_${now}_\n\n<!-- track: long-memory -->\n`;
  writeFileSync(path, current + block + marker + '\n', 'utf8');
}

/**
 * Append a one-line pointer for a user message to today's daily note.
 */
export function appendDailyEntry(markdownDir, { sessionId, content }) {
  const dir = join(markdownDir, 'memory');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${todayLocal()}.md`);

  const head = headLine(content);
  const ts = new Date().toISOString().slice(11, 19); // HH:MM:SS
  const line = `- \`${ts}\` [${sessionId}] ${head} (${content.length} chars)\n`;

  let current = '';
  if (existsSync(file)) current = readFileSync(file, 'utf8');
  writeFileSync(file, current + line, 'utf8');
}

// ────────────────────────────────────────────────────────────────────────────
// Reverse sync (markdown → DB)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Walk the daily-note directory and ingest any line that we haven't seen yet.
 * Lines are matched by their `(sessionId, HH:MM:SS, sha256)` triple so a
 * re-scan doesn't double-write. Origin is 'user-edited' because the line
 * came from disk, not from a model/tool call.
 *
 * M1 scope: append-only ingest of lines we haven't seen. Heuristic marker:
 * `- `HH:MM:SS` `[sessionId]` head (N chars)`.
 */
export function ingestDailyNotes(driver, markdownDir) {
  const dir = join(markdownDir, 'memory');
  if (!existsSync(dir)) return { ingested: 0, scanned: 0 };

  let scanned = 0;
  let ingested = 0;
  for (const name of readdirSync(dir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue;
    const day = basename(name, '.md');
    scanned++;
    const text = readFileSync(join(dir, name), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseDailyLine(line);
      if (!parsed) continue;
      const dedupeKey = `${day}::${parsed.sessionId}::${parsed.ts}::${parsed.sha}`;
      const seen = driver.prepare(
        `SELECT 1 FROM memories WHERE supersession_key = ?`
      ).get(`daily:${dedupeKey}`);
      if (seen) continue;

      const content = `[${day} ${parsed.ts}] ${parsed.head}`;
      writeMemory(driver, {
        type: 'EPISODIC', scope: 'episodic', content,
        origin: 'user-edited', sessionKind: 'interactive',
        sessionId: parsed.sessionId,
        supersessionKey: `daily:${dedupeKey}`,
        confidence: 0.7,
        observedAt: parsed.timestampMs,
      }, null, {
        actor: 'system',
        action: 'record',
        reason: 'markdown-ingest',
      });
      ingested++;
    }
  }
  return { ingested, scanned };
}

function parseDailyLine(line) {
  // Format: `- `HH:MM:SS` `[sessionId]` head (N chars)`
  const m = /^-\s+`(\d{2}:\d{2}:\d{2})`\s+\[([^\]]+)\]\s+(.+?)\s+\((\d+)\s+chars\)\s*$/.exec(line);
  if (!m) return null;
  const [, ts, sessionId, head] = m;
  const sha = simpleHash(`${ts}|${sessionId}|${head}`);
  const today = todayLocal();
  const timestampMs = Date.parse(`${today}T${ts}Z`);
  return {
    ts,
    sessionId,
    head,
    sha,
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : nowMs()
  };
}

function simpleHash(s) {
  // Tiny non-cryptographic hash (we just need stability across runs).
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

// ────────────────────────────────────────────────────────────────────────────
// Live watcher (M1 stub)
//
// Real chokidar-based watcher lands in M3 governance; for M1 we just expose
// a no-op handle that the caller can dispose. The reverse-sync ingest above
// is enough to satisfy the M1 DoD bullet
//   "删除 SQLite 后启动 dsh，session 仍能跑（recall 退化为空但不报错）"
// because ingest only runs against existing markdown — once the DB is
// rebuilt, the next scan picks up the lines.
// ────────────────────────────────────────────────────────────────────────────

export function startWatcher(markdownDir, onChange) {
  // M3: use Node built-in fs.watch for real-time file change detection.
  const dir = join(markdownDir, 'memory');
  if (!existsSync(dir)) return { close() { /* no-op */ } };

  let timer = null;
  const w = watch(dir, { persistent: false }, (_eventType, filename) => {
    if (!filename || !/^\d{4}-\d{2}-\d{2}\.md$/.test(filename)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try { onChange(); } catch (e) { /* swallow */ }
    }, 500);
  });

  return {
    close() {
      if (timer) clearTimeout(timer);
      try { w.close(); } catch { /* best effort */ }
    }
  };
}

/** List of files in a dir matching a regex. Used by tests + future watcher. */
export function listMarkdowns(markdownDir) {
  const dir = join(markdownDir, 'memory');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
}