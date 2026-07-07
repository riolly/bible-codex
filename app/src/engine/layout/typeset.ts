/**
 * The typesetting core (#7): corpus blocks + tokens + resolved rules →
 * laid-out blocks. Shared by both reading surfaces — Codex pages stack the
 * result vertically; Scroll mode reflows the same lines into columns.
 *
 * Framework-agnostic and pixel-free (ADR-0008 / ADR-0004): glyph widths come
 * in through an injected MeasureToken, in em; all output geometry is em.
 */

import type { Block, Token } from '../../model/corpus';
import type {
  Line,
  LayoutBlock,
  LineItem,
  SectionBreakStyle,
  TokenRun,
  VersalItem,
  VersalStyle,
  VerseNumberStyle,
} from './model';
import type { ResolvedRules } from './rules';

/**
 * Injected glyph metrics: advance width of `text` in EM at 1em font size.
 * The draw layer supplies a Skia-backed implementation; tests supply a
 * deterministic fake. This is the seam that keeps Skia out of the engine.
 */
export type MeasureToken = (text: string) => number;

export interface TypesetInput {
  readonly blocks: readonly Block[];
  readonly tokens: readonly Token[];
  readonly rules: ResolvedRules;
  readonly metrics: MeasureToken;
  readonly verseNumberStyle?: VerseNumberStyle | null;
  readonly versal?: { readonly tokenSeq: number; readonly style: VersalStyle } | null;
  readonly sectionBreakStyle?: SectionBreakStyle | null;
}

export interface TypesetResult {
  readonly blocks: readonly LayoutBlock[];
  /** Total typeset height in em (text-region space). */
  readonly height: number;
}

/** Superscript verse numbers render smaller than body text — the engine
 * reserves the slot at this scale and the draw layer (#8) must paint at the
 * same one, so it is exported as the single source of truth. */
export const VERSE_NUM_SCALE = 0.65;
/** … and carry a hair of padding before the word they introduce. */
const VERSE_NUM_PAD = 0.15;
const DROP_VERSAL_GUTTER_EM = 0.35;

export const DEFAULT_VERSE_NUMBER_STYLE: VerseNumberStyle = {
  scale: VERSE_NUM_SCALE,
  raiseEm: 0.33,
  tone: 'gilt',
};

/** A LineItem before x-placement (distributive omit — LineItem is a union). */
type UnplacedItem = LineItem extends infer I ? (I extends LineItem ? Omit<I, 'x'> : never) : never;

/** An unbreakable chunk: verse-num? + word + trailing punctuation. */
interface Chunk {
  readonly items: readonly UnplacedItem[];
  readonly width: number;
}

export function typesetBlocks(input: TypesetInput): TypesetResult {
  const { blocks, tokens, rules, metrics } = input;
  const verseNumberStyle =
    input.verseNumberStyle === undefined ? DEFAULT_VERSE_NUMBER_STYLE : input.verseNumberStyle;
  const tokensByBlock = new Map<number, Token[]>();
  for (const token of tokens) {
    const list = tokensByBlock.get(token.blockId);
    if (list) list.push(token);
    else tokensByBlock.set(token.blockId, [token]);
  }

  const spaceWidth = metrics(' ');
  const laidOut: LayoutBlock[] = [];
  let cursor = 0;

  for (const block of [...blocks].sort((a, b) => a.seq - b.seq)) {
    const blockTokens = (tokensByBlock.get(block.id) ?? []).sort((a, b) => a.seq - b.seq);
    const indentEm = block.indent * rules.indentStep;
    const available = rules.measure - indentEm;
    if (available <= 0) {
      throw new Error(
        `indent ${block.indent} × step ${rules.indentStep} leaves no measure (block ${block.id})`,
      );
    }

    const sectionBreakStyle =
      block.role === 'section_break' ? (input.sectionBreakStyle ?? null) : null;
    const lines: Line[] = sectionBreakStyle
      ? [
          {
            y: cursor,
            indent: indentEm,
            runs: [
              {
                direction: 'ltr',
                items: [
                  {
                    kind: 'section-break',
                    x:
                      indentEm +
                      Math.max(0, available - metrics(sectionBreakStyle.glyph) * sectionBreakStyle.scale) /
                        2,
                    width: metrics(sectionBreakStyle.glyph) * sectionBreakStyle.scale,
                    style: sectionBreakStyle,
                  },
                ],
              },
            ],
          },
        ]
      : (() => {
          const chunks = buildChunks(blockTokens, metrics, verseNumberStyle, input.versal ?? null);
          const firstVersal = chunks
            .flatMap((chunk) => chunk.items)
            .find((item): item is Omit<VersalItem, 'x'> => item.kind === 'versal');
          const dropInset =
            firstVersal?.style.kind === 'drop'
              ? firstVersal.width + DROP_VERSAL_GUTTER_EM
              : 0;
          const chunkLines = breakChunks(chunks, available, spaceWidth, (lineIndex) =>
            lineIndex < (firstVersal?.style.kind === 'drop' ? firstVersal.style.lines : 0)
              ? dropInset
              : 0,
          );
          return chunkLines.map((lineChunks, i) => {
            const inset =
              i < (firstVersal?.style.kind === 'drop' ? firstVersal.style.lines : 0)
                ? dropInset
                : 0;
            return {
              y: cursor + i * rules.lineHeight,
              indent: indentEm + inset,
              runs: splitRuns(placeChunks(lineChunks, indentEm + inset, spaceWidth)),
            };
          });
        })();

    const height = lines.length * rules.lineHeight;
    laidOut.push({
      blockId: block.id,
      genre: block.genre,
      role: block.role,
      indent: block.indent,
      y: cursor,
      height,
      lines,
    });
    cursor += height + rules.paragraphSpacing;
  }

  return {
    blocks: laidOut,
    height: laidOut.length > 0 ? cursor - rules.paragraphSpacing : 0,
  };
}

/**
 * Opening punctuation — quotes/brackets that OPEN a span. Unlike trailing
 * punctuation (comma, period, closing quote) these bind FORWARD: they glue to
 * the word they introduce (space before them, none after), never to the word
 * that precedes them. Classified by the first code point; the corpus uses
 * unambiguous curly quotes, so straight ' / " (possessive vs elision, which are
 * context-dependent) are deliberately excluded and stay backward-binding.
 */
const OPENING_PUNCT = /^[“‘([{«‹¿¡]/u;

const isOpeningPunct = (token: Token): boolean =>
  token.kind === 'punct' && OPENING_PUNCT.test(token.text);

/**
 * Group tokens into unbreakable chunks. Whitespace is not a Token
 * (CONTEXT.md) — inter-chunk space is synthesized here. Trailing punctuation
 * glues to the preceding word (never starts a line); opening punctuation glues
 * to the FOLLOWING word (so `said, “Let` spaces after the comma, not after the
 * quote); a verse-start word is prefixed by its verse-number ornament slot.
 */
function buildChunks(
  tokens: readonly Token[],
  metrics: MeasureToken,
  verseNumberStyle: VerseNumberStyle | null,
  versal: { readonly tokenSeq: number; readonly style: VersalStyle } | null,
): Chunk[] {
  const chunks: { items: UnplacedItem[]; width: number }[] = [];
  // Opening punct waits here for the word it introduces, to lead that chunk.
  let leading: UnplacedItem[] = [];

  const toTokenItem = (token: Token, text = token.text): UnplacedItem => ({
    kind: 'token' as const,
    seq: token.seq,
    text,
    tokenKind: token.kind,
    verse: token.verse,
    width: metrics(text),
  });

  for (const token of tokens) {
    if (isOpeningPunct(token)) {
      leading.push(toTokenItem(token));
      continue;
    }
    const activeVersal = versal && token.seq === versal.tokenSeq && token.kind === 'word' ? versal : null;
    const versalParts = activeVersal ? splitFirstCodePoint(token.text) : null;
    const item = toTokenItem(token, versalParts?.rest ?? token.text);
    const startsChunk = token.kind === 'word' || (chunks.length === 0 && leading.length === 0);
    if (startsChunk) {
      const items: UnplacedItem[] = [];
      if (token.verseStart && token.verse !== null && verseNumberStyle) {
        items.push({
          kind: 'verse-num' as const,
          verse: token.verse,
          width: metrics(String(token.verse)) * verseNumberStyle.scale + VERSE_NUM_PAD,
          style: verseNumberStyle,
        });
      }
      items.push(...leading, item);
      if (versalParts && activeVersal) {
        const versalWidth = metrics(versalParts.first) * activeVersal.style.lines;
        items.splice(items.length - 1, 0, {
          kind: 'versal' as const,
          tokenSeq: token.seq,
          text: versalParts.first,
          width: versalWidth,
          style: activeVersal.style,
        });
      }
      leading = [];
      chunks.push({ items, width: items.reduce((w, i) => w + flowWidth(i), 0) });
    } else {
      // Trailing punct binds backward; flush any stranded opening punct with it.
      const chunk = chunks[chunks.length - 1];
      chunk.items.push(...leading, item);
      chunk.width += leading.reduce((w, i) => w + flowWidth(i), flowWidth(item));
      leading = [];
    }
  }
  // Opening punct with no word after it (block ends on a quote) — attach
  // backward so it never vanishes; a punct-only block becomes its own chunk.
  if (leading.length > 0) {
    const chunk = chunks[chunks.length - 1];
    if (chunk) {
      chunk.items.push(...leading);
      chunk.width += leading.reduce((w, i) => w + flowWidth(i), 0);
    } else {
      chunks.push({ items: leading, width: leading.reduce((w, i) => w + flowWidth(i), 0) });
    }
  }

  return chunks;
}

function flowWidth(item: UnplacedItem): number {
  return item.kind === 'versal' && item.style.kind === 'drop' ? 0 : item.width;
}

function splitFirstCodePoint(text: string): { readonly first: string; readonly rest: string } | null {
  const [first, ...rest] = Array.from(text);
  return first ? { first, rest: rest.join('') } : null;
}

/** Greedy line-breaker over chunks; an over-measure chunk takes its own line. */
function breakChunks(
  chunks: readonly Chunk[],
  available: number,
  spaceWidth: number,
  lineInset: (lineIndex: number) => number = () => 0,
): Chunk[][] {
  const lines: Chunk[][] = [];
  let line: Chunk[] = [];
  let width = 0;

  for (const chunk of chunks) {
    const lineAvailable = available - lineInset(lines.length);
    if (line.length === 0) {
      line = [chunk];
      width = chunk.width;
    } else if (width + spaceWidth + chunk.width <= lineAvailable) {
      line.push(chunk);
      width += spaceWidth + chunk.width;
    } else {
      lines.push(line);
      line = [chunk];
      width = chunk.width;
    }
  }
  if (line.length > 0) lines.push(line);

  return lines;
}

/** Assign x positions (em from text-region left) in logical order. */
function placeChunks(chunks: readonly Chunk[], indentEm: number, spaceWidth: number): LineItem[] {
  const items: LineItem[] = [];
  let x = indentEm;
  for (const [i, chunk] of chunks.entries()) {
    if (i > 0) x += spaceWidth;
    for (const item of chunk.items) {
      if (item.kind === 'versal' && item.style.kind === 'drop') {
        items.push({ ...item, x: x - item.width - DROP_VERSAL_GUTTER_EM });
        continue;
      }
      items.push({ ...item, x });
      x += item.width;
    }
  }
  return items;
}

/** Hebrew script (incl. presentation forms) — the rtl scripts the corpus carries. */
const RTL_CHAR = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

/**
 * Direction of one item: word tokens by script. Punctuation and verse-num
 * ornaments are neutral — but they bind to OPPOSITE sides: punctuation glues
 * backward to the word it follows, a verse-num glues forward to the word it
 * introduces (buildChunks prefixes it to that word's chunk).
 */
function itemDirection(item: LineItem): 'ltr' | 'rtl' | null {
  if (item.kind === 'section-break') return 'ltr';
  if (item.kind === 'versal') return RTL_CHAR.test(item.text) ? 'rtl' : 'ltr';
  if (item.kind !== 'token' || item.tokenKind !== 'word') return null;
  return RTL_CHAR.test(item.text) ? 'rtl' : 'ltr';
}

/** A placed opening-punct item — binds FORWARD like a verse-num (see buildChunks). */
const isOpeningItem = (item: LineItem): boolean =>
  item.kind === 'token' && item.tokenKind === 'punct' && OPENING_PUNCT.test(item.text);

/**
 * Split a placed line into maximal same-direction runs. Items keep LOGICAL
 * order in each run's array; within an rtl run the x positions are mirrored so
 * the run reads right-to-left while occupying the same slot in the line.
 * (Neutral-only lines default to ltr; full UAX#9 bidi is out of scope — the
 * corpus embeds isolated Hebrew, never nested direction levels.)
 */
function splitRuns(items: readonly LineItem[]): TokenRun[] {
  if (items.length === 0) return [];

  const runs: { direction: 'ltr' | 'rtl'; items: LineItem[] }[] = [];
  let pending: LineItem[] = []; // forward-binding neutrals awaiting their word's run
  for (const item of items) {
    const dir = itemDirection(item);
    const current = runs[runs.length - 1];
    if (dir === null) {
      // Verse-num and opening punct bind FORWARD to the word they introduce;
      // trailing punctuation binds BACKWARD to the word it follows.
      if (item.kind === 'verse-num' || item.kind === 'section-break' || isOpeningItem(item) || !current) pending.push(item);
      else current.items.push(item);
    } else if (current && current.direction === dir) {
      current.items.push(...pending, item);
      pending = [];
    } else {
      runs.push({ direction: dir, items: [...pending, item] });
      pending = [];
    }
  }
  if (pending.length > 0) {
    const last = runs[runs.length - 1];
    if (last) last.items.push(...pending);
    else runs.push({ direction: 'ltr', items: pending });
  }

  return runs.map((run) => {
    if (run.direction === 'ltr') return run;
    const left = Math.min(...run.items.map((i) => i.x));
    const right = Math.max(...run.items.map((i) => i.x + i.width));
    return {
      direction: run.direction,
      items: run.items.map((i) => ({ ...i, x: left + right - (i.x + i.width) })),
    };
  });
}
