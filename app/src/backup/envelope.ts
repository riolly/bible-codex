/**
 * The self-describing export envelope (ADR-0011, amended). Every manual export
 * carries this header so a version-1 file imports cleanly into a version-N app:
 *
 *   - `schemaVersion` — the NEWEST drizzle migration tag the exported rows
 *     reflect. The authoritative "which migrations are applied" record travels
 *     inside the exported db's `__drizzle_migrations` table; this field is the
 *     cheap gate the importer checks BEFORE swapping (constraint #3).
 *   - `appVersion` — diagnostics only.
 *   - `exportedAt` — epoch SECONDS (matching the schema's `unixepoch()` grain).
 *   - `corpusEditions` — the edition(s) the anchors were minted against
 *     (ADR-0013); P1 only records them (quote-witness reconciliation is P2).
 *
 * Pure + dependency-free so it unit-tests in Node (vitest); the RN-bound export
 * / import orchestration lives in export-data.ts / restore-data.ts.
 */

export interface ExportEnvelope {
  /** Newest migration tag the rows reflect (timestamp-prefixed → lexically sortable). */
  readonly schemaVersion: string;
  readonly appVersion: string;
  /** Epoch seconds. */
  readonly exportedAt: number;
  readonly corpusEditions: string[];
}

export interface BuildEnvelopeInput {
  readonly appVersion: string;
  readonly corpusEditions: readonly string[];
  /** The bundle's applied migration tags (any order). */
  readonly migrationTags: readonly string[];
  /** Injectable clock (epoch seconds); defaults to now. */
  readonly now?: number;
}

/** The newest tag by lexical order — tags are `<timestamp>_<name>`, so this is chronological. */
function newestTag(tags: readonly string[]): string {
  if (tags.length === 0) throw new Error('buildEnvelope: no migration tags — a bundle always has migrations');
  return tags.reduce((max, t) => (t > max ? t : max));
}

export function buildEnvelope(input: BuildEnvelopeInput): ExportEnvelope {
  return {
    schemaVersion: newestTag(input.migrationTags),
    appVersion: input.appVersion,
    exportedAt: input.now ?? Math.floor(Date.now() / 1000),
    corpusEditions: [...input.corpusEditions],
  };
}

/** Parse + validate an envelope JSON string; throws on malformed input. */
export function parseEnvelope(json: string): ExportEnvelope {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== 'object' || raw === null) throw new Error('envelope: not an object');
  const e = raw as Record<string, unknown>;
  if (typeof e.schemaVersion !== 'string') throw new Error('envelope: bad schemaVersion');
  if (typeof e.appVersion !== 'string') throw new Error('envelope: bad appVersion');
  if (typeof e.exportedAt !== 'number') throw new Error('envelope: bad exportedAt');
  if (!Array.isArray(e.corpusEditions) || !e.corpusEditions.every((x) => typeof x === 'string')) {
    throw new Error('envelope: bad corpusEditions');
  }
  return {
    schemaVersion: e.schemaVersion,
    appVersion: e.appVersion,
    exportedAt: e.exportedAt,
    corpusEditions: e.corpusEditions as string[],
  };
}

export type ImportGate = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Gate an import BEFORE swapping the file (constraint #3): a file whose schema
 * version is newer than anything this bundle knows would fail weirdly under the
 * forward-only migrator, so refuse it up front. Same/older files pass — the
 * migration gate in _layout.tsx upgrades them for free.
 */
export function isImportable(env: ExportEnvelope, bundledTags: readonly string[]): ImportGate {
  const newest = newestTag(bundledTags);
  if (env.schemaVersion > newest) {
    return {
      ok: false,
      reason: 'This backup was made by a newer version of the app. Update the app, then import again.',
    };
  }
  return { ok: true };
}
