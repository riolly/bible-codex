import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Block, Token } from '../../src/model/corpus';
import { normalizeUsj, type UsjDoc } from './normalize';

/**
 * GOLDEN FIXTURE (ADR-0010/ADR-0014): committed USJ in → expected Token
 * stream + Block overlays. The USJ is generated from fixtures/adversarial.usfm
 * by usfm-grammar and committed so this test stays pure TS (CI installs with
 * ignore-scripts and has no native tree-sitter); parse.test.ts guards
 * USFM→USJ drift where the native parser is available.
 */
const usj = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'adversarial.usj.json'), 'utf8'),
) as UsjDoc;

const { blocks, tokens, stats } = normalizeUsj(usj);

const blockTokens = (b: Block) => tokens.filter((t) => t.blockId === b.id);
const verseTokens = (chapter: number, verse: number) =>
  tokens.filter((t) => t.chapter === chapter && t.verse === verse);
const brief = (t: Token) => `${t.kind === 'word' ? t.wordIndex : 'p'}:${t.text}`;

describe('corpus invariants (CONTEXT.md)', () => {
  it('blocks PARTITION the token stream — every token in exactly one existing block, no empty blocks', () => {
    const ids = new Set(blocks.map((b) => b.id));
    const used = new Set<number>();
    for (const t of tokens) {
      expect(ids.has(t.blockId)).toBe(true);
      used.add(t.blockId);
    }
    expect(used.size).toBe(blocks.length);
    // tokens of a block are contiguous in render order
    for (const b of blocks) {
      const seqs = blockTokens(b).map((t) => t.seq);
      expect(seqs).toEqual(
        Array.from({ length: seqs.length }, (_, i) => seqs[0] + i),
      );
    }
  });

  it('whitespace is never a token', () => {
    for (const t of tokens) {
      expect(t.text).not.toMatch(/\s/);
      expect(t.text.length).toBeGreaterThan(0);
    }
  });

  it('EVERY heading token carries verse=NULL (never 0) and wordIndex=NULL', () => {
    const headingBlocks = blocks.filter((b) => b.genre === 'heading');
    expect(headingBlocks.length).toBe(5); // mt1, s1 ×2, d, qa
    for (const b of headingBlocks) {
      const ts = blockTokens(b);
      expect(ts.length).toBeGreaterThan(0);
      for (const t of ts) {
        expect(t.verse).toBeNull();
        expect(t.wordIndex).toBeNull();
        expect(t.verseStart).toBe(false);
      }
    }
    for (const t of tokens) expect(t.verse).not.toBe(0);
  });

  it('a MID-CHAPTER section heading does not inherit the preceding verse', () => {
    // ch1: \s1 between v3 and v4
    const mid = blocks.find(
      (b) => b.chapter === 1 && b.genre === 'heading' && blockTokens(b)[0]?.text === 'A',
    )!;
    expect(blockTokens(mid).map((t) => t.text)).toEqual(['A', 'Mid-Chapter', 'Heading']);
    expect(blockTokens(mid).every((t) => t.verse === null)).toBe(true);
    // ch2: \qa ALEPH sits between verse-2 and verse-2 content
    const qa = blocks.find((b) => b.role === 'acrostic')!;
    expect(blockTokens(qa).map(brief)).toEqual(['null:ALEPH']);
  });

  it('word_index counts words only and CONTINUES across block boundaries within a verse', () => {
    // v1:3 spans a paragraph break
    expect(verseTokens(1, 3).map(brief)).toEqual([
      '0:A', '1:verse', '2:that', '3:spans', '4:a', '5:paragraph', '6:break', 'p:,',
      '7:continuing', '8:in', '9:the', '10:next', '11:paragraph', 'p:.',
    ]);
    // v2:1 spans \q1 → \q2 poetry lines
    expect(verseTokens(2, 1).map(brief)).toEqual([
      '0:The', '1:first', '2:poetry', '3:line', '4:goes', '5:here', 'p:,',
      '6:the', '7:second', '8:sits', '9:deeper', '10:still', 'p:;',
    ]);
  });
});

describe('adversarial tokenization inside the pipeline (ADR-0014)', () => {
  it('possessive, elided, hyphenated and quoted words in a real verse', () => {
    expect(verseTokens(1, 1).map(brief)).toEqual([
      '0:In', '1:the', '2:beginning', '3:was', '4:the', '5:LORD’s', '6:Word', 'p:,',
      '7:and', '8:Jesus', 'p:’', '9:father-in-law', '10:said', 'p:,', 'p:“',
      '11:Behold', 'p:!”',
    ]);
  });

  it('elision + numbers + em-dash; verse_start lands on the first WORD, not a leading punct', () => {
    expect(verseTokens(1, 2).map(brief)).toEqual([
      'p:’', '0:Twas', '1:the', '2:40th', '3:year', 'p:,', '4:and', '5:144,000',
      '6:stood', '7:by', '8:the', '9:riverside', 'p:—', '10:watching', 'p:.',
    ]);
    const twas = verseTokens(1, 2).find((t) => t.text === 'Twas')!;
    expect(twas.verseStart).toBe(true);
    const apostrophe = verseTokens(1, 2)[0];
    expect(apostrophe.kind).toBe('punct');
    expect(apostrophe.verseStart).toBe(false);
    // v4 similarly: “Quoted start” — verseStart on the word after the quote
    const v4 = verseTokens(1, 4);
    expect(v4.map(brief)).toEqual(['p:“', '0:Quoted', '1:start', 'p:”', '2:with', '3:punctuation', 'p:.']);
    expect(v4.find((t) => t.text === 'Quoted')!.verseStart).toBe(true);
  });

  it('a verse BRIDGE (\\v 5-6) collapses to its first number — the bridge end mints no coordinate (ADR-0014)', () => {
    expect(verseTokens(1, 5).map(brief)).toEqual([
      '0:A', '1:bridged', '2:verse', '3:collapses', '4:to', '5:its', '6:first', '7:number', 'p:.',
    ]);
    expect(verseTokens(1, 5)[0].verseStart).toBe(true);
    expect(verseTokens(1, 6)).toEqual([]); // verse 6 is unanchorable by design
  });

  it('a word split across a \\w char boundary is joined before tokenizing', () => {
    // \w LORD\w*’s → LORD’s, one word, verse-start of 2:2
    const v = verseTokens(2, 2);
    expect(v.slice(0, 4).map(brief)).toEqual(['0:LORD’s', '1:wrapped', '2:word', '3:awaits']);
    expect(v[0].verseStart).toBe(true);
  });

  it('dropped footnote/xref content never leaks tokens; kept char text (\\qs, \\wj) does', () => {
    expect(verseTokens(2, 2).map((t) => t.text)).toEqual([
      'LORD’s', 'wrapped', 'word', 'awaits', 'the', 'end', 'now', 'Selah',
      // \qr refrain continues verse 2:
      'And', 'all', 'the', 'people', 'say', ',', '“', 'Amen', '!”',
      // \pc, \pmo, \li1, \m, \pi, \nb prose still verse 2:
      'HOLY', 'TO', 'THE', 'LORD', '.',
      'And', 'there', 'was', 'evening', '—', 'day', 'one', '.',
      'the', 'first', 'list', 'item',
      'A', 'margin', 'paragraph', '.',
      'An', 'indented', 'paragraph', '.',
      'A', 'no-break', 'paragraph', '.',
    ]);
    expect(verseTokens(2, 3).map(brief)).toEqual([
      '0:Words', '1:of', '2:Jesus', '3:here', '4:remain', 'p:.',
    ]);
  });
});

describe('block overlays: genre, registered role vocabulary, indent', () => {
  it('emits the expected block sequence', () => {
    expect(blocks.map((b) => [b.chapter, b.genre, b.role, b.indent])).toEqual([
      [0, 'heading', 'book_title', 0], // \mt1 → front-matter chapter 0
      [1, 'heading', 'section', 0], // \s1
      [1, 'prose', null, 0], // \p (v1–v2)
      [1, 'prose', null, 0], // \p (v3 start)
      [1, 'prose', null, 0], // \p (v3 continuation)
      [1, 'heading', 'section', 0], // mid-chapter \s1
      [1, 'prose', null, 0], // \p (v4)
      [1, 'prose', null, 0], // \p (v5-6 bridge)
      [2, 'heading', 'psalm_title', 0], // \d
      [2, 'poetry', null, 1], // \q1
      [2, 'poetry', null, 2], // \q2
      [2, 'poetry', null, 1], // \q1 (after \b — no block for \b)
      [2, 'poetry', 'refrain', 1], // \qr
      [2, 'heading', 'acrostic', 0], // \qa
      [2, 'prose', 'centered', 0], // \pc
      [2, 'prose', 'embedded_opening', 0], // \pmo
      [2, 'prose', 'list_item', 0], // \li1
      [2, 'prose', 'margin', 0], // \m
      [2, 'prose', 'indented', 0], // \pi
      [2, 'prose', 'no_break', 0], // \nb
    ]);
  });

  it('block.seq equals the seq of its first token; seq is per-chapter and dense', () => {
    for (const b of blocks) expect(b.seq).toBe(blockTokens(b)[0].seq);
    for (const chapter of [0, 1, 2]) {
      const seqs = tokens.filter((t) => t.chapter === chapter).map((t) => t.seq);
      expect(seqs).toEqual(Array.from({ length: seqs.length }, (_, i) => i));
    }
  });

  it('heading ordinals per chapter are deterministic (the deferred heading-anchor key)', () => {
    const ordinals = new Map<number, string[]>();
    for (const b of blocks) {
      if (b.genre !== 'heading') continue;
      const list = ordinals.get(b.chapter) ?? [];
      list.push(blockTokens(b).map((t) => t.text).join(' '));
      ordinals.set(b.chapter, list);
    }
    expect(ordinals.get(0)).toEqual(['The Adversarial Fixture']);
    expect(ordinals.get(1)).toEqual(['The Word’s Beginning', 'A Mid-Chapter Heading']);
    expect(ordinals.get(2)).toEqual(['A Psalm of the fixture .', 'ALEPH']);
  });
});

describe('stats bag — what Phase 1 deliberately does NOT model fails loudly, not silently', () => {
  it('counts dropped/unwrapped content exactly', () => {
    expect(stats).toEqual({
      footnotes: 1,
      xrefs: 1,
      wordsOfJesus: 1,
      selah: 1,
      strongAttrs: 0,
      wWrapped: 1,
      preVerseWordTokens: 15, // mt1(3) + s1(3) + s1(3) + d(5) + qa(1)
      sectionRefs: 1, // \r
      figures: 0,
      altVerseNumbers: 0,
      verseBridges: 1, // \v 5-6
      droppedParas: { h: 1, toc1: 1 },
      droppedInline: {},
    });
  });
});

describe('normalize guards', () => {
  const doc = (content: UsjDoc['content']): UsjDoc => ({ type: 'USJ', version: '3.1', content });

  it('throws LOUDLY on an unmapped para marker (registered vocabulary)', () => {
    expect(() =>
      normalizeUsj(doc([{ type: 'para', marker: 'cd', content: ['zap'] }])),
    ).toThrow(/unmapped USFM para marker "\\cd"/);
  });

  it('throws on unmapped top-level and inline node types', () => {
    expect(() => normalizeUsj(doc([{ type: 'table' }]))).toThrow(/unmapped top-level/);
    expect(() =>
      normalizeUsj(doc([{ type: 'para', marker: 'p', content: [{ type: 'sidebar' }] }])),
    ).toThrow(/unmapped inline/);
  });

  it('guards stray top-level text with the registered "implicit" block role', () => {
    const r = normalizeUsj(doc(['loose text']));
    expect(r.blocks).toEqual([
      { id: 0, chapter: 0, genre: 'prose', role: 'implicit', indent: 0, seq: 0 },
    ]);
  });

  it('a VERSIFIED title (\\d containing an explicit \\v — BSB Zech 12) keeps its verse', () => {
    const r = normalizeUsj(
      doc([
        { type: 'chapter', marker: 'c', number: '12' },
        { type: 'para', marker: 's1', content: ['The Coming Deliverance'] },
        {
          type: 'para',
          marker: 'd',
          content: [
            { type: 'verse', marker: 'v', number: '1' },
            'This is the burden of the word.',
          ],
        },
        { type: 'para', marker: 'p', content: ['Thus declares the LORD.'] },
      ]),
    );
    // the \s1 heading stays unversed…
    const s1 = r.tokens.filter((t) => t.blockId === 0);
    expect(s1.every((t) => t.verse === null && t.wordIndex === null)).toBe(true);
    // …but the \d tokens carry the EXPLICIT verse 1 with word indexes
    const d = r.tokens.filter((t) => t.blockId === 1);
    expect(d.map((t) => [t.text, t.verse, t.wordIndex])).toEqual([
      ['This', 1, 0], ['is', 1, 1], ['the', 1, 2], ['burden', 1, 3], ['of', 1, 4],
      ['the', 1, 5], ['word', 1, 6], ['.', 1, null],
    ]);
    expect(d[0].verseStart).toBe(true);
    // the verse CONTINUES into the following prose (word indexes go on)
    const p = r.tokens.filter((t) => t.blockId === 2);
    expect(p.map((t) => [t.text, t.verse, t.wordIndex])).toEqual([
      ['Thus', 1, 7], ['declares', 1, 8], ['the', 1, 9], ['LORD', 1, 10], ['.', 1, null],
    ]);
  });

  it('counts bridged verses and uses the first number', () => {
    const r = normalizeUsj(
      doc([
        { type: 'chapter', marker: 'c', number: '1' },
        {
          type: 'para',
          marker: 'p',
          content: [{ type: 'verse', marker: 'v', number: '17-18' }, 'bridged'],
        },
      ]),
    );
    expect(r.stats.verseBridges).toBe(1);
    expect(r.tokens[0].verse).toBe(17);
  });
});
