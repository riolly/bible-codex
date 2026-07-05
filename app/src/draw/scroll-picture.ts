/**
 * Scroll picture builder (#9, ADR-0016): paints a Scroll-mode ScrollLayout (#7)
 * into one SkPicture — continuous horizontal columns, the original scroll form.
 * Recorded once per (chapter, viewport); the surface replays it under a
 * horizontal scroll transform. Token shaping is shared with Codex via the
 * FlowPainter, so genre styling is identical across the two surfaces.
 *
 * Recording space: "design px" = em × rules.fontSize. Columns start at the top
 * margin; each column paints its own origin-local lines.
 */

import { Skia, type SkPicture } from '@shopify/react-native-skia';

import type { ResolvedRules, ScrollLayout } from '../engine/layout';
import { createFlowPainter } from './flow-paint';
import type { DrawFonts } from './fonts';
import { PALETTE, styleForBlock, type BlockStyle, type Palette } from './style';

export function buildScrollPicture(
  layout: ScrollLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
): SkPicture {
  const painter = createFlowPainter(rules, fonts, palette);
  const S = painter.S; // design px per em

  // Canvas: full scroll width × the viewport-derived column height framed by
  // the top/bottom margins. The vertical extent fills the viewport exactly.
  const canvasWidthPx = layout.totalWidth * S;
  const canvasHeightPx = (layout.columnHeight + 2 * rules.margin) * S;

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, canvasWidthPx, canvasHeightPx));

  // Parchment ground.
  const bg = Skia.Paint();
  bg.setColor(Skia.Color(palette.parchment));
  canvas.drawRect(Skia.XYWHRect(0, 0, canvasWidthPx, canvasHeightPx), bg);

  const originYPx = rules.margin * S; // columns begin below the top margin
  for (const column of layout.columns) {
    const originXPx = column.x * S; // column.x already includes the left margin
    for (const line of column.lines) {
      const style: BlockStyle = styleForBlock(line.genre, line.role, palette);
      painter.paintLine(canvas, line, style, originXPx, originYPx);
    }
  }

  return recorder.finishRecordingAsPicture();
}
