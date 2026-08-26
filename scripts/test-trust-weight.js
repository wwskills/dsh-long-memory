// Verify trust-weighted ranking works
import { openNodeSqlite } from '../lib/sqlite.js';
import { recallFts5, recallHybrid } from '../lib/recall.js';
import { ftsInsert } from '../lib/fts5-sync.js';
import { writeMemory } from '../lib/write.js';

const driver = openNodeSqlite(':memory:');

// Create schema
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
  CREATE TABLE audit_log (
    id TEXT PRIMARY KEY, actor TEXT, action TEXT, target_id TEXT,
    target_kind TEXT, scope TEXT, reason TEXT, prev_value TEXT,
    new_value TEXT, session_id TEXT, created_at INTEGER
  );
  CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT);
`);

// Insert test memories: same keyword "端口", different trust levels
const now = Date.now();

// L7 low-confidence (should sink to bottom)
writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '项目部署在 8080 端口',
  origin: 'agent', sessionKind: 'interactive', confidence: 0.35,
  observedAt: now - 180 * 86400000
}, null, {});

// User explicit (should rank high)
writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '项目部署在 8443 端口',
  origin: 'user-edited', confidence: 0.9,
  observedAt: now - 5 * 86400000
}, null, {});

// Another L7 (medium confidence)
writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '端口配置在 9090',
  origin: 'agent', confidence: 0.5,
  observedAt: now - 90 * 86400000
}, null, {});

// Owner record (highest trust)
writeMemory(driver, {
  type: 'FACT', scope: 'user', content: '正式端口是 8443',
  origin: 'owner', confidence: 1.0,
  observedAt: now - 1 * 86400000
}, null, {});

// Search
const result = recallFts5(driver, { query: '端口', limit: 10 });

console.log('=== Trust-Weighted Ranking Results ===\n');
result.hits.forEach((h, i) => {
  console.log(`#${i+1} score=${h.score.toFixed(4)} origin=${h.origin} conf=${h.confidence} | ${h.content}`);
});

// Verify ordering: owner + high-conf should rank above agent + low-conf
const topHit = result.hits[0];
const lastHit = result.hits[result.hits.length - 1];

console.log('\n=== Verification ===');
console.log(`Top: origin=${topHit.origin} conf=${topHit.confidence} score=${topHit.score.toFixed(4)}`);
console.log(`Bottom: origin=${lastHit.origin} conf=${lastHit.confidence} score=${lastHit.score.toFixed(4)}`);

// The owner record (conf=1.0, origin=owner) should outscore L7 (conf=0.35, origin=agent)
const ownerHit = result.hits.find(h => h.origin === 'owner');
const l7Hit = result.hits.find(h => h.origin === 'agent' && h.confidence === 0.35);
if (ownerHit && l7Hit) {
  console.log(`\nOwner score (${ownerHit.score.toFixed(4)}) > L7 score (${l7Hit.score.toFixed(4)}): ${ownerHit.score > l7Hit.score ? '✅ PASS' : '❌ FAIL'}`);
}

driver.close();
console.log('\n=== Test Complete ===');
