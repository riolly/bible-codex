import { describe, expect, it } from 'vitest';

import { tokenize } from './tokenize';

/**
 * ADVERSARIAL policy tests (ADR-0014). These pin the REGISTERED tokenization
 * rules — the meaning of every anchor word_index. A failure here is not a
 * broken test to update: it is an ANCHOR MIGRATION to stop and think about.
 */
describe('registered tokenization policy (ADR-0014)', () => {
  const words = (s: string) => tokenize(s).filter((t) => t.kind === 'word').map((t) => t.text);
  const texts = (s: string) => tokenize(s).map((t) => `${t.kind === 'word' ? 'w' : 'p'}:${t.text}`);

  it('possessives are ONE word', () => {
    expect(texts("the LORD's hand")).toEqual(['w:the', "w:LORD's", 'w:hand']);
    expect(texts('the LORD’s hand')).toEqual(['w:the', 'w:LORD’s', 'w:hand']);
  });

  it('hyphenated compounds are ONE word', () => {
    expect(texts('his father-in-law said')).toEqual(['w:his', 'w:father-in-law', 'w:said']);
  });

  it('a trailing bare apostrophe (plural possessive) is PUNCT', () => {
    expect(texts('the disciples’ feet')).toEqual(['w:the', 'w:disciples', 'p:’', 'w:feet']);
  });

  it('a leading elision apostrophe is PUNCT; the elided body is the word', () => {
    expect(texts('’Twas so')).toEqual(['p:’', 'w:Twas', 'w:so']);
  });

  it('grouped numbers are ONE word; ordinals too', () => {
    expect(texts('all 144,000 stood')).toEqual(['w:all', 'w:144,000', 'w:stood']);
    expect(words('the 40th year')).toEqual(['the', '40th', 'year']);
    expect(words('about 3.5 measures')).toEqual(['about', '3.5', 'measures']);
    expect(words('Saul killed 1,000')).toEqual(['Saul', 'killed', '1,000']);
  });

  it('mixed punctuation runs collapse into a SINGLE punct token', () => {
    expect(texts('said, “Behold!”')).toEqual(['w:said', 'p:,', 'p:“', 'w:Behold', 'p:!”']);
    expect(texts('riverside—watching.')).toEqual(['w:riverside', 'p:—', 'w:watching', 'p:.']);
  });

  it('whitespace is NEVER a token', () => {
    for (const t of tokenize('  In \t the\n beginning  ')) {
      expect(t.text).not.toMatch(/\s/);
      expect(t.text.length).toBeGreaterThan(0);
    }
    expect(tokenize('   \n\t ')).toEqual([]);
  });

  it('a word must begin and end alphanumeric', () => {
    // no leading/trailing separators ever leak into a word token
    for (const s of ["'round", 'end-', "o'", '-dash', 'Beth-el’s']) {
      for (const t of tokenize(s)) {
        if (t.kind === 'word') expect(t.text).toMatch(/^[\p{L}\p{N}].*[\p{L}\p{N}]$|^[\p{L}\p{N}]$/u);
      }
    }
    expect(texts('Beth-el’s altar')).toEqual(['w:Beth-el’s', 'w:altar']);
  });
});
