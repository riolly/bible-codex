import { describe, expect, it } from 'vitest';

import { layoutCodexPage } from './codex';
import { fitPageToViewport } from './fit';
import { fakeMetrics, miniChapter } from './fixtures';
import { resolveRules } from './rules';

// Fixed page geometry (ADR-0016): the viewport LETTERBOXES/SCALES the Page —
// it never re-typesets it. Fitting is a pure viewing operation on the canvas.
const rules = resolveRules();
const page = layoutCodexPage({ ...miniChapter(), rules, metrics: fakeMetrics });

const IPAD_PORTRAIT = { width: 834, height: 1194 };
const SMALL_TABLET_PORTRAIT = { width: 600, height: 960 };

describe('fitPageToViewport', () => {
  it('derives scale from the viewport: the page canvas fills the viewport width', () => {
    const fit = fitPageToViewport(page, IPAD_PORTRAIT);
    expect(fit.scale * page.canvas.width).toBeCloseTo(IPAD_PORTRAIT.width);
  });

  it('is a viewing operation only — the same Page object fits every viewport', () => {
    const a = fitPageToViewport(page, IPAD_PORTRAIT);
    const b = fitPageToViewport(page, SMALL_TABLET_PORTRAIT);
    // Scale tracks viewport width proportionally; the em geometry never changes.
    expect(a.scale / b.scale).toBeCloseTo(IPAD_PORTRAIT.width / SMALL_TABLET_PORTRAIT.width);
    expect(a.scale).not.toBeCloseTo(b.scale);
  });

  it('top-aligns a taller-than-viewport page (the chapter scrolls within the page)', () => {
    const fit = fitPageToViewport(page, { width: 800, height: 50 });
    expect(fit.offsetY).toBe(0);
    expect(fit.scale * page.canvas.height).toBeGreaterThan(50);
  });

  it('letterboxes a shorter-than-viewport page with centered vertical bands', () => {
    const viewport = { width: 400, height: 4000 };
    const fit = fitPageToViewport(page, viewport);
    const pageHeightDp = fit.scale * page.canvas.height;
    expect(pageHeightDp).toBeLessThan(viewport.height);
    expect(fit.offsetY).toBeCloseTo((viewport.height - pageHeightDp) / 2);
  });
});
