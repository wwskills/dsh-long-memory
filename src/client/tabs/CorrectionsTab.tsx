// SPDX-License-Identifier: MIT
/**
 * Lessons tab: lists captured corrections, each expandable, with extract /
 * ignore actions. Ignore now goes through a themed ConfirmDialog.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/CorrectionsTab
 */

import { useEffect, useRef, useState } from 'react'
import { C, style, space, font } from '../theme.js'
import type { Translate } from '../locales.js'
import { triggerMeta, triggerFallback } from '../meta.js'
import { relativeTime } from '../util.js'
import { SkeletonList, EmptyState, ErrorState, ConfirmDialog, Chip } from '../primitives.js'
import * as api from '../api.js'
import type { Correction } from '../api.js'

export interface Badges { lessons: number, rules: number, memories: number }

function CorrectionCard(props: {
  correction: Correction
  t: Translate
  highlighted: boolean
  onExtract: (c: Correction) => void
  onIgnore: (c: Correction) => void
}): JSX.Element {
  const { correction: c, t } = props
  const [expanded, setExpanded] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = triggerMeta[c.trigger] ?? triggerFallback

  useEffect(() => {
    if (!props.highlighted || ref.current === null) return
    try { ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch { /* ignore */ }
    setPulsing(true)
    const timer = window.setTimeout(() => setPulsing(false), 2200)
    return () => window.clearTimeout(timer)
  }, [props.highlighted])

  const detailRow = (icon: string, label: string, value: string | undefined): JSX.Element | null =>
    value === undefined || value === '' ? null : (
      <div style={{ marginBottom: space.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.xs, marginBottom: space.xs }}>
          <span aria-hidden style={{ fontSize: font.sm }}>{icon}</span>
          <span style={{ fontSize: font.sm, fontWeight: 600, color: C.text }}>{label}</span>
        </div>
        <div style={{ fontSize: font.md, color: C.secondary, paddingLeft: space.xl, lineHeight: 1.6 }}>{value}</div>
      </div>
    )

  return (
    <div
      ref={ref}
      className="lm-card"
      style={{
        ...style.card,
        marginBottom: space.sm,
        overflow: 'hidden',
        boxShadow: pulsing ? `0 0 0 2px ${C.accent}` : 'none',
        borderColor: pulsing ? C.accent : C.border,
        transition: 'box-shadow 0.4s ease-out, border-color 0.4s ease-out',
      }}
    >
      <div
        style={{ padding: `${space.md}px ${space.lg}px`, cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v) } }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: space.sm }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space.xs, marginBottom: space.xs }}>
              <span aria-hidden style={{ fontSize: font.sm }}>{meta.icon}</span>
              <span style={{ fontSize: font.md, fontWeight: 600, color: C.text }}>{t(meta.labelKey)}</span>
            </div>
            <div style={{ fontSize: font.sm, color: C.secondary, marginLeft: space.xl, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>{c.error_summary ?? ''}</div>
            <div style={{ fontSize: font.xs, color: C.tertiary, marginTop: space.xs, marginLeft: space.xl }}>{relativeTime(c.created_at, t)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexShrink: 0 }}>
            {c.status === 'pending' ? (
              <button className="lm-primary" style={{ ...style.btnPrimary, height: 28, fontSize: font.sm }} onClick={e => { e.stopPropagation(); props.onExtract(c) }}>
                {t('extractRule')}
              </button>
            ) : null}
            <span style={{ fontSize: font.sm, color: C.tertiary }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>
      {expanded ? (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: `${space.lg}px ${space.xl}px` }}>
          {detailRow('📌', t('rootCause'), c.root_cause)}
          {detailRow('✅', t('correctAction'), c.correct_action)}
          {detailRow('🛡', t('rule'), c.rule)}
          {detailRow('📎', t('context'), c.context)}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: space.sm, marginTop: space.md }}>
            <button className="lm-btn lm-danger" style={style.btnDanger} onClick={() => props.onIgnore(c)}>{t('ignore')}</button>
            <button className="lm-primary" style={style.btnPrimary} onClick={() => props.onExtract(c)}>{t('extractRule')}</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CorrectionsTab(props: {
  t: Translate
  setBadges: (fn: (prev: Badges) => Badges) => void
  highlightId: string | null
  onClearHighlight: () => void
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}): JSX.Element {
  const { t } = props
  const [corrections, setCorrections] = useState<Correction[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [confirmIgnore, setConfirmIgnore] = useState<Correction | null>(null)

  const filterOptions: Array<{ key: string, label: string }> = [
    { key: 'all', label: t('filterAll') },
    { key: 'pending', label: t('filterPending') },
    { key: 'promoted', label: t('filterPromoted') },
    { key: 'ignored', label: t('filterIgnored') },
  ]

  const refreshBadges = (): void => {
    void api.getStats().then(data => {
      props.setBadges(prev => ({ ...prev, lessons: data.corrections_pending ?? 0, rules: data.rules_proposed ?? 0 }))
    }).catch(() => { /* badge refresh is best-effort */ })
  }

  const load = (): void => {
    setLoading(true)
    setError(null)
    api.listCorrections()
      .then(data => { setCorrections(data); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false) })
  }

  useEffect(() => { load(); refreshBadges() }, [])

  useEffect(() => {
    if (props.highlightId === null) return
    if (filter !== 'all') setFilter('all')
    const timer = window.setTimeout(() => props.onClearHighlight(), 2600)
    return () => window.clearTimeout(timer)
  }, [props.highlightId])

  const doExtract = (c: Correction): void => {
    api.extractCorrection(c.id)
      .then(() => { load(); refreshBadges() })
      .catch(() => props.showToast(t('loadFailed'), 'error'))
  }
  const doIgnore = (c: Correction): void => {
    api.ignoreCorrection(c.id)
      .then(() => load())
      .catch(() => props.showToast(t('loadFailed'), 'error'))
  }

  if (loading) return <SkeletonList count={3} />
  if (error !== null) return <ErrorState t={t} message={error} onRetry={load} />
  if (corrections !== null && corrections.length === 0) return <EmptyState>{t('emptyLessons')}</EmptyState>

  const filtered = (corrections ?? []).filter(c => filter === 'all' || c.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', gap: space.sm, marginBottom: space.md, flexWrap: 'wrap' }}>
        {filterOptions.map(opt => {
          const active = filter === opt.key
          return (
            <button
              key={opt.key}
              className="lm-btn"
              onClick={() => setFilter(opt.key)}
              style={{
                ...style.btnPill,
                background: active ? C.accent : 'transparent',
                color: active ? C.textFg : C.secondary,
                borderColor: active ? C.accent : C.border,
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {filtered.map(c => (
        <CorrectionCard
          key={c.id}
          correction={c}
          t={t}
          highlighted={props.highlightId === c.id}
          onExtract={doExtract}
          onIgnore={setConfirmIgnore}
        />
      ))}
      {confirmIgnore !== null ? (
        <ConfirmDialog
          t={t}
          title={t('ignore')}
          message={t('ignoreConfirm')}
          confirmLabel={t('ignore')}
          danger
          onConfirm={() => { doIgnore(confirmIgnore); setConfirmIgnore(null) }}
          onClose={() => setConfirmIgnore(null)}
        />
      ) : null}
    </div>
  )
}
