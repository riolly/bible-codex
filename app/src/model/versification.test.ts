import { describe, expect, it } from 'vitest';

import {
  buildVersificationMap,
  toCanonical,
  toNative,
  type VersificationRow,
} from './versification';

// A tiny slice of the Joel divergence (native ch.3 → canonical 2:28+): enough to
// prove the lookup and its inverse without depending on the ingest fixture. The
// full, deliberately-divergent hard-gate round-trip lives in
// scripts/ingest/versification.test.ts (ADR-0010).
const rows: VersificationRow[] = [
  { book: 'Joel', srcChapter: 3, srcVerse: 1, canonChapter: 2, canonVerse: 28 },
  { book: 'Joel', srcChapter: 3, srcVerse: 2, canonChapter: 2, canonVerse: 29 },
];

describe('toCanonical / toNative', () => {
  const map = buildVersificationMap(rows);

  it('maps a native address to its canonical address', () => {
    expect(toCanonical(map, 'Joel', { chapter: 3, verse: 1 })).toEqual({ chapter: 2, verse: 28 });
  });

  it('maps a canonical address back to its native address', () => {
    expect(toNative(map, 'Joel', { chapter: 2, verse: 28 })).toEqual({ chapter: 3, verse: 1 });
  });

  it('is identity where no row exists (the sparse map is empty for av11n)', () => {
    // Same book, undiverged verse:
    expect(toCanonical(map, 'Joel', { chapter: 1, verse: 1 })).toEqual({ chapter: 1, verse: 1 });
    expect(toNative(map, 'Joel', { chapter: 1, verse: 1 })).toEqual({ chapter: 1, verse: 1 });
    // A book with no divergence rows at all:
    expect(toCanonical(map, 'Genesis', { chapter: 1, verse: 1 })).toEqual({ chapter: 1, verse: 1 });
  });

  it('round-trips in both directions', () => {
    for (const r of rows) {
      const native = { chapter: r.srcChapter, verse: r.srcVerse };
      const canon = { chapter: r.canonChapter, verse: r.canonVerse };
      expect(toCanonical(map, r.book, toNative(map, r.book, canon))).toEqual(canon);
      expect(toNative(map, r.book, toCanonical(map, r.book, native))).toEqual(native);
    }
  });
});

describe('buildVersificationMap', () => {
  it('rejects a non-bijective map (two natives claiming one canonical verse)', () => {
    expect(() =>
      buildVersificationMap([
        { book: 'Joel', srcChapter: 3, srcVerse: 1, canonChapter: 2, canonVerse: 28 },
        { book: 'Joel', srcChapter: 4, srcVerse: 9, canonChapter: 2, canonVerse: 28 },
      ]),
    ).toThrow(/not bijective/);
  });

  it('scopes lookups per book — a Joel row never leaks into another book', () => {
    const map = buildVersificationMap(rows);
    // Malachi is not in the map: identity, not Joel's mapping.
    expect(toCanonical(map, 'Malachi', { chapter: 3, verse: 1 })).toEqual({ chapter: 3, verse: 1 });
  });
});
