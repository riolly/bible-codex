// CanvasKit bootstrap — the ONLY place the wasm is loaded and the GPU surface is
// made. Everything Skia-specific is funnelled through here so the rest of the app
// can stay framework-agnostic (see ADR / handoff: Phase 2 ports this layer to
// @shopify/react-native-skia and nothing else).
import CanvasKitInit, { type CanvasKit, type Surface, type FontMgr } from "canvaskit-wasm";
import canvaskitWasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

// Served from public/ at the site root — plain paths, not bundler ?url imports.
const cardoRegularUrl = "/fonts/Cardo-Regular.ttf";
const cardoBoldUrl = "/fonts/Cardo-Bold.ttf";
const cardoItalicUrl = "/fonts/Cardo-Italic.ttf";

export interface Booted {
  CK: CanvasKit;
  surface: Surface;
  /** A FontMgr holding the Cardo family (Latin + polytonic Greek + Hebrew). */
  fontMgr: FontMgr;
  canvas: HTMLCanvasElement;
  dpr: number;
}

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

export async function boot(canvasId: string): Promise<Booted> {
  const CK = await CanvasKitInit({ locateFile: () => canvaskitWasmUrl });

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  resizeBacking(canvas, dpr);

  const surface = makeSurface(CK, canvas);

  const [reg, bold, ital] = await Promise.all([
    fetchFont(cardoRegularUrl),
    fetchFont(cardoBoldUrl),
    fetchFont(cardoItalicUrl),
  ]);
  const fontMgr = CK.FontMgr.FromData(reg, bold, ital)!;

  return { CK, surface, fontMgr, canvas, dpr };
}

// A WebGL surface is bound to the canvas's drawing-buffer size at creation, so
// it must be remade whenever the backing store changes (resize / rotation).
// GPU first; CPU fallback so a bad GL context still proves the text path.
export function makeSurface(CK: CanvasKit, canvas: HTMLCanvasElement): Surface {
  const surface = CK.MakeWebGLCanvasSurface(canvas) ?? CK.MakeSWCanvasSurface(canvas);
  if (!surface) throw new Error("Could not make a CanvasKit surface");
  return surface;
}

export function resizeBacking(canvas: HTMLCanvasElement, dpr: number) {
  const cssW = canvas.clientWidth || window.innerWidth;
  const cssH = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}
