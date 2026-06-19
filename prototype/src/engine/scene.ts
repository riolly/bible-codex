// The pure output of the layout engine: a flat set of draw commands in scene
// coordinates (origin at content top-left; the renderer applies scroll). No
// CanvasKit, no DOM. The renderer paints these in a fixed layer order.
import type { Anchor } from "../model/types";
import type { TextStyleSpec } from "./shaper";

export interface DrawWord {
  text: string;
  style: TextStyleSpec;
  x: number; // left
  y: number; // baseline
  color: string;
}

export interface DrawRule {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  /** an arrowhead at (x2,y2) — for Connectors. */
  arrow?: boolean;
  dash?: boolean;
}

export interface DrawRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  fill: boolean;
  radius?: number;
}

/** Soft halo under an earned Portal word. `intensity` 0..1 animates the glow. */
export interface DrawGlow {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  intensity: number;
}

export interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
  anchor: Anchor;
  ow?: string; // Original Word id, if this word links to the hub
}

export interface PortalHit {
  x: number;
  y: number;
  w: number;
  h: number;
  crossRefId: string;
}

/** A freehand Ink stroke (pen or highlighter). Points are in scene/content
 *  coordinates — Ink is glued to the layout it was drawn over (it does NOT
 *  reflow or port across translations, unlike anchored Markup). The store tags
 *  each stroke with the (scroll|translation|mode) it belongs to. */
export interface DrawStroke {
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

/** A resolved Note card (free text pinned near an Anchor in the margin). */
export interface DrawCard {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  border: string;
  words: DrawWord[];
}

export interface Scene {
  contentWidth: number;
  contentHeight: number;
  // layer order: glows → fills → highlighter-ink → words → pen-ink → cards →
  // rules(connectors/underlines) → portal markers
  glows: DrawGlow[];
  fills: DrawRect[];
  words: DrawWord[];
  cards: DrawCard[];
  rules: DrawRule[];
  /** user Ink (freehand). Injected after layout(); not produced by the engine. */
  strokes: DrawStroke[];
  // interaction
  hits: HitRect[];
  portals: PortalHit[];
}

export function emptyScene(): Scene {
  return {
    contentWidth: 0,
    contentHeight: 0,
    glows: [],
    fills: [],
    words: [],
    cards: [],
    rules: [],
    strokes: [],
    hits: [],
    portals: [],
  };
}
