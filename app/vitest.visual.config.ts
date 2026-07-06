import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Visual goldens (Phase 1): render the production draw layer under CanvasKit in
// node and diff against committed baselines. Kept in its OWN config — separate
// from vitest.config.ts (the fast pure-TS unit run) — so the wasm load never
// slows unit tests. Same config backs the regression gate (goldens.test.ts) and
// the gallery (gallery.test.ts); `pnpm test:visual` / `pnpm gallery` select by
// filename filter.
export default defineConfig({
  resolve: {
    alias: [
      // Mirror the tsconfig `@/*` alias.
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // Swap the RN Skia native entry for the CanvasKit web backend. Exact-match
      // only (regex-anchored) so the shim's own deep subpath imports pass through.
      {
        find: /^@shopify\/react-native-skia$/,
        replacement: fileURLToPath(new URL('./src/draw/__visual__/skia-web.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'node',
    globals: true, // jest-image-snapshot registers via expect.extend
    setupFiles: ['./vitest.setup.visual.ts'],
    include: ['src/draw/__visual__/**/*.test.ts'],
    testTimeout: 30_000, // CanvasKit load + render
  },
});
