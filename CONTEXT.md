# bible-codex

A local-first, literary Bible reader. This glossary fixes the language of the text/reading domain: how scripture is broken into units, how those units are addressed, and how multiple translations relate.

## Language

### Text units

**Token**:
A single **word- or punctuation-occurrence** in a *translation's* text — the unit of storage, rendering, and within-translation hit-testing. Whitespace is **not** a Token: spacing is a render/layout concern owned by the presentation layer, never corpus data. Per-translation — a KJV Token and a BSB Token are never the same object.
_Avoid_: word (ambiguous with Original Word); treating whitespace as a Token

**Original Word**:
A single word-occurrence in the original Greek/Hebrew text, identified by a stable word-id plus lemma and Strong's number. The shared hub that translation Tokens align to (N Tokens → 1 Original Word).
_Avoid_: lemma (that is the dictionary form, not the occurrence), Strong's (that is the lexical id, not the occurrence)

**Block**:
A contiguous range of Tokens forming one literary unit — a prose paragraph, a poetry line, or a heading — carrying a genre and indent level. The unit of rendering. Derived from USFM markers (`\p`, `\q#`, …). Blocks **partition** the token stream (non-overlapping; every Token belongs to exactly one Block). Overlapping literary structures (chiasm, inclusio, parallelism) are a *separate* later layer, not Blocks. Heading Blocks (titles, section headings) sit outside the verse sequence — their Tokens carry no Canonical Verse and are addressed via their Block, not a word-index.
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

**Cross-reference**:
An editorial, shipped link between two passages (e.g. from the Treasury of Scripture Knowledge) — read-only and authoritative; the app's own "this connects to that." Its user-authored sibling is the Connector. A Portal (see `WISHLIST.md`) is a Cross-reference gated by reading progress.
_Avoid_: reference (a single address; a Cross-reference links two)

### User marks

**Markup**:
The portable, data class of user marks — re-rendered by the app from references rather than stored as pixels, so it reflows and ports across translations. An umbrella over Mark, Note, and Connector. Contrast Ink.
_Avoid_: annotation (covers both Markup and Ink)

**Mark**:
A decoration bound to a scripture Anchor — underline, highlight, box, circle, strike. Its position is derived from the targeted words; it has no independent location.
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
A freehand pen annotation captured as stroke points over one translation's rendered layout. Personal and expressive — the "physical Bible" feel — but bound to that layout and not portable across translations.
_Avoid_: drawing (Markup also draws), stroke (one component of an Ink mark)

**Layer**:
A named, toggleable group of user marks with a `visible` flag — the "notes on/off" feature. Spans both Markup and Ink.

## Rules

- **Translations are spokes, never linked directly.** Cross-translation relations are transitive through two shared hubs only: the Canonical Verse (coarse, passage grain) and the Original Word (fine, word grain). There is no Token-to-Token edge between translations.
- **Markup is portable; Ink is scoped.** Markup re-renders from its Anchor, so it reflows across fonts and travels across translations (verse grain always; word grain via the Original Word hub). Ink is bound to one translation's layout and is never transplanted.
- **Annotations are a scene graph anchored to scripture, never to canvas coordinates.** Every element's position resolves from a scripture Anchor (plus an offset for free-placed Notes), computed at render; Connectors bind to elements/Anchors, never to pixels. This is what keeps marks alive through reflow, scroll-mode switches, and translation changes.
