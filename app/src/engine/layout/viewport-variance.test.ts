import { describe, expect, it } from 'vitest';

import { layoutCodexPage } from './codex';
import { fitPageToViewport } from './fit';
import { fakeMetrics, miniChapter } from './fixtures';
import { resolveRules } from './rules';
import { layoutScrollColumns } from './scroll';

// AC (#7): same corpus + rules at multiple viewports/aspect ratios each
// produce a valid layout — viewport-parametric with NO special-casing
// (ADR-0004). Structural assertions only, no pixels.
const rules = resolveRules();
const corpus = miniChapter();

const PORTRAIT = [
  { name: 'small tablet portrait', width: 600, height: 960 },
  { name: 'iPad portrait', width: 834, height: 1194 },
  { name: 'large tablet portrait', width: 1024, height: 1366 },
];
const LANDSCAPE = [
  { name: 'small tablet landscape', width: 960, height: 600 },
  { name: 'iPad landscape', width: 1194, height: 834 },
  { name: 'large tablet landscape', width: 1366, height: 1024 },
];

describe('viewport variance — Codex (portrait)', () => {
  it('every viewport sees the SAME fixed Page; only letterbox/scale differ', () => {
    const page = layoutCodexPage({ ...corpus, rules, metrics: fakeMetrics });
    // The Page is viewport-independent by construction — layoutCodexPage takes
    // no viewport. Re-typesetting yields an identical model (pure function)…
    expect(layoutCodexPage({ ...corpus, rules, metrics: fakeMetrics })).toEqual(page);
    // …and each viewport derives a valid, width-filling fit from it.
    const scales = PORTRAIT.map((vp) => {
      const fit = fitPageToViewport(page, vp);
      expect(fit.scale).toBeGreaterThan(0);
      expect(fit.scale * page.canvas.width).toBeCloseTo(vp.width);
      expect(fit.offsetY).toBeGreaterThanOrEqual(0);
      return fit.scale;
    });
    // Text measure is identical across viewports for the same preset: the em
    // model never varied, only the scale did.
    expect(new Set(scales).size).toBe(PORTRAIT.length);
    expect(page.text.width).toBeCloseTo(rules.measure);
  });
});

describe('viewport variance — Scroll (landscape)', () => {
  it('every viewport yields valid columns: measure honored, relative magnitudes resolved', () => {
    for (const vp of LANDSCAPE) {
      const s = layoutScrollColumns({ ...corpus, rules, metrics: fakeMetrics, viewport: vp });
      expect(s.columns.length).toBeGreaterThan(0);
      expect(s.columnWidth).toBeCloseTo(rules.measure);
      expect(s.columnHeight).toBeCloseTo(vp.height / rules.fontSize - 2 * rules.margin);
      for (const column of s.columns) {
        for (const line of column.lines) {
          expect(line.y + rules.lineHeight).toBeLessThanOrEqual(s.columnHeight + 1e-9);
          for (const run of line.runs) {
            for (const item of run.items) {
              expect(item.x + item.width).toBeLessThanOrEqual(rules.measure + 1e-9);
              expect(item.x).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
      // Nothing was dropped at any aspect ratio.
      const tokenCount = s.columns
        .flatMap((c) => c.lines)
        .flatMap((l) => l.runs)
        .flatMap((r) => r.items)
        .filter((i) => i.kind === 'token').length;
      expect(tokenCount).toBe(corpus.tokens.length);
    }
  });
});
