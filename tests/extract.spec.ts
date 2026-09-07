// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from 'vitest'
import { TaskQueue, parseJsonResponse, buildLessonPrompt, buildRulePrompt } from '../src/extract.js'

describe('TaskQueue', () => {
  it('runs tasks with the configured concurrency', async () => {
    let running = 0
    let peak = 0
    const queue = new TaskQueue({ concurrency: 2, timeout: 1000 })
    const tasks = Array.from({ length: 6 }, (_, i) =>
      queue.add(async () => {
        running += 1
        peak = Math.max(peak, running)
        await new Promise(resolve => setTimeout(resolve, 20))
        running -= 1
        return i
      }))
    const results = await Promise.all(tasks)
    expect(results).toEqual([0, 1, 2, 3, 4, 5])
    expect(peak).toBe(2)
  })

  it('rejects a task that exceeds its timeout', async () => {
    const queue = new TaskQueue({ concurrency: 1, timeout: 30 })
    await expect(queue.add(() => new Promise(() => { /* never resolves */ }))).rejects.toThrow(/timed out/)
  })

  it('rejects queued work added after dispose', async () => {
    const queue = new TaskQueue({ concurrency: 1, timeout: 1000 })
    const first = queue.add(() => new Promise<void>(resolve => setTimeout(resolve, 40)))
    const second = queue.add(async () => 'never')
    queue.dispose()
    await expect(second).rejects.toThrow(/disposed/)
    await expect(first).resolves.toBeUndefined()
  })
})

describe('parseJsonResponse', () => {
  it('parses a direct JSON object', () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses JSON inside a code fence', () => {
    expect(parseJsonResponse('Sure, here it is:\n```json\n{"rule":"x"}\n```')).toEqual({ rule: 'x' })
  })

  it('parses JSON embedded in prose', () => {
    expect(parseJsonResponse('result: {"error_summary":"e"} done')).toEqual({ error_summary: 'e' })
  })

  it('returns null for non-JSON text and non-string input', () => {
    expect(parseJsonResponse('no json here')).toBeNull()
    expect(parseJsonResponse('')).toBeNull()
    expect(parseJsonResponse(null)).toBeNull()
    expect(parseJsonResponse(123)).toBeNull()
  })
})

describe('buildLessonPrompt', () => {
  it('always returns system + user messages', () => {
    const msgs = buildLessonPrompt({ text: '不对，应该用 B 方案' })
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].content).toContain('不对，应该用 B 方案')
  })

  it('includes session hint and recent context lines', () => {
    const msgs = buildLessonPrompt({
      text: 'wrong',
      sessionHint: 'sess-1',
      context: [
        { role: 'assistant', text: 'I did A' },
        { role: 'user', text: 'do B' },
      ],
    })
    expect(msgs[1].content).toContain('Session: sess-1')
    expect(msgs[1].content).toContain('assistant: I did A')
    expect(msgs[1].content).toContain('user: do B')
  })

  it('keeps only the last five context entries', () => {
    const context = Array.from({ length: 8 }, (_, i) => ({ role: 'user', text: `m${i}` }))
    const msgs = buildLessonPrompt({ text: 'x', context })
    expect(msgs[1].content).not.toContain('m0')
    expect(msgs[1].content).toContain('m7')
  })
})

describe('buildRulePrompt', () => {
  it('returns an empty message list without corrections', () => {
    expect(buildRulePrompt([])).toEqual([])
  })

  it('summarises each correction with its id', () => {
    const msgs = buildRulePrompt([
      { id: 'c1', error_summary: 'bad merge', root_cause: 'rushed', rule: 'always rebase first' },
      { id: 'c2', correct_action: 'run tests' },
    ])
    expect(msgs[1].content).toContain('- [c1] bad merge')
    expect(msgs[1].content).toContain('Root cause: rushed')
    expect(msgs[1].content).toContain('Rule: always rebase first')
    expect(msgs[1].content).toContain('- [c2] run tests')
  })
})
