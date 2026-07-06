/**
 * Failure-safe user-DB swap for manual import (#13, ADR-0011). The import must
 * replace `user.db` with a staged backup file, but the naive "delete the live DB
 * then copy the import into place" leaves a window where a copy failure (low
 * disk, FS error) destroys the DB with nothing to restore — losing every setting
 * and `reading_position` bookmark.
 *
 * `swapUserDb` closes that window: it stages the import beside the live DB, moves
 * the original aside as a backup, then moves the import into place. There is NO
 * point where the live path is absent without the backup holding the original —
 * any failure either leaves the live DB untouched or restores it from the backup
 * before re-surfacing the error.
 *
 * The fs surface is injected (`FsOps`) so the recovery ordering is unit-testable;
 * `restore-data.ts` supplies the real expo-file-system implementation.
 */

/** The minimal, synchronous filesystem surface the swap needs. */
export interface FsOps {
  exists(path: string): boolean;
  /** Copy `from` to `to`, overwriting an existing `to`. */
  copy(from: string, to: string): void;
  /** Move `from` to `to`, overwriting an existing `to`. */
  move(from: string, to: string): void;
  delete(path: string): void;
}

/** Absolute paths involved in the swap (all plain fs paths, no `file://`). */
export interface SwapPaths {
  /** Staged import file in the cache dir — the source to install. */
  readonly staged: string;
  /** The live `user.db` path the app opens. */
  readonly live: string;
  /** Scratch copy of the import beside the live DB (`user.db.import`). */
  readonly importTmp: string;
  /** The moved-aside original, kept until the swap is confirmed (`user.db.bak`). */
  readonly backup: string;
  /** Live DB's WAL sidecar (`user.db-wal`) — stale after the swap. */
  readonly wal: string;
  /** Live DB's shared-memory sidecar (`user.db-shm`) — stale after the swap. */
  readonly shm: string;
}

/** Delete a path if present, swallowing errors — cleanup must never fail the swap. */
function safeDelete(fs: FsOps, path: string): void {
  try {
    if (fs.exists(path)) fs.delete(path);
  } catch {
    // best-effort: a leftover scratch/sidecar file is harmless
  }
}

/**
 * Install `paths.staged` as the live user DB, recoverably. Throws (after
 * restoring the original) if the swap cannot complete; the DB is never left
 * absent-and-unreplaced.
 */
export function swapUserDb(fs: FsOps, paths: SwapPaths): void {
  // 1. Stage the import beside the live DB. The live DB is still intact here, so
  //    a copy failure is fully recoverable: clean up the scratch and rethrow.
  safeDelete(fs, paths.importTmp);
  try {
    fs.copy(paths.staged, paths.importTmp);
  } catch (err) {
    safeDelete(fs, paths.importTmp);
    throw err;
  }

  // 2. Move the live DB aside so we can roll back if the final move fails.
  safeDelete(fs, paths.backup);
  if (fs.exists(paths.live)) fs.move(paths.live, paths.backup);

  // 3. Put the import in place. If this fails, restore the original from the
  //    backup so the live path is never left empty, then rethrow.
  try {
    fs.move(paths.importTmp, paths.live);
  } catch (err) {
    if (!fs.exists(paths.live) && fs.exists(paths.backup)) fs.move(paths.backup, paths.live);
    safeDelete(fs, paths.importTmp);
    throw err;
  }

  // 4. New DB confirmed in place. Drop the OLD wal/shm sidecars — they belong to
  //    the discarded DB and would corrupt the new file on reopen — and the backup.
  safeDelete(fs, paths.wal);
  safeDelete(fs, paths.shm);
  safeDelete(fs, paths.backup);
}
