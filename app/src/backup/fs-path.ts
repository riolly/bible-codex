/**
 * Shared path helper for the backup module. SQLite (`openDatabaseSync`,
 * `VACUUM INTO`) and raw fs paths need a plain filesystem path, not a `file://`
 * URI — expo's `Paths.cache.uri` and friends hand back URIs.
 */

/** Turn a `file://` URI into a plain fs path, decoded and trailing-slash-free. */
export function uriToPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, '')).replace(/\/+$/, '');
}
