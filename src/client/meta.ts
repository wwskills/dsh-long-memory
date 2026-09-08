// SPDX-License-Identifier: MIT
/**
 * Static data → visual metadata maps: correction triggers, rule categories,
 * memory types / origins, and persona dimensions. Centralised so colours and
 * glyphs stay consistent across every card.
 *
 * @module @wwskills/dsh-long-memory/client/meta
 */

import type { LocaleKey } from './locales.js'
import { detectColorScheme } from './theme.js'

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

// ── Semantic colour palettes (light / dark) ────────────────────────────────

const CATEGORY_PALETTES: Record<string, { light: CategoryMeta, dark: CategoryMeta }> = {
  coding: {
    light: { icon: '💻', labelKey: 'categoryCoding', fg: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' },
    dark:  { icon: '💻', labelKey: 'categoryCoding', fg: '#93c5fd', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.35)' },
  },
  communication: {
    light: { icon: '💬', labelKey: 'categoryCommunication', fg: '#16a34a', bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.35)' },
    dark:  { icon: '💬', labelKey: 'categoryCommunication', fg: '#86efac', bg: 'rgba(134,239,172,0.15)', border: 'rgba(134,239,172,0.35)' },
  },
  workflow: {
    light: { icon: '⚙️', labelKey: 'categoryWorkflow', fg: '#ea580c', bg: 'rgba(234,88,12,0.12)', border: 'rgba(234,88,12,0.35)' },
    dark:  { icon: '⚙️', labelKey: 'categoryWorkflow', fg: '#fdba74', bg: 'rgba(253,186,116,0.15)', border: 'rgba(253,186,116,0.35)' },
  },
  safety: {
    light: { icon: '🛡', labelKey: 'categorySafety', fg: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.35)' },
    dark:  { icon: '🛡', labelKey: 'categorySafety', fg: '#fca5a5', bg: 'rgba(252,165,165,0.15)', border: 'rgba(252,165,165,0.35)' },
  },
}

const TYPE_PALETTES: Record<string, { light: TypeMeta, dark: TypeMeta }> = {
  USER:       { light: { icon: '👤', labelKey: 'memTypeUser', fg: '#7c3aed' }, dark: { icon: '👤', labelKey: 'memTypeUser', fg: '#c4b5fd' } },
  PREFERENCE: { light: { icon: '❤️', labelKey: 'memTypePreference', fg: '#e11d48' }, dark: { icon: '❤️', labelKey: 'memTypePreference', fg: '#fda4af' } },
  PROJECT:    { light: { icon: '📁', labelKey: 'memTypeProject', fg: '#d97706' }, dark: { icon: '📁', labelKey: 'memTypeProject', fg: '#fcd34d' } },
  FACT:       { light: { icon: '📌', labelKey: 'memTypeFact', fg: '#2563eb' }, dark: { icon: '📌', labelKey: 'memTypeFact', fg: '#93c5fd' } },
  SKILL:      { light: { icon: '🛠', labelKey: 'memTypeSkill', fg: '#059669' }, dark: { icon: '🛠', labelKey: 'memTypeSkill', fg: '#6ee7b7' } },
  EVENT:      { light: { icon: '📅', labelKey: 'memTypeEvent', fg: '#7c3aed' }, dark: { icon: '📅', labelKey: 'memTypeEvent', fg: '#c4b5fd' } },
  TASK:       { light: { icon: '✅', labelKey: 'memTypeTask', fg: '#059669' }, dark: { icon: '✅', labelKey: 'memTypeTask', fg: '#6ee7b7' } },
}

const TYPE_FALLBACK: { light: TypeMeta, dark: TypeMeta } = {
  light: { icon: '⚪', labelKey: null, fg: '#64748b' },
  dark:  { icon: '⚪', labelKey: null, fg: '#94a3b8' },
}

// ── Theme-aware resolvers ───────────────────────────────────────────────────

function palette(): 'light' | 'dark' {
  return detectColorScheme()
}

export function categoryMeta(category: string): CategoryMeta {
  const p = CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.coding!
  return p[palette()]
}

export function memoryTypeMeta(type: string): TypeMeta {
  const p = TYPE_PALETTES[type]
  return p ? p[palette()] : TYPE_FALLBACK[palette()]
}

export function memoryTypeFallback(): TypeMeta {
  return TYPE_FALLBACK[palette()]
}

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
