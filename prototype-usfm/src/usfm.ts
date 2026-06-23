// PURE USFM → Phase-1 rows. No I/O, no DB, no console. This is the bit worth keeping:
// when the schema is validated, this lifts into the real ingester. The TUI/report
// around it (db.ts, main.ts) is throwaway.
//
// It parses one book's USFM string into plain row objects matching schema.dbml
// (block / token), plus a `stats` bag recording everything the Phase-1 schema does
// NOT represent (footnotes, cross-refs, words-of-Jesus, Selah, Strong's) — those
// counts are the pressure-test findings.

export type Genre = "prose" | "poetry" | "heading";
export type TokenKind = "word" | "punct";

export interface PBlock {
  localId: number;
  genre: Genre;
  role: string | null;
  indent: number;
  seq: number; // render order within chapter
  chapter: number;
}

export interface PToken {
  localId: number;
  blockLocalId: number;
  chapter: number;
  verse: number; // canonical; 0 = pre-verse content (titles/headings) — a FINDING
  wordIndex: number | null; // word ordinal within verse, punct excluded
  seq: number; // dense render order within chapter
  kind: TokenKind;
  text: string;
  verseStart: boolean;
}

export interface Stats {
  footnotes: number; // \f..\f*  (extracted, not a token)
  xrefs: number; // \x..\x*  (extracted; feeds Phase-4 Cross-reference)
  wordsOfJesus: number; // \wj..\wj* spans (NOT modelled in Phase-1)
  selah: number; // \qs..\qs* spans (NOT modelled in Phase-1)
  strongAttrs: number; // strong="..." available in source (Phase-3 ow_id seam data)
  wWrapped: number; // \w-wrapped word occurrences
  preVerseWordTokens: number; // word tokens with verse=0 (heading/title) — a FINDING
}

export interface ParseResult {
  blocks: PBlock[];
  tokens: PToken[];
  stats: Stats;
}

const STRUCTURE = /^\s*\\(c|v|q[1-4]|p|m|nb|pi|li|d|mt[1-3]?|ms[1-9]?|s[1-9]?|b|cl|h|toc[1-3]|id|ide|rem|sts|sp)\b ?/;

/** Strip inline footnotes / xrefs, unwrap \w word markup, drop char-style markers —
 *  returning plain text plus the counts of what was removed. */
function clean(seg: string, stats: Stats) {
  stats.footnotes += (seg.match(/\\f\b[\s\S]*?\\f\*/g) || []).length;
  seg = seg.replace(/\\f\b[\s\S]*?\\f\*/g, " ");
  stats.xrefs += (seg.match(/\\x\b[\s\S]*?\\x\*/g) || []).length;
  seg = seg.replace(/\\x\b[\s\S]*?\\x\*/g, " ");

  stats.wordsOfJesus += (seg.match(/\\wj\*/g) || []).length;
  stats.selah += (seg.match(/\\qs\*/g) || []).length;
  stats.strongAttrs += (seg.match(/strong="/g) || []).length;
  stats.wWrapped += (seg.match(/\\\+?w /g) || []).length;

  // unwrap \w SURFACE|attrs\w*  and nested \+w ...\+w*  → keep SURFACE only
  seg = seg.replace(/\\\+?w ([^\\|]+)(?:\|[^\\]*)?\\\+?w\*/g, "$1");
  // drop any leftover char-style markers (\wj \qs \+wh \w ...) and stray attrs
  seg = seg.replace(/\|[a-z]+="[^"]*"/g, "");
  seg = seg.replace(/\\\+?[a-z]+\d?\*?/g, " ");
  return seg.replace(/\s+/g, " ").trim();
}

const TOKENIZER = /([\p{L}\p{N}][\p{L}\p{N}'’’ְ-ׇ\-]*)|([^\s\p{L}\p{N}]+)/gu;

export function parseUsfm(usfm: string): ParseResult {
  const blocks: PBlock[] = [];
  const tokens: PToken[] = [];
  const stats: Stats = {
    footnotes: 0, xrefs: 0, wordsOfJesus: 0, selah: 0,
    strongAttrs: 0, wWrapped: 0, preVerseWordTokens: 0,
  };

  let chapter = 0, verse = 0;
  let seqInChapter = 0, wordIndexInVerse = 0;
  let blockLocal = 0, tokenLocal = 0;
  let cur: PBlock | null = null;
  let pendingVerseStart = false;

  const openBlock = (genre: Genre, role: string | null, indent: number) => {
    cur = { localId: blockLocal++, genre, role, indent, seq: seqInChapter, chapter };
    blocks.push(cur);
  };

  const emitText = (text: string) => {
    const clean$ = clean(text, stats);
    if (!clean$) return;
    if (!cur) openBlock("prose", "implicit", 0); // guard: text with no block marker
    for (const m of clean$.matchAll(TOKENIZER)) {
      const isWord = m[1] !== undefined;
      if (isWord) {
        const t: PToken = {
          localId: tokenLocal++, blockLocalId: cur!.localId, chapter, verse,
          wordIndex: wordIndexInVerse++, seq: seqInChapter++, kind: "word",
          text: m[1], verseStart: pendingVerseStart,
        };
        if (verse === 0) stats.preVerseWordTokens++;
        pendingVerseStart = false;
        tokens.push(t);
      } else {
        tokens.push({
          localId: tokenLocal++, blockLocalId: cur!.localId, chapter, verse,
          wordIndex: null, seq: seqInChapter++, kind: "punct",
          text: m[2], verseStart: false,
        });
      }
    }
  };

  for (let raw of usfm.split(/\r?\n/)) {
    let line = raw;
    // consume leading structure markers, then the remainder is text
    let guard = 0;
    while (guard++ < 8) {
      const m = line.match(STRUCTURE);
      if (!m) break;
      const tag = m[1];
      line = line.slice(m[0].length);

      if (tag === "c") {
        const n = parseInt(line, 10); line = "";
        chapter = isNaN(n) ? chapter + 1 : n;
        verse = 0; seqInChapter = 0; wordIndexInVerse = 0; cur = null;
      } else if (tag === "v") {
        const vm = line.match(/^(\d+)[ab]? ?/);
        if (vm) { verse = parseInt(vm[1], 10); line = line.slice(vm[0].length); }
        wordIndexInVerse = 0; pendingVerseStart = true;
      } else if (/^q[1-4]$/.test(tag)) {
        openBlock("poetry", null, parseInt(tag[1], 10));
      } else if (tag === "p" || tag === "m" || tag === "nb" || tag === "pi" || tag === "li") {
        openBlock("prose", tag === "p" ? null : tag, 0);
      } else if (tag === "d") {
        openBlock("heading", "psalm_title", 0);
      } else if (/^mt/.test(tag)) {
        openBlock("heading", "book_title", 0);
      } else if (/^ms/.test(tag)) {
        openBlock("heading", "major_section", 0);
      } else if (/^s/.test(tag)) {
        openBlock("heading", "section", 0);
      } else if (tag === "b") {
        cur = null; // stanza break → next marker opens a fresh block
      } else {
        line = ""; // metadata line (id/h/toc/cl/rem…) — skip entirely
      }
    }
    if (line.trim()) emitText(line);
  }

  return { blocks, tokens, stats };
}
