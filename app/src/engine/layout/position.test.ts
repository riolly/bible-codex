import { describe, expect, it } from 'vitest';

import { layoutCodexPage } from './codex';
import { fakeMetrics, miniChapter } from './fixtures';
import {
  codexOffsetForVerse,
  codexVerseAnchors,
  codexVerseAtOffset,
  scrollOffsetForVerse,
  scrollVerseAnchors,
  scrollVerseAtOffset,
  verseAtAnchorOffset,
} from './position';
import { resolveRules } from './rules';
import { layoutScrollColumns } from './scroll';

// The passage in view survives a mode switch because it is held as a canonical
// VERSE, not a pixel offset (ADR-0016). These cover the pure seek/read core.
const rules = resolveRules({ measure: 12 });
const page = layoutCodexPage({ ...miniChapter(), rules, metrics: fakeMetrics });
const scroll = layoutScrollColumns({
  ...miniChapter(),
  rules,
  metrics: fakeMetrics,
  viewport: { width: 1194, height: 180 }, // short → many columns
});

describe('codex position (vertical)', () => {
  it('round-trips: seeking to a verse then reading it back yields the same verse', () => {
    for (const verse of [1, 2, 3]) {
      const y = codexOffsetForVerse(page, verse);
      expect(codexVerseAtOffset(page, y)).toBe(verse);
    }
  });

  it('verse offsets increase down the page', () => {
    expect(codexOffsetForVerse(page, 2)).toBeGreaterThan(codexOffsetForVerse(page, 1));
    expect(codexOffsetForVerse(page, 3)).toBeGreaterThan(codexOffsetForVerse(page, 2));
  });

  it('anchors the top of the page to the first verse', () => {
    expect(codexVerseAtOffset(page, 0)).toBe(1);
  });

  it('falls back to the nearest earlier verse for an absent verse (translation omission)', () => {
    // A verse past the end (e.g. one the switched-to translation relegates to a
    // note) lands on the last present verse, not the page top.
    expect(codexOffsetForVerse(page, 999)).toBe(codexOffsetForVerse(page, 3));
  });

  it('falls back to page top when no earlier verse exists', () => {
    expect(codexOffsetForVerse(page, 0)).toBe(0);
  });
});

describe('scroll position (horizontal)', () => {
  const margin = rules.margin;

  it('round-trips: seeking to a verse then reading it back yields that verse or one before it', () => {
    // A column may hold several verses; reading back gives the column's leading
    // verse, which is <= the sought verse and shares its column (in view).
    for (const verse of [1, 2, 3]) {
      const x = scrollOffsetForVerse(scroll, verse, margin);
      const back = scrollVerseAtOffset(scroll, x, margin)!;
      // We land on a column showing `verse`; its leading verse is <= `verse`
      // and starts at or before the column we landed on (verses span columns).
      expect(back).toBeLessThanOrEqual(verse);
      expect(scrollOffsetForVerse(scroll, back, margin)).toBeLessThanOrEqual(x);
    }
  });

  it('verse offsets never decrease as the passage advances', () => {
    expect(scrollOffsetForVerse(scroll, 3, margin)).toBeGreaterThanOrEqual(
      scrollOffsetForVerse(scroll, 1, margin),
    );
  });

  it('anchors the scroll origin to the first verse', () => {
    expect(scrollVerseAtOffset(scroll, 0, margin)).toBe(1);
  });
});

// The draw layer builds the anchor table once per layout and reads it on every
// scroll frame; these lock the shared hot-path primitive the surfaces depend on.
describe('verse anchor table', () => {
  it('codex anchors ascend by offset and hold one entry per verse', () => {
    const anchors = codexVerseAnchors(page);
    expect(anchors.length).toBeGreaterThan(0);
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i].offset).toBeGreaterThanOrEqual(anchors[i - 1].offset);
    }
    expect(new Set(anchors.map((a) => a.verse)).size).toBe(anchors.length);
  });

  it('scroll anchors ascend by offset', () => {
    const anchors = scrollVerseAnchors(scroll, rules.margin);
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i].offset).toBeGreaterThanOrEqual(anchors[i - 1].offset);
    }
  });

  it('reads back the same verse the table-free codex path yields', () => {
    const anchors = codexVerseAnchors(page);
    for (const offset of [0, codexOffsetForVerse(page, 2), codexOffsetForVerse(page, 3), 1e9]) {
      expect(verseAtAnchorOffset(anchors, offset)).toBe(codexVerseAtOffset(page, offset));
    }
  });

  it('returns null for an empty table', () => {
    expect(verseAtAnchorOffset([], 0)).toBeNull();
  });
});
