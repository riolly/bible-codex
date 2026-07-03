# Corpus and versification are ingested at build time from USFM

The corpus is produced by a **build-time Node pipeline**, never at app runtime: **usfm-grammar**
parses USFM/USX → USJ (Unified Standard JSON), a **normalize step** flattens USJ into our domain
shape — a per-translation **Token stream** with **Block** overlays (`genre`, indent from `\p` /
`\q#` / headings) and Canonical-Verse addressing ([ADR-0001](0001-three-layer-anchor-model.md)) —
and the result is written to the **prebuilt read-only corpus SQLite asset**
([ADR-0009](0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md)). The
`versification_map` is built in the same pipeline from standard **`.vrs` / av11n** mapping data,
reconciling each translation's native numbering to the canonical (av11n / KJV) verse. **No scripture
engine or USFM parser ships in the app** — the device only reads normalized SQLite rows.

## Considered options

- **Proskomma as the runtime scripture engine** — rejected: it is a full scripture-processing
  runtime with its own internal binary model; we already own a domain schema
  (`CONTEXT.md`/`schema.dbml`) and a Skia typesetting engine, so a runtime engine is weight and a
  second source of truth. We want a **parser at build time**, not an engine at runtime.
- **usfm-js / hand-rolled SFM parsing** — rejected: usfm-grammar is a maintained tree-sitter CFG
  with USFM↔USX↔USJ conversion and Node bindings, the focused tool for USFM→JSON; hand-rolling
  re-derives a solved problem and misses edge markers.
- **Parse USFM on device at first launch** — rejected: parsing + normalization is build-time work
  that produces a deterministic asset; doing it on device adds a parser dependency, startup cost,
  and a second code path for the same data. The bundled `.db` is the artifact.
- **Skip a real versification map for Phase 1** (KJV + BSB are both English-canonical, so the map is
  near-identity) — rejected as a *test* shortcut even though it is nearly true in *data*: the
  native↔canonical round-trip that every Anchor and the reading-position-ports-across-translation
  story depend on is flagged **UNVALIDATED** ([OVERVIEW.md §5](../../OVERVIEW.md),
  [ADR-0001](0001-three-layer-anchor-model.md) consequence). The code path must exist and be tested
  from Phase 1.

## Consequences

- The ingest pipeline is **pure Node TS** → tested with **golden fixtures** (USFM in → expected
  Token stream + Block overlays), asserting the invariants in `CONTEXT.md`: Blocks **partition** the
  token stream, whitespace is **never** a Token, heading Tokens carry `verse = NULL` and no
  word-index. Fixtures are **adversarial on tokenization** (possessives, hyphens, elisions,
  numbers) because the word/punct rules are part of the locked anchor seam
  ([ADR-0014](0014-tokenization-policy-is-part-of-the-locked-anchor-seam.md)), and they assert
  **deterministic per-chapter heading ordinals** (the stable key the deferred block-grain heading
  anchor will rely on).
- A deliberately **divergent versification fixture** (Psalm titles, Joel, Malachi, Revelation
  12/13) validates the native↔canonical round-trip now, even though KJV/BSB barely exercise it —
  clearing the OVERVIEW §5 risk before a real translation is bundled. **This is a P1 acceptance
  criterion (hard gate), not a promise: P1 does not ship until this fixture round-trips an anchor
  through `versification_map` in both directions.** (KJV + BSB are both ≈ canonical, so the
  production map stays nearly empty — the fixture is the *only* thing that ever exercises the code
  path every anchor depends on.)
- The pipeline **stamps `translation.edition`** (upstream version tag or source checksum) so a
  text revision is detectable and triggers the quote-witness reconciliation
  ([ADR-0013](0013-corpus-text-is-versioned-and-markup-carries-a-quote-witness.md)).
- Re-ingest reproduces the corpus asset wholesale; because presentation rules and user anchors key
  on **semantic keys / canonical coordinates, not `token.id`**
  ([ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md),
  [ADR-0001](0001-three-layer-anchor-model.md)), re-ingest orphans nothing.
- Phase-1 translations are **KJV + BSB** (both open; the internal NASB95 prototype text is not
  redistributable — [OVERVIEW.md §Data](../../OVERVIEW.md), [memory: bible-data-sources-licensing]).
  Adding a translation = running the pipeline on its USFM; the parser/normalizer is translation-agnostic.
- `.vrs`/av11n source data and the exact `versification_map` shape are **reversible** corpus data
  ([ADR-0001](0001-three-layer-anchor-model.md) #6), not a locked seam.
