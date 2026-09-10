/**
 * Rules tab: pending + approved sections, each rule card with approve / reject
 * / edit / promote. Reject and conflict warnings now use ConfirmDialog instead
 * of window.confirm/prompt.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/RulesTab
 */
import type { Translate } from '../locales.js';
import type { Badges } from './CorrectionsTab.js';
export declare function RulesTab(props: {
    t: Translate;
    setBadges: (fn: (prev: Badges) => Badges) => void;
    onJumpToCorrection: (id: string) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}): JSX.Element;
//# sourceMappingURL=RulesTab.d.ts.map