/**
 * Cardo font loading (#8): the React hook that registers the bundled faces and
 * hands the draw layer its measure seam. The Skia-backed assembly lives in
 * fonts-core.ts (`buildDrawFonts`) so device and headless goldens share it.
 */

import { useFonts } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { buildDrawFonts, CARDO, type DrawFonts } from './fonts-core';

export { CARDO } from './fonts-core';
export type { DrawFonts, FontMetricsEm } from './fonts-core';

/**
 * Font load state. `fonts === null && error === null` is *loading*; a non-null
 * `error` is a terminal failure the caller must surface — never a blank screen
 * (matchFamilyStyle can return null on a corrupt/missing face).
 */
export interface CardoFontsResult {
  readonly fonts: DrawFonts | null;
  readonly error: string | null;
}

const LOADING: CardoFontsResult = { fonts: null, error: null };

export function useCardoFonts(): CardoFontsResult {
  const fontMgr = useFonts({
    [CARDO]: [
      require('../../assets/fonts/Cardo-Regular.ttf'),
      require('../../assets/fonts/Cardo-Bold.ttf'),
      require('../../assets/fonts/Cardo-Italic.ttf'),
    ],
  });

  return useMemo(() => {
    if (!fontMgr) return LOADING;
    const fonts = buildDrawFonts(fontMgr);
    if (!fonts) return { fonts: null, error: `font "${CARDO}" failed to load` };
    return { fonts, error: null };
  }, [fontMgr]);
}
