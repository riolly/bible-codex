# Annotations are a scripture-anchored scene graph, never canvas coordinates

User marks (Markup) form a small **scene graph** — `Mark` (decoration on words), `Note` (free user text), `Connector` (arrow/line) — modeled on Excalidraw/tldraw bindings: a Connector endpoint, or a Note's pin, binds to its target via a separate **Binding** record, so any element can be a target (e.g. an arrow from a Token to a Note). But unlike a whiteboard, **no element stores absolute canvas coordinates**: every position resolves from a canonical scripture **Anchor** (plus an offset for free-placed Notes), computed at render time.

The inversion is the whole point. A whiteboard's substrate never moves, so absolute coordinates are safe. Our substrate reflows (font change), re-paginates (scroll-mode switch), and is replaced (translation change). Absolute coordinates would orphan every mark; scripture anchoring keeps them alive and portable.

## Considered options

- **Absolute-canvas-coordinate model** (Excalidraw/tldraw default) — rejected: the text substrate is not static, so stored pixel positions break on the first reflow, scroll-mode switch, or translation change.

## Consequences

- A Connector ports across translations only if **both** endpoints resolve there (Token endpoints need Original-Word alignment; otherwise fall back to verse grain or hide).
- **Design now, build later:** the seam (`Endpoint = Anchor | element`, separate `Binding` records) is in the data model from day one; the editor ships in phases — `Mark` first, then `Note`, then `Connector` — all after the read + scroll surface.
- What we steal from Excalidraw/tldraw: `boundElements` back-references, normalized-anchor + gap, intentional binding (only on endpoint drag), bindings as first-class records. What we invert: the coordinate source of truth.
- **The Anchor is a reused column-group, in two shapes (#5/#8).** There is no shared `anchor` table; the coordinate is inlined per host (`mark.target_*`, `note.pin_*`, `binding.anchor_*`) and reused verbatim by Phase-4 anchored entities (`cross_reference`, `tag`). A **Mark** is a **range** anchor — `verse_end` + `word_index_end` let one mark span a phrase, *including across a verse boundary* (the old single-verse `word_count` could not). A **Note** pin and a **Connector** endpoint are **points** (no range fields). User-mark anchors are **translation-bound**; **editorial** anchors (Original Word hub, Cross-reference) are **canonical-only** — Phase-4 cross-references must not carry a translation.
- **Headings are not anchorable in v1 (#2):** heading Tokens carry `verse = NULL`, and an Anchor requires a verse, so titles/section headings can't be marked. Deliberate scope, not an accident; a block-grain heading anchor is deferred-additive (new nullable columns, no migration) — the same "design the seam, build later" pattern as `ow_id`.
