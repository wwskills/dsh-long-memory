import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, watch } from "node:fs";
import { join, basename } from "node:path";
import { nowMs } from "./sqlite.js";
import { writeMemory } from "./write.js";
function todayLocal() {
  const d = /* @__PURE__ */ new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function headLine(text) {
  if (typeof text !== "string") return "";
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const t = ln.trim();
    if (t.length > 0) return t.length > 80 ? t.slice(0, 79) + "\u2026" : t;
  }
  return "";
}
function appendSessionStart(markdownDir, sessionId) {
  mkdirSync(markdownDir, { recursive: true });
  const path = join(markdownDir, "MEMORY.md");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const marker = `<!-- session started: ${sessionId} @ ${now} -->`;
  let current = "";
  if (existsSync(path)) {
    current = readFileSync(path, "utf8");
    if (current.includes(`session started: ${sessionId}`)) return;
  }
  const block = `

## session ${sessionId}

_${now}_

<!-- track: long-memory -->
`;
  writeFileSync(path, current + block + marker + "\n", "utf8");
}
function appendDailyEntry(markdownDir, entry) {
  const dir = join(markdownDir, "memory");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${todayLocal()}.md`);
  const head = headLine(entry.content);
  const now = /* @__PURE__ */ new Date();
  const ts = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  const line = `- \`${ts}\` [${entry.sessionId}] ${head} (${entry.content.length} chars)
`;
  let current = "";
  if (existsSync(file)) current = readFileSync(file, "utf8");
  writeFileSync(file, current + line, "utf8");
}
function ingestDailyNotes(driver, markdownDir, embeddingConfig) {
  const dir = join(markdownDir, "memory");
  if (!existsSync(dir)) return { ingested: 0, scanned: 0 };
  let scanned = 0;
  let ingested = 0;
  for (const name of readdirSync(dir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue;
    const day = basename(name, ".md");
    scanned += 1;
    const text = readFileSync(join(dir, name), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseDailyLine(line, day);
      if (parsed === null) continue;
      const dedupeKey = `${day}::${parsed.sessionId}::${parsed.ts}::${parsed.sha}`;
      const seen = driver.prepare(
        `SELECT 1 FROM memories WHERE supersession_key = ?`
      ).get(`daily:${dedupeKey}`);
      if (seen !== void 0) continue;
      const content = `[${day} ${parsed.ts}] ${parsed.head}`;
      writeMemory(driver, {
        type: "EPISODIC",
        scope: "episodic",
        content,
        origin: "user-edited",
        sessionKind: "interactive",
        sessionId: parsed.sessionId,
        supersessionKey: `daily:${dedupeKey}`,
        confidence: 0.7,
        observedAt: parsed.timestampMs
      }, embeddingConfig, {
        actor: "system",
        action: "record",
        reason: "markdown-ingest"
      });
      ingested += 1;
    }
  }
  return { ingested, scanned };
}
function parseDailyLine(line, day) {
  const m = /^-\s+`(\d{2}:\d{2}:\d{2})`\s+\[([^\]]+)\]\s+(.+?)\s+\((\d+)\s+chars\)\s*$/.exec(line);
  if (m === null) return null;
  const [, ts, sessionId, head] = m;
  const sha = simpleHash(`${ts}|${sessionId}|${head}`);
  const dateStr = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayLocal();
  const timestampMs = Date.parse(`${dateStr}T${ts}`);
  return {
    ts,
    sessionId,
    head,
    sha,
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : nowMs()
  };
}
function simpleHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h << 5) + h + s.charCodeAt(i) | 0;
  return (h >>> 0).toString(16);
}
function startWatcher(markdownDir, onChange) {
  const dir = join(markdownDir, "memory");
  if (!existsSync(dir)) return { close() {
  } };
  let timer = null;
  const w = watch(dir, { persistent: false }, (_eventType, filename) => {
    if (filename === null || !/^\d{4}-\d{2}-\d{2}\.md$/.test(filename)) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        onChange();
      } catch {
      }
    }, 500);
  });
  return {
    close() {
      if (timer !== null) clearTimeout(timer);
      try {
        w.close();
      } catch {
      }
    }
  };
}
function listMarkdowns(markdownDir) {
  const dir = join(markdownDir, "memory");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
}
export {
  appendDailyEntry,
  appendSessionStart,
  ingestDailyNotes,
  listMarkdowns,
  startWatcher
};
//# sourceMappingURL=file-tracks.js.map
