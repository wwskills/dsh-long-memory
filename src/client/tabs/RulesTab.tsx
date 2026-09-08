// SPDX-License-Identifier: MIT
/**
 * Rules tab: pending + approved sections, each rule card with approve / reject
 * / edit / promote. Reject and conflict warnings now use ConfirmDialog instead
 * of window.confirm/prompt.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/RulesTab
 */

import { useEffect, useState } from 'react'
import { C, style, space, font, codeBlockStyle } from '../theme.js'
import type { Translate, LocaleKey } from '../locales.js'
import { categoryMeta } from '../meta.js'
import { relativeTime, parseTags } from '../util.js'
import { SkeletonList, EmptyState, ErrorState, ConfirmDialog, Modal, Chip } from '../primitives.js'
import * as api from '../api.js'
import type { Rule } from '../api.js'
import type { Badges } from './CorrectionsTab.js'

const CATEGORY_KEYS = ['coding', 'communication', 'workflow', 'safety'] as const
const PROMOTE_HIT_THRESHOLD = 20

function ruleSources(rule: Rule): string[] {
  return rule.source_correction_ids ?? rule.correction_ids ?? rule.sources ?? []
}

function RuleCard(props: {
  rule: Rule
  kind: 'pending' | 'approved'
  t: Translate
  busy: boolean
  onApprove: (r: Rule) => void
  onReject: (r: Rule) => void
  onEdit: (r: Rule) => void
  onPromote: (r: Rule) => void
  onJumpToCorrection: (id: string) => void
}): JSX.Element {
  const { rule, t } = props
  const cat = categoryMeta(rule.category)
  const tags = parseTags(rule.tags)
  const sources = ruleSources(rule)
  const shownSources = sources.slice(0, 3)

  return (
    <div className="lm-card" style={{ ...style.card, ...style.cardPad, marginBottom: space.sm }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.xs, flexWrap: 'wrap', marginBottom: space.sm }}>
        <Chip icon={cat.icon} label={t(cat.labelKey)} fg={cat.fg} bg={cat.bg} border={cat.border} />
        {tags.map(tag => <Chip key={tag} label={`#${tag}`} />)}
      </div>
      <div style={{ fontSize: font.md, color: C.text, lineHeight: 1.6, marginBottom: space.sm }}>{rule.content}</div>

      {props.kind === 'approved' ? (
        <div style={{ display: 'flex', gap: space.lg, fontSize: font.xs, color: C.tertiary, marginBottom: space.sm }}>
          <span>{t('hitCount')}: <b style={{ color: C.text }}>{rule.hit_count ?? 0}</b></span>
          <span>{t('lastHit')}: {rule.last_hit_at !== undefined && rule.last_hit_at > 0 ? relativeTime(rule.last_hit_at, t) : t('never')}</span>
        </div>
      ) : null}

      {sources.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: space.xs, flexWrap: 'wrap', marginBottom: space.sm, fontSize: font.xs, color: C.tertiary }}>
          <span aria-hidden>🔗</span>
          <span>{t('ruleSource')}:</span>
          {shownSources.map(id => (
            <button
              key={id}
              className="lm-btn"
              style={{ ...style.btnPill, height: 20, fontSize: font.xs, padding: `0 ${space.sm}px` }}
              onClick={() => props.onJumpToCorrection(id)}
            >
              {id.length > 10 ? `${id.slice(0, 10)}…` : id}
            </button>
          ))}
          {sources.length > 3 ? <span>{t('moreSource', { n: sources.length - 3 })}</span> : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: space.sm }}>
        {props.kind === 'pending' ? (
          <>
            <button className="lm-btn lm-danger" style={style.btnDanger} disabled={props.busy} onClick={() => props.onReject(rule)}>{t('reject')}</button>
            <button className="lm-btn" style={style.btnOutline} disabled={props.busy} onClick={() => props.onEdit(rule)}>{t('edit')}</button>
            <button className="lm-primary" style={style.btnPrimary} disabled={props.busy} onClick={() => props.onApprove(rule)}>{t('approve')}</button>
          </>
        ) : (
          <>
            <button className="lm-btn" style={style.btnOutline} disabled={props.busy} onClick={() => props.onEdit(rule)}>{t('edit')}</button>
            {(rule.hit_count ?? 0) > PROMOTE_HIT_THRESHOLD ? (
              <button className="lm-btn" style={{ ...style.btnOutline, color: C.warn, borderColor: C.warn }} disabled={props.busy} onClick={() => props.onPromote(rule)}>
                ⭐ {t('graduable')}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function EditModal(props: { rule: Rule, t: Translate, onSave: (patch: { content: string, category: string, tags: string[] }) => Promise<void>, onClose: () => void }): JSX.Element {
  const { t } = props
  const [content, setContent] = useState(props.rule.content)
  const [category, setCategory] = useState(props.rule.category || 'coding')
  const [tagsStr, setTagsStr] = useState(parseTags(props.rule.tags).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = (): void => {
    if (content.trim() === '') { setError(t('contentRequired')); return }
    setSaving(true)
    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean)
    props.onSave({ content: content.trim(), category, tags })
      .then(() => props.onClose())
      .catch((e: unknown) => { setSaving(false); setError(e instanceof Error ? e.message : String(e)) })
  }

  return (
    <Modal
      title={t('editRule')}
      onClose={props.onClose}
      footer={
        <>
          <button className="lm-btn" style={style.btnOutline} onClick={props.onClose} disabled={saving}>{t('cancel')}</button>
          <button className="lm-primary" style={style.btnPrimary} onClick={save} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>
      }
    >
      <div style={{ marginBottom: space.md }}>
        <div style={style.label}>{t('contentLabel')}</div>
        <textarea style={style.textarea} value={content} placeholder={t('contentPlaceholder')} onChange={e => setContent(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.md, marginBottom: space.md }}>
        <div>
          <div style={style.label}>{t('category')}</div>
          <select style={style.input} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_KEYS.map(k => <option key={k} value={k}>{categoryMeta(k).icon} {t(`category${k.charAt(0).toUpperCase()}${k.slice(1)}` as LocaleKey)}</option>)}
          </select>
        </div>
        <div>
          <div style={style.label}>{t('tagsLabel')}</div>
          <input style={style.input} value={tagsStr} placeholder={t('tagsHint')} onChange={e => setTagsStr(e.target.value)} />
        </div>
      </div>
      {error !== null ? <div style={{ fontSize: font.sm, color: C.danger }}>{error}</div> : null}
    </Modal>
  )
}

function PromoteModal(props: { rule: Rule, t: Translate, onClose: () => void }): JSX.Element {
  const { t } = props
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.promoteRule(props.rule.id)
      .then(text => setDraft(text))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [props.rule.id])

  const copy = (): void => {
    if (draft === null) return
    void navigator.clipboard.writeText(draft).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* clipboard unavailable */ })
  }

  return (
    <Modal
      title={t('promoteRule')}
      onClose={props.onClose}
      width={600}
      footer={<button className="lm-primary" style={style.btnPrimary} onClick={copy} disabled={draft === null}>{copied ? t('copied') : t('copy')}</button>}
    >
      <p style={{ fontSize: font.sm, color: C.tertiary, marginTop: 0, marginBottom: space.md }}>{t('promoteHint')}</p>
      {error !== null ? <div style={{ fontSize: font.sm, color: C.danger }}>{error}</div>
        : draft === null ? <div style={{ fontSize: font.md, color: C.tertiary }}>{t('promoteLoading')}</div>
          : <pre style={codeBlockStyle}>{draft}</pre>}
    </Modal>
  )
}

export function RulesTab(props: {
  t: Translate
  setBadges: (fn: (prev: Badges) => Badges) => void
  onJumpToCorrection: (id: string) => void
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}): JSX.Element {
  const { t } = props
  const [pending, setPending] = useState<Rule[]>([])
  const [approved, setApproved] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [promoting, setPromoting] = useState<Rule | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Rule | null>(null)
  const [conflict, setConflict] = useState<{ rule: Rule, body: string } | null>(null)

  const refreshBadges = (): void => {
    void api.getStats().then(data => props.setBadges(prev => ({ ...prev, rules: data.rules_proposed ?? 0 }))).catch(() => { /* best-effort */ })
  }

  const load = (): void => {
    setLoading(true)
    setError(null)
    Promise.all([api.listRules('proposed'), api.listRules('approved')])
      .then(([p, a]) => { setPending(p); setApproved(a); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const finishApprove = (rule: Rule): void => {
    setBusyId(rule.id)
    api.approveRule(rule.id)
      .then(data => {
        const conflicts = data?.warning?.conflicts
        if (Array.isArray(conflicts) && conflicts.length > 0) {
          const list = conflicts.map(c => `• [${Math.round((c.overlap ?? 0) * 100)}%] ${c.content}`).join('\n')
          setConflict({ rule, body: t('conflictWarningBody', { n: conflicts.length, list }) })
        }
        setBusyId(null)
        load(); refreshBadges()
      })
      .catch(() => { setBusyId(null); props.showToast(t('loadFailed'), 'error') })
  }

  const doReject = (rule: Rule): void => {
    setBusyId(rule.id)
    api.rejectRule(rule.id)
      .then(() => { setBusyId(null); load(); refreshBadges() })
      .catch(() => { setBusyId(null); props.showToast(t('loadFailed'), 'error') })
  }

  const saveEdit = (patch: { content: string, category: string, tags: string[] }): Promise<void> => {
    if (editing === null) return Promise.reject(new Error('no rule'))
    return api.updateRule(editing.id, patch).then(() => { load(); refreshBadges() })
  }

  if (loading) return <SkeletonList count={4} />
  if (error !== null) return <ErrorState t={t} message={error} onRetry={load} />

  const sectionHeader = (label: string, count: number): JSX.Element => (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, margin: `${space.sm}px 0 ${space.md}px`, fontSize: font.md, fontWeight: 600, color: C.text }}>
      <span>{label}</span>
      <span style={{ fontSize: font.xs, color: C.tertiary, fontWeight: 500 }}>{count}</span>
    </div>
  )

  return (
    <div>
      {sectionHeader(t('rulePending'), pending.length)}
      {pending.length === 0 ? <EmptyState>{t('emptyRules')}</EmptyState>
        : pending.map(r => (
          <RuleCard key={r.id} rule={r} kind="pending" t={t} busy={busyId === r.id}
            onApprove={finishApprove} onReject={setRejectTarget} onEdit={setEditing} onPromote={setPromoting} onJumpToCorrection={props.onJumpToCorrection} />
        ))}

      <div style={{ height: 1, background: C.border, margin: `${space.lg}px 0` }} />

      {sectionHeader(t('ruleApproved'), approved.length)}
      {approved.length === 0 ? <EmptyState>{t('emptyApproved')}</EmptyState>
        : approved.map(r => (
          <RuleCard key={r.id} rule={r} kind="approved" t={t} busy={busyId === r.id}
            onApprove={finishApprove} onReject={setRejectTarget} onEdit={setEditing} onPromote={setPromoting} onJumpToCorrection={props.onJumpToCorrection} />
        ))}

      {editing !== null ? <EditModal rule={editing} t={t} onSave={saveEdit} onClose={() => setEditing(null)} /> : null}
      {promoting !== null ? <PromoteModal rule={promoting} t={t} onClose={() => setPromoting(null)} /> : null}
      {rejectTarget !== null ? (
        <ConfirmDialog t={t} title={t('reject')} message={t('rejectConfirm')} confirmLabel={t('reject')} danger
          onConfirm={() => { doReject(rejectTarget); setRejectTarget(null) }} onClose={() => setRejectTarget(null)} />
      ) : null}
      {conflict !== null ? (
        <ConfirmDialog t={t} title={t('conflictWarningTitle')} message={conflict.body} confirmLabel={t('confirm')}
          onConfirm={() => setConflict(null)} onClose={() => setConflict(null)} />
      ) : null}
    </div>
  )
}
