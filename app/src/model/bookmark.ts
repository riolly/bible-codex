/**
 * The durable reading bookmark — a CANONICAL point anchor at verse grain
 * (ADR-0012). One per book, updated as the reader moves; verse grain is the
 * device-independent truth, never a pixel/scroll offset (ADR-0004).
 *
 * This is the framework-agnostic shape + the pure mappings between it and the
 * ephemeral, translation-bound `ReadingPosition` (#10). Kept free of any RN /
 * expo-sqlite import so it runs in Node and is unit-tested (ADR-0008); the DB
 * seam (db/bookmark.ts) and the restore/save hook (db/use-bookmark.ts) are the
 * only RN-bound layers.
 *
 * CANONICAL-ONLY is the point: a `Bookmark` carries NO translation. It relates
 * the reader to the passage, so a KJV⇄BSB switch (#12) lands in the same place
 * via the canonical verse. `bookmarkFromPosition` drops the translation on the
 * way in; `positionForBookmark` re-supplies one on the way out.
 */

import type { ReadingPosition } from './reading-position';

export interface Bookmark {
  /** Canonical book slug (corpus book.slug) — a semantic key, never a corpus id. */
  readonly bookSlug: string;
  /** 1-based chapter number (av11n-canonical). */
  readonly chapter: number;
  /** 1-based verse number (av11n-canonical) — the grain. */
  readonly verse: number;
}

/**
 * Capture the reader's passage as a canonical bookmark at `verse` grain,
 * DROPPING the translation (the ADR-0012 canonical-only exception).
 */
export function bookmarkFromPosition(position: ReadingPosition, verse: number): Bookmark {
  return { bookSlug: position.book, chapter: position.chapter, verse };
}

/**
 * Re-attach a concrete `translation` to a canonical bookmark to produce a
 * reader position (restore). The reader always renders a concrete translation,
 * so restore must pick one; the bookmark itself stays translation-neutral.
 */
export function positionForBookmark(bookmark: Bookmark, translation: string): ReadingPosition {
  return { translation, book: bookmark.bookSlug, chapter: bookmark.chapter };
}

/**
 * The write a save resolves to. An existing live row for the book is UPDATED;
 * only a book with no live bookmark INSERTS — never a second live row per book
 * (ADR-0012 one-per-book, enforced too by the partial unique index).
 */
export type BookmarkWrite =
  | { readonly op: 'update'; readonly id: string }
  | { readonly op: 'insert' };

export function planBookmarkWrite(existingLiveId: string | null): BookmarkWrite {
  return existingLiveId ? { op: 'update', id: existingLiveId } : { op: 'insert' };
}
