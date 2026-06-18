// Framework-agnostic domain model. NO CanvasKit, NO DOM. This is the data the
// layout engine consumes; it ports verbatim to the RN-Skia build.
//
// Vocabulary follows CONTEXT.md: Token, Block, Canonical Verse, Anchor,
// Original Word, Cross-reference. The migration-fatal rule is honoured here:
// every addressable thing keys off CANONICAL COORDINATES (book/chapter/verse/
// word-index), never pixels or internal ids.

export type Genre = "prose" | "poetry" | "heading";

/** Canonical address — the stable key everything anchors to. `word` is the
 *  0-based index of the word within the verse (punctuation/space excluded). */
export interface Anchor {
  book: string; // canonical book name, e.g. "John"
  chapter: number;
  verse: number;
  word: number;
}

export function anchorKey(a: Anchor): string {
  return `${a.book} ${a.chapter}:${a.verse}#${a.word}`;
}

export type TokenKind = "word" | "space" | "punct";

/** A single word-occurrence (or its surrounding space/punctuation) in ONE
 *  translation's text. Word tokens carry a canonical Anchor and may link to a
 *  shared Original Word in the hub. */
export interface Token {
  text: string;
  kind: TokenKind;
  anchor: Anchor; // verse + word index (word index repeats for non-word tokens)
  ow?: string; // Original Word id (hub) — present on meaningful words only
  /** true on the very first word token of a verse — drives verse-number marks. */
  verseStart?: boolean;
}

/** A contiguous run of Tokens forming one literary unit, carrying genre +
 *  indent. The unit of rendering. */
export interface Block {
  genre: Genre;
  indent: number; // 0..n — poetry line depth; prose/heading usually 0
  tokens: Token[];
  /** poetry/heading blocks that begin a verse note it for the verse mark. */
  startsVerse?: number;
}

/** The shared hub a translation Token aligns to (N Tokens → 1 Original Word). */
export interface OriginalWord {
  id: string;
  script: "greek" | "hebrew";
  text: string; // the original-language word, pointed/polytonic
  translit: string;
  strongs: string; // e.g. "G746" / "H7225"
  gloss: string; // the one-word English the reveal opens with
  meaning: string; // the deeper "earned" explanation
}

/** One chapter of one translation, fully tokenised + block-segmented. */
export interface Chapter {
  book: string;
  chapter: number;
  translation: string; // "NASB" | "KJV"
  blocks: Block[];
}

/** A shipped, authoritative link between two passages (Treasury-of-Scripture
 *  style). A Portal is a Cross-reference gated by reading progress. */
export interface CrossReference {
  id: string;
  label: string; // shown when earned, e.g. "the beginning"
  from: Anchor; // the word that lights up
  to: Anchor; // where it carries you
  /** Portal: only glows once the `from` passage has been read. */
  portal?: boolean;
}
