// The ONE seam that makes Phase 2 cheap (handoff): the layout engine depends on
// this interface, not on CanvasKit. A CanvasKit implementation lives in
// src/canvaskit/; an RN-Skia implementation would slot in unchanged. No Skia
// type may appear in this file.

export interface TextStyleSpec {
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  letterSpacing?: number; // for heading tracking; affects measurement too
}

export interface WordMetrics {
  width: number;
  ascent: number; // distance from baseline up (positive)
  descent: number; // distance from baseline down (positive)
}

/** Measures a single shaped run (a word/chunk). Implementations must handle
 *  Latin, polytonic Greek, and pointed Hebrew (Cardo covers all three). */
export interface TextShaper {
  measure(text: string, style: TextStyleSpec): WordMetrics;
}
