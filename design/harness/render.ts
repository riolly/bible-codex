/**
 * Browser mirror of app/src/draw/__visual__/harness.ts: replay the PRODUCTION
 * picture builders onto an offscreen surface → PNG bytes. `scale` supersamples
 * for crisp retina display (the returned width/height stay in design px, used
 * as the <img>'s CSS size).
 *
 * `renderCustom` is the fake-never-build escape hatch: freeform Skia drawing
 * for surfaces the engine doesn't cover yet — the variant fakes the picture,
 * the build phase earns the capability.
 */

import { Skia } from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';

import type { DrawFonts } from '@app/draw/fonts-core';
import { buildPagePicture } from '@app/draw/page-picture';
import { buildScrollPicture } from '@app/draw/scroll-picture';
import { PALETTE, type Palette } from '@app/draw/style';
import type { PageLayout, ResolvedRules, ScrollLayout } from '@app/engine/layout';

import type { RenderedPng } from './types';

function snapshot(
  width: number,
  height: number,
  scale: number,
  draw: (canvas: SkCanvas) => void,
): RenderedPng {
  const w = Math.max(1, Math.ceil(width * scale));
  const h = Math.max(1, Math.ceil(height * scale));
  // CPU raster surface — the same backend node goldens land on (no
  // OffscreenCanvas there), so harness pixels match goldens exactly and
  // headless/GPU-less browsers work too.
  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('Skia.Surface.Make returned null');
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  draw(canvas);
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  if (!bytes) throw new Error('PNG encode failed');
  // Copy out — the source view may sit over reusable wasm memory.
  return { bytes: bytes.slice(), width, height };
}

/** Render a Codex PageLayout through the production page picture builder. */
export function renderPage(
  page: PageLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
  scale = 2,
): RenderedPng {
  const S = rules.fontSize;
  const pic = buildPagePicture(page, rules, fonts, palette);
  return snapshot(page.canvas.width * S, page.canvas.height * S, scale, (c) => c.drawPicture(pic));
}

/** Render a Scroll-mode ScrollLayout through the production picture builder. */
export function renderScroll(
  layout: ScrollLayout,
  rules: ResolvedRules,
  fonts: DrawFonts,
  palette: Palette = PALETTE,
  scale = 2,
): RenderedPng {
  const S = rules.fontSize;
  const pic = buildScrollPicture(layout, rules, fonts, palette);
  const width = layout.totalWidth * S;
  const height = (layout.columnHeight + 2 * rules.margin) * S;
  return snapshot(width, height, scale, (c) => c.drawPicture(pic));
}

/** Freeform Skia drawing at design px — for looks the engine can't produce yet. */
export function renderCustom(
  width: number,
  height: number,
  draw: (canvas: SkCanvas) => void,
  scale = 2,
): RenderedPng {
  return snapshot(width, height, scale, draw);
}
