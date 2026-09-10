/**
 * Recall test tab: run an FTS5 query against stored memories and preview which
 * ones match. The old UI showed a "score" column that the list endpoint never
 * returns (always "—"); this version drops it and shows rank + scope + type
 * instead, which is honest about what the endpoint provides.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/RecallTab
 */
import type { Translate } from '../locales.js';
export declare function RecallTab(props: {
    t: Translate;
    showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}): JSX.Element;
//# sourceMappingURL=RecallTab.d.ts.map