// SPDX-License-Identifier: MIT
/**
 * The main panel shell: resizable scope sidebar, header with the master switch,
 * icon tab bar, and the active tab. Owns cross-cutting state (badges, toasts,
 * scope counts, active tab) and the settings modal.
 *
 * UX fixes vs. the old bundle:
 *  - Scope sidebar only drives / highlights on the Memories & Recall tabs
 *    (it is meaningless for Lessons / Rules / Persona), with an explicit hint.
 *  - The master switch carries a descriptive tooltip.
 *  - The redundant header overview strip is gone (counts already live on the
 *    tab badges and the sidebar stats).
 *  - Tabs and scopes get glyphs as visual anchors.
 *
 * @module @wwskills/dsh-long-memory/client/SettingsPanel
 */

import { useEffect, useRef, useState } from 'react'
import { C, style, space, font, radius, PANEL_CSS } from './theme.js'
import type { Translate, LocaleKey } from './locales.js'
import { Toast, Switch, useToasts } from './primitives.js'
import { SettingsModal } from './SettingsModal.js'
import { CorrectionsTab } from './tabs/CorrectionsTab.js'
import type { Badges } from './tabs/CorrectionsTab.js'
import { RulesTab } from './tabs/RulesTab.js'
import { MemoriesTab } from './tabs/MemoriesTab.js'
import { PersonaTab } from './tabs/PersonaTab.js'
import { RecallTab } from './tabs/RecallTab.js'
import * as api from './api.js'
import type { EmbeddingStatus } from './api.js'

type TabId = 'lessons' | 'rules' | 'memories' | 'persona' | 'recall'

const TABS: Array<{ id: TabId, icon: string, labelKey: LocaleKey, badge?: keyof Badges }> = [
  { id: 'lessons', icon: '🎓', labelKey: 'tabLessons', badge: 'lessons' },
  { id: 'rules', icon: '📏', labelKey: 'tabRules', badge: 'rules' },
  { id: 'memories', icon: '🧠', labelKey: 'tabMemories', badge: 'memories' },
  { id: 'persona', icon: '👤', labelKey: 'tabPersona', badge: 'persona' },
  { id: 'recall', icon: '🔍', labelKey: 'recallTab' },
]

const SCOPES: Array<{ id: string, labelKey: LocaleKey }> = [
  { id: 'all', labelKey: 'sidebarScopeAll' },
  { id: 'user', labelKey: 'sidebarScopeUser' },
  { id: 'project', labelKey: 'sidebarScopeProject' },
  { id: 'domain', labelKey: 'sidebarScopeDomain' },
  { id: 'episodic', labelKey: 'sidebarScopeEpisodic' },
]

/** Scope only affects these two tabs. */
const SCOPE_AWARE_TABS: TabId[] = ['memories', 'recall']

interface ScopeCounts { all: number, user: number, project: number, domain: number, episodic: number }

let cssInjected = false
function useInjectCss(): void {
  useEffect(() => {
    if (cssInjected) return
    const el = document.createElement('style')
    el.id = 'lm-panel-styles'
    el.textContent = PANEL_CSS
    document.head.appendChild(el)
    cssInjected = true
  }, [])
}

export function SettingsPanel(props: { t: Translate }): JSX.Element {
  const { t } = props
  useInjectCss()

  const [enabled, setEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('lessons')
  const [badges, setBadges] = useState<Badges>({ lessons: 0, rules: 0, memories: 0, persona: 0 })
  const [stats, setStats] = useState<api.Stats | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus | null>(null)

  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [selectedScope, setSelectedScope] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeCounts, setScopeCounts] = useState<ScopeCounts>({ all: 0, user: 0, project: 0, domain: 0, episodic: 0 })
  const [scopeCountsLoading, setScopeCountsLoading] = useState(true)
  const resizingRef = useRef(false)

  const { toasts, showToast, dismissToast } = useToasts()
  const scopeActive = SCOPE_AWARE_TABS.includes(activeTab)

  const refreshStats = (): void => {
    void api.getStats().then(data => {
      setStats(data)
      setBadges(prev => ({
        ...prev,
        lessons: data.corrections_pending ?? prev.lessons,
        rules: data.rules_proposed ?? prev.rules,
        memories: data.memories_active ?? prev.memories,
      }))
    }).catch(() => { /* best-effort */ })
  }

  const fetchScopeCounts = (): void => {
    setScopeCountsLoading(true)
    api.getStats().then(data => {
      const num = (...keys: string[]): number => {
        for (const k of keys) { const v = data[k]; if (typeof v === 'number' && v > 0) return v }
        return 0
      }
      const total = (data.memories_active ?? 0) + (data.memories_archived ?? 0)
      const sc: ScopeCounts = {
        all: total > 0 ? total : (data.memories_active ?? 0),
        user: num('memories_user', 'user', 'scope_user', 'user_count'),
        project: num('memories_project', 'project', 'scope_project', 'project_count'),
        domain: num('memories_domain', 'domain', 'scope_domain', 'domain_count'),
        episodic: num('memories_episodic', 'episodic', 'scope_episodic', 'episodic_count'),
      }
      if (sc.user === 0 && sc.project === 0 && sc.domain === 0 && sc.episodic === 0) {
        // Backend does not break counts down by scope — tally from the list.
        void api.listMemories({ limit: 200 }).then(list => {
          const counts: ScopeCounts = { all: list.length, user: 0, project: 0, domain: 0, episodic: 0 }
          for (const m of list) {
            if (m.scope === 'user') counts.user += 1
            else if (m.scope === 'project') counts.project += 1
            else if (m.scope === 'domain') counts.domain += 1
            else if (m.scope === 'episodic') counts.episodic += 1
          }
          setScopeCounts(counts)
          setScopeCountsLoading(false)
        }).catch(() => setScopeCountsLoading(false))
      } else {
        setScopeCounts(sc)
        setScopeCountsLoading(false)
      }
    }).catch(() => setScopeCountsLoading(false))
  }

  useEffect(() => {
    void api.getConfig().then(data => {
      if (data.enabled !== undefined) setEnabled(data.enabled)
      if (data.embeddingStatus !== undefined) setEmbeddingStatus(data.embeddingStatus)
    }).catch(() => { /* best-effort */ })
    refreshStats()
    fetchScopeCounts()
    const id = window.setInterval(refreshStats, 30000)
    return () => window.clearInterval(id)
  }, [])

  // Sidebar resize.
  useEffect(() => {
    let raf: number | null = null
    const onMove = (e: MouseEvent): void => {
      if (!resizingRef.current || raf !== null) return
      raf = requestAnimationFrame(() => { raf = null; setSidebarWidth(Math.max(160, Math.min(360, e.clientX))) })
    }
    const onUp = (): void => {
      if (resizingRef.current) { resizingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
      if (raf !== null) { cancelAnimationFrame(raf); raf = null }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (raf !== null) cancelAnimationFrame(raf) }
  }, [])

  const startResize = (e: React.MouseEvent): void => {
    e.preventDefault()
    resizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const toggleEnabled = (): void => {
    const next = !enabled
    setEnabled(next)
    void api.setEnabled(next).catch(() => showToast(t('loadFailed'), 'error'))
  }

  const selectScope = (scopeId: string): void => {
    setSelectedScope(scopeId)
    if (!scopeActive) setActiveTab('memories')
  }

  const onSidebarSearch = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return
    const q = e.currentTarget.value.trim()
    if (q === '') return
    setSearchQuery(q)
    setActiveTab('memories')
  }

  const renderTab = (): JSX.Element => {
    switch (activeTab) {
      case 'lessons':
        return <CorrectionsTab t={t} setBadges={setBadges} highlightId={highlightId} onClearHighlight={() => setHighlightId(null)} showToast={showToast} />
      case 'rules':
        return <RulesTab t={t} setBadges={setBadges} showToast={showToast} onJumpToCorrection={id => { setActiveTab('lessons'); setHighlightId(id) }} />
      case 'memories':
        return <MemoriesTab t={t} setBadges={setBadges} showToast={showToast} scopeFilter={selectedScope !== 'all' ? selectedScope : undefined} searchQuery={searchQuery !== '' ? searchQuery : undefined} />
      case 'persona':
        return <PersonaTab t={t} setBadges={setBadges} showToast={showToast} />
      case 'recall':
        return <RecallTab t={t} showToast={showToast} />
      default:
        return <></>
    }
  }

  return (
    <div className="lm-panel lm-scroll" style={{ ...style.root, width: '100%', height: '100%' }}>
      {/* ── Sidebar ── */}
      <aside style={{ ...style.sidebar, width: sidebarWidth }} className="lm-scroll">
        <div style={{ padding: space.md }}>
          <input
            style={{ ...style.input, height: 32, fontSize: font.sm }}
            placeholder={t('sidebarSearchPlaceholder')}
            defaultValue={searchQuery}
            onKeyDown={onSidebarSearch}
          />
        </div>
        <div style={{ padding: `0 ${space.md}px ${space.sm}px`, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SCOPES.map(sc => {
            const isActive = scopeActive && selectedScope === sc.id
            const count = scopeCounts[sc.id as keyof ScopeCounts] ?? 0
            return (
              <button
                key={sc.id}
                className="lm-scope lm-row"
                onClick={() => selectScope(sc.id)}
                title={!scopeActive ? t('sidebarScopeHint') : undefined}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: `6px ${space.md}px`, border: 'none', borderRadius: radius.sm,
                  background: isActive ? accentBg() : 'transparent',
                  color: isActive ? C.text : scopeActive ? C.secondary : C.tertiary,
                  fontSize: font.sm, cursor: 'pointer', width: '100%', lineHeight: '18px',
                  opacity: scopeActive ? 1 : 0.55,
                }}
              >
                <span>{t(sc.labelKey)}</span>
                <span style={{ fontSize: font.xs, color: C.tertiary }}>{scopeCountsLoading ? '…' : count}</span>
              </button>
            )
          })}
        </div>
        {!scopeActive ? (
          <div style={{ padding: `0 ${space.md}px ${space.sm}px`, fontSize: font.xs, color: C.tertiary, lineHeight: 1.5 }}>{t('sidebarScopeHint')}</div>
        ) : null}
        <div style={{ margin: `${space.xs}px ${space.md}px`, borderTop: `1px solid ${C.border}` }} />
        <div style={{ padding: `${space.sm}px ${space.md}px`, fontSize: font.xs, color: C.tertiary, display: 'flex', flexDirection: 'column', gap: space.xs }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('sidebarStatsMemories')}</span>
            <b style={{ color: C.text }}>{scopeCounts.all}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('sidebarStatsActive')}</span>
            <b style={{ color: C.success }}>{stats?.memories_active ?? 0}</b>
          </div>
        </div>
      </aside>

      <div className="lm-sash" onMouseDown={startResize} style={style.sash} title="drag to resize" />

      {/* ── Main ── */}
      <div style={style.main}>
        <div style={style.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: space.md }}>
            <h2 style={style.title}>{t('title')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
              <button className="lm-btn" style={{ ...style.btnOutline, height: 30 }} onClick={() => setSettingsOpen(true)}>⚙ {t('configBtn')}</button>
              <span style={{ display: 'flex', alignItems: 'center', gap: space.sm }} title={t('switchHint')}>
                <Switch checked={enabled} onChange={toggleEnabled} ariaLabel={enabled ? t('switchOn') : t('switchOff')} />
                <span style={{ fontSize: font.sm, color: enabled ? C.success : C.tertiary, fontWeight: 600 }}>{enabled ? t('switchOn') : t('switchOff')}</span>
              </span>
            </div>
          </div>
          <div role="tablist" style={{ display: 'flex', gap: space.xs }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              const badgeCount = tab.badge !== undefined ? badges[tab.badge] : 0
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  className="lm-tab"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: space.xs,
                    padding: `${space.sm}px ${space.md}px`, border: 'none', background: 'transparent',
                    borderBottom: `2px solid ${isActive ? C.accent : 'transparent'}`,
                    color: isActive ? C.accent : C.secondary, fontSize: font.md, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <span aria-hidden>{tab.icon}</span>
                  <span>{t(tab.labelKey)}</span>
                  {badgeCount > 0 ? <span style={style.countBadge}>{badgeCount}</span> : null}
                </button>
              )
            })}
          </div>
        </div>

        <div role="tabpanel" style={style.tabPanel} className="lm-scroll">
          {renderTab()}
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />

      {settingsOpen ? (
        <SettingsModal
          t={t}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => { refreshStats(); fetchScopeCounts() }}
          embeddingStatus={embeddingStatus}
          setEmbeddingStatus={setEmbeddingStatus}
        />
      ) : null}
    </div>
  )
}

function accentBg(): string {
  return 'color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 14%, transparent)'
}
