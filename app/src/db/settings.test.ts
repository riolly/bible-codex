import { describe, expect, it } from 'vitest';

import { DEFAULT_PRESET } from '@/engine/layout';
import type { CascadeContext } from '@/engine/layout';
import type { LayoutOverride, LayoutPreset } from './schema';
import { overrideRowToCascade, presetRowToInput, resolveSettings } from './settings';

const LIFECYCLE = { createdAt: 0, updatedAt: 0, deletedAt: null };

function preset(over: Partial<LayoutPreset> = {}): LayoutPreset {
  return {
    id: 'p1',
    ...LIFECYCLE,
    name: 'Reading',
    fontFamily: 'Cardo',
    fontSize: 18,
    lineHeight: null,
    margin: null,
    paragraphSpacing: null,
    indentStep: null,
    align: null,
    measure: 30,
    railWidth: null,
    ...over,
  } as LayoutPreset;
}

function override(over: Partial<LayoutOverride>): LayoutOverride {
  return {
    id: 'o1',
    ...LIFECYCLE,
    presetId: 'p1',
    scopeKind: 'genre',
    scopeValue: 'poetry',
    fontFamily: null,
    fontSize: null,
    lineHeight: null,
    margin: null,
    paragraphSpacing: null,
    indentStep: null,
    align: null,
    measure: null,
    railWidth: null,
    ...over,
  } as LayoutOverride;
}

const PROSE: CascadeContext = { genre: 'prose', role: null, bookSlug: 'Genesis' };
const POETRY: CascadeContext = { genre: 'poetry', role: null, bookSlug: 'Psalms' };

describe('presetRowToInput', () => {
  it('passes knob columns through, including nulls (= inherit)', () => {
    const input = presetRowToInput(preset());
    expect(input.fontFamily).toBe('Cardo');
    expect(input.fontSize).toBe(18);
    expect(input.lineHeight).toBeNull();
  });
});

describe('overrideRowToCascade', () => {
  it('carries the scope selector plus the knobs', () => {
    const o = overrideRowToCascade(override({ scopeValue: 'poetry', lineHeight: 1.9 }));
    expect(o.scopeKind).toBe('genre');
    expect(o.scopeValue).toBe('poetry');
    expect(o.lineHeight).toBe(1.9);
  });
});

describe('resolveSettings', () => {
  it('null preset falls back to the engine default', () => {
    const rules = resolveSettings(null, [], PROSE);
    expect(rules.fontFamily).toBe(DEFAULT_PRESET.fontFamily);
  });

  it('resolves the preset and applies a matching override', () => {
    const rows = [override({ scopeKind: 'genre', scopeValue: 'poetry', lineHeight: 2.0 })];
    expect(resolveSettings(preset(), rows, POETRY).lineHeight).toBe(2.0);
    // prose block ignores the poetry override → default line height
    expect(resolveSettings(preset(), rows, PROSE).lineHeight).toBe(DEFAULT_PRESET.lineHeight);
  });
});
