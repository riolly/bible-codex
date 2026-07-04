# The tokenization policy is part of the locked anchor seam

An Anchor's `word_index` is "the ordinal of a *word* Token within the verse, punctuation
excluded" (CONTEXT.md). What counts as one word — *LORD's*, *father-in-law*, elisions,
numbers — is decided by the ingest tokenizer. That makes the tokenization rules **part of the
meaning of every anchor coordinate**: change a rule and every subsequent word index in affected
verses shifts, silently corrupting marks exactly like a text revision
([ADR-0013](0013-corpus-text-is-versioned-and-markup-carries-a-quote-witness.md)) — except we
did it to ourselves. Migration-fatal seam #1 (coordinate anchoring,
[ADR-0001](0001-three-layer-anchor-model.md)) is hereby declared to **include the tokenization
policy**:

1. The word/punct classification rules are **registered, versioned corpus policy**, recorded in
   this ADR when the real ingester lands. The exact rules are decided *during* that build,
   driven by tap-target UX — a Token is also the unit the reader taps.
2. **Any rule change is an anchor migration** — treated with the same gravity as changing the
   anchor columns themselves, with ADR-0013's reconciliation as the safety net.
3. The [ADR-0010](0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md) golden
   fixtures are **adversarial**: possessives, hyphenated compounds, elisions, numbers, mixed
   punctuation — so rule drift fails tests loudly, not silently in shipped anchors.

## Considered options

- **Leave the rules implicit in ingester code** — rejected: fixtures would pin behavior only
  accidentally, and a well-meaning "tokenizer bugfix" would ship an anchor migration nobody
  noticed.
- **Fold into ADR-0010** — rejected: 0010 owns pipeline mechanics; this is a *seam declaration*
  that outlives any particular pipeline.
- **Count punctuation in `word_index` (simpler rule)** — rejected, and the existing
  punctuation-excluded choice is reaffirmed with a new reason: real-world text revisions touch
  punctuation far more often than words (modernized quotes, commas), so punctuation-excluded
  indexes are immune to the most common class of edition churn (ADR-0013).

## The registered policy (v1 — fixed 2026-07-04, issue #6)

Implemented and guarded in `app/scripts/ingest/tokenize.ts` (the single tokenizer both KJV and
BSB ingest through); adversarial fixtures in `app/scripts/ingest/tokenize.test.ts` and the
golden fixture pin every rule. **A failing tokenizer test is an anchor migration, not a test to
update.**

1. A **word token** is a maximal run of letters/digits joined by *internal* apostrophes
   (`'`/`’`) or hyphens (`-`); it must **begin and end alphanumeric**. Possessives (*LORD's*)
   and hyphenated compounds (*father-in-law*) are ONE word — one tap target.
2. A **grouped number** — digits joined by `,` or `.` (*144,000*, *3.5*) — is ONE word token.
3. A **trailing bare apostrophe** (*disciples’*) and a **leading elision apostrophe** (*’Twas*)
   are punct, not part of the word — a quote-style revision (`'` → `’`) at a word edge touches
   only punct text, never a word (ADR-0013 immunity for the most common edition churn).
4. Everything else non-space is **punct**; a maximal run of punct characters (`,”`, `—`)
   collapses into a **single punct token**, addressed by the word it follows.
5. **Whitespace is never a token** (CONTEXT.md).
6. A **verse bridge** (`\v 17-18`) collapses to its FIRST number: every token in the bridged
   passage carries `verse = 17`, word indexes count from the bridge start, and the bridge end
   survives only as an ingest stat (`verseBridges`). The later number(s) never mint a
   coordinate, so no anchor can reference them — surfacing verse *ranges* later therefore
   requires re-ingest and is an **anchor migration** like any other rule change. Guarded by
   the golden fixture (`\v 5-6` in `adversarial.usfm`).

One clarification the real sources forced (BSB Zech 12): a heading never **inherits** the
preceding verse, but an **explicit `\v` inside a heading para** (a *versified* `\d` descriptive
title) keeps its verse and word indexes — otherwise that verse would vanish from the
translation and be unanchorable. Unversed headings (Psalm titles, `\s`, `\mt`, `\qa`) still
carry `verse = NULL`.

## Consequences

- Scope: **translation corpora only.** Phase-3 original-language segmentation is outsourced to
  external per-occurrence ids ([ADR-0007](0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md))
  precisely so we never own that numbering.
- The retired prototype-usfm tokenizer (preserved at
  [prototype-usfm/src/usfm.ts@e7accb1](https://github.com/riolly/bible-codex/blob/e7accb1501fa0b5329d57b3f83ba77ac5ab96fd4/prototype-usfm/src/usfm.ts))
  was provisional and is now superseded by the registered policy above. Two deliberate
  departures from it: a word must *end* alphanumeric (trailing `’` became punct), and grouped
  numbers became one token — both fixed **before** any anchor was ever minted, so no migration.
