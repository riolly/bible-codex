/**
 * THROWAWAY SPIKE (#47, ADR-0020) — dies after the device verdict.
 *
 * Ring pose math ported from prototypes/library-nav-carousel `drawStage()`
 * (branch prototype/library-nav-carousel). The numeric constants ARE the
 * locked motion model tuned in the 2026-07-05 design session — port them
 * verbatim, do not "improve" them here. (The prototype README's prose summary
 * rounds a few of them; the drawStage() code is the truth.)
 */

/** Covers beyond this ring offset are fully faded out (and skipped in CSS). */
export const VISIBLE_RANGE = 4.5;

/** Drag divisor: one book per this many pixels of horizontal drag. */
export const DRAG_PX_PER_BOOK = 86;

/** Cover size in dp (prototype BW/BH). */
export const COVER_W = 128;
export const COVER_H = 172;

/** Pre-blurred variant sigmas in dp — cross-fade targets for the blur ramp. */
export const BLUR_SIGMA_SOFT = 1.3;
export const BLUR_SIGMA_SOFTER = 2.6;

export interface RingPose {
  /** Horizontal offset from ring center, dp. */
  readonly tx: number;
  /** Downward arc drop, dp. */
  readonly arc: number;
  /** rotateY, degrees. */
  readonly ry: number;
  /** skewY, degrees. */
  readonly sk: number;
  readonly scale: number;
  /** Target gaussian blur, dp — drives the pre-blurred cross-fade. */
  readonly blur: number;
  readonly op: number;
}

/** Pose of a cover sitting at ring offset `o` (0 = hero, ±1 = sharp trio…). */
export function ringPose(o: number): RingPose {
  'worklet';
  const ao = Math.abs(o);
  const txmag = 170 * Math.min(ao, 1) + 116 * Math.max(0, ao - 1);
  const tx = (o === 0 ? 0 : o < 0 ? -1 : 1) * txmag;
  const arc = Math.pow(ao, 1.5) * 7;
  const ry = Math.max(-46, Math.min(46, -o * 15));
  const sk = Math.max(-10, Math.min(10, o * 3.2));
  const scale = ao <= 1 ? 1.14 - 0.22 * ao : 0.92 + 0.2 * (ao - 1);
  const blur = ao < 1.7 ? 0 : Math.min((ao - 1.7) * 1.5, 2.6);
  const op =
    ao <= 4 ? Math.max(0.8, 1 - Math.max(0, ao - 2) * 0.08) : Math.max(0, (VISIBLE_RANGE - ao) / 0.5);
  return { tx, arc, ry, sk, scale, blur, op };
}

/** Book index shown by slot `slot` when the ring center sits at `center`. */
export function bookAtSlot(center: number, slot: number, n: number): number {
  'worklet';
  const i = (Math.round(center) + slot) % n;
  return i < 0 ? i + n : i;
}
