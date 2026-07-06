import { and, asc, eq, inArray, max } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { MenuBook } from '../model/book-groups';
import type { Block, Token } from '../model/corpus';
import {
  buildVersificationMap,
  type VersificationMap,
  type VersificationRow,
} from '../model/versification';
import * as schema from './corpus-schema';

/**
 * Chapter read across the ADR-0009 Drizzle seam. Driver-agnostic over the
 * SYNC sqlite drivers: the app calls it with drizzle(expo-sqlite), the ingest
 * round-trip test with drizzle(better-sqlite3) — same schema, same query.
 *
 * The corpus is addressed by SEMANTIC KEYS (translation abbrev + book slug),
 * never by storage ids (ADR-0001/0004).
 */

/** Driver-agnostic bound satisfied by both sync drizzle drivers. */
type SyncSqliteDb = BaseSQLiteDatabase<'sync', any, any, any, any>;

export interface Chapter {
  blocks: Block[];
  tokens: Token[];
}

/**
 * The books the corpus can render, in canonical order, each with its chapter
 * count (= the book's highest chapter number; chapter 0 front matter excluded).
 * The book/chapter menu (#23) groups these by reading order (model/book-groups)
 * and reads a translation only to bound the numbering — chapter counts are
 * av11n-canonical, identical across the bundled translations.
 */
export function listBooks(db: SyncSqliteDb, translationAbbrev: string): MenuBook[] {
  return db
    .select({
      slug: schema.book.slug,
      name: schema.book.name,
      chapters: max(schema.block.chapter),
    })
    .from(schema.book)
    .innerJoin(schema.block, eq(schema.block.bookId, schema.book.id))
    .innerJoin(schema.translation, eq(schema.block.translationId, schema.translation.id))
    .where(eq(schema.translation.abbrev, translationAbbrev))
    .groupBy(schema.book.id)
    .orderBy(asc(schema.book.position))
    .all()
    .map((r) => ({ slug: r.slug, name: r.name, chapters: r.chapters ?? 0 }));
}

/**
 * A book's highest chapter number (the Codex flip bound, #9). Scoped to one
 * book, so it reads a single MAX aggregate instead of aggregating every book
 * in the translation the way `listBooks` does. Chapter 0 front matter never
 * wins the MAX, so this matches `listBooks`' `chapters`.
 */
export function chapterCount(
  db: SyncSqliteDb,
  translationAbbrev: string,
  bookSlug: string,
): number {
  const rows = db
    .select({ max: max(schema.block.chapter) })
    .from(schema.block)
    .innerJoin(schema.translation, eq(schema.block.translationId, schema.translation.id))
    .innerJoin(schema.book, eq(schema.block.bookId, schema.book.id))
    .where(and(eq(schema.translation.abbrev, translationAbbrev), eq(schema.book.slug, bookSlug)))
    .all();
  return rows[0]?.max ?? 1;
}

/**
 * Read one chapter's Block + Token rows, in render order. Chapter 1 also
 * includes chapter 0 — the book's front matter (\mt book title), which the
 * ingest stores before \c 1 and the first Page renders above chapter 1.
 */
export function readChapter(
  db: SyncSqliteDb,
  translationAbbrev: string,
  bookSlug: string,
  chapter: number,
): Chapter {
  const chapters = chapter === 1 ? [0, 1] : [chapter];
  const scoped = <C extends typeof schema.block | typeof schema.token>(table: C) =>
    and(
      eq(schema.translation.abbrev, translationAbbrev),
      eq(schema.book.slug, bookSlug),
      inArray(table.chapter, chapters),
    );

  const blocks: Block[] = db
    .select({
      id: schema.block.id,
      chapter: schema.block.chapter,
      genre: schema.block.genre,
      role: schema.block.role,
      indent: schema.block.indent,
      seq: schema.block.seq,
    })
    .from(schema.block)
    .innerJoin(schema.translation, eq(schema.block.translationId, schema.translation.id))
    .innerJoin(schema.book, eq(schema.block.bookId, schema.book.id))
    .where(scoped(schema.block))
    .orderBy(asc(schema.block.chapter), asc(schema.block.seq))
    .all();

  const tokens: Token[] = db
    .select({
      id: schema.token.id,
      blockId: schema.token.blockId,
      chapter: schema.token.chapter,
      verse: schema.token.verse,
      wordIndex: schema.token.wordIndex,
      seq: schema.token.seq,
      kind: schema.token.kind,
      text: schema.token.text,
      verseStart: schema.token.verseStart,
      owId: schema.token.owId,
    })
    .from(schema.token)
    .innerJoin(schema.translation, eq(schema.token.translationId, schema.translation.id))
    .innerJoin(schema.book, eq(schema.token.bookId, schema.book.id))
    .where(scoped(schema.token))
    .orderBy(asc(schema.token.chapter), asc(schema.token.seq))
    .all();

  return { blocks, tokens };
}

/**
 * A translation's sparse native↔canonical divergence rows (#12). Empty for an
 * av11n translation (KJV/BSB) — the map is identity there. Book slug (not the
 * storage id) is returned, matching the coordinate-keyed model (ADR-0001).
 */
export function readVersification(
  db: SyncSqliteDb,
  translationAbbrev: string,
): VersificationRow[] {
  return db
    .select({
      book: schema.book.slug,
      srcChapter: schema.versificationMap.srcChapter,
      srcVerse: schema.versificationMap.srcVerse,
      canonChapter: schema.versificationMap.canonChapter,
      canonVerse: schema.versificationMap.canonVerse,
    })
    .from(schema.versificationMap)
    .innerJoin(schema.translation, eq(schema.versificationMap.translationId, schema.translation.id))
    .innerJoin(schema.book, eq(schema.versificationMap.bookId, schema.book.id))
    .where(eq(schema.translation.abbrev, translationAbbrev))
    .all();
}

/** Build the in-memory native↔canonical map for a translation (identity if empty). */
export function loadVersificationMap(
  db: SyncSqliteDb,
  translationAbbrev: string,
): VersificationMap {
  return buildVersificationMap(readVersification(db, translationAbbrev));
}
