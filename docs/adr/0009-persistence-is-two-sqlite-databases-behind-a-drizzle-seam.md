# Persistence is two SQLite databases behind a Drizzle ORM seam

User data and corpus data are **two separate SQLite databases**, both queried through **Drizzle
ORM** as the single, stable query/schema seam: (1) a **read-only bundled corpus DB** (`translation`,
`book`, `block`, `token`, `versification_map`) shipped as an app asset and opened via
`expo-sqlite` `assetSource`; (2) a **read-write user DB** (`reading_settings`, `layout_preset`,
`layout_override` in Phase 1; the annotation tables later) that is **single-device local-first in
Phase 1, made syncable in Phase 4+**. The **computed layout is never in either database** — it is an ephemeral,
rebuildable local cache ([ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md)).
This realizes the "two data systems" note in [OVERVIEW.md §Data & corpus](../../OVERVIEW.md) and
[data-architecture.md §1](../../data-architecture.md).

## Considered options

- **One database for corpus + user data** — rejected: the corpus is read-only, **freely
  re-ingestable** ([ADR-0001](0001-three-layer-anchor-model.md)), and shipped as a prebuilt asset;
  the user DB is mutable and (later) synced. Different lifecycles, different write rules, different
  sync treatment — keeping them separate lets the corpus be replaced wholesale on re-ingest without
  touching user rows, and lets the user DB adopt a sync engine without touching the corpus.
- **WatermelonDB** — rejected: it bundles its own ORM + sync + observation model and is opinionated
  about schema and reactivity; it fights both Drizzle and the coordinate-join, no-corpus-FK shape
  the annotation layer requires ([ADR-0006](0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md)).
- **op-sqlite as the Phase-1 driver** — deferred, not adopted: its JSI synchronous path wins on
  tens-of-thousands-row scans, but a single chapter's token read is small and the engine re-typesets
  a chapter at ~120fps already (prototype-proven). `expo-sqlite` keeps the default Expo path and
  bundled-asset support. op-sqlite stays an escalation door behind the Drizzle seam if a profiler
  ever demands it.
- **Raw SQL / no ORM** — rejected: Drizzle gives typed schema, migrations bundled as strings (the
  Expo requirement), and `useLiveQuery` reactive reads so settings changes re-typeset with no manual
  cache invalidation.

## Consequences

- **Phase 1 assumes one account = one device; multi-device sync is deferred to Phase 4+**
  (alongside desktop, [ADR-0008](0008-reading-app-is-expo-react-native-skia-over-a-framework-agnostic-engine.md)).
  The user DB is **single-device local-only** in Phase 1 — no sync engine, no upload queue, no
  cross-device anything is built. **Sync, when it lands, is never real-time / CRDT** (no collab) —
  it is plain bidirectional row sync of tiny settings/annotation rows.
- **Drizzle is the seam that makes the eventual sync backend a late, cheap choice.** The intended
  engine is **PowerSync** ([ADR-0006](0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md)
  context): bidirectional, production-mature on mobile, offline-first, loosely coupled to Postgres.
  **ElectricSQL was considered and rejected** for this role: it syncs the read path only (writes go
  through a separate API) and is open-alpha/not-production-recommended, wrong for a client that
  authors its own data. PowerSync ships its own SQLite adapter; because queries and schema go through
  Drizzle, swapping the user DB's driver from `expo-sqlite` to PowerSync's SQLite in Phase 4+ is a
  driver change, not a query rewrite.
- **Settings port across devices by construction, not by sync logic.** Presentation is stored as
  device-independent *rules* and computed layout is a viewport-pure function
  ([ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md)), so when sync
  eventually carries the tiny rule rows to a second device, that device simply recomputes layout for
  its own viewport — there is no multi-device layout code to write, in Phase 1 or Phase 4+. The
  Phase-1 schema stays sync-shaped (client UUIDs, coordinate anchors, no corpus FK per
  [ADR-0006](0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md)) at zero cost, so
  the deferral foreclosing nothing.
- Metro must be configured (`metro.config.js`, `assetExts += 'db'`) to bundle the prebuilt corpus
  `.db`. The corpus asset is produced by the build-time ingest pipeline
  ([ADR-0010](0010-corpus-and-versification-are-ingested-at-build-time-from-usfm.md)).
- Choice of sync backend, op-sqlite escalation, and the corpus-asset packaging are all
  **reversible** — none is a migration-fatal seam.
