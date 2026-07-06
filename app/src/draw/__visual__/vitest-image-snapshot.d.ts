// Teach vitest's expect about jest-image-snapshot's matcher (registered in
// vitest.setup.visual.ts via expect.extend).
import 'vitest';
import type { MatchImageSnapshotOptions } from 'jest-image-snapshot';

declare module 'vitest' {
  interface Assertion {
    toMatchImageSnapshot(options?: MatchImageSnapshotOptions): void;
  }
  interface AsymmetricMatchersContaining {
    toMatchImageSnapshot(options?: MatchImageSnapshotOptions): void;
  }
}
