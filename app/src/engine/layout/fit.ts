/**
 * Viewport fitting (ADR-0016 pillar 2): rotation and device change are
 * VIEWING operations on a fixed Page canvas — never a re-typeset. This is the
 * only place Codex mode touches the viewport.
 */

import type { PageLayout, Viewport } from './model';

/** How a fixed Page canvas maps onto one device viewport. */
export interface PageFit {
  /**
   * Device-independent points per em: multiply any em coordinate of the Page
   * model by this to get its on-screen position. Derived from the viewport —
   * the preset's fontSize is the design-time nominal, not the display truth.
   */
  readonly scale: number;
  /** Letterbox origin of the page canvas within the viewport, in dp. */
  readonly offsetX: number;
  readonly offsetY: number;
}

export function fitPageToViewport(page: PageLayout, viewport: Viewport): PageFit {
  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error(`viewport must be positive, got ${viewport.width}×${viewport.height}`);
  }

  // Fill the viewport width with the TEXT FRAME (left margin + measure + right
  // margin), not the full canvas — the Margin rail is parked outside the frame
  // and letterboxes off the right edge. This keeps the reading size and the
  // symmetric margins constant across orientations: in portrait the rail would
  // otherwise steal a slab of width, shrinking the text and shoving the column
  // left. `page.rail.x` is exactly where the frame ends and the rail begins.
  // A chapter taller than the screen scrolls WITHIN the page (pillar 3), so
  // height never constrains the scale.
  const frameWidth = page.rail.x;
  const scale = viewport.width / frameWidth;
  const pageHeightDp = page.canvas.height * scale;

  return {
    scale,
    // The frame fills the width at x=0; its two margins are symmetric by
    // construction and the rail spills past the right edge (clipped).
    offsetX: 0,
    // Shorter-than-viewport pages sit centered between letterbox bands;
    // taller ones start at the top and scroll internally.
    offsetY: pageHeightDp < viewport.height ? (viewport.height - pageHeightDp) / 2 : 0,
  };
}
