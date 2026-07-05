/**
 * Reading mode is DERIVED from device orientation — never a stored setting
 * (ADR-0016). Portrait = Codex (study), landscape = Scroll (journey). This is
 * the whole of the mode decision: one pure function of the viewport, so the
 * "no mode toggle, no `scroll_mode`" rule holds by construction.
 */

import type { Viewport } from './model';

export type ReadingMode = 'codex' | 'scroll';

/**
 * Landscape (wider than tall) reads as Scroll; portrait and square read as
 * Codex — upright is the study posture (ADR-0016), and a square tablet has no
 * "sideways" so it stays in the annotation-home mode.
 */
export function readingModeForViewport(viewport: Viewport): ReadingMode {
  return viewport.width > viewport.height ? 'scroll' : 'codex';
}
