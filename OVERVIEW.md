# bible-codex — Project Overview

> **Start here.** The single entry point that summarizes what bible-codex is, what's
> been decided, what's been proven, and what's still open to grill. Every section
> links to the detailed doc that owns it — this file stays a map, not a duplicate.
>
> **Last updated:** 2026-06-24

---

## 1. What it is

A **local-first, literary-beautiful Bible** that turns reading into **discovery** — not a
reference tool that dumps data, but a companion that draws you deeper one earned step at a
time. Scripture is typeset to its literary form (narrative as prose, poetry as poetry),
readable as a **horizontal scroll** (echoing the original scroll) or vertically. You mark it
like a physical Bible, and your marks survive every change of font, layout, and translation.

**Tablet + desktop only — no phone.** This is for focused reading.

Full philosophy → [VISION.md](VISION.md). Glossary of every domain term → [CONTEXT.md](CONTEXT.md).

---

## 2. Where we are

**The throwaway proof-of-concept prototype is built and the core bet is PROVEN.** Lives in
[`prototype/`](prototype/README.md) (Vite + TS + `canvaskit-wasm` + Cardo). Skia `Paragraph`
renders genuinely beautiful literary scripture (Latin + polytonic Greek + pointed Hebrew in
one font, RTL correct), with smooth scroll and the full vision-taste loop working:

- Drop cap, gilt superscript verse numbers, prose vs. poetry typesetting.
- Vertical ⇄ horizontal-column scroll, toggled live.
- Incremental word-tap reveal (gloss → Strong's → original script → meaning).
- The earned **"beginning" Portal** (dim → glow → tap-traverse John 1 ↔ Genesis 1).
- A mocked study **Layer** (highlight + margin Note + Connector) that reflows on every
  font / scroll-mode / translation change.
- NASB ⇄ KJV toggle; anchored Markup ports, context-tagged Ink vanishes — the two-physics
  thesis on screen.
- An interactive authoring loop (create → place → edit → erase → undo) for Notes and Ink.
- ~120 fps (capped) full-chapter scroll on desktop GPU.

**The one thing NOT yet proven:** freehand pen *feel* (sub-frame latency, prediction, palm
rejection) on a **physical Android tablet** in Chrome — the pessimistic browser-wasm case the
prototype exists to derisk. Mouse/trackpad on web cannot tell us this.

Full prototype verdict + caveats → [prototype/README.md](prototype/README.md).

**Next step after on-device validation:** `/to-prd` then `/to-issues` for the real RN-Skia v1.

---

## 3. Locked decisions

### Product roadmap — four phases (design the data model for all; build in order)

> **"Phase" here = the product-feature axis**, and it is now the canonical meaning of "Phase"
> in this repo. It is *orthogonal* to the **build track** (Stage A CanvasKit-wasm → Stage B
> Expo/RN-Skia, under Stack below) and to the **annotation sub-steps** in
> [drawing-architecture-plan.md §10](drawing-architecture-plan.md), which live *inside* Phase 2.
> The data model is architected for **all four phases now**; only the three migration-fatal
> seams (§4) are locked, everything else is built when its phase arrives. Rationale →
> [ADR-0005](docs/adr/0005-four-product-phases-design-all-build-in-order.md). Full data
> architecture → [data-architecture.md](data-architecture.md).

- **Phase 1 — Beautiful text + layout-adjust table.** *(most important)* Genre-aware literary
  typesetting (prose / poetry / headings, driven by USFM **Blocks**), horizontal + vertical
  scroll, one translation — plus a **layout-adjustment table**: user-tunable spacing, indent,
  font, margins, line-height, synced across devices, referencing canonical structure (Block,
  verse) and never pixels.
- **Phase 2 — Handwriting & notes.** *(most important)* The annotation layer. Portable
  **Markup** (Mark / Note / Connector — built first *within* this phase because it ports and
  runs everywhere) plus the headline **Ink** freehand handwriting (tablet-native, the emotional
  differentiator). The authoring loop is already prototype-proven. →
  [drawing-architecture-plan.md](drawing-architecture-plan.md).
- **Phase 3 — Lexicon / Strong's.** The **Original Word** hub + interlinear alignment, and the
  Strong's Exhaustive Concordance **lexicon** as a *separate reference schema joined by
  relation* (lemma, root, morphology, semantic domains). Unlocks word study, reverse-interlinear,
  and deep research mode. **Table shapes resolved** (third grill, Q1–Q9) → tables in
  [schema.dbml](schema.dbml), decisions in
  [ADR-0007](docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md):
  morpheme-grain hub keyed by opaque external word-id, three tiers joined by string keys, lexicon
  re-sourceable without touching the corpus.
- **Phase 4 — Advanced.** Portal, Journey, Themes & tags, research-mode deepening — each rides
  primitives already shipped in P1–P3 at near-zero migration cost; broken down later. →
  [WISHLIST.md](WISHLIST.md).

**The throwaway POC already tastes P1** (beauty + scroll) **and mocks P2** (Note + Ink) **+ P4**
(the *beginning* Portal glow) — locked as "option B," built on Genesis 1 + John 1 (Psalm 1 +
1 John 1 if cheap). It is proof, not product. **Directive:** compelling-but-limited; stop
debating non-migration-fatal details.

### Stack
- **React Native + Skia** (`@shopify/react-native-skia`, runs web via CanvasKit). Text rendered
  *in Skia* (Paragraph API), not CSS — cost is a custom typesetting engine. Drawing strokes and
  text share one Skia canvas → annotations anchor to token layout rects in a shared coord space.
- **Build track (orthogonal to the product phases above):** **Stage A = CanvasKit-wasm direct**
  (plain web, Vite) for iteration speed, testable on the physical Android tablet via Chrome.
  **Stage B (post-validation) = port the *thin renderer*** to **Expo + react-native-skia**. The
  typesetting/layout engine + data model stay **framework-agnostic** (no CanvasKit type leaks),
  so Stage B rewrites only the draw layer.
- **Fonts:** one polyscript serif (Cardo / Gentium Plus).

### Data & corpus
- **Two data systems:** read-only bundled corpus (SQLite) vs. synced user layer. User data
  anchors to canonical refs (book/chapter/verse/word-index), never pixels.
- **Corpus = per-translation token-stream + verse/block overlays, ingested from USFM/USX**
  (USFM encodes literary structure — `\q#` poetry indent, `\p` prose, titles, Psalm headers —
  a bare verse-list loses this and kills genre-aware typesetting).
- **Translations are spokes, never linked token-to-token.** Cross-translation relations route
  through two shared hubs only: the **Canonical Verse** (coarse) and the **Original Word** (fine,
  via interlinear alignment).
- **Translations (POC + v1):** KJV + NASB95, default NASB — **internal use only, not
  redistributed**. NASB95 cannot be publicly bundled (Lockman bans dataset redistribution);
  public release must license NASB95 or swap to open **BSB**. Cheap to swap because translations
  are spokes and the corpus is re-ingestable. POC data is **hand-prepared, 4 chapters, no
  scraper** (and the NASB text is reproduced-from-memory, not edition-verified — internal only).
  Sources + licensing → [memory: bible-data-sources-licensing].
- **Sync:** **Phase 1 assumes one account = one device — multi-device sync is deferred to Phase 4+**
  (with desktop). When it lands it is **never real-time / CRDT** (no collab), just bidirectional
  row sync; intended engine **PowerSync** (Electric rejected — read-path-only, alpha). Because
  presentation is device-independent rules over a viewport-pure layout engine
  ([ADR-0004](docs/adr/0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md)), settings
  **port across devices by construction** — no multi-device layout code, ever. The Phase-1 schema is
  already sync-shaped at zero cost. → [ADR-0009](docs/adr/0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md).

### Annotations — two classes with opposite physics (Phase 2)
- **Markup (semantic, built first within Phase 2):** underline / highlight / box / circle / strike / arrow,
  targeting a Token range / Verse / Original Word. App re-renders from `{target, style}` →
  reflows across fonts, ports across translations, queryable, syncs as tiny rows, runs on
  web + tablet + desktop. → [ADR-0002](docs/adr/0002-two-annotation-classes-markup-first.md).
- **Ink (freehand, later):** pen strokes over one translation's rendered layout — the
  physical-Bible feel and emotional differentiator. Layout- and translation-scoped,
  **tablet-native** (Android then iPad), never portable, never on web/desktop.
- **Markup is a scripture-anchored scene graph** — Mark / Note / Connector with first-class
  Binding records (Excalidraw/tldraw style, so any element can be a target). **The inversion:**
  no element stores absolute canvas coords; every position resolves from a scripture Anchor at
  render. → [ADR-0003](docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md).
- Full subsystem design, data models, `DrawingSurface` contract, competitive landscape →
  [drawing-architecture-plan.md](drawing-architecture-plan.md) +
  [ink-app-comparison.md](ink-app-comparison.md).

---

## 4. The seams that are locked vs. everything reversible

This is the discipline that keeps grilling productive: **only three things are
migration-fatal — lock them and do NOT over-design anything else.**

**Migration-fatal — locked (→ [ADR-0001](docs/adr/0001-three-layer-anchor-model.md)):**
1. **Canonical Anchor addressing keyed by COORDINATES** (verse + word-index + optional
   Original-Word id), never internal DB ids → corpus stays freely re-ingestable.
2. **Corpus = token-stream + verse/block overlays from USFM.**
3. **Annotations = a scripture-anchored scene graph, never canvas coords.**

**Reversible — defer freely, don't bikeshed:** sync backend, Skia layout details, typefaces,
Markup style vocabulary, eraser semantics (POC picked vector whole-stroke), native pen
escalation (PencilKit / androidx.ink), ML Kit handwriting, DB engine, exact translation set.
*(The Phase-1 stack now has chosen — still reversible — defaults: app/engine
[ADR-0008](docs/adr/0008-reading-app-is-expo-react-native-skia-over-a-framework-agnostic-engine.md),
persistence + intended PowerSync sync
[ADR-0009](docs/adr/0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md), build-time
USFM ingest + versification
[ADR-0010](docs/adr/0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md).)*

---

## 5. Open questions — ripe for the next grill

Carried from [drawing-architecture-plan.md §8](drawing-architecture-plan.md) and the broader
product, these are the live threads to re-interrogate:

**Annotations / Markup**
- Confirm the Markup target set (`Verse | Token range | Original Word`). Free placement
  disallowed (**snap-only**) to keep portability?
- v1 Markup style vocabulary — which kinds first (underline + highlight?), colors, hand-drawn
  vs. clean rendering.

**Ink**
- Reflow policy on font change — best-effort re-place at block grain vs. lock layout when Ink
  exists on a passage.
- First native pen platform if/when we escalate — Android/Ink modularity vs. iPad premium
  expectation. (Recognition scope, later: searchable handwriting vs. cleanup/export.)

**Sync**
- Backend choice (PowerSync vs. Electric); do Markup (tiny rows) and Ink (heavy blobs) get
  different treatment?

**Data / corpus (Phase 1 + Phase 3)** _(folded in from the old data-doc open-questions)_
- **Versification round-trip is UNVALIDATED.** WEB & KJV ≈ canonical, so `versification_map` was
  empty in the prototype — the native↔canonical conversion an Anchor depends on was never
  exercised. Build a divergent-translation fixture (Psalm titles, Joel/Mal, Rev 12/13) and test it
  before bundling one. Safe to defer (anchors store canonical directly; the map is rebuildable
  corpus data), but not yet "proven."
- **Phase-3 corpus sourcing** (the open non-schema risk): pick + license-check a redistributable
  interlinear corpus (MACULA / STEPBible / OSHB+MorphGNT), and confirm it supplies a **lemma id per
  occurrence** ("lemma is the spine" assumes it; else stats hang off Strong's at launch).

**Product / vision (post-POC, captured in [WISHLIST.md](WISHLIST.md))**
- **Portal** mechanic — earned cross-references that glow; rides existing primitives, zero
  migration cost.
- **Journey** — Bible as a collection of scrolls, progressive book-unlock, one bookmark per
  book, adaptive pacing.
- **Themes & tags**, **research mode** (hover-translation, incremental resources, deep lexicon).
- The unifying **journey state** engine (what's read + familiarity) — one model, many surfaces.

---

## 6. Document map — where everything lives

| Doc | Owns |
|---|---|
| [VISION.md](VISION.md) | Philosophy and principles (the "why") |
| [CONTEXT.md](CONTEXT.md) | Glossary — every domain term + the rules that bind them |
| [data-architecture.md](data-architecture.md) | Data architecture **map** — four schemas + two bridges + seams (pointers to schema.dbml/ADRs, not a restatement) |
| [docs/adr/0001](docs/adr/0001-three-layer-anchor-model.md) | Three-layer anchor model (text + the two hubs) |
| [docs/adr/0002](docs/adr/0002-two-annotation-classes-markup-first.md) | Markup vs. Ink split, Markup first |
| [docs/adr/0003](docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md) | Annotations as a scripture-anchored scene graph |
| [docs/adr/0004](docs/adr/0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md) | Presentation = rules layer (semantic-key join); computed layout is ephemeral |
| [docs/adr/0005](docs/adr/0005-four-product-phases-design-all-build-in-order.md) | Four product phases; design the data model for all, build in order |
| [docs/adr/0006](docs/adr/0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md) | Phase-2 annotation layer: client UUIDs, coordinate joins (no corpus FK), soft-delete |
| [docs/adr/0007](docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md) | Phase-3 Original Word hub: morpheme grain, external opaque ids, three string-keyed tiers, re-sourceable lexicon |
| [docs/adr/0008](docs/adr/0008-reading-app-is-expo-react-native-skia-over-a-framework-agnostic-engine.md) | Phase-1 app: Expo + react-native-skia, **tablet-native only (desktop/web deferred to P4+)**, framework-agnostic engine; Expo Router / Zustand / Vitest |
| [docs/adr/0009](docs/adr/0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md) | Phase-1 persistence: two SQLite DBs (bundled read-only corpus + local user) behind a Drizzle seam; PowerSync is the intended later sync |
| [docs/adr/0010](docs/adr/0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md) | Phase-1 ingest: build-time usfm-grammar → USJ → normalize → corpus SQLite; versification from .vrs/av11n |
| [schema.dbml](schema.dbml) | Phase-1 corpus + presentation, Phase-2 annotation, **and Phase-3 Original Word hub + lexicon** tables (DBML, dbdiagram-visualizable) |
| [drawing-architecture-plan.md](drawing-architecture-plan.md) | Annotation subsystem design, data models, roadmap |
| [ink-app-comparison.md](ink-app-comparison.md) | Competitive landscape for cross-platform ink |
| [WISHLIST.md](WISHLIST.md) | Post-POC ideas (Portal, Journey, Themes, Research mode) |
| [prototype/README.md](prototype/README.md) | Phase-1 throwaway prototype — the question it answers + verdict |
| [CLAUDE.md](CLAUDE.md) | Agent/repo conventions (issue tracker, triage, domain docs) |
