import { create } from 'zustand';

import { DEFAULT_POSITION, type ReadingPosition } from '@/model/reading-position';

/**
 * The SINGLE current-position source (#10). Both navigation affordances drive
 * this one store, so they can never disagree about where the reader is:
 *   - the book/chapter picker (random access) calls `goTo` with any passage;
 *   - the Codex flip gesture (#9, sequential) computes the previous/next
 *     chapter and calls the same `goTo`.
 * The reader renders whatever `position` holds, so a flip re-renders in place
 * and the picker's jump lands the reader exactly where it pointed.
 *
 * Ephemeral by design (ADR-0008: only transient view state lives in Zustand).
 * The durable, verse-grain bookmark per book (ADR-0012) is #14 — it will seed
 * this store on open and persist `goTo`s; the contract here is what #14 backs.
 */
interface ReadingPositionState {
  position: ReadingPosition;
  /** Move the reader to a passage — the one mutator picker and flip #9 share. */
  goTo: (position: ReadingPosition) => void;
}

export const useReadingPosition = create<ReadingPositionState>((set) => ({
  position: DEFAULT_POSITION,
  goTo: (position) => set({ position }),
}));
