window.__ModuleLoader__.load({
	id: "@wwskills/dsh-long-memory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		var j = react_jsx_runtime.jsx, js = react_jsx_runtime.jsxs;
		let slots = require("@deepseek-ai/dsh-client-ui-slots");

		const NS = "long-memory";

		const zh = {
			tab: "长期记忆",
			title: "长期记忆",
			description: "跨会话语义记忆插件。SQLite + FTS5 + 向量召回，8 个 mem_* 工具。",
			embedding: "向量召回",
			fts5: "仅 FTS5",
			pendingConfirms: "待确认",
			memories: "记忆总数",
			pendingTip: "待用户确认的低置信记忆",
			embeddingTip: "当前向量检索提供方",
		};

		const en = {
			tab: "Long Memory",
			title: "Long Memory",
			description: "Cross-session semantic memory. SQLite + FTS5 + vector recall, 8 mem_* tools.",
			embedding: "Vector",
			fts5: "FTS5",
			pendingConfirms: "Pending",
			memories: "Memories",
			pendingTip: "Low-confidence memories awaiting user review",
			embeddingTip: "Current embedding provider",
		};

		// ── Style constants (aligned with DSH official plugin settings) ──
		const cardStyle = {
			background: "var(--dsw-alias-bg-layer-2)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: "12px",
			padding: "20px 24px",
		};

		const headerStyle = {
			fontSize: "16px",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary)",
			margin: "0 0 4px",
		};

		const headerDescStyle = {
			fontSize: "13px",
			color: "var(--dsw-alias-label-tertiary)",
			margin: "0 0 16px",
		};

		const dividerStyle = {
			height: "1px",
			background: "var(--dsw-alias-border-l2)",
			margin: "16px 0",
		};

		const labelStyle = {
			fontSize: "14px",
			fontWeight: 500,
			color: "var(--dsw-alias-label-primary)",
			marginBottom: "4px",
		};

		const descStyle = {
			fontSize: "12px",
			color: "var(--dsw-alias-label-tertiary)",
			marginTop: "4px",
		};

		const inputStyle = {
			height: "40px",
			padding: "0 12px",
			background: "var(--dsw-alias-bg-input)",
			color: "var(--dsw-alias-label-primary)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: "8px",
			fontSize: "14px",
			outline: "none",
			width: "100%",
			boxSizing: "border-box",
		};

		const selectStyle = {
			height: "40px",
			padding: "0 12px",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: "8px",
			fontSize: "14px",
			width: "100%",
			boxSizing: "border-box",
		};

		const btnPrimary = {
			height: "36px",
			padding: "0 20px",
			background: "var(--dsw-alias-button-primary-fill)",
			color: "var(--dsw-alias-label-primary-foreground)",
			border: "none",
			borderRadius: "8px",
			fontSize: "14px",
			cursor: "pointer",
			fontWeight: 500,
		};

		const btnOutline = {
			height: "36px",
			padding: "0 16px",
			background: "transparent",
			color: "var(--dsw-alias-label-secondary)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: "8px",
			fontSize: "14px",
			cursor: "pointer",
		};

		const btnPill = {
			border: "1px solid var(--dsw-alias-border-l2)",
			background: "transparent",
			color: "var(--dsw-alias-label-primary)",
			borderRadius: "12px",
			padding: "1px 10px",
			cursor: "pointer",
			fontSize: "12px",
			whiteSpace: "nowrap",
			height: "22px",
			lineHeight: "20px",
		};

		function detectColorScheme() {
			try {
				if (typeof document !== 'undefined' && document.body && document.body.hasAttribute('data-ds-dark-theme')) return 'dark';
			} catch(e) {}
			return 'light';
		}

		function embSummary(emb) {
			if (!emb || emb.provider === 'none') return '仅 FTS5';
			var parts = [emb.provider];
			if (emb.model) parts.push(emb.model);
			if (emb.dimension) parts.push(emb.dimension + 'd');
			return parts.join(' · ');
		}

		function statCard(label, value, valueColor, tooltip) {
			return js("div", {
				style: { padding: "10px 12px", borderRadius: "8px", background: "var(--dsw-alias-bg-layer-1)" },
				title: tooltip || "",
				children: [
					j("div", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)", marginBottom: "2px" }, children: label }),
					j("div", { style: { fontSize: "13px", fontWeight: 500, color: valueColor }, children: value }),
				],
			});
		}

		// ── Form field component ──
		function field(label, inputEl, desc) {
			return js("div", { style: { marginBottom: "16px" }, children: [
				j("div", { style: labelStyle, children: label }),
				inputEl,
				desc ? j("div", { style: descStyle, children: desc }) : null,
			]});
		}

		function MemorySettingsTab({ t }) {
			var _useState = react.useState, _useEffect = react.useEffect;
			var queueState = _useState([]), setQueue = queueState[1], queue = queueState[0];
			var totalState = _useState(0), setTotal = totalState[1], total = totalState[0];
			var embState = _useState(null), setEmb = embState[1], emb = embState[0];
			var embSaving = _useState(false), setEmbSaving = embSaving[1], embSavingFlag = embSaving[0];
			var embMsg = _useState(''), setEmbMsg = embMsg[1], embMsgText = embMsg[0];
			var embEditState = _useState(false), setEmbEdit = embEditState[1], embEditing = embEditState[0];
			var embSnapshot = _useState(null), setEmbSnapshot = embSnapshot[1], embSnap = embSnapshot[0];

			_useEffect(function() {
				var cancelled = false;
				Promise.all([
					fetch('/plugins/dsh-long-memory/api/memories?limit=1').then(function(r) { return r.json(); }).catch(function() { return { total: 0 }; }),
					fetch('/plugins/dsh-long-memory/api/confirm-queue').then(function(r) { return r.json(); }).catch(function() { return { items: [] }; }),
					fetch('/plugins/dsh-long-memory/api/embedding-config').then(function(r) { return r.json(); }).catch(function() { return {}; })
				]).then(function(results) {
					if (!cancelled) {
						setTotal(results[0].total || 0);
						setQueue(results[1].items || []);
						setEmb(results[2]);
					}
				}).catch(function() {});
				return function() { cancelled = true; };
			}, []);

			function doConfirm(queueId, decision) {
				fetch('/plugins/dsh-long-memory/api/confirm-queue', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ queue_id: queueId, decision: decision })
				}).then(function() {
					return fetch('/plugins/dsh-long-memory/api/confirm-queue').then(function(r) { return r.json(); });
				}).then(function(data) { setQueue(data.items || []); })
				.catch(function() {});
			}

			function saveEmb(field, value) {
				if (!emb) return;
				var next = {};
				for (var k in emb) next[k] = emb[k];
				next[field] = value;
				setEmb(next);
			}

			function saveEmbNested(group, field, value) {
				if (!emb) return;
				var next = {};
				for (var k in emb) next[k] = emb[k];
				if (!next[group]) next[group] = {};
				next[group] = Object.assign({}, next[group]);
				next[group][field] = value;
				setEmb(next);
			}

			function doSaveEmb() {
				if (!emb || embSavingFlag) return;
				var errs = [];
				if (emb.provider === 'ollama') {
					if (!emb.ollama || !emb.ollama.base_url || !emb.ollama.base_url.trim()) errs.push('Ollama Base URL is required');
					if (!emb.model || !emb.model.trim()) errs.push('Model is required');
				}
				if (emb.provider === 'openai-compatible') {
					if (!emb.openai_compatible || !emb.openai_compatible.base_url || !emb.openai_compatible.base_url.trim()) errs.push('API Base URL is required');
					if (!emb.openai_compatible || !emb.openai_compatible.api_key || !emb.openai_compatible.api_key.trim()) errs.push('API Key is required');
					if (!emb.model || !emb.model.trim()) errs.push('Model is required');
				}
				if (errs.length > 0) {
					setEmbMsg('✗ ' + errs.join('; '));
					return;
				}
				setEmbSaving(true);
				setEmbMsg('');
				fetch('/plugins/dsh-long-memory/api/embedding-config', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(emb)
				}).then(function(r) {
					if (r.ok) { setEmbMsg('✓ 已保存，即时生效'); setEmbEdit(false); setEmbSnapshot(null); }
					else { setEmbMsg('✗ Save failed (HTTP ' + r.status + ').'); }
					setEmbSaving(false);
				}).catch(function(e) { setEmbMsg('✗ ' + e.message); setEmbSaving(false); });
			}

			function cancelEdit() {
				if (embSnap) setEmb(JSON.parse(JSON.stringify(embSnap)));
				setEmbEdit(false);
				setEmbMsg('');
				setEmbSnapshot(null);
			}

			var embLabel = !emb ? '...' : (emb.provider === 'none' ? t('fts5') : emb.provider);

			// ── Build embedding section ──
			var embSection;
			if (!emb) {
				embSection = j("div", { style: { fontSize: "14px", color: "var(--dsw-alias-label-tertiary)" }, children: "Loading..." });
			} else if (!embEditing) {
				// Collapsed: summary banner + edit button
				embSection = js("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
					j("span", { style: { fontSize: "12px", color: "#22c55e", lineHeight: "1" }, children: "●" }),
					j("span", { style: { fontSize: "14px", color: "var(--dsw-alias-label-primary)", flex: 1 }, children: embSummary(emb) }),
					j("button", {
						onClick: function() { setEmbSnapshot(JSON.parse(JSON.stringify(emb))); setEmbEdit(true); setEmbMsg(''); },
						style: btnPill,
						children: "编辑"
					}),
					embMsgText ? j("span", { style: { fontSize: "12px", color: embMsgText.startsWith("✓") ? "#16a34a" : "#dc2626" }, children: embMsgText }) : null,
				]});
			} else {
				// Expanded: vertical form (official style)
				embSection = js(react.Fragment, { children: [
					// Provider
					field("Provider", j("select", {
						value: emb.provider || 'none',
						onChange: function(e) { saveEmb("provider", e.target.value); },
						style: Object.assign({}, selectStyle, { colorScheme: detectColorScheme() }),
						children: [
							j("option", { value: "none", children: "none (FTS5 only)" }),
							j("option", { value: "ollama", children: "ollama (local)" }),
							j("option", { value: "openai-compatible", children: "openai-compatible (cloud API)" }),
						]
					}), "none = 禁用向量检索（仅 FTS5）; ollama = 本地服务; openai-compatible = 云 API"),

					// Conditional fields
					emb.provider && emb.provider !== 'none' ? js(react.Fragment, { children: [
						j("div", { style: dividerStyle }),
						field("Model", j("input", {
							value: emb.model || '',
							onChange: function(e) { saveEmb("model", e.target.value); },
							placeholder: "bge-m3",
							style: inputStyle
						}), "Embedding 模型名称"),
						field("Dimension", j("input", {
							type: "number",
							value: emb.dimension || 1024,
							onChange: function(e) { saveEmb("dimension", parseInt(e.target.value) || 1024); },
							style: Object.assign({}, inputStyle, { width: "120px" })
						}), "必须与模型的输出维度一致，填错会导致向量检索失败。bge-m3 = 1024, nomic-embed-text = 768"),
						field("Batch Size", j("input", {
							type: "number",
							value: emb.batch_size || 16,
							onChange: function(e) { saveEmb("batch_size", parseInt(e.target.value) || 16); },
							style: Object.assign({}, inputStyle, { width: "120px" })
						}), "每次 API 调用的文本数量"),
						field("Timeout (ms)", j("input", {
							type: "number",
							value: emb.timeout_ms || 30000,
							onChange: function(e) { saveEmb("timeout_ms", parseInt(e.target.value) || 30000); },
							style: Object.assign({}, inputStyle, { width: "120px" })
						}), "超时后降级为 FTS5 检索"),
					]}) : null,

					// Ollama specific
					emb.provider === 'ollama' ? js(react.Fragment, { children: [
						j("div", { style: dividerStyle }),
						field("Ollama Base URL", j("input", {
							value: (emb.ollama && emb.ollama.base_url) || 'http://127.0.0.1:11434',
							onChange: function(e) { saveEmbNested('ollama', 'base_url', e.target.value); },
							placeholder: "http://127.0.0.1:11434",
							style: inputStyle
						}), "Ollama 服务地址"),
					]}) : null,

					// OpenAI-compatible specific
					emb.provider === 'openai-compatible' ? js(react.Fragment, { children: [
						j("div", { style: dividerStyle }),
						field("API Base URL", j("input", {
							value: (emb.openai_compatible && emb.openai_compatible.base_url) || '',
							onChange: function(e) { saveEmbNested('openai_compatible', 'base_url', e.target.value); },
							placeholder: "https://api.siliconflow.cn/v1",
							style: inputStyle
						}), "OpenAI 兼容 API 端点"),
						field("API Key", j("input", {
							value: (emb.openai_compatible && emb.openai_compatible.api_key) || '',
							onChange: function(e) { saveEmbNested('openai_compatible', 'api_key', e.target.value); },
							placeholder: "sk-... or $ENV_VAR_NAME",
							style: inputStyle
						}), "API 密钥，支持 $ENV_VAR 环境变量引用"),
					]}) : null,

					// Action buttons (official style: right-aligned, outline + primary)
					j("div", { style: dividerStyle }),
					js("div", { style: { display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }, children: [
						embMsgText ? j("span", { style: { fontSize: "12px", color: embMsgText.startsWith("✓") ? "#16a34a" : "#dc2626", marginRight: "auto" }, children: embMsgText }) : null,
						j("button", {
							onClick: cancelEdit,
							style: btnOutline,
							children: "取消"
						}),
						j("button", {
							onClick: doSaveEmb,
							disabled: embSavingFlag,
							style: Object.assign({}, btnPrimary, embSavingFlag ? { opacity: 0.5, cursor: "default" } : {}),
							children: embSavingFlag ? "保存中..." : "保存"
						}),
					]}),
					j("div", { style: descStyle, children: "Changes take effect immediately." }),
				]});
			}

			return js("div", { style: { padding: "16px 0", display: "flex", flexDirection: "column", gap: "16px" }, children: [
				// ── Status overview ──
				js("div", { style: cardStyle, children: [
					j("div", { style: headerStyle, children: t("title") }),
					j("div", { style: headerDescStyle, children: t("description") }),
					j("div", { style: dividerStyle }),
					js("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }, children: [
						statCard(t("embedding"), embLabel, "var(--dsw-alias-label-secondary)", t("embeddingTip")),
						statCard(t("memories"), total > 0 ? String(total) : "0", "var(--dsw-alias-label-success)", t("memories")),
						statCard(t("pendingConfirms"), queue ? String(queue.length) : "0", "var(--dsw-alias-label-secondary)", t("pendingTip")),
					]}),
				]}),

				// ── Pending confirm queue ──
				queue && queue.length > 0 ? js("div", { style: cardStyle, children: [
					j("div", { style: headerStyle, children: "Pending (" + queue.length + ")" }),
					j("div", { style: dividerStyle }),
					j("div", { style: { display: "flex", flexDirection: "column", gap: "4px" }, children: queue.map(function(item) {
						return js("div", { key: item.queue_id, style: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: "var(--dsw-alias-bg-layer-1)", fontSize: "13px" }, children: [
							j("span", { style: { flex: 1, color: "var(--dsw-alias-label-primary)" }, children: item.content }),
							j("span", { style: { color: "var(--dsw-alias-label-tertiary)", fontSize: "11px" }, children: item.type }),
							j("button", { onClick: function() { doConfirm(item.queue_id, 'approve'); }, style: { border: "none", background: "var(--dsw-alias-label-success)", color: "#fff", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "12px" }, children: "✓" }),
							j("button", { onClick: function() { doConfirm(item.queue_id, 'reject'); }, style: { border: "none", background: "var(--dsw-alias-label-error)", color: "#fff", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "12px" }, children: "✗" }),
						]});
					})}),
				]}) : null,

				// ── Embedding config (official style card) ──
				js("div", { style: cardStyle, children: [
					j("div", { style: headerStyle, children: "Embedding" }),
					j("div", { style: headerDescStyle, children: "配置向量召回的 Embedding provider。修改后即时生效。" }),
					j("div", { style: dividerStyle }),
					embSection,
				]}),
			]});
		}

		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "long-memory: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.plugins.tab", () =>
				ctx.slots.register(
					{
						name: "settings.plugins.tab",
						id: "long-memory",
						order: 20,
						label: () => t("tab"),
						locale: NS,
						inject: () => ({}),
					},
					MemorySettingsTab
				)
			);
		}

		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
