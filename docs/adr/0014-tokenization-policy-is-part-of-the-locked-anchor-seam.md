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

## Consequences

- Scope: **translation corpora only.** Phase-3 original-language segmentation is outsourced to
  external per-occurrence ids ([ADR-0007](0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md))
  precisely so we never own that numbering.
- The rules join CONTEXT.md's Token entry by pointer once fixed; until then the prototype-usfm
  ingester's behavior is **provisional**, not policy.
