// SPDX-License-Identifier: MIT
/**
 * Reusable presentational primitives: Toast stack, Modal, ConfirmDialog,
 * PopoverMenu, SkeletonList, Switch, ConfidenceBar, EmptyState, ErrorState.
 *
 * ConfirmDialog replaces the old `window.confirm()` calls so every
 * confirmation is themed and consistent with the rest of the panel.
 *
 * @module @wwskills/dsh-long-memory/client/primitives
 */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { C, style, space, font, radius } from './theme.js'
import type { Translate } from './locales.js'

// ── Toast ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning'
export interface ToastItem { id: number, message: string, type: ToastType }

const TOAST_COLORS: Record<ToastType, string> = {
  success: C.success,
  error: C.danger,
  warning: C.warn,
}
const TOAST_ICONS: Record<ToastType, string> = { success: '✓', error: '✕', warning: '⚠' }

export function Toast(props: { toasts: ToastItem[], onDismiss: (id: number) => void }): JSX.Element | null {
  if (props.toasts.length === 0) return null
  return (
    <div style={style.toastStack}>
      {props.toasts.map(toast => (
        <div
          key={toast.id}
          className="lm-fade-in"
          style={{ ...style.toast, background: TOAST_COLORS[toast.type], color: C.textFg }}
          onClick={() => props.onDismiss(toast.id)}
          role="status"
        >
          <span aria-hidden>{TOAST_ICONS[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}

/** Toast queue hook: returns the list, a `show(message, type)` and dismiss. */
export function useToasts(): {
  toasts: ToastItem[]
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: number) => void
} {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const showToast = (message: string, type: ToastType = 'success'): void => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }
  const dismissToast = (id: number): void => setToasts(prev => prev.filter(t => t.id !== id))
  return { toasts, showToast, dismissToast }
}

// ── Modal ─────────────────────────────────────────────────────────────────

export function Modal(props: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') props.onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <div
      style={style.modalBackdrop}
      onClick={e => { if (e.target === e.currentTarget) props.onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="lm-fade-in" style={{ ...style.modalCard, width: props.width ?? 520 }} onClick={e => e.stopPropagation()}>
        <div style={style.modalTitle}>
          <span>{props.title}</span>
          <button style={style.modalClose} onClick={props.onClose} aria-label="close">×</button>
        </div>
        <div>{props.children}</div>
        {props.footer !== undefined ? <div style={style.modalFooter}>{props.footer}</div> : null}
      </div>
    </div>
  )
}

// ── ConfirmDialog (replaces window.confirm) ─────────────────────────────────

export function ConfirmDialog(props: {
  t: Translate
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}): JSX.Element {
  const { t } = props
  return (
    <Modal
      title={props.title}
      onClose={props.onClose}
      width={420}
      footer={
        <>
          <button className="lm-btn" style={style.btnOutline} onClick={props.onClose} disabled={props.busy === true}>{t('cancel')}</button>
          <button
            className={props.danger === true ? 'lm-primary' : 'lm-primary'}
            style={{ ...style.btnPrimary, ...(props.danger === true ? { background: C.danger } : {}) }}
            onClick={props.onConfirm}
            disabled={props.busy === true}
          >
            {props.confirmLabel ?? t('confirm')}
          </button>
        </>
      }
    >
      <div style={{ fontSize: font.md, color: C.secondary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{props.message}</div>
    </Modal>
  )
}

// ── PopoverMenu ─────────────────────────────────────────────────────────────

export interface MenuItem { icon?: ReactNode, label: string, danger?: boolean, onClick: () => void }

export function PopoverMenu(props: { items: MenuItem[], visible: boolean }): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="lm-iconbtn"
        style={{ ...style.iconBtn, opacity: props.visible || open ? 1 : 0, transition: 'opacity 0.15s' }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        aria-label="menu"
      >
        ⋯
      </button>
      {open ? (
        <div className="lm-fade-in" style={style.popoverMenu} onClick={e => e.stopPropagation()}>
          {props.items.map((item, i) => (
            <button
              key={i}
              className={`lm-menuitem${item.danger === true ? ' lm-danger' : ''}`}
              style={{ ...style.popoverItem, ...(item.danger === true ? { color: C.danger } : {}) }}
              onClick={() => { setOpen(false); item.onClick() }}
            >
              {item.icon !== undefined ? <span aria-hidden>{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── Skeleton / states ───────────────────────────────────────────────────────

export function SkeletonList(props: { count?: number }): JSX.Element {
  const rows = Array.from({ length: props.count ?? 3 })
  return (
    <>
      {rows.map((_, i) => (
        <div key={i} style={{ ...style.card, ...style.cardPad, marginBottom: space.sm }}>
          {[60, 40, 30].map((w, j) => (
            <div key={j} className="lm-skeleton" style={{ height: j === 0 ? 14 : 12, width: `${w}%`, background: C.skeleton, borderRadius: radius.sm, marginBottom: space.sm }} />
          ))}
        </div>
      ))}
    </>
  )
}

export function EmptyState(props: { children: ReactNode }): JSX.Element {
  return <div style={style.empty}>{props.children}</div>
}

export function ErrorState(props: { t: Translate, message?: string, onRetry?: () => void }): JSX.Element {
  const { t } = props
  return (
    <div style={style.errorBox}>
      <div style={{ marginBottom: space.md }}>{t('loadFailed')}{props.message !== undefined ? ` (${props.message})` : ''}</div>
      {props.onRetry !== undefined ? <button className="lm-primary" style={style.btnPrimary} onClick={props.onRetry}>{t('retry')}</button> : null}
    </div>
  )
}

// ── Switch ────────────────────────────────────────────────────────────────

export function Switch(props: { checked: boolean, onChange: () => void, ariaLabel?: string }): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={props.checked}
      aria-label={props.ariaLabel}
      onClick={props.onChange}
      style={{ ...style.switch, background: props.checked ? C.accent : C.border }}
    >
      <span style={{ ...style.switchKnob, left: props.checked ? 20 : 2 }} />
    </button>
  )
}

// ── ConfidenceBar ───────────────────────────────────────────────────────────

export function ConfidenceBar(props: { value: number, color: string, label?: string }): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(props.value * 100)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
      {props.label !== undefined ? <span style={{ fontSize: font.xs, color: C.tertiary, minWidth: 40 }}>{props.label}</span> : null}
      <div style={style.progressTrack}>
        <div style={{ height: '100%', width: `${pct}%`, background: props.color, transition: 'width 0.3s', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: font.xs, color: C.tertiary, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

/** Small labelled chip used for category / type / scope tags. */
export function Chip(props: { icon?: ReactNode, label: ReactNode, fg?: string, bg?: string, border?: string, style?: CSSProperties }): JSX.Element {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: space.xs,
      fontSize: font.xs, fontWeight: 500, padding: `2px ${space.sm}px`, borderRadius: radius.sm,
      color: props.fg ?? C.secondary,
      background: props.bg ?? C.layer1,
      border: `1px solid ${props.border ?? C.border}`,
      ...props.style,
    }}
    >
      {props.icon !== undefined ? <span aria-hidden>{props.icon}</span> : null}
      <span>{props.label}</span>
    </span>
  )
}
