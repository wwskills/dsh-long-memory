/**
 * Lessons tab: lists captured corrections, each expandable, with extract /
 * ignore actions. Ignore now goes through a themed ConfirmDialog.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/CorrectionsTab
 */
import type { Translate } from '../locales.js';
export interface Badges {
    lessons: number;
    rules: number;
}
export declare function CorrectionsTab(props: {
    t: Translate;
    setBadges: (fn: (prev: Badges) => Badges) => void;
    highlightId: string | null;
    onClearHighlight: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}): JSX.Element;
//# sourceMappingURL=CorrectionsTab.d.ts.map