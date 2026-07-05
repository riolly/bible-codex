import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { loadLastBookmark, saveBookmark } from '@/db/bookmark';
import { useReadingBookmark, type PassageAnchor } from '@/db/use-bookmark';
import { DEFAULT_POSITION } from '@/model/reading-position';
import { useReadingPosition } from '@/store/reading-position';

// The RN-bound DB seam is mocked: this proves the hook's WIRING (restore drives
// the position store + seeds the verse anchor; save is guarded until restore
// ran), not SQLite itself.
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

describe('useReadingBookmark', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useReadingPosition.setState({ position: DEFAULT_POSITION });
  });

  it('cold open restores the last bookmark: moves the reader and seeds the verse', async () => {
    mockLoad.mockResolvedValue(row);
    const anchorRef: { current: PassageAnchor | null } = { current: null };

    await renderHook(() => useReadingBookmark(anchorRef));
    await act(async () => {}); // flush the restore read's microtask

    // Restored to the canonical passage in the default translation (KJV); the
    // bookmark is canonical-only, so the translation is re-supplied on restore.
    expect(useReadingPosition.getState().position).toEqual({
      translation: 'KJV',
      book: 'John',
      chapter: 3,
    });
    // Verse anchor seeded and stamped with the restored passage, so the surface
    // opens on John 3:16, not the chapter head.
    expect(anchorRef.current).toEqual({ id: 'KJV/John/3', verse: 16 });
  });

  it('leaves the default position when there is no bookmark yet', async () => {
    mockLoad.mockResolvedValue(null);
    const anchorRef: { current: PassageAnchor | null } = { current: null };

    await renderHook(() => useReadingBookmark(anchorRef));
    await act(async () => {});

    expect(useReadingPosition.getState().position).toEqual(DEFAULT_POSITION);
    expect(anchorRef.current).toBeNull();
  });

  it('suppresses saves until the restore read resolves, then persists', async () => {
    let resolveLoad: (v: null) => void = () => {};
    mockLoad.mockReturnValue(new Promise<null>((r) => { resolveLoad = r; }));
    const anchorRef: { current: PassageAnchor | null } = { current: null };

    const { result } = await renderHook(() => useReadingBookmark(anchorRef));

    // `persist` touches no React state (mocked write + a ref read), so it needs
    // no act(). Restore still pending → this save is dropped, so the cold-open
    // default can never overwrite the row we are about to restore.
    result.current({ bookSlug: 'Genesis', chapter: 1, verse: 1 });
    expect(mockSave).not.toHaveBeenCalled();

    // Restore resolves (no bookmark); drain the whole .then→.finally chain that
    // flips the guard. Saves are now live.
    await act(async () => {
      resolveLoad(null);
      await new Promise((r) => setImmediate(r));
    });
    result.current({ bookSlug: 'John', chapter: 3, verse: 16 });
    expect(mockSave).toHaveBeenCalledWith({ bookSlug: 'John', chapter: 3, verse: 16 });
  });
});
