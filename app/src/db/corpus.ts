import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { importDatabaseFromAssetAsync, openDatabaseSync } from 'expo-sqlite';

import type { MenuBook } from '../model/book-groups';
import * as schema from './corpus-schema';
import { listBooks, readChapter, type Chapter } from './corpus-read';
import { CORPUS_DIR } from './paths';

/**
 * The corpus DB: a prebuilt, read-only bundled asset (ADR-0009) produced by
 * the build-time ingest pipeline (scripts/ingest, ADR-0010). Run `pnpm ingest`
 * before a build that renders scripture — the asset is generated, not
 * committed.
 *
 * The working copy lives under CORPUS_DIR, a NON-backed-up cache location
 * (ADR-0011): expo-sqlite's default directory sits in the backed-up document
 * sandbox, where a 100MB+ corpus would blow Android Auto Backup's ~25MB quota
 * and silently kill the backup of user.db. If the OS purges the cache, the
 * next open re-copies the asset — cheap, read-only, no data to lose.
 */

const CORPUS_DB_NAME = 'corpus.db';

export type CorpusDb = ExpoSQLiteDatabase<typeof schema>;

let corpus: CorpusDb | null = null;

/** Copy the bundled asset into CORPUS_DIR (no-op when already there) and open it read-only. */
export async function openCorpus(): Promise<CorpusDb> {
  if (corpus) return corpus;
  await importDatabaseFromAssetAsync(
    CORPUS_DB_NAME,
    { assetId: require('../../assets/corpus/corpus.db') }, // Metro asset id
    CORPUS_DIR,
  );
  const db = openDatabaseSync(CORPUS_DB_NAME, {}, CORPUS_DIR);
  db.execSync('PRAGMA query_only = 1'); // corpus is read-only by contract
  corpus = drizzle(db, { schema });
  return corpus;
}

/** The renderable books with chapter counts, for the #23 book/chapter menu. */
export function getBooks(db: CorpusDb, translationAbbrev: string): MenuBook[] {
  return listBooks(db, translationAbbrev);
}

/** Chapter read in render order (see corpus-read.ts for the seam contract). */
export function getChapter(
  db: CorpusDb,
  translationAbbrev: string,
  bookSlug: string,
  chapter: number,
): Chapter {
  return readChapter(db, translationAbbrev, bookSlug, chapter);
}
