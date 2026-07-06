# bible-codex

A local-first, literary Bible reader. This glossary fixes the language of the text/reading domain: how scripture is broken into units, how those units are addressed, and how multiple translations relate.

## Language

### Text units

**Token**:
A single **word- or punctuation-occurrence** in a *translation's* text — the unit of storage, rendering, and within-translation hit-testing. Whitespace is **not** a Token: spacing is a render/layout concern owned by the presentation layer, never corpus data. Per-translation — a KJV Token and a BSB Token are never the same object. The word/punct classification rules (possessives, hyphens, elisions, numbers) are **registered policy**, part of the locked anchor seam — changing them is an anchor migration. The v1 rules are fixed in ADR-0014 §"The registered policy" and implemented in `app/scripts/ingest/tokenize.ts`.
_Avoid_: word (ambiguous with Original Word); treating whitespace as a Token

**Original Word**:
A single lexical **segment-occurrence** in the original text — a whole word in Greek, a **morpheme** in Hebrew (the source corpora segment agglutinated Hebrew words into conjunction / article / preposition / stem / suffix, each carrying its own Strong's, Lemma, and Gloss). Identified by a stable external word-id. The shared hub that translation Tokens align to (N Tokens → M Original Words). A **Written Word** is the morpheme group reconstructed by ordering an Original Word's sibling Segments.
_Avoid_: lemma (that is the dictionary form, not the occurrence), Strong's (that is the lexical id, not the occurrence); assuming one written word = one Original Word (true for Greek, not Hebrew)

**Block**:
A contiguous range of Tokens forming one literary unit — a prose paragraph, a poetry line, or a heading — carrying a genre and indent level. The unit of rendering. Derived from USFM markers (`\p`, `\q#`, …). Blocks **partition** the token stream (non-overlapping; every Token belongs to exactly one Block). Overlapping literary structures (chiasm, inclusio, parallelism) are a *separate* later layer, not Blocks. Heading Blocks (titles, section headings) sit outside the verse sequence — their Tokens carry no Canonical Verse (verse is NULL, not 0) and no word-index, and are addressed via their Block. This holds for **mid-chapter** section headings too: a heading never inherits the preceding verse's number.
_Avoid_: paragraph (too narrow — poetry lines and headings are also Blocks), section

### Addressing

**Canonical Verse**:
A `(book, chapter, verse)` address expressed in the single chosen canonical versification (KJV/`av11n`). The coarse, cross-translation anchor for a passage.
_Avoid_: reference, citation

**Translation Verse**:
The same passage under a translation's *native* numbering, reconciled to the Canonical Verse via a Versification Map. Differs from canonical in places (Psalm titles, Joel, Malachi, Revelation 12/13, …).

**Versification Map**:
A per-translation table reconciling that translation's Translation Verses to Canonical Verses. The reason `chapter:verse` is not a free universal key.

**Anchor**:
The stable canonical address that any user mark or reading position attaches to: a Canonical Verse plus a word-index, optionally carrying an Original Word id. Never pixels.
The **word-index** is the 0-based ordinal of a *word* Token within the verse (**punctuation excluded**); a punctuation Token is addressed by the word-index of the word it follows.
There is no shared anchor table — the coordinate is a **column-group** inlined on each anchored entity and reused verbatim by later ones (cross_reference, tag). It comes in two shapes: a **point** anchor (a Note pin, a Connector endpoint — a single word or whole verse) and a **range** anchor (a Mark — a span that may cross a verse boundary, carrying an end verse + end word-index). User-mark anchors are **translation-bound** (they carry the translation they were drawn in and port from there); **editorial** anchors (the Original Word hub, a Cross-reference) are **canonical-only** — no translation — because they relate passages, not one translation's words. One deliberate user-data exception: the **reading position** (one bookmark per book, ADR-0012) is canonical-only, because it relates the *reader* to the *passage* and must follow them across translations. Markup anchors also carry a **quote witness** — the anchored surface text plus the corpus edition it was minted against — used to detect and repair drift when a translation's text is revised (ADR-0013); the coordinate remains the anchor, the quote is proof.
**Headings are not anchorable** (v1): heading Tokens carry no Canonical Verse, and an Anchor requires a verse — so titles/section headings cannot be marked, noted, or connected. A block-grain heading anchor is a deferred, additive extension.

**Cross-reference**:
An editorial, shipped link between two passages (e.g. from the Treasury of Scripture Knowledge) — read-only and authoritative; the app's own "this connects to that." Its user-authored sibling is the Connector. A Portal (see `WISHLIST.md`) is a Cross-reference gated by reading progress.
_Avoid_: reference (a single address; a Cross-reference links two)

### Reading surfaces (ADR-0016)

**Codex mode**:
The **portrait** reading surface — the *study* mode. Paged like a physical Bible (flip = chapter navigation); home of all annotation (Markup, Notes, Rail ink) and the Margin rail. Mode is derived from device orientation, never a stored setting.
_Avoid_: vertical mode (describes pixels, not purpose)

**Scroll mode**:
The **landscape** reading surface — the *journey* mode. Continuous horizontal columns (the original scroll form), immersive reading, Portals, progress. Clean in v1: no Ink ever, no Markup authoring yet. Carries the **Altitude ladder** (ADR-0019): Scroll overview above the ribbon, Hagah below it; literary-page seams render as landmark ceremony (hierarchy: book > page > section break).
_Avoid_: horizontal mode

**Altitude ladder**:
Scroll mode's altitudes on one zoom axis (ADR-0019): **Library ring** (ADR-0020) ⇄ **Scroll overview** ⇄ reading ribbon ⇄ **Hagah** (spread on a verse). Descent/ascent is zoom-choreographed so a verse never loses its *place* in the story.
_Avoid_: zoom levels (the altitudes are distinct compositions, not magnifications of one layout)

**Library ring**:
The library surface (ADR-0020): an inside-the-circle carousel of face-out book covers, Torah → Revelation → Torah, looping. One library for both orientations — landscape: the Altitude ladder's top rung; portrait: a pushed screen over Codex (reader stays home). Tap a book = open at its per-book bookmark (no chapter grid; the Scroll overview and the in-reader picker own address-picking). Carries nothing but ring, Category band, and covers — translation and every other axis toggle lives in settings.
_Avoid_: menu (it is a place, not a list), home screen (the reader is home)

**Category band**:
The Library ring's coarse gear: the seven groups (Torah / Prophets / Writings / Gospels / Acts / Letters / Revelation — BibleProject taxonomy) as a scrollable strip below the ring; dragging it turns the ring at group grain, tapping a category spins there, and the highlight tracks the focused group (a position map of the ring). Navigation stays *rotation* at two grains — never a jump list.
_Avoid_: tabs, filter (it never hides books — it rotates to them)

**Scroll overview**:
The top altitude — the whole book as one **schematic spatial map**: body text as faint bars, landmarks (book title, page-seam headings, section ornaments) rendered full, proportional left-right geometry. Tap/spread to descend into the ribbon there. Scroll's navigation story — by place, not lookup box. Uncurated books fall back to chapter seams, numbered on the map only (the map is navigation apparatus; the "Scroll is clean" rule governs the reading surface, not the map).
_Avoid_: minimap (it is a full navigation altitude, not a corner widget), table of contents

**Hagah**:
(הגה — murmur, meditate.) The bottom altitude: a **focus state inside Scroll mode**, one verse typeset alone — large, centered, faint prev/next edges for sense of place — styled by the active Preset. Horizontal swipe steps a verse at a time (updates the per-book reading position at verse grain); **vertical swipe flips the verse to its original language** (ADR-0021 — pointed Hebrew / Greek from the hub; sticky within the session, resets on ascent; transient apparatus, never the translation axis); pinch ascends back to the verse's exact ribbon position. Pure view state — no tables, no session data. Not a third mode: *mode* picks the purpose; Hagah is a state within one purpose. Codex has no Hagah.
_Avoid_: meditation mode (not a mode — orientation still derives the mode), focus mode

**Yad**:
Hagah's reader-driven pointer aid (after the Torah pointer): drag finger or pen along the words and a quiet glow follows the touch (pen hover where supported). No pacing engine, no tempo setting — the yad follows the reader, never the reverse; it never auto-advances the verse. v1: Hagah-only.
_Avoid_: cursor, karaoke highlight (app-paced — rejected)

**Page**:
One **semantic unit** — a chapter by default; in the literary edition, a Literary page — typeset at fixed geometry (measure and typography fixed per preset; the device letterboxes/scales). Taller-than-screen pages scroll *within* the page; the canvas never reflows on rotation or device change — only a typography or edition change creates a new *edition* and re-paginates. Semantic pagination: the semantic boundary is the page break; no page-break algorithm exists (ADR-0016 as amended by ADR-0017).
_Avoid_: screen (a page may span several screens)

**Literary edition**:
The shipped, **curated editorial block structure** (ADR-0017) — BibleProject-style poetic lineation, indentation, inserted literary headings, and pericope-grain Literary pages — compiled at ingest from per-book sidecar data into a second block set (`literary_block` / `literary_page`; `token.literary_block_id` beside `block_id`). Toggled by `reading_settings.textEdition` (`'usfm' | 'literary'`): *translation* picks the words, *edition* picks the structure, *preset* picks the typography. **Block-grain ops only** in v1; verse-grain ops are canonical, mid-verse split points carry a per-translation word-index map (unsplit fallback). Inserted literary headings follow the standing heading rule (`verse = NULL`, not anchorable).
_Avoid_: user formatting (it is editorial, shipped data — not a user editor), preset (that is typography, a separate axis)

**Literary page**:
A Page of the literary edition — a curated **verse range forming one literary unit**, possibly crossing chapter boundaries (Creation = Gen 1:1–2:3, the corrected literary break). Flip navigation moves between Literary pages; a swallowed chapter start shows a **discreet margin chapter marker**; chapter/verse navigation resolves through the page's verse range. Books without curated data fall back to chapter-pages.
_Avoid_: pericope (a Literary page may group several pericopes), chapter

**Margin rail**:
The first-class reserved margin region of a Codex-mode Page (journaling-Bible precedent) — home of Note pins and Rail ink. User expansion of the rail grows the page canvas *outward* and never squeezes the text measure, so it can never reflow text or invalidate ink.
_Avoid_: whitespace, leftover margin

**Rail ink**:
v1's only Ink: freehand strokes living in the Margin rail, **verse-slotted** — the stroke blob never distorts; its slot follows the verse, so it survives re-pagination at verse grain. In-text ink (freehand over the words) is a later phase; in-text decoration is Markup's job.

**Preset**:
A shipped, built-in **typographic personality** (ADR-0018) — font, leading, measure, alignment, verse-number style, versal style, paper tint per theme. Two ship (Classic, Modern; Manuscript reserved); values are engine constants, not user data. The user's only typographic knobs are the preset choice and a `fontScale` stepper. Ornament *style* belongs to the preset; ornament *placement* belongs to the literary edition.
_Avoid_: theme (light/dark is a separate global choice), setting (a preset is a curated bundle, not a knob surface)

### User marks

**Markup**:
The portable, data class of user marks — re-rendered by the app from references rather than stored as pixels, so it reflows and ports across translations. An umbrella over Mark, Note, and Connector. Contrast Ink.
_Avoid_: annotation (covers both Markup and Ink)

**Mark**:
A decoration bound to a scripture Anchor — underline, highlight, box, circle, strike. Its position is derived from the targeted words; it has no independent location. A Mark uses the **range** Anchor: it can span a single word, a phrase within a verse, or a phrase **across a verse boundary** (start verse/word → end verse/word). A Note pin and a Connector endpoint, by contrast, are points.
_Avoid_: highlight (only one kind of Mark)

**Note**:
A free content object (the user's own text) pinned to a scripture Anchor plus an offset into the margin/whitespace. Has its own identity, so it can be a Connector target. Its content is translation-agnostic; its pin is canonical, so it ports.

**Connector**:
An arrow or line joining two Endpoints; it re-routes when either end moves. When it links two passages it is a user-authored cross-reference.
_Avoid_: arrow (a Connector may be a plain line)

**Endpoint**:
One end of a Connector (or a Note's pin). Binds to either a scripture Anchor or another element's id — never to canvas coordinates.

**Binding**:
The stored relationship between an Endpoint and its target, kept as its own record so any element can be a target. A Mark or Note is targeted as an element (by its id); a Token is targeted as a scripture Anchor with a word-index, not a distinct element kind.

**Ink**:
A freehand pen annotation captured as stroke points — personal and expressive, the "physical Bible" feel. Lives only in **Codex mode**; never portable across translations. v1 Ink is **Rail ink only** (verse-slotted, in the Margin rail — survives typography changes at verse grain); in-text ink over the words themselves is a later phase bound to one typography edition (ADR-0016).
_Avoid_: drawing (Markup also draws), stroke (one component of an Ink mark)

**Layer**:
A named, toggleable group of user marks with a `visible` flag — the "notes on/off" feature. Spans both Markup and Ink.

### Original language & lexicon (Phase 3)

*(Hub ingest pulled forward by ADR-0021: `original_word` / `segment` land in P1.5 — OSHB Hebrew + Robinson-Pierpont Byzantine Greek, whole canon, Strong's/morphology stored as opaque codes — read verse-grain in Hagah. Alignment, Gloss, and lexicon decode remain Phase 3.)*

**Segment**:
The grain of an Original Word — one morpheme-occurrence. A Greek word is a single Segment; a Hebrew word is several. Siblings in order reconstruct the Written Word.
_Avoid_: prefix (only some Segments are prefixes), affix

**Alignment**:
The interlinear mapping from a translation's Tokens to Original Words — many-to-many (N Tokens → 1 Original Word, and 1 Token → N Original Words for compounds). The fine, word-grain bridge between a translation and the original. **Reverse-interlinear** (the translation's words shown under the original) is *derived* by walking Alignment, not stored.
_Avoid_: interlinear (the view; Alignment is the data behind it)

**Lemma**:
The dictionary / citation form of a word — the lexicon's spine, the thing occurrence statistics and dictionary entries hang off. Distinct from the Original Word (an occurrence) and from Strong's (a numbered lexical id).
_Avoid_: root (a deeper Hebrew grouping, an attribute of a Lemma, not a Lemma)

**Strong's**:
A numbered lexical id (G#### / H####) and its dictionary entry. A reference **join key only** — it identifies a word's lexeme but is never an Anchor; occurrences are addressed by coordinate, never by Strong's.
_Avoid_: lemma (a separate identifier space — Strong's conflates and splits differently)

**Morphology**:
A word's grammatical parse (part of speech, tense / voice / mood / case for Greek; stem / state for Hebrew; person / gender / number). Stored as a raw parse **code** that is the source of truth, decoded to features for display and filtering.
_Avoid_: part of speech (only one feature of the parse)

**Gloss**:
The editorial word-level rendering shown under an Original Word in interlinear mode (e.g. "Word" under λόγος), optionally with helper words. Translation-agnostic; distinct from a Token (a translation's actual surface text) and from reverse-interlinear (derived from Alignment).
_Avoid_: translation (a Gloss is an editorial under-the-original cue, not a reading rendering)

## Rules

- **The axis rule (ADR-0017/0018).** Four orthogonal reader choices, none duplicating another: the *translation* picks the words, the *edition* picks the structure, the *preset* picks the typography, the *mode* (orientation) picks the purpose. Verse-number visibility is mode-bound apparatus (Codex shows quietly, Scroll clean), never a setting. Hagah is a **state within** Scroll (ADR-0019), not a fifth axis — mode stays orientation-derived.
- **Translations are spokes, never linked directly.** Cross-translation relations are transitive through two shared hubs only: the Canonical Verse (coarse, passage grain) and the Original Word (fine, word grain). There is no Token-to-Token edge between translations.
- **Markup is portable; Ink is scoped.** Markup re-renders from its Anchor, so it reflows across fonts and travels across translations (verse grain always; word grain via the Original Word hub). Ink is bound to one translation's layout and is never transplanted.
- **Annotations are a scene graph anchored to scripture, never to canvas coordinates.** Every element's position resolves from a scripture Anchor (plus an offset for free-placed Notes), computed at render; Connectors bind to elements/Anchors, never to pixels. This is what keeps marks alive through reflow, scroll-mode switches, and translation changes.
