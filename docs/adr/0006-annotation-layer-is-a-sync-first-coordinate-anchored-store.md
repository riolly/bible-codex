# The Phase-2 annotation layer is a sync-first, coordinate-anchored store

The Phase-2 user layer (Markup + Ink) is local-first and synced across one user's devices, edited offline. That forces storage choices that diverge sharply from the read-only Phase-1 corpus, so they are pinned here. ADR-0003 fixed the *conceptual* model (a scripture-anchored scene graph, never canvas coords); this ADR fixes the *storage* shape it lands in. Resolved across a focused grill (Q1–Q7) and recorded in [`schema.dbml`](../../schema.dbml).

The decisions:

1. **Primary keys are client-generated text UUIDv7, not autoincrement.** Offline creation on multiple devices can't collide, and a row owns its identity before it ever reaches a server. v7 is time-sortable → free created-order and good index locality.
2. **The layer never foreign-keys into the corpus.** Anchors join the corpus by stable *coordinate* — translation abbrev + `book.slug` + chapter + verse + word_index — extending [ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md) so a corpus re-ingest that renumbers integer pks orphans nothing. Only within-layer relationships (`layer`, `connector`→`binding`, `ink_annotation`→`ink_stroke`) are real FKs.
3. **Deletes are soft-delete tombstones.** Every row carries `created_at`/`updated_at`/`deleted_at` (epoch ms). A hard `DELETE` can't propagate to an offline device; a tombstone can, and it doubles as undo.
4. **Connector endpoints are first-class `binding` rows** (per ADR-0003) with a polymorphic target — a scripture coordinate *or* an element id (`mark`|`note`) — and a `(target_kind, target_element_id)` back-reference index so element delete/cascade is one index hit. A "Token target" is just a scripture anchor with `word_index` set, not a distinct target kind.
5. **Ink is opaque and layout-bound.** Stroke points are a packed `Float32` BLOB (never per-point rows or JSON); Ink binds to a layout by coordinate + `(translation, scroll_mode)` + `layout_hash`, never a `block` id or pixels.

## Considered options

- **Autoincrement integer pks (like the corpus)** — rejected: collide across offline devices, and a row has no identity until a server assigns one.
- **Foreign-key the annotation layer into the corpus by integer id** — rejected: a re-ingest renumbers corpus pks and orphans every mark; violates ADR-0004. Coordinate joins are re-ingest-safe.
- **Hard deletes** — rejected: don't survive offline sync (the other device never learns the row is gone), and there's no undo.
- **Ink points as one-row-per-point, or as JSON** — rejected: millions of rows / 3–5× bloat for data that is never queried point-by-point; strokes are replayed whole.
- **Inline connector endpoints (no `binding` table)** — rejected: loses the documented back-reference and turns element-delete cleanup into an `OR` scan; reintroduces an entity ADR-0003 deliberately made first-class.

## Consequences

- The annotation DB is self-contained (UUID FKs only) and resolves against the corpus purely by coordinate at render — corpus and user layer version independently.
- A sync backend (PowerSync/Electric) gets last-write-wins-friendly rows (`updated_at`) and tombstones; **no CRDT** (locked).
- Word-target marks and bindings carry `ow_id` null until Phase 3, porting by verse grain meanwhile ([ADR-0005](0005-four-product-phases-design-all-build-in-order.md)).
- The same lifecycle convention (`created_at`/`updated_at`/`deleted_at`) should fold back onto the Phase-1 presentation tables (`reading_settings`, `layout_preset`, `layout_override`), which are also synced user data — currently a gap, out of scope for this ADR.
