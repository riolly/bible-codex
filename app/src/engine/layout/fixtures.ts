/**
 * Test-support corpus builders for the layout engine suites (#7). Not part of
 * the engine's public API. Shapes mirror app/src/model/corpus.ts exactly —
 * what the ingester (#6) writes.
 */

import type { Block, BlockRole, Genre, Token, TokenKind } from '../../model/corpus';
import type { MeasureToken } from './typeset';

/** Deterministic fake glyph metrics: every character advances 0.5em. */
export const fakeMetrics: MeasureToken = (text) => text.length * 0.5;

export class ChapterBuilder {
  private blocks: Block[] = [];
  private tokens: Token[] = [];
  private nextBlockId = 1;
  private nextTokenId = 1;
  private seq = 0;
  private wordIndexByVerse = new Map<number, number>();
  private seenVerses = new Set<number>();

  constructor(private readonly chapter: number = 1) {}

  /**
   * Append one Block; `text` is split on whitespace, tokens classified word vs
   * punct (standalone punctuation marks the ingester would emit as their own
   * Token — pass them space-separated, e.g. "and the earth .").
   */
  block(opts: {
    genre: Genre;
    role?: BlockRole | null;
    indent?: number;
    verse?: number | null;
    text: string;
  }): this {
    const blockId = this.nextBlockId++;
    const blockSeq = this.seq;
    const verse = opts.verse ?? null;
    for (const piece of opts.text.split(/\s+/).filter((p) => p.length > 0)) {
      const kind: TokenKind = /^[\p{L}\p{N}]/u.test(piece) ? 'word' : 'punct';
      const isWord = kind === 'word' && verse !== null;
      let wordIndex: number | null = null;
      let verseStart = false;
      if (isWord) {
        const next = this.wordIndexByVerse.get(verse) ?? 0;
        wordIndex = next;
        this.wordIndexByVerse.set(verse, next + 1);
        if (!this.seenVerses.has(verse)) {
          this.seenVerses.add(verse);
          verseStart = true;
        }
      }
      this.tokens.push({
        id: this.nextTokenId++,
        blockId,
        chapter: this.chapter,
        verse,
        wordIndex,
        seq: this.seq++,
        kind,
        text: piece,
        verseStart,
        owId: null,
      });
    }
    this.blocks.push({
      id: blockId,
      chapter: this.chapter,
      genre: opts.genre,
      role: opts.role ?? null,
      indent: opts.indent ?? 0,
      seq: blockSeq,
    });
    return this;
  }

  build(): { chapter: number; blocks: readonly Block[]; tokens: readonly Token[] } {
    return { chapter: this.chapter, blocks: this.blocks, tokens: this.tokens };
  }
}

/** A miniature mixed-genre chapter: section heading, prose verses, poetry couplet. */
export function miniChapter() {
  return new ChapterBuilder(1)
    .block({ genre: 'heading', role: 'section', text: 'The Creation' })
    .block({
      genre: 'prose',
      verse: 1,
      text: 'In the beginning God created the heaven and the earth .',
    })
    .block({
      genre: 'prose',
      verse: 2,
      text: 'And the earth was without form , and void .',
    })
    .block({ genre: 'poetry', indent: 1, verse: 3, text: 'And God said ,' })
    .block({ genre: 'poetry', indent: 2, verse: 3, text: 'Let there be light .' })
    .build();
}
