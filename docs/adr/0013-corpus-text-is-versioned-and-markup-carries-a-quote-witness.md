# Corpus text is versioned and Markup carries a quote witness

Coordinate anchors survive corpus **re-ingest** (ids renumber, coordinates don't —
[ADR-0001](0001-three-layer-anchor-model.md)/[ADR-0006](0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md)),
but coordinate stability silently assumed **text stability** — and translations get revised
(the BSB is actively maintained and publishes textual corrections). A revision that inserts or
reorders words shifts `word_index`, and every affected mark silently slides onto the wrong
words: no error, no orphan, just corrupted meaning discovered months later. Three additions
close the gap:

1. **`translation.edition`** — an edition identifier stamped at ingest
   ([ADR-0010](0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md) pipeline).
2. **A quote witness on every Markup anchor** — `mark.target_quote` / `note.pin_quote` /
   `binding.anchor_quote`: the surface text of the anchored words stored beside the coordinate,
   plus the `corpus_edition` the row was minted against. The coordinate remains the anchor; the
   quote is redundant *verification* data (the W3C Web Annotation `TextQuoteSelector` pattern,
   as used by Hypothes.is).
3. **A consent-gated reconciliation pass** when the app first runs against a changed edition:
   marks whose quote still matches their coordinate pass untouched (the overwhelming majority);
   a mismatch triggers **auto-repair only when the quote matches exactly once within the same
   verse**; anything else is flagged *displaced* into a review list — surfaced honestly, never
   guessed across verses.

## Considered options

- **No witness (status quo)** — rejected: silent user-data corruption with no detection path.
- **Quote + prefix/suffix context (full W3C selector)** — rejected: the verse coordinate already
  bounds the search space to a handful of words; the quote alone suffices.
- **Lazy render-time verification** — rejected: pays the check on every layout forever; an
  edition change is a rare, detectable event — reconcile once.
- **Keep the previous corpus so users can defer the text update** — rejected: doubles corpus
  storage and forks the read path for a rare event. The corpus is bundled with the app, so the
  old edition is gone after an update; consent is consent-to-**reconcile** (with a
  displaced-marks review), not consent-to-update. If translations ever ship as downloadable
  packs, true opt-in updates fall out naturally then.
- **Witness on Ink** — rejected: Ink is already edition-bound by its layout key
  ([ADR-0016](0016-codex-and-scroll-are-purpose-bound-reading-modes.md)); any text revision
  invalidates that key anyway.

## Consequences

- The locked seams are untouched: anchors are still coordinates; the quote is additive columns.
- The same reconciliation catches **tokenizer-policy drift**
  ([ADR-0014](0014-tokenization-policy-is-part-of-the-locked-anchor-seam.md)) — one mechanism
  guards both failure classes.
- Export/import ([ADR-0011](0011-user-data-is-portable-by-construction-backup-and-migration-precede-sync.md))
  records corpus editions in the export envelope, so an import onto a newer edition reconciles
  immediately.
- Ingest must mint `edition` deterministically (source-text checksum or upstream version tag —
  exact scheme decided when the real pipeline lands; reversible).
