/**
 * The reader's current position — a chapter-grain address into the corpus.
 *
 * This is the framework-agnostic shape of the SINGLE current-position source
 * (#10): the picker (random access) and the Codex flip gesture (#9, sequential)
 * both move the reader by producing one of these. Holding position here — not
 * in Expo Router params — is what keeps the two navigation affordances from
 * disagreeing about where the reader is.
 *
 * SCOPE: chapter grain, ephemeral. The durable, verse-grain bookmark per book
 * (ADR-0012) is #14; it will hydrate/persist this same source. Translation is
 * part of the address (unlike the canonical-only durable bookmark) because the
 * reader renders a concrete translation — a KJV⇄BSB switch is a real move.
 *
 * No Skia / RN import in this layer (ADR-0008).
 */

export interface ReadingPosition {
  /** Translation abbrev the reader is rendering (e.g. 'KJV', 'BSB'). */
  readonly translation: string;
  /** Canonical book slug (scripts/ingest/books.ts). */
  readonly book: string;
  /** 1-based chapter number (av11n-canonical). */
  readonly chapter: number;
}

/**
 * Where a cold reader opens before #14 restores the durable bookmark. Genesis 1
 * is present and canonically numbered in every bundled corpus (KJV/BSB), so it
 * always renders.
 */
export const DEFAULT_POSITION: ReadingPosition = {
  translation: 'KJV',
  book: 'Genesis',
  chapter: 1,
};

/** Two positions address the same passage when all three fields match. */
export function samePosition(a: ReadingPosition, b: ReadingPosition): boolean {
  return a.translation === b.translation && a.book === b.book && a.chapter === b.chapter;
}

/** Stable string form for React keys, memo deps, and equality. */
export function positionKey(p: ReadingPosition): string {
  return `${p.translation}/${p.book}/${p.chapter}`;
}
