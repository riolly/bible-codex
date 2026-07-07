import { describe, expect, it } from 'vitest';

import { layoutCodexPage, resolveRules } from '@/engine/layout';
import { fakeMetrics } from '@/engine/layout/fixtures';
import { labSpread } from './lab-spread';

describe('labSpread', () => {
  const spread = labSpread();

  it('is the ADR-0018 judging spread: Genesis prose, a Psalm, a heading', () => {
    const roles = spread.blocks.map((b) => b.role);
    expect(roles).toContain('section');
    expect(roles).toContain('psalm_title');
    const genres = spread.blocks.map((b) => b.genre);
    expect(genres).toContain('prose');
    expect(genres.filter((g) => g === 'poetry').length).toBeGreaterThanOrEqual(2);
  });

  it('poetry carries both couplet indent levels (exercises indentStep)', () => {
    const indents = spread.blocks.filter((b) => b.genre === 'poetry').map((b) => b.indent);
    expect(indents).toContain(1);
    expect(indents).toContain(2);
  });

  it('verse numbers never repeat across blocks — every ornament paints', () => {
    const verses = spread.tokens.filter((t) => t.verseStart).map((t) => t.verse);
    expect(verses.length).toBeGreaterThanOrEqual(4);
    expect(new Set(verses).size).toBe(verses.length);
    const sorted = [...verses].sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(verses).toEqual(sorted);
  });

  it('lays out cleanly through the production Codex path', () => {
    const page = layoutCodexPage({ ...spread, rules: resolveRules(), metrics: fakeMetrics });
    expect(page.blocks.length).toBe(spread.blocks.length);
  });
});
