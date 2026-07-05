import { describe, expect, it } from 'vitest';

import { readingModeForViewport } from './mode';

// ADR-0016: mode is orientation-derived, not a stored toggle.
describe('readingModeForViewport', () => {
  it('reads landscape as Scroll (journey)', () => {
    expect(readingModeForViewport({ width: 1194, height: 834 })).toBe('scroll');
  });

  it('reads portrait as Codex (study)', () => {
    expect(readingModeForViewport({ width: 834, height: 1194 })).toBe('codex');
  });

  it('reads a square viewport as Codex — no sideways posture, stays the annotation home', () => {
    expect(readingModeForViewport({ width: 1000, height: 1000 })).toBe('codex');
  });
});
