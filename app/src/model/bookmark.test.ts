import { describe, expect, it } from 'vitest';

import { DEFAULT_POSITION, type ReadingPosition } from './reading-position';
import {
  bookmarkFromPosition,
  planBookmarkWrite,
  positionForBookmark,
  type Bookmark,
} from './bookmark';

const johnPos: ReadingPosition = { translation: 'BSB', book: 'John', chapter: 3 };
const johnMark: Bookmark = { bookSlug: 'John', chapter: 3, verse: 16 };

describe('bookmarkFromPosition', () => {
  it('captures book/chapter at a verse, DROPPING the translation (canonical-only)', () => {
    // The deliberate exception (ADR-0012 / CONTEXT.md): the bookmark relates the
    // reader to the passage, not to one translation's words. Saving must not
    // carry the translation, or a KJV⇄BSB switch could not share the row.
    const mark = bookmarkFromPosition(johnPos, 16);
    expect(mark).toEqual(johnMark);
    expect('translation' in mark).toBe(false);
  });
});

describe('positionForBookmark', () => {
  it('re-attaches a chosen translation to the canonical passage (restore)', () => {
    // Restore lands the same canonical passage in whatever translation the
    // reader is showing — the KJV⇄BSB-lands-in-place property (#12) by design.
    expect(positionForBookmark(johnMark, 'KJV')).toEqual({
      translation: 'KJV',
      book: 'John',
      chapter: 3,
    });
    expect(positionForBookmark(johnMark, 'BSB')).toEqual({
      translation: 'BSB',
      book: 'John',
      chapter: 3,
    });
  });

  it('round-trips book/chapter/verse regardless of translation', () => {
    const mark = bookmarkFromPosition(johnPos, 16);
    const back = positionForBookmark(mark, DEFAULT_POSITION.translation);
    expect(back.book).toBe(johnPos.book);
    expect(back.chapter).toBe(johnPos.chapter);
    // verse survives the round trip on the bookmark, not on the position
    expect(bookmarkFromPosition(back, mark.verse).verse).toBe(16);
  });
});

describe('planBookmarkWrite', () => {
  it('updates the existing live row — never inserts a second bookmark per book', () => {
    // AC: re-reading a book updates the existing row (one live bookmark per book).
    expect(planBookmarkWrite('row-abc')).toEqual({ op: 'update', id: 'row-abc' });
  });

  it('inserts when the book has no live bookmark yet', () => {
    expect(planBookmarkWrite(null)).toEqual({ op: 'insert' });
  });
});
