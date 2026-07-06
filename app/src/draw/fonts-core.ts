/**
 * Font-core: the Skia-backed measure seam (#8), extracted from the React
 * `useCardoFonts` hook so the SAME assembly runs both on-device (via the hook)
 * and headless in node (visual goldens, __visual__/harness.ts) — one render
 * path, no drift between what the goldens test and what ships.
 *
 * Cardo (OFL, bundled in assets/fonts) shapes Latin, polytonic Greek, and
 * pointed Hebrew in one face. The engine stays Skia-free (ADR-0008): it sees
 * only the injected `MeasureToken` built here. Measurement uses cmap glyph
 * advances — combining marks (Hebrew points) carry zero advance, the polytonic
 * Greek range is precomposed in Cardo, so advance sums match the shaped
 * Paragraph the picture builder paints (per-token anchoring absorbs drift).
 */

import {
  FontWeight,
  Skia,
  type SkTypeface,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';

import type { MeasureToken } from '../engine/layout';

export const CARDO = 'Cardo';

/** Measure at a large size and normalize — avoids small-size quantization. */
const MEASURE_SIZE = 100;

/** Font vertical metrics in em (ascent negative, Skia convention). */
export interface FontMetricsEm {
  readonly ascent: number;
  readonly descent: number;
}

/** Everything the draw layer needs from the loaded fonts. */
export interface DrawFonts {
  readonly fontMgr: SkTypefaceFontProvider;
  /** The engine's injected metrics seam: advance width of `text` at 1em. */
  readonly metrics: MeasureToken;
  readonly metricsEm: FontMetricsEm;
}

/**
 * Assemble the draw-layer fonts from a Skia font provider that already has
 * Cardo registered. Returns `null` when the face is missing/corrupt
 * (matchFamilyStyle can return null) — the caller surfaces that as a terminal
 * error, never a blank screen.
 *
 * Device path: the native provider resolves the face by family/style. The
 * headless goldens backend can't (CanvasKit's provider has no matchFamilyStyle),
 * so it calls `drawFontsFromTypeface` with the face it loaded — the metrics core
 * below is shared either way, which is what keeps goldens honest.
 */
export function buildDrawFonts(fontMgr: SkTypefaceFontProvider): DrawFonts | null {
  const typeface = fontMgr.matchFamilyStyle(CARDO, { weight: FontWeight.Normal });
  if (!typeface) return null;
  return drawFontsFromTypeface(fontMgr, typeface);
}

/**
 * The shared measure core: given the regular Cardo `typeface` (for cmap glyph
 * advances + vertical metrics) and the `fontMgr` the painter shapes through,
 * build the injected `MeasureToken` + em metrics. Both the device hook and the
 * headless harness funnel through here so measurement never diverges.
 */
export function drawFontsFromTypeface(
  fontMgr: SkTypefaceFontProvider,
  typeface: SkTypeface,
): DrawFonts {
  const font = Skia.Font(typeface, MEASURE_SIZE);

  const cache = new Map<string, number>();
  const metrics: MeasureToken = (text) => {
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    const widths = font.getGlyphWidths(font.getGlyphIDs(text));
    const em = widths.reduce((sum, w) => sum + w, 0) / MEASURE_SIZE;
    cache.set(text, em);
    return em;
  };

  const m = font.getMetrics();
  return {
    fontMgr,
    metrics,
    metricsEm: { ascent: m.ascent / MEASURE_SIZE, descent: m.descent / MEASURE_SIZE },
  };
}
