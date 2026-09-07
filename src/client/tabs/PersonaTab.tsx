// SPDX-License-Identifier: MIT
/**
 * Persona tab: renders the four persona dimensions derived from USER memories,
 * each editable, with a rebuild action.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/PersonaTab
 */

import { useEffect, useState } from 'react'
import { C, style, space, font } from '../theme.js'
import type { Translate } from '../locales.js'
import { personaDims, confidenceColor } from '../meta.js'
import { relativeTime } from '../util.js'
import { SkeletonList, EmptyState, ErrorState, Modal, ConfidenceBar } from '../primitives.js'
import * as api from '../api.js'
import type { Badges } from './CorrectionsTab.js'

interface PersonaEntry { key: string, value?: string, confidence?: number, updated_at?: number }

function normalizePersona(raw: unknown): Record<string, PersonaEntry> {
  const out: Record<string, PersonaEntry> = {}
  if (Array.isArray(raw)) {
    for (const item of raw as PersonaEntry[]) {
      if (item !== null && typeof item === 'object' && typeof item.key === 'string') out[item.key] = item
    }
  } else if (raw !== null && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const persona = (record.persona !== undefined && typeof record.persona === 'object') ? record.persona as Record<string, unknown> : record
    for (const [key, value] of Object.entries(persona)) {
      if (value !== null && typeof value === 'object') out[key] = { key, ...(value as Omit<PersonaEntry, 'key'>) }
      else if (typeof value === 'string') out[key] = { key, value }
    }
  }
  return out
}

function PersonaEditModal(props: { dimKey: string, label: string, initialValue: string, t: Translate, onSave: (value: string) => void, onClose: () => void }): JSX.Element {
  const { t } = props
  const [value, setValue] = useState(props.initialValue)
  return (
    <Modal
      title={`${t('personaEditValue')} · ${props.label}`}
      onClose={props.onClose}
      footer={
        <>
          <button className="lm-btn" style={style.btnOutline} onClick={props.onClose}>{t('cancel')}</button>
          <button className="lm-primary" style={style.btnPrimary} onClick={() => props.onSave(value)}>{t('save')}</button>
        </>
      }
    >
      <div style={style.label}>{t('personaValueLabel')}</div>
      <textarea style={style.textarea} value={value} placeholder={t('personaValuePlaceholder')} onChange={e => setValue(e.target.value)} />
    </Modal>
  )
}

export function PersonaTab(props: {
  t: Translate
  setBadges: (fn: (prev: Badges) => Badges) => void
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}): JSX.Element {
  const { t } = props
  const [persona, setPersona] = useState<Record<string, PersonaEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rebuilding, setRebuilding] = useState(false)
  const [editing, setEditing] = useState<{ key: string, label: string, value: string } | null>(null)

  const load = (): void => {
    setLoading(true)
    setError(null)
    api.getPersona()
      .then(raw => {
        const map = normalizePersona(raw)
        setPersona(map)
        const filled = personaDims.filter(d => (map[d.key]?.value ?? '') !== '').length
        props.setBadges(prev => ({ ...prev, persona: filled }))
        setLoading(false)
      })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const doRebuild = (): void => {
    setRebuilding(true)
    api.rebuildPersona()
      .then(() => { setRebuilding(false); load() })
      .catch(() => { setRebuilding(false); props.showToast(t('loadFailed'), 'error') })
  }
  const doSave = (key: string, value: string): void => {
    api.savePersonaDim(key, value)
      .then(() => { setEditing(null); load() })
      .catch(() => props.showToast(t('loadFailed'), 'error'))
  }

  if (loading) return <SkeletonList count={4} />
  if (error !== null) return <ErrorState t={t} message={error} onRetry={load} />

  const lastUpdated = Math.max(0, ...personaDims.map(d => persona[d.key]?.updated_at ?? 0))
  const allEmpty = personaDims.every(d => (persona[d.key]?.value ?? '') === '')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg }}>
        <span style={{ fontSize: font.xs, color: C.tertiary }}>
          {t('personaLastUpdated')}: {lastUpdated > 0 ? relativeTime(lastUpdated, t) : t('never')}
        </span>
        <button className="lm-btn" style={style.btnOutline} disabled={rebuilding} onClick={doRebuild}>
          {rebuilding ? `⏳ ${t('personaRebuilding')}` : `🔄 ${t('personaRebuild')}`}
        </button>
      </div>

      {allEmpty ? <EmptyState>{t('personaEmptyHint')}</EmptyState> : null}

      {personaDims.map(dim => {
        const entry = persona[dim.key]
        const value = entry?.value ?? ''
        const confidence = entry?.confidence ?? 0
        return (
          <div key={dim.key} className="lm-card" style={{ ...style.card, ...style.cardPad, marginBottom: space.sm }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: space.xs, fontSize: font.md, fontWeight: 600, color: C.text }}>
                <span aria-hidden>{dim.icon}</span>{t(dim.labelKey)}
              </span>
              <button className="lm-iconbtn" style={style.iconBtn} aria-label={t('personaEditValue')} onClick={() => setEditing({ key: dim.key, label: t(dim.labelKey), value })}>✏️</button>
            </div>
            <div style={{ fontSize: font.md, color: value !== '' ? C.text : C.tertiary, lineHeight: 1.6, marginBottom: value !== '' ? space.sm : 0, wordBreak: 'break-word' }}>
              {value !== '' ? value : t('personaEmpty')}
            </div>
            {value !== '' ? <ConfidenceBar value={confidence} color={confidenceColor(confidence)} /> : null}
          </div>
        )
      })}

      {editing !== null ? (
        <PersonaEditModal dimKey={editing.key} label={editing.label} initialValue={editing.value} t={t} onSave={v => doSave(editing.key, v)} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  )
}
