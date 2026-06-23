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
