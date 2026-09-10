// SPDX-License-Identifier: MIT
/**
 * Design tokens + shared inline-style vocabulary for the long-memory panel.
 * Aligned with DSH native design system (_button_cfgyt, _pill_e3ygd, _indicator_tixn7).
 *
 * @module @wwskills/dsh-long-memory/client/theme
 */

import type { CSSProperties } from 'react'

// ── Colour (DSH CSS variables) ──────────────────────────────────────────────

export const C = {
  bg: 'var(--dsw-alias-bg-base, #f6f7f9)',
  layer1: 'var(--dsw-alias-bg-layer-1, #ffffff)',
  layer2: 'var(--dsw-alias-bg-layer-2, #f1f2f5)',
  input: 'var(--dsw-alias-bg-input, #ffffff)',
  skeleton: 'var(--dsw-alias-bg-skeleton, #e9ebef)',
  text: 'var(--dsw-alias-label-primary, #1f2329)',
  textFg: 'var(--dsw-alias-label-primary-foreground, #ffffff)',
  secondary: 'var(--dsw-alias-label-secondary, #4a4f57)',
  tertiary: 'var(--dsw-alias-label-tertiary, #8a9099)',
  border: 'var(--dsw-alias-border-l2, #c7ccd4)',
  borderL3: 'var(--dsw-alias-border-l3, #d0d5db)',
  accent: 'var(--dsw-alias-accent, #3b6ef6)',
  brand: 'var(--dsw-alias-brand-primary, #3b6ef6)',
  primaryFill: 'var(--dsw-alias-button-primary-fill, #3b6ef6)',
  primaryHover: 'var(--dsw-alias-button-primary-hover, #2f5ed9)',
  danger: 'var(--dsw-alias-label-error, #e5484d)',
  success: 'var(--dsw-alias-state-success-primary, #30a46c)',
  warn: 'var(--dsw-alias-accent, #f5a623)',
  // DSH interactive surfaces
  hover: 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.06))',
  active: 'var(--dsw-alias-interactive-bg-active, rgba(255,255,255,0.04))',
  ghostActiveFill: 'var(--dsw-alias-button-ghost-active-fill, rgba(255,255,255,0.08))',
  ghostActiveBorder: 'var(--dsw-alias-button-ghost-active-border, rgba(255,255,255,0.12))',
} as const

/** Soft accent washes for active/hover chips. */
export const accentSoft = 'color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 12%, transparent)'
export const dangerSoft = 'color-mix(in srgb, var(--dsw-alias-label-error, #e5484d) 12%, transparent)'

// ── Scale tokens (aligned to DSH) ───────────────────────────────────────────

export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const
export const font = { xs: 11, sm: 12, md: 13, lg: 15, xl: 16 } as const
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const

// ── CSS injected once ───────────────────────────────────────────────────────

export const PANEL_CSS = `
@keyframes lm-spin { to { transform: rotate(360deg) } }
@keyframes lm-fade-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes lm-pulse { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }
.lm-panel {
  --lm-hover: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.06));
  --lm-active: var(--dsw-alias-interactive-bg-active, rgba(255,255,255,0.04));
}
.lm-spinner { animation: lm-spin 0.9s linear infinite }
.lm-fade-in { animation: lm-fade-in 0.18s ease-out }
.lm-skeleton { animation: lm-pulse 1.3s ease-in-out infinite }
.lm-row { transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease }
.lm-row:hover { background: var(--lm-hover) }
.lm-card { transition: border-color 0.15s ease, box-shadow 0.15s ease }
.lm-hoverable:hover { border-color: color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 40%, var(--dsw-alias-border-l2, #c7ccd4)) }
.lm-iconbtn { transition: color 0.15s ease, background 0.15s ease }
.lm-iconbtn:hover { color: var(--dsw-alias-accent, #3b6ef6); background: ${accentSoft} }
.lm-btn { transition: background 0.15s ease, border-color 0.15s ease, filter 0.15s ease }
.lm-btn:hover:not(:disabled) { background: var(--lm-hover) }
.lm-primary { transition: filter 0.15s ease }
.lm-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #2f5ed9) }
.lm-primary:active:not(:disabled) { filter: brightness(0.94) }
.lm-danger:hover:not(:disabled) { background: ${dangerSoft} }
.lm-menuitem { transition: background 0.15s ease }
.lm-menuitem:hover { background: var(--lm-hover) }
.lm-menuitem.lm-danger:hover { background: ${dangerSoft} }
.lm-tab { transition: background-color 0.16s ease-out, color 0.16s ease-out }
.lm-tab:hover:not(.lm-tab-active) { background: var(--lm-hover) }
.lm-tab-active { background: var(--dsw-alias-button-ghost-active-fill, rgba(255,255,255,0.08)); box-shadow: inset 0 0 0 1px var(--dsw-alias-button-ghost-active-border, rgba(255,255,255,0.12)) }
.lm-panel button:disabled { opacity: 0.5; cursor: not-allowed }
.lm-panel button:focus-visible, .lm-menuitem:focus-visible {
  outline: 2px solid var(--dsw-alias-accent, #3b6ef6); outline-offset: 2px;
}
.lm-panel input:focus, .lm-panel select:focus, .lm-panel textarea:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 35%, transparent);
  border-color: var(--dsw-alias-accent, #3b6ef6);
}
.lm-scroll::-webkit-scrollbar { width: 8px; height: 8px }
.lm-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2, #c7ccd4); border-radius: 999px }
.lm-scroll::-webkit-scrollbar-track { background: transparent }
`

// ── Shared style objects — aligned to DSH _button / _pill / _indicator ──────

export const style = {
  // Layout shell
  root: { display: 'flex', height: '100%', color: C.text, fontSize: font.md } as CSSProperties,
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 } as CSSProperties,
  header: { padding: `${space.sm}px ${space.lg}px`, borderBottom: `1px solid ${C.border}` } as CSSProperties,
  tabPanel: { flex: 1, overflowY: 'auto', padding: `${space.lg}px ${space.lg}px` } as CSSProperties,

  // Cards
  card: { background: C.layer2, border: `1px solid ${C.border}`, borderRadius: radius.lg } as CSSProperties,
  cardPad: { padding: `${space.md}px ${space.lg}px` } as CSSProperties,

  // Typography — DSH titles are small/secondary
  title: { fontSize: font.lg, fontWeight: 600, color: C.text, margin: 0 } as CSSProperties,
  sectionTitle: { fontSize: font.md, fontWeight: 600, color: C.secondary, margin: 0 } as CSSProperties,
  label: { fontSize: font.md, fontWeight: 500, color: C.text, marginBottom: space.xs } as CSSProperties,
  desc: { fontSize: font.sm, color: C.tertiary, marginTop: space.xs } as CSSProperties,
  metaText: { fontSize: font.sm, color: C.tertiary } as CSSProperties,

  // Form controls
  input: { height: 32, padding: `0 ${space.md}px`, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: font.md, width: '100%', boxSizing: 'border-box', outline: 'none' } as CSSProperties,
  textarea: { minHeight: 96, padding: `10px ${space.md}px`, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: font.md, resize: 'vertical', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 } as CSSProperties,

  // Buttons — DSH _button_cfgyt: borderRadius 18px, fontSize 14px
  btnPrimary: { height: 32, padding: `0 14px`, background: C.primaryFill, color: C.textFg, border: 'none', borderRadius: 18, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 } as CSSProperties,
  btnOutline: { height: 32, padding: `0 14px`, background: 'transparent', color: C.text, border: `0.5px solid ${C.borderL3}`, borderRadius: 18, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 } as CSSProperties,
  btnDanger: { height: 32, padding: `0 14px`, background: 'transparent', color: C.danger, border: `0.5px solid ${C.danger}`, borderRadius: 18, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 } as CSSProperties,
  btnPill: { height: 24, padding: `0 8px`, border: 'none', background: C.layer2, color: C.secondary, borderRadius: 12, fontSize: font.sm, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 } as CSSProperties,
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: radius.sm, background: 'transparent', color: C.tertiary, cursor: 'pointer', fontSize: font.lg, padding: 0 } as CSSProperties,

  // States
  empty: { textAlign: 'center', padding: `${space.xxl * 2}px ${space.lg}px`, color: C.tertiary, fontSize: font.md } as CSSProperties,
  errorBox: { textAlign: 'center', padding: `40px ${space.lg}px`, color: C.danger, fontSize: font.md } as CSSProperties,

  // Badges — DSH _pill style: neutral bg, 12px radius
  countBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: `0 5px`, borderRadius: 9, background: C.accent, color: C.textFg, fontSize: font.xs, fontWeight: 500, lineHeight: '18px' } as CSSProperties,

  // Toast
  toastStack: { position: 'fixed', top: space.lg, right: space.lg, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: space.sm, pointerEvents: 'none' } as CSSProperties,
  toast: { borderRadius: radius.md, padding: `10px ${space.lg}px`, fontSize: font.md, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: space.sm, maxWidth: 360, cursor: 'pointer' } as CSSProperties,

  // Modal
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' } as CSSProperties,
  modalCard: { background: C.layer2, borderRadius: radius.lg, padding: space.lg, width: 520, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${C.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.35)' } as CSSProperties,
  modalTitle: { fontSize: font.lg, fontWeight: 600, margin: `0 0 ${space.lg}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm } as CSSProperties,
  modalClose: { border: 'none', background: 'transparent', color: C.tertiary, fontSize: font.xl, cursor: 'pointer', padding: `0 ${space.xs}px`, lineHeight: 1 } as CSSProperties,
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: space.sm, marginTop: space.lg } as CSSProperties,

  // Popover menu
  popoverMenu: { position: 'absolute', top: '100%', right: 0, marginTop: space.xs, background: C.layer2, border: `1px solid ${C.border}`, borderRadius: radius.md, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 1000, minWidth: 150, padding: space.xs } as CSSProperties,
  popoverItem: { display: 'flex', alignItems: 'center', gap: space.sm, width: '100%', border: 'none', background: 'transparent', color: C.text, fontSize: font.md, padding: `${space.sm}px ${space.md}px`, borderRadius: radius.sm, textAlign: 'left', cursor: 'pointer' } as CSSProperties,

  // Progress bar
  progressTrack: { height: 6, background: C.skeleton, borderRadius: 3, overflow: 'hidden', flex: 1 } as CSSProperties,

  // Toggle switch
  switch: { width: 40, height: 22, borderRadius: radius.pill, border: 'none', cursor: 'pointer', position: 'relative', background: C.border, transition: 'background 0.2s', flexShrink: 0, padding: 0 } as CSSProperties,
  switchKnob: { position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: C.textFg, transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } as CSSProperties,
} as const

export const codeBlockStyle: CSSProperties = {
  padding: `${space.md}px ${space.lg}px`,
  background: C.layer1,
  border: `1px solid ${C.border}`,
  borderRadius: radius.md,
  fontSize: font.sm,
  whiteSpace: 'pre-wrap',
  fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  maxHeight: 360,
  overflow: 'auto',
  lineHeight: 1.6,
}

/** Detect the shell's dark theme from the body attribute DSH sets. */
export function detectColorScheme(): 'dark' | 'light' {
  try {
    return document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
