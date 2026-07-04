/**
 * Internal-overflow scroll math (ADR-0016 pillar 3) — pure, vitest-covered.
 * A native ScrollView drives the scroll (its physics are the point); this
 * sizes its content so the scrollable range is EXACTLY the page's overflow.
 * All values in dp.
 */

/** The scrollable overflow of a page beyond the viewport (0 when it fits). */
export function maxScroll(pageHeightDp: number, viewportHeightDp: number): number {
  'worklet';
  return Math.max(0, pageHeightDp - viewportHeightDp);
}
