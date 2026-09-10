/**
 * Small shared client utilities.
 * @module @wwskills/dsh-long-memory/client/util
 */
import type { Translate } from './locales.js';
/** Compact relative time. Unlike the old panel, all units are localized. */
export declare function relativeTime(ts: number | undefined | null, t: Translate, now?: number): string;
/** Parse a memory/rule `tags` field that may be an array or a JSON string. */
export declare function parseTags(tags: string[] | string | undefined): string[];
//# sourceMappingURL=util.d.ts.map