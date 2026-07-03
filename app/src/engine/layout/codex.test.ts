import { describe, expect, it } from 'vitest';

import { layoutCodexPage } from './codex';
import { ChapterBuilder, fakeMetrics, miniChapter } from './fixtures';
import { resolveRules } from './rules';

// Structural assertions only — em-relative geometry, NEVER pixels (ADR-0004).
const rules = resolveRules({ measure: 12 }); // narrow measure to force line breaks

function page() {
  return layoutCodexPage({ ...miniChapter(), rules, metrics: fakeMetrics });
}

describe('layoutCodexPage — block structure', () => {
  it('lays out every corpus block, in chapter order, carrying genre/role/indent', () => {
    const p = page();
    expect(p.blocks.map((b) => b.genre)).toEqual([
      'heading',
      'prose',
      'prose',
      'poetry',
      'poetry',
    ]);
    expect(p.blocks[0].role).toBe('section');
    expect(p.blocks.map((b) => b.indent)).toEqual([0, 0, 0, 1, 2]);
    // Blocks stack downward without overlap.
    for (let i = 1; i < p.blocks.length; i++) {
      expect(p.blocks[i].y).toBeGreaterThanOrEqual(p.blocks[i - 1].y + p.blocks[i - 1].height);
    }
  });

  it('breaks prose into lines that honor the measure', () => {
    const p = page();
    const prose = p.blocks[1];
    expect(prose.lines.length).toBeGreaterThan(1); // narrow measure forces a break
    for (const line of prose.lines) {
      for (const run of line.runs) {
        for (const item of run.items) {
          expect(item.x + item.width).toBeLessThanOrEqual(rules.measure + 1e-9);
        }
      }
    }
    // Every token of the block appears exactly once, in corpus order.
    const texts = prose.lines.flatMap((l) =>
      l.runs.flatMap((r) => r.items.flatMap((i) => (i.kind === 'token' ? [i.text] : []))),
    );
    expect(texts).toEqual([
      'In',
      'the',
      'beginning',
      'God',
      'created',
      'the',
      'heaven',
      'and',
      'the',
      'earth',
      '.',
    ]);
  });

  it('indents poetry lines by indent × indentStep, shrinking the available measure', () => {
    const p = page();
    const [q1, q2] = [p.blocks[3], p.blocks[4]];
    const firstItem = (b: (typeof p.blocks)[number]) => b.lines[0].runs[0].items[0];
    expect(firstItem(q1).x).toBeCloseTo(1 * rules.indentStep);
    expect(firstItem(q2).x).toBeCloseTo(2 * rules.indentStep);
  });

  it('places headings as blocks outside the verse flow — no verse cues, verse-null tokens', () => {
    const p = page();
    const heading = p.blocks[0];
    expect(heading.genre).toBe('heading');
    const items = heading.lines.flatMap((l) => l.runs.flatMap((r) => r.items));
    expect(items.some((i) => i.kind === 'verse-num')).toBe(false);
    for (const item of items) {
      expect(item.kind).toBe('token');
      if (item.kind === 'token') expect(item.verse).toBeNull();
    }
  });

  it('reserves a gilt superscript verse-number slot before each verse-start word', () => {
    const p = page();
    const allItems = p.blocks.flatMap((b) =>
      b.lines.flatMap((l) => l.runs.flatMap((r) => r.items)),
    );
    const verseNums = allItems.filter((i) => i.kind === 'verse-num');
    expect(verseNums.map((v) => (v.kind === 'verse-num' ? v.verse : -1))).toEqual([1, 2, 3]);
    // The ornament slot sits immediately before its verse's first word.
    const first = allItems.findIndex((i) => i.kind === 'verse-num');
    const next = allItems[first + 1];
    expect(next.kind).toBe('token');
    if (next.kind === 'token') expect(next.text).toBe('In');
    // The slot occupies real width — line breaking accounted for it.
    for (const v of verseNums) expect(v.width).toBeGreaterThan(0);
  });

  it('cues a drop cap on the first word of the chapter opening', () => {
    const p = page();
    // First verse-bearing word of the chapter: "In" (heading is not the opening).
    const firstWord = miniChapter().tokens.find((t) => t.verse !== null && t.kind === 'word');
    expect(p.dropCap).toEqual({ tokenSeq: firstWord!.seq });
  });

  it('separates blocks by paragraphSpacing and lines by lineHeight', () => {
    const p = page();
    const prose = p.blocks[1];
    expect(prose.lines[1].y - prose.lines[0].y).toBeCloseTo(rules.lineHeight);
    expect(p.blocks[2].y - (p.blocks[1].y + p.blocks[1].height)).toBeCloseTo(
      rules.paragraphSpacing,
    );
  });
});

describe('layoutCodexPage — RTL runs', () => {
  it('tags a Hebrew acrostic heading as an rtl run (Psalm 119 stanza letters)', () => {
    const corpus = new ChapterBuilder(119)
      .block({ genre: 'heading', role: 'acrostic', text: 'אָלֶף' })
      .block({ genre: 'poetry', indent: 1, verse: 1, text: 'Blessed are the undefiled' })
      .build();
    const p = layoutCodexPage({ ...corpus, rules, metrics: fakeMetrics });
    const acrostic = p.blocks[0];
    expect(acrostic.lines[0].runs).toHaveLength(1);
    expect(acrostic.lines[0].runs[0].direction).toBe('rtl');
    // The poetry stays ltr.
    expect(p.blocks[1].lines[0].runs.every((r) => r.direction === 'ltr')).toBe(true);
  });

  it('splits a mixed line into direction runs and mirrors rtl item positions', () => {
    const corpus = new ChapterBuilder(1)
      .block({ genre: 'prose', verse: 1, text: 'the word אור means light' })
      .build();
    const p = layoutCodexPage({ ...corpus, rules: resolveRules(), metrics: fakeMetrics });
    const runs = p.blocks[0].lines[0].runs;
    expect(runs.map((r) => r.direction)).toEqual(['ltr', 'rtl', 'ltr']);
    const rtl = runs[1];
    const [ltrBefore, , ltrAfter] = runs;
    const lastBefore = ltrBefore.items[ltrBefore.items.length - 1];
    const firstAfter = ltrAfter.items[0];
    // The rtl run still occupies the slot between its ltr neighbours…
    for (const item of rtl.items) {
      expect(item.x).toBeGreaterThan(lastBefore.x + lastBefore.width - 1e-9);
      expect(item.x + item.width).toBeLessThan(firstAfter.x + 1e-9);
    }
  });

  it('lays a multi-token rtl run right-to-left within its span', () => {
    const corpus = new ChapterBuilder(1)
      .block({ genre: 'prose', verse: 1, text: 'read בְּרֵאשִׁית בָּרָא aloud' })
      .build();
    const p = layoutCodexPage({ ...corpus, rules: resolveRules(), metrics: fakeMetrics });
    const rtl = p.blocks[0].lines[0].runs.find((r) => r.direction === 'rtl')!;
    const [first, second] = rtl.items;
    // Logical order is preserved in the items array; VISUAL position runs right-to-left:
    // the first logical token sits to the RIGHT of the second.
    expect(first.kind).toBe('token');
    if (first.kind === 'token' && second.kind === 'token') {
      expect(first.text).toBe('בְּרֵאשִׁית');
      expect(first.x).toBeGreaterThan(second.x);
    }
  });
});

describe('layoutCodexPage — Page geometry & Margin rail (ADR-0016)', () => {
  it('reserves the Margin rail as a first-class region beside the measure', () => {
    const p = page();
    expect(p.text.x).toBeCloseTo(rules.margin);
    expect(p.text.width).toBeCloseTo(rules.measure);
    expect(p.rail.width).toBeCloseTo(rules.railWidth);
    // Rail sits clear of the text region…
    expect(p.rail.x).toBeGreaterThanOrEqual(p.text.x + p.text.width);
    // …and the canvas contains both.
    expect(p.canvas.width).toBeGreaterThanOrEqual(p.rail.x + p.rail.width);
  });

  it('widening the rail grows the canvas OUTWARD only — measure and line breaks unchanged', () => {
    const base = page();
    const widened = layoutCodexPage({
      ...miniChapter(),
      rules,
      metrics: fakeMetrics,
      railWidth: rules.railWidth + 5,
    });
    // Canvas grew by exactly the extra rail width…
    expect(widened.canvas.width).toBeCloseTo(base.canvas.width + 5);
    expect(widened.rail.width).toBeCloseTo(base.rail.width + 5);
    // …the text measure did not move or shrink…
    expect(widened.text).toEqual(base.text);
    // …and the typeset is IDENTICAL: same blocks, lines, item positions.
    expect(widened.blocks).toEqual(base.blocks);
  });

  it('clamps rail narrowing at the preset base (expansion-only knob)', () => {
    const narrowed = layoutCodexPage({
      ...miniChapter(),
      rules,
      metrics: fakeMetrics,
      railWidth: 0,
    });
    expect(narrowed.rail.width).toBeCloseTo(rules.railWidth);
  });
});

describe('layoutCodexPage — verse-num binds to its word, not the preceding run', () => {
  it('keeps a verse number with its verse-start RTL word, on the RTL leading side', () => {
    // A paragraph Block spanning a verse boundary where verse 2 opens with a
    // Hebrew word — handcrafted rows (ChapterBuilder is one-verse-per-block).
    const block = { id: 1, chapter: 1, genre: 'prose', role: null, indent: 0, seq: 0 } as const;
    const tok = (seq: number, text: string, verse: number, verseStart: boolean) => ({
      id: seq + 1,
      blockId: 1,
      chapter: 1,
      verse,
      wordIndex: 0,
      seq,
      kind: 'word' as const,
      text,
      verseStart,
      owId: null,
    });
    const tokens = [tok(0, 'say', 1, true), tok(1, 'אוֹר', 2, true), tok(2, 'good', 2, false)];
    const p = layoutCodexPage({
      chapter: 1,
      blocks: [block],
      tokens,
      rules: resolveRules(),
      metrics: fakeMetrics,
    });
    const runs = p.blocks[0].lines[0].runs;
    expect(runs.map((r) => r.direction)).toEqual(['ltr', 'rtl', 'ltr']);
    const rtl = runs[1];
    const vn = rtl.items.find((i) => i.kind === 'verse-num');
    // The v2 ornament travels WITH its Hebrew word into the rtl run…
    expect(vn).toBeDefined();
    if (vn?.kind === 'verse-num') expect(vn.verse).toBe(2);
    // …and mirrors to the word's RIGHT — the leading side of an rtl run.
    const word = rtl.items.find((i) => i.kind === 'token')!;
    expect(vn!.x).toBeGreaterThan(word.x + word.width - 1e-9);
  });
});
