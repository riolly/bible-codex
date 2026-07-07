/**
 * Shared Skia text painter for both reading surfaces (#9). The engine measured
 * every token at 1em; here we shape each token as its own Paragraph anchored at
 * the engine's x (the model stays the truth for hit-testing) — Paragraph
 * shaping gives correct polytonic Greek and pointed-Hebrew mark positioning.
 *
 * Codex pages call `paintLine` once per line in the text region; Scroll columns
 * call it per line under a per-column origin — the SAME lines, the SAME caches.
 * Recording space is "design px" = em × rules.fontSize; the surface scales
 * design px → dp.
 */

import {
  FontSlant,
  FontWeight,
  Skia,
  type SkCanvas,
  type SkParagraph,
} from '@shopify/react-native-skia';

import type { Line, ResolvedRules } from '../engine/layout';
import { CARDO, type DrawFonts } from './fonts';
import {
  PALETTE,
  sectionBreakStyle,
  versalStyle,
  verseNumStyle,
  type BlockStyle,
  type Palette,
} from './style';

export interface ParaSpec {
  readonly text: string;
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly sizePx: number;
}

/** A stateful painter bound to one recording pass — holds the shaping caches. */
export interface FlowPainter {
  /** Design px per em (= rules.fontSize). */
  readonly S: number;
  /** Shape (and cache) a Paragraph for a spec — never wraps (single words). */
  shape(spec: ParaSpec): SkParagraph;
  /** Paint a spec so its first-line baseline sits at (xPx, baselinePx). */
  paintAtBaseline(canvas: SkCanvas, spec: ParaSpec, xPx: number, baselinePx: number): void;
  /**
   * Paint one typeset Line's runs/items with body style `style`, offset by the
   * region/column origin in design px. Line.y is origin-local em.
   */
  paintLine(canvas: SkCanvas, line: Line, style: BlockStyle, originXPx: number, originYPx: number): void;
}

export function createFlowPainter(
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
): FlowPainter {
  const S = rules.fontSize;
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
    para.layout(1e6); // never wraps: tokens are single words, far under this px width
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

  const paintAtBaseline = (canvas: SkCanvas, spec: ParaSpec, xPx: number, baselinePx: number) => {
    shape(spec).paint(canvas, xPx, baselinePx - baselineOffset(spec));
  };

  // Baseline inside a line box: center the font's natural extent in lineHeight.
  const { ascent, descent } = fonts.metricsEm; // ascent < 0
  const leadingGapEm = (rules.lineHeight - (descent - ascent)) / 2;

  const paintLine = (
    canvas: SkCanvas,
    line: Line,
    style: BlockStyle,
    originXPx: number,
    originYPx: number,
  ) => {
    const baselinePx = originYPx + (line.y + leadingGapEm - ascent) * S;
    // The engine measured every token role-blind at NORMAL weight, but bold
    // headings paint wider than that slot — the overrun eats the inter-word
    // space and crowds the words. Bold blocks are headings/titles (verse=null,
    // no verse-num ornament and never hit-tested), so we may re-flow them:
    // shift each token right by the accumulated (painted − measured) drift,
    // which restores every gap to exactly one space width. Body prose is not
    // bold, so it stays on the exact model x the engine placed (hit-testing).
    const compensate = style.bold;
    let drift = 0;
    for (const run of line.runs) {
      for (const item of run.items) {
        const xPx = originXPx + item.x * S + drift;
        if (item.kind === 'verse-num') {
          const vn = verseNumStyle(item.style, palette);
          paintAtBaseline(
            canvas,
            { text: String(item.verse), color: vn.color, bold: false, italic: false, sizePx: S * vn.scale },
            xPx,
            baselinePx - vn.raiseEm * S,
          );
        } else if (item.kind === 'versal') {
          const vs = versalStyle(item.style, palette);
          const drop = item.style.kind === 'drop';
          paintAtBaseline(
            canvas,
            {
              text: item.text,
              color: vs.color,
              bold: true,
              italic: false,
              sizePx: S * vs.scale,
            },
            xPx,
            drop ? baselinePx + (item.style.lines - 1) * rules.lineHeight * S * 0.72 : baselinePx,
          );
        } else if (item.kind === 'section-break') {
          const sb = sectionBreakStyle(item.style, palette);
          paintAtBaseline(
            canvas,
            {
              text: item.style.glyph,
              color: sb.color,
              bold: false,
              italic: false,
              sizePx: S * sb.scale,
            },
            xPx,
            baselinePx,
          );
        } else {
          const spec = { text: item.text, color: style.color, bold: style.bold, italic: style.italic, sizePx: S };
          paintAtBaseline(canvas, spec, xPx, baselinePx);
          if (compensate) drift += shape(spec).getLongestLine() - item.width * S;
        }
      }
    }
  };

  return { S, shape, paintAtBaseline, paintLine };
}
