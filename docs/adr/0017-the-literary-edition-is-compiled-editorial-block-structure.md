# The literary edition is compiled editorial block structure

Literary formatting (BibleProject-style poetic lineation, indentation cascades, inserted literary
headings, pericope-grain pages — e.g. Gen 2:1–3 belonging with Genesis 1) ships as a **curated
editorial edition**, not a user-facing text editor. It is a **second block structure** compiled
into the corpus DB at ingest ([ADR-0010](0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md))
from per-book sidecar files (`data/literary/<book>.json`), authored in a **dev-only in-app
editor** that live-previews and exports the sidecar.

The shape:

1. **Two block sets, one token stream.** New corpus tables `literary_block` (+ `literary_page`);
   `token` gains a nullable `literary_block_id` beside `block_id`. The renderer picks a block set
   per `reading_settings.textEdition` (`'usfm' | 'literary'`) — a chapter-load switch, **no
   runtime transform in release builds**. Inserted literary headings become real heading
   blocks/tokens at ingest (`verse = NULL`, not anchorable — the standing heading rule).
2. **The literary page is the Page** (amends [ADR-0016](0016-codex-and-scroll-are-purpose-bound-reading-modes.md)
   pillar 3). In the literary edition a Page is a curated verse range that may cross chapter
   boundaries (Creation = Gen 1:1–2:3); flip navigation moves between literary pages. A
   **discreet margin chapter marker** shows at swallowed chapter starts. Books without curated
   data fall back to chapter-pages inside the literary edition.
3. **Block-grain vocabulary only (v1):** re-genre (prose ↔ poetry), indent level, split/merge
   blocks, insert heading, assign role, group pages, plus two **ornament ops** (added by
   [ADR-0018](0018-typography-is-shipped-preset-personalities.md)): **versal placement** (a
   significant narrative turn — Noah, Abraham; the default versal is book-start only) and
   **section break** (a divider before a block). Ornament *placement* is editorial (this
   edition); ornament *style* is typographic (the preset). Span-grain emphasis
   (bold/italic/color on word ranges) is **deferred** — recorded in `WISHLIST.md` — because
   word-grain coordinates are translation-bound (double curation) and it duplicates
   Mark-rendering machinery.
4. **Sub-verse split points are translation-bound, and the data says so.** Verse-grain ops are
   canonical (one sidecar serves KJV and BSB); a mid-verse split carries a **per-translation
   word-index map** (`{verse, at: {KJV: n, BSB: m}}`). A translation with no authored split
   falls back to the **unsplit** block (still re-genred/indented). Same physics as user-mark
   anchors (CONTEXT.md): verse grain canonical, word grain translation-bound. **KJV is curated
   first.**
5. **The toggle is its own axis.** `textEdition` sits on `reading_settings` beside
   `activeTranslation`: *translation* picks the words, *edition* picks the structure, *preset*
   picks the typography. Default `'usfm'` until curation lands, then `'literary'`. An
   edition-scoped typography cascade level is additive-later, only if proven needed.

## Considered options

- **User-facing formatting editor** — rejected: the request ("copy BibleProject format", Gen 2:1
  as part of Genesis 1) is editorial fact, not personal taste; an editor is a whole product
  (selection model, toolbar, undo, Markup conflicts) whose edition churn fights ADR-0016's fixed
  geometry. Narrow block-grain user overrides remain a possible later additive layer.
- **Runtime rules layer** (sidecar shipped as JSON asset, transform applied at layout time) —
  rejected: ~2× the code, living in the app engine permanently; inserted headings become
  synthetic runtime tokens needing "is this token real?" guards in hit-testing and anchor code
  forever; "blocks partition the token stream" becomes a runtime promise instead of an ingest
  guarantee. The toggle motivating it is equally cheap with dual block refs. The runtime
  transform survives **only** as the dev editor's live preview (dev-only, never in the anchor
  path).
- **Sidecar hand-authored as text (no in-app editor)** — superseded by choice: the dev-mode
  WYSIWYG editor was judged affordable and is the authoring workflow; ingest still compiles the
  same exported sidecar.
- **Page stays = chapter; literary formatting intra-page only** — rejected: fails the flagship
  case (Gen 2:1 *part of* the Genesis 1 page); the literary break is the point.
- **Poetry lineation at verse grain only** (canonical-pure, no split maps) — rejected: real
  Hebrew poetry lineates mid-verse (Gen 1:27 is three lines in one verse); visibly wrong
  immediately.
- **Heuristic mid-verse splitting** (nearest punctuation) — rejected: silently wrong.
- **Edition choice bundled into layout presets** — rejected: presets are typography bundles with
  inheritable knobs; a block-set choice doesn't cascade, and it would double the preset matrix.

## Consequences

- Corpus schema grows `literary_block`, `literary_page`, `token.literary_block_id`; user schema
  grows `reading_settings.text_edition`. Ingest gains a sidecar loader; sidecar ops keyed by
  **canonical coordinates** (+ per-translation word-index maps for splits), so re-ingest orphans
  nothing (same rule as anchors).
- [ADR-0016](0016-codex-and-scroll-are-purpose-bound-reading-modes.md) pillar 3 is amended:
  **Page = semantic unit; the chapter is the default unit; a curated edition may supply its
  own.** Semantic pagination survives — still no page-break algorithm.
- The future `ink_annotation` **edition key** (ADR-0016 consequence, built in P2) becomes
  `(translation edition stamp, block set, typography preset fingerprint)`. Toggling `textEdition`
  is a re-typeset — a new-edition event that re-slots rail ink at verse grain, inherent to the
  toggle feature.
- Chapter/verse navigation must **map through `literary_page` ranges** ("Genesis 2" resolves to
  the literary page containing it) — a lookup, since pages carry verse ranges.
- The **dev editor** is the single biggest work item in the track (accepted): `__DEV__`-only,
  WYSIWYG on the real Codex render — tap block → genre/indent/role panel, tap between words →
  split (records the per-translation word-index), merge, inline heading text, place
  versal / section break (ADR-0018 ornament ops); **page grouping edited as a book-level
  list**, not on canvas; exports JSON via share sheet; seeds from the compiled corpus state
  for round-tripping.
- Curation: **Genesis 1–2 is the first milestone** (exercises every op: re-genre, mid-verse
  splits, inserted heading, the flagship page grouping); **Genesis 1–11 is the acceptance
  target**. Coverage does not widen until one book reads beautifully on device. Psalms wait for
  the poetry-preset typography work (P1.5 track B).
- Boundary handoffs: what a literary *page* means in continuous-column **Scroll mode** → the
  journey/hagah grill (P1.5 track A); **verse-number visibility** inside literary pages → the
  presets grill (track B). This ADR only fixes that the margin chapter marker exists.
