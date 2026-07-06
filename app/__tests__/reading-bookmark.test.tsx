import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { loadLastBookmark, saveBookmark } from '@/db/bookmark';
import {
  BOOKMARK_SAVE_DEBOUNCE_MS,
  useReadingBookmark,
  type PassageAnchor,
} from '@/db/use-bookmark';
import { DEFAULT_POSITION } from '@/model/reading-position';
import { useReadingPosition } from '@/store/reading-position';

// The RN-bound DB seam is mocked: this proves the hook's WIRING (restore drives
// the position store + seeds the verse anchor; saves are guarded until restore
// ran, and debounced), not SQLite itself.
//
// Timer discipline (learned the hard way): renderHook assigns `result.current`
// in a no-dep effect, and a test that leaves fake timers enabled breaks the
// NEXT renderHook's effect flush. So restore always runs under REAL timers, and
// the single fake-timer test runs LAST — nothing renders after it.
jest.mock('@/db/bookmark', () => ({
  loadLastBookmark: jest.fn(),
  saveBookmark: jest.fn(),
}));

const mockLoad = loadLastBookmark as jest.MockedFunction<typeof loadLastBookmark>;
const mockSave = saveBookmark as jest.MockedFunction<typeof saveBookmark>;

const row = {
  id: 'r1',
  bookSlug: 'John',
  chapter: 3,
  verse: 16,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
};

const anchor = (): { current: PassageAnchor | null } => ({ current: null });

describe('useReadingBookmark', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    useReadingPosition.setState({ position: DEFAULT_POSITION });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cold open restores the last bookmark: moves the reader and seeds the verse', async () => {
    mockLoad.mockResolvedValue(row);
    const anchorRef = anchor();

    await renderHook(() => useReadingBookmark(anchorRef));
    await act(async () => {}); // flush the restore read's microtasks

    // Restored to the canonical passage in the default translation (KJV); the
    // bookmark is canonical-only, so the translation is re-supplied on restore.
    expect(useReadingPosition.getState().position).toEqual({
      translation: 'KJV',
      book: 'John',
      chapter: 3,
    });
    // Verse anchor seeded and stamped with the restored passage, so the surface
    // opens on John 3:16, not the chapter head. The anchor key is translation-free
    // (#12: book:chapter), so a later KJV⇄BSB switch keeps the restored verse.
    expect(anchorRef.current).toEqual({ id: 'John:3', verse: 16 });
  });

  it('leaves the default position when there is no bookmark yet', async () => {
    mockLoad.mockResolvedValue(null);
    const anchorRef = anchor();

    await renderHook(() => useReadingBookmark(anchorRef));
    await act(async () => {});

    expect(useReadingPosition.getState().position).toEqual(DEFAULT_POSITION);
    expect(anchorRef.current).toBeNull();
  });

  it('suppresses saves until the restore read resolves', async () => {
    let resolveLoad: (v: null) => void = () => {};
    mockLoad.mockReturnValue(new Promise<null>((r) => { resolveLoad = r; }));
    const anchorRef = anchor();

    const { result } = await renderHook(() => useReadingBookmark(anchorRef));
    const persist = result.current;

    // Restore still pending → nothing is scheduled or written, so the cold-open
    // default can never overwrite the row we are about to restore.
    persist({ bookSlug: 'Genesis', chapter: 1, verse: 1 });
    await act(async () => {
      resolveLoad(null);
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('flushes the pending write immediately on unmount so the last position is not lost', async () => {
    let resolveLoad: (v: null) => void = () => {};
    mockLoad.mockReturnValue(new Promise<null>((r) => { resolveLoad = r; }));
    const anchorRef = anchor();

    const { result, unmount } = await renderHook(() => useReadingBookmark(anchorRef));
    const persist = result.current;
    await act(async () => {
      resolveLoad(null); // restore settles → saves are live
    });

    // A settled verse schedules a debounced write; unmounting before it fires
    // must flush it synchronously (no timers advanced here).
    persist({ bookSlug: 'John', chapter: 3, verse: 7 });
    expect(mockSave).not.toHaveBeenCalled();
    await act(async () => {
      await unmount();
    });
    expect(mockSave).toHaveBeenCalledWith({ bookSlug: 'John', chapter: 3, verse: 7 });
  });

  // MUST be last: the only fake-timer test (see timer discipline note above).
  it('debounces a scroll of many verse crossings into a single last-verse write', async () => {
    let resolveLoad: (v: null) => void = () => {};
    mockLoad.mockReturnValue(new Promise<null>((r) => { resolveLoad = r; }));
    const anchorRef = anchor();

    const { result } = await renderHook(() => useReadingBookmark(anchorRef));
    const persist = result.current;
    await act(async () => {
      resolveLoad(null);
    });

    jest.useFakeTimers();
    // A fling crosses verses 10 → 11 → 12 within the debounce window.
    persist({ bookSlug: 'John', chapter: 3, verse: 10 });
    persist({ bookSlug: 'John', chapter: 3, verse: 11 });
    persist({ bookSlug: 'John', chapter: 3, verse: 12 });

    jest.advanceTimersByTime(BOOKMARK_SAVE_DEBOUNCE_MS - 1);
    expect(mockSave).not.toHaveBeenCalled(); // still coalescing

    jest.advanceTimersByTime(1);
    await Promise.resolve(); // let the fired write's mock promise settle
    expect(mockSave).toHaveBeenCalledTimes(1); // one write, not three
    expect(mockSave).toHaveBeenCalledWith({ bookSlug: 'John', chapter: 3, verse: 12 });
  });
});
