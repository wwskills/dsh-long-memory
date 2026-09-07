// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest'
import { unigramize, containsCjk } from '../src/cjk.js'

describe('unigramize', () => {
  it('splits CJK runs into space-separated single characters', () => {
    expect(unigramize('中国法律')).toBe('中 国 法 律')
  })

  it('inserts boundaries between CJK and ASCII segments', () => {
    expect(unigramize('使用SQLite存储')).toBe('使 用 SQLite 存 储')
  })

  it('leaves pure ASCII untouched apart from whitespace collapsing', () => {
    expect(unigramize('hello   world')).toBe('hello world')
  })

  it('returns the empty string for non-string or empty input', () => {
    expect(unigramize('')).toBe('')
    expect(unigramize(undefined as unknown as string)).toBe('')
    expect(unigramize(42 as unknown as string)).toBe('')
  })
})

describe('containsCjk', () => {
  it('detects CJK inside mixed text', () => {
    expect(containsCjk('mix 中文 mix')).toBe(true)
  })

  it('rejects pure Latin text', () => {
    expect(containsCjk('plain latin only')).toBe(false)
  })

  it('handles non-string input safely', () => {
    expect(containsCjk(null as unknown as string)).toBe(false)
    expect(containsCjk(123 as unknown as string)).toBe(false)
  })
})
