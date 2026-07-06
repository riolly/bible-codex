/**
 * THROWAWAY SPIKE (#47, ADR-0020) — dies after the device verdict.
 *
 * Placeholder cover textures for the library-ring spike, built with the
 * COMMITTED render strategy (ADR-0020 pillar 5):
 *
 *   - each cover is painted ONCE into an SkPicture, rendered once to an
 *     offscreen surface, and snapshotted to a texture (SkImage);
 *   - depth blur is 2 PRE-RENDERED blurred variants of that texture,
 *     cross-faded by ring position at draw time — never a live
 *     `ImageFilter.blur` during drag;
 *   - the drop shadow is ONE shared blurred-rect texture reused under every
 *     cover (it is the same shape for all 66), so it costs nothing per book.
 *
 * Covers are placeholders by contract: group tint + spine + English title +
 * an abstract art blob. No corpus DB, no curated original-language titles —
 * that is #48's work.
 */

import { Skia, TileMode, matchFont, type SkFont, type SkImage } from '@shopify/react-native-skia';
import { PixelRatio, Platform } from 'react-native';

import { BOOK_GROUPS } from '@/model/book-groups';
import { BLUR_SIGMA_SOFT, BLUR_SIGMA_SOFTER, COVER_H, COVER_W } from './ring';

/** Prototype group tints (index.html TINTS). */
const TINTS: Record<string, string> = {
  Torah: '#c8b28a',
  Prophets: '#a7b0a1',
  Writings: '#c7a98f',
  Gospels: '#9fb0b8',
  Acts: '#c9b57f',
  Letters: '#b9a3ad',
  Revelation: '#c69b86',
};

export interface CoverBook {
  readonly slug: string;
  readonly name: string;
  readonly group: string;
}

export interface CoverTextures {
  readonly books: readonly CoverBook[];
  /** Per-book sharp texture at device pixel ratio. */
  readonly sharp: readonly SkImage[];
  /** Per-book pre-blurred variants at 1x (blur hides the resolution). */
  readonly soft: readonly SkImage[];
  readonly softer: readonly SkImage[];
  /** One shared drop-shadow texture (dp size SHADOW_W × SHADOW_H). */
  readonly shadow: SkImage;
  /** Exact texture bytes held (w×h×4 summed) — the #47 memory measurement. */
  readonly textureBytes: number;
  /** Wall-clock build time, ms — one-time JS-thread cost at lab mount. */
  readonly buildMs: number;
}

/** Shadow texture pad around the cover, dp. */
export const SHADOW_PAD = 36;
export const SHADOW_W = COVER_W + SHADOW_PAD * 2;
export const SHADOW_H = COVER_H + SHADOW_PAD * 2;

/** Placeholder display name from the canonical slug ('1Samuel' → '1 Samuel'). */
function displayName(slug: string): string {
  if (slug === 'SongOfSolomon') return 'Song of Songs';
  return slug.replace(/(\d)([A-Z])/g, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function shiftHex(hex: string, d: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + d));
  const r = c(n >> 16);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const INK = '#2b2118';

/** Paint one cover at `k` px per dp into a fresh offscreen texture. */
function paintCover(book: CoverBook, k: number, font: SkFont, smallFont: SkFont): SkImage {
  const w = Math.round(COVER_W * k);
  const h = Math.round(COVER_H * k);
  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('offscreen surface failed');
  const canvas = surface.getCanvas();

  const tint = TINTS[book.group] ?? '#c0b090';
  const paint = Skia.Paint();

  // Body.
  paint.setColor(Skia.Color(tint));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), 3 * k, 3 * k), paint);
  // Spine.
  paint.setColor(Skia.Color(shiftHex(tint, -46)));
  canvas.drawRect(Skia.XYWHRect(0, 0, 8 * k, h), paint);
  // Page-edge shading on the right.
  paint.setColor(Skia.Color(shiftHex(tint, -20)));
  canvas.drawRect(Skia.XYWHRect(w - 2 * k, 0, 2 * k, h), paint);

  // Abstract art blob, bottom-right (kind picked by name hash, prototype-style).
  const accent = shiftHex(tint, -70);
  const kind = hashCode(book.name) % 3;
  paint.setColor(Skia.Color(accent));
  const ax = w - 34 * k;
  const ay = h - 30 * k;
  if (kind === 0) {
    const path = Skia.Path.Make();
    path.moveTo(ax - 20 * k, ay + 20 * k);
    path.lineTo(ax, ay - 14 * k);
    path.lineTo(ax + 22 * k, ay + 20 * k);
    path.close();
    canvas.drawPath(path, paint);
  } else if (kind === 1) {
    canvas.drawCircle(ax, ay, 16 * k, paint);
    paint.setColor(Skia.Color(shiftHex(accent, 40)));
    canvas.drawCircle(ax + 10 * k, ay - 12 * k, 6 * k, paint);
  } else {
    canvas.drawRect(Skia.XYWHRect(ax - 14 * k, ay - 4 * k, 28 * k, 24 * k), paint);
    paint.setColor(Skia.Color(shiftHex(accent, 30)));
    canvas.drawCircle(ax, ay - 10 * k, 10 * k, paint);
  }

  // English title, top-left on the body (long names use the smaller face).
  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color(INK));
  const f = book.name.length > 12 ? smallFont : font;
  canvas.drawText(book.name, 14 * k, 24 * k, textPaint, f);

  const image = surface.makeImageSnapshot();
  surface.dispose();
  return image;
}

/** Re-render a texture at 1x dp with a baked gaussian blur. */
function blurredVariant(sharp: SkImage, sigmaDp: number): SkImage {
  const surface = Skia.Surface.MakeOffscreen(COVER_W, COVER_H);
  if (!surface) throw new Error('offscreen surface failed');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setImageFilter(Skia.ImageFilter.MakeBlur(sigmaDp, sigmaDp, TileMode.Decal, null));
  canvas.drawImageRect(
    sharp,
    Skia.XYWHRect(0, 0, sharp.width(), sharp.height()),
    Skia.XYWHRect(0, 0, COVER_W, COVER_H),
    paint,
  );
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return image;
}

/** One shared soft drop shadow: blurred dark rounded rect with padding. */
function shadowTexture(): SkImage {
  const surface = Skia.Surface.MakeOffscreen(SHADOW_W, SHADOW_H);
  if (!surface) throw new Error('offscreen surface failed');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('rgba(0,0,0,0.42)'));
  paint.setImageFilter(Skia.ImageFilter.MakeBlur(11, 11, TileMode.Decal, null));
  canvas.drawRRect(
    Skia.RRectXY(
      Skia.XYWHRect(SHADOW_PAD, SHADOW_PAD + 8, COVER_W, COVER_H),
      4,
      4,
    ),
    paint,
  );
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return image;
}

export function buildCoverTextures(): CoverTextures {
  const t0 = Date.now();
  const books: CoverBook[] = BOOK_GROUPS.flatMap((g) =>
    g.bookSlugs.map((slug) => ({ slug, name: displayName(slug), group: g.name })),
  );

  const k = PixelRatio.get();
  const family = Platform.select({ ios: 'Georgia', default: 'serif' });
  const font = matchFont({ fontFamily: family, fontSize: 15 * k });
  const smallFont = matchFont({ fontFamily: family, fontSize: 12 * k });

  const sharp = books.map((b) => paintCover(b, k, font, smallFont));
  const soft = sharp.map((img) => blurredVariant(img, BLUR_SIGMA_SOFT));
  const softer = sharp.map((img) => blurredVariant(img, BLUR_SIGMA_SOFTER));
  const shadow = shadowTexture();

  const bytes = (img: SkImage) => img.width() * img.height() * 4;
  const textureBytes =
    [...sharp, ...soft, ...softer].reduce((sum, img) => sum + bytes(img), 0) + bytes(shadow);

  return { books, sharp, soft, softer, shadow, textureBytes, buildMs: Date.now() - t0 };
}
