import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// The design harness runs the PRODUCTION draw layer (app/src/draw) under
// CanvasKit in the browser — the same trick as app/vitest.visual.config.ts,
// so a design variant is pixel-identical to what ships. Skia deps are pinned
// in design/package.json to the app's exact versions.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Skia.web.js reads `global.CanvasKit` (node idiom) — map it to the browser global.
  define: { global: 'globalThis' },
  resolve: {
    alias: [
      // Swap the RN Skia native entry for the CanvasKit web backend. Exact-match
      // only (regex-anchored) so the shim's own deep subpath imports pass through
      // and resolve from design/node_modules (prebundle-able CommonJS).
      { find: /^@shopify\/react-native-skia$/, replacement: here('./harness/skia-web.ts') },
      // App source, imported straight from the tree — no build step, no copy.
      { find: '@app', replacement: here('../app/src') },
    ],
  },
  server: {
    fs: {
      // Serve app sources + bundled fonts from outside the Vite root.
      allow: [here('..')],
    },
  },
  optimizeDeps: {
    include: [
      'canvaskit-wasm/bin/full/canvaskit',
      '@shopify/react-native-skia/lib/commonjs/skia/Skia.web',
      '@shopify/react-native-skia/lib/commonjs/skia/types/Font/Font',
      'react',
    ],
  },
});
