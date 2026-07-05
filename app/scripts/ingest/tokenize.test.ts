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

  it('combining marks bind to their base word, never split off as punct (ADR-0014 v1.1)', () => {
    // Greek polytonic (NFC-composed by ingest before this runs) — precomposed,
    // one word regardless.
    expect(texts('ἐν ἀρχῇ ἦν'.normalize('NFC'))).toEqual(['w:ἐν', 'w:ἀρχῇ', 'w:ἦν']);
    // A raw base + combining mark (tokenize itself does NOT normalize) stays
    // ONE word — proves the mark binds rather than splitting into punct.
    const raw = 'a\u0300b'; // a + combining grave + b
    expect(tokenize(raw)).toEqual([{ kind: 'word', text: raw }]);
    // Hebrew vowel points (category M, no canonical composition) — the whole
    // pointed word is ONE token, points intact.
    const heb = 'בְּרֵאשִׁית'.normalize('NFC');
    expect(tokenize(heb)).toEqual([{ kind: 'word', text: heb }]);
    expect(texts(`${heb} בָּרָא`.normalize('NFC'))).toEqual([`w:${heb}`, 'w:בָּרָא'.normalize('NFC')]);
  });

  it('an ORPHAN combining mark (no base before it) falls to punct, never vanishes', () => {
    // A mark with no preceding base matches neither the word branch (needs an
    // alphanumeric start) nor a space — it must land as punct so the token
    // stream still COVERS every non-space character (no silent, uncounted drop).
    expect(tokenize('́abc')).toEqual([
      { kind: 'punct', text: '́' }, // leading mark
      { kind: 'word', text: 'abc' },
    ]);
    expect(tokenize('.́x')).toEqual([
      { kind: 'punct', text: '.́' }, // mark after punct joins the punct run
      { kind: 'word', text: 'x' },
    ]);
    expect(tokenize('ְְ')).toEqual([{ kind: 'punct', text: 'ְְ' }]); // lone marks
    // coverage: concatenated token text == input minus whitespace
    for (const s of ['́abc', '.́x', 'word ְhere', 'àb']) {
      const covered = tokenize(s)
        .map((t) => t.text)
        .join('');
      expect(covered).toBe(s.replace(/\s+/g, ''));
    }
  });
});
