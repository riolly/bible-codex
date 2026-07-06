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
 * The SWAP is failure-safe (see `swapUserDb`): the old DB is moved aside and
 * only dropped once the import is confirmed in place, so a copy/move failure
 * never leaves the user without a DB. Restore is otherwise correct by
 * construction (ADR-0004): the imported rows are viewport-pure, so on a fresh
 * install at a DIFFERENT viewport the settings resolve and the layout recomputes
 * with no device-coupled state to fix up.
 */

import { File, Paths } from 'expo-file-system';
import { openDatabaseSync } from 'expo-sqlite';
import * as Updates from 'expo-updates';
import { DevSettings } from 'react-native';

import { userSqlite } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { isImportable, parseEnvelope } from './envelope';
import { uriToPath } from './fs-path';
import { type FsOps, type SwapPaths, swapUserDb } from './swap-db';

const BUNDLED_TAGS = Object.keys(migrations.migrations);
const STAGING_NAME = 'import-staging.bcxbackup';

export type ImportResult =
  | { readonly status: 'imported' }
  | { readonly status: 'needs-restart' }
  | { readonly status: 'canceled' }
  | { readonly status: 'rejected'; readonly reason: string };

/** Real filesystem surface for `swapUserDb`, backed by expo-file-system. */
const realFs: FsOps = {
  exists: (path) => new File(`file://${path}`).exists,
  copy: (from, to) =>
    new File(`file://${from}`).copySync(new File(`file://${to}`), { overwrite: true }),
  move: (from, to) =>
    new File(`file://${from}`).moveSync(new File(`file://${to}`), { overwrite: true }),
  delete: (path) => new File(`file://${path}`).delete(),
};

/**
 * Pick an exported file and restore the user DB from it. On success the app
 * RELOADS (this function does not return normally), unless the reload itself is
 * unavailable in this build — then it resolves `needs-restart` so the caller can
 * ask the user to relaunch. A newer-app export or a file that is not a Bible
 * Codex backup is rejected BEFORE anything is swapped, so a bad pick can never
 * corrupt the live DB.
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
  const paths: SwapPaths = {
    staged: `${cacheDir}/${STAGING_NAME}`,
    live: userDbPath,
    importTmp: `${userDbPath}.import`,
    backup: `${userDbPath}.bak`,
    wal: `${userDbPath}-wal`,
    shm: `${userDbPath}-shm`,
  };

  // Swap: close the live DB, then install the import failure-safely. If the swap
  // throws it has already restored the original DB — surface the error and stop.
  userSqlite.closeSync();
  try {
    swapUserDb(realFs, paths);
  } catch (err) {
    safeDeleteFile(staging);
    throw err;
  }
  safeDeleteFile(staging);

  // Reopen happens in _layout.tsx after reload; the migrator runs pending
  // migrations on the imported rows.
  return await reloadApp();
}

/** Delete a File if present, ignoring errors — scratch cleanup must not throw. */
function safeDeleteFile(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // best-effort: a leftover cache file is harmless
  }
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

/**
 * Reload the whole app so the DB client reopens against the swapped file. The
 * swap already succeeded, so a reload that is unavailable (expo-updates disabled
 * in the build) must NOT read as an import failure: resolve `needs-restart` and
 * let the caller ask the user to relaunch manually.
 */
async function reloadApp(): Promise<ImportResult> {
  if (__DEV__) {
    // expo-updates reloadAsync rejects in Expo Go / dev; use the dev reloader.
    DevSettings.reload();
    return { status: 'imported' };
  }
  try {
    await Updates.reloadAsync();
    return { status: 'imported' };
  } catch {
    return { status: 'needs-restart' };
  }
}
