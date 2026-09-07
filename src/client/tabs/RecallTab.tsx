// SPDX-License-Identifier: MIT
/**
 * Recall test tab: run an FTS5 query against stored memories and preview which
 * ones match. The old UI showed a "score" column that the list endpoint never
 * returns (always "—"); this version drops it and shows rank + scope + type
 * instead, which is honest about what the endpoint provides.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/RecallTab
 */

import { useState } from 'react'
import { C, style, space, font } from '../theme.js'
import type { Translate } from '../locales.js'
import { memoryTypeMeta, memoryTypeFallback } from '../meta.js'
import { SkeletonList, EmptyState, ErrorState, Chip } from '../primitives.js'
import * as api from '../api.js'
import type { Memory } from '../api.js'

export function RecallTab(props: { t: Translate, showToast: (message: string, type?: 'success' | 'error' | 'warning') => void }): JSX.Element {
  const { t } = props
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Memory[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (): void => {
    const q = query.trim()
    if (q === '') return
    setLoading(true)
    setResults(null)
    setError(null)
    api.listMemories({ q, limit: 20 })
      .then(list => { setResults(list); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); props.showToast(t('loadFailed'), 'error') })
  }

  return (
    <div>
      <h3 style={{ ...style.sectionTitle, marginBottom: space.md }}>{t('recallTab')}</h3>
      <p style={{ fontSize: font.md, color: C.secondary, marginTop: 0, marginBottom: space.lg }}>{t('recallHint')}</p>

      <div style={{ display: 'flex', gap: space.sm, marginBottom: space.lg }}>
        <input
          style={style.input}
          value={query}
          placeholder={t('recallSearchPlaceholder')}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run() }}
        />
        <button className="lm-primary" style={{ ...style.btnPrimary, height: 36, flexShrink: 0 }} disabled={loading || query.trim() === ''} onClick={run}>
          {loading ? t('recallSearching') : t('recallSearch')}
        </button>
      </div>

      {loading ? <SkeletonList count={3} />
        : error !== null ? <ErrorState t={t} message={error} />
          : results !== null && results.length === 0 ? <EmptyState>{t('recallNoResults')}</EmptyState>
            : (results ?? []).map((m, i) => {
                const typeMeta = memoryTypeMeta[m.type] ?? memoryTypeFallback
                return (
                  <div key={m.id} className="lm-card" style={{ ...style.card, ...style.cardPad, marginBottom: space.sm }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
                      <span style={{ fontSize: font.xs, color: C.tertiary, fontVariantNumeric: 'tabular-nums' }}>#{i + 1}</span>
                      <Chip icon={typeMeta.icon} label={typeMeta.labelKey !== null ? t(typeMeta.labelKey) : m.type} fg={typeMeta.fg} />
                      <Chip icon="📍" label={m.scope} />
                    </div>
                    <p style={{ fontSize: font.md, color: C.text, margin: 0, lineHeight: 1.6, wordBreak: 'break-word' }}>
                      {(m.content ?? '').slice(0, 300)}
                    </p>
                  </div>
                )
              })}
    </div>
  )
}
