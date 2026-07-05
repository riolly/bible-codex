import { describe, expect, it } from 'vitest';

import { resolveCascade, type CascadeContext, type LayoutOverride } from './cascade';
import { DEFAULT_PRESET } from './rules';

const PROSE_GENESIS: CascadeContext = { genre: 'prose', role: null, bookSlug: 'Genesis' };
const POETRY_PSALM_TITLE: CascadeContext = {
  genre: 'poetry',
  role: 'psalm_title',
  bookSlug: 'Psalms',
};

const BASE = { fontFamily: 'Cardo', fontSize: 18, measure: 30 };

describe('resolveCascade', () => {
  it('base-only: no overrides resolves to the preset over the defaults', () => {
    const rules = resolveCascade(BASE, [], PROSE_GENESIS);
    expect(rules.fontFamily).toBe('Cardo');
    expect(rules.fontSize).toBe(18);
    expect(rules.measure).toBe(30);
    // untouched knobs fall to DEFAULT_PRESET
    expect(rules.lineHeight).toBe(DEFAULT_PRESET.lineHeight);
  });

  it('applies a matching genre override, leaves other knobs inheriting', () => {
    const overrides: LayoutOverride[] = [
      { scopeKind: 'genre', scopeValue: 'poetry', lineHeight: 1.9, align: 'justify' },
    ];
    const poetry = resolveCascade(BASE, overrides, POETRY_PSALM_TITLE);
    expect(poetry.lineHeight).toBe(1.9);
    expect(poetry.align).toBe('justify');
    // font untouched → still the preset's
    expect(poetry.fontFamily).toBe('Cardo');
    // a prose block ignores the poetry override
    const prose = resolveCascade(BASE, overrides, PROSE_GENESIS);
    expect(prose.lineHeight).toBe(DEFAULT_PRESET.lineHeight);
  });

  it('precedence base < genre < role < book: most specific wins per knob', () => {
    const overrides: LayoutOverride[] = [
      { scopeKind: 'genre', scopeValue: 'poetry', fontSize: 20, measure: 26 },
      { scopeKind: 'role', scopeValue: 'psalm_title', fontSize: 22 },
      { scopeKind: 'book', scopeValue: 'Psalms', fontSize: 24 },
    ];
    const rules = resolveCascade(BASE, overrides, POETRY_PSALM_TITLE);
    // book beats role beats genre for the contested knob
    expect(rules.fontSize).toBe(24);
    // measure only genre set it → genre value survives
    expect(rules.measure).toBe(26);
  });

  it('role beats genre when no book override is present', () => {
    const overrides: LayoutOverride[] = [
      { scopeKind: 'genre', scopeValue: 'poetry', fontSize: 20 },
      { scopeKind: 'role', scopeValue: 'psalm_title', fontSize: 22 },
    ];
    expect(resolveCascade(BASE, overrides, POETRY_PSALM_TITLE).fontSize).toBe(22);
  });

  it('a null knob on an override inherits — it does not clobber a less-specific value', () => {
    const overrides: LayoutOverride[] = [
      { scopeKind: 'genre', scopeValue: 'poetry', fontSize: 20 },
      { scopeKind: 'book', scopeValue: 'Psalms', fontSize: null, measure: 28 },
    ];
    const rules = resolveCascade(BASE, overrides, POETRY_PSALM_TITLE);
    // book's fontSize is null → genre's 20 stands
    expect(rules.fontSize).toBe(20);
    expect(rules.measure).toBe(28);
  });

  it('a block with no role matches no role-scoped override', () => {
    const overrides: LayoutOverride[] = [
      { scopeKind: 'role', scopeValue: 'psalm_title', fontSize: 40 },
    ];
    expect(resolveCascade(BASE, overrides, PROSE_GENESIS).fontSize).toBe(18);
  });

  it('a non-matching book override is ignored', () => {
    const overrides: LayoutOverride[] = [
      { scopeKind: 'book', scopeValue: 'Romans', fontFamily: 'EB Garamond' },
    ];
    expect(resolveCascade(BASE, overrides, PROSE_GENESIS).fontFamily).toBe('Cardo');
  });
});
