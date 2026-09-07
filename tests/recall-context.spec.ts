// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest'
import { formatRecallBody, fitsBudget, truncateToBudget } from '../src/index.js'

describe('formatRecallBody', () => {
  it('wraps each hit as a scoped bullet inside the guard tags', () => {
    const body = formatRecallBody([
      { scope: 'user', type: 'PREFERENCE', content: 'prefers dark mode' },
      { scope: 'project', type: 'PROJECT', content: 'uses pnpm' },
    ])
    expect(body.startsWith('<referenced-memory>')).toBe(true)
    expect(body.trimEnd().endsWith('</referenced-memory>')).toBe(true)
    expect(body).toContain('- [user/PREFERENCE] prefers dark mode')
    expect(body).toContain('- [project/PROJECT] uses pnpm')
  })

  it('warns that recalled content is untrusted reference data', () => {
    const body = formatRecallBody([{ scope: 'user', type: 'FACT', content: 'x' }])
    expect(body).toContain('untrusted reference data')
  })
})

describe('fitsBudget / truncateToBudget', () => {
  it('treats four chars as one token', () => {
    expect(fitsBudget('a'.repeat(400), 100)).toBe(true)
    expect(fitsBudget('a'.repeat(401), 100)).toBe(false)
  })

  it('returns text unchanged when it fits', () => {
    expect(truncateToBudget('short', 100)).toBe('short')
  })

  it('appends an ellipsis when truncating', () => {
    const out = truncateToBudget('a'.repeat(500), 100)
    expect(out.length).toBeLessThanOrEqual(400)
    expect(out.endsWith('…')).toBe(true)
  })
})
