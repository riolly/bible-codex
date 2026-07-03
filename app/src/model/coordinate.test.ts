import { describe, expect, it } from 'vitest';
import { coordinateKey, rangeKey, type RangeAnchor } from './coordinate';

describe('coordinateKey', () => {
  it('keys a translation-bound word coordinate', () => {
    expect(
      coordinateKey({ translation: 'KJV', book: 'John', chapter: 3, verse: 16, wordIndex: 4 }),
    ).toBe('KJV/John/3/16/4');
  });

  it('wildcards omitted translation and word index (whole canonical verse)', () => {
    expect(coordinateKey({ book: 'John', chapter: 3, verse: 16 })).toBe('*/John/3/16/*');
  });
});

describe('rangeKey — the four range shapes (schema.dbml #5)', () => {
  const base = { translation: 'KJV', book: 'John', chapter: 1 };

  it('whole verse', () => {
    expect(rangeKey({ ...base, verse: 1 })).toBe('KJV/John/1/1/*..*/*');
  });

  it('single word', () => {
    const r: RangeAnchor = { ...base, verse: 1, wordIndex: 3, wordIndexEnd: 3 };
    expect(rangeKey(r)).toBe('KJV/John/1/1/3..*/3');
  });

  it('word span within one verse', () => {
    const r: RangeAnchor = { ...base, verse: 1, wordIndex: 3, wordIndexEnd: 6 };
    expect(rangeKey(r)).toBe('KJV/John/1/1/3..*/6');
  });

  it('cross-verse phrase', () => {
    const r: RangeAnchor = { ...base, verse: 1, wordIndex: 12, verseEnd: 2, wordIndexEnd: 4 };
    expect(rangeKey(r)).toBe('KJV/John/1/1/12..2/4');
  });

  it('distinguishes a whole-verse range from a through-end-of-verse-2 range', () => {
    const whole = rangeKey({ ...base, verse: 1 });
    const toV2 = rangeKey({ ...base, verse: 1, verseEnd: 2 });
    expect(whole).not.toBe(toV2);
  });
});
