/**
 * Native ↔ Canonical verse reconciliation (ADR-0001, ADR-0010).
 *
 * Translations are addressed by the single canonical versification (av11n/KJV),
 * but a translation's own edition may number a passage differently — Psalm
 * titles, the Joel/Malachi chapter splits, Revelation 12/13 (CONTEXT.md
 * §Translation Verse). The `versification_map` corpus table records ONLY those
 * divergences (sparse: a row exists where native != canonical); everywhere else
 * the two coincide and the mapping is identity.
 *
 * This module is the framework-agnostic engine over those rows — the SAME
 * lookup the build-time ingest and the app runtime both use. It is the piece
 * the ADR-0010 hard gate unit-tests standalone: the native↔canonical round-trip
 * every Anchor depends on.
 *
 * No Skia / RN and no Node-only import in this layer (ADR-0008): it is imported
 * by both the ingest pipeline (Node) and the reader (RN).
 */

/** A (chapter, verse) point within one book. `verse` 0 = a versified title. */
export interface VerseAddr {
  readonly chapter: number;
  readonly verse: number;
}

/**
 * One divergence, per book — the corpus `versification_map` row shape minus its
 * storage ids (ADR-0004: addressed by coordinate, never by row id). `src` is the
 * translation's native address, `canon` the av11n address it reconciles to.
 */
export interface VersificationRow {
  readonly book: string;
  readonly srcChapter: number;
  readonly srcVerse: number;
  readonly canonChapter: number;
  readonly canonVerse: number;
}

/** Book-scoped bidirectional index built from the sparse divergence rows. */
export interface VersificationMap {
  /** `book` → native `chapter:verse` → canonical address. */
  readonly nativeToCanon: ReadonlyMap<string, ReadonlyMap<string, VerseAddr>>;
  /** `book` → canonical `chapter:verse` → native address. */
  readonly canonToNative: ReadonlyMap<string, ReadonlyMap<string, VerseAddr>>;
}

const addrKey = (chapter: number, verse: number): string => `${chapter}:${verse}`;

/**
 * Index the sparse rows both directions. Throws on a non-bijective map (two
 * native verses claiming one canonical verse, or vice versa) — a corrupt map
 * would silently misplace an anchor, so it fails the build, not the reader.
 */
export function buildVersificationMap(rows: readonly VersificationRow[]): VersificationMap {
  const nativeToCanon = new Map<string, Map<string, VerseAddr>>();
  const canonToNative = new Map<string, Map<string, VerseAddr>>();

  const put = (
    index: Map<string, Map<string, VerseAddr>>,
    book: string,
    from: string,
    to: VerseAddr,
    dir: string,
  ) => {
    let byBook = index.get(book);
    if (!byBook) index.set(book, (byBook = new Map()));
    if (byBook.has(from)) {
      throw new Error(`versification map not bijective: ${book} ${from} maps twice (${dir})`);
    }
    byBook.set(from, to);
  };

  for (const r of rows) {
    put(
      nativeToCanon,
      r.book,
      addrKey(r.srcChapter, r.srcVerse),
      { chapter: r.canonChapter, verse: r.canonVerse },
      'native→canon',
    );
    put(
      canonToNative,
      r.book,
      addrKey(r.canonChapter, r.canonVerse),
      { chapter: r.srcChapter, verse: r.srcVerse },
      'canon→native',
    );
  }

  return { nativeToCanon, canonToNative };
}

/** A translation's native address → its canonical address (identity if no row). */
export function toCanonical(map: VersificationMap, book: string, native: VerseAddr): VerseAddr {
  return map.nativeToCanon.get(book)?.get(addrKey(native.chapter, native.verse)) ?? native;
}

/** A canonical address → a translation's native address (identity if no row). */
export function toNative(map: VersificationMap, book: string, canon: VerseAddr): VerseAddr {
  return map.canonToNative.get(book)?.get(addrKey(canon.chapter, canon.verse)) ?? canon;
}
