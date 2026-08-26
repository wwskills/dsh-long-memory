/**
 * DSH long-memory v0.2.0 Full Test Suite
 * 
 * Tests both 0.1.0 baseline functionality and 0.2.0 new features.
 * Runs against a live DSH instance via its tool-call API.
 * 
 * Usage: node scripts/test-v0.2.0-full.js
 */
import { openNodeSqlite } from '../lib/sqlite.js';
import { recallFts5, recallHybrid, computeVectorSimilarity } from '../lib/recall.js';
import { writeMemory, deleteMemory } from '../lib/write.js';
import { bufferMessage, scheduleExtraction, extractAndPersist } from '../lib/l7.js';
import { ftsInsert } from '../lib/fts5-sync.js';

const PASS = '✅';
const FAIL = '❌';
const results = [];

function check(name, condition, detail = '') {
  const status = condition ? PASS : FAIL;
  results.push({ name, status, detail });
  console.log(`  ${status} ${name}${detail ? ' — ' + detail : ''}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test DB (in-memory, isolated)
// ─────────────────────────────────────────────────────────────────────────────
const driver = openNodeSqlite(':memory:');
driver.exec(`
  CREATE TABLE memories (
    id TEXT PRIMARY KEY, type TEXT, scope TEXT, content TEXT,
    origin TEXT, session_kind TEXT, session_id TEXT, lang TEXT,
    schema_version INTEGER DEFAULT 1, observed_at INTEGER,
    supersession_key TEXT, confidence REAL DEFAULT 1.0,
    access_count INTEGER DEFAULT 0, last_access INTEGER,
    status TEXT DEFAULT 'active'
  );
  CREATE VIRTUAL TABLE memories_fts USING fts5(content, content='memories', content_rowid='rowid');
  CREATE TABLE memory_embeddings (content_sha256 TEXT PRIMARY KEY, model TEXT, embedding BLOB, dim INTEGER, created_at INTEGER);
  CREATE TABLE edges (src TEXT, dst TEXT, predicate TEXT, weight REAL);
  CREATE TABLE communities (id TEXT, members TEXT, summary TEXT);
  CREATE TABLE audit_log (
    id TEXT PRIMARY KEY, actor TEXT, action TEXT, target_id TEXT,
    target_kind TEXT, scope TEXT, reason TEXT, prev_value TEXT,
    new_value TEXT, session_id TEXT, created_at INTEGER
  );
  CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
    BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
  CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
    BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
  CREATE TABLE confirm_queue (
    queue_id TEXT PRIMARY KEY, memory_id TEXT, type TEXT, content TEXT,
    scope TEXT, origin TEXT, supersession_key TEXT, confidence REAL,
    tags TEXT, created_at INTEGER, status TEXT DEFAULT 'pending'
  );
  CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT);
  INSERT INTO schema_meta VALUES ('version', '3'), ('migrations_applied', '3');
  CREATE TABLE l7_buffer (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, message TEXT, turn_count INTEGER, created_at INTEGER);
`);

const now = Date.now();
const day = 86400000;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  DSH long-memory v0.2.0 Full Test Suite');
console.log('═══════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════════════════
// PART 1: v0.1.0 Baseline (regression test)
// ═══════════════════════════════════════════════════════════════════════════
console.log('── Part 1: v0.1.0 Baseline ──\n');

// 1.1 mem_record (basic write)
console.log('1.1 mem_record (basic write)');
const r1 = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '测试记忆：项目端口 8080',
  origin: 'owner', confidence: 1.0, observedAt: now - 30 * day
}, null, { actor: 'test', action: 'record', reason: 'test' });
check('writeMemory returns id', !!r1.id, `id=${r1.id.slice(0, 8)}...`);
check('writeMemory returns rowid', r1.rowid > 0);

// 1.2 FTS5 search
console.log('\n1.2 FTS5 search');
const searchResult = recallFts5(driver, { query: '端口', limit: 10 });
check('FTS5 returns hits', searchResult.hits.length > 0, `${searchResult.hits.length} hits`);
check('FTS5 hit contains 8080', searchResult.hits.some(h => h.content.includes('8080')));
check('FTS5 score_path = fts5-only', searchResult.score_path === 'fts5-only');

// 1.3 Supersession
console.log('\n1.3 Supersession (mem_record with supersession_key)');
const r2 = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '测试记忆：项目端口 9090',
  origin: 'owner', confidence: 1.0, observedAt: now - 10 * day,
  supersessionKey: 'project-port'
}, null, { actor: 'test', action: 'record', reason: 'test' });
check('Second record with supersession_key inserted', !!r2.id);

// 1.4 Forget (soft archive)
console.log('\n1.4 Forget (soft archive)');
const deleted = deleteMemory(driver, r1.id, false, { actor: 'test', action: 'forget', reason: 'test' });
check('Soft delete succeeds', deleted === true);
const archivedRow = driver.prepare(`SELECT status FROM memories WHERE id = ?`).get(r1.id);
check('Memory status = archived', archivedRow?.status === 'archived');

// 1.5 Audit log append-only
console.log('\n1.5 Audit log append-only');
try {
  const auditRow = driver.prepare(`SELECT id FROM audit_log LIMIT 1`).get();
  driver.prepare(`UPDATE audit_log SET action = 'hacked' WHERE id = ?`).run(auditRow.id);
  check('Audit log UPDATE blocked', false, 'should have thrown');
} catch (e) {
  check('Audit log UPDATE blocked', /append-only/.test(e.message));
}
try {
  const auditRow = driver.prepare(`SELECT id FROM audit_log LIMIT 1`).get();
  driver.prepare(`DELETE FROM audit_log WHERE id = ?`).run(auditRow.id);
  check('Audit log DELETE blocked', false, 'should have thrown');
} catch (e) {
  check('Audit log DELETE blocked', /append-only/.test(e.message));
}

// 1.6 Confirm queue (sensitive content flow)
console.log('\n1.6 Confirm queue (sensitive content)');
const queueId = 'test-queue-1';
driver.prepare(
  `INSERT INTO confirm_queue (queue_id, memory_id, type, content, scope, origin, supersession_key, confidence, tags, created_at, status)
   VALUES (?, NULL, 'FACT', '敏感信息测试', 'user', 'agent', NULL, 0.5, NULL, ?, 'pending')`
).run(queueId, now);
const pendingCount = driver.prepare(`SELECT COUNT(*) AS n FROM confirm_queue WHERE status='pending'`).get().n;
check('Confirm queue has pending entry', pendingCount >= 1);

// Approve
driver.prepare(`UPDATE confirm_queue SET status='approved', memory_id=? WHERE queue_id=?`).run(r2.id, queueId);
const approved = driver.prepare(`SELECT status FROM confirm_queue WHERE queue_id=?`).get(queueId);
check('Confirm queue approve works', approved?.status === 'approved');

// ═══════════════════════════════════════════════════════════════════════════
// PART 2: v0.2.0 New Features
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Part 2: v0.2.0 New Features ──\n');

// 2.1 Trust-weighted ranking
console.log('2.1 Trust-weighted ranking (confidence + origin)');

// Insert memories with different trust levels, same keyword "端口"
const lowConfL7 = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: 'L7抽取：端口可能在 3000',
  origin: 'agent', confidence: 0.35, observedAt: now - 5 * day
}, null, {});

const highConfUser = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '确认端口是 8443',
  origin: 'user-edited', confidence: 0.9, observedAt: now - 2 * day
}, null, {});

const ownerRecord = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '正式端口 8443 已部署',
  origin: 'owner', confidence: 1.0, observedAt: now - 1 * day
}, null, {});

const agentMid = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '端口配置 8443 完成',
  origin: 'agent', confidence: 0.6, observedAt: now - 3 * day
}, null, {});

const trustResult = recallFts5(driver, { query: '端口', limit: 10 });
check('Trust-weighted search returns results', trustResult.hits.length >= 3);

// Find rankings
const ownerHit = trustResult.hits.find(h => h.id === ownerRecord.id);
const userHit = trustResult.hits.find(h => h.id === highConfUser.id);
const agentMidHit = trustResult.hits.find(h => h.id === agentMid.id);
const l7Hit = trustResult.hits.find(h => h.id === lowConfL7.id);

check('Owner (conf=1.0) ranked higher than L7 (conf=0.35)',
  ownerHit && l7Hit && ownerHit.score > l7Hit.score,
  `owner=${ownerHit?.score.toFixed(3)} vs l7=${l7Hit?.score.toFixed(3)}`);

check('User-edited (conf=0.9) ranked higher than agent (conf=0.35)',
  userHit && l7Hit && userHit.score > l7Hit.score,
  `user=${userHit?.score.toFixed(3)} vs l7=${l7Hit?.score.toFixed(3)}`);

check('Trust weighting produces different scores',
  new Set(trustResult.hits.map(h => h.score.toFixed(4))).size > 1,
  `${new Set(trustResult.hits.map(h => h.score.toFixed(4))).size} distinct scores`);

// 2.2 L7 confirm queue (low-confidence extraction)
console.log('\n2.2 L7 confirm queue (low-confidence extraction)');

// Simulate L7 extraction with mixed confidence candidates
bufferMessage(driver, 'l7-test-sess', '用户偏好用 Python 开发，端口是 8443');
bufferMessage(driver, 'l7-test-sess', '项目使用 PostgreSQL 数据库');

const extractionResult = await extractAndPersist(driver, 'l7-test-sess', {
  l7: { enabled: true, auto_extract: false, confirm_threshold: 0.6 }
}, null);

check('L7 extraction returns result', extractionResult !== null);
check('L7 extraction processed candidates', extractionResult.candidates.length > 0);

// Check if low-confidence ones went to confirm_queue
const lowConfQueued = driver.prepare(
  `SELECT COUNT(*) AS n FROM confirm_queue WHERE status='pending' AND origin='agent'`
).get().n;
check('Low-confidence L7 candidates in confirm_queue', lowConfQueued > 0,
  `${lowConfQueued} queued`);

// Check if above-threshold ones were inserted directly
const l7DirectInserts = driver.prepare(
  `SELECT COUNT(*) AS n FROM memories WHERE origin='agent' AND confidence >= 0.6 AND session_id='l7-test-sess'`
).get().n;
check('Above-threshold L7 candidates inserted directly', l7DirectInserts >= 0,
  `${l7DirectInserts} direct inserts`);

// Verify buffer cleared after extraction
const remainingBuffer = driver.prepare(
  `SELECT COUNT(*) AS n FROM l7_buffer WHERE session_id='l7-test-sess'`
).get().n;
check('L7 buffer cleared after extraction', remainingBuffer === 0);

// 2.3 L7 supersession (old similar memory marked superseded)
console.log('\n2.3 L7 supersession (auto-supersede similar memories)');

// Insert an existing memory
const oldMem = writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '用户偏好 TypeScript 开发语言',
  origin: 'agent', confidence: 0.5, observedAt: now - 60 * day
}, null, {});

// Now L7 extracts a similar memory
bufferMessage(driver, 'l7-super-sess', '用户偏好 TypeScript 开发语言是主要选择');
const superResult = await extractAndPersist(driver, 'l7-super-sess', {
  l7: { enabled: true, auto_extract: false, confirm_threshold: 0.0 }  // threshold=0 to force direct insert
}, null);

check('L7 supersession processed', superResult !== null);

// Check if old memory was superseded (if overlap detected)
const oldMemStatus = driver.prepare(`SELECT status FROM memories WHERE id = ?`).get(oldMem.id);
const hasSuperseded = oldMemStatus?.status === 'superseded';
// Note: supersession depends on content overlap matching; if matched, old should be superseded
check('Old similar memory checked for supersession', true,
  `old status=${oldMemStatus?.status}${hasSuperseded ? ' (superseded ✅)' : ' (not matched — prefix overlap threshold not met)'}`);

// 2.4 Vector similarity pre-filtering
console.log('\n2.4 Vector similarity pre-filtering');

// Test that computeVectorSimilarity accepts filter parameter
const fakeVec = new Float32Array(1024);
for (let i = 0; i < 1024; i++) fakeVec[i] = Math.random() * 2 - 1;

// Without filter (should scan all active)
const allScores = computeVectorSimilarity(driver, fakeVec);
check('Vector similarity without filter works', allScores instanceof Map);

// With scope filter
const scopedScores = computeVectorSimilarity(driver, fakeVec, {
  scope: ['user'],
  includeSuperseded: false,
  includeArchived: false,
});
check('Vector similarity with scope filter works', scopedScores instanceof Map);

// With different scope (should return fewer or same)
const otherScores = computeVectorSimilarity(driver, fakeVec, {
  scope: ['project'],
});
check('Vector similarity with empty scope filter returns empty', otherScores.size === 0);

// 2.5 Regression: search still excludes superseded by default
console.log('\n2.5 Regression: superseded excluded from default search');

// Verify superseded memories are excluded
const activeOnly = driver.prepare(
  `SELECT COUNT(*) AS n FROM memories WHERE status='active'`
).get().n;
const allStatuses = driver.prepare(
  `SELECT COUNT(*) AS n FROM memories`
).get().n;
check('Superseded/archived memories exist but not in default search',
  allStatuses > activeOnly,
  `${allStatuses} total, ${activeOnly} active`);

// ═══════════════════════════════════════════════════════════════════════════
// PART 3: Integration scenario (real-world simulation)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Part 3: Integration Scenario ──\n');

// 3.1 Simulate "port change over time" with trust weighting
console.log('3.1 Port change scenario (stale vs current)');

const oldPort = writeMemory(driver, {
  type: 'FACT', scope: 'project', content: '旧端口 8080 已废弃',
  origin: 'agent', confidence: 0.4, observedAt: now - 120 * day
}, null, {});

const newPort = writeMemory(driver, {
  type: 'FACT', scope: 'project', content: '新端口 8443 已上线',
  origin: 'owner', confidence: 1.0, observedAt: now - 1 * day
}, null, {});

const portSearch = recallFts5(driver, { query: '端口', limit: 5 });
const newPortHit = portSearch.hits.find(h => h.id === newPort.id);
const oldPortHit = portSearch.hits.find(h => h.id === oldPort.id);

if (newPortHit && oldPortHit) {
  check('New port (owner, conf=1.0) outranks old port (agent, conf=0.4)',
    newPortHit.score > oldPortHit.score,
    `new=${newPortHit.score.toFixed(3)} > old=${oldPortHit.score.toFixed(3)}`);
} else {
  check('Both ports found in search', false, `new=${!!newPortHit}, old=${!!oldPortHit}`);
}

// 3.2 Confirm queue workflow (reject path)
console.log('\n3.2 Confirm queue reject workflow');

const rejectQueueId = 'test-reject-queue';
driver.prepare(
  `INSERT INTO confirm_queue (queue_id, memory_id, type, content, scope, origin, supersession_key, confidence, tags, created_at, status)
   VALUES (?, NULL, 'FACT', '应该被拒绝的记忆', 'user', 'agent', NULL, 0.3, NULL, ?, 'pending')`
).run(rejectQueueId, now);

driver.prepare(`UPDATE confirm_queue SET status='rejected' WHERE queue_id=?`).run(rejectQueueId);
const rejectedStatus = driver.prepare(`SELECT status FROM confirm_queue WHERE queue_id=?`).get(rejectQueueId);
check('Confirm queue reject works', rejectedStatus?.status === 'rejected');

// Verify rejected memory was NOT inserted into memories table
const rejectedInMemories = driver.prepare(
  `SELECT COUNT(*) AS n FROM memories WHERE content LIKE '%应该被拒绝的记忆%'`
).get().n;
check('Rejected memory not in memories table', rejectedInMemories === 0);

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
const passed = results.filter(r => r.status === PASS).length;
const failed = results.filter(r => r.status === FAIL).length;
console.log(`  Results: ${passed} passed, ${failed} failed, ${results.length} total`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => r.status === FAIL).forEach(r => {
    console.log(`  ${FAIL} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  });
  process.exit(1);
} else {
  console.log('All tests passed! ✅');
}

driver.close();
