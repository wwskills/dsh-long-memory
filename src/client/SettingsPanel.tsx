// SPDX-License-Identifier: MIT
/**
 * The main panel shell: header with the master switch,
 * tab bar, and the active tab. Owns cross-cutting state (badges, toasts,
 * active tab) and the settings modal.
 *
 * Tab/button styles aligned to DSH native _button_cfgyt / _pill_e3ygd.
 *
 * @module @wwskills/dsh-long-memory/client/SettingsPanel
 */

import { useEffect, useState } from 'react'
import { C, style, space, font, PANEL_CSS } from './theme.js'
import type { Translate, LocaleKey } from './locales.js'
import { Toast, Switch, useToasts } from './primitives.js'
import { SettingsModal } from './SettingsModal.js'
import { CorrectionsTab } from './tabs/CorrectionsTab.js'
import type { Badges } from './tabs/CorrectionsTab.js'
import { RulesTab } from './tabs/RulesTab.js'
import { RecallTab } from './tabs/RecallTab.js'
import * as api from './api.js'
import type { EmbeddingStatus } from './api.js'

type TabId = 'lessons' | 'rules' | 'recall'

const TABS: Array<{ id: TabId, labelKey: LocaleKey, badge?: keyof Badges }> = [
  { id: 'lessons', labelKey: 'tabLessons', badge: 'lessons' },
  { id: 'rules', labelKey: 'tabRules', badge: 'rules' },
  { id: 'recall', labelKey: 'recallTab' },
]

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
  const [badges, setBadges] = useState<Badges>({ lessons: 0, rules: 0 })
  const [stats, setStats] = useState<api.Stats | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus | null>(null)

  const { toasts, showToast, dismissToast } = useToasts()

  const refreshStats = (): void => {
    void api.getStats().then(data => {
      setStats(data)
      setBadges(prev => ({
        ...prev,
        lessons: data.corrections_pending ?? prev.lessons,
        rules: data.rules_proposed ?? prev.rules,
      }))
    }).catch(() => { /* best-effort */ })
  }

  const toggleEnabled = (): void => {
    const next = !enabled
    setEnabled(next)
    void api.setEnabled(next).catch(() => showToast(t('loadFailed'), 'error'))
  }

  const renderTab = (): JSX.Element => {
    switch (activeTab) {
      case 'lessons':
        return <CorrectionsTab t={t} setBadges={setBadges} highlightId={highlightId} onClearHighlight={() => setHighlightId(null)} showToast={showToast} />
      case 'rules':
        return <RulesTab t={t} setBadges={setBadges} showToast={showToast} onJumpToCorrection={id => { setActiveTab('lessons'); setHighlightId(id) }} />
      case 'recall':
        return <RecallTab t={t} showToast={showToast} />
      default:
        return <></>
    }
  }

  return (
    <div className="lm-panel lm-scroll" style={{ ...style.root, width: '100%', height: '100%' }}>
      <div style={style.main}>
        <div style={style.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: space.sm }}>
            <h2 style={style.title}>{t('title')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
              <button className="lm-btn" style={{ ...style.btnOutline, height: 28, fontSize: font.sm, padding: '0 10px', borderRadius: 14 }} onClick={() => setSettingsOpen(true)}>{t('configBtn')}</button>
              <span style={{ display: 'flex', alignItems: 'center', gap: space.xs }} title={t('switchHint')}>
                <Switch checked={enabled} onChange={toggleEnabled} ariaLabel={enabled ? t('switchOn') : t('switchOff')} />
                <span style={{ fontSize: font.sm, color: enabled ? C.success : C.tertiary, fontWeight: 500 }}>{enabled ? t('switchOn') : t('switchOff')}</span>
              </span>
            </div>
          </div>
          <div role="tablist" style={{ display: 'flex', gap: '2px' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              const badgeCount = tab.badge !== undefined ? badges[tab.badge] : 0
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? 'lm-tab lm-tab-active' : 'lm-tab'}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    borderRadius: '18px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '22px',
                    padding: '0 14px',
                    height: '32px',
                    fontWeight: 400,
                    background: 'transparent',
                    color: isActive ? C.text : C.secondary,
                    transition: 'background-color 0.16s ease-out, color 0.16s ease-out',
                  }}
                >
                  <span>{t(tab.labelKey)}</span>
                  {badgeCount > 0 ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '18px',
                      minWidth: '18px',
                      padding: '0 5px',
                      borderRadius: '9px',
                      fontSize: '11px',
                      fontWeight: 500,
                      lineHeight: '18px',
                      color: C.textFg,
                      background: C.accent,
                    }}>{badgeCount}</span>
                  ) : null}
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
          onSaved={() => { refreshStats() }}
          embeddingStatus={embeddingStatus}
          setEmbeddingStatus={setEmbeddingStatus}
        />
      ) : null}
    </div>
  )
}
