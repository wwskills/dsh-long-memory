/**
 * Browser entry: registers a sidebar footer action that opens the long-memory
 * panel in a full-screen overlay, and wires up the locale namespace.
 *
 * Built by esbuild into `lib/client.js` wrapped as a
 * `window.__ModuleLoader__.load({ id, factory })` module (see build.mjs).
 *
 * @module @wwskills/dsh-long-memory/client
 */
declare const NS = "long-memory";
/** Cordis-ish client context surface this entry uses. */
interface ClientContext {
    effect: (fn: () => unknown, label?: string) => unknown;
    locale: {
        register: (ns: string, dicts: {
            zh: Record<string, string>;
            en: Record<string, string>;
        }) => unknown;
        bind: (ns: string) => (key: string) => string;
    };
    slots: {
        inject: (slot: string, factory: () => unknown) => unknown;
        register: (spec: Record<string, unknown>, component: unknown) => unknown;
    };
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export { NS };
//# sourceMappingURL=index.d.ts.map