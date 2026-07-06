/**
 * Visual regression gate (Phase 1d). Every case in the shared matrix is rendered
 * headless and pixel-diffed against a committed baseline. A layout/paint change
 * that shifts pixels fails here with a `*-diff.png` the agent can Read.
 *
 * Update baselines after an intended visual change: `pnpm test:visual:update`,
 * then eyeball the new PNGs (or the gallery montage) before committing them.
 */

import { describe, expect, it } from 'vitest';

import { loadHeadlessFonts, visualCases } from './scenes';

describe('visual goldens', () => {
  const fonts = loadHeadlessFonts();

  for (const scene of visualCases()) {
    it(scene.id, () => {
      const png = scene.render(fonts);
      expect(png).toMatchImageSnapshot({
        customSnapshotIdentifier: scene.id,
        // The CanvasKit-wasm renderer is deterministic (identical reruns diff to
        // zero), so goldens are exact. If CI on another OS shows benign AA
        // speckle, switch to a small pixel floor rather than raising this blind.
        failureThreshold: 0,
        failureThresholdType: 'pixel',
      });
    });
  }
});
