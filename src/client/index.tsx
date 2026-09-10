// SPDX-License-Identifier: MIT
/**
 * Browser entry: registers a sidebar footer action that opens the long-memory
 * panel in a full-screen overlay, and wires up the locale namespace.
 *
 * Built by esbuild into `lib/client.js` wrapped as a
 * `window.__ModuleLoader__.load({ id, factory })` module (see build.mjs).
 *
 * @module @wwskills/dsh-long-memory/client
 */

import { useState } from 'react'
import { IconDataOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { style, space, radius, C } from './theme.js'
import { zh, en, makeSafeTranslate } from './locales.js'
import type { Translate } from './locales.js'
import { SettingsPanel } from './SettingsPanel.js'

const NS = 'long-memory'

/** Sidebar footer entry: an icon (+ label when the rail is wide) that opens the panel. */
function SidebarEntry(props: { t: Translate, wide: boolean }): JSX.Element {
  const { t } = props
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="lm-row"
        onClick={() => setOpen(true)}
        title={t('title')}
        style={{
          display: 'flex', alignItems: 'center', gap: space.sm, width: '100%',
          border: 'none', background: 'transparent', color: C.text, cursor: 'pointer',
          padding: props.wide ? `8px ${space.md}px` : 8, borderRadius: radius.md,
          justifyContent: props.wide ? 'flex-start' : 'center', fontSize: 14,
        }}
      >
        <IconDataOutline16 size={props.wide ? 16 : 18} />
        {props.wide ? <span>{t('tab')}</span> : null}
      </button>
      {open ? (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{ position: 'relative', width: '90vw', maxWidth: 1100, height: '85vh', background: C.bg, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <button
              className="lm-iconbtn"
              onClick={() => setOpen(false)}
              aria-label="close"
              style={{ ...style.iconBtn, position: 'absolute', top: space.sm, right: space.sm, zIndex: 2, fontSize: 20 }}
            >
              ×
            </button>
            <SettingsPanel t={t} />
          </div>
        </div>
      ) : null}
    </>
  )
}

/** Cordis-ish client context surface this entry uses. */
interface ClientContext {
  effect: (fn: () => unknown, label?: string) => unknown
  locale: {
    register: (ns: string, dicts: { zh: Record<string, string>, en: Record<string, string> }) => unknown
    bind: (ns: string) => (key: string) => string
  }
  slots: {
    inject: (slot: string, factory: () => unknown) => unknown
    register: (spec: Record<string, unknown>, component: unknown) => unknown
  }
}

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh: { ...zh }, en: { ...en } }), 'long-memory: dictionaries')
  const t = makeSafeTranslate(ctx.locale.bind(NS))
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      { name: 'sidebar.footer.action', id: 'long-memory', order: 10, locale: NS, inject: () => ({}) },
      (slotProps: { wide?: boolean }) => <SidebarEntry t={t} wide={slotProps.wide === true} />,
    ),
  )
}

export { NS }
