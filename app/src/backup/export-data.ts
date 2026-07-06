/**
 * Manual export (#13, ADR-0011): produce a single portable, self-describing
 * file of the USER DB — settings, presets, overrides, AND `reading_position`
 * rows (#14) — that the reader saves/shares and imports on another device to
 * restore their place in every book. Only the user DB travels; the corpus
 * (bundled, re-derivable) and the computed-layout cache (ephemeral, ADR-0004)
 * are never exported.
 *
 * The export is a `VACUUM INTO` copy, NEVER an OS file copy: the live DB runs
 * in WAL mode (user.db + -wal + -shm), so recent writes live in the WAL until
 * checkpointed. A naive copy of user.db yields a stale/corrupt export that
 * passes every small-data test and fails only for the heavy-edit user who most
 * needs it. `VACUUM INTO` produces ONE atomic, checkpointed, compacted file.
 *
 * The file is self-describing: after the VACUUM we stamp an `export_envelope`
 * table (schema version / app version / timestamp / corpus editions) into the
 * copy. The authoritative "which migrations are applied" record already travels
 * inside the copy's `__drizzle_migrations` table, so an older file upgrades
 * through the migration gate on import for free.
 */

import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { deleteDatabaseSync, openDatabaseSync } from 'expo-sqlite';

import { userSqlite } from '@/db/client';
import { getEditions, openCorpus } from '@/db/corpus';
import migrations from '@/db/migrations/migrations';
import { buildEnvelope } from './envelope';
import { uriToPath } from './fs-path';

/** Single-quote a path for safe interpolation into a SQL string literal. */
function sqlQuote(path: string): string {
  return `'${path.replace(/'/g, "''")}'`;
}

const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';
const BUNDLED_TAGS = Object.keys(migrations.migrations);

/**
 * Export the user DB to a portable file and hand it to the OS share sheet.
 * Resolves once the share sheet is dismissed; throws if sharing is unavailable
 * or the VACUUM fails. The temp file is NOT deleted after sharing: on Android the
 * share receiver may still be reading it when `shareAsync` resolves, so an
 * eager delete corrupts the backup. It lives in the NON-backed-up cache dir
 * (OS-evicted) and is cleared before the next export by the pre-VACUUM delete.
 */
export async function exportUserData(): Promise<void> {
  const corpus = await openCorpus();
  const corpusEditions = getEditions(corpus);
  const envelope = buildEnvelope({
    appVersion: APP_VERSION,
    corpusEditions,
    migrationTags: BUNDLED_TAGS,
  });

  const cacheDir = uriToPath(Paths.cache.uri);
  const stamp = new Date(envelope.exportedAt * 1000).toISOString().slice(0, 10);
  const fileName = `bible-codex-${stamp}.bcxbackup`;
  const filePath = `${cacheDir}/${fileName}`;

  // VACUUM INTO refuses to overwrite; clear any prior same-day export first.
  deleteQuietly(fileName, cacheDir);

  // Atomic, checkpointed, compacted single-file copy of the live user DB.
  userSqlite.execSync(`VACUUM INTO ${sqlQuote(filePath)}`);

  // Stamp the self-describing envelope into the copy (not the live DB).
  const copy = openDatabaseSync(fileName, {}, cacheDir);
  try {
    // Keep the export ONE file: force a rollback journal so the envelope write
    // lands in the main db, not a -wal sidecar that wouldn't travel on share.
    copy.execSync('PRAGMA journal_mode=DELETE');
    copy.execSync('CREATE TABLE IF NOT EXISTS export_envelope (json TEXT NOT NULL)');
    copy.runSync('INSERT INTO export_envelope (json) VALUES (?)', JSON.stringify(envelope));
  } finally {
    copy.closeSync();
  }

  if (!(await Sharing.isAvailableAsync())) {
    deleteQuietly(fileName, cacheDir);
    throw new Error('Sharing is not available on this device.');
  }
  // No post-share delete: the receiver may still be reading the file on Android.
  // The pre-VACUUM deleteQuietly above clears it before the next export instead.
  await Sharing.shareAsync(`file://${filePath}`, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Export reading data',
    UTI: 'public.database',
  });
}

/**
 * Best-effort delete of a temp export copy (removes the db + any -wal/-shm
 * siblings in one call); ignores a missing file. Never opens the path — opening
 * a non-existent SQLite db would CREATE it.
 */
function deleteQuietly(name: string, directory: string): void {
  try {
    deleteDatabaseSync(name, directory);
  } catch {
    // never existed / already gone — nothing to clean
  }
}
