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
  /**
   * Optional: omit to address a translation-independent Canonical Verse.
   * User-mark anchors are translation-bound (carry the translation they were
   * drawn in); editorial anchors are canonical-only and never carry one.
   */
  readonly translation?: string;
  readonly book: string;
  readonly chapter: number;
  /**
   * Canonical verse (av11n). Always present: heading Tokens carry verse=NULL
   * in the corpus and are therefore NOT anchorable in v1 (CONTEXT.md §Anchor).
   */
  readonly verse: number;
  /** 0-based word index within the verse, punctuation excluded; omit to address the whole verse. */
  readonly wordIndex?: number;
  /** Original Word hub id — null through Phase 1–2. */
  readonly owId?: string | null;
}

/**
 * The POINT Anchor shape: a Note pin, a Connector endpoint — a single word or
 * a whole verse. Alias of the bare coordinate; named so call sites can say
 * which of the two Anchor shapes they mean.
 */
export type PointAnchor = CanonicalCoordinate;

/**
 * The RANGE Anchor shape (a Mark): a span that may cross a verse boundary.
 * Mirrors the inline column-group in schema.dbml (`target_*` on `mark`);
 * the span is [start, end] INCLUSIVE. Shapes (#5):
 *   whole verse        → wordIndex omitted, verseEnd/wordIndexEnd omitted
 *   single word        → wordIndex=i, verseEnd omitted, wordIndexEnd=i
 *   span in one verse  → wordIndex=lo, verseEnd omitted, wordIndexEnd=hi
 *   cross-verse phrase → wordIndex=lo, verseEnd=v2, wordIndexEnd=hi
 */
export interface RangeAnchor extends CanonicalCoordinate {
  /** End verse; omit for a single-verse span (= verse). */
  readonly verseEnd?: number;
  /** End word ordinal, INCLUSIVE, in the end verse; omit = through end of that verse. */
  readonly wordIndexEnd?: number;
}

/** Stable string form for keying caches and equality. */
export function coordinateKey(c: CanonicalCoordinate): string {
  const t = c.translation ?? '*';
  const w = c.wordIndex ?? '*';
  return `${t}/${c.book}/${c.chapter}/${c.verse}/${w}`;
}

/** Stable string form of a range Anchor; collapses to the point key + span suffix. */
export function rangeKey(r: RangeAnchor): string {
  const ve = r.verseEnd ?? '*';
  const we = r.wordIndexEnd ?? '*';
  return `${coordinateKey(r)}..${ve}/${we}`;
}
