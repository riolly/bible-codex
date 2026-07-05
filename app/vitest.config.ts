import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Vitest runs the framework-agnostic engine/model layer — plus the draw
// layer's PURE helpers — in plain Node: no RN runtime, no Skia (ADR-0008).
// Component tests run under jest-expo instead.
// scripts/ingest carries the golden corpus fixtures (#6, ADR-0010): pure-TS
// suites always run; the parse/roundtrip suites self-skip where the native
// tree-sitter / better-sqlite3 modules are unbuilt (CI ignore-scripts).
export default defineConfig({
  // Mirror the tsconfig `@/*` path alias (metro/babel resolve it in the app).
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: [
      'src/db/**/*.test.ts',
      'src/draw/**/*.test.ts',
      'src/engine/**/*.test.ts',
      'src/model/**/*.test.ts',
      'scripts/ingest/**/*.test.ts',
    ],
  },
});
