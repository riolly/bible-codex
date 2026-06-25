# bible-codex Glossary (teaching workspace)

The canonical language for these lessons. Terms are **promoted here only once you've used
them correctly** — so this grows as you learn, and is *not* the full dictionary.

> The repo's [`CONTEXT.md`](https://github.com/riolly/bible-codex/blob/main/CONTEXT.md) is the **authoritative, complete glossary** for
> the project (every domain term + the rules binding them). This file is the *learned
> subset*, in lesson order, with beginner-facing phrasing.

## Addressing

**Anchor**:
The stored scripture coordinate a user mark points to — `book · chapter · verse ·
word-index` (optionally an Original-Word id). Never pixels. This is what lets a mark
survive font, layout, and translation changes.
_Avoid_: pixel position, location, x/y

**word-index**:
The 0-based position of a *word* within a verse, **counting words only — punctuation
excluded**. In "In the beginning…", `In`=0, `the`=1, `beginning`=2.
_Avoid_: character offset, column

**Canonical Verse**:
A `(book, chapter, verse)` address in the one chosen reference numbering — the coarse,
cross-translation way to point at a passage. (The everyday "John 3:16".)
_Avoid_: reference, citation

## Translations & the two worlds

**Translation**:
One team's rendering of the original Hebrew/Greek into a language (KJV, NASB, BSB). Each is
its own copy of the text — same passages, different words.
_Avoid_: version (overloaded), edition

**Corpus**:
The read-only Bible text shipped with the app (all translations + their structure). You
never edit it; it can be re-imported any time.
_Avoid_: database, content

**User layer**:
Your editable, synced data — highlights, notes, connectors, ink, bookmarks. A separate world
from the Corpus; the two meet only at an **Anchor**.
_Avoid_: annotations (that's one part), profile

**Spoke / Hub**:
Translations are **spokes** that never link to each other directly; they connect only
through two shared **hubs** — the **Canonical Verse** (coarse, by passage) and the Original
Word (fine, by the underlying Greek/Hebrew word).
_Avoid_: linking translations token-to-token

**Original Word** *(met fully in Phase 3)*:
The single Greek/Hebrew word-occurrence that translations align to — the fine, word-grain
hub. (A whole word in Greek; a morpheme in Hebrew.)
_Avoid_: lemma (dictionary form), Strong's (the lexical id)

---
*Overview complete: [Lesson 1 — The Anchor](/lessons/0001-the-anchor),
[Lesson 2 — Two worlds & spokes](/lessons/0002-two-worlds-and-spokes). Phase-by-phase
terms get added as each phase is taught.*
