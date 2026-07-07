/**
 * Codex mode (portrait, ADR-0016): Page = ONE chapter typeset at fixed
 * geometry per preset. The viewport never re-typesets a Page — it only
 * letterboxes/scales it. Pure TS, no Skia (ADR-0008); output is ephemeral
 * (ADR-0004).
 */

import type { Block, Token } from '../../model/corpus';
import type {
  PageLayout,
  RunningHeadIdentity,
  RunningHeadStyle,
  SectionBreakStyle,
  VersalStyle,
  VerseNumberStyle,
} from './model';
import { builtinPreset } from './presets';
import type { ResolvedRules } from './rules';
import { typesetBlocks, type MeasureToken } from './typeset';

export interface CodexPageInput {
  readonly chapter: number;
  readonly blocks: readonly Block[];
  readonly tokens: readonly Token[];
  readonly rules: ResolvedRules;
  readonly metrics: MeasureToken;
  readonly verseNumberStyle?: VerseNumberStyle;
  readonly versalStyle?: VersalStyle;
  readonly sectionBreakStyle?: SectionBreakStyle;
  /** True only for the first page of a book; defaults to chapter 1 in USFM pages. */
  readonly bookStart?: boolean;
  readonly runningHead?: string | RunningHeadIdentity | null;
  readonly runningHeadStyle?: RunningHeadStyle;
  /**
   * User rail expansion in em (ADR-0016 pillar 4). Clamped to the preset base
   * as a floor; growing it widens the canvas OUTWARD only — the text measure
   * and its line breaks are untouched by construction.
   */
  readonly railWidth?: number;
}

export function layoutCodexPage(input: CodexPageInput): PageLayout {
  const { rules } = input;
  const defaultPreset = builtinPreset(null);
  const verseNumberStyle = input.verseNumberStyle ?? defaultPreset.verseNumber;
  const versalStyle = input.versalStyle ?? defaultPreset.versal;
  const sectionBreakStyle = input.sectionBreakStyle ?? defaultPreset.sectionBreak;
  const runningHeadStyle = input.runningHeadStyle ?? defaultPreset.runningHead;
  const runningHead = normalizeRunningHead(input.runningHead);
  const runningHeadText = runningHead?.text ?? null;
  const headSlot = runningHeadText ? rules.lineHeight : 0;
  const versal = findBookStartVersal(input.tokens, input.bookStart ?? input.chapter === 1);
  const { blocks, height } = typesetBlocks({
    ...input,
    verseNumberStyle,
    versal: versal ? { tokenSeq: versal.tokenSeq, style: versalStyle } : null,
    sectionBreakStyle,
  });

  const railWidth = Math.max(input.railWidth ?? rules.railWidth, rules.railWidth);
  const canvasHeight = rules.margin + headSlot + height + rules.margin;

  return {
    kind: 'page',
    chapter: input.chapter,
    canvas: {
      width: rules.margin + rules.measure + rules.margin + railWidth,
      height: canvasHeight,
    },
    text: { x: rules.margin, y: rules.margin + headSlot, width: rules.measure, height },
    rail: {
      x: rules.margin + rules.measure + rules.margin,
      y: 0,
      width: railWidth,
      height: canvasHeight,
    },
    runningHead: runningHead
      ? {
          text: runningHead.text,
          identity: runningHead.identity,
          x: rules.margin,
          baselineY: rules.margin * 0.65,
          style: runningHeadStyle,
        }
      : null,
    blocks,
    versal:
      blocks
        .flatMap((b) => b.lines.flatMap((l) => l.runs.flatMap((r) => r.items)))
        .find((i) => i.kind === 'versal') ?? null,
  };
}

function normalizeRunningHead(
  input: CodexPageInput['runningHead'],
): { readonly text: string; readonly identity: RunningHeadIdentity | null } | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const text = input.trim();
    return text ? { text, identity: null } : null;
  }
  const bookName = input.bookName.trim();
  const locator = input.locator.trim();
  if (!bookName || !locator) return null;
  return { text: `${bookName} - ${locator}`, identity: { bookName, locator } };
}

function findBookStartVersal(
  tokens: readonly Token[],
  bookStart: boolean,
): { readonly tokenSeq: number } | null {
  if (!bookStart) return null;
  let first: Token | null = null;
  for (const token of tokens) {
    if (token.verse === null || token.kind !== 'word') continue;
    if (first === null || token.seq < first.seq) first = token;
  }
  return first ? { tokenSeq: first.seq } : null;
}
