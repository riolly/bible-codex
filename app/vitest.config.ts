import { defineConfig } from 'vitest/config';

// Vitest runs the framework-agnostic engine/model layer in plain Node — no RN
// runtime, no Skia (ADR-0008). Component tests run under jest-expo instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/engine/**/*.test.ts', 'src/model/**/*.test.ts'],
  },
});
