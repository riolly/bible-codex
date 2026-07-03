/**
 * Framework-agnostic corpus row shapes — the domain form of the read-only
 * corpus DB (schema.dbml: `block` / `token`). The build-time ingester (#6)
 * writes rows of this shape; the layout engine (#7) consumes them.
 *
 * INVARIANTS (CONTEXT.md):
 * - Blocks PARTITION the token stream: every Token belongs to exactly one Block.
 * - Whitespace is never a Token — spacing is a presentation concern.
 * - Heading Tokens carry verse=null (never 0) and wordIndex=null; a mid-chapter
 *   section heading never inherits the preceding verse.
 * - `id` fields are STORAGE ids only — anchors address by coordinate
 *   (see coordinate.ts), never by these ids; they do not survive re-ingest.
 *
 * No Skia / CanvasKit import in this layer (ADR-0008).
 */

/** Typesetting branch of a Block (schema.dbml `genre`). */
export type Genre = 'prose' | 'poetry' | 'heading';

/** Word/punct classification is registered anchor policy (ADR-0014). */
export type TokenKind = 'word' | 'punct';

/**
 * REGISTERED role vocabulary (schema.dbml `block.role`) — the contract between
 * the ingester and the presentation cascade. `null` = plain prose paragraph
 * (\p) or any poetry line (poetry depth lives in `indent`).
 * Reserved, not yet emitted: "acrostic".
 */
export type BlockRole =
  | 'book_title' // \mt
  | 'major_section' // \ms
  | 'section' // \s
  | 'psalm_title' // \d
  | 'margin' // \m
  | 'no_break' // \nb
  | 'indented' // \pi
  | 'list_item' // \li
  | 'implicit'; // guard: text seen with no block marker

/** One literary unit — a prose paragraph, a poetry line, or a heading. */
export interface Block {
  readonly id: number;
  readonly chapter: number;
  readonly genre: Genre;
  readonly role: BlockRole | null;
  /** Poetry line depth (\q1–\q4); 0 for prose/heading. */
  readonly indent: number;
  /** Render order within the chapter (= seq of its first token). */
  readonly seq: number;
}

/** One word- or punctuation-occurrence in a translation's text. */
export interface Token {
  readonly id: number;
  readonly blockId: number;
  readonly chapter: number;
  /** Canonical verse (av11n); null = non-verse content (headings/titles). */
  readonly verse: number | null;
  /** Word ordinal within the verse, punct excluded; null on punct and heading tokens. */
  readonly wordIndex: number | null;
  /** Dense render order within the chapter. */
  readonly seq: number;
  readonly kind: TokenKind;
  /** Surface text. */
  readonly text: string;
  /** First word token of a verse — drives the verse-number ornament. */
  readonly verseStart: boolean;
  /** Head Original Word id (Phase-3 seam) — null until aligned. */
  readonly owId: string | null;
}
