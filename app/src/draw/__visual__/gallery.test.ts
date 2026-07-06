/**
 * Gallery (Phase 1c) — the "stop navigating manually" deliverable. Renders the
 * whole visual matrix to gallery/*.png and composites a labelled montage so the
 * whole reader surface is judged in ONE image, no app, no clicking.
 *
 * Not a regression gate (it always passes) — run via `pnpm gallery`, then open
 * gallery/_montage.png (or let the agent Read it). Output is gitignored.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { it } from 'vitest';

import { Skia } from '@shopify/react-native-skia';

import { loadHeadlessFonts, visualCases } from './scenes';

const OUT_DIR = new URL('./gallery/', import.meta.url);

/** Composite the rendered case PNGs into one labelled contact-sheet PNG. */
function montage(
  items: readonly { label: string; png: Buffer }[],
  fontMgr: Parameters<typeof buildLabel>[0],
): Buffer {
  const cols = 2;
  const cellW = 720;
  const labelH = 40;
  const gap = 24;

  const images = items.map((it) => {
    const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(it.png)));
    if (!img) throw new Error(`montage: undecodable PNG for ${it.label}`);
    const scaledH = (img.height() * cellW) / img.width();
    return { img, scaledH, label: it.label };
  });

  const cellH = labelH + Math.max(...images.map((i) => i.scaledH));
  const rows = Math.ceil(images.length / cols);
  const W = gap + cols * (cellW + gap);
  const H = gap + rows * (cellH + gap);

  const surface = Skia.Surface.MakeOffscreen(Math.ceil(W), Math.ceil(H));
  if (!surface) throw new Error('montage surface null');
  const canvas = surface.getCanvas();
  const bg = Skia.Paint();
  bg.setColor(Skia.Color('#3a3a3a'));
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), bg);

  const paint = Skia.Paint();
  images.forEach((cell, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gap + col * (cellW + gap);
    const y = gap + row * (cellH + gap);

    const label = buildLabel(fontMgr, cell.label, cellW);
    label.paint(canvas, x + 4, y + 6);

    const src = Skia.XYWHRect(0, 0, cell.img.width(), cell.img.height());
    const dst = Skia.XYWHRect(x, y + labelH, cellW, cell.scaledH);
    canvas.drawImageRect(cell.img, src, dst, paint);
  });

  surface.flush();
  return Buffer.from(surface.makeImageSnapshot().encodeToBytes());
}

function buildLabel(fontMgr: ReturnType<typeof loadHeadlessFonts>['fontMgr'], text: string, width: number) {
  const para = Skia.ParagraphBuilder.Make({}, fontMgr)
    .pushStyle({ color: Skia.Color('#EDEDED'), fontFamilies: ['Cardo'], fontSize: 24 })
    .addText(text)
    .build();
  para.layout(width);
  return para;
}

it('renders the visual gallery + montage', () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const fonts = loadHeadlessFonts();
  const cases = visualCases();

  const items = cases.map((c) => {
    const png = c.render(fonts);
    writeFileSync(fileURLToPath(new URL(`${c.id}.png`, OUT_DIR)), png);
    return { label: c.label, png };
  });

  const sheet = montage(items, fonts.fontMgr);
  writeFileSync(fileURLToPath(new URL('_montage.png', OUT_DIR)), sheet);
  console.log(`gallery: ${items.length} cases + montage -> ${fileURLToPath(OUT_DIR)}`);
});
