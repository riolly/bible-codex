/**
 * Framework-agnostic corpus addressing.
 *
 * INVARIANT: anchors are canonical coordinates / semantic keys, NEVER corpus DB
 * ids and never pixels (ADR-0001, ADR-0004, ADR-0011). A coordinate survives
 * corpus re-ingest and user-data restore on a different device. The `ow_id`
 * (Original Word) seam stays null through Phase 1–2 (ADR-0003).
 *
 * No Skia / CanvasKit import in this layer (ADR-0008).
 */

export interface CanonicalCoordinate {
  /** Optional: omit to address a translation-independent Canonical Verse. */
  readonly translation?: string;
  readonly book: string;
  readonly chapter: number;
  readonly verse: number;
  /** 0-based word index within the verse; omit to address the whole verse. */
  readonly wordIndex?: number;
  /** Original Word hub id — null through Phase 1–2. */
  readonly owId?: string | null;
}

/** Stable string form for keying caches and equality. */
export function coordinateKey(c: CanonicalCoordinate): string {
  const t = c.translation ?? '*';
  const w = c.wordIndex ?? '*';
  return `${t}/${c.book}/${c.chapter}/${c.verse}/${w}`;
}
