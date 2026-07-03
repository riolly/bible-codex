// Mocked user marks for the prototype. Per ADR 0003 every element resolves its
// position from a scripture Anchor (plus an offset for free-placed Notes) at
// render time — NEVER canvas coordinates. That is what lets these reflow when
// the font, scroll-mode, or translation changes. None of this is persisted; it
// is hand-placed to demonstrate the scene graph.
import type { Anchor } from "./types";

/** A decoration bound to a span of words (Mark, CONTEXT.md). The Portal is a
 *  Mark with `portal` set: shown dim until earned, then glowing + tappable. */
export interface MockMark {
  id: string;
  kind: "underline" | "highlight" | "box";
  /** inclusive word span — `from` and `to` are canonical word anchors. */
  from: Anchor;
  to: Anchor;
  color: string;
}

/** One end of a Connector — binds to an Anchor or another element's id, never
 *  to pixels. */
export type Endpoint = { kind: "anchor"; anchor: Anchor } | { kind: "note"; noteId: string };

/** Free text pinned to an Anchor plus a margin offset (Note, CONTEXT.md). */
export interface MockNote {
  id: string;
  anchor: Anchor; // the word it hangs off
  side: "left" | "right"; // which margin
  text: string;
}

/** An arrow/line joining two Endpoints; re-routes when either end moves. */
export interface MockConnector {
  id: string;
  from: Endpoint;
  to: Endpoint;
}

export interface MockStudyLayer {
  marks: MockMark[];
  notes: MockNote[];
  connectors: MockConnector[];
}
