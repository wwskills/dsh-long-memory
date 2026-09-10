/**
 * Design tokens + shared inline-style vocabulary for the long-memory panel.
 *
 * The whole point of this module is a *single source of truth* for radii, type
 * scale, spacing and colour, so the panel stops mixing six ad-hoc font sizes
 * and a dozen hard-coded paddings. Everything below derives from these tokens.
 *
 * @module @wwskills/dsh-long-memory/client/theme
 */
import type { CSSProperties } from 'react';
export declare const C: {
    readonly bg: "var(--dsw-alias-bg-base, #f6f7f9)";
    readonly layer1: "var(--dsw-alias-bg-layer-1, #ffffff)";
    readonly layer2: "var(--dsw-alias-bg-layer-2, #f1f2f5)";
    readonly input: "var(--dsw-alias-bg-input, #ffffff)";
    readonly skeleton: "var(--dsw-alias-bg-skeleton, #e9ebef)";
    readonly text: "var(--dsw-alias-label-primary, #1f2329)";
    readonly textFg: "var(--dsw-alias-label-primary-foreground, #ffffff)";
    readonly secondary: "var(--dsw-alias-label-secondary, #4a4f57)";
    readonly tertiary: "var(--dsw-alias-label-tertiary, #8a9099)";
    readonly border: "var(--dsw-alias-border-l2, #c7ccd4)";
    readonly accent: "var(--dsw-alias-accent, #3b6ef6)";
    readonly brand: "var(--dsw-alias-brand-primary, #3b6ef6)";
    readonly primaryFill: "var(--dsw-alias-button-primary-fill, #3b6ef6)";
    readonly danger: "var(--dsw-alias-label-error, #e5484d)";
    readonly success: "var(--dsw-alias-state-success-primary, #30a46c)";
    readonly warn: "var(--dsw-alias-accent, #f5a623)";
};
/** Soft accent washes for active/hover chips. */
export declare const accentSoft = "color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 12%, transparent)";
export declare const dangerSoft = "color-mix(in srgb, var(--dsw-alias-label-error, #e5484d) 12%, transparent)";
/** Border radius scale — one ladder instead of 8/12/15/9 sprinkled around. */
export declare const radius: {
    readonly sm: 6;
    readonly md: 8;
    readonly lg: 12;
    readonly pill: 999;
};
/** Type scale — five deliberate steps, no more 11/12/13/14/16/18 soup. */
export declare const font: {
    readonly xs: 11;
    readonly sm: 12;
    readonly md: 13;
    readonly lg: 15;
    readonly xl: 18;
};
/** Spacing scale — multiples of 4. */
export declare const space: {
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 20;
    readonly xxl: 24;
};
export declare const PANEL_CSS = "\n@keyframes lm-spin { to { transform: rotate(360deg) } }\n@keyframes lm-fade-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }\n@keyframes lm-pulse { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }\n.lm-panel {\n  --lm-hover: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 8%, transparent);\n  --lm-active: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 15%, transparent);\n}\n.lm-spinner { animation: lm-spin 0.9s linear infinite }\n.lm-fade-in { animation: lm-fade-in 0.18s ease-out }\n.lm-skeleton { animation: lm-pulse 1.3s ease-in-out infinite }\n.lm-row { transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease }\n.lm-row:hover { background: var(--lm-hover) }\n.lm-card { transition: border-color 0.15s ease, box-shadow 0.15s ease }\n.lm-hoverable:hover { border-color: color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 40%, var(--dsw-alias-border-l2, #c7ccd4)) }\n.lm-iconbtn { transition: color 0.15s ease, background 0.15s ease }\n.lm-iconbtn:hover { color: var(--dsw-alias-accent, #3b6ef6); background: color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 12%, transparent) }\n.lm-btn { transition: background 0.15s ease, border-color 0.15s ease, filter 0.15s ease }\n.lm-btn:hover:not(:disabled) { background: var(--lm-hover) }\n.lm-primary { transition: filter 0.15s ease }\n.lm-primary:hover:not(:disabled) { filter: brightness(1.06) }\n.lm-primary:active:not(:disabled) { filter: brightness(0.94) }\n.lm-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-error, #e5484d) 12%, transparent) }\n.lm-menuitem { transition: background 0.15s ease }\n.lm-menuitem:hover { background: var(--lm-hover) }\n.lm-menuitem.lm-danger:hover { background: color-mix(in srgb, var(--dsw-alias-label-error, #e5484d) 12%, transparent) }\n.lm-tab { transition: color 0.15s ease, border-color 0.15s ease }\n.lm-tab:hover { color: var(--dsw-alias-label-primary, #1f2329) }\n.lm-scope:hover { background: var(--lm-hover) }\n.lm-panel button:disabled { opacity: 0.5; cursor: not-allowed }\n.lm-panel button:focus-visible, .lm-menuitem:focus-visible {\n  outline: 2px solid var(--dsw-alias-accent, #3b6ef6); outline-offset: 2px;\n}\n.lm-panel input:focus, .lm-panel select:focus, .lm-panel textarea:focus {\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 35%, transparent);\n  border-color: var(--dsw-alias-accent, #3b6ef6);\n}\n.lm-sash::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 2px; background: transparent; transition: background 0.15s ease }\n.lm-sash:hover::before { background: color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 45%, transparent) }\n.lm-scroll::-webkit-scrollbar { width: 8px; height: 8px }\n.lm-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2, #c7ccd4); border-radius: 999px }\n.lm-scroll::-webkit-scrollbar-track { background: transparent }\n";
export declare const style: {
    readonly root: CSSProperties;
    readonly sidebar: CSSProperties;
    readonly sash: CSSProperties;
    readonly main: CSSProperties;
    readonly header: CSSProperties;
    readonly tabPanel: CSSProperties;
    readonly card: CSSProperties;
    readonly cardPad: CSSProperties;
    readonly title: CSSProperties;
    readonly sectionTitle: CSSProperties;
    readonly label: CSSProperties;
    readonly desc: CSSProperties;
    readonly metaText: CSSProperties;
    readonly input: CSSProperties;
    readonly textarea: CSSProperties;
    readonly btnPrimary: CSSProperties;
    readonly btnOutline: CSSProperties;
    readonly btnDanger: CSSProperties;
    readonly btnPill: CSSProperties;
    readonly iconBtn: CSSProperties;
    readonly empty: CSSProperties;
    readonly errorBox: CSSProperties;
    readonly countBadge: CSSProperties;
    readonly toastStack: CSSProperties;
    readonly toast: CSSProperties;
    readonly modalBackdrop: CSSProperties;
    readonly modalCard: CSSProperties;
    readonly modalTitle: CSSProperties;
    readonly modalClose: CSSProperties;
    readonly modalFooter: CSSProperties;
    readonly popoverMenu: CSSProperties;
    readonly popoverItem: CSSProperties;
    readonly progressTrack: CSSProperties;
    readonly switch: CSSProperties;
    readonly switchKnob: CSSProperties;
};
export declare const codeBlockStyle: CSSProperties;
/** Detect the shell's dark theme from the body attribute DSH sets. */
export declare function detectColorScheme(): 'dark' | 'light';
//# sourceMappingURL=theme.d.ts.map