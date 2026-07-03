/**
 * The typesetting core (#7): corpus blocks + tokens + resolved rules →
 * laid-out blocks. Shared by both reading surfaces — Codex pages stack the
 * result vertically; Scroll mode reflows the same lines into columns.
 *
 * Framework-agnostic and pixel-free (ADR-0008 / ADR-0004): glyph widths come
 * in through an injected MeasureToken, in em; all output geometry is em.
 */

import type { Block, Token } from '../../model/corpus';
import type { Line, LayoutBlock, LineItem, TokenRun } from './model';
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
}

export interface TypesetResult {
  readonly blocks: readonly LayoutBlock[];
  /** Total typeset height in em (text-region space). */
  readonly height: number;
}

/** Superscript verse numbers render smaller than body text … */
const VERSE_NUM_SCALE = 0.65;
/** … and carry a hair of padding before the word they introduce. */
const VERSE_NUM_PAD = 0.15;

/** A LineItem before x-placement (distributive omit — LineItem is a union). */
type UnplacedItem = LineItem extends infer I ? (I extends LineItem ? Omit<I, 'x'> : never) : never;

/** An unbreakable chunk: verse-num? + word + trailing punctuation. */
interface Chunk {
  readonly items: readonly UnplacedItem[];
  readonly width: number;
}

export function typesetBlocks({ blocks, tokens, rules, metrics }: TypesetInput): TypesetResult {
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

    const chunkLines = breakChunks(buildChunks(blockTokens, metrics), available, spaceWidth);
    const lines: Line[] = chunkLines.map((chunks, i) => ({
      y: cursor + i * rules.lineHeight,
      indent: indentEm,
      runs: splitRuns(placeChunks(chunks, indentEm, spaceWidth)),
    }));

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
 * Group tokens into unbreakable chunks. Whitespace is not a Token
 * (CONTEXT.md) — inter-chunk space is synthesized here. Punctuation glues to
 * the preceding word (never starts a line); a verse-start word is prefixed by
 * its verse-number ornament slot.
 */
function buildChunks(tokens: readonly Token[], metrics: MeasureToken): Chunk[] {
  const chunks: { items: UnplacedItem[]; width: number }[] = [];

  for (const token of tokens) {
    const item = {
      kind: 'token' as const,
      seq: token.seq,
      text: token.text,
      tokenKind: token.kind,
      verse: token.verse,
      width: metrics(token.text),
    };
    const startsChunk = token.kind === 'word' || chunks.length === 0;
    if (startsChunk) {
      const items: UnplacedItem[] = [];
      if (token.verseStart && token.verse !== null) {
        items.push({
          kind: 'verse-num' as const,
          verse: token.verse,
          width: metrics(String(token.verse)) * VERSE_NUM_SCALE + VERSE_NUM_PAD,
        });
      }
      items.push(item);
      chunks.push({ items, width: items.reduce((w, i) => w + i.width, 0) });
    } else {
      const chunk = chunks[chunks.length - 1];
      chunk.items.push(item);
      chunk.width += item.width;
    }
  }

  return chunks;
}

/** Greedy line-breaker over chunks; an over-measure chunk takes its own line. */
function breakChunks(chunks: readonly Chunk[], available: number, spaceWidth: number): Chunk[][] {
  const lines: Chunk[][] = [];
  let line: Chunk[] = [];
  let width = 0;

  for (const chunk of chunks) {
    if (line.length === 0) {
      line = [chunk];
      width = chunk.width;
    } else if (width + spaceWidth + chunk.width <= available) {
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
      items.push({ ...item, x });
      x += item.width;
    }
  }
  return items;
}

/** Hebrew script (incl. presentation forms) — the rtl scripts the corpus carries. */
const RTL_CHAR = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

/**
 * Direction of one item: word tokens by script; punctuation and verse-num
 * ornaments are neutral and inherit the run they follow.
 */
function itemDirection(item: LineItem): 'ltr' | 'rtl' | null {
  if (item.kind !== 'token' || item.tokenKind !== 'word') return null;
  return RTL_CHAR.test(item.text) ? 'rtl' : 'ltr';
}

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
  let pending: LineItem[] = []; // leading neutrals awaiting a direction
  for (const item of items) {
    const dir = itemDirection(item);
    const current = runs[runs.length - 1];
    if (dir === null) {
      if (current) current.items.push(item);
      else pending.push(item);
    } else if (current && current.direction === dir) {
      current.items.push(item);
    } else {
      runs.push({ direction: dir, items: [...pending, item] });
      pending = [];
    }
  }
  if (pending.length > 0) runs.push({ direction: 'ltr', items: pending });

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
