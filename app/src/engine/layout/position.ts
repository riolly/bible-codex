/**
 * Reading position across a mode switch (ADR-0016 / #14): the passage in view
 * is held as a canonical VERSE, never a pixel offset. Rotating Codex⇄Scroll
 * reads the leading-edge verse out of the outgoing layout and seeks the
 * incoming one to it — so posture change never loses the reader's place.
 *
 * Pure em geometry (ADR-0004/0008): the draw layer scales these em results to
 * dp and clamps them to the surface's scroll range. Within one chapter a verse
 * number is a sufficient anchor — the chapter is fixed across the switch.
 */

import type { Line, PageLayout, ScrollColumn, ScrollLayout } from './model';

/**
 * A monotonic offset→verse mark: the canvas-em `offset` (along the surface's
 * scroll axis) at which `verse` becomes the leading verse. A layout's anchors
 * are ascending by `offset`, so a seek/read is a scan over verses (tens), not
 * over every token (hundreds) — the draw layer builds the table once per
 * layout and reads it on every scroll frame.
 */
export interface VerseAnchor {
  readonly offset: number;
  readonly verse: number;
}

/**
 * The verse anchored at canvas-em `offset`: the last anchor at/before it, with
 * the first anchor as the at-origin fallback. Shared by both surfaces.
 */
export function verseAtAnchorOffset(
  anchors: readonly VerseAnchor[],
  offset: number,
): number | null {
  if (anchors.length === 0) return null;
  let current = anchors[0].verse;
  for (const anchor of anchors) {
    if (anchor.offset > offset + 1e-6) break;
    current = anchor.verse;
  }
  return current;
}

/** The first canonical verse a line introduces (null on heading-only lines). */
function lineVerse(line: Line): number | null {
  for (const run of line.runs) {
    for (const item of run.items) {
      if (item.kind === 'token' && item.verse !== null) return item.verse;
    }
  }
  return null;
}

/** Every canonical verse whose tokens touch a Scroll column. */
function columnVerses(column: ScrollColumn): Set<number> {
  const verses = new Set<number>();
  for (const line of column.lines) {
    for (const run of line.runs) {
      for (const item of run.items) {
        if (item.kind === 'token' && item.verse !== null) verses.add(item.verse);
      }
    }
  }
  return verses;
}

// ── Codex (vertical) ────────────────────────────────────────────────────────

/**
 * Canvas-em Y of the first line that introduces `verse`. When the verse is
 * absent (e.g. a KJV⇄BSB switch onto a verse the target relegates to a note),
 * fall back to the nearest EARLIER verse present, so the switch lands on
 * adjacent scripture rather than jumping to the page top; 0 only when no
 * earlier verse exists either.
 */
export function codexOffsetForVerse(page: PageLayout, verse: number): number {
  let fallback = 0;
  let fallbackVerse = -Infinity;
  for (const block of page.blocks) {
    for (const line of block.lines) {
      const v = lineVerse(line);
      if (v === null) continue;
      if (v === verse) return page.text.y + line.y;
      if (v < verse && v > fallbackVerse) {
        fallbackVerse = v;
        fallback = page.text.y + line.y;
      }
    }
  }
  return fallback;
}

/**
 * Ascending verse anchors down a Codex page: the first line that introduces
 * each verse, at its canvas-em Y. Within a verse the leading verse is constant,
 * so one anchor per verse (its first line) suffices.
 */
export function codexVerseAnchors(page: PageLayout): VerseAnchor[] {
  const anchors: VerseAnchor[] = [];
  const seen = new Set<number>();
  for (const block of page.blocks) {
    for (const line of block.lines) {
      const verse = lineVerse(line);
      if (verse === null || seen.has(verse)) continue;
      seen.add(verse);
      anchors.push({ offset: page.text.y + line.y, verse });
    }
  }
  return anchors;
}

/** The verse anchored at canvas-em Y `offset`: the last verse-line at/above it. */
export function codexVerseAtOffset(page: PageLayout, offset: number): number | null {
  return verseAtAnchorOffset(codexVerseAnchors(page), offset);
}

// ── Scroll (horizontal) ──────────────────────────────────────────────────────

/**
 * Canvas-em X of the column that contains `verse` (its frame origin, so the
 * column's leading margin shows). When the verse is absent (a translation that
 * omits it), fall back to the column of the nearest EARLIER verse present, so a
 * switch lands on adjacent scripture rather than the first column; 0 only when
 * no earlier verse exists either.
 */
export function scrollOffsetForVerse(layout: ScrollLayout, verse: number, marginEm: number): number {
  let fallback = 0;
  let fallbackVerse = -Infinity;
  for (const column of layout.columns) {
    for (const v of columnVerses(column)) {
      if (v === verse) return Math.max(0, column.x - marginEm);
      if (v < verse && v > fallbackVerse) {
        fallbackVerse = v;
        fallback = Math.max(0, column.x - marginEm);
      }
    }
  }
  return fallback;
}

/**
 * Ascending verse anchors along the Scroll: each column's frame origin (its
 * leading margin) paired with its leading (lowest) verse.
 */
export function scrollVerseAnchors(layout: ScrollLayout, marginEm: number): VerseAnchor[] {
  const anchors: VerseAnchor[] = [];
  for (const column of layout.columns) {
    const verses = columnVerses(column);
    if (verses.size === 0) continue;
    anchors.push({ offset: column.x - marginEm, verse: Math.min(...verses) });
  }
  return anchors;
}

/** The verse anchored at canvas-em X `offset`: the first verse of the last
 * column at/left of it. */
export function scrollVerseAtOffset(
  layout: ScrollLayout,
  offset: number,
  marginEm: number,
): number | null {
  return verseAtAnchorOffset(scrollVerseAnchors(layout, marginEm), offset);
}
