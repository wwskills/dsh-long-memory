/**
 * Static data → visual metadata maps: correction triggers, rule categories,
 * memory types / origins, and persona dimensions. Centralised so colours and
 * glyphs stay consistent across every card.
 *
 * @module @wwskills/dsh-long-memory/client/meta
 */
import type { LocaleKey } from './locales.js';
export interface TriggerMeta {
    icon: string;
    labelKey: LocaleKey;
}
export interface CategoryMeta {
    icon: string;
    labelKey: LocaleKey;
    fg: string;
    bg: string;
    border: string;
}
export interface TypeMeta {
    icon: string;
    labelKey: LocaleKey | null;
    fg: string;
}
export interface OriginMeta {
    icon: string;
    labelKey: LocaleKey | null;
}
export declare const triggerMeta: Record<string, TriggerMeta>;
export declare const triggerFallback: TriggerMeta;
export declare function categoryMeta(category: string): CategoryMeta;
export declare function memoryTypeMeta(type: string): TypeMeta;
export declare function memoryTypeFallback(): TypeMeta;
export declare const memoryOriginMeta: Record<string, OriginMeta>;
export declare const memoryOriginFallback: OriginMeta;
//# sourceMappingURL=meta.d.ts.map