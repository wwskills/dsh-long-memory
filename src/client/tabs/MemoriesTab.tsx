// SPDX-License-Identifier: MIT
/**
 * Memories tab: filterable list of memories with archive / delete. Delete now
 * opens a themed dialog (with reason + hard-delete toggle for user scope)
 * instead of stacked window.confirm/prompt calls.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/MemoriesTab
 */

import { useEffect, useRef, useState } from 'react'
import { C, style, space, font } from '../theme.js'
import type { Translate } from '../locales.js'
import { memoryTypeMeta, memoryTypeFallback, memoryOriginMeta, memoryOriginFallback, confidenceColor } from '../meta.js'
import { relativeTime, parseTags } from '../util.js'
import { SkeletonList, EmptyState, ErrorState, Modal, PopoverMenu, ConfidenceBar, Chip } from '../primitives.js'
import * as api from '../api.js'
import type { Memory } from '../api.js'
import type { Badges } from './CorrectionsTab.js'

const STATUS_KEYS = ['all', 'active', 'archived', 'superseded'] as const
const TYPE_KEYS = ['all', 'USER', 'PREFERENCE', 'PROJECT', 'FACT', 'SKILL', 'EVENT', 'TASK'] as const

function MemoryCard(props: {
  memory: Memory
  t: Translate
  onArchive: (m: Memory) => void
  onDelete: (m: Memory) => void
}): JSX.Element {
  const { memory: m, t } = props
  const [hover, setHover] = useState(false)
  const typeMeta = memoryTypeMeta[m.type] ?? memoryTypeFallback
  const originMeta = memoryOriginMeta[m.origin ?? ''] ?? memoryOriginFallback
  const isArchived = m.status === 'archived'
  const tags = parseTags(m.tags)
  const confidence = m.confidence ?? 0

  return (
    <div
      className="lm-card"
      style={{ ...style.card, ...style.cardPad, marginBottom: space.sm, position: 'relative', opacity: isArchived ? 0.6 : 1 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: space.xs, flexWrap: 'wrap', marginBottom: space.sm, paddingRight: 28 }}>
        <Chip icon={typeMeta.icon} label={typeMeta.labelKey !== null ? t(typeMeta.labelKey) : m.type} fg={typeMeta.fg} />
        <Chip icon="📍" label={m.scope} />
        {m.status !== 'active' ? <Chip label={t(m.status === 'archived' ? 'memStatusArchived' : 'memStatusSuperseded')} /> : null}
      </div>
      {!isArchived ? (
        <div style={{ position: 'absolute', top: space.sm, right: space.sm }}>
          <PopoverMenu
            visible={hover}
            items={[
              { icon: '📦', label: t('memArchive'), onClick: () => props.onArchive(m) },
              { icon: '🗑', label: t('memDelete'), danger: true, onClick: () => props.onDelete(m) },
            ]}
          />
        </div>
      ) : null}

      <div style={{ fontSize: font.md, color: C.text, lineHeight: 1.6, marginBottom: space.sm, wordBreak: 'break-word' }}>{m.content}</div>

      <div style={{ marginBottom: space.sm }}>
        <ConfidenceBar value={confidence} color={confidenceColor(confidence)} label={t('memWeight')} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: space.lg, fontSize: font.xs, color: C.tertiary, flexWrap: 'wrap' }}>
        <span>{originMeta.icon} {originMeta.labelKey !== null ? t(originMeta.labelKey) : m.origin}</span>
        <span>{t('memAccess')}: {m.access_count ?? 0}</span>
        {m.observed_at !== undefined ? <span>{relativeTime(m.observed_at, t)}</span> : null}
        {tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>
    </div>
  )
}

function DeleteDialog(props: { memory: Memory, t: Translate, onConfirm: (hard: boolean, reason: string) => void, onClose: () => void }): JSX.Element {
  const { t } = props
  const isUser = props.memory.scope === 'user'
  const [reason, setReason] = useState('')
  const [hard, setHard] = useState(false)
  const canConfirm = !isUser || reason.trim() !== ''

  return (
    <Modal
      title={t('memDelete')}
      onClose={props.onClose}
      width={440}
      footer={
        <>
          <button className="lm-btn" style={style.btnOutline} onClick={props.onClose}>{t('cancel')}</button>
          <button className="lm-primary" style={{ ...style.btnPrimary, background: C.danger }} disabled={!canConfirm} onClick={() => props.onConfirm(hard, reason.trim())}>
            {t('memDelete')}
          </button>
        </>
      }
    >
      <div style={{ fontSize: font.md, color: C.secondary, lineHeight: 1.6, marginBottom: space.md }}>{t('memDeleteConfirm')}</div>
      {isUser ? (
        <div style={{ marginBottom: space.md }}>
          <div style={style.label}>{t('memDeleteReasonLabel')}</div>
          <input style={style.input} value={reason} placeholder={t('memDeleteReasonPlaceholder')} onChange={e => setReason(e.target.value)} />
          <div style={style.desc}>{t('memDeleteReasonHint')}</div>
        </div>
      ) : null}
      <label style={{ display: 'flex', alignItems: 'center', gap: space.sm, fontSize: font.sm, color: C.secondary, cursor: 'pointer' }}>
        <input type="checkbox" checked={hard} onChange={e => setHard(e.target.checked)} />
        {t('memHardDeleteLabel')}
      </label>
    </Modal>
  )
}

export function MemoriesTab(props: {
  t: Translate
  setBadges: (fn: (prev: Badges) => Badges) => void
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
  scopeFilter?: string
  searchQuery?: string
}): JSX.Element {
  const { t } = props
  const [memories, setMemories] = useState<Memory[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState(props.scopeFilter ?? 'all')
  const [searchInput, setSearchInput] = useState(props.searchQuery ?? '')
  const [activeSearch, setActiveSearch] = useState(props.searchQuery ?? '')
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null)
  const debounceRef = useRef<number | null>(null)

  // Keep in sync with sidebar-driven props.
  useEffect(() => { setScopeFilter(props.scopeFilter ?? 'all') }, [props.scopeFilter])
  useEffect(() => {
    setSearchInput(props.searchQuery ?? '')
    setActiveSearch(props.searchQuery ?? '')
  }, [props.searchQuery])

  const searching = activeSearch.trim() !== ''

  const refreshBadges = (): void => {
    void api.listMemories({ status: 'active', limit: 200 })
      .then(list => props.setBadges(prev => ({ ...prev, memories: list.length })))
      .catch(() => { /* best-effort */ })
  }

  const load = (): void => {
    setLoading(true)
    setError(null)
    api.listMemories({
      q: searching ? activeSearch.trim() : undefined,
      scope: scopeFilter,
      type: typeFilter,
      status: statusFilter,
    })
      .then(list => { setMemories(list); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false) })
  }

  useEffect(() => { load(); refreshBadges() }, [statusFilter, typeFilter, scopeFilter, activeSearch])

  const onSearchInput = (value: string): void => {
    setSearchInput(value)
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => setActiveSearch(value), 300)
  }

  const doArchive = (m: Memory): void => {
    api.archiveMemory(m.id)
      .then(() => { props.showToast(t('memArchiveSuccess')); load(); refreshBadges() })
      .catch(() => props.showToast(t('loadFailed'), 'error'))
  }
  const doDelete = (m: Memory, hard: boolean, reason: string): void => {
    api.deleteMemory(m.id, hard, reason)
      .then(() => { props.showToast(t('memDeleteSuccess')); load(); refreshBadges() })
      .catch(() => props.showToast(t('loadFailed'), 'error'))
  }

  const selectStyle = { ...style.input, width: 'auto', minWidth: 120 }

  return (
    <div>
      <div style={{ display: 'flex', gap: space.sm, marginBottom: space.md, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            style={style.input}
            value={searchInput}
            placeholder={t('sidebarSearchPlaceholder')}
            onChange={e => onSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setActiveSearch(searchInput) }}
          />
          {searchInput !== '' ? (
            <button className="lm-iconbtn" style={{ ...style.iconBtn, position: 'absolute', right: 4, top: 4 }} onClick={() => { setSearchInput(''); setActiveSearch('') }} aria-label="clear">×</button>
          ) : null}
        </div>
        <select style={selectStyle} value={scopeFilter} onChange={e => setScopeFilter(e.target.value)} aria-label="scope">
          <option value="all">{t('memScopeAll')}</option>
          <option value="user">{t('memScopeUser')}</option>
          <option value="project">{t('memScopeProject')}</option>
          <option value="domain">{t('memScopeDomain')}</option>
          <option value="episodic">{t('memScopeEpisodic')}</option>
        </select>
        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} disabled={searching} aria-label={t('memFilterStatus')}>
          {STATUS_KEYS.map(s => <option key={s} value={s}>{s === 'all' ? t('filterAll') : t(`memStatus${s.charAt(0).toUpperCase()}${s.slice(1)}` as 'memStatusActive')}</option>)}
        </select>
        <select style={selectStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} disabled={searching} aria-label={t('memFilterType')}>
          {TYPE_KEYS.map(ty => <option key={ty} value={ty}>{ty === 'all' ? t('filterAll') : ty}</option>)}
        </select>
      </div>

      {searching ? <div style={{ fontSize: font.xs, color: C.tertiary, marginBottom: space.sm }}>🔍 FTS5: {activeSearch}</div> : null}

      {loading ? <SkeletonList count={3} />
        : error !== null ? <ErrorState t={t} message={error} onRetry={load} />
          : memories !== null && memories.length === 0 ? <EmptyState>{searching ? t('memNoResults') : t('emptyMemories')}</EmptyState>
            : (memories ?? []).map(m => <MemoryCard key={m.id} memory={m} t={t} onArchive={doArchive} onDelete={setDeleteTarget} />)}

      {deleteTarget !== null ? (
        <DeleteDialog
          memory={deleteTarget}
          t={t}
          onConfirm={(hard, reason) => { doDelete(deleteTarget, hard, reason); setDeleteTarget(null) }}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
