import { Paths } from 'expo-file-system';

/**
 * Storage locations encode the backup policy (ADR-0011):
 *
 *  - The READ-WRITE user DB must live in a device-backup-INCLUDED sandbox dir so
 *    it rides OS backup (iCloud / Google) for free. expo-sqlite's default
 *    location is the app document directory (iOS Documents / Android files),
 *    which is exactly the backed-up sandbox — so `openUserDatabase` passes NO
 *    directory override and inherits it.
 *
 *  - The computed-layout cache is ephemeral and rebuildable (ADR-0004); it must
 *    live in a NON-backed-up cache dir so it never bloats the backup. That is
 *    `Paths.cache` (iOS Library/Caches / Android cacheDir).
 *
 * The corpus DB is a bundled read-only asset (ADR-0009) and is backed up by
 * neither path — it is re-bundled on install.
 */

/** Backed-up sandbox (OS backup rides this). */
export const BACKUP_INCLUDED_DIR = Paths.document;

/** NON-backed-up, rebuildable cache. Computed layout (#7+) goes here. */
export const CACHE_DIR = Paths.cache;

/**
 * Where the corpus DB's working copy MUST live (#6). expo-sqlite's
 * `assetSource` copies the bundled asset into its default SQLite dir, which is
 * under the backed-up document sandbox — that default violates ADR-0011
 * (corpus is backed up by neither path) and, on Android, a 100MB+ corpus blows
 * the ~25MB Auto Backup quota, silently killing the backup of user.db too.
 * Open the corpus with a `directory` override to this NON-backed-up location;
 * if the OS purges it, the asset is simply re-copied on next open.
 */
export const CORPUS_DIR = `${Paths.cache.uri}corpus`;
