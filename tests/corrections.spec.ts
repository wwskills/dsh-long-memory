// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest'
import { resolveSignalWords, matchSignalWords } from '../src/corrections.js'

describe('resolveSignalWords', () => {
  it('prefers an explicit config list over locale defaults', () => {
    const words = resolveSignalWords({ configSignalWords: ['nope', 'fix this'], signalWordsLocale: 'en' })
    expect([...words]).toEqual(['nope', 'fix this'])
  })

  it('filters non-string and empty entries out of a config list', () => {
    const words = resolveSignalWords({ configSignalWords: ['ok', '', 42 as unknown as string] })
    expect([...words]).toEqual(['ok'])
  })

  it('falls back to built-in word lists when no config list is given', () => {
    const zh = resolveSignalWords({ signalWordsLocale: 'zh' })
    expect(zh.length).toBeGreaterThan(0)
    expect([...zh].some(w => w === '不对')).toBe(true)
  })
})

describe('matchSignalWords', () => {
  it('matches a Chinese correction phrase case-insensitively', () => {
    expect(matchSignalWords('这里不对，重来')).toBe(true)
  })

  it('matches an English correction phrase embedded in a sentence', () => {
    expect(matchSignalWords('that is Wrong, redo it')).toBe(true)
  })

  it('does not match ordinary feedback', () => {
    expect(matchSignalWords('looks great, ship it')).toBe(false)
  })

  it('returns false for empty or non-string text', () => {
    expect(matchSignalWords('')).toBe(false)
    expect(matchSignalWords(undefined as unknown as string)).toBe(false)
  })

  it('honours a custom word list', () => {
    expect(matchSignalWords('please kumquat the build', ['kumquat'])).toBe(true)
    expect(matchSignalWords('please kumquat the build', ['other'])).toBe(false)
  })
})
