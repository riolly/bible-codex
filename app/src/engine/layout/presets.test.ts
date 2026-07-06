import { describe, expect, it } from 'vitest';

import { resolveCascade, type CascadeContext } from './cascade';
import {
  BUILTIN_PRESETS,
  DEFAULT_PRESET_SLUG,
  builtinPreset,
  type PresetSlug,
} from './presets';

const PROSE_GENESIS: CascadeContext = { genre: 'prose', role: null, bookSlug: 'Genesis' };
const POETRY_PSALMS: CascadeContext = { genre: 'poetry', role: null, bookSlug: 'Psalms' };

describe('BUILTIN_PRESETS', () => {
  it('ships exactly Classic and Modern (ADR-0018; Manuscript is a reserved slot)', () => {
    expect(Object.keys(BUILTIN_PRESETS).sort()).toEqual(['classic', 'modern']);
  });

  it('Classic is the traditional personality: justified, drop-cap versal, ivory paper', () => {
    const classic = BUILTIN_PRESETS.classic;
    expect(classic.align).toBe('justify');
    expect(classic.versal.kind).toBe('drop');
    expect(classic.paper.light).toBe('#F6F0E4');
  });

  it('Modern is the contemporary personality: left-aligned, airy, raised-cap, cool white', () => {
    const modern = BUILTIN_PRESETS.modern;
    expect(modern.align).toBe('left');
    expect(modern.versal.kind).toBe('raised');
    expect(modern.lineHeight).toBeGreaterThan(BUILTIN_PRESETS.classic.lineHeight);
    expect(modern.paper.light).not.toBe(BUILTIN_PRESETS.classic.paper.light);
  });

  it('every preset is a full personality: verse-number style + paper tint per theme', () => {
    for (const slug of Object.keys(BUILTIN_PRESETS) as PresetSlug[]) {
      const preset = BUILTIN_PRESETS[slug];
      expect(preset.slug).toBe(slug);
      expect(preset.verseNumber.scale).toBeGreaterThan(0);
      expect(preset.verseNumber.scale).toBeLessThan(1);
      expect(preset.paper.light).toMatch(/^#/);
      expect(preset.paper.dark).toMatch(/^#/);
      // fully concrete base rules — the engine never falls through a builtin
      expect(preset.fontSize).toBeGreaterThan(0);
      expect(preset.measure).toBeGreaterThan(0);
    }
  });
});

describe('builtinPreset', () => {
  it('resolves a known slug', () => {
    expect(builtinPreset('modern').slug).toBe('modern');
  });

  it('an unknown slug falls back to the default preset (stale restore, future slug)', () => {
    expect(builtinPreset('manuscript').slug).toBe(DEFAULT_PRESET_SLUG);
    expect(builtinPreset('').slug).toBe(DEFAULT_PRESET_SLUG);
  });

  it('null (pre-seed settings row) falls back to the default preset', () => {
    expect(builtinPreset(null).slug).toBe(DEFAULT_PRESET_SLUG);
  });
});

describe('a builtin as the cascade base', () => {
  it("Classic's internal poetry override indents poetry, leaves prose alone", () => {
    const classic = builtinPreset('classic');
    const poetry = resolveCascade(classic, classic.overrides, POETRY_PSALMS);
    const prose = resolveCascade(classic, classic.overrides, PROSE_GENESIS);
    expect(poetry.indentStep).toBeGreaterThan(prose.indentStep);
    // the override touches only the indent knob — the rest is the preset
    expect(poetry.fontSize).toBe(prose.fontSize);
    expect(poetry.align).toBe(prose.align);
  });

  it('a builtin with no internal overrides resolves to its own base everywhere', () => {
    const modern = builtinPreset('modern');
    const rules = resolveCascade(modern, modern.overrides, POETRY_PSALMS);
    expect(rules.fontSize).toBe(modern.fontSize);
    expect(rules.align).toBe('left');
  });
});
