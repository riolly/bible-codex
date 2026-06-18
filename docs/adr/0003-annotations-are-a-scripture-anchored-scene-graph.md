# Annotations are a scripture-anchored scene graph, never canvas coordinates

User marks (Markup) form a small **scene graph** — `Mark` (decoration on words), `Note` (free user text), `Connector` (arrow/line) — modeled on Excalidraw/tldraw bindings: a Connector endpoint, or a Note's pin, binds to its target via a separate **Binding** record, so any element can be a target (e.g. an arrow from a Token to a Note). But unlike a whiteboard, **no element stores absolute canvas coordinates**: every position resolves from a canonical scripture **Anchor** (plus an offset for free-placed Notes), computed at render time.

The inversion is the whole point. A whiteboard's substrate never moves, so absolute coordinates are safe. Our substrate reflows (font change), re-paginates (scroll-mode switch), and is replaced (translation change). Absolute coordinates would orphan every mark; scripture anchoring keeps them alive and portable.

## Considered options

- **Absolute-canvas-coordinate model** (Excalidraw/tldraw default) — rejected: the text substrate is not static, so stored pixel positions break on the first reflow, scroll-mode switch, or translation change.

## Consequences

- A Connector ports across translations only if **both** endpoints resolve there (Token endpoints need Original-Word alignment; otherwise fall back to verse grain or hide).
- **Design now, build later:** the seam (`Endpoint = Anchor | element`, separate `Binding` records) is in the data model from day one; the editor ships in phases — `Mark` first, then `Note`, then `Connector` — all after the read + scroll surface.
- What we steal from Excalidraw/tldraw: `boundElements` back-references, normalized-anchor + gap, intentional binding (only on endpoint drag), bindings as first-class records. What we invert: the coordinate source of truth.
