/**
 * CanvasKit bootstrap — populates `globalThis.CanvasKit` so the web-Skia shim
 * (skia-web.ts) can build its API at module-evaluation time. Anything that
 * imports the shim (directly or via app draw modules) must load AFTER this
 * resolves — main.ts enforces that with dynamic imports.
 */

import CanvasKitInit from 'canvaskit-wasm/bin/full/canvaskit';
import wasmUrl from 'canvaskit-wasm/bin/full/canvaskit.wasm?url';

export async function bootCanvasKit(): Promise<void> {
  const g = globalThis as { CanvasKit?: unknown };
  if (g.CanvasKit) return;
  g.CanvasKit = await CanvasKitInit({ locateFile: () => wasmUrl });
}
