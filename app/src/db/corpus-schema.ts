import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { BlockRole } from '../model/corpus';

/**
 * Corpus DB schema (read-only, bundled asset — ADR-0009, schema.dbml). Shared
 * by BOTH sides of the Drizzle seam:
 *   - the build-time ingest writer (scripts/ingest, better-sqlite3 driver)
 *   - the app reader (expo-sqlite driver, opened from the bundled asset)
 *
 * Integer pks here are STORAGE ids only — regenerated wholesale on every
 * re-ingest. Anchors and presentation rules join by coordinate / semantic key
 * (translation abbrev + book.slug + chapter + verse + word_index), never by
 * these ids (ADR-0001, ADR-0004).
 */

export const translation = sqliteTable('translation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  abbrev: text('abbrev').notNull().unique(),
  language: text('language').notNull(),
  year: integer('year'),
  license: text('license'),
  /** e.g. "av11n"; ties to versification_map. */
  versification: text('versification').notNull(),
  /**
   * TEXT EDITION stamp (ADR-0013): deterministic identifier of the source text
   * this ingest was built from (sha256 over the source USFM). Markup rows
   * record the edition they were minted against; an edition change triggers
   * the consent-gated quote-witness reconciliation pass.
   */
  edition: text('edition').notNull(),
});

export const book = sqliteTable('book', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Canonical id, e.g. "John" — used in Anchor coordinates. */
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  testament: text('testament', { enum: ['ot', 'nt'] }).notNull(),
  /** Canonical book order. */
  position: integer('position').notNull(),
});

export const block = sqliteTable(
  'block',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    translationId: integer('translation_id')
      .notNull()
      .references(() => translation.id),
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id),
    chapter: integer('chapter').notNull(),
    /** Typesetting branch. */
    genre: text('genre', { enum: ['prose', 'poetry', 'heading'] }).notNull(),
    /** REGISTERED role vocabulary — see model/corpus.ts BlockRole. */
    role: text('role').$type<BlockRole>(),
    /** Poetry line depth (\q1–\q4); 0 for prose/heading. */
    indent: integer('indent').notNull().default(0),
    /** Render order within the chapter (= seq of its first token). */
    seq: integer('seq').notNull(),
  },
  (t) => [index('block_order').on(t.translationId, t.bookId, t.seq)],
);

export const token = sqliteTable(
  'token',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    translationId: integer('translation_id')
      .notNull()
      .references(() => translation.id),
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id),
    chapter: integer('chapter').notNull(),
    /**
     * Canonical verse (av11n); NULL = non-verse content. EVERY heading token
     * (incl. mid-chapter \s) carries NULL — never 0, never the preceding verse.
     */
    verse: integer('verse'),
    /**
     * Word ordinal within verse, punct excluded; NULL on punct tokens and on
     * heading/non-verse word tokens.
     */
    wordIndex: integer('word_index'),
    /** Dense render order within chapter. */
    seq: integer('seq').notNull(),
    kind: text('kind', { enum: ['word', 'punct'] }).notNull(),
    text: text('text').notNull(),
    blockId: integer('block_id')
      .notNull()
      .references(() => block.id),
    /** First word token of a verse — drives the verse-number ornament. */
    verseStart: integer('verse_start', { mode: 'boolean' }).notNull().default(false),
    /** SEAM P3: head Original Word string key — null until aligned. */
    owId: text('ow_id'),
  },
  (t) => [
    index('token_render').on(t.translationId, t.bookId, t.chapter, t.verse, t.seq),
    index('token_anchor').on(t.translationId, t.bookId, t.chapter, t.verse, t.wordIndex),
  ],
);

/**
 * Sparse native↔canonical reconciliation: a row exists ONLY where a
 * translation's native numbering differs from canonical. Populated in #12.
 */
export const versificationMap = sqliteTable(
  'versification_map',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    translationId: integer('translation_id')
      .notNull()
      .references(() => translation.id),
    bookId: integer('book_id')
      .notNull()
      .references(() => book.id),
    srcChapter: integer('src_chapter').notNull(),
    srcVerse: integer('src_verse').notNull(),
    canonChapter: integer('canon_chapter').notNull(),
    canonVerse: integer('canon_verse').notNull(),
  },
  (t) => [index('vmap_src').on(t.translationId, t.bookId, t.srcChapter, t.srcVerse)],
);
