# bible-codex — Data Architecture

> The **shape** of the data: four phase schemas and the two bridges between them, plus the seams
> that let later phases bolt on without migration. This doc is a **map** — it does not restate
> table columns nor the decisions behind them.
>
> - **Table shapes (source of truth):** [`schema.dbml`](schema.dbml)
> - **Vocabulary (every term, incl. the Anchor):** [`CONTEXT.md`](CONTEXT.md)
> - **The "why" of each choice:** [`docs/adr/`](docs/adr/)
> - **Status + roadmap + live open questions:** [`OVERVIEW.md`](OVERVIEW.md)

---

## 1. The shape: four schemas, two bridges

Not one tree. Four loosely-coupled schemas that touch only through **two bridges** — the
**Canonical Verse** (coarse, passage grain) and the **Original Word hub** (fine, word grain).

```
 PHASE 1                       PHASE 2                       PHASE 3
 ┌────────────────────┐        ┌────────────────────┐       ┌─────────────────────────┐
 │ READING schema     │        │ ANNOTATION schema  │       │ ORIGINAL + LEXICON       │
 │ (per translation)  │        │ (user data, synced)│       │ (shared hub + reference) │
 │                    │        │                    │       │                          │
 │ Translation        │        │ Markup:            │       │ OriginalWord (occurrence)│
 │ Book               │        │   Mark / Note /    │       │   ── lemma_id ──┐        │
 │ Block (genre)      │        │   Connector /      │       │   ── strong_id ─┤        │
 │ Token ─────────┐   │        │   Binding / Layer  │       │   ── parsing    │        │
 │ CanonicalVerse │   │        │ Ink:               │       │                 ▼        │
 │ VersificationMap│  │        │   InkAnnotation /  │       │ Lexicon (ref DB):        │
 └──────┬─────────┼───┘        │   InkStroke        │       │   Lemma / Root /         │
        │         │            └─────────┬──────────┘       │   Strongs / Morphology / │
        │         │                      │                  │   SemanticDomain         │
        │  Anchor (coord)  ◄─────────────┘                  └────────────┬─────────────┘
        │         │   every mark resolves from an Anchor                 │
        │         └──── interlinear alignment (N Tokens → 1 OriginalWord)┘
        │
 PHASE 4: PROGRESS schema (journey state, tags, cross-references, portal gates)
          rides Anchor + Cross-reference; adds no new bridge.
```

**Why this shape (locked):**
- **Translations are spokes, never linked token-to-token.** A KJV Token and a BSB Token are
  different objects; they relate only transitively, through the Canonical Verse (coarse) or the
  Original Word (fine). → [ADR-0001](docs/adr/0001-three-layer-anchor-model.md).
- **Everything user-created resolves from an Anchor, never pixels.** →
  [ADR-0003](docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md).
- **The lexicon is reference data in its own tier, joined by string relation** — so Strong's /
  BDB / Thayer can be re-sourced or versioned without touching the corpus. →
  [ADR-0007](docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md).

---

## 2. The two bridges + the Anchor seam

- **Canonical Verse** (coarse) — the cross-translation passage key, in the single chosen
  versification (av11n); reconciled to each translation's native numbering by `versification_map`.
- **Original Word hub** (fine, word grain) — interlinear alignment (N Tokens → 1 Original Word);
  the `ow_id` seam each anchored entity carries.
- **The Anchor** — the spine every later phase hangs on. A **coordinate**
  (`translation? · book · chapter · verse · word_index? · range? · ow_id?`), never a DB id, so the
  corpus stays freely re-ingestable. Defined once in [CONTEXT.md](CONTEXT.md) (vocabulary) +
  [`schema.dbml`](schema.dbml) (columns). Its `ow_id` field is the **cross-phase seam**: present
  from Phase 1, empty through Phase 2, filled in Phase 3 — word-grain Markup ports across
  translations by *verse* grain until the hub lights up, then by *word* grain, with **no
  migration**.

---

## 3. Phase → tables index (what lands when)

Each schema is **architected now but built and populated only when its phase arrives**
([ADR-0005](docs/adr/0005-four-product-phases-design-all-build-in-order.md)). Columns live in
[`schema.dbml`](schema.dbml); this is just the index.

| Phase | Tables (in `schema.dbml`) | Decisions |
|---|---|---|
| **P1** reading + layout | `translation` · `book` · `block` · `token` · `versification_map` · `reading_settings` · `layout_preset` · `layout_override` | [ADR-0001](docs/adr/0001-three-layer-anchor-model.md), [ADR-0004](docs/adr/0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md) |
| **P2** annotations | `layer` · `mark` · `note` · `connector` · `binding` · `ink_annotation` · `ink_stroke` | [ADR-0002](docs/adr/0002-two-annotation-classes-markup-first.md), [ADR-0003](docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md), [ADR-0006](docs/adr/0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md) |
| **P3** OW hub + lexicon | `original_word` · `interlinear_alignment` · `lemma` · `strongs` · `morphology` | [ADR-0007](docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md) |
| **P4** progress / advanced | *(none yet)* — Cross-reference / tags / journey state ride Anchor; add no bridge | [WISHLIST.md](WISHLIST.md) |

The legacy interlinear-only `BibleCodex.sql` and its old→new table mapping are archived at
[`archive/`](archive/README.md).

---

## 4. The seams that bolt on without migration

Designed in now, populated later — each is additive (a new nullable column / table), never a
corpus or anchor migration:

- **`ow_id`** on `token` / `mark` / `note` / `binding` — null until Phase 3 populates the hub.
- **Block-grain heading anchor** — headings carry `verse = NULL` and are not anchorable in v1; a
  block-grain anchor is a future additive column-group ([CONTEXT.md](CONTEXT.md) "Anchor").
- **Versification split/merge** — `versification_map` is sparse pair-mapping now; reshaping it for
  clean splits/merges (Hebrew/LXX) is reversible because anchors store the canonical verse directly
  and the map is rebuildable corpus data. *(Still unvalidated — see [OVERVIEW.md §5](OVERVIEW.md).)*
- **Lexicon depth** — `lexicon_entry` (BDB/Thayer), `root` (Hebrew), `semantic_domain` (Louw–Nida)
  hang off `lemma` later.
- **Alignment metadata** — `is_primary` / `confidence` / `relation_type` are additive on the bare
  `interlinear_alignment` junction when a source supplies them.

---

## 5. What's locked vs reversible (don't bikeshed the reversible)

**Locked (migration-fatal) — [OVERVIEW.md §4](OVERVIEW.md):**
1. Anchor addressing by **coordinate** (verse + word-index + optional Original-Word id), never DB id.
2. Corpus = per-translation **Token stream + Block overlays** from USFM.
3. Annotations = a **scripture-anchored scene graph**, never canvas coords.

**Reversible — defer freely:** layout-adjust cascade depth, lexicon table shapes, morphology
storage, segmentation model, sync backend, semantic-domain layer, all of Phase 4.
