/**
 * Settings modal: extraction params, persona frequency, embedding config, and
 * signal words. Loads /config lazily on open and saves the full payload.
 *
 * @module @wwskills/dsh-long-memory/client/SettingsModal
 */
import type { Translate } from './locales.js';
import type { EmbeddingStatus } from './api.js';
export declare function SettingsModal(props: {
    t: Translate;
    onClose: () => void;
    onSaved: () => void;
    embeddingStatus: EmbeddingStatus | null;
    setEmbeddingStatus: (status: EmbeddingStatus) => void;
}): JSX.Element;
//# sourceMappingURL=SettingsModal.d.ts.map