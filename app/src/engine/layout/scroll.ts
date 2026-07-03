/**
 * Scroll mode (landscape, ADR-0016): the chapter flows through continuous
 * horizontal columns — the original scroll form. The viewport parametrizes
 * column geometry (ADR-0004: layout is a pure function of rules + corpus +
 * viewport); the typeset core is the SAME one Codex pages use.
 */

import type { Block, Token } from '../../model/corpus';
import type { ScrollColumn, ScrollLayout, ScrollLine, Viewport } from './model';
import type { ResolvedRules } from './rules';
import { typesetBlocks, type MeasureToken } from './typeset';

export interface ScrollInput {
  readonly chapter: number;
  readonly blocks: readonly Block[];
  readonly tokens: readonly Token[];
  readonly rules: ResolvedRules;
  readonly metrics: MeasureToken;
  readonly viewport: Viewport;
}

export function layoutScrollColumns(input: ScrollInput): ScrollLayout {
  const { rules, viewport } = input;

  // The dp viewport enters em space through the preset's root font size.
  const columnHeight = viewport.height / rules.fontSize - 2 * rules.margin;
  if (columnHeight < rules.lineHeight) {
    throw new Error(
      `viewport height ${viewport.height}dp fits no line at fontSize ${rules.fontSize}`,
    );
  }

  const { blocks } = typesetBlocks(input);

  const columns: ScrollLine[][] = [];
  let column: ScrollLine[] = [];
  let cursor = 0;

  for (const block of blocks) {
    // Paragraph spacing separates blocks mid-column, never pads a column top.
    if (column.length > 0) cursor += rules.paragraphSpacing;
    for (const line of block.lines) {
      if (cursor + rules.lineHeight > columnHeight && column.length > 0) {
        columns.push(column);
        column = [];
        cursor = 0;
      }
      column.push({
        ...line,
        y: cursor,
        blockId: block.blockId,
        genre: block.genre,
        role: block.role,
      });
      cursor += rules.lineHeight;
    }
  }
  if (column.length > 0) columns.push(column);

  // Columns advance by measure + gutter (the page margin doubles as gutter).
  const stride = rules.measure + rules.margin;
  return {
    kind: 'scroll',
    chapter: input.chapter,
    columnWidth: rules.measure,
    columnHeight,
    columns: columns.map((lines, i): ScrollColumn => ({ x: rules.margin + i * stride, lines })),
    totalWidth: rules.margin + columns.length * stride,
  };
}
