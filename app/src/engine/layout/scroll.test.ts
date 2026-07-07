import { describe, expect, it } from 'vitest';

import { fakeMetrics, miniChapter } from './fixtures';
import { resolveRules } from './rules';
import { layoutScrollColumns } from './scroll';

// Scroll mode (landscape, ADR-0016): continuous horizontal columns from the
// SAME corpus + rules; here the viewport DOES parametrize the layout.
const rules = resolveRules({ measure: 12 });

const LANDSCAPE_SHORT = { width: 1194, height: 200 }; // forces many columns
const LANDSCAPE_TALL = { width: 1194, height: 834 };

function scroll(viewport = LANDSCAPE_SHORT) {
  return layoutScrollColumns({ ...miniChapter(), rules, metrics: fakeMetrics, viewport });
}

describe('layoutScrollColumns', () => {
  it('flows the chapter into successive columns whose lines fit the column height', () => {
    const s = scroll();
    expect(s.columns.length).toBeGreaterThan(1);
    for (const column of s.columns) {
      expect(column.lines.length).toBeGreaterThan(0);
      for (const line of column.lines) {
        expect(line.y + rules.lineHeight).toBeLessThanOrEqual(s.columnHeight + 1e-9);
      }
    }
    // Columns advance rightward, measure-wide, without overlap.
    for (let i = 1; i < s.columns.length; i++) {
      expect(s.columns[i].x).toBeGreaterThanOrEqual(s.columns[i - 1].x + rules.measure);
    }
  });

  it('preserves corpus token order across the column flow', () => {
    const s = scroll();
    const seqs = s.columns.flatMap((c) =>
      c.lines.flatMap((l) =>
        l.runs.flatMap((r) => r.items.flatMap((i) => (i.kind === 'token' ? [i.seq] : []))),
      ),
    );
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(seqs.length).toBe(miniChapter().tokens.length);
  });

  it('is viewport-parametric: a taller viewport packs the same corpus into fewer columns', () => {
    const short = scroll(LANDSCAPE_SHORT);
    const tall = scroll(LANDSCAPE_TALL);
    expect(tall.columnHeight).toBeGreaterThan(short.columnHeight);
    expect(tall.columns.length).toBeLessThan(short.columns.length);
  });

  it('carries block identity on every line (genre styling survives the column split)', () => {
    const s = scroll();
    const genres = new Set(s.columns.flatMap((c) => c.lines.map((l) => l.genre)));
    expect(genres).toEqual(new Set(['heading', 'prose', 'poetry']));
  });

  it('keeps Scroll clean: no verse-number slots and no running-head model', () => {
    const s = scroll();
    const items = s.columns.flatMap((c) => c.lines.flatMap((l) => l.runs.flatMap((r) => r.items)));
    expect(items.some((i) => i.kind === 'verse-num')).toBe(false);
    expect('runningHead' in s).toBe(false);
  });
});
