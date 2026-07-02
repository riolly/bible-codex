# Reading position is one canonical bookmark per book

Phase 1 ships a `reading_position` table — the "each scroll keeps its place" invariant from
VISION.md made durable. One live row per book: a **canonical point anchor at verse grain**
(`book.slug` + chapter + verse), carrying the standard user-data identity + lifecycle
(client UUIDv7, `created_at`/`updated_at`/`deleted_at`,
[ADR-0011](0011-user-data-is-portable-by-construction-backup-and-migration-precede-sync.md)).
The concept already existed — CONTEXT.md's Anchor is what "any user mark or reading position
attaches to", and [ADR-0010](0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md)
depends on reading position porting across translations — but **no table owned it**; a P1
reader that loses your place on restore fails ADR-0011's own bar.

Deliberate exception, recorded: user-mark anchors are translation-bound (CONTEXT.md), but the
bookmark is **canonical-only** — it relates the *reader* to the *passage*, not to one
translation's words, so switching KJV → BSB lands you in the same place via the canonical verse.

## Considered options

- **Per-translation bookmarks** — rejected: position should follow the reader across
  translations; per-translation rows recreate the divergence the Canonical Verse hub exists to
  bridge.
- **Store scroll offset (pixels / fraction)** — rejected: device- and typography-coupled state,
  exactly what [ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md)/0011
  forbid. Verse grain is the durable truth; sub-verse scroll restoration was considered and
  dropped (not wanted).
- **`book_slug` as primary key** — rejected: hard-locks one-per-book into row identity. UUIDv7
  PK + a separate unique index on the book column keeps the future multi-position case a
  `DROP INDEX` away — though that future ("research pins") is expected to be a **separate
  entity** with opposite physics: pins are many, deliberately placed, and static; the bookmark
  is singular and moves constantly.
- **Fold into `reading_settings`** — rejected: different cardinality (per-book vs singleton)
  and a very different write rate.

## Consequences

- Journey (Phase 4) reads its "how far has the reader gone" signal from this table for free —
  one bookmark per book is already the WISHLIST invariant.
- When sync arrives, the documented merge rule is **furthest-read wins** (as reading apps do),
  not last-write-wins — scrolling back is not a regression of progress. Phase 1's single writer
  doesn't need it; recording it now prevents a wrong LWW default later.
- Backup/restore (ADR-0011) now carries your place in every book by construction.
- A bookmark is **updated, never deleted** in normal use; `deleted_at` exists only for the
  uniform sync convention (DDL enforces uniqueness as a partial index
  `WHERE deleted_at IS NULL`).
