// SPDX-License-Identifier: MIT
/**
 * Settings modal: extraction params, persona frequency, embedding config, and
 * signal words. Loads /config lazily on open and saves the full payload.
 *
 * @module @wwskills/dsh-long-memory/client/SettingsModal
 */

import { useEffect, useState } from 'react'
import { C, style, space, font } from './theme.js'
import type { Translate } from './locales.js'
import { relativeTime } from './util.js'
import { Modal } from './primitives.js'
import * as api from './api.js'
import type { EmbeddingStatus } from './api.js'

interface Draft {
  enabled: boolean
  batchSize: number
  ruleThreshold: number
  ruleTokenBudget: number
  llmTimeoutMs: number
  model: string
  signalWordsText: string
  embedding: { autoDetect: boolean, ollamaBaseUrl: string, preferredModel: string, timeoutMs: number }
}

const DEFAULT_DRAFT: Draft = {
  enabled: true,
  batchSize: 3,
  ruleThreshold: 5,
  ruleTokenBudget: 800,
  llmTimeoutMs: 30000,
  model: '',
  signalWordsText: '',
  embedding: { autoDetect: true, ollamaBaseUrl: 'http://127.0.0.1:11434', preferredModel: 'bge-m3', timeoutMs: 1000 },
}

const DAY_MS = 86400000

export function SettingsModal(props: {
  t: Translate
  onClose: () => void
  onSaved: () => void
  embeddingStatus: EmbeddingStatus | null
  setEmbeddingStatus: (status: EmbeddingStatus) => void
}): JSX.Element {
  const { t } = props
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean, text: string } | null>(null)
  const [probeAt, setProbeAt] = useState<number | null>(null)

  useEffect(() => {
    api.getConfig().then(data => {
      setDraft({
        enabled: data.enabled !== false,
        batchSize: Number.isFinite(data.batchSize) ? Number(data.batchSize) : 3,
        ruleThreshold: Number.isFinite(data.ruleThreshold) ? Number(data.ruleThreshold) : 5,
        ruleTokenBudget: Number.isFinite(data.ruleTokenBudget) ? Number(data.ruleTokenBudget) : 800,
        llmTimeoutMs: Number.isFinite(data.llmTimeoutMs) ? Number(data.llmTimeoutMs) : 30000,
        model: typeof data.model === 'string' ? data.model : '',
        signalWordsText: Array.isArray(data.signalWords) ? data.signalWords.join(', ') : (typeof data.signalWords === 'string' ? data.signalWords : ''),
        embedding: {
          autoDetect: (data.embedding?.autoDetect as boolean | undefined) !== false,
          ollamaBaseUrl: (data.embedding?.ollamaBaseUrl as string | undefined) ?? 'http://127.0.0.1:11434',
          preferredModel: (data.embedding?.preferredModel as string | undefined) ?? 'bge-m3',
          timeoutMs: Number((data.embedding?.timeoutMs as number | undefined) ?? 1000),
        },
      })
      if (data.embeddingStatus !== undefined) { props.setEmbeddingStatus(data.embeddingStatus); setProbeAt(Date.now()) }
    }).catch(() => setMessage({ ok: false, text: t('loadFailed') }))
  }, [])

  const patch = (p: Partial<Draft>): void => setDraft(prev => ({ ...prev, ...p }))
  const patchEmbedding = (p: Partial<Draft['embedding']>): void => setDraft(prev => ({ ...prev, embedding: { ...prev.embedding, ...p } }))

  const save = (): void => {
    setSaving(true)
    setMessage(null)
    api.saveConfig({
      enabled: draft.enabled !== false,
      batchSize: Number(draft.batchSize) || 3,
      ruleThreshold: Number(draft.ruleThreshold) || 5,
      ruleTokenBudget: Number(draft.ruleTokenBudget) || 800,
      llmTimeoutMs: Number(draft.llmTimeoutMs) || 30000,
      model: draft.model || '',
      signalWords: draft.signalWordsText || '',
      embedding: {
        autoDetect: draft.embedding.autoDetect !== false,
        ollamaBaseUrl: draft.embedding.ollamaBaseUrl || 'http://127.0.0.1:11434',
        preferredModel: draft.embedding.preferredModel || 'bge-m3',
        timeoutMs: Number(draft.embedding.timeoutMs) || 1000,
      },
    })
      .then(data => {
        setSaving(false)
        setMessage({ ok: true, text: t('saveSuccess') })
        if (data.embeddingStatus !== undefined) { props.setEmbeddingStatus(data.embeddingStatus); setProbeAt(Date.now()) }
        props.onSaved()
        window.setTimeout(() => setMessage(null), 2500)
      })
      .catch((e: unknown) => { setSaving(false); setMessage({ ok: false, text: `${t('saveFailed')}${e instanceof Error ? ` (${e.message})` : ''}` }) })
  }

  const testEmbedding = (): void => {
    setTesting(true)
    api.probeEmbedding()
      .then(data => {
        setTesting(false)
        if (data.embeddingStatus !== undefined) {
          props.setEmbeddingStatus(data.embeddingStatus)
          setProbeAt(Date.now())
          const ok = data.embeddingStatus.mode === 'enabled'
          setMessage({ ok, text: ok ? t('embeddingTestOk') : t('embeddingTestFail') })
        }
        window.setTimeout(() => setMessage(null), 2500)
      })
      .catch((e: unknown) => { setTesting(false); setMessage({ ok: false, text: `${t('embeddingTestFail')}${e instanceof Error ? ` (${e.message})` : ''}` }) })
  }

  const embeddingStatusLabel = (): string => {
    const st = props.embeddingStatus
    if (st === null) return `${t('embeddingProbeAt')}: —`
    const base = st.mode === 'enabled' ? `${String(st.model ?? 'embedding')} ${t('embeddingEnabled')}`
      : st.mode === 'keyword' ? t('embeddingKeyword') : t('embeddingDisabled')
    return probeAt !== null ? `${base} (${t('embeddingProbeAt')}: ${relativeTime(probeAt, t)})` : base
  }

  const statusColor = message !== null ? (message.ok ? C.success : C.danger)
    : props.embeddingStatus?.mode === 'enabled' ? C.success
      : props.embeddingStatus?.mode === 'keyword' ? C.accent : C.tertiary

  const field = (label: string, node: JSX.Element): JSX.Element => (
    <div>
      <div style={style.label}>{label}</div>
      {node}
    </div>
  )
  const numberInput = (value: number, on: (n: number) => void, min?: number, max?: number, step?: number): JSX.Element => (
    <input type="number" style={style.input} value={value} min={min} max={max} step={step} onChange={e => on(Number(e.target.value))} />
  )

  const cardBox = { ...style.card, ...style.cardPad, marginBottom: space.md } as const

  return (
    <Modal
      title={t('settingsTitle')}
      onClose={props.onClose}
      width={620}
      footer={
        <>
          <span style={{ flex: 1, fontSize: font.sm, color: statusColor, alignSelf: 'center', textAlign: 'left' }}>
            {message !== null ? message.text : `${t('embeddingStatus')}: ${embeddingStatusLabel()}`}
          </span>
          <button className="lm-btn" style={style.btnOutline} onClick={props.onClose}>{t('cancel')}</button>
          <button className="lm-primary" style={style.btnPrimary} disabled={saving} onClick={save}>{saving ? t('saving') : t('saveConfig')}</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '60vh', overflowY: 'auto', paddingRight: space.xs }}>
        <div style={cardBox}>
          <div style={{ ...style.sectionTitle, fontSize: font.md, marginBottom: space.md }}>{t('configExtract')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.md }}>
            {field(t('batchSize'), numberInput(draft.batchSize, n => patch({ batchSize: n }), 1, 100))}
            {field(t('promoteThreshold'), numberInput(draft.ruleThreshold, n => patch({ ruleThreshold: n }), 1, 100))}
            {field(`${t('llmTimeout')} (${t('llmTimeoutUnit')})`, numberInput(draft.llmTimeoutMs, n => patch({ llmTimeoutMs: n }), 1000, undefined, 1000))}
            {field(t('modelSelect'), <input style={style.input} value={draft.model} placeholder={t('modelFollowCurrent')} onChange={e => patch({ model: e.target.value })} />)}
          </div>
        </div>

        <div style={cardBox}>
          <div style={{ ...style.sectionTitle, fontSize: font.md, marginBottom: space.md }}>{t('embedding')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.md }}>
            {field(t('embedding'), (
              <select style={style.input} value={draft.embedding.autoDetect ? 'auto' : 'none'} onChange={e => patchEmbedding({ autoDetect: e.target.value === 'auto' })}>
                <option value="auto">{t('embeddingAuto')}</option>
                <option value="none">{t('embeddingNone')}</option>
              </select>
            ))}
            {field(t('embeddingModelLabel'), <input style={style.input} value={draft.embedding.preferredModel} onChange={e => patchEmbedding({ preferredModel: e.target.value })} />)}
            <div style={{ gridColumn: '1 / -1' }}>
              {field(t('embeddingBaseUrlLabel'), <input style={style.input} value={draft.embedding.ollamaBaseUrl} onChange={e => patchEmbedding({ ollamaBaseUrl: e.target.value })} />)}
            </div>
            {field(`${t('embeddingTimeoutLabel')} (${t('llmTimeoutUnit')})`, numberInput(draft.embedding.timeoutMs, n => patchEmbedding({ timeoutMs: n }), 100, undefined, 100))}
            <div style={{ alignSelf: 'end' }}>
              <button className="lm-btn" style={style.btnOutline} disabled={testing} onClick={testEmbedding}>{testing ? t('embeddingTesting') : t('embeddingTest')}</button>
            </div>
          </div>
        </div>

        <div style={cardBox}>
          <div style={style.label}>{t('correctionSignals')}</div>
          <textarea style={{ ...style.textarea, minHeight: 56 }} value={draft.signalWordsText} placeholder={t('signalWordsPlaceholder')} onChange={e => patch({ signalWordsText: e.target.value })} />
          <div style={style.desc}>{t('signalWordsHint')}</div>
        </div>
      </div>
    </Modal>
  )
}
