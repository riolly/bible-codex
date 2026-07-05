/**
 * Reading-bookmark persistence (RN-bound: touches the expo-sqlite client). The
 * durable "each scroll keeps its place" store (ADR-0012): one live row per book
 * at verse grain, updated as the reader moves — never a pixel/scroll offset.
 *
 * Every write bumps `updatedAt`; the first write for a book mints a client UUID
 * (ADR-0011), so the rows stay sync-ready. The pure shape ↔ mapping logic lives
 * in model/bookmark.ts; the restore/save wiring lives in use-bookmark.ts.
 */

import { desc, isNull, sql } from 'drizzle-orm';

import type { Bookmark } from '@/model/bookmark';
import { db } from './client';
import { readingPosition, type ReadingPositionRow } from './schema';
import { uuidv7 } from './uuid';

/** Epoch SECONDS, matching the schema's `unixepoch()` column default. */
const now = () => Math.floor(Date.now() / 1000);

/**
 * The most-recently-updated live bookmark across all books — where the reader
 * left off. Cold open restores to this row (ADR-0012). Null before any read.
 *
 * Tie-break: `updatedAt` is epoch SECONDS, so two books touched in the same
 * wall-clock second tie; `id` breaks it deterministically. UUIDv7 encodes
 * first-read time, not last-update time, so a sub-second book switch just before
 * a cold restart could restore the earlier-created book — an accepted edge (a
 * ~1s window), not worth diverging this table from the app-wide seconds unit.
 */
export async function loadLastBookmark(): Promise<ReadingPositionRow | null> {
  const rows = await db
    .select()
    .from(readingPosition)
    .where(isNull(readingPosition.deletedAt))
    .orderBy(desc(readingPosition.updatedAt), desc(readingPosition.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Upsert the book's bookmark at verse grain in ONE atomic statement. Re-reading
 * a book UPDATES its live row; a book read for the first time INSERTS one.
 *
 * The upsert (not read-then-write) is load-bearing: saves fire per verse while
 * scrolling, so a book's first read triggers several concurrent calls before
 * the first row commits. A read-modify-write would have them all see "no row"
 * and all INSERT, colliding on the partial unique index; `onConflictDoUpdate`
 * on that same live-book index folds the losers into an UPDATE instead.
 */
export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const t = now();
  await db
    .insert(readingPosition)
    .values({
      id: uuidv7(),
      bookSlug: bookmark.bookSlug,
      chapter: bookmark.chapter,
      verse: bookmark.verse,
      createdAt: t,
      updatedAt: t,
    })
    .onConflictDoUpdate({
      target: readingPosition.bookSlug,
      // Match the partial unique index's predicate (live rows only).
      targetWhere: sql`${readingPosition.deletedAt} is null`,
      set: { chapter: bookmark.chapter, verse: bookmark.verse, updatedAt: t },
    });
}
