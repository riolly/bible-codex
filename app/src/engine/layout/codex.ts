/**
 * Codex mode (portrait, ADR-0016): Page = ONE chapter typeset at fixed
 * geometry per preset. The viewport never re-typesets a Page — it only
 * letterboxes/scales it. Pure TS, no Skia (ADR-0008); output is ephemeral
 * (ADR-0004).
 */

import type { Block, Token } from '../../model/corpus';
import type { PageLayout } from './model';
import type { ResolvedRules } from './rules';
import { typesetBlocks, type MeasureToken } from './typeset';

export interface CodexPageInput {
  readonly chapter: number;
  readonly blocks: readonly Block[];
  readonly tokens: readonly Token[];
  readonly rules: ResolvedRules;
  readonly metrics: MeasureToken;
  /**
   * User rail expansion in em (ADR-0016 pillar 4). Clamped to the preset base
   * as a floor; growing it widens the canvas OUTWARD only — the text measure
   * and its line breaks are untouched by construction.
   */
  readonly railWidth?: number;
}

export function layoutCodexPage(input: CodexPageInput): PageLayout {
  const { rules } = input;
  const { blocks, height } = typesetBlocks(input);

  const railWidth = Math.max(input.railWidth ?? rules.railWidth, rules.railWidth);
  const canvasHeight = rules.margin + height + rules.margin;

  return {
    kind: 'page',
    chapter: input.chapter,
    canvas: {
      width: rules.margin + rules.measure + rules.margin + railWidth,
      height: canvasHeight,
    },
    text: { x: rules.margin, y: rules.margin, width: rules.measure, height },
    rail: {
      x: rules.margin + rules.measure + rules.margin,
      y: 0,
      width: railWidth,
      height: canvasHeight,
    },
    blocks,
    dropCap: findDropCap(input.tokens),
  };
}

/**
 * Drop-cap structural cue (#7): the chapter opens with a versal on its first
 * verse-bearing word — headings/titles never carry it. The engine only marks
 * the token; carving the cap's line inset is the draw layer's business (#9).
 */
function findDropCap(tokens: readonly Token[]): PageLayout['dropCap'] {
  let first: Token | null = null;
  for (const token of tokens) {
    if (token.verse === null || token.kind !== 'word') continue;
    if (first === null || token.seq < first.seq) first = token;
  }
  return first ? { tokenSeq: first.seq } : null;
}
