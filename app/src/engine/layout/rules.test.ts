import { describe, expect, it } from 'vitest';

import { DEFAULT_PRESET, resolveRules } from './rules';

describe('resolveRules', () => {
  it('resolves a full preset to itself (base-only cascade, #7)', () => {
    const rules = resolveRules({
      fontFamily: 'EB Garamond',
      fontSize: 20,
      lineHeight: 1.5,
      margin: 2,
      paragraphSpacing: 0.5,
      indentStep: 1.25,
      align: 'justify',
      measure: 28,
      railWidth: 7,
    });
    expect(rules).toEqual({
      fontFamily: 'EB Garamond',
      fontSize: 20,
      lineHeight: 1.5,
      margin: 2,
      paragraphSpacing: 0.5,
      indentStep: 1.25,
      align: 'justify',
      measure: 28,
      railWidth: 7,
    });
  });

  it('fills null/omitted knobs from the default preset', () => {
    const rules = resolveRules({ fontSize: 22, lineHeight: null });
    expect(rules.fontSize).toBe(22);
    expect(rules.lineHeight).toBe(DEFAULT_PRESET.lineHeight);
    expect(rules.measure).toBe(DEFAULT_PRESET.measure);
    expect(rules.align).toBe(DEFAULT_PRESET.align);
  });

  it('default preset magnitudes are relative units — em-scale, never pixel-scale (ADR-0004)', () => {
    // Adjustable magnitudes live in em / em-multipliers. A pixel value would
    // be orders of magnitude larger; guard the unit convention structurally.
    expect(DEFAULT_PRESET.lineHeight).toBeGreaterThan(1);
    expect(DEFAULT_PRESET.lineHeight).toBeLessThan(3);
    expect(DEFAULT_PRESET.margin).toBeLessThan(10); // em, not px
    expect(DEFAULT_PRESET.measure).toBeGreaterThan(15); // em — readable measure
    expect(DEFAULT_PRESET.measure).toBeLessThan(45);
    expect(DEFAULT_PRESET.indentStep).toBeLessThan(4);
    expect(DEFAULT_PRESET.railWidth).toBeLessThan(15);
  });

  it('rejects a non-positive measure or font size', () => {
    expect(() => resolveRules({ measure: 0 })).toThrow();
    expect(() => resolveRules({ fontSize: -1 })).toThrow();
  });
});
