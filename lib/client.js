window.__ModuleLoader__.load({
	id: "@wwskills/dsh-long-memory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  NS: () => NS,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react8 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/theme.ts
var C = {
  bg: "var(--dsw-alias-bg-base, #f6f7f9)",
  layer1: "var(--dsw-alias-bg-layer-1, #ffffff)",
  layer2: "var(--dsw-alias-bg-layer-2, #f1f2f5)",
  input: "var(--dsw-alias-bg-input, #ffffff)",
  skeleton: "var(--dsw-alias-bg-skeleton, #e9ebef)",
  text: "var(--dsw-alias-label-primary, #1f2329)",
  textFg: "var(--dsw-alias-label-primary-foreground, #ffffff)",
  secondary: "var(--dsw-alias-label-secondary, #4a4f57)",
  tertiary: "var(--dsw-alias-label-tertiary, #8a9099)",
  border: "var(--dsw-alias-border-l2, #c7ccd4)",
  accent: "var(--dsw-alias-accent, #3b6ef6)",
  brand: "var(--dsw-alias-brand-primary, #3b6ef6)",
  primaryFill: "var(--dsw-alias-button-primary-fill, #3b6ef6)",
  danger: "var(--dsw-alias-label-error, #e5484d)",
  success: "var(--dsw-alias-state-success-primary, #30a46c)",
  warn: "var(--dsw-alias-accent, #f5a623)"
};
var accentSoft = "color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 12%, transparent)";
var dangerSoft = "color-mix(in srgb, var(--dsw-alias-label-error, #e5484d) 12%, transparent)";
var radius = { sm: 6, md: 8, lg: 12, pill: 999 };
var font = { xs: 11, sm: 12, md: 13, lg: 15, xl: 18 };
var space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
var PANEL_CSS = `
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
.lm-hoverable:hover { border-color: color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 40%, var(--dsw-alias-border-l2, #c7ccd4)) }
.lm-iconbtn { transition: color 0.15s ease, background 0.15s ease }
.lm-iconbtn:hover { color: var(--dsw-alias-accent, #3b6ef6); background: ${accentSoft} }
.lm-btn { transition: background 0.15s ease, border-color 0.15s ease, filter 0.15s ease }
.lm-btn:hover:not(:disabled) { background: var(--lm-hover) }
.lm-primary { transition: filter 0.15s ease }
.lm-primary:hover:not(:disabled) { filter: brightness(1.06) }
.lm-primary:active:not(:disabled) { filter: brightness(0.94) }
.lm-danger:hover:not(:disabled) { background: ${dangerSoft} }
.lm-menuitem { transition: background 0.15s ease }
.lm-menuitem:hover { background: var(--lm-hover) }
.lm-menuitem.lm-danger:hover { background: ${dangerSoft} }
.lm-tab { transition: color 0.15s ease, border-color 0.15s ease }
.lm-tab:hover { color: var(--dsw-alias-label-primary, #1f2329) }
.lm-scope:hover { background: var(--lm-hover) }
.lm-panel button:disabled { opacity: 0.5; cursor: not-allowed }
.lm-panel button:focus-visible, .lm-menuitem:focus-visible {
  outline: 2px solid var(--dsw-alias-accent, #3b6ef6); outline-offset: 2px;
}
.lm-panel input:focus, .lm-panel select:focus, .lm-panel textarea:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 35%, transparent);
  border-color: var(--dsw-alias-accent, #3b6ef6);
}
.lm-sash::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 2px; background: transparent; transition: background 0.15s ease }
.lm-sash:hover::before { background: color-mix(in srgb, var(--dsw-alias-accent, #3b6ef6) 45%, transparent) }
.lm-scroll::-webkit-scrollbar { width: 8px; height: 8px }
.lm-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2, #c7ccd4); border-radius: 999px }
.lm-scroll::-webkit-scrollbar-track { background: transparent }
`;
var style = {
  // Layout shell
  root: { display: "flex", height: "100%", color: C.text, fontSize: font.md },
  sidebar: { overflowY: "auto", borderRight: `1px solid ${C.border}`, flexShrink: 0, background: C.layer1, display: "flex", flexDirection: "column" },
  sash: { width: 4, cursor: "col-resize", flexShrink: 0, background: C.border, position: "relative" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  header: { padding: `${space.lg}px ${space.xl}px 0`, borderBottom: `1px solid ${C.border}` },
  tabPanel: { flex: 1, overflowY: "auto", padding: `${space.lg}px ${space.xl}px` },
  // Cards
  card: { background: C.layer2, border: `1px solid ${C.border}`, borderRadius: radius.lg },
  cardPad: { padding: `${space.md}px ${space.lg}px` },
  // Typography
  title: { fontSize: font.xl, fontWeight: 600, color: C.text, margin: 0 },
  sectionTitle: { fontSize: font.lg, fontWeight: 600, color: C.text, margin: 0 },
  label: { fontSize: font.md, fontWeight: 500, color: C.text, marginBottom: space.xs },
  desc: { fontSize: font.sm, color: C.tertiary, marginTop: space.xs },
  metaText: { fontSize: font.sm, color: C.tertiary },
  // Form controls
  input: { height: 36, padding: `0 ${space.md}px`, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: font.md, width: "100%", boxSizing: "border-box", outline: "none" },
  textarea: { minHeight: 96, padding: `10px ${space.md}px`, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: font.md, resize: "vertical", width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit", lineHeight: 1.5 },
  // Buttons
  btnPrimary: { height: 32, padding: `0 ${space.lg}px`, background: C.primaryFill, color: C.textFg, border: "none", borderRadius: radius.md, fontSize: font.md, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: space.xs },
  btnOutline: { height: 32, padding: `0 ${space.lg}px`, background: "transparent", color: C.secondary, border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: font.md, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: space.xs },
  btnDanger: { height: 32, padding: `0 ${space.lg}px`, background: "transparent", color: C.danger, border: `1px solid ${C.danger}`, borderRadius: radius.md, fontSize: font.md, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: space.xs },
  btnPill: { height: 26, padding: `0 ${space.md}px`, border: `1px solid ${C.border}`, background: "transparent", color: C.secondary, borderRadius: radius.pill, fontSize: font.sm, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: space.xs },
  iconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", borderRadius: radius.sm, background: "transparent", color: C.tertiary, cursor: "pointer", fontSize: font.lg, padding: 0 },
  // States
  empty: { textAlign: "center", padding: `${space.xxl * 2}px ${space.xl}px`, color: C.tertiary, fontSize: font.md },
  errorBox: { textAlign: "center", padding: `40px ${space.xl}px`, color: C.danger, fontSize: font.md },
  // Badges / pills
  countBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: `0 ${space.xs}px`, borderRadius: radius.pill, background: C.danger, color: C.textFg, fontSize: font.xs, fontWeight: 600 },
  // Toast
  toastStack: { position: "fixed", top: space.lg, right: space.lg, zIndex: 1e4, display: "flex", flexDirection: "column", gap: space.sm, pointerEvents: "none" },
  toast: { borderRadius: radius.md, padding: `10px ${space.lg}px`, fontSize: font.md, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", pointerEvents: "auto", display: "flex", alignItems: "center", gap: space.sm, maxWidth: 360, cursor: "pointer" },
  // Modal
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(2px)" },
  modalCard: { background: C.layer2, borderRadius: radius.lg, padding: space.xl, width: 520, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto", border: `1px solid ${C.border}`, boxShadow: "0 20px 40px rgba(0,0,0,0.35)" },
  modalTitle: { fontSize: font.lg, fontWeight: 600, margin: `0 0 ${space.lg}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  modalClose: { border: "none", background: "transparent", color: C.tertiary, fontSize: font.xl, cursor: "pointer", padding: `0 ${space.xs}px`, lineHeight: 1 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: space.sm, marginTop: space.lg },
  // Popover menu
  popoverMenu: { position: "absolute", top: "100%", right: 0, marginTop: space.xs, background: C.layer2, border: `1px solid ${C.border}`, borderRadius: radius.md, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 1e3, minWidth: 150, padding: space.xs },
  popoverItem: { display: "flex", alignItems: "center", gap: space.sm, width: "100%", border: "none", background: "transparent", color: C.text, fontSize: font.md, padding: `${space.sm}px ${space.md}px`, borderRadius: radius.sm, textAlign: "left", cursor: "pointer" },
  // Progress bar (confidence/weight)
  progressTrack: { height: 6, background: C.skeleton, borderRadius: 3, overflow: "hidden", flex: 1 },
  // Toggle switch
  switch: { width: 40, height: 22, borderRadius: radius.pill, border: "none", cursor: "pointer", position: "relative", background: C.border, transition: "background 0.2s", flexShrink: 0, padding: 0 },
  switchKnob: { position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: C.textFg, transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
};
var codeBlockStyle = {
  padding: `${space.md}px ${space.lg}px`,
  background: C.layer1,
  border: `1px solid ${C.border}`,
  borderRadius: radius.md,
  fontSize: font.sm,
  whiteSpace: "pre-wrap",
  fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  maxHeight: 360,
  overflow: "auto",
  lineHeight: 1.6
};
function detectColorScheme() {
  try {
    return document.body.hasAttribute("data-ds-dark-theme") ? "dark" : "light";
  } catch {
    return "light";
  }
}

// src/client/locales.ts
var zh = {
  tab: "\u8BB0\u5FC6",
  title: "\u957F\u671F\u8BB0\u5FC6",
  // Tabs
  tabLessons: "\u6559\u8BAD",
  tabRules: "\u89C4\u5219",
  tabMemories: "\u8BB0\u5FC6",
  tabPersona: "\u753B\u50CF",
  recallTab: "\u53EC\u56DE\u6D4B\u8BD5",
  // Header / switch
  configBtn: "\u914D\u7F6E",
  switchOn: "\u5DF2\u542F\u7528",
  switchOff: "\u5DF2\u505C\u7528",
  switchHint: "\u5F00\u542F\u540E\u81EA\u52A8\u4ECE\u5BF9\u8BDD\u4E2D\u62BD\u53D6\u6559\u8BAD\u4E0E\u8BB0\u5FC6",
  // Overview
  overviewLessons: "\u5F85\u5BA1\u6559\u8BAD",
  overviewRules: "\u5F85\u5BA1\u89C4\u5219",
  overviewMemories: "\u6D3B\u8DC3\u8BB0\u5FC6",
  // Sidebar
  sidebarSearchPlaceholder: "\u641C\u7D22\u8BB0\u5FC6...",
  sidebarScopeAll: "\u5168\u90E8",
  sidebarScopeUser: "\u7528\u6237",
  sidebarScopeProject: "\u9879\u76EE",
  sidebarScopeDomain: "\u9886\u57DF",
  sidebarScopeEpisodic: "\u60C5\u8282",
  sidebarStatsMemories: "\u603B\u8BB0\u5FC6",
  sidebarStatsActive: "\u6D3B\u8DC3",
  sidebarScopeHint: "Scope \u4EC5\u4F5C\u7528\u4E8E\u300C\u8BB0\u5FC6\u300D\u4E0E\u300C\u53EC\u56DE\u6D4B\u8BD5\u300D",
  // Correction triggers
  triggerToolError: "\u5DE5\u5177\u5931\u8D25",
  triggerUserCorrection: "\u7528\u6237\u7EA0\u6B63",
  triggerSelfFix: "Agent \u81EA\u4FEE\u6B63",
  // Correction card
  rootCause: "\u6839\u56E0",
  correctAction: "\u6B63\u786E\u505A\u6CD5",
  rule: "\u9632\u62A4\u89C4\u5219\uFF08\u8349\u7A3F\uFF09",
  context: "\u4E0A\u4E0B\u6587",
  extractRule: "\u63D0\u70BC\u4E3A\u89C4\u5219",
  ignore: "\u5FFD\u7565",
  collapse: "\u6536\u8D77",
  ignoreConfirm: "\u5FFD\u7565\u8FD9\u6761\u6559\u8BAD\uFF1F",
  // Filter
  filterAll: "\u5168\u90E8",
  filterPending: "\u5F85\u5904\u7406",
  filterPromoted: "\u5DF2\u63D0\u70BC",
  filterIgnored: "\u5DF2\u5FFD\u7565",
  // Rules
  rulePending: "\u5F85\u5BA1",
  ruleApproved: "\u5DF2\u6279\u51C6",
  ruleSource: "\u6765\u6E90",
  approve: "\u6279\u51C6",
  edit: "\u7F16\u8F91",
  reject: "\u62D2\u7EDD",
  rejectConfirm: "\u786E\u8BA4\u62D2\u7EDD\u8FD9\u6761\u89C4\u5219\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",
  graduable: "\u53EF\u664B\u5347",
  emptyApproved: "\u6682\u65E0\u5DF2\u6279\u51C6\u89C4\u5219",
  editRule: "\u7F16\u8F91\u89C4\u5219",
  promoteRule: "\u664B\u5347\u5230 AGENTS.md",
  promoteDraft: "AGENTS.md \u8349\u7A3F",
  promoteHint: "\u786E\u8BA4\u65E0\u8BEF\u540E\u8BF7\u7C98\u8D34\u5230 AGENTS.md \u5BF9\u5E94\u7AE0\u8282\u3002",
  category: "\u7C7B\u522B",
  tagsLabel: "\u6807\u7B7E",
  tagsHint: "\u7528\u9017\u53F7\u5206\u9694",
  hitCount: "\u547D\u4E2D\u6B21\u6570",
  lastHit: "\u6700\u540E\u547D\u4E2D",
  never: "\u4ECE\u672A",
  moreSource: "\u7B49 {n} \u6761",
  categoryCoding: "\u7F16\u7801",
  categoryCommunication: "\u6C9F\u901A",
  categoryWorkflow: "\u5DE5\u4F5C\u6D41",
  categorySafety: "\u5B89\u5168",
  save: "\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D...",
  cancel: "\u53D6\u6D88",
  confirm: "\u786E\u8BA4",
  copy: "\u590D\u5236",
  copied: "\u5DF2\u590D\u5236",
  contentLabel: "\u89C4\u5219\u5185\u5BB9",
  contentPlaceholder: "\u8BF7\u63CF\u8FF0\u8FD9\u6761\u89C4\u5219\u7684\u5177\u4F53\u5185\u5BB9...",
  promoteLoading: "\u751F\u6210\u8349\u7A3F\u4E2D...",
  contentRequired: "\u89C4\u5219\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A",
  conflictWarningTitle: "\u89C4\u5219\u53EF\u80FD\u51B2\u7A81",
  conflictWarningBody: "\u6B64\u89C4\u5219\u4E0E\u5DF2\u6279\u51C6\u7684 {n} \u6761\u89C4\u5219\u5185\u5BB9\u91CD\u53E0\u8F83\u9AD8\uFF08>60%\uFF09\uFF1A\n{list}\n\u4ECD\u8981\u4FDD\u7559\u5417\uFF1F",
  // Memories
  memNoResults: "\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5FC6",
  memScopeAll: "\u5168\u90E8 scope",
  memScopeUser: "user\uFF08\u7528\u6237\uFF09",
  memScopeProject: "project\uFF08\u9879\u76EE\uFF09",
  memScopeDomain: "domain\uFF08\u9886\u57DF\uFF09",
  memScopeEpisodic: "episodic\uFF08\u60C5\u8282\uFF09",
  memTypeUser: "\u7528\u6237",
  memTypePreference: "\u504F\u597D",
  memTypeProject: "\u9879\u76EE",
  memTypeFact: "\u4E8B\u5B9E",
  memTypeSkill: "\u6280\u80FD",
  memTypeEvent: "\u4E8B\u4EF6",
  memTypeTask: "\u4EFB\u52A1",
  memOriginOwner: "\u4E3B\u4EBA",
  memOriginAgent: "Agent",
  memOriginUntrusted: "\u4E0D\u53EF\u4FE1",
  memOriginSystem: "\u7CFB\u7EDF",
  memOriginUserEdited: "\u7528\u6237\u7F16\u8F91",
  memStatusActive: "\u6D3B\u8DC3",
  memStatusSuperseded: "\u5DF2\u66FF\u4EE3",
  memStatusArchived: "\u5DF2\u5F52\u6863",
  memWeight: "\u6743\u91CD",
  memAccess: "\u8BBF\u95EE",
  memArchive: "\u5F52\u6863",
  memArchiveConfirm: "\u5F52\u6863\u8FD9\u6761\u8BB0\u5FC6\uFF1F",
  memDelete: "\u5220\u9664",
  memDeleteHard: "\u786C\u5220\u9664",
  memDeleteConfirm: "\u786E\u8BA4\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",
  memDeleteReasonLabel: "\u5220\u9664\u539F\u56E0",
  memDeleteReasonHint: "\u5220\u9664 user \u8BB0\u5FC6\u9700\u586B\u5199\u539F\u56E0\uFF08\u5199\u5165\u5BA1\u8BA1\u65E5\u5FD7\uFF09",
  memDeleteReasonPlaceholder: "\u4F8B\u5982\uFF1A\u6D4B\u8BD5\u6B8B\u7559 / \u4E0D\u518D\u9700\u8981",
  memHardDeleteLabel: "\u786C\u5220\u9664\uFF08\u7269\u7406\u79FB\u9664\uFF0C\u5426\u5219\u5F52\u6863\uFF09",
  memArchiveSuccess: "\u5DF2\u5F52\u6863",
  memDeleteSuccess: "\u5DF2\u5220\u9664",
  memFilterStatus: "\u72B6\u6001",
  memFilterType: "\u7C7B\u578B",
  // Persona
  personaRebuild: "\u91CD\u5EFA\u753B\u50CF",
  personaRebuilding: "\u91CD\u5EFA\u4E2D...",
  personaLastUpdated: "\u4E0A\u6B21\u66F4\u65B0",
  personaTechStack: "\u6280\u672F\u6808",
  personaCodingStyle: "\u7F16\u7801\u98CE\u683C",
  personaCommunication: "\u6C9F\u901A\u504F\u597D",
  personaCommonTasks: "\u5E38\u89C1\u4EFB\u52A1",
  personaEditValue: "\u7F16\u8F91\u753B\u50CF",
  personaValueLabel: "\u753B\u50CF\u5185\u5BB9",
  personaValuePlaceholder: "\u8BF7\u8F93\u5165\u753B\u50CF\u5185\u5BB9...",
  personaEmptyHint: "\u6682\u65E0\u753B\u50CF \u2014 \u79EF\u7D2F\u8DB3\u591F USER \u7C7B\u578B\u8BB0\u5FC6\u540E\u53EF\u91CD\u5EFA",
  personaEmpty: "\uFF08\u6682\u65E0\u5185\u5BB9\uFF09",
  // Recall test
  recallSearchPlaceholder: "\u8F93\u5165\u6D4B\u8BD5\u5173\u952E\u8BCD...",
  recallSearch: "\u6D4B\u8BD5",
  recallSearching: "\u6D4B\u8BD5\u4E2D...",
  recallNoResults: "\u6CA1\u6709\u5339\u914D\u7ED3\u679C",
  recallScore: "\u76F8\u5173\u5EA6",
  recallSource: "\u6765\u6E90",
  recallHint: "\u8F93\u5165\u5173\u952E\u8BCD\uFF0C\u6D4B\u8BD5\u8BB0\u5FC6\u7684 FTS5 \u53EC\u56DE\u6548\u679C",
  // Settings modal
  settingsTitle: "\u8BBE\u7F6E",
  configExtract: "\u62BD\u53D6\u8BBE\u7F6E",
  configPersona: "\u753B\u50CF\u4E0E Embedding",
  batchSize: "\u5B66\u4E60\u6279\u6B21\u5927\u5C0F",
  promoteThreshold: "\u63D0\u70BC\u9608\u503C",
  llmTimeout: "LLM \u8D85\u65F6",
  llmTimeoutUnit: "ms",
  modelSelect: "\u62BD\u53D6\u6A21\u578B",
  modelFollowCurrent: "\u8DDF\u968F\u5F53\u524D\u6A21\u578B",
  personaFreqSessions: "\u6BCF N \u6B21\u4F1A\u8BDD\u66F4\u65B0",
  personaFreqDays: "\u6BCF N \u5929\u66F4\u65B0",
  embedding: "Embedding",
  embeddingAuto: "\u81EA\u52A8\u63A2\u6D4B",
  embeddingNone: "\u4E0D\u4F7F\u7528",
  embeddingModelLabel: "\u6A21\u578B",
  embeddingBaseUrlLabel: "Ollama \u5730\u5740",
  embeddingTimeoutLabel: "\u8D85\u65F6",
  embeddingStatus: "Embedding \u72B6\u6001",
  embeddingEnabled: "\u5DF2\u542F\u7528",
  embeddingKeyword: "\u5173\u952E\u8BCD\u6A21\u5F0F",
  embeddingDisabled: "\u672A\u542F\u7528",
  embeddingTest: "\u6D4B\u8BD5\u8FDE\u63A5",
  embeddingTesting: "\u6D4B\u8BD5\u4E2D...",
  embeddingTestOk: "\u8FDE\u63A5\u6B63\u5E38",
  embeddingTestFail: "\u8FDE\u63A5\u5931\u8D25",
  embeddingProbeAt: "\u4E0A\u6B21\u63A2\u6D4B",
  correctionSignals: "\u7EA0\u6B63\u4FE1\u53F7\u8BCD",
  signalWordsHint: "\u7528\u9017\u53F7\u5206\u9694\u591A\u4E2A\u4FE1\u53F7\u8BCD",
  signalWordsPlaceholder: "\u4F8B\u5982\uFF1A\u4E0D\u5BF9, \u9519\u4E86, \u91CD\u505A",
  saveConfig: "\u4FDD\u5B58\u914D\u7F6E",
  saveSuccess: "\u5DF2\u4FDD\u5B58",
  saveFailed: "\u4FDD\u5B58\u5931\u8D25",
  // Shared states
  loading: "\u52A0\u8F7D\u4E2D...",
  loadFailed: "\u52A0\u8F7D\u5931\u8D25",
  retry: "\u91CD\u8BD5",
  emptyLessons: "\u8FD8\u6CA1\u6709\u6355\u6349\u5230\u6559\u8BAD\uFF0CAgent \u8868\u73B0\u4E0D\u9519 \u{1F44D}",
  emptyRules: "\u6682\u65E0\u5F85\u5BA1\u89C4\u5219",
  emptyMemories: "\u8FD8\u6CA1\u6709\u79EF\u7D2F\u8BB0\u5FC6\uFF0C\u5F00\u59CB\u65B0\u5BF9\u8BDD\u8BA9 Agent \u8BA4\u8BC6\u4F60",
  // Time units
  timeJustNow: "\u521A\u521A",
  timeMinutes: "{n} \u5206\u949F\u524D",
  timeHours: "{n} \u5C0F\u65F6\u524D",
  timeDays: "{n} \u5929\u524D"
};
var en = {
  tab: "Memory",
  title: "Long-term Memory",
  tabLessons: "Lessons",
  tabRules: "Rules",
  tabMemories: "Memories",
  tabPersona: "Persona",
  recallTab: "Recall Test",
  configBtn: "Config",
  switchOn: "Enabled",
  switchOff: "Disabled",
  switchHint: "When on, auto-extracts lessons and memories from conversations",
  overviewLessons: "Pending lessons",
  overviewRules: "Pending rules",
  overviewMemories: "Active memories",
  sidebarSearchPlaceholder: "Search memories...",
  sidebarScopeAll: "All",
  sidebarScopeUser: "User",
  sidebarScopeProject: "Project",
  sidebarScopeDomain: "Domain",
  sidebarScopeEpisodic: "Episodic",
  sidebarStatsMemories: "Total",
  sidebarStatsActive: "Active",
  sidebarScopeHint: "Scope applies to Memories & Recall Test only",
  triggerToolError: "Tool Error",
  triggerUserCorrection: "User Correction",
  triggerSelfFix: "Agent Self-Fix",
  rootCause: "Root Cause",
  correctAction: "Correct Action",
  rule: "Guard Rule (draft)",
  context: "Context",
  extractRule: "Extract Rule",
  ignore: "Ignore",
  collapse: "Collapse",
  ignoreConfirm: "Ignore this lesson?",
  filterAll: "All",
  filterPending: "Pending",
  filterPromoted: "Extracted",
  filterIgnored: "Ignored",
  rulePending: "Pending Review",
  ruleApproved: "Approved",
  ruleSource: "Source",
  approve: "Approve",
  edit: "Edit",
  reject: "Reject",
  rejectConfirm: "Reject this rule? This action cannot be undone.",
  graduable: "Can Graduate",
  emptyApproved: "No approved rules yet",
  editRule: "Edit Rule",
  promoteRule: "Promote to AGENTS.md",
  promoteDraft: "AGENTS.md Draft",
  promoteHint: "After verification, paste it into the matching section of AGENTS.md.",
  category: "Category",
  tagsLabel: "Tags",
  tagsHint: "Comma-separated",
  hitCount: "Hits",
  lastHit: "Last Hit",
  never: "never",
  moreSource: "and {n} more",
  categoryCoding: "Coding",
  categoryCommunication: "Communication",
  categoryWorkflow: "Workflow",
  categorySafety: "Safety",
  save: "Save",
  saving: "Saving...",
  cancel: "Cancel",
  confirm: "Confirm",
  copy: "Copy",
  copied: "Copied",
  contentLabel: "Rule content",
  contentPlaceholder: "Describe what this rule enforces...",
  promoteLoading: "Generating draft...",
  contentRequired: "Rule content cannot be empty",
  conflictWarningTitle: "Possible rule conflict",
  conflictWarningBody: "This rule overlaps by >60% with {n} already-approved rule(s):\n{list}\nKeep the new rule?",
  memNoResults: "No matching memories",
  memScopeAll: "All scopes",
  memScopeUser: "user",
  memScopeProject: "project",
  memScopeDomain: "domain",
  memScopeEpisodic: "episodic",
  memTypeUser: "USER",
  memTypePreference: "PREFERENCE",
  memTypeProject: "PROJECT",
  memTypeFact: "FACT",
  memTypeSkill: "SKILL",
  memTypeEvent: "EVENT",
  memTypeTask: "TASK",
  memOriginOwner: "Owner",
  memOriginAgent: "Agent",
  memOriginUntrusted: "Untrusted",
  memOriginSystem: "System",
  memOriginUserEdited: "User-edited",
  memStatusActive: "Active",
  memStatusSuperseded: "Superseded",
  memStatusArchived: "Archived",
  memWeight: "Weight",
  memAccess: "Hits",
  memArchive: "Archive",
  memArchiveConfirm: "Archive this memory?",
  memDelete: "Delete",
  memDeleteHard: "Hard delete",
  memDeleteConfirm: "Delete this memory? This action cannot be undone.",
  memDeleteReasonLabel: "Reason",
  memDeleteReasonHint: "Reason required when deleting user-scope memories (audit log)",
  memDeleteReasonPlaceholder: "e.g. test residue / no longer needed",
  memHardDeleteLabel: "Hard delete (physically remove, otherwise archive)",
  memArchiveSuccess: "Archived",
  memDeleteSuccess: "Deleted",
  memFilterStatus: "Status",
  memFilterType: "Type",
  personaRebuild: "Rebuild Persona",
  personaRebuilding: "Rebuilding...",
  personaLastUpdated: "Last updated",
  personaTechStack: "Tech Stack",
  personaCodingStyle: "Coding Style",
  personaCommunication: "Communication",
  personaCommonTasks: "Common Tasks",
  personaEditValue: "Edit Persona",
  personaValueLabel: "Persona value",
  personaValuePlaceholder: "Enter persona content...",
  personaEmptyHint: "No persona yet \u2014 rebuild after accumulating enough USER memories",
  personaEmpty: "(empty)",
  recallSearchPlaceholder: "Enter test keywords...",
  recallSearch: "Test",
  recallSearching: "Testing...",
  recallNoResults: "No matching results",
  recallScore: "Relevance",
  recallSource: "Source",
  recallHint: "Enter keywords to test FTS5 memory recall",
  settingsTitle: "Settings",
  configExtract: "Extraction",
  configPersona: "Persona & Embedding",
  batchSize: "Learning batch size",
  promoteThreshold: "Extraction threshold",
  llmTimeout: "LLM timeout",
  llmTimeoutUnit: "ms",
  modelSelect: "Extractor model",
  modelFollowCurrent: "Follow current model",
  personaFreqSessions: "Update every N sessions",
  personaFreqDays: "Update every N days",
  embedding: "Embedding",
  embeddingAuto: "Auto-detect",
  embeddingNone: "Disabled",
  embeddingModelLabel: "Model",
  embeddingBaseUrlLabel: "Ollama URL",
  embeddingTimeoutLabel: "Timeout",
  embeddingStatus: "Embedding status",
  embeddingEnabled: "enabled",
  embeddingKeyword: "keyword mode",
  embeddingDisabled: "disabled",
  embeddingTest: "Test Connection",
  embeddingTesting: "Testing...",
  embeddingTestOk: "Connected",
  embeddingTestFail: "Failed",
  embeddingProbeAt: "Last probe",
  correctionSignals: "Correction signals",
  signalWordsHint: "Comma-separated signal words",
  signalWordsPlaceholder: "e.g. wrong, incorrect, redo",
  saveConfig: "Save Config",
  saveSuccess: "Saved",
  saveFailed: "Save failed",
  loading: "Loading...",
  loadFailed: "Load failed",
  retry: "Retry",
  emptyLessons: "No lessons captured yet \u2014 Agent is doing great \u{1F44D}",
  emptyRules: "No rules pending review",
  emptyMemories: "No memories yet \u2014 start a conversation to let Agent learn about you",
  timeJustNow: "just now",
  timeMinutes: "{n} min ago",
  timeHours: "{n} hr ago",
  timeDays: "{n} days ago"
};
function makeSafeTranslate(bound) {
  return (key, vars) => {
    let out = bound(key);
    if (out === void 0 || out === null || out === "" || out === key) out = zh[key] ?? `[${key}]`;
    if (vars !== void 0) {
      for (const [name, value] of Object.entries(vars)) {
        out = out.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
      }
    }
    return out;
  };
}

// src/client/SettingsPanel.tsx
var import_react7 = require("react");

// src/client/primitives.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var TOAST_COLORS = {
  success: C.success,
  error: C.danger,
  warning: C.warn
};
var TOAST_ICONS = { success: "\u2713", error: "\u2715", warning: "\u26A0" };
function Toast(props) {
  if (props.toasts.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: style.toastStack, children: props.toasts.map((toast) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "lm-fade-in",
      style: { ...style.toast, background: TOAST_COLORS[toast.type], color: C.textFg },
      onClick: () => props.onDismiss(toast.id),
      role: "status",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": true, children: TOAST_ICONS[toast.type] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: toast.message })
      ]
    },
    toast.id
  )) });
}
function useToasts() {
  const [toasts, setToasts] = (0, import_react.useState)([]);
  const idRef = (0, import_react.useRef)(0);
  const showToast = (message, type = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3e3);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, showToast, dismissToast };
}
function Modal(props) {
  (0, import_react.useEffect)(() => {
    const onKey = (e) => {
      if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      style: style.modalBackdrop,
      onClick: (e) => {
        if (e.target === e.currentTarget) props.onClose();
      },
      role: "dialog",
      "aria-modal": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lm-fade-in", style: { ...style.modalCard, width: props.width ?? 520 }, onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.modalTitle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: style.modalClose, onClick: props.onClose, "aria-label": "close", children: "\xD7" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: props.children }),
        props.footer !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: style.modalFooter, children: props.footer }) : null
      ] })
    }
  );
}
function ConfirmDialog(props) {
  const { t } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Modal,
    {
      title: props.title,
      onClose: props.onClose,
      width: 420,
      footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lm-btn", style: style.btnOutline, onClick: props.onClose, disabled: props.busy === true, children: t("cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: props.danger === true ? "lm-primary" : "lm-primary",
            style: { ...style.btnPrimary, ...props.danger === true ? { background: C.danger } : {} },
            onClick: props.onConfirm,
            disabled: props.busy === true,
            children: props.confirmLabel ?? t("confirm")
          }
        )
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: font.md, color: C.secondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }, children: props.message })
    }
  );
}
function PopoverMenu(props) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current !== null && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref, style: { position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        className: "lm-iconbtn",
        style: { ...style.iconBtn, opacity: props.visible || open ? 1 : 0, transition: "opacity 0.15s" },
        onClick: (e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        },
        "aria-label": "menu",
        children: "\u22EF"
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lm-fade-in", style: style.popoverMenu, onClick: (e) => e.stopPropagation(), children: props.items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        className: `lm-menuitem${item.danger === true ? " lm-danger" : ""}`,
        style: { ...style.popoverItem, ...item.danger === true ? { color: C.danger } : {} },
        onClick: () => {
          setOpen(false);
          item.onClick();
        },
        children: [
          item.icon !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": true, children: item.icon }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label })
        ]
      },
      i
    )) }) : null
  ] });
}
function SkeletonList(props) {
  const rows = Array.from({ length: props.count ?? 3 });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: rows.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...style.card, ...style.cardPad, marginBottom: space.sm }, children: [60, 40, 30].map((w, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lm-skeleton", style: { height: j === 0 ? 14 : 12, width: `${w}%`, background: C.skeleton, borderRadius: radius.sm, marginBottom: space.sm } }, j)) }, i)) });
}
function EmptyState(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: style.empty, children: props.children });
}
function ErrorState(props) {
  const { t } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: style.errorBox, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: space.md }, children: [
      t("loadFailed"),
      props.message !== void 0 ? ` (${props.message})` : ""
    ] }),
    props.onRetry !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lm-primary", style: style.btnPrimary, onClick: props.onRetry, children: t("retry") }) : null
  ] });
}
function Switch(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      role: "switch",
      "aria-checked": props.checked,
      "aria-label": props.ariaLabel,
      onClick: props.onChange,
      style: { ...style.switch, background: props.checked ? C.accent : C.border },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...style.switchKnob, left: props.checked ? 20 : 2 } })
    }
  );
}
function ConfidenceBar(props) {
  const pct = Math.max(0, Math.min(100, Math.round(props.value * 100)));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.sm }, children: [
    props.label !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: font.xs, color: C.tertiary, minWidth: 40 }, children: props.label }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: style.progressTrack, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: "100%", width: `${pct}%`, background: props.color, transition: "width 0.3s", borderRadius: 3 } }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: font.xs, color: C.tertiary, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }, children: [
      pct,
      "%"
    ] })
  ] });
}
function Chip(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: space.xs,
        fontSize: font.xs,
        fontWeight: 500,
        padding: `2px ${space.sm}px`,
        borderRadius: radius.sm,
        color: props.fg ?? C.secondary,
        background: props.bg ?? C.layer1,
        border: `1px solid ${props.border ?? C.border}`,
        ...props.style
      },
      children: [
        props.icon !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": true, children: props.icon }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.label })
      ]
    }
  );
}

// src/client/SettingsModal.tsx
var import_react2 = require("react");

// src/client/util.ts
function relativeTime(ts, t, now = Date.now()) {
  if (ts === void 0 || ts === null || ts === 0) return "\u2014";
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return t("timeJustNow");
  if (mins < 60) return t("timeMinutes", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("timeHours", { n: hrs });
  const days = Math.floor(hrs / 24);
  return t("timeDays", { n: days });
}
function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string" && tags !== "") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// src/client/api.ts
var BASE = "/plugins/dsh-long-memory/api";
async function getJson(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function sendJson(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...body !== void 0 ? { body: JSON.stringify(body) } : {}
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
function asList(data, ...keys) {
  if (Array.isArray(data)) return data;
  if (data !== null && typeof data === "object") {
    for (const key of keys) {
      const value = data[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}
var getStats = () => getJson("/stats");
var getConfig = () => getJson("/config");
var saveConfig = (payload) => sendJson("POST", "/config", payload);
var setEnabled = (enabled) => sendJson("POST", "/config", { enabled });
var probeEmbedding = () => sendJson("POST", "/config", { __testEmbedding: true });
async function listCorrections() {
  return asList(await getJson("/corrections"), "corrections");
}
var extractCorrection = (id) => sendJson("POST", `/corrections/${encodeURIComponent(id)}/extract`);
var ignoreCorrection = (id) => sendJson("POST", `/corrections/${encodeURIComponent(id)}/ignore`);
async function listRules(status) {
  return asList(await getJson(`/rules?status=${encodeURIComponent(status)}`), "rules", "items");
}
var approveRule = (id) => sendJson("POST", `/rules/${encodeURIComponent(id)}/approve`);
var rejectRule = (id) => sendJson("POST", `/rules/${encodeURIComponent(id)}/reject`);
var updateRule = (id, patch) => sendJson("PUT", `/rules/${encodeURIComponent(id)}`, patch);
async function promoteRule(id) {
  const data = await sendJson("POST", `/rules/${encodeURIComponent(id)}/promote`);
  return String(data.draft ?? data.agents_md ?? data.text ?? "");
}
async function listMemories(query = {}) {
  const params = new URLSearchParams();
  if (query.q !== void 0 && query.q !== "") params.set("q", query.q);
  if (query.scope !== void 0 && query.scope !== "" && query.scope !== "all") params.set("scope", query.scope);
  if (query.type !== void 0 && query.type !== "" && query.type !== "all") params.set("type", query.type);
  if (query.q === void 0 || query.q === "") {
    if (query.status !== void 0 && query.status !== "" && query.status !== "all") params.set("status", query.status);
  }
  if (query.limit !== void 0) params.set("limit", String(query.limit));
  const qs = params.toString();
  return asList(await getJson(`/memories${qs !== "" ? `?${qs}` : ""}`), "rows", "items", "memories");
}
var archiveMemory = (id) => sendJson("PUT", `/memories/${encodeURIComponent(id)}`, { status: "archived" });
async function deleteMemory(id, hard, reason) {
  const r = await fetch(`${BASE}/memories`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, hard, reason: reason ?? (hard ? "ui-hard-delete" : "ui-delete") })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// src/client/SettingsModal.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var DEFAULT_DRAFT = {
  enabled: true,
  batchSize: 3,
  ruleThreshold: 5,
  ruleTokenBudget: 800,
  llmTimeoutMs: 3e4,
  model: "",
  signalWordsText: "",
  embedding: { autoDetect: true, ollamaBaseUrl: "http://127.0.0.1:11434", preferredModel: "bge-m3", timeoutMs: 1e3 }
};
function SettingsModal(props) {
  const { t } = props;
  const [draft, setDraft] = (0, import_react2.useState)(DEFAULT_DRAFT);
  const [saving, setSaving] = (0, import_react2.useState)(false);
  const [testing, setTesting] = (0, import_react2.useState)(false);
  const [message, setMessage] = (0, import_react2.useState)(null);
  const [probeAt, setProbeAt] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    getConfig().then((data) => {
      setDraft({
        enabled: data.enabled !== false,
        batchSize: Number.isFinite(data.batchSize) ? Number(data.batchSize) : 3,
        ruleThreshold: Number.isFinite(data.ruleThreshold) ? Number(data.ruleThreshold) : 5,
        ruleTokenBudget: Number.isFinite(data.ruleTokenBudget) ? Number(data.ruleTokenBudget) : 800,
        llmTimeoutMs: Number.isFinite(data.llmTimeoutMs) ? Number(data.llmTimeoutMs) : 3e4,
        model: typeof data.model === "string" ? data.model : "",
        signalWordsText: Array.isArray(data.signalWords) ? data.signalWords.join(", ") : typeof data.signalWords === "string" ? data.signalWords : "",
        embedding: {
          autoDetect: data.embedding?.autoDetect !== false,
          ollamaBaseUrl: data.embedding?.ollamaBaseUrl ?? "http://127.0.0.1:11434",
          preferredModel: data.embedding?.preferredModel ?? "bge-m3",
          timeoutMs: Number(data.embedding?.timeoutMs ?? 1e3)
        }
      });
      if (data.embeddingStatus !== void 0) {
        props.setEmbeddingStatus(data.embeddingStatus);
        setProbeAt(Date.now());
      }
    }).catch(() => setMessage({ ok: false, text: t("loadFailed") }));
  }, []);
  const patch = (p) => setDraft((prev) => ({ ...prev, ...p }));
  const patchEmbedding = (p) => setDraft((prev) => ({ ...prev, embedding: { ...prev.embedding, ...p } }));
  const save = () => {
    setSaving(true);
    setMessage(null);
    saveConfig({
      enabled: draft.enabled !== false,
      batchSize: Number(draft.batchSize) || 3,
      ruleThreshold: Number(draft.ruleThreshold) || 5,
      ruleTokenBudget: Number(draft.ruleTokenBudget) || 800,
      llmTimeoutMs: Number(draft.llmTimeoutMs) || 3e4,
      model: draft.model || "",
      signalWords: draft.signalWordsText || "",
      embedding: {
        autoDetect: draft.embedding.autoDetect !== false,
        ollamaBaseUrl: draft.embedding.ollamaBaseUrl || "http://127.0.0.1:11434",
        preferredModel: draft.embedding.preferredModel || "bge-m3",
        timeoutMs: Number(draft.embedding.timeoutMs) || 1e3
      }
    }).then((data) => {
      setSaving(false);
      setMessage({ ok: true, text: t("saveSuccess") });
      if (data.embeddingStatus !== void 0) {
        props.setEmbeddingStatus(data.embeddingStatus);
        setProbeAt(Date.now());
      }
      props.onSaved();
      window.setTimeout(() => setMessage(null), 2500);
    }).catch((e) => {
      setSaving(false);
      setMessage({ ok: false, text: `${t("saveFailed")}${e instanceof Error ? ` (${e.message})` : ""}` });
    });
  };
  const testEmbedding = () => {
    setTesting(true);
    probeEmbedding().then((data) => {
      setTesting(false);
      if (data.embeddingStatus !== void 0) {
        props.setEmbeddingStatus(data.embeddingStatus);
        setProbeAt(Date.now());
        const ok = data.embeddingStatus.mode === "enabled";
        setMessage({ ok, text: ok ? t("embeddingTestOk") : t("embeddingTestFail") });
      }
      window.setTimeout(() => setMessage(null), 2500);
    }).catch((e) => {
      setTesting(false);
      setMessage({ ok: false, text: `${t("embeddingTestFail")}${e instanceof Error ? ` (${e.message})` : ""}` });
    });
  };
  const embeddingStatusLabel = () => {
    const st = props.embeddingStatus;
    if (st === null) return `${t("embeddingProbeAt")}: \u2014`;
    const base = st.mode === "enabled" ? `${String(st.model ?? "embedding")} ${t("embeddingEnabled")}` : st.mode === "keyword" ? t("embeddingKeyword") : t("embeddingDisabled");
    return probeAt !== null ? `${base} (${t("embeddingProbeAt")}: ${relativeTime(probeAt, t)})` : base;
  };
  const statusColor = message !== null ? message.ok ? C.success : C.danger : props.embeddingStatus?.mode === "enabled" ? C.success : props.embeddingStatus?.mode === "keyword" ? C.accent : C.tertiary;
  const field = (label, node) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: style.label, children: label }),
    node
  ] });
  const numberInput = (value, on, min, max, step) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "number", style: style.input, value, min, max, step, onChange: (e) => on(Number(e.target.value)) });
  const cardBox = { ...style.card, ...style.cardPad, marginBottom: space.md };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    Modal,
    {
      title: t("settingsTitle"),
      onClose: props.onClose,
      width: 620,
      footer: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { flex: 1, fontSize: font.sm, color: statusColor, alignSelf: "center", textAlign: "left" }, children: message !== null ? message.text : `${t("embeddingStatus")}: ${embeddingStatusLabel()}` }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "lm-btn", style: style.btnOutline, onClick: props.onClose, children: t("cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "lm-primary", style: style.btnPrimary, disabled: saving, onClick: save, children: saving ? t("saving") : t("saveConfig") })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", flexDirection: "column", maxHeight: "60vh", overflowY: "auto", paddingRight: space.xs }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: cardBox, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...style.sectionTitle, fontSize: font.md, marginBottom: space.md }, children: t("configExtract") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md }, children: [
            field(t("batchSize"), numberInput(draft.batchSize, (n) => patch({ batchSize: n }), 1, 100)),
            field(t("promoteThreshold"), numberInput(draft.ruleThreshold, (n) => patch({ ruleThreshold: n }), 1, 100)),
            field(`${t("llmTimeout")} (${t("llmTimeoutUnit")})`, numberInput(draft.llmTimeoutMs, (n) => patch({ llmTimeoutMs: n }), 1e3, void 0, 1e3)),
            field(t("modelSelect"), /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { style: style.input, value: draft.model, placeholder: t("modelFollowCurrent"), onChange: (e) => patch({ model: e.target.value }) }))
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: cardBox, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...style.sectionTitle, fontSize: font.md, marginBottom: space.md }, children: t("embedding") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md }, children: [
            field(t("embedding"), /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { style: style.input, value: draft.embedding.autoDetect ? "auto" : "none", onChange: (e) => patchEmbedding({ autoDetect: e.target.value === "auto" }), children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "auto", children: t("embeddingAuto") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "none", children: t("embeddingNone") })
            ] })),
            field(t("embeddingModelLabel"), /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { style: style.input, value: draft.embedding.preferredModel, onChange: (e) => patchEmbedding({ preferredModel: e.target.value }) })),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { gridColumn: "1 / -1" }, children: field(t("embeddingBaseUrlLabel"), /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { style: style.input, value: draft.embedding.ollamaBaseUrl, onChange: (e) => patchEmbedding({ ollamaBaseUrl: e.target.value }) })) }),
            field(`${t("embeddingTimeoutLabel")} (${t("llmTimeoutUnit")})`, numberInput(draft.embedding.timeoutMs, (n) => patchEmbedding({ timeoutMs: n }), 100, void 0, 100)),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { alignSelf: "end" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "lm-btn", style: style.btnOutline, disabled: testing, onClick: testEmbedding, children: testing ? t("embeddingTesting") : t("embeddingTest") }) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: cardBox, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: style.label, children: t("correctionSignals") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { style: { ...style.textarea, minHeight: 56 }, value: draft.signalWordsText, placeholder: t("signalWordsPlaceholder"), onChange: (e) => patch({ signalWordsText: e.target.value }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: style.desc, children: t("signalWordsHint") })
        ] })
      ] })
    }
  );
}

// src/client/tabs/CorrectionsTab.tsx
var import_react3 = require("react");

// src/client/meta.ts
var triggerMeta = {
  tool_error: { icon: "\u{1F534}", labelKey: "triggerToolError" },
  user_correction: { icon: "\u{1F7E1}", labelKey: "triggerUserCorrection" },
  self_fix: { icon: "\u{1F7E2}", labelKey: "triggerSelfFix" }
};
var triggerFallback = { icon: "\u26AA", labelKey: "triggerToolError" };
var CATEGORY_PALETTES = {
  coding: {
    light: { icon: "\u{1F4BB}", labelKey: "categoryCoding", fg: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)" },
    dark: { icon: "\u{1F4BB}", labelKey: "categoryCoding", fg: "#93c5fd", bg: "rgba(147,197,253,0.15)", border: "rgba(147,197,253,0.35)" }
  },
  communication: {
    light: { icon: "\u{1F4AC}", labelKey: "categoryCommunication", fg: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.35)" },
    dark: { icon: "\u{1F4AC}", labelKey: "categoryCommunication", fg: "#86efac", bg: "rgba(134,239,172,0.15)", border: "rgba(134,239,172,0.35)" }
  },
  workflow: {
    light: { icon: "\u2699\uFE0F", labelKey: "categoryWorkflow", fg: "#ea580c", bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.35)" },
    dark: { icon: "\u2699\uFE0F", labelKey: "categoryWorkflow", fg: "#fdba74", bg: "rgba(253,186,116,0.15)", border: "rgba(253,186,116,0.35)" }
  },
  safety: {
    light: { icon: "\u{1F6E1}", labelKey: "categorySafety", fg: "#dc2626", bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.35)" },
    dark: { icon: "\u{1F6E1}", labelKey: "categorySafety", fg: "#fca5a5", bg: "rgba(252,165,165,0.15)", border: "rgba(252,165,165,0.35)" }
  }
};
var TYPE_PALETTES = {
  USER: { light: { icon: "\u{1F464}", labelKey: "memTypeUser", fg: "#7c3aed" }, dark: { icon: "\u{1F464}", labelKey: "memTypeUser", fg: "#c4b5fd" } },
  PREFERENCE: { light: { icon: "\u2764\uFE0F", labelKey: "memTypePreference", fg: "#e11d48" }, dark: { icon: "\u2764\uFE0F", labelKey: "memTypePreference", fg: "#fda4af" } },
  PROJECT: { light: { icon: "\u{1F4C1}", labelKey: "memTypeProject", fg: "#d97706" }, dark: { icon: "\u{1F4C1}", labelKey: "memTypeProject", fg: "#fcd34d" } },
  FACT: { light: { icon: "\u{1F4CC}", labelKey: "memTypeFact", fg: "#2563eb" }, dark: { icon: "\u{1F4CC}", labelKey: "memTypeFact", fg: "#93c5fd" } },
  SKILL: { light: { icon: "\u{1F6E0}", labelKey: "memTypeSkill", fg: "#059669" }, dark: { icon: "\u{1F6E0}", labelKey: "memTypeSkill", fg: "#6ee7b7" } },
  EVENT: { light: { icon: "\u{1F4C5}", labelKey: "memTypeEvent", fg: "#7c3aed" }, dark: { icon: "\u{1F4C5}", labelKey: "memTypeEvent", fg: "#c4b5fd" } },
  TASK: { light: { icon: "\u2705", labelKey: "memTypeTask", fg: "#059669" }, dark: { icon: "\u2705", labelKey: "memTypeTask", fg: "#6ee7b7" } }
};
var TYPE_FALLBACK = {
  light: { icon: "\u26AA", labelKey: null, fg: "#64748b" },
  dark: { icon: "\u26AA", labelKey: null, fg: "#94a3b8" }
};
function palette() {
  return detectColorScheme();
}
function categoryMeta(category) {
  const p = CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.coding;
  return p[palette()];
}
function memoryTypeMeta(type) {
  const p = TYPE_PALETTES[type];
  return p ? p[palette()] : TYPE_FALLBACK[palette()];
}
var memoryOriginMeta = {
  owner: { icon: "\u{1F451}", labelKey: "memOriginOwner" },
  agent: { icon: "\u{1F916}", labelKey: "memOriginAgent" },
  untrusted: { icon: "\u26A0\uFE0F", labelKey: "memOriginUntrusted" },
  system: { icon: "\u{1F5A5}\uFE0F", labelKey: "memOriginSystem" },
  "user-edited": { icon: "\u270F\uFE0F", labelKey: "memOriginUserEdited" }
};
var memoryOriginFallback = { icon: "\u26AA", labelKey: null };

// src/client/tabs/CorrectionsTab.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function CorrectionCard(props) {
  const { correction: c, t } = props;
  const [expanded, setExpanded] = (0, import_react3.useState)(false);
  const [pulsing, setPulsing] = (0, import_react3.useState)(false);
  const ref = (0, import_react3.useRef)(null);
  const meta = triggerMeta[c.trigger] ?? triggerFallback;
  (0, import_react3.useEffect)(() => {
    if (!props.highlighted || ref.current === null) return;
    try {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
    }
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), 2200);
    return () => window.clearTimeout(timer);
  }, [props.highlighted]);
  const detailRow = (icon, label, value) => value === void 0 || value === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { marginBottom: space.sm }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.xs }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "aria-hidden": true, style: { fontSize: font.sm }, children: icon }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: font.sm, fontWeight: 600, color: C.text }, children: label })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: font.md, color: C.secondary, paddingLeft: space.xl, lineHeight: 1.6 }, children: value })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      ref,
      className: "lm-card",
      style: {
        ...style.card,
        marginBottom: space.sm,
        overflow: "hidden",
        boxShadow: pulsing ? `0 0 0 2px ${C.accent}` : "none",
        borderColor: pulsing ? C.accent : C.border,
        transition: "box-shadow 0.4s ease-out, border-color 0.4s ease-out"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            style: { padding: `${space.md}px ${space.lg}px`, cursor: "pointer" },
            onClick: () => setExpanded((v) => !v),
            role: "button",
            "aria-expanded": expanded,
            tabIndex: 0,
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", gap: space.sm }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.xs }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "aria-hidden": true, style: { fontSize: font.sm }, children: meta.icon }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: font.md, fontWeight: 600, color: C.text }, children: t(meta.labelKey) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: font.sm, color: C.secondary, marginLeft: space.xl, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }, children: c.error_summary ?? "" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: font.xs, color: C.tertiary, marginTop: space.xs, marginLeft: space.xl }, children: relativeTime(c.created_at, t) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.sm, flexShrink: 0 }, children: [
                c.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "lm-primary", style: { ...style.btnPrimary, height: 28, fontSize: font.sm }, onClick: (e) => {
                  e.stopPropagation();
                  props.onExtract(c);
                }, children: t("extractRule") }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: font.sm, color: C.tertiary }, children: expanded ? "\u25B2" : "\u25BC" })
              ] })
            ] })
          }
        ),
        expanded ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { borderTop: `1px solid ${C.border}`, padding: `${space.lg}px ${space.xl}px` }, children: [
          detailRow("\u{1F4CC}", t("rootCause"), c.root_cause),
          detailRow("\u2705", t("correctAction"), c.correct_action),
          detailRow("\u{1F6E1}", t("rule"), c.rule),
          detailRow("\u{1F4CE}", t("context"), c.context),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: space.sm, marginTop: space.md }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "lm-btn lm-danger", style: style.btnDanger, onClick: () => props.onIgnore(c), children: t("ignore") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "lm-primary", style: style.btnPrimary, onClick: () => props.onExtract(c), children: t("extractRule") })
          ] })
        ] }) : null
      ]
    }
  );
}
function CorrectionsTab(props) {
  const { t } = props;
  const [corrections, setCorrections] = (0, import_react3.useState)(null);
  const [loading, setLoading] = (0, import_react3.useState)(true);
  const [error, setError] = (0, import_react3.useState)(null);
  const [filter, setFilter] = (0, import_react3.useState)("all");
  const [confirmIgnore, setConfirmIgnore] = (0, import_react3.useState)(null);
  const filterOptions = [
    { key: "all", label: t("filterAll") },
    { key: "pending", label: t("filterPending") },
    { key: "promoted", label: t("filterPromoted") },
    { key: "ignored", label: t("filterIgnored") }
  ];
  const refreshBadges = () => {
    void getStats().then((data) => {
      props.setBadges((prev) => ({ ...prev, lessons: data.corrections_pending ?? 0, rules: data.rules_proposed ?? 0 }));
    }).catch(() => {
    });
  };
  const load = () => {
    setLoading(true);
    setError(null);
    listCorrections().then((data) => {
      setCorrections(data);
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
  };
  (0, import_react3.useEffect)(() => {
    load();
    refreshBadges();
  }, []);
  (0, import_react3.useEffect)(() => {
    if (props.highlightId === null) return;
    if (filter !== "all") setFilter("all");
    const timer = window.setTimeout(() => props.onClearHighlight(), 2600);
    return () => window.clearTimeout(timer);
  }, [props.highlightId]);
  const doExtract = (c) => {
    extractCorrection(c.id).then(() => {
      load();
      refreshBadges();
    }).catch(() => props.showToast(t("loadFailed"), "error"));
  };
  const doIgnore = (c) => {
    ignoreCorrection(c.id).then(() => load()).catch(() => props.showToast(t("loadFailed"), "error"));
  };
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(SkeletonList, { count: 3 });
  if (error !== null) return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ErrorState, { t, message: error, onRetry: load });
  if (corrections !== null && corrections.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(EmptyState, { children: t("emptyLessons") });
  const filtered = (corrections ?? []).filter((c) => filter === "all" || c.status === filter);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", gap: space.sm, marginBottom: space.md, flexWrap: "wrap" }, children: filterOptions.map((opt) => {
      const active = filter === opt.key;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          className: "lm-btn",
          onClick: () => setFilter(opt.key),
          style: {
            ...style.btnPill,
            background: active ? C.accent : "transparent",
            color: active ? C.textFg : C.secondary,
            borderColor: active ? C.accent : C.border
          },
          children: opt.label
        },
        opt.key
      );
    }) }),
    filtered.map((c) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      CorrectionCard,
      {
        correction: c,
        t,
        highlighted: props.highlightId === c.id,
        onExtract: doExtract,
        onIgnore: setConfirmIgnore
      },
      c.id
    )),
    confirmIgnore !== null ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      ConfirmDialog,
      {
        t,
        title: t("ignore"),
        message: t("ignoreConfirm"),
        confirmLabel: t("ignore"),
        danger: true,
        onConfirm: () => {
          doIgnore(confirmIgnore);
          setConfirmIgnore(null);
        },
        onClose: () => setConfirmIgnore(null)
      }
    ) : null
  ] });
}

// src/client/tabs/RulesTab.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var CATEGORY_KEYS = ["coding", "communication", "workflow", "safety"];
var PROMOTE_HIT_THRESHOLD = 20;
function ruleSources(rule) {
  return rule.source_correction_ids ?? rule.correction_ids ?? rule.sources ?? [];
}
function RuleCard(props) {
  const { rule, t } = props;
  const cat = categoryMeta(rule.category);
  const tags = parseTags(rule.tags);
  const sources = ruleSources(rule);
  const shownSources = sources.slice(0, 3);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "lm-card", style: { ...style.card, ...style.cardPad, marginBottom: space.sm }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.xs, flexWrap: "wrap", marginBottom: space.sm }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Chip, { icon: cat.icon, label: t(cat.labelKey), fg: cat.fg, bg: cat.bg, border: cat.border }),
      tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Chip, { label: `#${tag}` }, tag))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: font.md, color: C.text, lineHeight: 1.6, marginBottom: space.sm }, children: rule.content }),
    props.kind === "approved" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: space.lg, fontSize: font.xs, color: C.tertiary, marginBottom: space.sm }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        t("hitCount"),
        ": ",
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("b", { style: { color: C.text }, children: rule.hit_count ?? 0 })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        t("lastHit"),
        ": ",
        rule.last_hit_at !== void 0 && rule.last_hit_at > 0 ? relativeTime(rule.last_hit_at, t) : t("never")
      ] })
    ] }) : null,
    sources.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.xs, flexWrap: "wrap", marginBottom: space.sm, fontSize: font.xs, color: C.tertiary }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { "aria-hidden": true, children: "\u{1F517}" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        t("ruleSource"),
        ":"
      ] }),
      shownSources.map((id) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          className: "lm-btn",
          style: { ...style.btnPill, height: 20, fontSize: font.xs, padding: `0 ${space.sm}px` },
          onClick: () => props.onJumpToCorrection(id),
          children: id.length > 10 ? `${id.slice(0, 10)}\u2026` : id
        },
        id
      )),
      sources.length > 3 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("moreSource", { n: sources.length - 3 }) }) : null
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { display: "flex", justifyContent: "flex-end", gap: space.sm }, children: props.kind === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-btn lm-danger", style: style.btnDanger, disabled: props.busy, onClick: () => props.onReject(rule), children: t("reject") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-btn", style: style.btnOutline, disabled: props.busy, onClick: () => props.onEdit(rule), children: t("edit") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-primary", style: style.btnPrimary, disabled: props.busy, onClick: () => props.onApprove(rule), children: t("approve") })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-btn", style: style.btnOutline, disabled: props.busy, onClick: () => props.onEdit(rule), children: t("edit") }),
      (rule.hit_count ?? 0) > PROMOTE_HIT_THRESHOLD ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { className: "lm-btn", style: { ...style.btnOutline, color: C.warn, borderColor: C.warn }, disabled: props.busy, onClick: () => props.onPromote(rule), children: [
        "\u2B50 ",
        t("graduable")
      ] }) : null
    ] }) })
  ] });
}
function EditModal(props) {
  const { t } = props;
  const [content, setContent] = (0, import_react4.useState)(props.rule.content);
  const [category, setCategory] = (0, import_react4.useState)(props.rule.category || "coding");
  const [tagsStr, setTagsStr] = (0, import_react4.useState)(parseTags(props.rule.tags).join(", "));
  const [saving, setSaving] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const save = () => {
    if (content.trim() === "") {
      setError(t("contentRequired"));
      return;
    }
    setSaving(true);
    const tags = tagsStr.split(",").map((s) => s.trim()).filter(Boolean);
    props.onSave({ content: content.trim(), category, tags }).then(() => props.onClose()).catch((e) => {
      setSaving(false);
      setError(e instanceof Error ? e.message : String(e));
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    Modal,
    {
      title: t("editRule"),
      onClose: props.onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-btn", style: style.btnOutline, onClick: props.onClose, disabled: saving, children: t("cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-primary", style: style.btnPrimary, onClick: save, disabled: saving, children: saving ? t("saving") : t("save") })
      ] }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { marginBottom: space.md }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: style.label, children: t("contentLabel") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("textarea", { style: style.textarea, value: content, placeholder: t("contentPlaceholder"), onChange: (e) => setContent(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, marginBottom: space.md }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: style.label, children: t("category") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("select", { style: style.input, value: category, onChange: (e) => setCategory(e.target.value), children: CATEGORY_KEYS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("option", { value: k, children: [
              categoryMeta(k).icon,
              " ",
              t(`category${k.charAt(0).toUpperCase()}${k.slice(1)}`)
            ] }, k)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: style.label, children: t("tagsLabel") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { style: style.input, value: tagsStr, placeholder: t("tagsHint"), onChange: (e) => setTagsStr(e.target.value) })
          ] })
        ] }),
        error !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: font.sm, color: C.danger }, children: error }) : null
      ]
    }
  );
}
function PromoteModal(props) {
  const { t } = props;
  const [draft, setDraft] = (0, import_react4.useState)(null);
  const [error, setError] = (0, import_react4.useState)(null);
  const [copied, setCopied] = (0, import_react4.useState)(false);
  (0, import_react4.useEffect)(() => {
    promoteRule(props.rule.id).then((text) => setDraft(text)).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [props.rule.id]);
  const copy = () => {
    if (draft === null) return;
    void navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2e3);
    }).catch(() => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    Modal,
    {
      title: t("promoteRule"),
      onClose: props.onClose,
      width: 600,
      footer: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "lm-primary", style: style.btnPrimary, onClick: copy, disabled: draft === null, children: copied ? t("copied") : t("copy") }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: { fontSize: font.sm, color: C.tertiary, marginTop: 0, marginBottom: space.md }, children: t("promoteHint") }),
        error !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: font.sm, color: C.danger }, children: error }) : draft === null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: font.md, color: C.tertiary }, children: t("promoteLoading") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("pre", { style: codeBlockStyle, children: draft })
      ]
    }
  );
}
function RulesTab(props) {
  const { t } = props;
  const [pending, setPending] = (0, import_react4.useState)([]);
  const [approved, setApproved] = (0, import_react4.useState)([]);
  const [loading, setLoading] = (0, import_react4.useState)(true);
  const [error, setError] = (0, import_react4.useState)(null);
  const [busyId, setBusyId] = (0, import_react4.useState)(null);
  const [editing, setEditing] = (0, import_react4.useState)(null);
  const [promoting, setPromoting] = (0, import_react4.useState)(null);
  const [rejectTarget, setRejectTarget] = (0, import_react4.useState)(null);
  const [conflict, setConflict] = (0, import_react4.useState)(null);
  const refreshBadges = () => {
    void getStats().then((data) => props.setBadges((prev) => ({ ...prev, rules: data.rules_proposed ?? 0 }))).catch(() => {
    });
  };
  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([listRules("proposed"), listRules("approved")]).then(([p, a]) => {
      setPending(p);
      setApproved(a);
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
  };
  (0, import_react4.useEffect)(() => {
    load();
  }, []);
  const finishApprove = (rule) => {
    setBusyId(rule.id);
    approveRule(rule.id).then((data) => {
      const conflicts = data?.warning?.conflicts;
      if (Array.isArray(conflicts) && conflicts.length > 0) {
        const list = conflicts.map((c) => `\u2022 [${Math.round((c.overlap ?? 0) * 100)}%] ${c.content}`).join("\n");
        setConflict({ rule, body: t("conflictWarningBody", { n: conflicts.length, list }) });
      }
      setBusyId(null);
      load();
      refreshBadges();
    }).catch(() => {
      setBusyId(null);
      props.showToast(t("loadFailed"), "error");
    });
  };
  const doReject = (rule) => {
    setBusyId(rule.id);
    rejectRule(rule.id).then(() => {
      setBusyId(null);
      load();
      refreshBadges();
    }).catch(() => {
      setBusyId(null);
      props.showToast(t("loadFailed"), "error");
    });
  };
  const saveEdit = (patch) => {
    if (editing === null) return Promise.reject(new Error("no rule"));
    return updateRule(editing.id, patch).then(() => {
      load();
      refreshBadges();
    });
  };
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SkeletonList, { count: 4 });
  if (error !== null) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ErrorState, { t, message: error, onRetry: load });
  const sectionHeader = (label, count) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.sm, margin: `${space.sm}px 0 ${space.md}px`, fontSize: font.md, fontWeight: 600, color: C.text }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: font.xs, color: C.tertiary, fontWeight: 500 }, children: count })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
    sectionHeader(t("rulePending"), pending.length),
    pending.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(EmptyState, { children: t("emptyRules") }) : pending.map((r) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      RuleCard,
      {
        rule: r,
        kind: "pending",
        t,
        busy: busyId === r.id,
        onApprove: finishApprove,
        onReject: setRejectTarget,
        onEdit: setEditing,
        onPromote: setPromoting,
        onJumpToCorrection: props.onJumpToCorrection
      },
      r.id
    )),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { height: 1, background: C.border, margin: `${space.lg}px 0` } }),
    sectionHeader(t("ruleApproved"), approved.length),
    approved.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(EmptyState, { children: t("emptyApproved") }) : approved.map((r) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      RuleCard,
      {
        rule: r,
        kind: "approved",
        t,
        busy: busyId === r.id,
        onApprove: finishApprove,
        onReject: setRejectTarget,
        onEdit: setEditing,
        onPromote: setPromoting,
        onJumpToCorrection: props.onJumpToCorrection
      },
      r.id
    )),
    editing !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(EditModal, { rule: editing, t, onSave: saveEdit, onClose: () => setEditing(null) }) : null,
    promoting !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PromoteModal, { rule: promoting, t, onClose: () => setPromoting(null) }) : null,
    rejectTarget !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ConfirmDialog,
      {
        t,
        title: t("reject"),
        message: t("rejectConfirm"),
        confirmLabel: t("reject"),
        danger: true,
        onConfirm: () => {
          doReject(rejectTarget);
          setRejectTarget(null);
        },
        onClose: () => setRejectTarget(null)
      }
    ) : null,
    conflict !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ConfirmDialog,
      {
        t,
        title: t("conflictWarningTitle"),
        message: conflict.body,
        confirmLabel: t("confirm"),
        onConfirm: () => setConflict(null),
        onClose: () => setConflict(null)
      }
    ) : null
  ] });
}

// src/client/tabs/MemoriesTab.tsx
var import_react5 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var STATUS_KEYS = ["all", "active", "archived", "superseded"];
var TYPE_KEYS = ["all", "USER", "PREFERENCE", "PROJECT", "FACT", "SKILL", "EVENT", "TASK"];
function MemoryCard(props) {
  const { memory: m, t } = props;
  const [hover, setHover] = (0, import_react5.useState)(false);
  const typeMeta = memoryTypeMeta(m.type);
  const originMeta = memoryOriginMeta[m.origin ?? ""] ?? memoryOriginFallback;
  const isArchived = m.status === "archived";
  const tags = parseTags(m.tags);
  const confidence = m.confidence ?? 0;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "div",
    {
      className: "lm-card",
      style: { ...style.card, ...style.cardPad, marginBottom: space.sm, position: "relative", opacity: isArchived ? 0.6 : 1 },
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.xs, flexWrap: "wrap", marginBottom: space.sm, paddingRight: 28 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Chip, { icon: typeMeta.icon, label: typeMeta.labelKey !== null ? t(typeMeta.labelKey) : m.type, fg: typeMeta.fg }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Chip, { icon: "\u{1F4CD}", label: m.scope }),
          m.status !== "active" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Chip, { label: t(m.status === "archived" ? "memStatusArchived" : "memStatusSuperseded") }) : null
        ] }),
        !isArchived ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { position: "absolute", top: space.sm, right: space.sm }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          PopoverMenu,
          {
            visible: hover,
            items: [
              { icon: "\u{1F4E6}", label: t("memArchive"), onClick: () => props.onArchive(m) },
              { icon: "\u{1F5D1}", label: t("memDelete"), danger: true, onClick: () => props.onDelete(m) }
            ]
          }
        ) }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: font.md, color: C.text, lineHeight: 1.6, marginBottom: space.sm, wordBreak: "break-word" }, children: m.content }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginBottom: space.sm }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ConfidenceBar, { value: confidence, color: confidence >= 0.7 ? "var(--dsw-alias-state-success-primary, #30a46c)" : confidence >= 0.4 ? "var(--dsw-alias-brand-primary, #3b6ef6)" : "var(--dsw-alias-label-tertiary, #8a9099)", label: t("memWeight") }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.lg, fontSize: font.xs, color: C.tertiary, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
            originMeta.icon,
            " ",
            originMeta.labelKey !== null ? t(originMeta.labelKey) : m.origin
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
            t("memAccess"),
            ": ",
            m.access_count ?? 0
          ] }),
          m.observed_at !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: relativeTime(m.observed_at, t) }) : null,
          tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
            "#",
            tag
          ] }, tag))
        ] })
      ]
    }
  );
}
function DeleteDialog(props) {
  const { t } = props;
  const isUser = props.memory.scope === "user";
  const [reason, setReason] = (0, import_react5.useState)("");
  const [hard, setHard] = (0, import_react5.useState)(false);
  const canConfirm = !isUser || reason.trim() !== "";
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    Modal,
    {
      title: t("memDelete"),
      onClose: props.onClose,
      width: 440,
      footer: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "lm-btn", style: style.btnOutline, onClick: props.onClose, children: t("cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "lm-primary", style: { ...style.btnPrimary, background: C.danger }, disabled: !canConfirm, onClick: () => props.onConfirm(hard, reason.trim()), children: t("memDelete") })
      ] }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: font.md, color: C.secondary, lineHeight: 1.6, marginBottom: space.md }, children: t("memDeleteConfirm") }),
        isUser ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { marginBottom: space.md }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: style.label, children: t("memDeleteReasonLabel") }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { style: style.input, value: reason, placeholder: t("memDeleteReasonPlaceholder"), onChange: (e) => setReason(e.target.value) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: style.desc, children: t("memDeleteReasonHint") })
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { style: { display: "flex", alignItems: "center", gap: space.sm, fontSize: font.sm, color: C.secondary, cursor: "pointer" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "checkbox", checked: hard, onChange: (e) => setHard(e.target.checked) }),
          t("memHardDeleteLabel")
        ] })
      ]
    }
  );
}
function MemoriesTab(props) {
  const { t } = props;
  const [memories, setMemories] = (0, import_react5.useState)(null);
  const [loading, setLoading] = (0, import_react5.useState)(true);
  const [error, setError] = (0, import_react5.useState)(null);
  const [statusFilter, setStatusFilter] = (0, import_react5.useState)("all");
  const [typeFilter, setTypeFilter] = (0, import_react5.useState)("all");
  const [scopeFilter, setScopeFilter] = (0, import_react5.useState)(props.scopeFilter ?? "all");
  const [searchInput, setSearchInput] = (0, import_react5.useState)(props.searchQuery ?? "");
  const [activeSearch, setActiveSearch] = (0, import_react5.useState)(props.searchQuery ?? "");
  const [deleteTarget, setDeleteTarget] = (0, import_react5.useState)(null);
  const debounceRef = (0, import_react5.useRef)(null);
  (0, import_react5.useEffect)(() => {
    setScopeFilter(props.scopeFilter ?? "all");
  }, [props.scopeFilter]);
  (0, import_react5.useEffect)(() => {
    setSearchInput(props.searchQuery ?? "");
    setActiveSearch(props.searchQuery ?? "");
  }, [props.searchQuery]);
  const searching = activeSearch.trim() !== "";
  const refreshBadges = () => {
    void listMemories({ status: "active", limit: 200 }).then((list) => props.setBadges((prev) => ({ ...prev, memories: list.length }))).catch(() => {
    });
  };
  const load = () => {
    setLoading(true);
    setError(null);
    listMemories({
      q: searching ? activeSearch.trim() : void 0,
      scope: scopeFilter,
      type: typeFilter,
      status: statusFilter
    }).then((list) => {
      setMemories(list);
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
  };
  (0, import_react5.useEffect)(() => {
    load();
    refreshBadges();
  }, [statusFilter, typeFilter, scopeFilter, activeSearch]);
  const onSearchInput = (value) => {
    setSearchInput(value);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setActiveSearch(value), 300);
  };
  const doArchive = (m) => {
    archiveMemory(m.id).then(() => {
      props.showToast(t("memArchiveSuccess"));
      load();
      refreshBadges();
    }).catch(() => props.showToast(t("loadFailed"), "error"));
  };
  const doDelete = (m, hard, reason) => {
    deleteMemory(m.id, hard, reason).then(() => {
      props.showToast(t("memDeleteSuccess"));
      load();
      refreshBadges();
    }).catch(() => props.showToast(t("loadFailed"), "error"));
  };
  const selectStyle = { ...style.input, width: "auto", minWidth: 120 };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", gap: space.sm, marginBottom: space.md, flexWrap: "wrap", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { position: "relative", flex: 1, minWidth: 200 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "input",
          {
            style: style.input,
            value: searchInput,
            placeholder: t("sidebarSearchPlaceholder"),
            onChange: (e) => onSearchInput(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") setActiveSearch(searchInput);
            }
          }
        ),
        searchInput !== "" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "lm-iconbtn", style: { ...style.iconBtn, position: "absolute", right: 4, top: 4 }, onClick: () => {
          setSearchInput("");
          setActiveSearch("");
        }, "aria-label": "clear", children: "\xD7" }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("select", { style: selectStyle, value: scopeFilter, onChange: (e) => setScopeFilter(e.target.value), "aria-label": "scope", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "all", children: t("memScopeAll") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "user", children: t("memScopeUser") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "project", children: t("memScopeProject") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "domain", children: t("memScopeDomain") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "episodic", children: t("memScopeEpisodic") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("select", { style: selectStyle, value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), disabled: searching, "aria-label": t("memFilterStatus"), children: STATUS_KEYS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: s, children: s === "all" ? t("filterAll") : t(`memStatus${s.charAt(0).toUpperCase()}${s.slice(1)}`) }, s)) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("select", { style: selectStyle, value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), disabled: searching, "aria-label": t("memFilterType"), children: TYPE_KEYS.map((ty) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: ty, children: ty === "all" ? t("filterAll") : ty }, ty)) })
    ] }),
    searching ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontSize: font.xs, color: C.tertiary, marginBottom: space.sm }, children: [
      "\u{1F50D} FTS5: ",
      activeSearch
    ] }) : null,
    loading ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SkeletonList, { count: 3 }) : error !== null ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ErrorState, { t, message: error, onRetry: load }) : memories !== null && memories.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(EmptyState, { children: searching ? t("memNoResults") : t("emptyMemories") }) : (memories ?? []).map((m) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(MemoryCard, { memory: m, t, onArchive: doArchive, onDelete: setDeleteTarget }, m.id)),
    deleteTarget !== null ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      DeleteDialog,
      {
        memory: deleteTarget,
        t,
        onConfirm: (hard, reason) => {
          doDelete(deleteTarget, hard, reason);
          setDeleteTarget(null);
        },
        onClose: () => setDeleteTarget(null)
      }
    ) : null
  ] });
}

// src/client/tabs/RecallTab.tsx
var import_react6 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
function RecallTab(props) {
  const { t } = props;
  const [query, setQuery] = (0, import_react6.useState)("");
  const [results, setResults] = (0, import_react6.useState)(null);
  const [loading, setLoading] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)(null);
  const run = () => {
    const q = query.trim();
    if (q === "") return;
    setLoading(true);
    setResults(null);
    setError(null);
    listMemories({ q, limit: 20 }).then((list) => {
      setResults(list);
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
      props.showToast(t("loadFailed"), "error");
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { style: { ...style.sectionTitle, marginBottom: space.md }, children: t("recallTab") }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { fontSize: font.md, color: C.secondary, marginTop: 0, marginBottom: space.lg }, children: t("recallHint") }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", gap: space.sm, marginBottom: space.lg }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "input",
        {
          style: style.input,
          value: query,
          placeholder: t("recallSearchPlaceholder"),
          onChange: (e) => setQuery(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") run();
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { className: "lm-primary", style: { ...style.btnPrimary, height: 36, flexShrink: 0 }, disabled: loading || query.trim() === "", onClick: run, children: loading ? t("recallSearching") : t("recallSearch") })
    ] }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(SkeletonList, { count: 3 }) : error !== null ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ErrorState, { t, message: error }) : results !== null && results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(EmptyState, { children: t("recallNoResults") }) : (results ?? []).map((m, i) => {
      const typeMeta = memoryTypeMeta(m.type);
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "lm-card", style: { ...style.card, ...style.cardPad, marginBottom: space.sm }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.sm, marginBottom: space.sm }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { style: { fontSize: font.xs, color: C.tertiary, fontVariantNumeric: "tabular-nums" }, children: [
            "#",
            i + 1
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Chip, { icon: typeMeta.icon, label: typeMeta.labelKey !== null ? t(typeMeta.labelKey) : m.type, fg: typeMeta.fg }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Chip, { icon: "\u{1F4CD}", label: m.scope })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { fontSize: font.md, color: C.text, margin: 0, lineHeight: 1.6, wordBreak: "break-word" }, children: (m.content ?? "").slice(0, 300) })
      ] }, m.id);
    })
  ] });
}

// src/client/SettingsPanel.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var TABS = [
  { id: "lessons", labelKey: "tabLessons", badge: "lessons" },
  { id: "rules", labelKey: "tabRules", badge: "rules" },
  { id: "memories", labelKey: "tabMemories", badge: "memories" },
  { id: "recall", labelKey: "recallTab" }
];
var cssInjected = false;
function useInjectCss() {
  (0, import_react7.useEffect)(() => {
    if (cssInjected) return;
    const el = document.createElement("style");
    el.id = "lm-panel-styles";
    el.textContent = PANEL_CSS;
    document.head.appendChild(el);
    cssInjected = true;
  }, []);
}
function SettingsPanel(props) {
  const { t } = props;
  useInjectCss();
  const [enabled, setEnabled2] = (0, import_react7.useState)(true);
  const [activeTab, setActiveTab] = (0, import_react7.useState)("lessons");
  const [badges, setBadges] = (0, import_react7.useState)({ lessons: 0, rules: 0, memories: 0 });
  const [stats, setStats] = (0, import_react7.useState)(null);
  const [highlightId, setHighlightId] = (0, import_react7.useState)(null);
  const [settingsOpen, setSettingsOpen] = (0, import_react7.useState)(false);
  const [embeddingStatus, setEmbeddingStatus] = (0, import_react7.useState)(null);
  const { toasts, showToast, dismissToast } = useToasts();
  const refreshStats = () => {
    void getStats().then((data) => {
      setStats(data);
      setBadges((prev) => ({
        ...prev,
        lessons: data.corrections_pending ?? prev.lessons,
        rules: data.rules_proposed ?? prev.rules,
        memories: data.memories_active ?? prev.memories
      }));
    }).catch(() => {
    });
  };
  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled2(next);
    void setEnabled(next).catch(() => showToast(t("loadFailed"), "error"));
  };
  const renderTab = () => {
    switch (activeTab) {
      case "lessons":
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(CorrectionsTab, { t, setBadges, highlightId, onClearHighlight: () => setHighlightId(null), showToast });
      case "rules":
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(RulesTab, { t, setBadges, showToast, onJumpToCorrection: (id) => {
          setActiveTab("lessons");
          setHighlightId(id);
        } });
      case "memories":
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(MemoriesTab, { t, setBadges, showToast });
      case "recall":
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(RecallTab, { t, showToast });
      default:
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, {});
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "lm-panel lm-scroll", style: { ...style.root, width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: style.main, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: style.header, children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: space.sm }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { style: style.title, children: t("title") }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: space.sm }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { className: "lm-btn", style: { ...style.btnOutline, height: 28, fontSize: font.sm, padding: "0 10px", borderRadius: 14 }, onClick: () => setSettingsOpen(true), children: t("configBtn") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { display: "flex", alignItems: "center", gap: space.xs }, title: t("switchHint"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Switch, { checked: enabled, onChange: toggleEnabled, ariaLabel: enabled ? t("switchOn") : t("switchOff") }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: { fontSize: font.sm, color: enabled ? C.success : C.tertiary, fontWeight: 500 }, children: enabled ? t("switchOn") : t("switchOff") })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { role: "tablist", style: { display: "flex", gap: "2px" }, children: TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeCount = tab.badge !== void 0 ? badges[tab.badge] : 0;
          return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
            "button",
            {
              role: "tab",
              "aria-selected": isActive,
              className: isActive ? "lm-tab lm-tab-active" : "lm-tab",
              onClick: () => setActiveTab(tab.id),
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                border: "none",
                borderRadius: "18px",
                cursor: "pointer",
                fontSize: "14px",
                lineHeight: "22px",
                padding: "0 14px",
                height: "32px",
                fontWeight: 400,
                background: "transparent",
                color: isActive ? C.text : C.secondary,
                transition: "background-color 0.16s ease-out, color 0.16s ease-out"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: t(tab.labelKey) }),
                badgeCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: {
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "18px",
                  minWidth: "18px",
                  padding: "0 5px",
                  borderRadius: "9px",
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: "18px",
                  color: C.textFg,
                  background: C.accent
                }, children: badgeCount }) : null
              ]
            },
            tab.id
          );
        }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { role: "tabpanel", style: style.tabPanel, className: "lm-scroll", children: renderTab() })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Toast, { toasts, onDismiss: dismissToast }),
    settingsOpen ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      SettingsModal,
      {
        t,
        onClose: () => setSettingsOpen(false),
        onSaved: () => {
          refreshStats();
        },
        embeddingStatus,
        setEmbeddingStatus
      }
    ) : null
  ] });
}

// src/client/index.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var NS = "long-memory";
function SidebarEntry(props) {
  const { t } = props;
  const [open, setOpen] = (0, import_react8.useState)(false);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "button",
      {
        className: "lm-row",
        onClick: () => setOpen(true),
        title: t("title"),
        style: {
          display: "flex",
          alignItems: "center",
          gap: space.sm,
          width: "100%",
          border: "none",
          background: "transparent",
          color: C.text,
          cursor: "pointer",
          padding: props.wide ? `8px ${space.md}px` : 8,
          borderRadius: radius.md,
          justifyContent: props.wide ? "flex-start" : "center",
          fontSize: 14
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives.IconDataOutline16, { size: props.wide ? 16 : 18 }),
          props.wide ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("tab") }) : null
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "div",
      {
        style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e4 },
        onClick: (e) => {
          if (e.target === e.currentTarget) setOpen(false);
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { position: "relative", width: "90vw", maxWidth: 1100, height: "85vh", background: C.bg, borderRadius: radius.lg, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "button",
            {
              className: "lm-iconbtn",
              onClick: () => setOpen(false),
              "aria-label": "close",
              style: { ...style.iconBtn, position: "absolute", top: space.sm, right: space.sm, zIndex: 2, fontSize: 20 },
              children: "\xD7"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SettingsPanel, { t })
        ] })
      }
    ) : null
  ] });
}
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: { ...zh }, en: { ...en } }), "long-memory: dictionaries");
  const t = makeSafeTranslate(ctx.locale.bind(NS));
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      { name: "sidebar.footer.action", id: "long-memory", order: 10, locale: NS, inject: () => ({}) },
      (slotProps) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SidebarEntry, { t, wide: slotProps.wide === true })
    )
  );
}

		return module.exports;
	},
});
