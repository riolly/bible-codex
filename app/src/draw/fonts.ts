/**
 * Cardo font loading + the Skia-backed measure seam (#8). Cardo (OFL, bundled
 * in assets/fonts) shapes Latin, polytonic Greek, and pointed Hebrew in one
 * face — the issue-#8 typeface requirement.
 *
 * The engine stays Skia-free (ADR-0008): it sees only the injected
 * `MeasureToken` built here. Measurement uses cmap glyph advances — combining
 * marks (Hebrew points) carry zero advance, and the polytonic Greek range is
 * precomposed in Cardo, so advance sums match the shaped Paragraph the picture
 * builder paints (per-token anchoring absorbs sub-pixel drift).
 */

import {
  FontWeight,
  Skia,
  useFonts,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';

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

export function useCardoFonts(): DrawFonts | null {
  const fontMgr = useFonts({
    [CARDO]: [
      require('../../assets/fonts/Cardo-Regular.ttf'),
      require('../../assets/fonts/Cardo-Bold.ttf'),
      require('../../assets/fonts/Cardo-Italic.ttf'),
    ],
  });

  return useMemo(() => {
    if (!fontMgr) return null;
    const typeface = fontMgr.matchFamilyStyle(CARDO, { weight: FontWeight.Normal });
    if (!typeface) return null;
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
  }, [fontMgr]);
}
