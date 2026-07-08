/**
 * Browser mirror of app/src/draw/__visual__/harness.ts `loadHeadlessFonts`:
 * fetch the app's bundled Cardo faces, register them into a Skia provider, and
 * assemble DrawFonts through the SHARED measure core (drawFontsFromTypeface) —
 * so layout metrics in the harness are identical to on-device and goldens.
 */

import { Skia } from '@shopify/react-native-skia';

import { CARDO, drawFontsFromTypeface, type DrawFonts } from '@app/draw/fonts-core';

import boldUrl from '../../app/assets/fonts/Cardo-Bold.ttf?url';
import italicUrl from '../../app/assets/fonts/Cardo-Italic.ttf?url';
import regularUrl from '../../app/assets/fonts/Cardo-Regular.ttf?url';

const FACES: readonly { name: string; url: string; regular?: boolean }[] = [
  { name: 'Cardo-Regular.ttf', url: regularUrl, regular: true },
  { name: 'Cardo-Bold.ttf', url: boldUrl },
  { name: 'Cardo-Italic.ttf', url: italicUrl },
];

export async function loadDesignFonts(): Promise<DrawFonts> {
  const provider = Skia.TypefaceFontProvider.Make();
  let regular: ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData> = null;
  for (const face of FACES) {
    const res = await fetch(face.url);
    if (!res.ok) throw new Error(`font fetch failed: ${face.name} (${res.status})`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(bytes));
    if (!typeface) throw new Error(`font load failed: ${face.name}`);
    provider.registerFont(typeface, CARDO);
    if (face.regular) regular = typeface;
  }
  if (!regular) throw new Error(`"${CARDO}" regular face missing`);
  return drawFontsFromTypeface(provider, regular);
}
