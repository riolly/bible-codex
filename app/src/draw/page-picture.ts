/**
 * Page picture builder (#8): paints a Codex-mode PageLayout (#7) into one
 * SkPicture, recorded ONCE per chapter — the canvas then just replays it under
 * the letterbox/scroll transform (60fps scroll without re-painting text).
 *
 * Recording space: "design px" = em × rules.fontSize. The component scales
 * design px → dp with fit.scale / fontSize. Token shaping is shared with Scroll
 * mode via the FlowPainter (draw/flow-paint.ts); this file adds only the
 * Codex-specific parchment ground.
 */

import { Skia, type SkPicture } from '@shopify/react-native-skia';

import type { PageLayout, ResolvedRules } from '../engine/layout';
import { createFlowPainter } from './flow-paint';
import type { DrawFonts } from './fonts';
import {
  PALETTE,
  runningHeadStyle,
  styleForBlock,
  type BlockStyle,
  type Palette,
} from './style';

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

  if (page.runningHead) {
    const style = runningHeadStyle(page.runningHead.style, palette);
    painter.paintAtBaseline(
      canvas,
      {
        text: page.runningHead.text,
        color: style.color,
        bold: false,
        italic: false,
        sizePx: S * style.scale,
      },
      page.runningHead.x * S,
      page.runningHead.baselineY * S,
    );
  }

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

  return recorder.finishRecordingAsPicture();
}
