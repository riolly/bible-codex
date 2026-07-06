/**
 * Web-Skia shim for headless goldens (Phase 1). vitest.visual.config.ts aliases
 * the bare `@shopify/react-native-skia` specifier to this file so production
 * draw modules (page-picture, flow-paint, fonts-core, …) run under CanvasKit in
 * node — the SAME code that ships, just a different Skia backend. Only runtime
 * values are re-exported here; the packages' TYPES are `import type` in callers
 * and elide at transpile, so they need no runtime home.
 *
 * `Skia.web` builds its API from `global.CanvasKit`, which vitest.setup.visual
 * populates via LoadSkiaWeb() before any test module (and thus this shim) loads.
 * The deep subpaths below are NOT the aliased specifier, so they resolve to the
 * real package.
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
