/**
 * The computed layout model (#7) — what the typesetting engine produces and
 * the Skia draw layer paints (#9).
 *
 * INVARIANTS:
 * - ADR-0008: pure TS — no Skia / CanvasKit types leak in here.
 * - ADR-0004: EPHEMERAL and rebuildable — a pure function of
 *   (rules + corpus + viewport). Never persisted, never synced, never the
 *   source of truth. Anything durable anchors by canonical coordinate
 *   (model/coordinate.ts), not by this model.
 * - All geometry is in EM of the preset's root font size, relative to the
 *   Page/column canvas — the draw layer multiplies by (fontSize × scale).
 *   No absolute pixels.
 */

import type { BlockRole, Genre } from '../../model/corpus';

/** Device viewport in device-independent points (the ONLY absolute input). */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export type Direction = 'ltr' | 'rtl';

/** A rectangular region of a canvas, in em. */
export interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One positioned corpus Token. `x` is em from the text-region left edge. */
export interface TokenItem {
  readonly kind: 'token';
  /** Corpus token seq (chapter render order) — the join key back to the corpus. */
  readonly seq: number;
  readonly text: string;
  readonly tokenKind: 'word' | 'punct';
  /** Canonical verse; null on heading tokens (outside the verse flow). */
  readonly verse: number | null;
  readonly x: number;
  readonly width: number;
}

/**
 * The gilt superscript verse-number ornament — a structural cue: the engine
 * reserves its slot; the draw layer styles it (ADR-0016 look).
 */
export interface VerseNumItem {
  readonly kind: 'verse-num';
  readonly verse: number;
  readonly x: number;
  readonly width: number;
}

export type LineItem = TokenItem | VerseNumItem;

/** Maximal span of same-direction items — the draw layer shapes each run whole. */
export interface TokenRun {
  readonly direction: Direction;
  readonly items: readonly LineItem[];
}

export interface Line {
  /** Em from the text-region top (line box top; baseline is draw-layer business). */
  readonly y: number;
  /** Resolved horizontal indent of this line, in em. */
  readonly indent: number;
  readonly runs: readonly TokenRun[];
}

/** One laid-out literary Block (CONTEXT.md): prose paragraph, poetry line, heading. */
export interface LayoutBlock {
  readonly blockId: number;
  readonly genre: Genre;
  readonly role: BlockRole | null;
  /** Corpus indent level (poetry depth), not em. */
  readonly indent: number;
  readonly y: number;
  readonly height: number;
  readonly lines: readonly Line[];
}

/** Drop-cap structural cue: which token opens the chapter as a versal. */
export interface DropCap {
  readonly tokenSeq: number;
}

/** One line of the Scroll flow — block identity travels with it because a
 * Block's lines may split across a column boundary. `y` is column-local. */
export interface ScrollLine extends Line {
  readonly blockId: number;
  readonly genre: Genre;
  readonly role: BlockRole | null;
}

/** One column of the Scroll — Latin *pagina*: one column of a scroll. */
export interface ScrollColumn {
  /** Em from the scroll origin to this column's text left edge. */
  readonly x: number;
  readonly lines: readonly ScrollLine[];
}

/**
 * Scroll-mode layout (ADR-0016): continuous horizontal columns. Unlike the
 * Codex Page, the viewport PARAMETRIZES this model — column height derives
 * from it. Same corpus, same rules, same typeset core.
 */
export interface ScrollLayout {
  readonly kind: 'scroll';
  readonly chapter: number;
  /** Column text width, in em (= the measure). */
  readonly columnWidth: number;
  /** Usable column height, in em — derived from the viewport. */
  readonly columnHeight: number;
  readonly columns: readonly ScrollColumn[];
  /** Horizontal extent of the whole scroll, in em. */
  readonly totalWidth: number;
}

/**
 * Codex-mode Page (ADR-0016): ONE chapter typeset at fixed geometry per
 * preset. The viewport never parametrizes this model — it only letterboxes/
 * scales it (see fitPageToViewport). The Margin rail is a first-class
 * reserved region; widening it grows the canvas OUTWARD, never the measure.
 */
export interface PageLayout {
  readonly kind: 'page';
  readonly chapter: number;
  /** Full page canvas extent, in em. */
  readonly canvas: { readonly width: number; readonly height: number };
  /** The text measure region. Line/item coordinates are relative to its origin. */
  readonly text: Region;
  /** The Margin rail — home of Note pins and Rail ink (Phase 2). */
  readonly rail: Region;
  readonly blocks: readonly LayoutBlock[];
  readonly dropCap: DropCap | null;
}
