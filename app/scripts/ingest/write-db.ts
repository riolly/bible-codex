/**
 * Corpus DB writer — the build-time side of the ADR-0009 Drizzle seam. Writes
 * through drizzle-orm/better-sqlite3 using the SAME schema module
 * (src/db/corpus-schema.ts) the app reads through drizzle-orm/expo-sqlite.
 *
 * Integer ids are storage-only and regenerated every ingest; block rows are
 * inserted first and their rowids mapped by the block's local ordinal.
 * Anchors join by abbrev + slug + coordinate, never by these ids.
 */

import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import type { Block, Token } from '../../src/model/corpus';
import * as schema from '../../src/db/corpus-schema';

export type CorpusDb = BetterSQLite3Database<typeof schema>;

/** DDL mirroring src/db/corpus-schema.ts (and schema.dbml). */
const DDL = `
CREATE TABLE translation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  abbrev TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  year INTEGER,
  license TEXT,
  versification TEXT NOT NULL,
  edition TEXT NOT NULL
);
CREATE TABLE book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  testament TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE TABLE block (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translation_id INTEGER NOT NULL REFERENCES translation(id),
  book_id INTEGER NOT NULL REFERENCES book(id),
  chapter INTEGER NOT NULL,
  genre TEXT NOT NULL,
  role TEXT,
  indent INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL
);
CREATE INDEX block_order ON block (translation_id, book_id, seq);
CREATE TABLE token (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translation_id INTEGER NOT NULL REFERENCES translation(id),
  book_id INTEGER NOT NULL REFERENCES book(id),
  chapter INTEGER NOT NULL,
  verse INTEGER,
  word_index INTEGER,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  block_id INTEGER NOT NULL REFERENCES block(id),
  verse_start INTEGER NOT NULL DEFAULT 0,
  ow_id TEXT
);
CREATE INDEX token_render ON token (translation_id, book_id, chapter, verse, seq);
CREATE INDEX token_anchor ON token (translation_id, book_id, chapter, verse, word_index);
CREATE TABLE versification_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translation_id INTEGER NOT NULL REFERENCES translation(id),
  book_id INTEGER NOT NULL REFERENCES book(id),
  src_chapter INTEGER NOT NULL,
  src_verse INTEGER NOT NULL,
  canon_chapter INTEGER NOT NULL,
  canon_verse INTEGER NOT NULL
);
CREATE INDEX vmap_src ON versification_map (translation_id, book_id, src_chapter, src_verse);
`;

export function createCorpusDb(path: string): { db: CorpusDb; sqlite: Database.Database } {
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = OFF'); // build artifact — no crash safety needed
  sqlite.pragma('synchronous = OFF');
  sqlite.exec(DDL);
  // rc.4 driver: the client must be passed via config (the positional
  // (client, config) form silently opens a NEW anonymous database)
  return { db: drizzle({ client: sqlite, schema }), sqlite };
}

export interface TranslationMeta {
  name: string;
  abbrev: string;
  language: string;
  year: number | null;
  license: string | null;
  versification: string;
  edition: string;
}

export function insertTranslation(db: CorpusDb, meta: TranslationMeta): number {
  const [row] = db
    .insert(schema.translation)
    .values(meta)
    .returning({ id: schema.translation.id })
    .all();
  return row.id;
}

export function insertBook(
  db: CorpusDb,
  b: { slug: string; name: string; testament: 'ot' | 'nt'; position: number },
): number {
  const existing = db
    .select({ id: schema.book.id })
    .from(schema.book)
    .where(eq(schema.book.slug, b.slug))
    .get();
  if (existing) return existing.id;
  const [row] = db.insert(schema.book).values(b).returning({ id: schema.book.id }).all();
  return row.id;
}

/** Insert one book's normalized rows; maps local block ordinals → rowids. */
export function insertBookRows(
  db: CorpusDb,
  ids: { translationId: number; bookId: number },
  rows: { blocks: Block[]; tokens: Token[] },
): void {
  const blockRowId = new Map<number, number>();
  for (const chunk of chunks(rows.blocks, 2000)) {
    const inserted = db
      .insert(schema.block)
      .values(
        chunk.map((b) => ({
          translationId: ids.translationId,
          bookId: ids.bookId,
          chapter: b.chapter,
          genre: b.genre,
          role: b.role,
          indent: b.indent,
          seq: b.seq,
        })),
      )
      .returning({ id: schema.block.id })
      .all();
    chunk.forEach((b, i) => blockRowId.set(b.id, inserted[i].id));
  }
  for (const chunk of chunks(rows.tokens, 2000)) {
    db.insert(schema.token)
      .values(
        chunk.map((t) => {
          const blockId = blockRowId.get(t.blockId);
          if (blockId == null) throw new Error(`token ${t.id} references unknown block ${t.blockId}`);
          return {
            translationId: ids.translationId,
            bookId: ids.bookId,
            chapter: t.chapter,
            verse: t.verse,
            wordIndex: t.wordIndex,
            seq: t.seq,
            kind: t.kind,
            text: t.text,
            blockId,
            verseStart: t.verseStart,
            owId: t.owId,
          };
        }),
      )
      .run();
  }
}

function* chunks<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}
