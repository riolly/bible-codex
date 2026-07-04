import { describe, expect, it } from 'vitest';

import { layoutCodexPage, resolveRules } from '../engine/layout';
import { ChapterBuilder, fakeMetrics, miniChapter } from '../engine/layout/fixtures';
import { versalSpec } from './drop-cap';

// The drop cap renders as a HANGING VERSAL (manuscript style): a large gilt
// initial in the left margin beside the chapter's opening lines. The engine
// (#7) only marks the token; it never insets lines — so the versal must not
// disturb any text geometry.

const rules = resolveRules();
const page = layoutCodexPage({ ...miniChapter(), rules, metrics: fakeMetrics });

describe('versalSpec', () => {
  const spec = versalSpec(page, rules);

  it('takes the first letter of the drop-cap token ("In the beginning" → "I")', () => {
    expect(spec?.letter).toBe('I');
  });

  it('hangs in the left margin: its right edge sits before the text region, gapped', () => {
    expect(spec!.rightEdgeEm).toBeLessThan(page.text.x);
    expect(spec!.rightEdgeEm).toBeGreaterThan(0);
  });

  it('tops out level with the line that carries the drop-cap token — below the heading', () => {
    // miniChapter opens with a one-line section heading; verse 1 starts one
    // line box + paragraph space below the text-region top (line.y is
    // text-region-absolute in the model).
    expect(spec!.topEm).toBe(page.text.y + rules.lineHeight + rules.paragraphSpacing);
    expect(spec!.topEm).toBeGreaterThan(page.text.y);
  });

  it('spans two lines of the opening block', () => {
    expect(spec!.heightEm).toBe(2 * rules.lineHeight);
  });

  it('is null when the chapter has no verse-bearing word (heading-only page)', () => {
    const headingOnly = new ChapterBuilder(1)
      .block({ genre: 'heading', role: 'section', text: 'Title' })
      .build();
    const bare = layoutCodexPage({ ...headingOnly, rules, metrics: fakeMetrics });
    expect(versalSpec(bare, rules)).toBeNull();
  });
});
