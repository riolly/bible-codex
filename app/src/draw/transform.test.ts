import { describe, expect, it } from 'vitest';

import { maxScroll } from './transform';

// Internal-overflow scroll (ADR-0016 pillar 3): a taller-than-viewport Page
// scrolls WITHIN the fixed canvas. The ScrollView's scrollable range must be
// exactly the page's overflow — no more (blank tail), no less (cut text).

describe('maxScroll', () => {
  it('is the overflow of the page beyond the viewport', () => {
    expect(maxScroll(3000, 1194)).toBe(1806);
  });

  it('is 0 for a page shorter than the viewport — letterboxed pages never scroll', () => {
    expect(maxScroll(800, 1194)).toBe(0);
  });
});
