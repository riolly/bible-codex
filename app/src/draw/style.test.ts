import { describe, expect, it } from 'vitest';

import { VERSE_NUM_SCALE } from '../engine/layout';
import { PALETTE, styleForBlock, verseNumStyle } from './style';

// Style resolution is the pure half of the draw layer (#8): block genre/role →
// ink treatment. CONSTRAINT: the engine (#7) measured every token at 1em with
// role-blind metrics, so a style may never change advance geometry — no size,
// no letter-spacing, no small caps. Color and slant/weight only (per-token
// anchoring absorbs the small width drift of bold/italic faces).

describe('styleForBlock', () => {
  it('plain prose reads in body ink, regular face', () => {
    expect(styleForBlock('prose', null)).toEqual({
      color: PALETTE.ink,
      bold: false,
      italic: false,
    });
  });

  it('plain poetry is typeset identically to prose — indent is the engine’s job', () => {
    expect(styleForBlock('poetry', null)).toEqual(styleForBlock('prose', null));
  });

  it('book title is bold ink', () => {
    expect(styleForBlock('heading', 'book_title')).toEqual({
      color: PALETTE.ink,
      bold: true,
      italic: false,
    });
  });

  it('section and major-section headings are bold ink', () => {
    expect(styleForBlock('heading', 'section').bold).toBe(true);
    expect(styleForBlock('heading', 'major_section').bold).toBe(true);
  });

  it('psalm title is italic muted — the traditional superscription treatment', () => {
    expect(styleForBlock('heading', 'psalm_title')).toEqual({
      color: PALETTE.muted,
      bold: false,
      italic: true,
    });
  });

  it('acrostic stanza letters are gilt — the Psalm 119 ornament', () => {
    expect(styleForBlock('heading', 'acrostic').color).toBe(PALETTE.gilt);
  });

  it('refrain is italic body ink', () => {
    expect(styleForBlock('poetry', 'refrain')).toEqual({
      color: PALETTE.ink,
      bold: false,
      italic: true,
    });
  });

  it('an unregistered heading role still reads as a heading, never silently as prose', () => {
    expect(styleForBlock('heading', 'implicit').bold).toBe(true);
  });
});

describe('verseNumStyle', () => {
  it('is gilt, superscript-raised, at the exact scale the engine reserved its slot with', () => {
    const style = verseNumStyle();
    expect(style.color).toBe(PALETTE.gilt);
    expect(style.scale).toBe(VERSE_NUM_SCALE);
    expect(style.raiseEm).toBeGreaterThan(0);
    expect(style.raiseEm).toBeLessThan(1);
  });
});
