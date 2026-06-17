# bible-codex

A local-first, literary Bible reader. This glossary fixes the language of the text/reading domain: how scripture is broken into units, how those units are addressed, and how multiple translations relate.

## Language

### Text units

**Token**:
A single word-occurrence in a *translation's* text (punctuation and whitespace are their own tokens). The unit of storage, rendering, and within-translation anchoring. Per-translation — a KJV token and a BSB token are never the same object.
_Avoid_: word (ambiguous with Original Word)

**Original Word**:
A single word-occurrence in the original Greek/Hebrew text, identified by a stable word-id plus lemma and Strong's number. The shared hub that translation Tokens align to (N Tokens → 1 Original Word).
_Avoid_: lemma (that is the dictionary form, not the occurrence), Strong's (that is the lexical id, not the occurrence)

**Block**:
A contiguous range of Tokens forming one literary unit — a prose paragraph, a poetry line, or a heading — carrying a genre and indent level. The unit of rendering. Derived from USFM markers (`\p`, `\q#`, …).
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

### User marks

**Markup**:
A semantic annotation that targets a Token range, a Verse, or an Original Word and is *re-rendered by the app* from `{target, style}` — underline, box, circle, arrow, highlight, strike. Reflows with layout and ports across translations because it stores a reference, not pixels.
_Avoid_: highlight (only one kind of Markup), annotation (covers both Markup and Ink)

**Ink**:
A freehand pen annotation captured as stroke points over one translation's rendered layout. Personal and expressive — the "physical Bible" feel — but bound to that layout and not portable across translations.
_Avoid_: drawing (Markup also draws), stroke (one component of an Ink mark)

**Layer**:
A named, toggleable group of user marks with a `visible` flag — the "notes on/off" feature. Spans both Markup and Ink.

## Rules

- **Translations are spokes, never linked directly.** Cross-translation relations are transitive through two shared hubs only: the Canonical Verse (coarse, passage grain) and the Original Word (fine, word grain). There is no Token-to-Token edge between translations.
- **Markup is portable; Ink is scoped.** Markup re-renders from its Anchor, so it reflows across fonts and travels across translations (verse grain always; word grain via the Original Word hub). Ink is bound to one translation's layout and is never transplanted.
