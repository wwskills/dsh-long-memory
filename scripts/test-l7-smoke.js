// L7 extraction smoke test (temporary): verifies the buffer-range clear and
// the keyword fallback path end-to-end, which the main suites do not cover.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrate } from '../lib/sqlite.js'
import { bufferMessage, extractAndPersist } from '../lib/l7.js'

const dir = mkdtempSync(join(tmpdir(), 'l7-smoke-'))
let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed += 1
}

try {
  const { driver } = migrate(join(dir, 'l7.db'), join(dir, 'migrations-placeholder'), { driver: 'node-builtin' })
  // Point migrations at the real dir — migrate() with a nonexistent dir skips
  // SQL files, so instead re-run against the repo migrations directory.
  driver.close()
} catch { /* placeholder attempt discarded below */ }

const migrationsDir = new URL('../migrations', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const { driver } = migrate(join(dir, 'l7.db'), migrationsDir, { driver: 'node-builtin' })

console.log('1. buffer 60 messages, batch_turns=50')
for (let i = 1; i <= 60; i += 1) {
  bufferMessage(driver, 's1', `message ${i}: 记住 部署端口是 808${i % 10}`)
}
const before = driver.prepare('SELECT COUNT(*) AS n FROM l7_buffer').get().n
check('60 rows buffered', before === 60, `got ${before}`)

console.log('2. extractAndPersist (keyword fallback, no ctx)')
const cfg = { l7: { enabled: true, auto_extract: false, batch_turns: 50, confirm_threshold: 0.99 } }
const result = await extractAndPersist(driver, 's1', cfg, null)
check('extraction completed without throwing', true)
check('candidates extracted', (result.extracted + result.queued) > 0, `extracted=${result.extracted} queued=${result.queued}`)

const after = driver.prepare('SELECT COUNT(*) AS n FROM l7_buffer').get().n
check('buffer keeps un-examined old rows (60-50=10)', after === 10, `got ${after}`)
const remaining = driver.prepare('SELECT MIN(id) AS id, message FROM l7_buffer').get()
check('remaining rows are the OLDEST ones', String(remaining.message).startsWith('message 1'), `first remaining: ${String(remaining.message).slice(0, 12)}`)

console.log('3. second run drains the remaining 10')
const result2 = await extractAndPersist(driver, 's1', cfg, null)
const after2 = driver.prepare('SELECT COUNT(*) AS n FROM l7_buffer').get().n
check('buffer empty after second run', after2 === 0, `got ${after2}`)

driver.close()
try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows temp cleanup can be locked — harmless */ }
console.log(failed === 0 ? '\n✓ L7 smoke passed' : `\n✗ ${failed} assertion(s) failed`)
process.exit(failed === 0 ? 0 : 1)
