// SPDX-License-Identifier: MIT
/**
 * Design tokens + shared inline-style vocabulary for the long-memory panel.
 *
 * The whole point of this module is a *single source of truth* for radii, type
 * scale, spacing and colour, so the panel stops mixing six ad-hoc font sizes
 * and a dozen hard-coded paddings. Everything below derives from these tokens.
 *
 * @module @wwskills/dsh-long-memory/client/theme
 */

import type { CSSProperties } from 'react'

// ── Colour (DSH CSS variables with readable fallbacks) ──────────────────────

export const C = {
  bg: 'var(--dsw-alias-bg-base, #f6f7f9)',
  layer1: 'var(--dsw-alias-bg-layer-1, #ffffff)',
  layer2: 'var(--dsw-alias-bg-layer-2, #f1f2f5)',
  input: 'var(--dsw-alias-bg-input, #ffffff)',
  skeleton: 'var(--dsw-alias-bg-layer-2, #f1f2f5)',
  text: 'var(--dsw-alias-label-primary, #1f2329)',
  textFg: 'var(--dsw-alias-label-primary-foreground, #ffffff)',
  secondary: 'var(--dsw-alias-label-secondary, #4a4f57)',
  tertiary: 'var(--dsw-alias-label-tertiary, #8a9099)',
  border: 'var(--dsw-alias-border-l2, #c7ccd4)',
  accent: 'var(--dsw-alias-brand-primary, #3b6ef6)',
  brand: 'var(--dsw-alias-brand-primary, #3b6ef6)',
  primaryFill: 'var(--dsw-alias-button-primary-fill, #3b6ef6)',
  danger: 'var(--dsw-alias-label-error, #e5484d)',
  success: 'var(--dsw-alias-state-success-primary, #30a46c)',
  warn: 'var(--dsw-alias-state-warn-primary, #f5a623)',
} as const

/** Soft accent washes for active/hover chips. */
export const accentSoft = 'color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6ef6) 12%, transparent)'
export const dangerSoft = 'color-mix(in srgb, var(--dsw-alias-label-error, #e5484d) 12%, transparent)'

// ── Scale tokens ────────────────────────────────────────────────────────────

/** Border radius scale — one ladder instead of 8/12/15/9 sprinkled around. */
export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const

/** Type scale — five deliberate steps, no more 11/12/13/14/16/18 soup. */
export const font = { xs: 11, sm: 12, md: 13, lg: 15, xl: 18 } as const

/** Spacing scale — multiples of 4. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const

// ── One-off keyframes + hover/focus CSS, injected once by the shell ─────────

export const PANEL_CSS = `
@keyframes lm-spin { to { transform: rotate(360deg) } }
@keyframes lm-fade-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes lm-pulse { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }
.lm-panel {
  --lm-hover: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 8%, transparent);
  --lm-active: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 15%, transparent);
}
.lm-spinner { animation: lm-spin 0.9s linear infinite }
.lm-fade-in { animation: lm-fade-in 0.18s ease-out }
.lm-skeleton { animation: lm-pulse 1.3s ease-in-out infinite }
.lm-row { transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease }
.lm-row:hover { background: var(--lm-hover) }
.lm-card { transition: border-color 0.15s ease, box-shadow 0.15s ease }
.lm-hoverable:hover { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6ef6) 40%, var(--dsw-alias-border-l2, #c7ccd4)) }
.lm-iconbtn { transition: color 0.15s ease, background 0.15s ease }
.lm-iconbtn:hover { color: var(--dsw-alias-brand-primary, #3b6ef6); background: ${accentSoft} }
.lm-btn { transition: background 0.15s ease, border-color 0.15s ease, filter 0.15s ease }
.lm-btn:hover:not(:disabled) { background: var(--lm-hover) }
.lm-primary { transition: background 0.15s ease }
.lm-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover) }
.lm-primary:active:not(:disabled) { background: var(--dsw-alias-button-primary-hover) }
.lm-danger:hover:not(:disabled) { background: ${dangerSoft} }
.lm-menuitem { transition: background 0.15s ease }
.lm-menuitem:hover { background: var(--lm-hover) }
.lm-menuitem.lm-danger:hover { background: ${dangerSoft} }
.lm-tab { transition: color 0.15s ease, border-color 0.15s ease }
.lm-tab:hover { color: var(--dsw-alias-label-primary, #1f2329) }
.lm-scope:hover { background: var(--lm-hover) }
.lm-panel button:disabled { opacity: 0.5; cursor: not-allowed }
.lm-panel button:focus-visible, .lm-menuitem:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3b6ef6); outline-offset: 2px;
}
.lm-panel input:focus, .lm-panel select:focus, .lm-panel textarea:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6ef6) 35%, transparent);
  border-color: var(--dsw-alias-brand-primary, #3b6ef6);
}
.lm-sash::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 2px; background: transparent; transition: background 0.15s ease }
.lm-sash:hover::before { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6ef6) 45%, transparent) }
.lm-scroll::-webkit-scrollbar { width: 8px; height: 8px }
.lm-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2, #c7ccd4); border-radius: 999px }
.lm-scroll::-webkit-scrollbar-track { background: transparent }
`

// ── Shared style objects — every value comes from the scales above ──────────

export const style = {
  // Layout shell
  root: { display: 'flex', height: '100%', color: C.text, fontSize: font.md } as CSSProperties,
  sidebar: { overflowY: 'auto', borderRight: `0.5px solid ${C.border}`, flexShrink: 0, background: C.layer1, display: 'flex', flexDirection: 'column' } as CSSProperties,
  sash: { width: 4, cursor: 'col-resize', flexShrink: 0, background: C.border, position: 'relative' } as CSSProperties,
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 } as CSSProperties,
  header: { padding: `${space.lg}px ${space.xl}px 0`, borderBottom: `0.5px solid ${C.border}` } as CSSProperties,
  tabPanel: { flex: 1, overflowY: 'auto', padding: `${space.lg}px ${space.xl}px` } as CSSProperties,

  // Cards
  card: { background: C.layer2, border: `0.5px solid ${C.border}`, borderRadius: 24 } as CSSProperties,
  cardPad: { padding: `${space.md}px ${space.lg}px` } as CSSProperties,

  // Typography
  title: { fontSize: font.xl, fontWeight: 600, color: C.text, margin: 0 } as CSSProperties,
  sectionTitle: { fontSize: font.lg, fontWeight: 600, color: C.text, margin: 0 } as CSSProperties,
  label: { fontSize: font.md, fontWeight: 500, color: C.text, marginBottom: space.xs } as CSSProperties,
  desc: { fontSize: font.sm, color: C.tertiary, marginTop: space.xs } as CSSProperties,
  metaText: { fontSize: font.sm, color: C.tertiary } as CSSProperties,

  // Form controls
  input: { height: 36, padding: `0 ${space.md}px`, background: C.input, color: C.text, border: `0.5px solid ${C.border}`, borderRadius: radius.md, fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none' } as CSSProperties,
  textarea: { minHeight: 96, padding: `10px ${space.md}px`, background: C.input, color: C.text, border: `0.5px solid ${C.border}`, borderRadius: radius.md, fontSize: 14, resize: 'vertical', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 } as CSSProperties,

  // Buttons
  btnPrimary: { height: 32, padding: `0 ${space.lg}px`, background: C.primaryFill, color: C.textFg, border: 'none', borderRadius: radius.md, fontSize: font.md, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: space.xs } as CSSProperties,
  btnOutline: { height: 32, padding: `0 ${space.lg}px`, background: 'transparent', color: C.secondary, border: `0.5px solid ${C.border}`, borderRadius: radius.md, fontSize: font.md, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: space.xs } as CSSProperties,
  btnDanger: { height: 32, padding: `0 ${space.lg}px`, background: 'transparent', color: C.danger, border: `0.5px solid ${C.danger}`, borderRadius: radius.md, fontSize: font.md, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: space.xs } as CSSProperties,
  btnPill: { height: 26, padding: `0 ${space.md}px`, border: `0.5px solid ${C.border}`, background: 'transparent', color: C.secondary, borderRadius: radius.pill, fontSize: font.sm, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: space.xs } as CSSProperties,
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: radius.sm, background: 'transparent', color: C.tertiary, cursor: 'pointer', fontSize: font.lg, padding: 0 } as CSSProperties,

  // States
  empty: { textAlign: 'center', padding: `${space.xxl * 2}px ${space.xl}px`, color: C.tertiary, fontSize: font.md } as CSSProperties,
  errorBox: { textAlign: 'center', padding: `40px ${space.xl}px`, color: C.danger, fontSize: font.md } as CSSProperties,

  // Badges / pills
  countBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: `0 ${space.xs}px`, borderRadius: radius.pill, background: C.danger, color: C.textFg, fontSize: font.xs, fontWeight: 600 } as CSSProperties,

  // Toast
  toastStack: { position: 'fixed', top: space.lg, right: space.lg, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: space.sm, pointerEvents: 'none' } as CSSProperties,
  toast: { borderRadius: radius.md, padding: `10px ${space.lg}px`, fontSize: font.md, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: space.sm, maxWidth: 360, cursor: 'pointer' } as CSSProperties,

  // Modal
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' } as CSSProperties,
  modalCard: { background: C.layer2, borderRadius: 24, padding: space.xl, width: 520, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', border: `0.5px solid ${C.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.35)' } as CSSProperties,
  modalTitle: { fontSize: font.lg, fontWeight: 600, margin: `0 0 ${space.lg}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm } as CSSProperties,
  modalClose: { border: 'none', background: 'transparent', color: C.tertiary, fontSize: font.xl, cursor: 'pointer', padding: `0 ${space.xs}px`, lineHeight: 1 } as CSSProperties,
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: space.sm, marginTop: space.lg } as CSSProperties,

  // Popover menu
  popoverMenu: { position: 'absolute', top: '100%', right: 0, marginTop: space.xs, background: C.layer2, border: `0.5px solid ${C.border}`, borderRadius: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 1000, minWidth: 150, padding: space.xs } as CSSProperties,
  popoverItem: { display: 'flex', alignItems: 'center', gap: space.sm, width: '100%', border: 'none', background: 'transparent', color: C.text, fontSize: font.md, padding: `${space.sm}px ${space.md}px`, borderRadius: radius.sm, textAlign: 'left', cursor: 'pointer' } as CSSProperties,

  // Progress bar (confidence/weight)
  progressTrack: { height: 6, background: C.skeleton, borderRadius: 3, overflow: 'hidden', flex: 1 } as CSSProperties,

  // Toggle switch
  switch: { width: 40, height: 22, borderRadius: radius.pill, border: 'none', cursor: 'pointer', position: 'relative', background: C.border, transition: 'background 0.2s', flexShrink: 0, padding: 0 } as CSSProperties,
  switchKnob: { position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: C.textFg, transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } as CSSProperties,
} as const

export const codeBlockStyle: CSSProperties = {
  padding: `${space.md}px ${space.lg}px`,
  background: C.layer1,
  border: `0.5px solid ${C.border}`,
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
