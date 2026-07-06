# Backup & device-migration verification (#13)

Two restore mechanisms over the **user DB only** (ADR-0011). This doc records
how each acceptance criterion is verified, including the OS-backup criteria that
are satisfied by *placement* (done in #5 / #11) rather than new code in #13.

## Mechanism 1 — OS device backup (same ecosystem)

**No new placement code in #13** — the policy is already encoded:

- `src/db/paths.ts`: the read-write **user DB** inherits expo-sqlite's default
  location, which is the **backed-up document sandbox** (iOS `Documents`,
  Android `files/`). The **computed-layout cache** (`CACHE_DIR`) and the
  **corpus working copy** (`CORPUS_DIR`) live under the **non-backed-up cache
  dir** (iOS `Library/Caches`, Android `cacheDir`).
- `plugins/with-android-backup-rules.js`: Android Auto Backup / device-transfer
  is scoped to **`SQLite/user.db` (+ `-wal`, `-shm`) only**. Everything else is
  excluded by omission, so the 100 MB+ corpus can never blow the ~25 MB Auto
  Backup quota and silently kill the backup of `user.db`.

### iOS
- Document dir → included in iCloud/device backup automatically. No Info.plist
  change needed.
- `Library/Caches` → excluded from backup by the OS automatically → the
  computed-layout cache and corpus copy never ride the backup. **(AC7)**

### Android
- Backup rules above include only the user DB. **(AC7)**

### AC1 verification (reinstall restores settings)
Same-ecosystem OS backup restore is impractical to exercise on a bare simulator
(needs a real iCloud/Google backup round-trip). AC1 is satisfied by the
**documented inclusion** above (the AC explicitly permits this) plus the
export/import round-trip (Mechanism 2), which exercises the same
"load an exported user DB on a fresh install" path end to end.

To exercise on a real device (optional, strongest evidence):
1. Edit settings + bookmark several books.
2. Trigger a backup (iOS: Settings → iCloud → Back Up Now; Android: `adb shell bmgr backupnow <pkg>`).
3. Uninstall, reinstall, restore from backup.
4. Confirm settings + every bookmark return, and the corpus/computed cache were
   NOT part of the backup payload.

## Mechanism 2 — Manual export/import file (cross-ecosystem)

Code: `src/backup/export-data.ts`, `restore-data.ts`, `envelope.ts`.

- **Export (AC2, AC3):** `VACUUM INTO` (never a file copy — WAL-safe) produces
  one compacted file, then stamps an `export_envelope` table (schema version /
  app version / timestamp / corpus editions). Only the user DB is exported.
- **Import (AC4, AC5):** read + gate the envelope → close DB → swap file →
  reload → the `useMigrations` gate in `_layout.tsx` upgrades an older file
  (its `__drizzle_migrations` travels inside).
- **Newer-file rejection:** `isImportable` refuses a file whose schema version
  is newer than the running bundle, before any swap.

### Round-trip on a new viewport (AC6)
1. On device/simulator A (e.g. tablet, wide aspect): set a distinct preset,
   theme, and bookmark several books. **Export** → save the file.
2. On device/simulator B at a **different viewport/aspect ratio** (e.g. phone
   portrait), fresh install: **Import** the file.
3. Assert: settings resolve (preset/theme applied), the bookmark in **every**
   book is restored, and the page **recomputes** for B's viewport with no
   device-coupled artifacts (ADR-0004 viewport-pure recompute). The engine's
   existing layout tests already prove resolution is viewport-pure; this
   confirms it end to end over restored rows.

### Older-file → newer-app (AC5)
1. Export on the current schema.
2. Add a no-op migration to the bundle (bump the schema).
3. Import the older file → the migration gate upgrades the imported rows
   cleanly; the app opens without error.

### Drive it
`/run` the Expo app, open **Adjust → Data → Export / Import**.

## Unit coverage
- `src/backup/envelope.test.ts` (vitest): envelope build/parse round-trip;
  `isImportable` accepts same/older, rejects newer.
- `__tests__/adjust-panel.test.tsx` (jest): the Data buttons fire export/import.
