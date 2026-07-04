/**
 * Hanging-versal drop cap (#8) — pure geometry, vitest-covered. The engine
 * (#7) marks the drop-cap token but never insets lines, and the draw layer
 * cannot reflow a fixed Page — so the versal HANGS in the left margin beside
 * the opening lines (the manuscript treatment), touching no text geometry.
 * The full opening word still renders in the flow; the versal is ornament.
 */

import type { PageLayout } from '../engine/layout';

/** Gap between the versal's right edge and the text region, in em. */
const VERSAL_GAP = 0.25;
/** Lines of the opening block the versal spans. */
const VERSAL_LINES = 2;

export interface VersalSpec {
  /** The single initial to paint (first code point of the drop-cap word). */
  readonly letter: string;
  /** Right-align the glyph to this em x — the margin side of the text region. */
  readonly rightEdgeEm: number;
  /** Canvas-space top of the versal box, in em. */
  readonly topEm: number;
  /** Versal box height, in em (the glyph is sized to fill it). */
  readonly heightEm: number;
}

export function versalSpec(
  page: PageLayout,
  rules: { readonly lineHeight: number },
): VersalSpec | null {
  if (!page.dropCap) return null;

  for (const block of page.blocks) {
    for (const line of block.lines) {
      for (const run of line.runs) {
        for (const item of run.items) {
          if (item.kind !== 'token' || item.seq !== page.dropCap.tokenSeq) continue;
          const letter = [...item.text][0];
          if (!letter) return null;
          // Line.y is text-region-absolute (the engine's running cursor).
          return {
            letter,
            rightEdgeEm: page.text.x - VERSAL_GAP,
            topEm: page.text.y + line.y,
            heightEm: VERSAL_LINES * rules.lineHeight,
          };
        }
      }
    }
  }
  return null;
}
