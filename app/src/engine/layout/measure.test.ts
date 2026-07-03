import { describe, expect, it } from 'vitest';

import { breakLines } from './measure';

describe('breakLines', () => {
  it('wraps words greedily at the character measure', () => {
    const { lines } = breakLines({ text: 'in the beginning god created', measureChars: 12 });
    expect(lines).toEqual(['in the', 'beginning', 'god created']);
  });

  it('collapses whitespace runs and ignores empties', () => {
    const { lineCount } = breakLines({ text: '  a   b\n\nc  ', measureChars: 80 });
    expect(lineCount).toBe(1);
  });

  it('gives an over-long word its own line', () => {
    const { lines } = breakLines({ text: 'a supercalifragilistic b', measureChars: 5 });
    expect(lines).toEqual(['a', 'supercalifragilistic', 'b']);
  });

  it('rejects a sub-unit measure', () => {
    expect(() => breakLines({ text: 'x', measureChars: 0 })).toThrow();
  });
});
