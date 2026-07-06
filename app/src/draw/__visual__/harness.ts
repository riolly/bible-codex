/**
 * Headless render harness for visual goldens (Phase 1, ADR-0008). Runs the
 * PRODUCTION draw layer (page-picture / scroll-picture + fonts-core) under
 * CanvasKit in node, so a golden tests exactly what ships. No simulator, no
 * device — the layout engine is pure TS and the paint is a portable SkPicture.
 *
 * `@shopify/react-native-skia` is aliased to the web (CanvasKit) backend by
 * vitest.visual.config.ts; global.CanvasKit is booted in vitest.setup.visual.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Skia } from '@shopify/react-native-skia';

import type { PageLayout, ResolvedRules, ScrollLayout } from '../../engine/layout';
import { CARDO, drawFontsFromTypeface, type DrawFonts } from '../fonts-core';
import { buildPagePicture } from '../page-picture';
import { buildScrollPicture } from '../scroll-picture';
import { PALETTE, type Palette } from '../style';

const FONT_DIR = new URL('../../../assets/fonts/', import.meta.url);
const FACES = ['Cardo-Regular.ttf', 'Cardo-Bold.ttf', 'Cardo-Italic.ttf'];

/**
 * Register the bundled Cardo faces into a Skia font provider and assemble the
 * draw fonts — the headless mirror of the `useCardoFonts` hook, sharing
 * `buildDrawFonts` so metrics are identical to on-device.
 */
export function loadHeadlessFonts(): DrawFonts {
  const provider = Skia.TypefaceFontProvider.Make();
  let regular: ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData> | null = null;
  for (const face of FACES) {
    const bytes = readFileSync(fileURLToPath(new URL(face, FONT_DIR)));
    const data = Skia.Data.fromBytes(new Uint8Array(bytes));
    const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
    if (!typeface) throw new Error(`headless font load failed: ${face}`);
    provider.registerFont(typeface, CARDO);
    if (face === 'Cardo-Regular.ttf') regular = typeface;
  }
  if (!regular) throw new Error(`headless "${CARDO}" regular face missing`);
  // CanvasKit's provider has no matchFamilyStyle; hand the loaded regular face
  // straight to the shared measure core (paint still shapes via the provider).
  return drawFontsFromTypeface(provider, regular);
}

/** Replay an SkPicture recorded in design px onto an offscreen surface → PNG bytes. */
function pictureToPng(
  pic: ReturnType<typeof buildPagePicture>,
  designWidth: number,
  designHeight: number,
  scale: number,
): Buffer {
  const w = Math.max(1, Math.ceil(designWidth * scale));
  const h = Math.max(1, Math.ceil(designHeight * scale));
  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('MakeOffscreen returned null');
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  canvas.drawPicture(pic);
  surface.flush();
  const image = surface.makeImageSnapshot();
  return Buffer.from(image.encodeToBytes());
}

/**
 * Render a Codex PageLayout to a PNG. The picture is recorded in design px
 * (em × rules.fontSize); `scale` supersamples for crisper goldens.
 */
export function renderPageToPng(
  page: PageLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
  scale = 1,
): Buffer {
  const S = rules.fontSize;
  const pic = buildPagePicture(page, rules, fonts, palette);
  return pictureToPng(pic, page.canvas.width * S, page.canvas.height * S, scale);
}

/** Render a Scroll-mode ScrollLayout to a PNG. */
export function renderScrollToPng(
  layout: ScrollLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
  scale = 1,
): Buffer {
  const S = rules.fontSize;
  const pic = buildScrollPicture(layout, rules, fonts, palette);
  const widthPx = layout.totalWidth * S;
  const heightPx = (layout.columnHeight + 2 * rules.margin) * S;
  return pictureToPng(pic, widthPx, heightPx, scale);
}
