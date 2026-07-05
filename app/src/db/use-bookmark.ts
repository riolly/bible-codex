/**
 * Restore + save wiring for the durable reading bookmark (ADR-0012, #14). This
 * is the RN-bound seam that binds the persistent per-book bookmark (db/bookmark)
 * to the ephemeral current-position store (#10) and the reader's verse anchor.
 *
 *  - RESTORE (cold open): load the most-recently-updated bookmark once and drive
 *    the position store to it, seeding the reader's verse anchor so the surface
 *    opens on the exact verse — where the reader left off.
 *  - SAVE (as you read): `persist` upserts the current passage's bookmark at
 *    verse grain. It is GUARDED until the restore attempt finished, so the
 *    cold-open default (Genesis 1) can never clobber the real last bookmark.
 */

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

import { positionForBookmark, type Bookmark } from '@/model/bookmark';
import { positionKey } from '@/model/reading-position';
import { useReadingPosition } from '@/store/reading-position';
import { loadLastBookmark, saveBookmark } from './bookmark';

/** The reader's one-shot verse seed, stamped with the passage it belongs to. */
export interface PassageAnchor {
  readonly id: string;
  readonly verse: number;
}

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
        anchorRef.current = { id: positionKey(position), verse: row.verse };
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

  return useCallback((bookmark: Bookmark) => {
    if (!restored.current) return;
    void saveBookmark(bookmark);
  }, []);
}
