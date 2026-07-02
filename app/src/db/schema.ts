import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * User DB schema (read-write). Phase 1 carries only reading settings; the
 * annotation tables land later. Every user row is portable-by-construction
 * (ADR-0011):
 *   - identity is a client-generated UUID (no autoincrement that collides on
 *     restore/merge),
 *   - it carries `updatedAt` + a soft-delete tombstone (`deletedAt`) so a future
 *     sync merge is last-write-wins and deletes survive,
 *   - any anchor is a coordinate / semantic key, never a corpus DB id.
 *
 * The corpus DB (translation/book/block/token/versification_map) is a separate
 * read-only bundled asset and is NOT defined here.
 */
export const readingSettings = sqliteTable('reading_settings', {
  /** Client-generated UUID. */
  id: text('id').primaryKey(),
  /** Global presentation, not part of the typography cascade (ADR-0004). */
  scrollMode: text('scroll_mode', { enum: ['vertical', 'horizontal'] })
    .notNull()
    .default('vertical'),
  theme: text('theme').notNull().default('light'),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch())`),
  /** Soft-delete tombstone; null = live. */
  deletedAt: integer('deleted_at'),
});

export type ReadingSettings = typeof readingSettings.$inferSelect;
