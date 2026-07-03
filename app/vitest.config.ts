import { defineConfig } from 'vitest/config';

// Vitest runs the framework-agnostic engine/model layer in plain Node — no RN
// runtime, no Skia (ADR-0008). Component tests run under jest-expo instead.
// scripts/ingest carries the golden corpus fixtures (#6, ADR-0010): pure-TS
// suites always run; the parse/roundtrip suites self-skip where the native
// tree-sitter / better-sqlite3 modules are unbuilt (CI ignore-scripts).
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/engine/**/*.test.ts',
      'src/model/**/*.test.ts',
      'scripts/ingest/**/*.test.ts',
    ],
  },
});
