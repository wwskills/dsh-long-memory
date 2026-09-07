// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest'
import { settingsSchema, settingsDefaults, validateSettings, SETTINGS_NS } from '../src/settings-schema.js'

describe('settingsSchema', () => {
  it('exposes the long-memory namespace id', () => {
    expect(SETTINGS_NS).toBe('long-memory')
  })

  it('has unique field keys', () => {
    const keys = settingsSchema.fields.map(f => f.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('settingsDefaults', () => {
  it('flattens dotted keys into a nested object', () => {
    const defaults = settingsDefaults() as Record<string, any>
    expect(defaults.embedding.provider).toBe('none')
    expect(defaults.embedding.dimension).toBe(1024)
    expect(defaults.recall.maxHits).toBe(10)
    expect(defaults.l7.confirmThreshold).toBe(0.6)
    expect(defaults.ruleTokenBudget).toBe(800)
  })

  it('deep-copies list defaults per call', () => {
    const a = settingsDefaults() as Record<string, any>
    const b = settingsDefaults() as Record<string, any>
    a.domainKeywords.push('mutated')
    expect(b.domainKeywords).not.toContain('mutated')
  })
})

describe('validateSettings', () => {
  it('accepts an empty patch', () => {
    expect(validateSettings({})).toEqual([])
    expect(validateSettings(null)).toEqual([])
  })

  it('flags an unknown embedding provider', () => {
    const issues = validateSettings({ embedding: { provider: 'mega-embed' } })
    expect(issues.some(i => i.startsWith('embedding.provider'))).toBe(true)
  })

  it('flags non-integer values for integer fields', () => {
    expect(validateSettings({ recall: { maxHits: 3.5 } })).toContain('recall.maxHits: expected integer')
    expect(validateSettings({ recall: { maxHits: 'ten' } })).toContain('recall.maxHits: expected integer')
  })

  it('flags non-boolean flags', () => {
    expect(validateSettings({ l7: { enabled: 'yes' } })).toContain('l7.enabled: expected boolean')
  })

  it('flags invalid members in multi-enums', () => {
    expect(validateSettings({ recall: { scope: ['user', 'galaxy'] } })).toContain('recall.scope: bad array')
  })

  it('accepts a fully valid patch', () => {
    expect(validateSettings({
      embedding: { provider: 'ollama', dimension: 768 },
      recall: { scope: ['user', 'project'] },
      signalWords: ['别这样'],
      ruleThreshold: 3,
    })).toEqual([])
  })
})
