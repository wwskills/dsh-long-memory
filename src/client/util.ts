// SPDX-License-Identifier: MIT
/**
 * Small shared client utilities.
 * @module @wwskills/dsh-long-memory/client/util
 */

import type { Translate } from './locales.js'

/** Compact relative time. Unlike the old panel, all units are localized. */
export function relativeTime(ts: number | undefined | null, t: Translate, now: number = Date.now()): string {
  if (ts === undefined || ts === null || ts === 0) return '—'
  const diff = Math.max(0, now - ts)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('timeJustNow')
  if (mins < 60) return t('timeMinutes', { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('timeHours', { n: hrs })
  const days = Math.floor(hrs / 24)
  return t('timeDays', { n: days })
}

/** Parse a memory/rule `tags` field that may be an array or a JSON string. */
export function parseTags(tags: string[] | string | undefined): string[] {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string' && tags !== '') {
    try {
      const parsed = JSON.parse(tags) as unknown
      return Array.isArray(parsed) ? parsed as string[] : []
    } catch {
      return []
    }
  }
  return []
}
