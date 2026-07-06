/**
 * Restore + save wiring for the durable reading bookmark (ADR-0012, #14). This
 * is the RN-bound seam that binds the persistent per-book bookmark (db/bookmark)
 * to the ephemeral current-position store (#10) and the reader's verse anchor.
 *
 *  - RESTORE (cold open): load the most-recently-updated bookmark once and drive
 *    the position store to it, seeding the reader's verse anchor so the surface
 *    opens on the exact verse — where the reader left off.
 *  - SAVE (as you read): `persist` upserts the current passage's bookmark at
 *    verse grain. It is GUARDED until the restore attempt finished (so the
 *    cold-open default can never clobber the real last bookmark) and DEBOUNCED
 *    (a scroll crosses many verse boundaries; only the settled one matters).
 */

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

import { positionForBookmark, type Bookmark } from '@/model/bookmark';
import { anchorKey } from '@/model/reading-position';
import { useReadingPosition } from '@/store/reading-position';
import { loadLastBookmark, saveBookmark } from './bookmark';

/** The reader's one-shot verse seed, stamped with the passage it belongs to. */
export interface PassageAnchor {
  readonly id: string;
  readonly verse: number;
}

/**
 * Trailing debounce for bookmark writes: a fling crosses many verse boundaries,
 * but the bookmark only cares where the reader settles. Coalesce to one write.
 */
export const BOOKMARK_SAVE_DEBOUNCE_MS = 600;

/**
 * Wire the reader to its durable bookmark. Pass the reader's verse-anchor ref so
 * restore can seed it BEFORE moving the position (the surface reads the seed at
 * mount, so it must already be set). Returns a guarded `persist` for the reader
 * to call whenever the on-screen verse settles.
 */
export function useReadingBookmark(
  anchorRef: MutableRefObject<PassageAnchor | null>,
): (bookmark: Bookmark) => void {
  const goTo = useReadingPosition((s) => s.goTo);
  // Until the restore read resolves, saving is suppressed — otherwise the
  // cold-open default passage would overwrite the row we are about to restore.
  const restored = useRef(false);
  // The latest bookmark awaiting its debounced flush, and the pending timer.
  const pending = useRef<Bookmark | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const bookmark = pending.current;
    pending.current = null;
    // Fire-and-forget, but CAUGHT: a failed write is non-fatal (the next settled
    // verse overwrites it), and must never surface as an unhandled rejection.
    if (bookmark) void saveBookmark(bookmark).catch(() => {});
  }, []);

  // Flush any pending write if the reader unmounts mid-debounce, so the last
  // position is never lost.
  useEffect(() => flush, [flush]);

  useEffect(() => {
    let cancelled = false;
    void loadLastBookmark()
      .then((row) => {
        if (cancelled || !row) return;
        // Restore lands in whatever translation is active now (cold open =
        // default); the bookmark itself is canonical-only (#12 persists choice).
        const translation = useReadingPosition.getState().position.translation;
        const position = positionForBookmark(row, translation);
        // Seed the anchor first so the surface's mount-time read sees the verse,
        // then move the store — the reader re-renders onto the restored passage.
        // The anchor key is translation-free (#12): restore lands the verse even
        // if the cold-open translation later swaps to the seeded one.
        anchorRef.current = { id: anchorKey(position), verse: row.verse };
        goTo(position);
      })
      .catch(() => {
        // Fail-open: a restore read error just leaves the default position.
      })
      .finally(() => {
        if (!cancelled) restored.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [goTo, anchorRef]);

  return useCallback(
    (bookmark: Bookmark) => {
      if (!restored.current) return;
      pending.current = bookmark;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, BOOKMARK_SAVE_DEBOUNCE_MS);
    },
    [flush],
  );
}
