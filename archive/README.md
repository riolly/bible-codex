# archive — superseded artifacts (kept for history)

Nothing here is live. These files are preserved because they record where the model came from;
the active design lives in [`../schema.dbml`](../schema.dbml), [`../CONTEXT.md`](../CONTEXT.md),
[`../data-architecture.md`](../data-architecture.md), and [`../docs/adr/`](../docs/adr/).

## `BibleCodex.legacy.sql`

The original interlinear-only schema (a dbdiagram export). It had **no reading corpus** — no
per-translation token stream, no literary Blocks, no versification map — so it could not render a
beautiful page. It was the Phase-3 half only. The current model keeps its lexicon ideas (split and
cleaned into the Original Word hub + lexicon tier, see
[ADR-0007](../docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md))
and builds the entire reading half it lacked.

### Old `BibleCodex.sql` → new model (full mapping)

| Old table | New home | Verdict |
|---|---|---|
| `Indexes` | split → `original_word` (occurrence coord) + `interlinear_alignment` | conflated occurrence with gloss |
| `Words` | `original_word` form + `lemma` + parsing | was a form/lemma blend |
| `Words_Translations` | `gloss` (inline on `original_word`) | keep |
| `Strongs` | `strongs` (lexicon ref tier) | keep, move to reference schema |
| `Pos` | `morphology` (parse-code + decode table) | enums were a stub |
| `Prefixes` + `Word_Prefix` | morpheme segmentation (`original_word.segment_of` + `segment_index`) | resolved: sibling morpheme rows |
| `Books` / `Classes` / `Books_Classes` | `book` + genre/canon class | keep |
| — (missing) | `token`, `block`, `versification_map` | **the entire Phase-1 reading half the old SQL lacked** |

**Headline gap:** the old SQL has no reading-translation Token stream, no Blocks, no versification
map — it cannot render a beautiful page. It is the Phase-3 half only. Phase 1 builds the half it
was missing.
