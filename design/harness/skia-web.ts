/**
 * Web-Skia shim — the design-harness twin of app/src/draw/__visual__/skia-web.ts.
 * vite.config.ts aliases the bare `@shopify/react-native-skia` specifier here so
 * the PRODUCTION draw modules (page-picture, flow-paint, fonts-core, …) run
 * under CanvasKit in the browser — the SAME code that ships, different backend.
 *
 * It cannot be the app's shim verbatim: deep subpaths must resolve from
 * design/node_modules (pinned to the app's exact version) so Vite can prebundle
 * the CommonJS files for the browser. `Skia.web` builds its API from
 * `globalThis.CanvasKit`, which harness/boot.ts populates BEFORE any module
 * importing this shim is loaded (main.ts defers them via dynamic import).
 *
 * `useFonts` is a stub: flow-paint's CARDO re-export drags in the fonts.ts hook
 * module, but the hook itself never runs in the harness (fonts load via
 * harness/fonts.ts).
 */

export { Skia } from '@shopify/react-native-skia/lib/commonjs/skia/Skia.web';
export {
  FontEdging,
  FontHinting,
  FontSlant,
  FontStyle,
  FontWeight,
  FontWidth,
} from '@shopify/react-native-skia/lib/commonjs/skia/types/Font/Font';

export const useFonts = (): null => null;
