# bible-codex Learning Resources

Trusted sources for this workspace. Knowledge for lessons is drawn from here — not from
guesses. Two faces: the **biblical domain** and the **app's own blueprint**.

## Knowledge — the app's blueprint (primary, highest trust)

These are the project's own source-of-truth documents. For "how is bible-codex built and
why," start here.

- [OVERVIEW.md](../OVERVIEW.md) — the single entry map: what it is, what's decided, what's open. *Reach for: orientation, the locked-vs-reversible split.*
- [CONTEXT.md](../CONTEXT.md) — the complete domain glossary + the rules binding the terms. *Reach for: any term you don't know.*
- [data-architecture.md](../data-architecture.md) — the four-schema / two-bridge shape. *Reach for: how the data worlds fit together.*
- [docs/adr/](../docs/adr/) — the Architecture Decision Records (the "why" of each choice). *Reach for: ADR-0001 (Anchor), ADR-0002 (Markup vs Ink), ADR-0007 (Original Word hub), ADR-0016 (Codex/Scroll modes).*
- [reading-modes-research.md](../docs/design/reading-modes-research.md) — the 2026-07-02 research record behind ADR-0016: Masorah margins, *pagina*, scroll-vs-page reading research, with cited sources. *Reach for: Module 5's historical claims.*
- [VISION.md](../VISION.md) + [WISHLIST.md](../WISHLIST.md) — the philosophy and the post-v1 ideas (Portal, Journey). *Reach for: the "why build it at all," and Phase 4.*
- [schema.dbml](../schema.dbml) — the table shapes themselves (visualizable at dbdiagram.io). *Reach for: exact columns.*

## Knowledge — the biblical domain (external, high-trust)

- [BibleProject — *How to Read the Bible* (literary styles series)](https://bibleproject.com/podcasts/series/how-to-read-the-bible-series/) ([videos](https://bibleproject.com/videos/collections/how-to-read-the-bible/))
  Animated, beginner-friendly, scholar-made. The big three genres — narrative, poetry, prose-discourse. *Reach for: Lesson 3 (why scripture has literary "shape"), the genre-aware-typesetting bet.*
- [USFM 3.0 Specification (UBS ICAP)](https://ubsicap.github.io/usfm/) · current home [docs.usfm.bible](https://docs.usfm.bible)
  The markup standard the corpus is ingested from — `\p` prose, `\q#` poetry indent, headings, Psalm titles. *Reach for: Lesson 3 (Token + Block), how literary structure is encoded.*
- [STEPBible-Data (Tyndale House)](https://github.com/STEPBible/STEPBible-Data) — CC BY 4.0
  Open lexicon + morphology: extended Strong's for Hebrew (TBESH) & Greek (TBESG), morphology codes. *Reach for: Lesson 6 (Strong's, lemma, morphology), a real redistributable Phase-3 corpus.*
- [Blue Letter Bible](https://www.blueletterbible.org/) — interlinear + Strong's, free
  A working interlinear/Strong's tool to *see* the concepts (tap a word → Greek/Hebrew → Strong's → lexicon) before modelling them. *Reach for: Lesson 6, intuition for the word-tap reveal.*
- [awesome-bible-developer-resources](https://github.com/biblenerd/awesome-bible-developer-resources)
  Curated hub of biblical-text datasets, APIs, and tooling (MACULA, OSHB, MorphGNT, versification, Treasury of Scripture Knowledge). *Reach for: sourcing corpora, the Phase-3 open-question.*

## Wisdom (Communities)

- [r/AcademicBiblical](https://www.reddit.com/r/AcademicBiblical/)
  Heavily moderated toward scholarly, sourced answers (not devotional debate). *Use for: "is my understanding of this biblical concept right?" sanity checks.*
- The community links inside [awesome-bible-developer-resources](https://github.com/biblenerd/awesome-bible-developer-resources) (Discords/forums for biblical-text developers). *Use for: corpus/licensing/versification questions from people who've shipped Bible software.*

## Gaps
- No vetted, ready-made **divergent-translation versification fixture** found yet (Psalm titles, Joel/Malachi, Rev 12/13) — needed to validate the native↔canonical round-trip ([OVERVIEW §5](../OVERVIEW.md)). Search target.
- No single high-trust source yet ties **literary genre → typesetting rules**; currently inferred from USFM + BibleProject separately.
