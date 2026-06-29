# Reading presentation is a rules layer; computed layout is ephemeral

Reading presentation is stored as a small **rules** layer — a global `reading_settings`
(scroll mode, theme) plus a `layout_preset` / `layout_override` typography cascade — that binds
to the corpus **only by stable semantic keys** (`genre`, `role`, `book.slug`, canonical
coordinate), never by `token.id` and never by pixels. The **computed layout** (line breaks,
per-token rects) is a **derived, rebuildable, local cache** — never synced and never the source
of truth. This keeps presentation tiny, syncable, and alive across corpus re-ingest, font
changes, and translation switches, exactly as `CONTEXT.md` requires data and presentation to be
separable.

## Considered options

- **Persist computed layout** (per-token positions / line breaks) for fast cold-open — rejected:
  it is a function of viewport + font, the engine re-typesets a full chapter at ~120fps
  (prototype-proven), and storing pixel positions reproduces the orphaning that
  [ADR-0003](0003-annotations-are-a-scripture-anchored-scene-graph.md) forbids.
- **Key presentation rows by `token.id`** — rejected: the corpus is freely re-ingestable
  ([ADR-0001](0001-three-layer-anchor-model.md)), which renumbers ids and would orphan every
  rule. Semantic keys survive re-ingest (poetry is still poetry).
- **EAV override** (`property_name` / `property_value`) — rejected: the knob set is small and
  fixed, so typed nullable columns give validation and simpler queries without stringly-typed
  soup.

## Consequences

- Presentation syncs as tiny structured rows and survives reflow, scroll-mode switch, and
  translation change — no migration.
- Cold-open re-typesets from corpus + rules. Accepted given engine speed. **If** a profiler ever
  demands it, a computed-layout cache may be added **locally** keyed by
  `(translation, book, chapter, preset_hash, font, viewport_class)` and invalidated on any input
  change — strictly a cache, never truth, never synced.
- Override resolution precedence is `base preset < genre < role < book` (most specific wins);
  `scroll_mode` and `theme` are global, not part of the cascade.
- **Computed layout is a pure function of `(rules + corpus + viewport)`** — so the engine is
  **viewport-parametric from Phase 1**: it re-typesets correctly on tablet rotation
  (portrait⇄landscape) and across device sizes (iPad ≠ Android tablet) with no special-casing. This
  is required even on a single device and is the same property that lets settings **port across
  devices by construction** when sync arrives ([ADR-0009](0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md)):
  a second device recomputes layout for its own viewport from the same rules — there is never any
  multi-device layout code.
- **Adjustable layout magnitudes are stored in relative / scalable units** (e.g. `em`, fraction of
  measure, character-count), **never absolute pixels** — so a preset tuned on one device or
  orientation stays sane on another. Storing raw px would re-introduce the device-coupling this rules
  layer exists to avoid. (The unit choice is a Phase-1 engine decision; the *cascade depth* remains
  reversible.)
