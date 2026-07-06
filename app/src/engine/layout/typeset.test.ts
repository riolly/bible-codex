/**
 * Typeset chunk-binding (#7): whitespace is not a Token, so inter-word space is
 * synthesized between chunks. These lock the binding DIRECTION of punctuation —
 * trailing punct glues backward to the word it follows, opening punct (quotes,
 * brackets) glues forward to the word it introduces. The latter is what makes
 * BSB speech read `said, “Let` (space after the comma) not `said,“ Let`.
 */

import { describe, expect, it } from 'vitest';

import { ChapterBuilder, fakeMetrics } from './fixtures';
import type { LineItem } from './model';
import { resolveRules } from './rules';
import { typesetBlocks } from './typeset';

const rules = resolveRules({ measure: 40 }); // wide: keep it all on one line

/** Flatten a single-block chapter's first line into placed items, logical order. */
function itemsOf(text: string, verse: number | null = null): LineItem[] {
  const { blocks, tokens } = new ChapterBuilder(1).block({ genre: 'prose', verse, text }).build();
  const laid = typesetBlocks({ blocks, tokens, rules, metrics: fakeMetrics });
  return laid.blocks[0].lines.flatMap((l) => l.runs.flatMap((r) => [...r.items]));
}

const tokenNamed = (items: LineItem[], text: string) =>
  items.find((i) => i.kind === 'token' && i.text === text)!;

describe('opening punctuation binds forward', () => {
  it('an opening quote glues to the following word, with the space before it', () => {
    // said(2.0) ,(0.5) “ Let(1.5) — fakeMetrics: 0.5em/char, space 0.5em.
    const items = itemsOf('said , “ Let there');
    const comma = tokenNamed(items, ',');
    const quote = tokenNamed(items, '“');
    const let_ = tokenNamed(items, 'Let');

    // Space sits BETWEEN the comma and the quote, not after the quote.
    expect(quote.x - (comma.x + comma.width)).toBeCloseTo(0.5); // one space
    // Quote is glued to its word — no gap.
    expect(let_.x - (quote.x + quote.width)).toBeCloseTo(0);
  });

  it('trailing punctuation still binds backward (no space before it)', () => {
    const items = itemsOf('God said .');
    const said = tokenNamed(items, 'said');
    const stop = tokenNamed(items, '.');
    expect(stop.x - (said.x + said.width)).toBeCloseTo(0); // glued to `said`
  });

  it('a verse-opening quote leads the word AFTER the verse-number ornament', () => {
    const items = itemsOf('“ Let there be light .', 1);
    // Order: verse-num ornament, then the opening quote, then the word.
    expect(items[0].kind).toBe('verse-num');
    expect(items[1]).toMatchObject({ kind: 'token', text: '“' });
    expect(items[2]).toMatchObject({ kind: 'token', text: 'Let' });
    const vn = items[0];
    const quote = items[1];
    // Quote hugs the verse-number slot (no inter-chunk space inside the chunk).
    expect(quote.x - (vn.x + vn.width)).toBeCloseTo(0);
  });

  it('an opening bracket also binds forward', () => {
    const items = itemsOf('word ( inner ) tail');
    const open = tokenNamed(items, '(');
    const inner = tokenNamed(items, 'inner');
    const close = tokenNamed(items, ')');
    expect(inner.x - (open.x + open.width)).toBeCloseTo(0); // ( glued to inner
    expect(close.x - (inner.x + inner.width)).toBeCloseTo(0); // ) glued backward
  });

  it('a trailing opening-quote with no word after it is not dropped', () => {
    const items = itemsOf('end “');
    expect(tokenNamed(items, '“')).toBeTruthy();
  });
});
