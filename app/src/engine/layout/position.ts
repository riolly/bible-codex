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
 * Canvas-em Y of the first line that introduces `verse` (0 = page top when the
 * verse is absent — a safe fallback that never scrolls out of range).
 */
export function codexOffsetForVerse(page: PageLayout, verse: number): number {
  for (const block of page.blocks) {
    for (const line of block.lines) {
      if (lineVerse(line) === verse) return page.text.y + line.y;
    }
  }
  return 0;
}

/** The verse anchored at canvas-em Y `offset`: the last verse-line at/above it. */
export function codexVerseAtOffset(page: PageLayout, offset: number): number | null {
  let current: number | null = null;
  let first: number | null = null;
  for (const block of page.blocks) {
    for (const line of block.lines) {
      const verse = lineVerse(line);
      if (verse === null) continue;
      if (first === null) first = verse;
      if (page.text.y + line.y <= offset + 1e-6) current = verse;
      else return current ?? first;
    }
  }
  return current ?? first;
}

// ── Scroll (horizontal) ──────────────────────────────────────────────────────

/**
 * Canvas-em X of the column that contains `verse` (its frame origin, so the
 * column's leading margin shows). 0 when the verse is absent.
 */
export function scrollOffsetForVerse(layout: ScrollLayout, verse: number, marginEm: number): number {
  for (const column of layout.columns) {
    if (columnVerses(column).has(verse)) return Math.max(0, column.x - marginEm);
  }
  return 0;
}

/** The verse anchored at canvas-em X `offset`: the first verse of the last
 * column at/left of it. */
export function scrollVerseAtOffset(
  layout: ScrollLayout,
  offset: number,
  marginEm: number,
): number | null {
  let current: number | null = null;
  let first: number | null = null;
  for (const column of layout.columns) {
    const verses = columnVerses(column);
    if (verses.size === 0) continue;
    const verse = Math.min(...verses);
    if (first === null) first = verse;
    if (column.x - marginEm <= offset + 1e-6) current = verse;
    else return current ?? first;
  }
  return current ?? first;
}
