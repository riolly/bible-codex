// Authoring helpers — let me hand-type a chapter as readable verse strings and
// get back the fully-tokenised Block/Token/Anchor model. Hand-prep only; no
// scraper, no DB (per handoff). Keeps the data files legible.
import type { Block, Chapter, Genre, OriginalWord, Token } from "./types";

interface VerseMark {
  __verse: number;
}
export const v = (n: number): VerseMark => ({ __verse: n });

type Part = VerseMark | string;
function isMark(p: Part): p is VerseMark {
  return typeof p === "object" && "__verse" in p;
}

export interface BlockSpec {
  genre: Genre;
  indent?: number;
  parts: Part[];
}

export const prose = (...parts: Part[]): BlockSpec => ({ genre: "prose", parts });
export const poetry = (indent: number, ...parts: Part[]): BlockSpec => ({
  genre: "poetry",
  indent,
  parts,
});
export const heading = (text: string): BlockSpec => ({ genre: "heading", indent: 0, parts: [text] });

/** Attach an Original Word to the `occurrence`-th instance of `word` in `verse`. */
export interface LinkSpec {
  verse: number;
  word: string;
  occurrence?: number; // 1-based; default 1
  ow: string; // Original Word id
}

// Split text into word / space / punctuation tokens, keeping everything so the
// renderer can reproduce spacing faithfully.
const TOKEN_RE = /([A-Za-zÀ-ɏ'’]+(?:-[A-Za-zÀ-ɏ'’]+)*)|(\s+)|([^\sA-Za-zÀ-ɏ]+)/g;

export function buildChapter(opts: {
  book: string;
  chapter: number;
  translation: string;
  blocks: BlockSpec[];
  links?: LinkSpec[];
}): Chapter {
  const { book, chapter, translation } = opts;
  const blocks: Block[] = [];
  // word counter per verse, so anchors are stable canonical coordinates
  const wordCountByVerse = new Map<number, number>();

  let currentVerse = 0;

  for (const spec of opts.blocks) {
    const tokens: Token[] = [];
    let blockStartsVerse: number | undefined;
    let pendingVerseStart = false;

    for (const part of spec.parts) {
      if (isMark(part)) {
        currentVerse = part.__verse;
        if (!wordCountByVerse.has(currentVerse)) wordCountByVerse.set(currentVerse, 0);
        if (blockStartsVerse === undefined) blockStartsVerse = currentVerse;
        pendingVerseStart = true;
        continue;
      }
      // Verses are authored as separate strings; insert the space that would
      // otherwise be lost at the join (".The" → ". The").
      if (tokens.length && tokens[tokens.length - 1].kind !== "space") {
        tokens.push({ text: " ", kind: "space", anchor: anc(book, chapter, currentVerse, idx()) });
      }
      let m: RegExpExecArray | null;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(part))) {
        const [, word, space, punct] = m;
        if (space !== undefined) {
          tokens.push({ text: space, kind: "space", anchor: anc(book, chapter, currentVerse, idx()) });
        } else if (punct !== undefined) {
          tokens.push({ text: punct, kind: "punct", anchor: anc(book, chapter, currentVerse, idx()) });
        } else {
          const wi = bump(currentVerse);
          tokens.push({
            text: word,
            kind: "word",
            anchor: anc(book, chapter, currentVerse, wi),
            verseStart: pendingVerseStart || undefined,
          });
          pendingVerseStart = false;
        }
      }
    }
    blocks.push({ genre: spec.genre, indent: spec.indent ?? 0, tokens, startsVerse: blockStartsVerse });
  }

  function idx() {
    return wordCountByVerse.get(currentVerse) ?? 0;
  }
  function bump(verse: number) {
    const n = wordCountByVerse.get(verse) ?? 0;
    wordCountByVerse.set(verse, n + 1);
    return n;
  }

  const ch: Chapter = { book, chapter, translation, blocks };
  if (opts.links) applyLinks(ch, opts.links);
  return ch;
}

function anc(book: string, chapter: number, verse: number, word: number) {
  return { book, chapter, verse, word };
}

function applyLinks(ch: Chapter, links: LinkSpec[]) {
  for (const l of links) {
    const want = (l.occurrence ?? 1) - 1;
    let seen = 0;
    let hit = false;
    for (const b of ch.blocks) {
      for (const t of b.tokens) {
        if (t.kind !== "word" || t.anchor.verse !== l.verse) continue;
        if (t.text.toLowerCase() === l.word.toLowerCase()) {
          if (seen === want) {
            t.ow = l.ow;
            hit = true;
            break;
          }
          seen++;
        }
      }
      if (hit) break;
    }
    if (!hit) {
      // Loud in dev so a typo in hand-prep doesn't silently drop a reveal.
      console.warn(
        `[build] link not found: ${ch.book} ${ch.chapter}:${l.verse} "${l.word}" #${l.occurrence ?? 1}`,
      );
    }
  }
}

/** Registry of Original Words shared across the corpus (the hub). */
export type OwRegistry = Record<string, OriginalWord>;
