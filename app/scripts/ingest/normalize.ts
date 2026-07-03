/**
 * USJ → domain rows (the normalize step of ADR-0010).
 *
 * Flattens usfm-grammar's USJ into the corpus domain shape — a Token stream
 * with Block overlays — as `Token[]` / `Block[]` of the canonical model types
 * (src/model/corpus.ts), so the golden fixtures assert against exactly what
 * the app reads. Invariants enforced here (CONTEXT.md):
 *
 *  - Blocks PARTITION the token stream; whitespace is never a Token.
 *  - EVERY heading token (incl. mid-chapter \s) carries verse=NULL and
 *    wordIndex=NULL — a heading never INHERITS the preceding verse. An
 *    EXPLICIT \v inside a heading para is different: some translations set
 *    real verse text as a descriptive title (BSB Zech 12: \d containing
 *    \v 1), and those tokens carry their verse — the invariant bans
 *    inheritance, not versified titles (else the verse would vanish from the
 *    translation and be unanchorable).
 *  - `word_index` counts word tokens only (punct excluded) and CONTINUES
 *    across block boundaries within a verse (poetry lines, mid-verse \p).
 *
 * Unmapped structure FAILS LOUDLY: the block-role vocabulary is a registered
 * contract (schema.dbml), so an unknown para marker throws instead of
 * guessing. Content the Phase-1 schema deliberately does NOT model
 * (footnotes, xrefs, words-of-Jesus, Selah, Strong's) is dropped but COUNTED
 * in the stats bag — fixtures assert the counts so silent drops fail tests.
 *
 * Front matter before \c 1 (\mt book title, intro headings) lands in
 * chapter 0 — the reader fetches chapter 0 alongside chapter 1.
 */

import type { Block, BlockRole, Genre, Token } from '../../src/model/corpus';
import { tokenize } from './tokenize';

//---- minimal USJ structural types (usfm-grammar 3.x output) ----

export type UsjNode = string | UsjElement;

export interface UsjElement {
  readonly type: string;
  readonly marker?: string;
  readonly number?: string;
  readonly code?: string;
  readonly content?: UsjNode[];
  readonly strong?: string;
}

export interface UsjDoc {
  readonly type: 'USJ';
  readonly version: string;
  readonly content: UsjNode[];
}

//---- stats: everything Phase 1 does NOT model, counted so drops are loud ----

export interface IngestStats {
  footnotes: number; // \f..\f* (dropped)
  xrefs: number; // \x..\x* (dropped; feeds Phase-4 Cross-reference)
  wordsOfJesus: number; // \wj spans (text kept, styling not modelled)
  selah: number; // \qs spans (text kept, styling not modelled)
  strongAttrs: number; // strong="..." attrs seen (Phase-3 ow_id seam data)
  wWrapped: number; // \w-wrapped word occurrences (unwrapped)
  preVerseWordTokens: number; // word tokens with verse=NULL (headings/titles)
  sectionRefs: number; // \r parallel-reference lines (dropped)
  figures: number; // \fig (dropped)
  altVerseNumbers: number; // \va / \vp (dropped)
  verseBridges: number; // \v 17-18 bridged verses (first number used)
  droppedParas: Record<string, number>; // metadata para markers, text dropped
  droppedInline: Record<string, number>; // other inline elements dropped
}

export interface NormalizeResult {
  blocks: Block[];
  tokens: Token[];
  stats: IngestStats;
}

//---- registered para-marker → block-shape map (schema.dbml role vocabulary) ----

interface BlockShape {
  genre: Genre;
  role: BlockRole | null;
  indent: number;
}

/** Para markers whose text is metadata, not scripture — dropped wholesale. */
const METADATA_PARAS = new Set(['h', 'toc1', 'toc2', 'toc3', 'cl', 'rem', 'sts', 'ide', 'usfm']);

function paraShape(marker: string): BlockShape | null {
  // heading branch
  if (/^mt\d?$/.test(marker)) return { genre: 'heading', role: 'book_title', indent: 0 };
  if (/^ms\d?$/.test(marker)) return { genre: 'heading', role: 'major_section', indent: 0 };
  if (/^s\d?$/.test(marker)) return { genre: 'heading', role: 'section', indent: 0 };
  if (marker === 'd') return { genre: 'heading', role: 'psalm_title', indent: 0 };
  // \qd: how parse.ts re-encodes a VERSIFIED \d title (grammar gap, see parse.ts)
  if (marker === 'qd') return { genre: 'heading', role: 'psalm_title', indent: 0 };
  if (marker === 'qa') return { genre: 'heading', role: 'acrostic', indent: 0 };
  // poetry branch: indent = line depth (\q = \q1)
  const q = marker.match(/^q([1-4])?$/);
  if (q) return { genre: 'poetry', role: null, indent: q[1] ? parseInt(q[1], 10) : 1 };
  if (marker === 'qr') return { genre: 'poetry', role: 'refrain', indent: 1 };
  // prose branch
  if (marker === 'p') return { genre: 'prose', role: null, indent: 0 };
  if (marker === 'm') return { genre: 'prose', role: 'margin', indent: 0 };
  if (marker === 'nb') return { genre: 'prose', role: 'no_break', indent: 0 };
  if (/^pi\d?$/.test(marker)) return { genre: 'prose', role: 'indented', indent: 0 };
  if (/^li\d?$/.test(marker)) return { genre: 'prose', role: 'list_item', indent: 0 };
  if (marker === 'pmo') return { genre: 'prose', role: 'embedded_opening', indent: 0 };
  if (marker === 'pc') return { genre: 'prose', role: 'centered', indent: 0 };
  return null;
}

const newStats = (): IngestStats => ({
  footnotes: 0,
  xrefs: 0,
  wordsOfJesus: 0,
  selah: 0,
  strongAttrs: 0,
  wWrapped: 0,
  preVerseWordTokens: 0,
  sectionRefs: 0,
  figures: 0,
  altVerseNumbers: 0,
  verseBridges: 0,
  droppedParas: {},
  droppedInline: {},
});

/** Normalize one book's USJ into blocks + tokens + stats. */
export function normalizeUsj(usj: UsjDoc): NormalizeResult {
  const blocks: Block[] = [];
  const tokens: Token[] = [];
  const stats = newStats();

  let chapter = 0; // front matter before \c 1 = chapter 0
  let verse: number | null = null;
  let wordIndexInVerse = 0;
  let seqInChapter = 0;
  let pendingVerseStart = false;

  // the block a para WILL create if it emits a token (lazy: empty paras — e.g.
  // a para holding only a verse marker — must not break the partition with an
  // empty block)
  let pendingShape: BlockShape | null = null;
  let cur: Block | null = null;
  let inHeading = false;
  // verse carried by heading tokens: null unless an EXPLICIT \v occurred
  // inside the current heading para (a heading never inherits `verse`)
  let headingVerse: number | null = null;
  let buf = '';

  const ensureBlock = (): Block => {
    if (cur) return cur;
    // guard: text with no block marker → registered "implicit" prose block
    const shape = pendingShape ?? { genre: 'prose', role: 'implicit' as const, indent: 0 };
    cur = {
      id: blocks.length,
      chapter,
      genre: shape.genre,
      role: shape.role,
      indent: shape.indent,
      seq: seqInChapter,
    };
    blocks.push(cur);
    return cur;
  };

  const flushText = () => {
    if (!buf) return;
    const raw = tokenize(buf);
    buf = '';
    if (raw.length === 0) return;
    const blk = ensureBlock();
    // #1/#3: heading tokens carry only a verse EXPLICITLY set inside the
    // heading (never the inherited one); other tokens need a \v seen.
    const effectiveVerse = inHeading ? headingVerse : verse;
    const inVerse = effectiveVerse != null;
    for (const t of raw) {
      const isWord = t.kind === 'word';
      tokens.push({
        id: tokens.length,
        blockId: blk.id,
        chapter,
        verse: inVerse ? effectiveVerse : null,
        wordIndex: inVerse && isWord ? wordIndexInVerse++ : null,
        seq: seqInChapter++,
        kind: t.kind,
        text: t.text,
        verseStart: inVerse && isWord ? consumeVerseStart() : false,
        owId: null,
      });
      if (isWord && !inVerse) stats.preVerseWordTokens++;
    }
  };

  const consumeVerseStart = () => {
    const v = pendingVerseStart;
    pendingVerseStart = false;
    return v;
  };

  const dropInline = (marker: string) => {
    stats.droppedInline[marker] = (stats.droppedInline[marker] ?? 0) + 1;
  };

  /** Walk inline content, appending scripture surface text to the buffer. */
  const walkInline = (nodes: UsjNode[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') {
        buf += node;
        continue;
      }
      switch (node.type) {
        case 'verse': {
          flushText();
          const m = (node.number ?? '').match(/^(\d+)(-\d+)?/);
          if (!m) throw new Error(`unparseable verse number "${node.number}"`);
          if (m[2]) stats.verseBridges++;
          verse = parseInt(m[1], 10);
          if (inHeading) headingVerse = verse; // versified title (\d + \v)
          wordIndexInVerse = 0;
          pendingVerseStart = true;
          break;
        }
        case 'char': {
          const marker = node.marker ?? '';
          if (marker === 'va' || marker === 'vp') {
            stats.altVerseNumbers++;
            break; // alternate verse numbers are not surface text
          }
          if (marker === 'w' || marker === '+w') stats.wWrapped++;
          if (marker === 'wj' || marker === '+wj') stats.wordsOfJesus++;
          if (marker === 'qs' || marker === '+qs') stats.selah++;
          if (node.strong) stats.strongAttrs++;
          // keep the surface text of any other char style (\add \nd \it …)
          walkInline(node.content ?? []);
          break;
        }
        case 'note': {
          if (node.marker === 'f' || node.marker === 'fe') stats.footnotes++;
          else if (node.marker === 'x') stats.xrefs++;
          else dropInline(node.marker ?? node.type);
          break; // note content is never scripture surface text
        }
        case 'figure': {
          stats.figures++;
          break;
        }
        case 'ms': // milestones (\qt-s etc.) carry no surface text
          dropInline(node.marker ?? node.type);
          break;
        default:
          throw new Error(
            `unmapped inline USJ node type "${node.type}" (marker "${node.marker}") — extend normalizeUsj consciously`,
          );
      }
    }
  };

  for (const node of usj.content) {
    if (typeof node === 'string') {
      // stray top-level text — implicit-block guard
      buf += node;
      flushText();
      continue;
    }
    switch (node.type) {
      case 'book':
        break; // \id line — metadata
      case 'chapter': {
        const n = parseInt(node.number ?? '', 10);
        if (isNaN(n)) throw new Error(`unparseable chapter number "${node.number}"`);
        chapter = n;
        verse = null;
        wordIndexInVerse = 0;
        seqInChapter = 0;
        pendingVerseStart = false;
        cur = null;
        pendingShape = null;
        inHeading = false;
        break;
      }
      case 'para': {
        const marker = node.marker ?? '';
        cur = null;
        buf = '';
        if (marker === 'b') break; // stanza break — never a block
        if (marker === 'r' || marker === 'mr') {
          stats.sectionRefs++;
          break; // reference lines under \s / \ms — not modelled in Phase 1
        }
        if (METADATA_PARAS.has(marker)) {
          stats.droppedParas[marker] = (stats.droppedParas[marker] ?? 0) + 1;
          break;
        }
        const shape = paraShape(marker);
        if (!shape) {
          throw new Error(
            `unmapped USFM para marker "\\${marker}" — the block-role vocabulary is a ` +
              `registered contract (schema.dbml); extend paraShape consciously`,
          );
        }
        pendingShape = shape;
        inHeading = shape.genre === 'heading';
        headingVerse = null; // a heading starts unversed — no inheritance
        walkInline(node.content ?? []);
        flushText();
        cur = null;
        pendingShape = null;
        inHeading = false;
        break;
      }
      default:
        throw new Error(
          `unmapped top-level USJ node type "${node.type}" — extend normalizeUsj consciously`,
        );
    }
  }
  flushText();

  return { blocks, tokens, stats };
}
