/**
 * Page picture builder (#8): paints a Codex-mode PageLayout (#7) into one
 * SkPicture, recorded ONCE per chapter — the canvas then just replays it under
 * the letterbox/scroll transform (60fps scroll without re-painting text).
 *
 * Recording space: "design px" = em × rules.fontSize. The component scales
 * design px → dp with fit.scale / fontSize. Token shaping is shared with Scroll
 * mode via the FlowPainter (draw/flow-paint.ts); this file adds only the
 * Codex-specific ground + hanging versal.
 */

import { Skia, type SkPicture } from '@shopify/react-native-skia';

import type { PageLayout, ResolvedRules } from '../engine/layout';
import { versalSpec } from './drop-cap';
import { createFlowPainter, type ParaSpec } from './flow-paint';
import type { DrawFonts } from './fonts';
import { PALETTE, styleForBlock, type BlockStyle, type Palette } from './style';

/** Cardo cap-height ≈ 0.61em — sizes the versal glyph to fill its box. */
const CAP_RATIO = 0.61;

export function buildPagePicture(
  page: PageLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
): SkPicture {
  const painter = createFlowPainter(rules, fonts, palette);
  const S = painter.S; // design px per em
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(0, 0, page.canvas.width * S, page.canvas.height * S),
  );

  // Parchment ground.
  const bg = Skia.Paint();
  bg.setColor(Skia.Color(palette.parchment));
  canvas.drawRect(Skia.XYWHRect(0, 0, page.canvas.width * S, page.canvas.height * S), bg);

  // The text region: Line.y is text-region-absolute (the engine's running
  // cursor) — block.y is already inside it, so the whole page shares one origin.
  const originXPx = page.text.x * S;
  const originYPx = page.text.y * S;
  for (const block of page.blocks) {
    const style: BlockStyle = styleForBlock(block.genre, block.role, palette);
    for (const line of block.lines) {
      painter.paintLine(canvas, line, style, originXPx, originYPx);
    }
  }

  // Hanging versal (drop cap) — gilt initial in the left margin, ornament only.
  const versal = versalSpec(page, rules);
  if (versal) {
    let fontPx = (versal.heightEm * S) / CAP_RATIO;
    let spec: ParaSpec = {
      text: versal.letter,
      color: palette.gilt,
      bold: false,
      italic: false,
      sizePx: fontPx,
    };
    // The margin is narrow — a glyph wider than it would clip at the canvas
    // edge. Shrink to fit the margin width when the 2-line size overflows.
    const availablePx = (versal.rightEdgeEm - 0.25) * S;
    const widthAtFull = painter.shape(spec).getLongestLine();
    if (widthAtFull > availablePx) {
      fontPx *= availablePx / widthAtFull;
      spec = { ...spec, sizePx: fontPx };
    }
    const widthPx = painter.shape(spec).getLongestLine();
    // Cap height spans the versal box bottom-up: baseline sits at the box
    // bottom (shrunken versals span fewer lines but stay top-aligned).
    const baselinePx = versal.topEm * S + fontPx * CAP_RATIO;
    painter.paintAtBaseline(canvas, spec, versal.rightEdgeEm * S - widthPx, baselinePx);
  }

  return recorder.finishRecordingAsPicture();
}
