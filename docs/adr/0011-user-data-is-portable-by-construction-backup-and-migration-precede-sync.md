# User data is portable by construction; backup and device-migration ship before sync

User data (Phase-1 reading settings; later annotations and Ink) is designed to be **serialized out
and reloaded on any device from day one**, because backup, reinstall, and device-upgrade are the
**same operation as sync minus concurrency**. Phase 1 stays single-device
([ADR-0009](0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md)) but ships
**backup/restore**, not merely local storage: the user DB rides **OS device backup** (iCloud /
Google) by living in a backup-included sandbox directory, plus a **manual export/import file** for
**cross-ecosystem** migration (iPad ↔ Android, which OS backup cannot bridge). The portability
**invariants** are locked in Phase 1 so that Phase-4+ sync and Phase-5 Ink drop in with **no re-key
and no migration**.

## The locked invariants

- **Identity = client-generated UUIDs** on every user row — extends the annotation-layer rule
  ([ADR-0006](0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md)) to Phase-1
  `reading_settings` / `layout_preset` / `layout_override`. No autoincrement identity that collides
  on restore/merge.
- **Anchors are coordinate / semantic keys, never corpus DB ids** — already required by
  [ADR-0001](0001-three-layer-anchor-model.md) / [ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md);
  a restored row survives corpus re-ingest because it points at canonical coordinates and
  `genre`/`role`/`book.slug`, not renumbered ids.
- **Magnitudes in relative units, never absolute pixels** — so restored settings stay sane at the
  new device's viewport ([ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md)).
- **Every user row carries `updatedAt` + a soft-delete tombstone** — last-write-wins and deletion
  survive a future merge; unused by Phase 1's single writer but free to add now and painful to
  retrofit.
- **The export file is self-describing.** Every export carries an envelope header: **schema
  version** (which migrations the rows reflect), **app version** (diagnostics), **export
  timestamp**, and the **corpus edition(s)** the anchors were minted against
  ([ADR-0013](0013-corpus-text-is-versioned-and-markup-carries-a-quote-witness.md)). Import =
  read header → run pending schema migrations on the imported rows → reconcile against the
  current corpus edition (quote witness) → merge by UUID. A version-1 file must import cleanly
  into a version-N app.

## Considered options

- **Local-only in Phase 1, add backup/restore later with sync** — rejected: a user who upgrades or
  reinstalls before Phase 4+ loses everything, and retrofitting identity (`int PK → UUID`) and
  tombstones onto live user data is exactly the migration [ADR-0005](0005-four-product-phases-design-all-build-in-order.md)
  forbids. Backup is nearly free once the invariants hold.
- **Build a full sync engine in Phase 1 to get backup** — rejected: over-build. Concurrency,
  conflict resolution, and a backend are not needed to back up one device's tiny rows; export/import
  + OS backup cover it.
- **Rely on OS device backup as the sole mechanism** — rejected: iCloud will not restore to Android
  (and vice-versa), so cross-ecosystem migration needs a portable file. The manual export/import is
  the cheap, honest stand-in for sync until Phase 4+.
- **Back up everything, including corpus and computed layout** — rejected: the corpus is bundled and
  re-derivable and the computed layout is ephemeral
  ([ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md),
  [ADR-0009](0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md)); only the small user
  DB is backed up. The computed-layout cache lives in a **non-backed-up cache directory** so it never
  bloats the backup.

## Consequences

- The two-database split ([ADR-0009](0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md))
  pays off directly: **only the user DB is backed up**; the corpus is re-bundled, the cache is
  rebuilt.
- **Restore is correct by construction**: loading an exported user DB on a fresh install at a
  *different* viewport resolves settings and recomputes layout for the new viewport — there is no
  device-coupled state to fix up. This is the same property that makes sync need no multi-device
  layout code.
- **Phase 4+ sync is "continuous bidirectional restore"** over these same rows; **Phase-5 Ink**,
  though heavier, is already a neutral, block-normalized, UUID-identified stroke model
  ([drawing-architecture-plan.md §6](../../drawing-architecture-plan.md)) — portable by the same
  rules. The seam holds across phases, which is the point.
- The export/import **file format** and the eventual sync backend remain **reversible**; the
  invariants above are the locked part.
