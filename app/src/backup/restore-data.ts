/**
 * Manual import (#13, ADR-0011): restore the user DB from a file exported by
 * this app on another device — cross-ecosystem migration (iPad ⇄ Android) that
 * OS backup cannot bridge. Restores settings/presets/overrides AND the
 * `reading_position` bookmark in every book (#14, ADR-0012).
 *
 * The mechanism (per the DB-layer review): read the file's self-describing
 * envelope, gate on version, then CLOSE the live DB → SWAP the file → RELOAD so
 * `_layout.tsx` reopens it and the `useMigrations` gate upgrades an older file
 * for free (its `__drizzle_migrations` table travels inside). P1 import is a
 * full file REPLACE (single device, no sync); the UUID / `updatedAt` /
 * soft-delete invariants baked into the rows are what let a Phase-4 sync drop
 * in as a genuine merge later.
 *
 * Restore is correct by construction (ADR-0004): the imported rows are
 * viewport-pure, so on a fresh install at a DIFFERENT viewport the settings
 * resolve and the layout recomputes with no device-coupled state to fix up.
 */

import { File, Paths } from 'expo-file-system';
import { deleteDatabaseSync, openDatabaseSync } from 'expo-sqlite';
import * as Updates from 'expo-updates';
import { DevSettings } from 'react-native';

import { userSqlite } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { isImportable, parseEnvelope } from './envelope';

const BUNDLED_TAGS = Object.keys(migrations.migrations);
const STAGING_NAME = 'import-staging.bcxbackup';

export type ImportResult =
  | { readonly status: 'imported' }
  | { readonly status: 'canceled' }
  | { readonly status: 'rejected'; readonly reason: string };

/** SQLite/openDatabaseSync want a plain fs path, not a `file://` URI. */
function uriToPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, '')).replace(/\/+$/, '');
}

/**
 * Pick an exported file and restore the user DB from it. On success the app
 * RELOADS (this function does not return normally). A newer-app export or a
 * file that is not a Bible Codex backup is rejected BEFORE anything is swapped,
 * so a bad pick can never corrupt the live DB.
 */
export async function importUserData(): Promise<ImportResult> {
  const pick = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (pick.canceled) return { status: 'canceled' };

  const cacheDir = uriToPath(Paths.cache.uri);
  const staging = new File(Paths.cache, STAGING_NAME);
  if (staging.exists) staging.delete();
  // Stage into a real cache file first: the picked handle may be a content://
  // URI (Android) that SQLite cannot open directly.
  pick.result.copySync(staging);

  // Read + gate the envelope from the staged copy (read-only) before any swap.
  const gate = readAndGateEnvelope(cacheDir);
  if (!gate.ok) {
    staging.delete();
    return { status: 'rejected', reason: gate.reason };
  }

  // Capture the live DB's path BEFORE closing (safe to read after, but explicit).
  const userDbPath = userSqlite.databasePath;

  // Swap: close the live DB, drop it + its -wal/-shm siblings, move the import
  // into place. The migration gate upgrades it on the next open.
  userSqlite.closeSync();
  deleteDatabaseSync('user.db');
  staging.copySync(new File(`file://${userDbPath}`), { overwrite: true });
  staging.delete();

  // Reopen happens in _layout.tsx after reload; the migrator runs pending
  // migrations on the imported rows. Updates.reloadAsync() is the production
  // path; DevSettings.reload() covers the dev client.
  reloadApp();
  return { status: 'imported' };
}

/** Open the staged copy read-only, parse its envelope, and gate on version. */
function readAndGateEnvelope(cacheDir: string): { ok: true } | { ok: false; reason: string } {
  const copy = openDatabaseSync(STAGING_NAME, {}, cacheDir);
  try {
    let row: { json: string } | null;
    try {
      row = copy.getFirstSync<{ json: string }>('SELECT json FROM export_envelope LIMIT 1');
    } catch {
      return { ok: false, reason: 'This file is not a Bible Codex backup.' };
    }
    if (!row) return { ok: false, reason: 'This backup is empty or corrupt.' };

    let envelope;
    try {
      envelope = parseEnvelope(row.json);
    } catch {
      return { ok: false, reason: 'This backup is corrupt and cannot be read.' };
    }
    const gate = isImportable(envelope, BUNDLED_TAGS);
    return gate.ok ? { ok: true } : { ok: false, reason: gate.reason };
  } finally {
    copy.closeSync();
  }
}

/** Reload the whole app so the DB client reopens against the swapped file. */
function reloadApp(): void {
  if (__DEV__) {
    // expo-updates reloadAsync rejects in Expo Go / dev; use the dev reloader.
    DevSettings.reload();
    return;
  }
  void Updates.reloadAsync();
}
