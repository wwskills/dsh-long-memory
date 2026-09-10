/**
 * Memories tab: filterable list of memories with archive / delete. Delete now
 * opens a themed dialog (with reason + hard-delete toggle for user scope)
 * instead of stacked window.confirm/prompt calls.
 *
 * @module @wwskills/dsh-long-memory/client/tabs/MemoriesTab
 */
import type { Translate } from '../locales.js';
import type { Badges } from './CorrectionsTab.js';
export declare function MemoriesTab(props: {
    t: Translate;
    setBadges: (fn: (prev: Badges) => Badges) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
    scopeFilter?: string;
    searchQuery?: string;
}): JSX.Element;
//# sourceMappingURL=MemoriesTab.d.ts.map