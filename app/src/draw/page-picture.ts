/**
 * Page picture builder (#8): paints a Codex-mode PageLayout (#7) into one
 * SkPicture, recorded ONCE per chapter — the canvas then just replays it under
 * the letterbox/scroll transform (60fps scroll without re-painting text).
 *
 * Recording space: "design px" = em × rules.fontSize. The component scales
 * design px → dp with fit.scale / fontSize.
 *
 * Every token is painted as its own shaped Paragraph anchored at the engine's
 * x — the model stays the truth for hit-testing (Phase 2); Paragraph shaping
 * gives correct polytonic Greek and pointed-Hebrew mark positioning (RTL runs
 * were already mirrored by the engine). Paragraphs are cached per
 * (style, text): scripture repeats words heavily.
 */

import {
  FontSlant,
  FontWeight,
  Skia,
  type SkParagraph,
  type SkPicture,
} from '@shopify/react-native-skia';

import type { PageLayout, ResolvedRules } from '../engine/layout';
import { versalSpec } from './drop-cap';
import { CARDO, type DrawFonts } from './fonts';
import { PALETTE, styleForBlock, verseNumStyle, type BlockStyle } from './style';

/** Cardo cap-height ≈ 0.61em — sizes the versal glyph to fill its box. */
const CAP_RATIO = 0.61;

interface ParaSpec {
  readonly text: string;
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly sizePx: number;
}

export function buildPagePicture(
  page: PageLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
): SkPicture {
  const S = rules.fontSize; // design px per em
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(0, 0, page.canvas.width * S, page.canvas.height * S),
  );

  // Parchment ground.
  const bg = Skia.Paint();
  bg.setColor(Skia.Color(PALETTE.parchment));
  canvas.drawRect(Skia.XYWHRect(0, 0, page.canvas.width * S, page.canvas.height * S), bg);

  const paraCache = new Map<string, SkParagraph>();
  const baselineCache = new Map<string, number>();

  const shape = (spec: ParaSpec): SkParagraph => {
    const key = `${spec.sizePx}|${+spec.bold}${+spec.italic}|${spec.color}|${spec.text}`;
    const hit = paraCache.get(key);
    if (hit) return hit;
    const para = Skia.ParagraphBuilder.Make({}, fonts.fontMgr)
      .pushStyle({
        color: Skia.Color(spec.color),
        fontFamilies: [CARDO],
        fontSize: spec.sizePx,
        fontStyle: {
          weight: spec.bold ? FontWeight.Bold : FontWeight.Normal,
          slant: spec.italic ? FontSlant.Italic : FontSlant.Upright,
        },
      })
      .addText(spec.text)
      .build();
    para.layout(page.canvas.width * S * 2); // never wraps: tokens are single words
    paraCache.set(key, para);
    return para;
  };

  /** First-line top→baseline distance for a style, probed once per style+size. */
  const baselineOffset = (spec: ParaSpec): number => {
    const key = `${spec.sizePx}|${+spec.bold}${+spec.italic}`;
    const hit = baselineCache.get(key);
    if (hit !== undefined) return hit;
    const probe = shape({ ...spec, text: 'Hg' });
    const offset = probe.getLineMetrics()[0]?.baseline ?? spec.sizePx * 0.75;
    baselineCache.set(key, offset);
    return offset;
  };

  const paintAtBaseline = (spec: ParaSpec, xPx: number, baselinePx: number) => {
    shape(spec).paint(canvas, xPx, baselinePx - baselineOffset(spec));
  };

  // Baseline inside a line box: center the font's natural extent in lineHeight.
  const { ascent, descent } = fonts.metricsEm; // ascent < 0
  const leadingGapEm = (rules.lineHeight - (descent - ascent)) / 2;
  const vn = verseNumStyle();

  for (const block of page.blocks) {
    const style: BlockStyle = styleForBlock(block.genre, block.role);
    for (const line of block.lines) {
      // Line.y is text-region-absolute (the engine's running cursor) — block.y
      // is already inside it.
      const baselinePx = (page.text.y + line.y + leadingGapEm - ascent) * S;
      for (const run of line.runs) {
        for (const item of run.items) {
          const xPx = (page.text.x + item.x) * S;
          if (item.kind === 'verse-num') {
            paintAtBaseline(
              {
                text: String(item.verse),
                color: vn.color,
                bold: false,
                italic: false,
                sizePx: S * vn.scale,
              },
              xPx,
              baselinePx - vn.raiseEm * S,
            );
          } else {
            paintAtBaseline(
              { text: item.text, color: style.color, bold: style.bold, italic: style.italic, sizePx: S },
              xPx,
              baselinePx,
            );
          }
        }
      }
    }
  }

  // Hanging versal (drop cap) — gilt initial in the left margin, ornament only.
  const versal = versalSpec(page, rules);
  if (versal) {
    let fontPx = (versal.heightEm * S) / CAP_RATIO;
    let spec: ParaSpec = {
      text: versal.letter,
      color: PALETTE.gilt,
      bold: false,
      italic: false,
      sizePx: fontPx,
    };
    // The margin is narrow — a glyph wider than it would clip at the canvas
    // edge. Shrink to fit the margin width when the 2-line size overflows.
    const availablePx = (versal.rightEdgeEm - 0.25) * S;
    const widthAtFull = shape(spec).getLongestLine();
    if (widthAtFull > availablePx) {
      fontPx *= availablePx / widthAtFull;
      spec = { ...spec, sizePx: fontPx };
    }
    const widthPx = shape(spec).getLongestLine();
    // Cap height spans the versal box bottom-up: baseline sits at the box
    // bottom (shrunken versals span fewer lines but stay top-aligned).
    const baselinePx = versal.topEm * S + fontPx * CAP_RATIO;
    paintAtBaseline(spec, versal.rightEdgeEm * S - widthPx, baselinePx);
  }

  return recorder.finishRecordingAsPicture();
}
