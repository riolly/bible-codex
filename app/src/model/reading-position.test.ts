import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POSITION,
  positionKey,
  samePosition,
  type ReadingPosition,
} from './reading-position';

const genesis1: ReadingPosition = { translation: 'KJV', book: 'Genesis', chapter: 1 };

describe('DEFAULT_POSITION', () => {
  it('opens the reader at a book present in every bundled corpus', () => {
    // A cold reader (before #14 hydrates the durable bookmark) must render
    // something valid: Genesis 1, canonical across KJV/BSB.
    expect(DEFAULT_POSITION).toEqual(genesis1);
  });
});

describe('samePosition', () => {
  it('is true only when translation, book, and chapter all match', () => {
    expect(samePosition(genesis1, { ...genesis1 })).toBe(true);
    expect(samePosition(genesis1, { ...genesis1, chapter: 2 })).toBe(false);
    expect(samePosition(genesis1, { ...genesis1, book: 'Exodus' })).toBe(false);
    // Translation is part of the address: the same passage in BSB is a
    // different reading position (a KJV⇄BSB switch is a real move).
    expect(samePosition(genesis1, { ...genesis1, translation: 'BSB' })).toBe(false);
  });
});

describe('positionKey', () => {
  it('is a stable string distinguishing translation, book, and chapter', () => {
    expect(positionKey(genesis1)).toBe('KJV/Genesis/1');
    expect(positionKey({ ...genesis1, translation: 'BSB' })).toBe('BSB/Genesis/1');
    expect(positionKey({ ...genesis1, chapter: 50 })).toBe('KJV/Genesis/50');
  });

  it('agrees with samePosition', () => {
    const a = genesis1;
    const b = { translation: 'KJV', book: 'Genesis', chapter: 1 };
    expect(positionKey(a) === positionKey(b)).toBe(samePosition(a, b));
  });
});
