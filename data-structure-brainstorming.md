# BibleCodex — Data Architecture (phase-aware)

> **Status:** 🚧 Working design. Supersedes the earlier free-form brainstorm.
>
> One rule governs this doc: **architect the data model for all four product phases now;
> build and populate each schema only when its phase arrives.** Only the three
> migration-fatal seams are locked (see [OVERVIEW.md §4](OVERVIEW.md) and
> [ADR-0001](docs/adr/0001-three-layer-anchor-model.md) / [ADR-0003](docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md));
> everything else is reversible and deferred.
>
> Vocabulary is fixed in [CONTEXT.md](CONTEXT.md). This doc does not redefine terms — it lays
> out the tables and the seams between them. **The term "Word Occurrence" from the old brainstorm
> is retired**: it conflated two different things now split into **Token** (a word in a
> translation) and **Original Word** (a word-occurrence in the Greek/Hebrew).

---

## 1. The shape: four schemas, two bridges

Not one tree. Four loosely-coupled schemas that touch only through **two bridges** — the
**Canonical Anchor** (coarse + word coordinate) and the **Original Word hub** (fine, word grain).

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
  different objects. They relate only transitively, through the Canonical Verse (coarse) or the
  Original Word (fine). → [ADR-0001](docs/adr/0001-three-layer-anchor-model.md).
- **Everything user-created resolves from an Anchor, never pixels.** →
  [ADR-0003](docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md).
- **The lexicon is reference data in its own schema, joined by relation** — so Strong's / BDB /
  Thayer's can be re-sourced or versioned without touching the corpus. (This matches the
  original instinct that Strong's "lives in a different layer.")

---

## 2. The Anchor — the spine every later phase hangs on (lock in Phase 1)

The single most important record. It is a **coordinate**, not a database id, so the corpus stays
freely re-ingestable.

```ts
interface Anchor {
  translation: string;   // the translation it was created in (e.g. "KJV")
  book: string;          // canonical book id
  chapter: number;
  verse: number;         // CANONICAL versification (av11n), not the translation's native number
  wordIndex?: number;    // 0-based Token index within the verse; omit = whole verse
  wordCount?: number;    // span length in Tokens (Token-range targets)
  originalWord?: string; // OPTIONAL hub id — the Phase-3 seam; null until Phase 3 populates it
}
```

The `originalWord` field is the **cross-phase seam**: it exists in the schema from Phase 1, sits
empty through Phase 2, and is filled in Phase 3. Word-grain Markup created in Phase 2 therefore
ports across translations **by verse grain only** until Phase 3 lights up the hub — exactly the
"verse-first-word fallback" the prototype already validated.

---

## 3. Phase 1 — Reading + layout (build now)

> **Canonical schema: [`schema.dbml`](schema.dbml)** (DBML — visualize at
> [dbdiagram.io](https://dbdiagram.io)). Table shapes resolved via grill Q1–Q6. The tables
> below are the narrative overview; `schema.dbml` is the source of truth.

### 3.1 Canonical reading corpus (read-only, bundled SQLite, per translation)

| Table | Holds | Notes |
|---|---|---|
| `translation` | id, name, abbrev, language, year, license | KJV, BSB, (NASB internal-only) |
| `book` | id, name, canonical order, testament | |
| `block` | id, translation, genre (`prose`\|`poetry`\|`heading`\|`psalm_title`…), indent level, token range | **the unit of rendering**; derived from USFM `\p`, `\q#`, titles |
| `token` | id, translation, canonical_verse, word_index, surface, kind (`word`\|`punct`\|`space`), block_id | **the unit of storage + hit-testing**; per translation |
| `canonical_verse` | (book, chapter, verse) in av11n | the coarse cross-translation key |
| `versification_map` | translation ↔ canonical_verse reconciliation | why `chapter:verse` is not a free universal key (Psalm titles, Joel, Mal, Rev 12/13) |

Two overlays on one Token stream: **Block** drives *beautiful rendering* (genre/indent);
**Canonical Verse** drives *addressing*. They are deliberately independent — a verse crosses
block boundaries, which is exactly why verse-as-storage-unit was rejected
([ADR-0001](docs/adr/0001-three-layer-anchor-model.md)).

### 3.2 Layout-adjust table (user data, synced)

User typography/layout preferences. **References canonical structure, not pixels** → survives
re-ingestion and reflows. Reversible (not a locked seam), but designed cleanly now.

| Table | Holds |
|---|---|
| `layout_preset` | id, name, scope (`global`\|`genre`\|`book`), font family, size, line-height, margins, paragraph spacing, indent step, alignment |
| `layout_override` | optional per-scope override (e.g. poetry indent ≠ prose) keyed by Block genre or book |

Keep this **small and flat**. Resist a full "documents / layout_blocks / style cascade" engine
until a real need appears — that was over-design in the earlier draft.

---

## 4. Phase 2 — Annotations (Markup + Ink)

Data models already specified in
[drawing-architecture-plan.md Appendix B](drawing-architecture-plan.md); summarized here for the
map. All user data, synced; Markup = tiny rows, Ink = heavy blobs.

| Class | Tables | Anchoring |
|---|---|---|
| **Markup** (portable) | `mark`, `note`, `connector`, `endpoint`, `binding`, `layer` | every position resolves from an `Anchor`; Connector `Endpoint` binds to an Anchor **or** another element id, via a first-class `Binding` record |
| **Ink** (scoped) | `ink_annotation`, `ink_stroke` | strokes in coordinates normalized to the **laid-out Block** + a coarse `Anchor` + `layoutHash`; never transplanted across translations |

**The seam that matters across phases:** word-target Markup stores `Anchor.wordIndex` now and
leaves `Anchor.originalWord` null. When Phase 3 populates the Original Word hub + alignment,
those marks gain true cross-translation word portability with **no migration** — the column was
already there.

---

## 5. Phase 3 — Original Word hub + interlinear + lexicon

This is where the **old `BibleCodex.sql` belongs** — it was an interlinear-only model with no
reading corpus. Mapped and cleaned:

### 5.1 Original Word hub + alignment (canonical, shared)

| Table | Holds | Was, in old SQL |
|---|---|---|
| `original_word` | id, language, canonical (book/chap/verse/position), surface, transliteration, lemma_id, strong_id, parsing_code | split out of `Indexes` + `Words` |
| `interlinear_alignment` | translation, canonical_verse, token range ↔ `original_word` id (**N:1**) | this is what `Indexes.word_translation_id` was fumbling — occurrence and gloss were fused |
| `gloss` | original_word_id, translation_id, text, prefix, suffix | old `Words_Translations` (the English-under-the-Greek) |

`original_word` **is** the occurrence (one Greek/Hebrew word in the text). Glosses and Token
alignments hang off it per translation. The old `Indexes` table conflated the occurrence with its
translation rendering — split them.

### 5.2 Lexicon (separate reference DB, joined by relation)

| Table | Holds | Was, in old SQL |
|---|---|---|
| `strongs` | Strong's id, headword, transliteration, language, short + full definition | `Strongs` |
| `lemma` | id, dictionary form, language, primary gloss | (implicit in `Words`) |
| `root` | id, form, language → lemma (Hebrew; **optional, never primary**) | — |
| `morphology` | parse-code → decoded features (part of speech, stem, person, gender, number, state…) | `Pos` (its enums were a stub: 3 stems, 1 person) |
| `semantic_domain` | Louw–Nida-style domain → lemmas | — |
| `lexicon_entry` | (lexicon_source, lemma_id) → entry text | lets **multiple lexicons share lemma ids** (BDB, Thayer, Strong's) |

**Decisions to ratify in Phase 3:**
- **Lemma is the lexicon spine; Original Word is the anchor hub.** Both primary, different
  schemas. Do not collapse them (the earlier "lemma = the primary building block" conclusion was
  half-right — true for the *lexicon*, wrong for *anchoring*).
- **Root is an attribute of Lemma**, not a primary entity (one Hebrew root → many lemmas; Greek
  rarely organizes by root). Add later with zero migration.
- **Strong's id ≠ anchor.** It is a reference join key only; occurrences are addressed by
  coordinate.
- **Morphology: store the raw parse code** (e.g. OSHB/MorphHB for Hebrew, Robinson/MorphGNT for
  Greek) and decode on read, rather than baking a giant flat enum table. The old `Pos` enum is
  the *decoded* view, useful for display/filter, but the code string is the source of truth.

### 5.3 The Hebrew segmentation problem (`Prefixes` / `Word_Prefix`)

One written Hebrew word = several morphemes (conjunction + article + preposition + stem +
pronominal suffix). The old SQL handled this with `Prefixes` + `Word_Prefix`. Open decision for
Phase 3: model sub-morphemes either as **multiple `original_word` rows linked by a `segment_of`
parent**, or as a **child `morpheme` table** under one `original_word`. This affects how a word-tap
in research mode highlights "the preposition on this word" — defer the choice, but know it's
coming.

---

## 6. Phase 4 — Progress / advanced (rides existing primitives)

No new bridge. → [WISHLIST.md](WISHLIST.md).

| Feature | Data it needs | Built on |
|---|---|---|
| **Cross-reference** | editorial link between two Anchors (e.g. Treasury of Scripture Knowledge) | Anchor |
| **Portal** | a Cross-reference + a visibility gate | Cross-reference + reading progress |
| **Journey** | per-book bookmark, open-scroll set, unlock state | reading progress |
| **Themes & tags** | user tag → Anchor range; suggested tags from notes | Anchor + Note |
| **Journey state** | what's read + familiarity per passage | one model, many surfaces |

---

## 7. Old `BibleCodex.sql` → new model (full mapping)

| Old table | New home | Verdict |
|---|---|---|
| `Indexes` | split → `original_word` (occurrence coord) + `interlinear_alignment` | conflated occurrence with gloss |
| `Words` | `original_word` form + `lemma` + parsing | was a form/lemma blend |
| `Words_Translations` | `gloss` | keep |
| `Strongs` | `strongs` (lexicon ref DB) | keep, move to reference schema |
| `Pos` | `morphology` (prefer parse-code + decode) | enums were a stub |
| `Prefixes` + `Word_Prefix` | morpheme segmentation (§5.3) | open decision |
| `Books` / `Classes` / `Books_Classes` | `book` + genre/canon class | keep |
| — (missing) | `token`, `block`, `versification_map` | **the entire Phase-1 reading half the old SQL lacked** |

**Headline gap:** the old SQL has no reading-translation Token stream, no Blocks, no
versification map — it cannot render a beautiful page. It is the Phase-3 half only. Phase 1 builds
the half it was missing.

---

## 8. Open questions (by phase)

**Phase 1**
- Layout-adjust scope grain: global / per-genre / per-book — how many levels before it's
  over-built?
- Block model for nested poetry (stanza vs line) — one `block` table with indent level, or a
  parent/child?

**Phase 3**
- Hebrew segmentation: sibling `original_word` rows vs child `morpheme` table (§5.3).
- One lexicon at launch (Strong's) vs the multi-lexicon `lexicon_entry` shape from day one.
- Morphology: ship raw parse codes, decoded enums, or both materialized.

**Cross-phase**
- Sync backend (PowerSync vs Electric); Markup (tiny rows) and Ink (heavy blobs) likely differ.
- Which lemma/usage statistics to precompute vs query live.

---

## 9. What's locked vs reversible (don't bikeshed the reversible)

**Locked (migration-fatal) — [OVERVIEW.md §4](OVERVIEW.md):**
1. Anchor addressing by **coordinate** (verse + word-index + optional Original-Word id), never DB id.
2. Corpus = per-translation **Token stream + Block overlays** from USFM.
3. Annotations = a **scripture-anchored scene graph**, never canvas coords.

**Reversible — defer freely:** layout-adjust cascade depth, lexicon table shapes, morphology
storage, segmentation model, sync backend, semantic-domain layer, all of Phase 4.
