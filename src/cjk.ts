// CJK unigram helpers.
//
// SQLite FTS5's default unicode61 tokenizer treats CJK characters as
// punctuation (whitespace-separated tokens, but each CJK character is one
// token only when it's between non-CJK boundaries). For Chinese memory
// content we want every character to be its own searchable token.
//
// Strategy: at the application boundary (record / search / forget), expand
// CJK runs so they are space-separated. The original content stays intact
// in the `memories` table — only the FTS5 index sees the spaced version.
//
// We do this application-side (not via SQL triggers) because SQLite triggers
// cannot call external tokenisers.

/** Insert a space between adjacent CJK / CJK↔ASCII characters. */
export function unigramize(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return ''
  return text
    .replace(/[\u4e00-\u9fff]/g, c => ` ${c} `)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Quick check whether a string contains CJK Unified Ideographs. */
export function containsCjk(text: string): boolean {
  return typeof text === 'string' && /[\u4e00-\u9fff]/.test(text)
}
