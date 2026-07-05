/**
 * Reading-bookmark persistence (RN-bound: touches the expo-sqlite client). The
 * durable "each scroll keeps its place" store (ADR-0012): one live row per book
 * at verse grain, updated as the reader moves — never a pixel/scroll offset.
 *
 * Every write bumps `updatedAt`; the first write for a book mints a client UUID
 * (ADR-0011), so the rows stay sync-ready. The pure shape ↔ decision logic
 * lives in model/bookmark.ts; the restore/save wiring lives in use-bookmark.ts.
 */

import { and, desc, eq, isNull } from 'drizzle-orm';

import { planBookmarkWrite, type Bookmark } from '@/model/bookmark';
import { db } from './client';
import { readingPosition, type ReadingPositionRow } from './schema';
import { uuidv7 } from './uuid';

/** Epoch SECONDS, matching the schema's `unixepoch()` column default. */
const now = () => Math.floor(Date.now() / 1000);

/** The book's live bookmark, or null if it has never been read. */
export async function loadBookmark(bookSlug: string): Promise<ReadingPositionRow | null> {
  const rows = await db
    .select()
    .from(readingPosition)
    .where(and(eq(readingPosition.bookSlug, bookSlug), isNull(readingPosition.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The most-recently-updated live bookmark across all books — where the reader
 * left off. Cold open restores to this row (ADR-0012). Null before any read.
 * Ordered by `updatedAt` then `id` (UUIDv7 is time-sortable) for a stable tie-break.
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
 * Upsert the book's bookmark at verse grain. Re-reading a book UPDATES its live
 * row; a book read for the first time INSERTS one — never a second live row per
 * book (the one-per-book invariant, also guarded by the partial unique index).
 */
export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const existing = await loadBookmark(bookmark.bookSlug);
  const plan = planBookmarkWrite(existing?.id ?? null);
  const t = now();
  if (plan.op === 'update') {
    await db
      .update(readingPosition)
      .set({ chapter: bookmark.chapter, verse: bookmark.verse, updatedAt: t })
      .where(eq(readingPosition.id, plan.id));
    return;
  }
  await db.insert(readingPosition).values({
    id: uuidv7(),
    bookSlug: bookmark.bookSlug,
    chapter: bookmark.chapter,
    verse: bookmark.verse,
    createdAt: t,
    updatedAt: t,
  });
}
