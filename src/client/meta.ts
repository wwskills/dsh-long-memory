// SPDX-License-Identifier: MIT
/**
 * Static data → visual metadata maps: correction triggers, rule categories,
 * memory types / origins, and persona dimensions. Centralised so colours and
 * glyphs stay consistent across every card.
 *
 * @module @wwskills/dsh-long-memory/client/meta
 */

import type { LocaleKey } from './locales.js'

export interface TriggerMeta { icon: string, labelKey: LocaleKey }
export interface CategoryMeta { icon: string, labelKey: LocaleKey, fg: string, bg: string, border: string }
export interface TypeMeta { icon: string, labelKey: LocaleKey | null, fg: string }
export interface OriginMeta { icon: string, labelKey: LocaleKey | null }

export const triggerMeta: Record<string, TriggerMeta> = {
  tool_error: { icon: '🔴', labelKey: 'triggerToolError' },
  user_correction: { icon: '🟡', labelKey: 'triggerUserCorrection' },
  self_fix: { icon: '🟢', labelKey: 'triggerSelfFix' },
}
export const triggerFallback: TriggerMeta = { icon: '⚪', labelKey: 'triggerToolError' }

export const categoryMeta: Record<string, CategoryMeta> = {
  coding: { icon: '💻', labelKey: 'categoryCoding', fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)' },
  communication: { icon: '💬', labelKey: 'categoryCommunication', fg: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)' },
  workflow: { icon: '⚙️', labelKey: 'categoryWorkflow', fg: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)' },
  safety: { icon: '🛡', labelKey: 'categorySafety', fg: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
}

export const memoryTypeMeta: Record<string, TypeMeta> = {
  USER: { icon: '👤', labelKey: 'memTypeUser', fg: '#c084fc' },
  PREFERENCE: { icon: '❤️', labelKey: 'memTypePreference', fg: '#fb7185' },
  PROJECT: { icon: '📁', labelKey: 'memTypeProject', fg: '#fbbf24' },
  FACT: { icon: '📌', labelKey: 'memTypeFact', fg: '#60a5fa' },
  SKILL: { icon: '🛠', labelKey: 'memTypeSkill', fg: '#4ade80' },
  EVENT: { icon: '📅', labelKey: 'memTypeEvent', fg: '#a78bfa' },
  TASK: { icon: '✅', labelKey: 'memTypeTask', fg: '#34d399' },
}
export const memoryTypeFallback: TypeMeta = { icon: '⚪', labelKey: null, fg: '#94a3b8' }

export const memoryOriginMeta: Record<string, OriginMeta> = {
  owner: { icon: '👑', labelKey: 'memOriginOwner' },
  agent: { icon: '🤖', labelKey: 'memOriginAgent' },
  untrusted: { icon: '⚠️', labelKey: 'memOriginUntrusted' },
  system: { icon: '🖥️', labelKey: 'memOriginSystem' },
  'user-edited': { icon: '✏️', labelKey: 'memOriginUserEdited' },
}
export const memoryOriginFallback: OriginMeta = { icon: '⚪', labelKey: null }

/** Ordered persona dimensions with their glyph + label key. */
export const personaDims: Array<{ key: string, icon: string, labelKey: LocaleKey }> = [
  { key: 'tech_stack', icon: '💻', labelKey: 'personaTechStack' },
  { key: 'coding_style', icon: '✍️', labelKey: 'personaCodingStyle' },
  { key: 'communication', icon: '💬', labelKey: 'personaCommunication' },
  { key: 'common_tasks', icon: '📋', labelKey: 'personaCommonTasks' },
]

/** Colour a confidence bar green / accent / grey by threshold. */
export function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'var(--dsw-alias-state-success-primary, #30a46c)'
  if (confidence >= 0.4) return 'var(--dsw-alias-accent, #3b6ef6)'
  return 'var(--dsw-alias-label-tertiary, #8a9099)'
}
